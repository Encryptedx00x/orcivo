import { BadGatewayException, BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlanCode, SubscriptionStatus } from '@prisma/client';
import { PLAN_PRICING } from '@orcivo/shared-types';
import type {
  BillingCycle,
  PaymentProvider,
  PaymentProviderSubscription,
} from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER } from './payment-provider.token';

const PRICE_MAP: Record<'SOLO' | 'MAIS' | 'EQUIPE', Record<BillingCycle, string>> = {
  SOLO: { MONTHLY: PLAN_PRICING.SOLO.monthly, YEARLY: PLAN_PRICING.SOLO.yearly },
  MAIS: { MONTHLY: PLAN_PRICING.MAIS.monthly, YEARLY: PLAN_PRICING.MAIS.yearly },
  EQUIPE: { MONTHLY: PLAN_PRICING.EQUIPE.monthly, YEARLY: PLAN_PRICING.EQUIPE.yearly },
};

const GRACE_PERIOD_DAYS: Record<PlanCode, number> = {
  LIVRE: 0,
  SOLO: 2,
  MAIS: 3,
  EQUIPE: 7,
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  async getOrCreate(companyId: string): Promise<{ status: SubscriptionStatus | null; plan_code: PlanCode }> {
    const existing = await this.prisma.subscription.findUnique({
      where: { company_id: companyId },
    });
    if (existing) return { status: existing.status, plan_code: existing.plan_code };

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    // LIVRE: criar registro local sem gateway
    const sub = await this.prisma.subscription.create({
      data: {
        company_id: companyId,
        plan_code: company.plan_code,
        status: 'ACTIVE',
        grace_period_days: GRACE_PERIOD_DAYS[company.plan_code] ?? 0,
      },
    });
    return { status: sub.status, plan_code: sub.plan_code };
  }

  async getPayments(companyId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { company_id: companyId },
      select: { id: true },
    });
    if (!sub) return { data: [] };
    const data = await this.prisma.subscriptionPayment.findMany({
      where: { subscription_id: sub.id },
      orderBy: { created_at: 'desc' },
      take: 24,
      select: {
        id: true,
        amount: true,
        status: true,
        due_date: true,
        paid_at: true,
        created_at: true,
      },
    });
    return { data };
  }

  async getSubscriptionStatus(companyId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { company_id: companyId },
    });

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    if (!sub) {
      // LIVRE sem subscription
      return {
        status: null as SubscriptionStatus | null,
        plan_code: company.plan_code,
        is_blocked: false,
        is_past_due: false,
        message: null as string | null,
      };
    }

    const isBlocked = sub.status === 'BLOCKED';
    const isPastDue = sub.status === 'PAST_DUE';

    return {
      status: sub.status,
      plan_code: sub.plan_code,
      is_blocked: isBlocked,
      is_past_due: isPastDue,
      message: isBlocked
        ? 'Sua assinatura está inativa. Acesse orcivo.com.br para regularizar.'
        : isPastDue
          ? 'Há um pagamento pendente. Acesse orcivo.com.br para regularizar.'
          : null,
    };
  }

  async createCheckout(
    companyId: string,
    planCode: 'SOLO' | 'MAIS' | 'EQUIPE',
    cycle: 'MONTHLY' | 'YEARLY',
    options: { paymentMethod?: 'CREDIT_CARD' | 'PIX'; cardTokenId?: string } = {},
  ) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: {
        id: companyId,
      },
      include: {
        members: {
          where: { role: 'OWNER' },
          include: { user: true },
          take: 1,
        },
      },
    });

    const owner = company.members[0]?.user;
    const sub = await this.prisma.subscription.findUnique({ where: { company_id: companyId } });

    let providerCustomerId = sub?.asaas_customer_id ?? null;
    if (!providerCustomerId) {
      try {
        const customer = await this.paymentProvider.createCustomer({
          name: company.trade_name,
          email: owner?.email,
          document: company.document ?? undefined,
        });
        providerCustomerId = customer.id || null;
      } catch (err) {
        this.logger.error(`Falha ao criar customer ${this.paymentProvider.provider}: ${err}`);
        providerCustomerId = null;
      }
    }

    const value = PRICE_MAP[planCode]?.[cycle] ?? '0.00';
    const nextDueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // amanhã

    let providerSubscriptionId: string | null = null;
    let providerSubscription: PaymentProviderSubscription | null = null;
    if (providerCustomerId) {
      try {
        providerSubscription = await this.paymentProvider.createSubscription({
          customerId: providerCustomerId,
          paymentMethod: options.paymentMethod ?? 'PIX',
          amount: value,
          nextDueDate,
          billingCycle: cycle,
          payerEmail: owner?.email,
          cardTokenId: options.cardTokenId,
          externalReference: companyId,
          description: `Orcivo ${planCode} — ${cycle === 'YEARLY' ? 'Anual' : 'Mensal'}`,
        });
        providerSubscriptionId = providerSubscription.id || null;
      } catch (err) {
        this.logger.error(`Falha ao criar subscription ${this.paymentProvider.provider}: ${err}`);
      }
    }

    const updatedSub = await this.prisma.subscription.upsert({
      where: { company_id: companyId },
      create: {
        company_id: companyId,
        plan_code: planCode as PlanCode,
        status: 'TRIALING',
        asaas_customer_id: providerCustomerId,
        asaas_sub_id: providerSubscriptionId,
        grace_period_days: GRACE_PERIOD_DAYS[planCode as PlanCode] ?? 0,
      },
      update: {
        plan_code: planCode as PlanCode,
        status: 'TRIALING',
        asaas_customer_id: providerCustomerId ?? undefined,
        asaas_sub_id: providerSubscriptionId ?? undefined,
      },
    });

    return {
      subscription: updatedSub,
      provider_subscription_id: providerSubscriptionId,
      checkout_url: providerSubscription?.checkoutUrl ?? null,
      pix: providerSubscription?.pix ?? null,
    };
  }

  /**
   * Cancela a assinatura paga: encerra a cobrança recorrente no provedor e
   * marca a assinatura local como CANCELLED (mesmo estado do webhook de
   * cancelamento). Se o provedor falhar, nada é alterado localmente.
   */
  async cancelSubscription(companyId: string): Promise<{ status: SubscriptionStatus; plan_code: PlanCode }> {
    const sub = await this.prisma.subscription.findUnique({ where: { company_id: companyId } });
    if (!sub || sub.plan_code === 'LIVRE') {
      throw new BadRequestException('Não há assinatura paga para cancelar.');
    }
    if (sub.status === 'CANCELLED') {
      return { status: sub.status, plan_code: sub.plan_code };
    }

    if (sub.asaas_sub_id) {
      try {
        await this.paymentProvider.cancelSubscription(sub.asaas_sub_id);
      } catch (err) {
        this.logger.error(`Falha ao cancelar subscription ${this.paymentProvider.provider}: ${err}`);
        throw new BadGatewayException('Não foi possível cancelar agora. Tente novamente.');
      }
    }

    const updated = await this.prisma.subscription.update({
      where: { company_id: companyId },
      data: { status: 'CANCELLED', cancelled_at: new Date() },
    });
    return { status: updated.status, plan_code: updated.plan_code };
  }

  async isBlocked(companyId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { company_id: companyId },
    });
    if (!sub) return false;
    return sub.status === 'BLOCKED';
  }

  /** Cron diário: promove PAST_DUE → BLOCKED após carência */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkGracePeriods(): Promise<void> {
    const now = new Date();
    const pastDueSubs = await this.prisma.subscription.findMany({
      where: { status: 'PAST_DUE' },
    });

    for (const sub of pastDueSubs) {
      if (!sub.past_due_at) continue;
      const graceEnd = new Date(sub.past_due_at);
      graceEnd.setDate(graceEnd.getDate() + sub.grace_period_days);
      if (now > graceEnd) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'BLOCKED', blocked_at: now },
        });
        this.logger.warn(
          `Subscription ${sub.id} (company ${sub.company_id}) bloqueada após ${sub.grace_period_days}d de carência`,
        );
      }
    }
  }
}
