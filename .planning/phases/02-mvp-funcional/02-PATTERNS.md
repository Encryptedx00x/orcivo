# Phase 2A: MVP Core — Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 42 new/modified files across backend, shared-types, mobile, web
**Analogs found:** 38 / 42 (4 new patterns — no existing analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/backend/src/catalog/catalog.module.ts` | module | — | `apps/backend/src/customer/customer.module.ts` | exact |
| `apps/backend/src/catalog/catalog.controller.ts` | controller | CRUD request-response | `apps/backend/src/customer/customer.controller.ts` | exact |
| `apps/backend/src/catalog/catalog.service.ts` | service | CRUD | `apps/backend/src/customer/customer.service.ts` | exact |
| `apps/backend/src/catalog/catalog.isolation.spec.ts` | test | CRUD | `apps/backend/src/customer/customer.isolation.spec.ts` | exact |
| `apps/backend/src/quote/quote.module.ts` | module | — | `apps/backend/src/customer/customer.module.ts` | role-match |
| `apps/backend/src/quote/quote.controller.ts` | controller | CRUD + event-driven | `apps/backend/src/customer/customer.controller.ts` | role-match |
| `apps/backend/src/quote/quote.service.ts` | service | CRUD + state-machine | `apps/backend/src/customer/customer.service.ts` | role-match |
| `apps/backend/src/quote/quote-pdf.service.ts` | service | file-I/O | — | new pattern |
| `apps/backend/src/quote/quote-expiry.processor.ts` | worker | event-driven | — | new pattern |
| `apps/backend/src/quote/quote.service.spec.ts` | test | unit | `apps/backend/src/customer/customer.service.spec.ts` | role-match |
| `apps/backend/src/quote/quote.isolation.spec.ts` | test | integration | `apps/backend/src/customer/customer.isolation.spec.ts` | exact |
| `apps/backend/src/work-order/work-order.module.ts` | module | — | `apps/backend/src/customer/customer.module.ts` | role-match |
| `apps/backend/src/work-order/work-order.controller.ts` | controller | CRUD + file-I/O | `apps/backend/src/customer/customer.controller.ts` | role-match |
| `apps/backend/src/work-order/work-order.service.ts` | service | CRUD | `apps/backend/src/customer/customer.service.ts` | role-match |
| `apps/backend/src/work-order/work-order-photo.service.ts` | service | file-I/O | — | new pattern |
| `apps/backend/src/work-order/work-order.isolation.spec.ts` | test | integration | `apps/backend/src/customer/customer.isolation.spec.ts` | exact |
| `apps/backend/src/plan-limits/plan-limits.module.ts` | module | — | `apps/backend/src/customer/customer.module.ts` | role-match |
| `apps/backend/src/plan-limits/plan-limits.service.ts` | service | request-response | `apps/backend/src/customer/customer.service.ts` | role-match |
| `apps/backend/src/plan-limits/check-plan-limit.decorator.ts` | utility | — | `apps/backend/src/auth/decorators/public.decorator.ts` | role-match |
| `apps/backend/src/plan-limits/check-plan-limit.guard.ts` | middleware | request-response | `apps/backend/src/auth/guards/tenant.guard.ts` | role-match |
| `apps/backend/src/storage/storage.module.ts` | module | — | `apps/backend/src/customer/customer.module.ts` | role-match |
| `apps/backend/src/storage/storage.service.ts` | service | file-I/O | — | new pattern |
| `apps/backend/src/mail/mail.module.ts` | module | — | `apps/backend/src/customer/customer.module.ts` | role-match |
| `apps/backend/src/mail/mail.service.ts` | service | request-response | `apps/backend/src/auth/auth.service.ts` | role-match |
| `apps/backend/src/app.module.ts` | config | — | self (modification) | exact |
| `prisma/schema.prisma` | model | — | self (modification, Customer model as reference) | exact |
| `packages/shared-types/src/catalog/catalog-item-create.dto.ts` | utility | — | `packages/shared-types/src/customer/customer-create.dto.ts` | exact |
| `packages/shared-types/src/quote/quote-create.dto.ts` | utility | — | `packages/shared-types/src/customer/customer-create.dto.ts` | role-match |
| `packages/shared-types/src/quote/quote-status.enum.ts` | utility | — | `packages/shared-types/src/index.ts` (PlanCodeEnum) | role-match |
| `packages/shared-types/src/quote/quote-approval.dto.ts` | utility | — | `packages/shared-types/src/customer/customer-create.dto.ts` | role-match |
| `packages/shared-types/src/work-order/work-order-create.dto.ts` | utility | — | `packages/shared-types/src/customer/customer-create.dto.ts` | role-match |
| `packages/shared-types/src/auth/forgot-password.dto.ts` | utility | — | `packages/shared-types/src/auth/login.dto.ts` | role-match |
| `packages/shared-types/src/index.ts` | config | — | self (modification) | exact |
| `apps/mobile/src/screens/catalogo/CatalogoScreen.tsx` | component | CRUD | `apps/mobile/src/screens/clientes/ClientesScreen.tsx` | exact |
| `apps/mobile/src/screens/catalogo/CatalogoItemCreateScreen.tsx` | component | CRUD | `apps/mobile/src/screens/clientes/ClienteCreateScreen.tsx` | exact |
| `apps/mobile/src/screens/orcamentos/OrcamentosScreen.tsx` | component | CRUD | `apps/mobile/src/screens/clientes/ClientesScreen.tsx` | exact |
| `apps/mobile/src/screens/orcamentos/OrcamentoCreateScreen.tsx` | component | CRUD | `apps/mobile/src/screens/clientes/ClienteCreateScreen.tsx` | role-match |
| `apps/mobile/src/screens/os/OSScreen.tsx` | component | CRUD | `apps/mobile/src/screens/clientes/ClientesScreen.tsx` | exact |
| `apps/mobile/src/screens/os/OSCreateScreen.tsx` | component | CRUD | `apps/mobile/src/screens/clientes/ClienteCreateScreen.tsx` | role-match |
| `apps/web/app/(app)/catalogo/page.tsx` | component | CRUD | `apps/web/app/(app)/clientes/page.tsx` | exact |
| `apps/web/app/(app)/orcamentos/page.tsx` | component | CRUD | `apps/web/app/(app)/clientes/page.tsx` | exact |
| `apps/web/app/(app)/ordens-de-servico/page.tsx` | component | CRUD | `apps/web/app/(app)/clientes/page.tsx` | exact |
| `apps/web/app/approve/[token]/page.tsx` | component | request-response | — | new pattern |

---

## Pattern Assignments

### NestJS Module Pattern (all domain modules)

**Analog:** `apps/backend/src/customer/customer.module.ts` (lines 1-9)

**Module pattern** — copy verbatim, substituting class names:
```typescript
import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
```

For modules needing external providers (BullMQ, MinIO, Resend), add `imports: []` array with the respective `BullModule.registerQueue()` or global service module.

---

### `apps/backend/src/catalog/catalog.controller.ts` (controller, CRUD)

**Analog:** `apps/backend/src/customer/customer.controller.ts` (lines 1-38)

**Imports pattern** (lines 1-6):
```typescript
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogItemCreateSchema, CatalogItemUpdateSchema } from '@orcivo/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CatalogService } from './catalog.service';
```

**Guard pattern** (lines 12-14) — identical for all authenticated controllers:
```typescript
@Controller('catalog')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}
```

**TenantRequest interface** (line 8-10) — copy to every controller:
```typescript
interface TenantRequest {
  companyId: string;
}
```

**CRUD handler pattern** — copy and adapt:
```typescript
@Get()
findAll(@Req() req: TenantRequest, @Query(new ZodValidationPipe(CatalogListQuerySchema)) query: unknown) {
  return this.catalogService.findAll(req.companyId, query as never);
}

