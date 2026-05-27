import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const ASAAS_QUEUE = 'asaas-webhook';

interface AsaasPayment {
  id: string;
  customer: string;
  status: string;
  value: number;
  dueDate: string;
  paymentDate?: string;
}

interface AsaasWebhookPayload {
  event: string;
  payment?: AsaasPayment;
  subscription?: { id: string; status: string };
}

@Processor(ASAAS_QUEUE)
@Injectable()
export class WebhookAsaasProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookAsaasProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ webhookEventId: string; payload: AsaasWebhookPayload }>): Promise<void> {
    const { webhookEventId, payload } = job.data;

    try {
      await this.prisma.$transaction(async (tx) => {
        const event = await tx.webhookEvent.findUniqueOrThrow({ where: { id: webhookEventId } });
        if (event.status !== 'PENDING') return; // já processado

        await this.handleEvent(tx as typeof this.prisma, payload);

        await tx.webhookEvent.update({
          where: { id: webhookEventId },
          data: { status: 'PROCESSED', processed_at: new Date() },
        });
      });
    } catch (err) {
      this.logger.error(`WebhookEvent ${webhookEventId} falhou: ${err}`);
      await this.prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'FAILED', error_message: String(err) },
      }).catch(() => {});
      throw err; // BullMQ vai retry com backoff
    }
  }

  private async handleEvent(prisma: PrismaService, payload: AsaasWebhookPayload): Promise<void> {
    const { event, payment, subscription: sub } = payload;

    // Encontrar Subscription pelo asaas_sub_id ou asaas_customer_id
    const dbSub = sub?.id
      ? await prisma.subscription.findFirst({ where: { asaas_sub_id: sub.id } })
      : payment?.customer
        ? await prisma.subscription.findFirst({ where: { asaas_customer_id: payment.customer } })
        : null;

    if (!dbSub) {
      this.logger.warn(`Subscription não encontrada para evento ${event} (sub=${sub?.id}, customer=${payment?.customer})`);
      return;
    }

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: 'ACTIVE', past_due_at: null, blocked_at: null },
        });
        // Sincronizar plan_code na Company
        await prisma.company.update({
          where: { id: dbSub.company_id },
          data: { plan_code: dbSub.plan_code },
        });
        // Registrar pagamento
        if (payment?.id) {
          await prisma.subscriptionPayment.upsert({
            where: { asaas_payment_id: payment.id },
            create: {
              subscription_id: dbSub.id,
              asaas_payment_id: payment.id,
              amount: payment.value,
              status: 'confirmed',
              due_date: payment.dueDate ? new Date(payment.dueDate) : null,
              paid_at: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
            },
            update: {
              status: 'confirmed',
              paid_at: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
            },
          });
        }
        break;
      }

      case 'PAYMENT_OVERDUE': {
        if (dbSub.status === 'ACTIVE' || dbSub.status === 'TRIALING') {
          await prisma.subscription.update({
            where: { id: dbSub.id },
            data: { status: 'PAST_DUE', past_due_at: new Date() },
          });
        }
        break;
      }

      case 'SUBSCRIPTION_CANCELLED': {
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: 'CANCELLED', cancelled_at: new Date() },
        });
        break;
      }

      default:
        this.logger.log(`Evento Asaas não tratado: ${event}`);
    }
  }
}
