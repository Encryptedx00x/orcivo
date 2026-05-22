---
phase: "2A"
plan: "02-P05"
title: "Backend — QuoteModule (CRUD + state machine + BullMQ expiry + cálculo de totais)"
wave: 3
depends_on: ["02-P01", "02-P02"]
files_modified:
  - apps/backend/src/quote/quote.module.ts
  - apps/backend/src/quote/quote.controller.ts
  - apps/backend/src/quote/quote.service.ts
  - apps/backend/src/quote/quote-expiry.processor.ts
  - apps/backend/src/quote/quote.service.spec.ts
  - apps/backend/src/quote/quote.isolation.spec.ts
  - apps/backend/src/app.module.ts
autonomous: true
requirements: ["D2.2"]

must_haves:
  truths:
    - "POST /quotes cria Quote com number sequencial via Redis INCR e calcula subtotal/total no backend"
    - "POST /quotes/:id/send valida DRAFT→SENT, gera approval_token UUID, salva no Redis com TTL 7 dias e no banco"
    - "PATCH /quotes/:id/cancel valida que status é DRAFT|SENT antes de cancelar"
    - "assertValidTransition de shared-types lança Error em transição inválida"
    - "QuoteExpiryProcessor marca DRAFT|SENT como EXPIRED quando valid_until passou"
    - "Cron sweep diário às 2h também expira quotes vencidos (fallback ao BullMQ)"
    - "getByApprovalToken retorna company_id, created_by_user_id, number, status, valid_until, total, customer.phone"
    - "Teste de isolation: Tenant A não vê quotes do Tenant B"
    - "Rotas GET/POST /quotes/public/:token estão em QuotePublicController separado (sem TenantGuard)"
  artifacts:
    - path: "apps/backend/src/quote/quote.service.ts"
      provides: "create, findAll, findOne, send, cancel, getByApprovalToken com tenant scope; cálculo de totais Decimal"
      exports: ["QuoteService"]
    - path: "apps/backend/src/quote/quote.service.spec.ts"
      provides: "Testes unitários da state machine e cálculo de totais"
      contains: "assertValidTransition"
    - path: "apps/backend/src/quote/quote-expiry.processor.ts"
      provides: "BullMQ Processor + @Cron sweep diário que marca quotes expirados"
      exports: ["QuoteExpiryProcessor"]
    - path: "apps/backend/src/quote/quote-public.controller.ts"
      provides: "Controller separado para rotas públicas /quotes/public/:token sem TenantGuard"
      exports: ["QuotePublicController"]
  key_links:
    - from: "apps/backend/src/quote/quote.service.ts"
      to: "redis.incr(quote:seq:{company_id})"
      via: "nextSequence pattern do RESEARCH.md"
      pattern: "quote:seq:"
    - from: "apps/backend/src/quote/quote.service.ts"
      to: "approval_token"
      via: "salvo em quotes.approval_token + Redis quote:approval:{token}"
      pattern: "approval_token"
---

<objective>
Implementar QuoteModule completo: CRUD de orçamentos com cálculo de totais no backend, máquina de estados, geração de approval_token ao enviar, worker BullMQ para expiração automática + cron sweep diário de fallback, e controller separado para rotas públicas.

Purpose: D2.2 — orçamento é o core operacional do produto. Depende de P01 (schema + DTOs) e P02 (infra). O QuoteModule expõe os dados que o QuotePdfService (P07) e o approval flow (P07) consumirão.
Output: QuoteModule com CRUD + send + cancel; BullMQ worker + cron sweep; state machine testada; isolation spec; QuotePublicController separado.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- Schema Prisma após P01: -->
<!-- model Quote { id, company_id, customer_id, number Int, status QuoteStatus, approval_token?, discount_type, discount_value Decimal, subtotal Decimal, total Decimal, pdf_url?, created_by_user_id, ... } -->
<!-- model QuoteItem { id, quote_id, catalog_item_id?, description, quantity Decimal, unit_price Decimal, total Decimal } -->

<!-- DTOs disponíveis após P01: -->
<!-- QuoteCreateSchema, QuoteCreateDto, QuoteItemDto -->
<!-- QuoteUpdateSchema, QuoteUpdateDto -->
<!-- assertValidTransition(from, to) de @orcivo/shared-types — lança Error para transição inválida -->