@HttpCode(201)
@Post()
create(@Req() req: TenantRequest, @Body(new ZodValidationPipe(CatalogItemCreateSchema)) body: unknown) {
  return this.catalogService.create(body as never, req.companyId);
}

@Get(':id')
findOne(@Param('id') id: string, @Req() req: TenantRequest) {
  return this.catalogService.findOne(id, req.companyId);
}

@Patch(':id')
update(@Param('id') id: string, @Req() req: TenantRequest, @Body(new ZodValidationPipe(CatalogItemUpdateSchema)) body: unknown) {
  return this.catalogService.update(id, body as never, req.companyId);
}
```

---

### `apps/backend/src/catalog/catalog.service.ts` (service, CRUD)

**Analog:** `apps/backend/src/customer/customer.service.ts` (lines 1-40)

**Imports + constructor pattern** (lines 1-6):
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogItemCreateDto } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}
```

**findAll with company_id scope** (lines 18-30) — mandatory tenant isolation:
```typescript
async findAll(companyId: string, query: CatalogListQueryDto) {
  const { page, limit, search } = query;
  const where = {
    company_id: companyId,
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
  };
  const data = await this.prisma.catalogItem.findMany({
    where,
    orderBy: { created_at: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return { data, page, limit };
}
```

**findOne with 404 cross-tenant** (lines 32-38):
```typescript
async findOne(id: string, companyId: string) {
  const item = await this.prisma.catalogItem.findFirst({
    where: { id, company_id: companyId },
  });
  if (!item) throw new NotFoundException();
  return item;
}
```

