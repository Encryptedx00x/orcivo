# 03-P02 — BillingModule backend + Asaas client

## Goal
Criar `BillingModule` no NestJS com cliente HTTP para a API Asaas, `SubscriptionService` e endpoints REST para consulta de assinatura.

## Wave
2 (depende de 03-P01)

## Context
- Asaas API: `https://api.asaas.com/v3` (prod) / `https://api-homologacao.asaas.com/v3` (sandbox)
- Auth: header `access_token: $ASAAS_API_KEY`
- Orcivo Livre: não cria Customer/Subscription no Asaas

## Tasks

### T1 — Variáveis de ambiente

Em `apps/backend/src/config.ts` (ou `app.module.ts` ConfigModule), adicionar:
```
ASAAS_API_KEY=         # obrigatório em produção
ASAAS_ENV=sandbox      # sandbox | production
ASAAS_WEBHOOK_TOKEN=   # token para validar HMAC dos webhooks
```

Registrar no `ConfigModule.forRoot({ validationSchema: ... })` como opcionais com default sandbox.

### T2 — AsaasHttpClient (service interno)

Criar `apps/backend/src/billing/asaas.client.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AsaasClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(AsaasClient.name);

  constructor(private readonly config: ConfigService) {
    const env = config.get('ASAAS_ENV', 'sandbox');
    this.baseUrl = env === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-homologacao.asaas.com/v3';
    this.apiKey = config.get('ASAAS_API_KEY', '');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Asaas ${method} ${path} → ${res.status}: ${err}`);
      throw new Error(`Asaas error ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
  }

  async createCustomer(data: { name: string; email?: string; cpfCnpj?: string }): Promise<{ id: string }> {
    return this.request('POST', '/customers', data);
  }

  async createSubscription(data: {
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    nextDueDate: string; // YYYY-MM-DD
    cycle: 'MONTHLY' | 'YEARLY';
    description?: string;
  }): Promise<{ id: string; status: string }> {
    return this.request('POST', '/subscriptions', data);
  }

  async cancelSubscription(asaasSubId: string): Promise<void> {
    await this.request('DELETE', `/subscriptions/${asaasSubId}`);
  }

  async getSubscription(asaasSubId: string): Promise<{ id: string; status: string }> {
    return this.request('GET', `/subscriptions/${asaasSubId}`);
  }
}
```

### T3 — SubscriptionService

Criar `apps/backend/src/billing/subscription.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsaasClient } from './asaas.client';
import { PlanCode, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasClient,
  ) {}

  /** Busca ou cria a Subscription para uma empresa. Livre = sem Asaas. */
  async getOrCreate(companyId: string): Promise<{ status: SubscriptionStatus; plan_code: PlanCode }> {
    const existing = await this.prisma.subscription.findUnique({
      where: { company_id: companyId },
    });
    if (existing) return existing;

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
    });

    // LIVRE não tem subscription no Asaas
    const sub = await this.prisma.subscription.create({
      data: {
        company_id: companyId,
        plan_code: company.plan_code,
        status: 'ACTIVE',
        grace_period_days: this.gracePeriodDays(company.plan_code),
      },
    });
    return sub;
  }

  /** Cria checkout: Customer Asaas + Subscription Asaas → Subscription local TRIALING */
  async createCheckout(companyId: string, planCode: 'SOLO' | 'MAIS' | 'EQUIPE', cycle: 'MONTHLY' | 'YEARLY') {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { members: { where: { role: 'OWNER' }, include: { user: true } } },
    });

    const owner = company.members[0]?.user;
    // Criar Customer no Asaas se não existir
    let sub = await this.prisma.subscription.findUnique({ where: { company_id: companyId } });

    let asaasCustomerId = sub?.asaas_customer_id;
    if (!asaasCustomerId) {
      const customer = await this.asaas.createCustomer({
        name: company.trade_name,
        email: owner?.email,
        cpfCnpj: company.document ?? undefined,
      });
      asaasCustomerId = customer.id;
    }

    const priceMap: Record<string, Record<string, number>> = {
      SOLO: { MONTHLY: 9.90, YEARLY: 79.90 },
      MAIS: { MONTHLY: 19.90, YEARLY: 199.90 },
      EQUIPE: { MONTHLY: 39.90, YEARLY: 399.90 },
    };
    const value = priceMap[planCode][cycle];
    const nextDueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // amanhã

    const asaasSub = await this.asaas.createSubscription({
      customer: asaasCustomerId,
      billingType: 'PIX',
      value,
      nextDueDate,
      cycle: cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
      description: `Orcivo ${planCode} — ${cycle === 'YEARLY' ? 'Anual' : 'Mensal'}`,
    });

    // Atualizar ou criar Subscription local
    const updatedSub = await this.prisma.subscription.upsert({
      where: { company_id: companyId },
      create: {
        company_id: companyId,
        plan_code: planCode as PlanCode,
        status: 'TRIALING',
        asaas_customer_id: asaasCustomerId,
        asaas_sub_id: asaasSub.id,
        grace_period_days: this.gracePeriodDays(planCode as PlanCode),
      },
      update: {
        plan_code: planCode as PlanCode,
        status: 'TRIALING',
        asaas_customer_id: asaasCustomerId,
        asaas_sub_id: asaasSub.id,
      },
    });

    return { subscription: updatedSub, asaas_subscription_id: asaasSub.id };
  }

  async isBlocked(companyId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({ where: { company_id: companyId } });
    if (!sub) return false; // LIVRE sem sub = ativo
    return sub.status === 'BLOCKED';
  }

  private gracePeriodDays(planCode: PlanCode): number {
    const map: Record<PlanCode, number> = { LIVRE: 0, SOLO: 2, MAIS: 3, EQUIPE: 7 };
    return map[planCode] ?? 0;
  }
}
```

### T4 — BillingController

Criar `apps/backend/src/billing/billing.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { TenantRequest } from '../common/interfaces/tenant-request.interface';

@Controller('billing')
export class BillingController {
  constructor(private readonly subs: SubscriptionService) {}

  @Get('subscription')
  async getSubscription(@Req() req: TenantRequest) {
    return this.subs.getOrCreate(req.companyId);
  }

  @Post('checkout')
  async createCheckout(
    @Req() req: TenantRequest,
    @Body() body: { plan_code: 'SOLO' | 'MAIS' | 'EQUIPE'; billing_cycle: 'MONTHLY' | 'YEARLY' },
  ) {
    return this.subs.createCheckout(req.companyId, body.plan_code, body.billing_cycle);
  }
}
```

### T5 — BillingModule

Criar `apps/backend/src/billing/billing.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AsaasClient } from './asaas.client';
import { SubscriptionService } from './subscription.service';
import { BillingController } from './billing.controller';

@Module({
  providers: [AsaasClient, SubscriptionService],
  controllers: [BillingController],
  exports: [SubscriptionService],
})
export class BillingModule {}
```

Registrar em `app.module.ts` imports: `BillingModule`.

## Verification

```bash
# TypeCheck
cd apps/backend && npx tsc --noEmit

# Módulo registrado
grep "BillingModule" apps/backend/src/app.module.ts

# Endpoints existem
grep "@Get\|@Post" apps/backend/src/billing/billing.controller.ts
```

## Notes
- `fetch` nativo Node.js 18+ — sem axios necessário
- Preços em `.ts` são placeholder; o site (P06) mostrará preços definitivos
- `ASAAS_API_KEY` vazia = falha silenciosa em sandbox (log de erro, não crash)