<!-- Instalação necessária: -->
<!-- pnpm --filter @orcivo/backend add @nestjs/bullmq@11.0.4 bullmq@6.12.3 @nestjs/schedule@4.1.2 -->

<!-- Redis keys: -->
<!-- quote:seq:{company_id} — counter INCR para número sequencial -->
<!-- quote:approval:{token} — TTL 7 dias (604800s) -->

<!-- Cálculo de totais (NUNCA number/float): -->
<!-- item.total = Decimal(quantity) * Decimal(unit_price) -->
<!-- subtotal = soma de item.total -->
<!-- discount = PERCENT: subtotal * (discount_value/100) | FIXED: discount_value -->
<!-- total = subtotal - discount -->
<!-- Usar Decimal.js (já em shared-types helpers/money) ou Prisma.Decimal operations -->

<!-- Pitfall do RESEARCH.md: aprovação dupla → usar $transaction + updateMany com count check -->
<!-- Pitfall: approval_token salvo tanto no banco quanto no Redis (banco = fonte da verdade) -->

<!-- AVISO — TenantGuard NÃO respeita @Public(): -->
<!-- apps/backend/src/auth/guards/tenant.guard.ts usa request.user?.userId e lança ForbiddenException -->
<!-- se userId for undefined. Rotas @Public() passam pelo JwtAuthGuard sem JWT, mas request.user -->
<!-- ficará undefined, causando ForbiddenException no TenantGuard. -->
<!-- SOLUÇÃO: criar QuotePublicController separado (sem @UseGuards no class level) apenas para -->
<!-- GET /quotes/public/:token e POST /quotes/public/:token/approve. -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: QuoteService com state machine, totais, BullMQ, cron sweep + spec unitário</name>
  <files>
    apps/backend/src/quote/quote.service.ts,
    apps/backend/src/quote/quote-expiry.processor.ts,
    apps/backend/src/quote/quote.service.spec.ts
  </files>
  <read_first>
    - apps/backend/src/customer/customer.service.ts (molde de service — padrão a replicar)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 3: Link público de aprovação"
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 5: BullMQ para expiração"
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 6: Número sequencial Redis INCR"
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pitfall 2: Aprovação dupla"
    - apps/backend/package.json (verificar se @nestjs/bullmq e @nestjs/schedule já instalados)
  </read_first>
  <behavior>
    - Test 1: create() com 2 itens → subtotal e total calculados via Decimal (nunca parseFloat)
    - Test 2: send() com quote DRAFT → gera approval_token UUID + salva no Redis TTL 604800
    - Test 3: send() com quote já SENT → lança BadRequestException (assertValidTransition SENT→SENT inválido)
    - Test 4: cancel() com quote APPROVED → lança BadRequestException (estado terminal)
    - Test 5: QuoteExpiryProcessor com quote status=SENT e valid_until no passado → muda para EXPIRED
    - Test 6: QuoteExpiryProcessor com quote já APPROVED → não faz nada (already terminal)
    - Test 7: getByApprovalToken() retorna quote com company_id, created_by_user_id, number, status, valid_until, total
  </behavior>
  <action>
Instalar se necessário:
```bash
pnpm --filter @orcivo/backend add @nestjs/bullmq@11.0.4 bullmq@6.12.3 @nestjs/schedule@4.1.2
```