**create with company_id injection** (lines 8-14):
```typescript
async create(dto: CatalogItemCreateDto, companyId: string) {
  return this.prisma.catalogItem.create({
    data: { ...dto, company_id: companyId },
  });
}
```

---

### `apps/backend/src/quote/quote.controller.ts` (controller, CRUD + public routes)

**Analog:** `apps/backend/src/customer/customer.controller.ts` + `apps/backend/src/auth/auth.controller.ts`

**Public route pattern** — copy from `apps/backend/src/auth/auth.controller.ts` (lines 26-28, 41-43):
```typescript
import { Public } from '../auth/decorators/public.decorator';

// Rota pública — sem JwtAuthGuard, token único no link
@Get('public/:token')
@Public()
async getPublicQuote(@Param('token') token: string) {
  return this.quoteService.getByApprovalToken(token);
}

@Post('public/:token/approve')
@Public()
@HttpCode(200)
async approveQuote(
  @Param('token') token: string,
  @Body(new ZodValidationPipe(ApproveQuoteSchema)) body: unknown,
  @Req() req: Request,
) {
  return this.quoteService.approve(token, body as never, req.ip, req.headers['user-agent'] as string);
}
```

**Mutation endpoint with idempotency header** — mobile sends `X-Client-Request-Id`:
```typescript
@Post(':id/send')
@HttpCode(200)
send(@Param('id') id: string, @Req() req: TenantRequest) {
  return this.quoteService.send(id, req.companyId);
}
```

---

### `apps/backend/src/quote/quote.service.ts` (service, CRUD + state machine)

**Analog:** `apps/backend/src/customer/customer.service.ts` + `apps/backend/src/auth/auth.service.ts`

**State machine validation** — inline in service, no external lib:
```typescript
// Defined in shared-types; imported and called in service
import { assertValidTransition } from '@orcivo/shared-types';

async updateStatus(quoteId: string, companyId: string, newStatus: QuoteStatus): Promise<void> {
  const quote = await this.findOne(quoteId, companyId); // throws 404 cross-tenant
  assertValidTransition(quote.status as QuoteStatus, newStatus);
  await this.prisma.quote.update({ where: { id: quoteId }, data: { status: newStatus } });
}
```

**Redis sequence counter** — pattern from RESEARCH.md Pattern 6:
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly redis: RedisService,
) {}

