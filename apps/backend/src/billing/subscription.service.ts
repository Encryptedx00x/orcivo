import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlanCode, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasClient } from './asaas.client';

const PRICE_MAP: Record<string, Record<string, number>> = {
  SOLO: { MONTHLY: 9.9, YEARLY: 79.9 },
  MAIS: { MONTHLY: 19.9, YEARLY: 199.9 },
  EQUIPE: { MONTHLY: 39.9, YEARLY: 399.9 },
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
    private readonly asaas: AsaasClient,
  ) {}

  async getOrCreate(companyId: string): Promise<{ status: SubscriptionStatus | null; plan_code: PlanCode }> {
    const existing = await this.prisma.subscription.findUnique({
      where: { company_id: companyId },
    });
    if (existing) return { status: existing.status, plan_code: existing.plan_code };

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    // LIVRE: criar registro local sem Asaas
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

    let asaasCustomerId = sub?.asaas_customer_id ?? null;
    if (!asaasCustomerId) {
      try {
        const customer = await this.asaas.createCustomer({
          name: company.trade_name,
          email: owner?.email,
          cpfCnpj: company.document ?? undefined,
        });
        asaasCustomerId = customer.id || null;
      } catch (err) {
        this.logger.error(`Falha ao criar customer Asaas: ${err}`);
        asaasCustomerId = null;
      }
    }

    const value = PRICE_MAP[planCode]?.[cycle] ?? 0;
    const nextDueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // amanhã

    let asaasSubId: string | null = null;
    if (asaasCustomerId) {
      try {
        const asaasSub = await this.asaas.createSubscription({
          customer: asaasCustomerId,
          billingType: 'PIX',
          value,
          nextDueDate,
          cycle: cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
          description: `Orcivo ${planCode} — ${cycle === 'YEARLY' ? 'Anual' : 'Mensal'}`,
        });
        asaasSubId = asaasSub.id || null;
      } catch (err) {
        this.logger.error(`Falha ao criar subscription Asaas: ${err}`);
      }
    }

    const updatedSub = await this.prisma.subscription.upsert({
      where: { company_id: companyId },
      create: {
        company_id: companyId,
        plan_code: planCode as PlanCode,
        status: 'TRIALING',
        asaas_customer_id: asaasCustomerId,
        asaas_sub_id: asaasSubId,
        grace_period_days: GRACE_PERIOD_DAYS[planCode as PlanCode] ?? 0,
      },
      update: {
        plan_code: planCode as PlanCode,
        status: 'TRIALING',
        asaas_customer_id: asaasCustomerId ?? undefined,
        asaas_sub_id: asaasSubId ?? undefined,
      },
    });

    return { subscription: updatedSub, asaas_subscription_id: asaasSubId };
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