**quote.service.ts** (principais métodos — seguir molde CustomerService):
```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';
import { QuoteCreateDto, QuoteUpdateDto, assertValidTransition } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @InjectQueue('quote-expiry') private readonly expiryQueue: Queue,
  ) {}

  private computeTotals(items: Array<{ quantity: string; unit_price: string }>, discountType: string, discountValue: string) {
    // NUNCA usar number/float — sempre Decimal.js
    const itemTotals = items.map(i => new Decimal(i.quantity).mul(new Decimal(i.unit_price)));
    const subtotal = itemTotals.reduce((acc, t) => acc.add(t), new Decimal(0));
    const discountDec = new Decimal(discountValue || '0');
    const discount = discountType === 'PERCENT'
      ? subtotal.mul(discountDec).div(100)
      : discountDec;
    const total = subtotal.sub(discount);
    return {
      itemTotals: itemTotals.map(t => t.toFixed(2)),
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
    };
  }

  async create(dto: QuoteCreateDto, companyId: string, userId: string) {
    const number = await this.redis.incr(`quote:seq:${companyId}`);
    const { itemTotals, subtotal, total } = this.computeTotals(dto.items, dto.discount_type ?? 'PERCENT', dto.discount_value ?? '0');

    return this.prisma.quote.create({
      data: {
        company_id: companyId,
        customer_id: dto.customer_id,
        number,
        title: dto.title,
        notes: dto.notes,
        valid_until: dto.valid_until ? new Date(dto.valid_until) : undefined,
        discount_type: dto.discount_type ?? 'PERCENT',
        discount_value: dto.discount_value ?? '0',
        subtotal,
        total,
        created_by_user_id: userId,
        items: {
          create: dto.items.map((item, i) => ({
            catalog_item_id: item.catalog_item_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: itemTotals[i],
          })),
        },
      },
      include: { items: true },
    });
  }

  async findAll(companyId: string, page = 1, limit = 20) {
    const where = { company_id: companyId };
    const data = await this.prisma.quote.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: { select: { id: true, name: true } }, items: true },
    });
    return { data, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, company_id: companyId },
      include: { items: true, customer: true, approval: true },
    });
    if (!quote) throw new NotFoundException();
    return quote;
  }

  async send(id: string, companyId: string) {
    const quote = await this.findOne(id, companyId);
    try { assertValidTransition(quote.status as never, 'SENT'); }
    catch { throw new BadRequestException(`Transição inválida: ${quote.status} → SENT`); }

    const token = crypto.randomUUID();
    const ttl = 7 * 24 * 60 * 60; // 7 dias
    await this.redis.set(`quote:approval:${token}`, id, 'EX', ttl);

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: 'SENT', approval_token: token },
    });

    // Agendar job de expiração se valid_until definido
    if (updated.valid_until) {
      const delay = updated.valid_until.getTime() - Date.now();
      if (delay > 0) {
        await this.expiryQueue.add('expire', { quoteId: id }, { delay });
      }
    }

    const approvalUrl = `${this.config.get('APP_WEB_URL', 'http://localhost:3000')}/approve/${token}`;
    return { ...updated, approvalUrl };
  }

  async cancel(id: string, companyId: string, reason?: string) {
    const quote = await this.findOne(id, companyId);
    try { assertValidTransition(quote.status as never, 'CANCELLED'); }
    catch { throw new BadRequestException(`Transição inválida: ${quote.status} → CANCELLED`); }

    return this.prisma.quote.update({ where: { id }, data: { status: 'CANCELLED', notes: reason } });
  }

  async getByApprovalToken(token: string) {
    // Verificar Redis primeiro, fallback ao banco (Pitfall 7 do RESEARCH.md)
    const cachedId = await this.redis.get(`quote:approval:${token}`);
    const quote = cachedId
      ? await this.prisma.quote.findFirst({
          where: { id: cachedId },
          select: {
            id: true,
            company_id: true,
            created_by_user_id: true,
            number: true,
            status: true,
            valid_until: true,
            total: true,
            title: true,
            discount_type: true,
            discount_value: true,
            subtotal: true,
            customer: { select: { id: true, name: true, phone: true } },
            items: { select: { id: true, description: true, quantity: true, unit_price: true, total: true } },
          },
        })
      : await this.prisma.quote.findFirst({
          where: { approval_token: token },
          select: {
            id: true,
            company_id: true,
            created_by_user_id: true,
            number: true,
            status: true,
            valid_until: true,
            total: true,
            title: true,
            discount_type: true,
            discount_value: true,
            subtotal: true,
            customer: { select: { id: true, name: true, phone: true } },
            items: { select: { id: true, description: true, quantity: true, unit_price: true, total: true } },
          },
        });
    if (!quote) throw new NotFoundException('Orçamento não encontrado ou link inválido');
    return quote;
  }
}
```