async create(dto: QuoteCreateDto, companyId: string, createdByUserId: string) {
  const number = await this.redis.incr(`quote:seq:${companyId}`);
  return this.prisma.quote.create({
    data: { ...dto, company_id: companyId, number, created_by_user_id: createdByUserId },
  });
}
```

**Prisma $transaction for idempotent approval** — critical anti-double-submit:
```typescript
async approve(token: string, dto: ApproveQuoteDto, ip: string, userAgent: string) {
  const quoteId = await this.redis.get(`quote:approval:${token}`);
  if (!quoteId) throw new NotFoundException('Link expirado ou inválido');

  const result = await this.prisma.$transaction(async (tx) => {
    const updated = await tx.quote.updateMany({
      where: { id: quoteId, status: 'SENT' },
      data: { status: 'APPROVED' },
    });
    if (updated.count === 0) throw new ConflictException('Orçamento já aprovado ou não está disponível');

    const approval = await tx.quoteApproval.create({ data: { quote_id: quoteId, ...dto, ip_address: ip, user_agent: userAgent } });
    const quote = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
    const wo = await tx.workOrder.create({
      data: {
        company_id: quote.company_id,
        customer_id: quote.customer_id,
        quote_id: quoteId,
        number: await this.redis.incr(`wo:seq:${quote.company_id}`),
        title: quote.title ?? `OS #${quoteId.slice(0, 8)}`,
        status: 'PENDING',
        created_by_user_id: quote.created_by_user_id,
      },
    });
    return { approval, work_order: wo };
  });
  return result;
}
```

---

### `apps/backend/src/quote/quote-pdf.service.ts` (service, file-I/O) — NEW PATTERN

**No analog in codebase.** Use RESEARCH.md Pattern 1.

Key implementation notes:
- File must have `.tsx` extension (JSX required by `@react-pdf/renderer`)
- `tsconfig.json` in backend must include `"jsx": "react-jsx"` or create a separate `tsconfig.pdf.json`
- Import React explicitly in the file: `import React from 'react';`
- Use `renderToBuffer` (not `renderToStream`) for MinIO upload compatibility
- Watermark conditional: `company.plan_code === 'LIVRE'`

```typescript
// apps/backend/src/quote/quote-pdf.service.tsx
import React from 'react';
import { Injectable } from '@nestjs/common';
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class QuotePdfService {
  constructor(private readonly storage: StorageService) {}

  async generateAndUpload(quote: QuoteData, company: CompanyData): Promise<string> {
    const buffer = await renderToBuffer(
      <Document>
        <Page size="A4" style={styles.page}>
          {/* ... template ... */}
        </Page>
      </Document>
    );
    const objectName = `${company.id}/quotes/${quote.id}.pdf`;
    return this.storage.uploadBuffer('orcivo-pdfs', objectName, buffer, 'application/pdf');
  }
}
```

---

### `apps/backend/src/quote/quote-expiry.processor.ts` (worker, event-driven) — NEW PATTERN

**No analog in codebase.** Use RESEARCH.md Pattern 5.

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Processor('quote-expiry')
@Injectable()
export class QuoteExpiryProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) { super(); }

  async process(job: Job<{ quoteId: string }>) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: job.data.quoteId, status: { in: ['DRAFT', 'SENT'] } },
    });
    if (!quote) return;
    if (quote.valid_until && quote.valid_until > new Date()) return;
    await this.prisma.quote.update({ where: { id: job.data.quoteId }, data: { status: 'EXPIRED' } });
  }
}
```

Cron sweep (add to module as separate provider):
```typescript
// Also add a @Cron('0 2 * * *') method in QuoteService that marks all stale DRAFT|SENT as EXPIRED
// This is the guaranteed fallback when delayed jobs are lost on Redis restart
```

---

### `apps/backend/src/storage/storage.service.ts` (service, file-I/O) — NEW PATTERN

**No analog in codebase.** Use RESEARCH.md Pattern 2.

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Client;

  constructor(private readonly config: ConfigService) {
    this.client = new Client({
      endPoint: config.getOrThrow('MINIO_ENDPOINT'),
      port: parseInt(config.get('MINIO_PORT', '9000')),
      useSSL: config.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: config.getOrThrow('MINIO_ACCESS_KEY'),
      secretKey: config.getOrThrow('MINIO_SECRET_KEY'),
    });
  }

  async onModuleInit() {
    // Create buckets on startup if not exist — prevents NoSuchBucket errors
    for (const bucket of ['orcivo-pdfs', 'orcivo-photos']) {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) await this.client.makeBucket(bucket, 'us-east-1');
    }
  }

  async uploadBuffer(bucket: string, objectName: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(bucket, objectName, buffer, buffer.length, { 'Content-Type': contentType });
    return `${this.config.get('MINIO_PUBLIC_URL')}/${bucket}/${objectName}`;
  }
}
```

---

### `apps/backend/src/mail/mail.service.ts` (service, request-response)

**Analog:** `apps/backend/src/auth/auth.service.ts` (pattern for Redis + external service)

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend | null;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('RESEND_API_KEY');
    // Fallback: MAIL_DRIVER=console logs instead of sending
    this.resend = key ? new Resend(key) : null;
  }

  async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.resend) {
      console.log('[MAIL DEV]', opts.to, opts.subject); // dev fallback
      return;
    }
    await this.resend.emails.send({ from: 'noreply@orcivo.com.br', ...opts });
  }
}
```

---

