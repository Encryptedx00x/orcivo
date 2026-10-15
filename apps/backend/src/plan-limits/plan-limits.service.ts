import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import {
  PlanFeature,
  PLAN_LIMITS,
  PLAN_PRESENTATION,
  PlanUsageResponseSchema,
  planUsageRemaining,
  planUsageState,
  type PlanLimitCode,
  type PlanUsageFeature,
  type PlanUsageResource,
  type PlanUsageResponse,
} from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';

/** "Orcivo Livre" etc. — never the raw plan code in messages. */
const planName = (code: string) =>
  PLAN_PRESENTATION[code as keyof typeof PLAN_PRESENTATION]?.name ?? 'seu plano';

export interface PlanCheckResult {
  allowed: boolean;
  limit?: number;
  reason?: string;
}

export type LimitKey = 'CUSTOMERS' | 'QUOTES_MONTH' | 'WORK_ORDERS_MONTH' | 'MEMBERS';

const RESOURCE_LABELS = {
  CUSTOMERS: 'Clientes',
  QUOTES_MONTH: 'Orçamentos',
  WORK_ORDERS_MONTH: 'Ordens de serviço',
  MEMBERS: 'Membros da equipe',
} as const;

function calendarMonthBounds(now: Date): { start: Date; end: Date } {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

@Injectable()
export class PlanLimitsService {
  private readonly logger = new Logger(PlanLimitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Retorna os limites do plano da empresa para o endpoint GET /me/plan-limits */
  async getLimits(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { subscription: true },
    });

    const limits = await this.prisma.planLimit.findUnique({
      where: { plan_code: company.plan_code },
    });

    // Se não há registro de PlanLimit (seed não rodou), usar defaults para LIVRE
    const l = limits ?? PLAN_LIMITS.LIVRE;

    const subStatus = company.subscription?.status ?? null;
    const isBlocked = subStatus === 'BLOCKED';

    return {
      plan_code: company.plan_code,
      customers_max: l.customers_max,
      quotes_per_month: l.quotes_per_month,
      work_orders_per_month: l.work_orders_per_month,
      members_max: l.members_max,
      has_logo: l.has_logo,
      pdf_watermark: l.pdf_watermark,
      has_reports: l.has_reports,
      has_contracts: l.has_contracts,
      subscription_status: subStatus,
      is_blocked: isBlocked,
    };
  }

  /** Snapshot autoritativo de consumo; nenhuma superfície deve recontar listas. */
  async getUsage(companyId: string, now = new Date()): Promise<PlanUsageResponse> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        plan_code: true,
        subscription: {
          select: {
            status: true,
            current_period_start: true,
            current_period_end: true,
          },
        },
      },
    });
    const planCode = company.plan_code as PlanLimitCode;
    const persistedLimits = await this.prisma.planLimit.findUnique({
      where: { plan_code: company.plan_code },
    });
    const limits = persistedLimits ?? PLAN_LIMITS[planCode];
    const { start, end } = calendarMonthBounds(now);

    const counts = await Promise.allSettled([
      this.prisma.customer.count({ where: { company_id: companyId, deleted_at: null } }),
      this.prisma.quote.count({
        where: { company_id: companyId, created_at: { gte: start, lt: end } },
      }),
      this.prisma.workOrder.count({
        where: { company_id: companyId, created_at: { gte: start, lt: end } },
      }),
      this.prisma.companyMember.count({ where: { company_id: companyId, active: true } }),
    ]);
    const countAt = (index: number): number | null => {
      const result = counts[index];
      if (result.status === 'fulfilled') return result.value;
      this.logger.warn(`Não foi possível calcular um contador de uso da empresa ${companyId}`);
      return null;
    };
    const resource = (
      code: keyof typeof RESOURCE_LABELS,
      used: number | null,
      limit: number | null,
      period: 'TOTAL' | 'CALENDAR_MONTH',
    ): PlanUsageResource => ({
      code,
      label: RESOURCE_LABELS[code],
      used,
      limit,
      remaining: planUsageRemaining(used, limit),
      period,
      state: planUsageState(used, limit),
    });

    const resources: PlanUsageResource[] = [
      resource('CUSTOMERS', countAt(0), limits.customers_max, 'TOTAL'),
      resource('QUOTES_MONTH', countAt(1), limits.quotes_per_month, 'CALENDAR_MONTH'),
      resource('WORK_ORDERS_MONTH', countAt(2), limits.work_orders_per_month, 'CALENDAR_MONTH'),
      resource('MEMBERS', countAt(3), limits.members_max, 'TOTAL'),
    ];
    const feature = (
      code: PlanUsageFeature['code'],
      label: string,
      enabled: boolean,
    ): PlanUsageFeature => ({ code, label, state: enabled ? 'AVAILABLE' : 'LOCKED' });
    const features: PlanUsageFeature[] = [
      feature('LOGO', 'Logo própria', limits.has_logo),
      feature('PDF_WITHOUT_WATERMARK', "PDF sem marca d'água", !limits.pdf_watermark),
      feature('REPORTS', 'Relatórios financeiros', limits.has_reports),
      {
        code: 'CONTRACTS',
        label: 'Contratos digitais',
        state: limits.has_contracts ? 'NOT_IMPLEMENTED' : 'LOCKED',
      },
    ];
    const subscription = company.subscription;
    const response: PlanUsageResponse = {
      plan: {
        code: planCode,
        name: PLAN_PRESENTATION[planCode].name,
        subscription_status: subscription?.status ?? null,
        is_blocked: subscription?.status === 'BLOCKED',
      },
      billing_period: subscription
        ? {
            start: subscription.current_period_start?.toISOString() ?? null,
            end: subscription.current_period_end?.toISOString() ?? null,
            renews_at: subscription.current_period_end?.toISOString() ?? null,
          }
        : null,
      usage_period: {
        start: start.toISOString(),
        end: end.toISOString(),
        reset_at: end.toISOString(),
      },
      resources,
      features,
      generated_at: now.toISOString(),
    };
    return PlanUsageResponseSchema.parse(response);
  }

  /** Enforça limite de contagem — lança ForbiddenException se estourado */
  async enforceLimit(companyId: string, key: LimitKey): Promise<void> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { subscription: true },
    });

    // Bloqueado por inadimplência
    if (company.subscription?.status === 'BLOCKED') {
      throw new ForbiddenException(
        'Sua assinatura está inativa. Em Plano e assinatura, toque em Gerenciar assinatura.',
      );
    }

    const limits = await this.prisma.planLimit.findUnique({
      where: { plan_code: company.plan_code },
    });

    if (!limits) {
      this.logger.warn(`PlanLimit não encontrado para ${company.plan_code} — seed necessário`);
      return; // sem PlanLimit, não bloqueia (graceful degradation)
    }

    switch (key) {
      case 'CUSTOMERS': {
        if (limits.customers_max === null) return;
        const count = await this.prisma.customer.count({
          where: { company_id: companyId, deleted_at: null },
        });
        if (count >= limits.customers_max) {
          throw new ForbiddenException(
            `Limite de ${limits.customers_max} clientes atingido no ${planName(company.plan_code)}. Abra Ver planos para ampliar.`,
          );
        }
        break;
      }

      case 'QUOTES_MONTH': {
        if (limits.quotes_per_month === null) return;
        const { start, end } = calendarMonthBounds(new Date());
        const count = await this.prisma.quote.count({
          where: { company_id: companyId, created_at: { gte: start, lt: end } },
        });
        if (count >= limits.quotes_per_month) {
          throw new ForbiddenException(
            `Limite de ${limits.quotes_per_month} orçamentos/mês atingido no ${planName(company.plan_code)}. Abra Ver planos para ampliar.`,
          );
        }
        break;
      }

      case 'WORK_ORDERS_MONTH': {
        if (limits.work_orders_per_month === null) return;
        const { start, end } = calendarMonthBounds(new Date());
        const count = await this.prisma.workOrder.count({
          where: { company_id: companyId, created_at: { gte: start, lt: end } },
        });
        if (count >= limits.work_orders_per_month) {
          throw new ForbiddenException(
            `Limite de ${limits.work_orders_per_month} OS/mês atingido no ${planName(company.plan_code)}. Abra Ver planos para ampliar.`,
          );
        }
        break;
      }

      case 'MEMBERS': {
        const count = await this.prisma.companyMember.count({
          where: { company_id: companyId, active: true },
        });
        if (count >= limits.members_max) {
          throw new ForbiddenException(
            `Limite de ${limits.members_max} usuário(s) atingido no ${planName(company.plan_code)}. Abra Ver planos para ampliar.`,
          );
        }
        break;
      }
    }
  }

  /** Relatórios financeiros são um recurso de Orcivo Mais e Orcivo Equipe. */
  async enforceReports(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { plan_code: true },
    });
    const limits = await this.prisma.planLimit.findUnique({
      where: { plan_code: company.plan_code },
      select: { has_reports: true },
    });
    const allowed = limits?.has_reports ?? PLAN_LIMITS[company.plan_code].has_reports;
    if (!allowed) {
      throw new ForbiddenException(
        'Relatórios estão disponíveis nos planos Orcivo Mais e Orcivo Equipe.',
      );
    }
  }

  /** Compatibilidade retroativa com o scaffold anterior */
  async check(companyId: string, feature: PlanFeature): Promise<PlanCheckResult> {
    if (feature === PlanFeature.PDF_WATERMARK) {
      const company = await this.prisma.company.findUniqueOrThrow({
        where: { id: companyId },
      });

      // Tentar usar PlanLimit do banco; fallback para plan_code
      const limits = await this.prisma.planLimit.findUnique({
        where: { plan_code: company.plan_code },
      });
      const hasPdfWatermark = limits ? limits.pdf_watermark : company.plan_code === 'LIVRE';
      const allowed = !hasPdfWatermark;

      return {
        allowed,
        reason: allowed ? undefined : "Orcivo Livre inclui marca d'água no PDF",
      };
    }
    return { allowed: true };
  }
}
