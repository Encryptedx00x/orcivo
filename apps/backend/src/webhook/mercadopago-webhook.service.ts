import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PlanCode, Prisma, Subscription } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MercadoPagoApiError,
  MercadoPagoPaymentProvider,
  MercadoPagoResourceKind,
  MercadoPagoResourceSnapshot,
} from '../billing/mercadopago.payment-provider';

const PROVIDER = 'MERCADOPAGO' as const;

/** MP notification topic → resource to fetch. Other topics are acknowledged and skipped. */
const TOPIC_TO_KIND: Record<string, MercadoPagoResourceKind> = {
  payment: 'payment',
  subscription_preapproval: 'preapproval',
};

export interface MercadoPagoNotification {
  /** `data.id` from the (signed) query string. */
  dataId: string;
  /** `type`/`topic` — query wins over body. */
  topic: string;
  /** Raw JSON body, stored for audit only; never used to change state. */
  body: Record<string, unknown>;
  /** `ts` from x-signature; fallback for the event id when the body has none. */
  signatureTs: string;
}

export interface MercadoPagoWebhookResult {
  received: true;
  duplicate?: true;
}

@Injectable()
export class MercadoPagoWebhookService {
  private readonly logger = new Logger(MercadoPagoWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoPaymentProvider,
  ) {}

  async handle(notification: MercadoPagoNotification): Promise<MercadoPagoWebhookResult> {
    const { dataId, topic, body, signatureTs } = notification;
    const action = typeof body['action'] === 'string' ? body['action'] : topic;
    // The notification id is stable across MP retries of the same event. It is
    // unsigned, but tampering is harmless: state is always re-read from the MP API.
    const notificationId =
      body['id'] !== undefined ? String(body['id']) : `${dataId}:${signatureTs}`;
    const idempotencyKey = createHash('sha256')
      .update(`${PROVIDER}:${notificationId}:${action}`)
      .digest('hex');

    let eventId: string;
    try {
      const created = await this.prisma.webhookEvent.create({
        data: {
          provider: PROVIDER,
          event_id: notificationId,
          event_type: action,
          idempotency_key: idempotencyKey,
          status: 'PENDING',
          raw_payload_json: body as Prisma.InputJsonValue,
        },
      });
      eventId = created.id;
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'P2002') throw e;
      const existing = await this.prisma.webhookEvent.findUniqueOrThrow({
        where: { idempotency_key: idempotencyKey },
      });
      // Only a previously FAILED event (we answered 5xx) may be re-processed, and
      // only by whoever wins the claim; PENDING/PROCESSED/SKIPPED are no-ops.
      const claimed =
        existing.status === 'FAILED'
          ? await this.prisma.webhookEvent.updateMany({
              where: { id: existing.id, status: 'FAILED' },
              data: { status: 'PENDING', error_message: null },
            })
          : { count: 0 };
      if (claimed.count === 0) {
        this.logger.log(`WebhookEvent duplicado (idempotent): ${idempotencyKey}`);
        return { received: true, duplicate: true };
      }
      eventId = existing.id;
    }

    const kind = TOPIC_TO_KIND[topic];
    if (!kind) {
      await this.finish(eventId, 'SKIPPED', `tópico não tratado: ${topic}`);
      return { received: true };
    }

