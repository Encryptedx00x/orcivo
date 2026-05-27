# 03-P03 — WebhookModule + BullMQ worker

## Goal
Receber webhooks do Asaas com idempotência garantida via `WebhookEvent`, processar assincronamente via BullMQ e atualizar status da `Subscription`.

## Wave
2 (depende de 03-P01; pode rodar em paralelo com 03-P02)

## Context
- `WebhookEvent` já no schema (P01)
- BullMQ já instalado no projeto (usado em QuoteModule)
- Webhook Asaas: POST com header `asaas-access-token: $ASAAS_WEBHOOK_TOKEN`

## Tasks

### T1 — WebhookProcessor (BullMQ)

Criar `apps/backend/src/webhook/webhook-asaas.processor.ts`:

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const ASAAS_QUEUE = 'asaas-webhook';

interface AsaasWebhookPayload {
  event: string;
  payment?: { id: string; customer: string; status: string; value: number; dueDate: string; paymentDate?: string };
  subscription?: { id: string; status: string };
}

@Processor(ASAAS_QUEUE)
@Injectable()
export class WebhookAsaasProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookAsaasProcessor.name);

  constructor(private readonly prisma: PrismaService) { super(); }

  async process(job: Job<{ webhookEventId: string; payload: AsaasWebhookPayload }>): Promise<void> {
    const { webhookEventId, payload } = job.data;

    try {
      await this.prisma.$transaction(async (tx) => {
        const event = await tx.webhookEvent.findUniqueOrThrow({ where: { id: webhookEventId } });
        if (event.status !== 'PENDING') return; // já processado

        await this.handleEvent(tx, payload);

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
      });
      throw err; // BullMQ vai retry
    }
  }

  private async handleEvent(tx: any, payload: AsaasWebhookPayload): Promise<void> {
    const { event, payment, subscription: sub } = payload;

    // Encontrar Subscription pelo asaas_sub_id ou asaas_customer_id
    let dbSub = sub?.id
      ? await tx.subscription.findFirst({ where: { asaas_sub_id: sub.id } })
      : payment?.customer
        ? await tx.subscription.findFirst({ where: { asaas_customer_id: payment.customer } })
        : null;

    if (!dbSub) {
      this.logger.warn(`Subscription não encontrada para evento ${event}`);
      return;
    }

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await tx.subscription.update({
          where: { id: dbSub.id },
          data: { status: 'ACTIVE', past_due_at: null, blocked_at: null },
        });
        // Atualizar plan_code na Company
        if (dbSub.plan_code) {
          await tx.company.update({ where: { id: dbSub.company_id }, data: { plan_code: dbSub.plan_code } });
        }
        // Registrar pagamento
        if (payment?.id) {
          await tx.subscriptionPayment.upsert({
            where: { asaas_payment_id: payment.id },
            create: {
              subscription_id: dbSub.id,
              asaas_payment_id: payment.id,
              amount: payment.value,
              status: 'confirmed',
              due_date: payment.dueDate ? new Date(payment.dueDate) : null,
              paid_at: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
            },
            update: { status: 'confirmed', paid_at: payment.paymentDate ? new Date(payment.paymentDate) : new Date() },
          });
        }
        break;

      case 'PAYMENT_OVERDUE':
        if (dbSub.status === 'ACTIVE' || dbSub.status === 'TRIALING') {
          await tx.subscription.update({
            where: { id: dbSub.id },
            data: { status: 'PAST_DUE', past_due_at: new Date() },
          });
        }
        break;

      case 'SUBSCRIPTION_CANCELLED':
        await tx.subscription.update({
          where: { id: dbSub.id },
          data: { status: 'CANCELLED', cancelled_at: new Date() },
        });
        break;

      default:
        this.logger.log(`Evento Asaas não tratado: ${event}`);
    }
  }
}
```

### T2 — WebhookController

Criar `apps/backend/src/webhook/webhook.controller.ts`:

```typescript
import { Controller, Post, Body, Headers, RawBodyRequest, Req, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { ASAAS_QUEUE } from './webhook-asaas.processor';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly webhookToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(ASAAS_QUEUE) private readonly queue: Queue,
  ) {
    this.webhookToken = config.get('ASAAS_WEBHOOK_TOKEN', '');
  }

  @Public()
  @Post('asaas')
  async handleAsaas(
    @Headers('asaas-access-token') token: string,
    @Body() payload: any,
  ) {
    // Validar token HMAC (se configurado)
    if (this.webhookToken && token !== this.webhookToken) {
      throw new UnauthorizedException('Token de webhook inválido');
    }

    const eventId = payload.payment?.id ?? payload.subscription?.id ?? payload.id ?? String(Date.now());
    const eventType = payload.event ?? 'UNKNOWN';
    const provider = 'ASAAS';

    // Idempotency key
    const idempotencyKey = createHash('sha256')
      .update(`${provider}:${eventId}:${eventType}`)
      .digest('hex');

    // INSERT ON CONFLICT DO NOTHING
    let webhookEvent: { id: string } | null = null;
    try {
      webhookEvent = await this.prisma.webhookEvent.create({
        data: {
          provider,
          event_id: eventId,
          event_type: eventType,
          idempotency_key: idempotencyKey,
          status: 'PENDING',
          raw_payload_json: payload,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Unique constraint = já processado
        this.logger.log(`WebhookEvent duplicado (idempotent): ${idempotencyKey}`);
        return { received: true, duplicate: true };
      }
      throw e;
    }

    // Enfileirar processamento assíncrono
    await this.queue.add('process', { webhookEventId: webhookEvent.id, payload });

    return { received: true };
  }
}
```

### T3 — WebhookModule

Criar `apps/backend/src/webhook/webhook.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './webhook.controller';
import { WebhookAsaasProcessor } from './webhook-asaas.processor';
import { ASAAS_QUEUE } from './webhook-asaas.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: ASAAS_QUEUE }),
  ],
  controllers: [WebhookController],
  providers: [WebhookAsaasProcessor],
})
export class WebhookModule {}
```

Registrar em `app.module.ts` imports: `WebhookModule`.

### T4 — Adicionar CronJob para verificar carência

Em `apps/backend/src/billing/subscription.service.ts`, adicionar método (chamado por Cron diário):

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async checkGracePeriods(): Promise<void> {
  // Buscar PAST_DUE onde past_due_at + grace_period_days < now
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
      this.logger.warn(`Subscription ${sub.id} bloqueada após carência de ${sub.grace_period_days}d`);
    }
  }
}
```

## Verification

```bash
# TypeCheck
cd apps/backend && npx tsc --noEmit

# WebhookModule registrado
grep "WebhookModule" apps/backend/src/app.module.ts

# Idempotência via chave única
grep "idempotency_key.*unique\|@unique" prisma/schema.prisma

# Endpoint público
grep "@Public" apps/backend/src/webhook/webhook.controller.ts
```

## Notes
- O endpoint POST /webhooks/asaas deve estar no `@Public()` (sem JWT)
- Se Redis estiver down, BullMQ vai falhar — considerar fallback síncrono para dev
- ASAAS_WEBHOOK_TOKEN deve ser configurado em produção; em sandbox pode ser vazio
