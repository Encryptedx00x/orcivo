import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PlanFeature } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanCheckResult {
  allowed: boolean;
  limit?: number;
  reason?: string;
}

export type LimitKey = 'CUSTOMERS' | 'QUOTES_MONTH' | 'WORK_ORDERS_MONTH' | 'MEMBERS';

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
    const l = limits ?? {
      customers_max: 5,
      quotes_per_month: 10,
      work_orders_per_month: 5,
      members_max: 1,
      has_logo: false,
      pdf_watermark: true,
      has_reports: false,
      has_contracts: false,
    };

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

  /** Enforça limite de contagem — lança ForbiddenException se estourado */
  async enforceLimit(companyId: string, key: LimitKey): Promise<void> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { subscription: true },
    });

    // Bloqueado por inadimplência
    if (company.subscription?.status === 'BLOCKED') {
      throw new ForbiddenException(
        'Sua assinatura está inativa. Acesse orcivo.com.br para regularizar.',
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
          where: { company_id: companyId },
        });
        if (count >= limits.customers_max) {
          throw new ForbiddenException(
            `Limite de ${limits.customers_max} clientes atingido no plano ${company.plan_code}. Acesse orcivo.com.br para fazer upgrade.`,
          );
        }
        break;
      }

      case 'QUOTES_MONTH': {
        if (limits.quotes_per_month === null) return;
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const count = await this.prisma.quote.count({
          where: { company_id: companyId, created_at: { gte: startOfMonth } },
        });
        if (count >= limits.quotes_per_month) {
          throw new ForbiddenException(
            `Limite de ${limits.quotes_per_month} orçamentos/mês atingido. Acesse orcivo.com.br para upgrade.`,
          );
        }
        break;
      }

      case 'WORK_ORDERS_MONTH': {
        if (limits.work_orders_per_month === null) return;
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const count = await this.prisma.workOrder.count({
          where: { company_id: companyId, created_at: { gte: startOfMonth } },
        });
        if (count >= limits.work_orders_per_month) {
          throw new ForbiddenException(
            `Limite de ${limits.work_orders_per_month} OS/mês atingido. Acesse orcivo.com.br para upgrade.`,
          );
        }
        break;
      }

      case 'MEMBERS': {
        const count = await this.prisma.companyMember.count({
          where: { company_id: companyId },
        });
        if (count >= limits.members_max) {
          throw new ForbiddenException(
            `Limite de ${limits.members_max} usuário(s) atingido no plano ${company.plan_code}. Acesse orcivo.com.br para upgrade.`,
          );
        }
        break;
      }
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
