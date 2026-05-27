# 03-P01 — Schema Prisma + DTOs Fase 3

## Goal
Adicionar `Subscription`, `SubscriptionPayment`, `WebhookEvent` e `PlanLimit` ao schema, gerar DTOs Zod no shared-types.

## Wave
1 (foundation — nenhum outro plano pode começar antes)

## Context
- Schema atual: `Company.plan_code` existe, sem modelos de billing
- Reler CONTEXT.md da Fase 3 antes de iniciar
- Seguir o molde de `prisma/schema.prisma` existente (campos em snake_case, `@@map` para tabela)

## Tasks

### T1 — Adicionar modelos ao schema.prisma

Adicionar após o bloco `Quote` no schema:

```prisma
// ─── Billing ─────────────────────────────────────────────────────────────────

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  BLOCKED
  CANCELLED
  EXPIRED
}

enum WebhookProvider {
  ASAAS
}

enum WebhookEventStatus {
  PENDING
  PROCESSED
  FAILED
  SKIPPED
}

model Subscription {
  id                String             @id @default(uuid())
  company_id        String             @unique
  company           Company            @relation(fields: [company_id], references: [id])
  plan_code         PlanCode
  status            SubscriptionStatus @default(ACTIVE)
  asaas_customer_id String?            // ID do Customer no Asaas
  asaas_sub_id      String?            // ID da Subscription no Asaas
  current_period_start DateTime?
  current_period_end   DateTime?
  grace_period_days    Int             @default(0) // carência configurável
  blocked_at           DateTime?       // quando foi bloqueado
  past_due_at          DateTime?       // quando entrou em PAST_DUE
  cancelled_at         DateTime?
  created_at           DateTime        @default(now())
  updated_at           DateTime        @updatedAt
  payments             SubscriptionPayment[]

  @@map("subscriptions")
}

model SubscriptionPayment {
  id              String   @id @default(uuid())
  subscription_id String
  subscription    Subscription @relation(fields: [subscription_id], references: [id])
  asaas_payment_id String?  @unique
  amount          Decimal  @db.Decimal(12, 2)
  status          String   // confirmed, overdue, failed, refunded
  due_date        DateTime?
  paid_at         DateTime?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  @@map("subscription_payments")
}

model WebhookEvent {
  id               String            @id @default(uuid())
  provider         WebhookProvider
  event_id         String            // ID do evento no provedor
  event_type       String            // payment_confirmed, subscription_cancelled, etc.
  idempotency_key  String            @unique // sha256(provider+event_id+event_type)
  status           WebhookEventStatus @default(PENDING)
  raw_payload_json Json
  error_message    String?
  processed_at     DateTime?
  created_at       DateTime          @default(now())
  updated_at       DateTime          @updatedAt

  @@map("webhook_events")
}

model PlanLimit {
  id         String   @id @default(uuid())
  plan_code  PlanCode @unique
  customers_max     Int? // null = sem limite de uso justo
  quotes_per_month  Int?
  work_orders_per_month Int?
  members_max       Int
  has_logo          Boolean @default(true)
  pdf_watermark     Boolean @default(false)
  has_reports       Boolean @default(false)
  has_contracts     Boolean @default(false)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("plan_limits")
}
```

Adicionar relação na Company:
```prisma
  subscription  Subscription?
```

### T2 — Seed dos PlanLimits

Em `prisma/seed.ts`, adicionar upsert dos 4 planos:
```typescript
await prisma.planLimit.upsert({
  where: { plan_code: 'LIVRE' },
  create: {
    plan_code: 'LIVRE',
    customers_max: 5,
    quotes_per_month: 10,
    work_orders_per_month: 5,
    members_max: 1,
    has_logo: false,  // logo Orcivo — não usa logo própria
    pdf_watermark: true,
    has_reports: false,
    has_contracts: false,
  },
  update: {},
});
// SOLO: customers=50, quotes=50, os=30, members=1, logo=true, watermark=false
// MAIS: customers=200, quotes=null, os=null, members=3, logo=true, reports=true
// EQUIPE: customers=null, quotes=null, os=null, members=10, logo=true, reports=true, contracts=true
```

### T3 — DTOs no shared-types

Criar `packages/shared-types/src/billing/`:

**subscription.dto.ts:**
```typescript
import { z } from 'zod';

export const SubscriptionStatusEnum = z.enum(['TRIALING','ACTIVE','PAST_DUE','BLOCKED','CANCELLED','EXPIRED']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

export const PlanLimitsResponseSchema = z.object({
  plan_code: z.enum(['LIVRE','SOLO','MAIS','EQUIPE']),
  customers_max: z.number().nullable(),
  quotes_per_month: z.number().nullable(),
  work_orders_per_month: z.number().nullable(),
  members_max: z.number(),
  has_logo: z.boolean(),
  pdf_watermark: z.boolean(),
  has_reports: z.boolean(),
  has_contracts: z.boolean(),
  subscription_status: SubscriptionStatusEnum.nullable(), // null = LIVRE sem assinatura
  is_blocked: z.boolean(),
});
export type PlanLimitsResponse = z.infer<typeof PlanLimitsResponseSchema>;

export const CreateCheckoutSessionSchema = z.object({
  plan_code: z.enum(['SOLO','MAIS','EQUIPE']),
  billing_cycle: z.enum(['MONTHLY','YEARLY']),
});
export type CreateCheckoutSessionDto = z.infer<typeof CreateCheckoutSessionSchema>;
```

Exportar de `packages/shared-types/src/index.ts`.

### T4 — Rodar prisma db push (dev) e validar

```bash
cd apps/backend && npx prisma db push
npx prisma db seed  # se seed existir
npx prisma generate
```

Verificar output sem erros.

## Verification

```bash
# 1. Schema compila
cd apps/backend && npx prisma validate

# 2. DTOs exportados
grep "PlanLimitsResponse\|SubscriptionStatus" packages/shared-types/src/index.ts

# 3. Modelos no schema
grep "model Subscription\|model WebhookEvent\|model PlanLimit" prisma/schema.prisma
```

## Notes
- Não fazer `prisma migrate` ainda — será feito no P09 (Wave 5) junto com os demais
- Se `prisma db push` falhar em produção, revisar campos `?` (opcionais)
- `grace_period_days` default 0 para LIVRE (sem carência)