    // Never trust the webhook payload: read the real resource before touching state.
    let resource: MercadoPagoResourceSnapshot;
    try {
      resource = await this.mercadoPago.fetchResource(kind, dataId);
    } catch (err) {
      if (err instanceof MercadoPagoApiError && err.httpStatus === 404) {
        await this.finish(eventId, 'SKIPPED', `recurso ${kind}/${dataId} não existe no MP`);
        return { received: true };
      }
      await this.finish(eventId, 'FAILED', String(err));
      throw new BadGatewayException('Falha ao consultar o Mercado Pago');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.applyResource(tx, resource);
        await tx.webhookEvent.update({
          where: { id: eventId },
          data: { status: 'PROCESSED', processed_at: new Date(), error_message: null },
        });
      });
    } catch (err) {
      this.logger.error(`WebhookEvent ${eventId} falhou: ${err}`);
      await this.finish(eventId, 'FAILED', String(err));
      throw err;
    }
    return { received: true };
  }

  private async finish(
    eventId: string,
    status: 'SKIPPED' | 'FAILED',
    message: string,
  ): Promise<void> {
    await this.prisma.webhookEvent
      .update({
        where: { id: eventId },
        data: {
          status,
          error_message: message,
          ...(status === 'SKIPPED' ? { processed_at: new Date() } : {}),
        },
      })
      .catch(() => undefined);
  }

  /**
   * Maps the provider-normalized status (see mapPreapprovalStatus/mapPaymentStatus)
   * onto the persisted SubscriptionStatus.
   */
  private async applyResource(
    tx: Prisma.TransactionClient,
    resource: MercadoPagoResourceSnapshot,
  ): Promise<void> {
    const { sub, isCurrentResource } = await this.findSubscription(tx, resource);
    if (!sub) {
      this.logger.warn(`Subscription não encontrada para ${resource.kind} ${resource.id}`);
      return;
    }

    const now = new Date();
    switch (resource.status) {
      case 'ACTIVE': {
        // A stale resource (not the one currently tracked) must not resurrect a cancelled sub.
        const isPendingCheckout =
          sub.pending_provider_id === resource.id && !!sub.pending_plan_code;
        // Plan change checkout (`companyId:PLAN`) confirmed: adopt the new resource
        // and stop the old recurring charge.
        const refPlan = resource.externalReference?.split(':')[1] as PlanCode | undefined;
        if (!isCurrentResource && !isPendingCheckout && (sub.status === 'CANCELLED' || refPlan))
          return;
        const switchTo = isPendingCheckout ? sub.pending_plan_code : null;
        if (switchTo && sub.asaas_sub_id) {
          try {
            await this.mercadoPago.cancelSubscription(sub.asaas_sub_id);
          } catch (err) {
            this.logger.warn(`Falha ao cancelar assinatura anterior ${sub.asaas_sub_id}: ${err}`);
          }
        }
        const planCode = switchTo ?? sub.plan_code;
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'ACTIVE',
            past_due_at: null,
            blocked_at: null,
            ...(switchTo
              ? {
                  plan_code: switchTo,
                  asaas_sub_id: resource.id,
                  cancelled_at: null,
                  pending_provider_id: null,
                  pending_plan_code: null,
                }
              : {}),
          },
        });
        await tx.company.update({
          where: { id: sub.company_id },
          data: { plan_code: planCode },
        });
        if (resource.kind === 'payment' && resource.amount !== null) {
          const paidAt = resource.paidAt ? new Date(resource.paidAt) : now;
          await tx.subscriptionPayment.upsert({
            where: { asaas_payment_id: resource.id },
            create: {
              subscription_id: sub.id,
              asaas_payment_id: resource.id,
              amount: resource.amount,
              status: 'confirmed',
              due_date: resource.dueDate ? new Date(resource.dueDate) : null,
              paid_at: paidAt,
            },
            update: { status: 'confirmed', paid_at: paidAt },
          });
        }
        return;
      }
      case 'PAST_DUE':
        if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { status: 'PAST_DUE', past_due_at: now },
          });
        }
        return;
      case 'BLOCKED':
        if (isCurrentResource && sub.status !== 'BLOCKED') {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { status: 'BLOCKED', blocked_at: now },
          });
        }
        return;
      case 'CANCELED':
        if (isCurrentResource && sub.status !== 'CANCELLED') {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { status: 'CANCELLED', cancelled_at: now },
          });
        }
        return;
      case 'PENDING':
      default:
        return;
    }
  }

  /**
   * The subscription is matched by the provider resource id we stored at
   * checkout. Fallback: `external_reference` (= company id, set at checkout), for
   * resources we do not track directly (e.g. recurring card charges, or a
   * checkout whose id was never persisted). Fallback matches may only move a
   * subscription towards ACTIVE/PAST_DUE, never cancel or block it.
   */
  private async findSubscription(
    tx: Prisma.TransactionClient,
    resource: MercadoPagoResourceSnapshot,
  ): Promise<{ sub: Subscription | null; isCurrentResource: boolean }> {
    const byId = await tx.subscription.findFirst({ where: { asaas_sub_id: resource.id } });
    if (byId) return { sub: byId, isCurrentResource: true };

    if (!resource.externalReference) return { sub: null, isCurrentResource: false };
    const [companyId] = resource.externalReference.split(':');
    const byRef = await tx.subscription.findUnique({
      where: { company_id: companyId },
    });
    if (!byRef) return { sub: null, isCurrentResource: false };
    if (!byRef.asaas_sub_id) {
      // Checkout never stored the id: adopt this resource as the current one.
      const adopted = await tx.subscription.update({
        where: { id: byRef.id },
        data: { asaas_sub_id: resource.id },
      });
      return { sub: adopted, isCurrentResource: true };
    }
    return { sub: byRef, isCurrentResource: false };
  }
}