**quote-expiry.processor.ts** (conforme Pattern 5 do RESEARCH.md + cron sweep de fallback):
```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('quote-expiry')
@Injectable()
export class QuoteExpiryProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) { super(); }

  async process(job: Job<{ quoteId: string }>) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: job.data.quoteId, status: { in: ['DRAFT', 'SENT'] } },
    });
    if (!quote) return; // já em estado terminal
    if (quote.valid_until && quote.valid_until > new Date()) return; // ainda válido

    await this.prisma.quote.update({ where: { id: job.data.quoteId }, data: { status: 'EXPIRED' } });
  }

  // Cron sweep diário às 2h — fallback para jobs BullMQ perdidos em restart
  @Cron('0 2 * * *')
  async sweepExpiredQuotes() {
    await this.prisma.quote.updateMany({
      where: {
        valid_until: { lt: new Date() },
        status: { in: ['DRAFT', 'SENT'] },
      },
      data: { status: 'EXPIRED' },
    });
  }
}
```

Criar quote.service.spec.ts com os 7 testes comportamentais acima usando mocks.
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend test --testPathPattern=quote.service 2>&1 | tail -20</automated>
  </verify>
  <done>
    - 7 testes unitários passam
    - computeTotals usa Decimal.js (sem parseFloat)
    - send() gera approval_token UUID e salva no Redis TTL 604800
    - cancel() lança BadRequestException para estados terminais
    - QuoteExpiryProcessor não modifica quotes já em estado terminal
    - @Cron('0 2 * * *') presente no QuoteExpiryProcessor (cron sweep)
    - getByApprovalToken() seleciona company_id, created_by_user_id, number, status, valid_until, total
    - apps/backend/src/quote/quote-expiry.processor.ts DEVE conter @Cron('0 2 * * *') e updateMany
  </done>
</task>

<task type="auto">
  <name>Task 2: QuoteController + QuotePublicController + QuoteModule + isolation spec</name>
  <files>
    apps/backend/src/quote/quote.controller.ts,
    apps/backend/src/quote/quote-public.controller.ts,
    apps/backend/src/quote/quote.module.ts,
    apps/backend/src/quote/quote.isolation.spec.ts,
    apps/backend/src/app.module.ts
  </files>
  <read_first>
    - apps/backend/src/customer/customer.controller.ts (molde a replicar)
    - apps/backend/src/customer/customer.isolation.spec.ts (molde do isolation spec)
    - apps/backend/src/app.module.ts (ler antes de modificar)
    - apps/backend/src/auth/guards/tenant.guard.ts (confirmar que TenantGuard NÃO usa IS_PUBLIC)
  </read_first>
  <action>
**quote.controller.ts** (apenas rotas autenticadas — seguindo padrão CustomerController):
```typescript
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { QuoteCreateSchema } from '@orcivo/shared-types';
import { QuoteService } from './quote.service';

interface TenantRequest { companyId: string; user: { id: string }; }

@Controller('quotes')
@UseGuards(JwtAuthGuard, TenantGuard)
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  findAll(@Req() req: TenantRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.quoteService.findAll(req.companyId, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.quoteService.findOne(id, req.companyId);
  }

  @Post()
  @HttpCode(201)
  create(@Body(new ZodValidationPipe(QuoteCreateSchema)) body: unknown, @Req() req: TenantRequest) {
    return this.quoteService.create(body as never, req.companyId, req.user.id);
  }

  @Post(':id/send')
  @HttpCode(200)
  send(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.quoteService.send(id, req.companyId);
  }

  @Patch(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id') id: string, @Req() req: TenantRequest, @Body('reason') reason?: string) {
    return this.quoteService.cancel(id, req.companyId, reason);
  }
}
```

**quote-public.controller.ts** (SEPARADO — sem JwtAuthGuard, sem TenantGuard):
```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { QuoteService } from './quote.service';

// AVISO: Este controller é intencionalmente público — sem JwtAuthGuard, sem TenantGuard.
// TenantGuard lança ForbiddenException se request.user for undefined, mesmo com @Public().
// A separação em controller dedicado é a solução correta.
@Controller('quotes/public')
export class QuotePublicController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get(':token')
  getPublicQuote(@Param('token') token: string) {
    return this.quoteService.getByApprovalToken(token);
  }
  // POST /:token/approve será adicionado em P07 neste mesmo controller
}
```