### `apps/backend/src/plan-limits/check-plan-limit.guard.ts` (middleware, request-response)

**Analog:** `apps/backend/src/auth/guards/tenant.guard.ts` (lines 1-37)

```typescript
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanLimitsService } from './plan-limits.service';
import { PLAN_LIMIT_KEY } from './check-plan-limit.decorator';

@Injectable()
export class CheckPlanLimitGuard implements CanActivate {
  constructor(private reflector: Reflector, private planLimits: PlanLimitsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get(PLAN_LIMIT_KEY, context.getHandler());
    if (!feature) return true;
    const request = context.switchToHttp().getRequest();
    const { allowed } = await this.planLimits.check(request.companyId, feature);
    if (!allowed) throw new ForbiddenException('Recurso não disponível no seu plano');
    return true;
  }
}
```

**Decorator pattern** — copy from `apps/backend/src/auth/decorators/public.decorator.ts` (lines 1-4):
```typescript
import { SetMetadata } from '@nestjs/common';
export const PLAN_LIMIT_KEY = 'planLimit';
export const CheckPlanLimit = (feature: PlanFeature) => SetMetadata(PLAN_LIMIT_KEY, feature);
```

---

### `apps/backend/src/auth/auth.service.ts` — forgot-password addition

**Analog:** same file — add methods following the existing Redis pattern (lines 113-119 for `redis.del`, lines 96-101 for token validation):

```typescript
// Add to existing AuthService — same constructor, same Redis/Prisma pattern
async forgotPassword(email: string): Promise<void> {
  const user = await this.prisma.user.findUnique({ where: { email } });
  if (!user) return; // always 200 — never reveal if email exists
  const token = crypto.randomUUID();
  await this.redis.setex(`pwd:reset:${token}`, 900, user.id); // 15 min
  await this.mail.send({ to: email, subject: 'Redefinir senha — Orcivo', html: `...` });
}

async resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await this.redis.get(`pwd:reset:${token}`);
  if (!userId) throw new BadRequestException('Token inválido ou expirado');
  const hash = await argon2.hash(newPassword);
  await this.prisma.user.update({ where: { id: userId }, data: { password_hash: hash } });
  await this.redis.del(`pwd:reset:${token}`); // single-use — delete immediately
}
```

---

### `apps/backend/src/app.module.ts` — module registration

**Analog:** self, lines 1-29 — add new modules in the same pattern:

```typescript
// Add imports:
import { CatalogModule } from './catalog/catalog.module';
import { QuoteModule } from './quote/quote.module';
import { WorkOrderModule } from './work-order/work-order.module';
import { PlanLimitsModule } from './plan-limits/plan-limits.module';
import { StorageModule } from './storage/storage.module';
import { MailModule } from './mail/mail.module';
import { BullModule } from '@nestjs/bullmq';

// Add to @Module imports array:
BullModule.forRoot({ connection: { host: process.env.REDIS_HOST, port: +process.env.REDIS_PORT } }),
StorageModule,  // global — imported before modules that use it
MailModule,     // global
CatalogModule,
QuoteModule,
WorkOrderModule,
PlanLimitsModule,
```

---

### `prisma/schema.prisma` — model additions

**Analog:** existing Customer model — same conventions:
- `@id @default(uuid())`
- `company_id String` with `@@index([company_id])`
- `Decimal @db.Decimal(12, 2)` for money fields
- `@default(now())` + `@updatedAt`
- `@@map("snake_case_table_name")`
- `onDelete: Cascade` for child tables scoped to company

Full schema for all new models is in `02-RESEARCH.md` lines 639-807. Copy verbatim — it was designed to match the existing schema conventions exactly.

Key enums to add: `CatalogItemType`, `QuoteStatus`, `DiscountType`, `ApprovalMethod`, `WorkOrderStatus`, `PhotoStage`.

---

### `packages/shared-types/src/catalog/catalog-item-create.dto.ts` (DTO, utility)

**Analog:** `packages/shared-types/src/customer/customer-create.dto.ts` (lines 1-15)

```typescript
import { z } from 'zod';

export const CatalogItemCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['SERVICE', 'PRODUCT']),
  unit_price: z.string().regex(/^\d+(\.\d{1,2})?$/), // string decimal — NEVER number
  unit: z.string().max(20).optional(),
  is_active: z.boolean().default(true),
});

export type CatalogItemCreateDto = z.infer<typeof CatalogItemCreateSchema>;
```

