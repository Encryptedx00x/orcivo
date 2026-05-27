# 03-P04 — PlanLimitsService completo + GET /me/plan-limits + enforce nos endpoints

## Goal
Substituir o scaffold do `PlanLimitsService` por implementação completa com limites reais do banco, expor `GET /me/plan-limits`, e enforçar limites de criação nos módulos existentes.

## Wave
3 (depende de 03-P01 para ter `PlanLimit` no banco)

## Context
- `PlanLimitsService` atual só verifica `PDF_WATERMARK`
- `PlanLimit` model criado em P01 com seed dos 4 planos
- Limites: customers_max, quotes_per_month, work_orders_per_month, members_max

## Tasks

### T1 — Reescrever PlanLimitsService

Substituir `apps/backend/src/plan-limits/plan-limits.service.ts`:

```typescript
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanCode, Prisma } from '@prisma/client';

export type LimitKey = 'CUSTOMERS' | 'QUOTES_MONTH' | 'WORK_ORDERS_MONTH' | 'MEMBERS';

@Injectable()
export class PlanLimitsService {
  private readonly logger = new Logger(PlanLimitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Retorna os limites do plano da empresa */
  async getLimits(companyId: string) {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { subscription: true },
    });

    const limits = await this.prisma.planLimit.findUniqueOrThrow({
      where: { plan_code: company.plan_code },
    });

    const subStatus = company.subscription?.status ?? null;
    const isBlocked = subStatus === 'BLOCKED';

    return {
      plan_code: company.plan_code,
      customers_max: limits.customers_max,
      quotes_per_month: limits.quotes_per_month,
      work_orders_per_month: limits.work_orders_per_month,
      members_max: limits.members_max,
      has_logo: limits.has_logo,
      pdf_watermark: limits.pdf_watermark,
      has_reports: limits.has_reports,
      has_contracts: limits.has_contracts,
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
      throw new ForbiddenException('Sua assinatura está inativa. Acesse o site para regularizar.');
    }

    const limits = await this.prisma.planLimit.findUniqueOrThrow({
      where: { plan_code: company.plan_code },
    });

    switch (key) {
      case 'CUSTOMERS': {
        if (limits.customers_max === null) return; // sem limite
        const count = await this.prisma.customer.count({
          where: { company_id: companyId, is_active: true },
        });
        if (count >= limits.customers_max) {
          throw new ForbiddenException(
            `Limite de ${limits.customers_max} clientes atingido no plano ${company.plan_code}. ` +
            `Acesse o site para fazer upgrade.`
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
            `Limite de ${limits.quotes_per_month} orçamentos/mês atingido. Acesse o site para upgrade.`
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
            `Limite de ${limits.work_orders_per_month} OS/mês atingido. Acesse o site para upgrade.`
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
            `Limite de ${limits.members_max} usuário(s) atingido no plano ${company.plan_code}.`
          );
        }
        break;
      }
    }
  }

  /** Compatibilidade retroativa com o scaffold anterior */
  async check(companyId: string, feature: string): Promise<{ allowed: boolean; reason?: string }> {
    if (feature === 'PDF_WATERMARK') {
      const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
      const limits = await this.prisma.planLimit.findUniqueOrThrow({ where: { plan_code: company.plan_code } });
      return { allowed: !limits.pdf_watermark };
    }
    return { allowed: true };
  }
}
```

### T2 — Endpoint GET /me/plan-limits

Adicionar ao `CompanyController` (ou criar `MeController`):

```typescript
// Em apps/backend/src/company/company.controller.ts (ou me.controller.ts)
@Get('me/plan-limits')
async getPlanLimits(@Req() req: TenantRequest) {
  return this.planLimitsService.getLimits(req.companyId);
}
```

Injetar `PlanLimitsService` no módulo correspondente.

### T3 — Enforçar limites no CustomerService

Em `apps/backend/src/customer/customer.service.ts`, antes do `prisma.customer.create`:

```typescript
// No método create():
await this.planLimitsService.enforceLimit(companyId, 'CUSTOMERS');
// ... resto do create
```

### T4 — Enforçar limites no QuoteService

Em `apps/backend/src/quote/quote.service.ts`, método `create()`:

```typescript
await this.planLimitsService.enforceLimit(companyId, 'QUOTES_MONTH');
```

### T5 — Enforçar limites no WorkOrderService

Em `apps/backend/src/work-order/work-order.service.ts`, método `create()`:

```typescript
await this.planLimitsService.enforceLimit(companyId, 'WORK_ORDERS_MONTH');
```

### T6 — Atualizar quote-pdf.service para usar check() atualizado

Verificar que `quote-pdf.service.tsx` ainda funciona com o `check('PDF_WATERMARK')` da T1.

## Verification

```bash
# TypeCheck
cd apps/backend && npx tsc --noEmit

# Endpoint registrado
grep "plan-limits\|getPlanLimits" apps/backend/src/company/company.controller.ts

# enforceLimit chamado nos services
grep "enforceLimit" apps/backend/src/customer/customer.service.ts
grep "enforceLimit" apps/backend/src/quote/quote.service.ts
grep "enforceLimit" apps/backend/src/work-order/work-order.service.ts

# PlanLimits seed existe
grep "planLimit.upsert\|PlanLimit" prisma/seed.ts
```

## Notes
- ForbiddenException 403 é o código correto para limite atingido
- Mensagem deve sugerir upgrade mas nunca mencionar preço ou "fora do app"
- PDF watermark ainda funciona via `check()` retrocompatível