**quote.module.ts:**
```typescript
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QuoteController } from './quote.controller';
import { QuotePublicController } from './quote-public.controller';
import { QuoteExpiryProcessor } from './quote-expiry.processor';
import { QuoteService } from './quote.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'quote-expiry' })],
  controllers: [QuoteController, QuotePublicController],
  providers: [QuoteService, QuoteExpiryProcessor],
  exports: [QuoteService],
})
export class QuoteModule {}
```

**app.module.ts** — adicionar:
1. `BullModule.forRoot({ connection: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379') } })` em imports (uma vez, global)
2. `ScheduleModule.forRoot()` de @nestjs/schedule em imports
3. `QuoteModule` em imports

Criar **quote.isolation.spec.ts** seguindo o padrão de customer.isolation.spec.ts:
- Criar Tenant A e Tenant B
- Criar Quote para Tenant B
- Verificar: GET /quotes com tokenA retorna array sem quotes do B
- Verificar: GET /quotes/:idDeB com tokenA retorna 404
- Verificar: POST /quotes/:idDeB/send com tokenA retorna 404
- Verificar: GET /quotes/public/:token retorna quote sem autenticação (sem JWT header)
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend test --testPathPattern=quote.isolation 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Testes de isolation passam
    - Backend compila sem erros
    - QuoteModule registrado no AppModule com BullModule e ScheduleModule
    - Rotas públicas em QuotePublicController separado (sem @UseGuards na classe)
    - BullModule.forRoot configurado no AppModule
    - ScheduleModule.forRoot() configurado no AppModule
    - GET /quotes/public/:token retorna 200 sem Authorization header
    - apps/backend/src/quote/quote-expiry.processor.ts CONTÉM @Cron('0 2 * * *') e updateMany
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| cliente autenticado → mutações de Quote | TenantGuard garante company_id; estado validado pelo assertValidTransition antes de qualquer escrita |
| público → GET /quotes/public/:token | Sem JWT; token UUID 122 bits; apenas leitura de dados do orçamento |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-11 | Tampering | cálculo de totais | mitigate | Backend sempre recalcula subtotal/total via Decimal.js — cliente não pode enviar totais falsos |
| T-2A-12 | Tampering | transições de estado inválidas | mitigate | assertValidTransition lança BadRequestException antes de qualquer update; testes unitários cobrem todos os casos |
| T-2A-13 | Information Disclosure | GET /quotes/public/:token | accept | Token expõe nome do cliente e itens do orçamento — intencional para o cliente aprovar; sem company_id na URL |
| T-2A-14 | Denial of Service | BullMQ job com delay longo perdido | mitigate | @Cron('0 2 * * *') sweep diário como fallback — updateMany WHERE valid_until < NOW AND status IN (DRAFT,SENT) |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/backend test --testPathPattern="quote.service|quote.isolation"
pnpm --filter @orcivo/backend build
grep -n "quote:seq:\|quote:approval:" apps/backend/src/quote/quote.service.ts
grep -n "parseFloat\|Number(" apps/backend/src/quote/quote.service.ts | grep -v "Number(page)\|Number(limit)" || echo "OK — sem float em money"
grep -n "@Cron\|updateMany" apps/backend/src/quote/quote-expiry.processor.ts
grep -n "company_id\|created_by_user_id" apps/backend/src/quote/quote.service.ts | grep -i "select\|getByApproval"
```
</verification>

<success_criteria>
- 7 testes unitários e isolation tests passam
- Backend compila sem erros
- Cálculo de totais usa Decimal.js (sem parseFloat em campos monetários)
- approval_token salvo tanto no Redis (TTL 7 dias) quanto no banco (quote.approval_token)
- BullMQ queue 'quote-expiry' registrada no QuoteModule
- QuoteExpiryProcessor não modifica estados terminais
- @Cron('0 2 * * *') presente em quote-expiry.processor.ts com updateMany fallback
- getByApprovalToken() seleciona company_id e created_by_user_id (necessários em P07 approve())
- QuotePublicController separado sem JwtAuthGuard/TenantGuard na classe
- GET /quotes/public/:token retorna 200 sem Authorization header (verificar no isolation spec)
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P05-SUMMARY.md`
</output>