**Critical rule from CLAUDE.md:** `unit_price` is always string decimal in DTOs. Never `z.number()`.

---

### `packages/shared-types/src/index.ts` — re-exports

**Analog:** self, lines 15-19 — add new exports at bottom:

```typescript
// Add after existing exports:
export * from './catalog/catalog-item-create.dto';
export * from './catalog/catalog-item-update.dto';
export * from './quote/quote-create.dto';
export * from './quote/quote-status.enum';
export * from './quote/quote-approval.dto';
export * from './work-order/work-order-create.dto';
export * from './work-order/work-order-photo.dto';
export * from './plan/plan-feature.enum';
export * from './auth/forgot-password.dto';
export * from './auth/reset-password.dto';
```

**Critical rule:** The file header (lines 1-3) shows the prohibition — never import `@prisma/client`, `@nestjs/*`, `react`, or `react-native` in this package.

---

### Mobile list screens (CatalogoScreen, OrcamentosScreen, OSScreen)

**Analog:** `apps/mobile/src/screens/clientes/ClientesScreen.tsx` (lines 1-50)

**Imports + state pattern** (lines 1-10):
```typescript
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
```

**Loading + empty + list pattern** (lines 21-39):
```typescript
const [items, setItems] = useState<Item[]>([]);
const [loading, setLoading] = useState(true);

useFocusEffect(useCallback(() => {
  setLoading(true);
  api.get<{ data: Item[] }>('/catalog')
    .then(r => setItems(r.data))
    .catch(() => {})
    .finally(() => setLoading(false));
}, []));

// In return:
{loading ? <ActivityIndicator color="#6D28D9" /> : (
  <FlatList
    data={items}
    keyExtractor={i => i.id}
    renderItem={({ item }) => <View style={styles.item}>...</View>}
    ListEmptyComponent={<Text style={styles.empty}>Nenhum item cadastrado ainda.</Text>}
  />
)}
```

**FAB button** (lines 35-38):
```typescript
<TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CatalogoItemCreate')}>
  <Text style={styles.fabText}>+ Novo item</Text>
</TouchableOpacity>
```

**Design tokens** — copy from ClientesScreen styles (lines 42-50):
```typescript
container: { flex: 1, backgroundColor: '#FFFFFF' },         // --bg white
item: { padding: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
name: { fontSize: 16, fontWeight: '500', color: '#0A0A0F' }, // --ink
empty: { textAlign: 'center', color: '#6B7280', marginTop: 48, fontSize: 14 },
fab: { position: 'absolute', bottom: 24, right: 16, backgroundColor: '#6D28D9', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 14 }, // --purple-600
fabText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
```

---

### Mobile create/form screens (CatalogoItemCreateScreen, OrcamentoCreateScreen, OSCreateScreen)

**Analog:** `apps/mobile/src/screens/clientes/ClienteCreateScreen.tsx` (lines 1-50)

**Zod validation + API call pattern** (lines 10-26):
```typescript
const handleSave = async () => {
  const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
  const parsed = CatalogItemCreateSchema.safeParse(payload);
  if (!parsed.success) {
    Alert.alert('Dados inválidos', parsed.error.issues.map(i => i.message).join('\n'));
    return;
  }
  setLoading(true);
  try {
    await api.post('/catalog', parsed.data);
    navigation.goBack();
  } catch {
    Alert.alert('Erro', 'Não foi possível salvar o item.');
  } finally {
    setLoading(false);
  }
};
```

**Input styles** (lines 44-50):
```typescript
input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
btn: { backgroundColor: '#6D28D9', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
```

**Money input rule:** For `unit_price` fields, always use `Decimal.js` before sending to API — never `parseFloat`:
```typescript
import Decimal from 'decimal.js';
// In handleSave, before api.post:
const price = new Decimal(form.unit_price.replace(',', '.')).toFixed(2);
```

---

### Web list pages (catalogo, orcamentos, ordens-de-servico)

**Analog:** `apps/web/app/(app)/clientes/page.tsx` (lines 1-31)

**Server component + apiFetch pattern** (lines 1-11):
```typescript
import { apiFetch } from '../../../lib/api';
import Link from 'next/link';

export default async function CatalogoPage() {
  let items: CatalogItem[] = [];
  try {
    const data = await apiFetch<{ data: CatalogItem[] }>('/catalog');
    items = data.data;
  } catch {}
  // ...
}
```

**Table + empty + link button pattern** (lines 14-29):
```typescript
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
  <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F' }}>Catálogo</h1>
  <Link href="/catalogo/novo" style={{ backgroundColor: '#6D28D9', color: '#fff', borderRadius: 8, padding: '8px 18px', textDecoration: 'none', fontWeight: 600 }}>+ Novo item</Link>
</div>
{items.length === 0 ? (
  <p style={{ color: '#6B7280' }}>Nenhum item cadastrado ainda.</p>
) : (
  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8 }}>
    ...
  </table>
)}
```

---

### Web form pages (catalogo/novo, orcamentos/novo)

**Analog:** `apps/web/app/(app)/clientes/novo/page.tsx` (lines 1-42)

**'use client' + useState + Zod pattern** (lines 1-20):
```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CatalogItemCreateSchema } from '@orcivo/shared-types';

export default function NovoCatalogoItemPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', unit_price: '', type: 'SERVICE', unit: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = CatalogItemCreateSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.message).join(', ')); return; }
    setLoading(true);
    const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/catalog`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data), credentials: 'include',
    });
    if (!res.ok) { setError('Erro ao salvar.'); setLoading(false); return; }
    router.push('/catalogo'); router.refresh();
  };
}
```

---

### `apps/web/app/approve/[token]/page.tsx` (component, request-response) — NEW PATTERN

**No analog in codebase.** This is the public approval page — Next.js route accessible without auth.

Key implementation notes:
- Route is **outside** `(app)` group (no sidebar/auth layout)
- Fetches quote data using the token (via backend `GET /quotes/public/:token`)
- Renders quote summary + approval form (APPROVE_BUTTON, TYPED_NAME, DRAWN_SIGNATURE)
- On submit: `POST /quotes/public/:token/approve` with approval method + typed name
- Design: white background, Orcivo logo, purple CTA button — matches design system
- No `JwtAuthGuard` needed — token in URL is the credential

```typescript
// apps/web/app/approve/[token]/page.tsx
// Server component that fetches quote; passes to client approval form component
export default async function ApprovePage({ params }: { params: { token: string } }) {
  const quote = await fetch(`${API_URL}/quotes/public/${params.token}`).then(r => r.json()).catch(() => null);
  if (!quote) return <div>Link inválido ou expirado.</div>;
  return <ApprovalForm quote={quote} token={params.token} />;
}
```

---

### `apps/backend/src/customer/customer.isolation.spec.ts` — isolation spec pattern

**Analog:** `apps/backend/src/customer/customer.isolation.spec.ts` (lines 1-89) — replicate for every new module

**Test structure** (lines 1-15):
```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { cleanupDatabase, getTestApp } from '../../test/setup';

describe('CatalogItem — Multi-tenant isolation (TENANT-02)', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let itemBId: string;
```

**Two-tenant setup** (lines 16-68) — copy verbatim substituting resource name:
- Create Tenant A and Tenant B (signup user + company + login for each)
- Create a resource under Tenant B

**Isolation assertions** (lines 74-89):
```typescript
it('empresa A não lista items da empresa B (GET /catalog retorna data=[])', async () => {
  const res = await request(app.getHttpServer())
    .get('/catalog').set('Authorization', `Bearer ${tokenA}`).expect(200);
  expect(res.body.data).toEqual([]);
});

it('GET /catalog/:idDeB como empresa A retorna 404 (não 403)', async () => {
  await request(app.getHttpServer())
    .get(`/catalog/${itemBId}`).set('Authorization', `Bearer ${tokenA}`).expect(404);
});
```

---

## Shared Patterns

### Authentication Guard (all protected controllers)
**Source:** `apps/backend/src/customer/customer.controller.ts` lines 12-14
**Apply to:** All controllers except public approval route
```typescript
@Controller('resource')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ResourceController { ... }
```

### Public Route Decorator (approval route only)
**Source:** `apps/backend/src/auth/decorators/public.decorator.ts` lines 1-4 + `apps/backend/src/auth/auth.controller.ts` lines 26-28
**Apply to:** `GET /quotes/public/:token`, `POST /quotes/public/:token/approve`, `POST /auth/forgot-password`, `POST /auth/reset-password`
```typescript
@Public()
@Post('endpoint')
handler() { ... }
```

### TenantGuard — company_id injection
**Source:** `apps/backend/src/auth/guards/tenant.guard.ts` lines 18-24
**Apply to:** All service methods that scope queries — `findFirst({ where: { id, company_id: companyId } })`
```typescript
// Guard injects req.companyId; controller passes it to service; service scopes all queries
const data = await this.prisma.resource.findFirst({ where: { id, company_id: companyId } });
if (!data) throw new NotFoundException(); // 404 not 403 for cross-tenant
```

### ZodValidationPipe (all controllers)
**Source:** `apps/backend/src/common/zod-validation.pipe.ts` lines 14-25
**Apply to:** All `@Body()` and `@Query()` parameters in controllers
```typescript
@Body(new ZodValidationPipe(ResourceCreateSchema)) body: unknown
// Always cast to never after pipe: body as never
```

### Redis setex pattern (token storage)
**Source:** `apps/backend/src/auth/auth.service.ts` lines 117-118 + `tenant.guard.ts` line 33
**Apply to:** approval token, password reset token
```typescript
await this.redis.setex(`key:${token}`, ttlSeconds, value);
const value = await this.redis.get(`key:${token}`);
await this.redis.del(`key:${token}`);
```

### Mobile API call pattern
**Source:** `apps/mobile/src/screens/clientes/ClientesScreen.tsx` lines 12-18
**Apply to:** All mobile screens
```typescript
import { api } from '../../services/api';
// GET:
api.get<{ data: T[] }>('/endpoint').then(r => setItems(r.data))
// POST:
await api.post('/endpoint', parsed.data);
```

### Mobile Zod validation pattern
**Source:** `apps/mobile/src/screens/clientes/ClienteCreateScreen.tsx` lines 10-22
**Apply to:** All mobile create/edit screens
```typescript
const parsed = Schema.safeParse(payload);
if (!parsed.success) {
  Alert.alert('Dados inválidos', parsed.error.issues.map(i => i.message).join('\n'));
  return;
}
```

### Web server component fetch pattern
**Source:** `apps/web/app/(app)/clientes/page.tsx` lines 6-11
**Apply to:** All web list pages
```typescript
import { apiFetch } from '../../../lib/api';
let items: T[] = [];
try { const data = await apiFetch<{ data: T[] }>('/endpoint'); items = data.data; } catch {}
```

### Web form page pattern
**Source:** `apps/web/app/(app)/clientes/novo/page.tsx` lines 1-3 + 12-20
**Apply to:** All web create/edit pages
```typescript
'use client';
// useState + useRouter + Schema.safeParse + fetch with credentials: 'include'
```

### Money handling (all tiers)
**Apply to:** Every field representing price, amount, total, subtotal, discount_value
- Backend schema: `Decimal @db.Decimal(12, 2)`
- API JSON: string decimal (e.g., `"149.90"`)
- DTOs: `z.string().regex(/^\d+(\.\d{1,2})?$/)`
- Mobile/web display: `new Decimal(value).toFixed(2)` — never `parseFloat()`

### Design tokens (all UI)
**Source:** `apps/mobile/src/screens/clientes/ClientesScreen.tsx` lines 42-50 + `apps/web/app/(app)/clientes/novo/page.tsx` lines 40-41
```
Primary:   #6D28D9  (--purple-600)
Background: #FFFFFF  (--bg)
Ink:       #0A0A0F  (--ink)
Border:    #E5E7EB
Muted:     #6B7280
Error:     #DC2626
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/backend/src/quote/quote-pdf.service.tsx` | service | file-I/O | First PDF generation in codebase; @react-pdf/renderer pattern |
| `apps/backend/src/quote/quote-expiry.processor.ts` | worker | event-driven | First BullMQ processor in codebase |
| `apps/backend/src/storage/storage.service.ts` | service | file-I/O | First MinIO integration in codebase |
| `apps/web/app/approve/[token]/page.tsx` | component | request-response | First public (no-auth) page in web; outside (app) layout group |

---

## Metadata

**Analog search scope:** `apps/backend/src/`, `apps/mobile/src/`, `apps/web/app/`, `packages/shared-types/src/`
**Files scanned:** 26 source files read directly
**Pattern extraction date:** 2026-05-22
