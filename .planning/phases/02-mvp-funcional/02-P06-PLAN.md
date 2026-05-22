---
phase: "2A"
plan: "02-P06"
title: "Backend — WorkOrderModule (CRUD + upload de fotos)"
wave: 3
depends_on: ["02-P01", "02-P02"]
files_modified:
  - apps/backend/src/work-order/work-order.module.ts
  - apps/backend/src/work-order/work-order.controller.ts
  - apps/backend/src/work-order/work-order.service.ts
  - apps/backend/src/work-order/work-order-photo.service.ts
  - apps/backend/src/work-order/work-order.isolation.spec.ts
  - apps/backend/src/app.module.ts
autonomous: true
requirements: ["D2.5"]

must_haves:
  truths:
    - "POST /work-orders cria OS com number sequencial via Redis INCR"
    - "PATCH /work-orders/:id/status valida transições PENDING→IN_PROGRESS→DONE|CANCELLED"
    - "POST /work-orders/:id/photos recebe multipart, valida image/* e tamanho ≤10MB, salva no MinIO"
    - "WorkOrderPhoto retorna URL pública do MinIO em file_url"
    - "Tenant A não acessa work-orders ou fotos do Tenant B"
  artifacts:
    - path: "apps/backend/src/work-order/work-order.service.ts"
      provides: "create, findAll, findOne, updateStatus com tenant scope"
      exports: ["WorkOrderService"]
    - path: "apps/backend/src/work-order/work-order-photo.service.ts"
      provides: "uploadPhoto com validação de tipo/tamanho + MinIO upload"
      exports: ["WorkOrderPhotoService"]
    - path: "apps/backend/src/work-order/work-order.isolation.spec.ts"
      provides: "Teste de multi-tenant isolation"
      contains: "Multi-tenant isolation"
  key_links:
    - from: "apps/backend/src/work-order/work-order-photo.service.ts"
      to: "StorageService.uploadBuffer"
      via: "orcivo-photos/{company_id}/work-orders/{wo_id}/{stage}/{uuid}.jpg"
      pattern: "uploadBuffer"
    - from: "apps/backend/src/work-order/work-order.controller.ts"
      to: "POST /work-orders/:id/photos"
      via: "FileInterceptor + validação multipart"
      pattern: "FileInterceptor"
---

<objective>
Implementar WorkOrderModule completo: CRUD de Ordens de Serviço com número sequencial, máquina de estados simples (PENDING→IN_PROGRESS→DONE|CANCELLED), e upload de fotos por stage (BEFORE/DURING/AFTER) via StorageService.

Purpose: D2.5 — OS é o entregável final do técnico. O upload de fotos (proxy do backend) é crítico para documentação do serviço. WorkOrder também é criada automaticamente na aprovação do orçamento (flow do P07).
Output: WorkOrderModule com CRUD + foto upload; isolation spec; registrado no AppModule.
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
<!-- model WorkOrder { id, company_id, customer_id, quote_id? @unique, number Int, title, status WorkOrderStatus @default(PENDING), scheduled_at?, started_at?, finished_at?, notes?, assigned_to_user_id?, created_by_user_id } -->
<!-- model WorkOrderPhoto { id, company_id, work_order_id, uploaded_by_user_id, photo_stage PhotoStage, file_url, caption? } -->
<!-- enum WorkOrderStatus { PENDING IN_PROGRESS DONE CANCELLED } -->
<!-- enum PhotoStage { BEFORE DURING AFTER } -->

<!-- StorageService disponível após P02: -->
<!-- async uploadBuffer(bucket: string, objectName: string, buffer: Buffer, contentType: string): Promise<string> -->
<!-- Bucket para fotos: 'orcivo-photos' -->
<!-- Path: '{company_id}/work-orders/{work_order_id}/{stage}/{uuid}.jpg' -->

<!-- DTOs disponíveis após P01: -->
<!-- WorkOrderCreateSchema, WorkOrderCreateDto -->
<!-- WorkOrderUpdateSchema, WorkOrderUpdateDto -->

<!-- NestJS file upload: @nestjs/platform-express FileInterceptor + multer -->
<!-- Validação: mimetype deve ser image/* ; tamanho max 10MB (10 * 1024 * 1024) -->
<!-- pnpm --filter @orcivo/backend add @types/multer (se não existir) -->

<!-- Redis INCR para number sequencial: work-order:seq:{company_id} -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: WorkOrderService + WorkOrderPhotoService</name>
  <files>
    apps/backend/src/work-order/work-order.service.ts,
    apps/backend/src/work-order/work-order-photo.service.ts
  </files>
  <read_first>
    - apps/backend/src/customer/customer.service.ts (molde de service a replicar)
    - apps/backend/src/storage/storage.service.ts (interface do StorageService criado em P02)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 2: Upload para MinIO via proxy"
  </read_first>
  <action>
**work-order.service.ts:**
```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { WorkOrderCreateDto, WorkOrderUpdateDto } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

const WO_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  PENDING:     ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['DONE', 'CANCELLED'],
  DONE:        [],
  CANCELLED:   [],
};

@Injectable()
export class WorkOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: WorkOrderCreateDto, companyId: string, userId: string, quoteId?: string) {
    const number = await this.redis.incr(`work-order:seq:${companyId}`);
    return this.prisma.workOrder.create({
      data: {
        company_id: companyId,
        customer_id: dto.customer_id,
        quote_id: quoteId,
        number,
        title: dto.title,
        notes: dto.notes,
        scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
        assigned_to_user_id: dto.assigned_to_user_id,
        created_by_user_id: userId,
      },
    });
  }

  async findAll(companyId: string, page = 1, limit = 20) {
    const data = await this.prisma.workOrder.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: { select: { id: true, name: true } }, photos: true },
    });
    return { data, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, company_id: companyId },
      include: { customer: true, photos: true, quote: { select: { id: true, number: true } } },
    });
    if (!wo) throw new NotFoundException();
    return wo;
  }

  async updateStatus(id: string, companyId: string, newStatus: WorkOrderStatus) {
    const wo = await this.findOne(id, companyId);
    const current = wo.status as WorkOrderStatus;
    if (!WO_TRANSITIONS[current].includes(newStatus)) {
      throw new BadRequestException(`Transição inválida: ${current} → ${newStatus}`);
    }
    const data: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'IN_PROGRESS') data.started_at = new Date();
    if (newStatus === 'DONE') data.finished_at = new Date();
    return this.prisma.workOrder.update({ where: { id }, data });
  }

  async update(id: string, dto: WorkOrderUpdateDto, companyId: string) {
    await this.findOne(id, companyId);
    const { status, ...rest } = dto;
    if (status) return this.updateStatus(id, companyId, status as WorkOrderStatus);
    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...rest,
        scheduled_at: rest.scheduled_at ? new Date(rest.scheduled_at) : undefined,
        started_at: rest.started_at ? new Date(rest.started_at) : undefined,
        finished_at: rest.finished_at ? new Date(rest.finished_at) : undefined,
      },
    });
  }
}
```

**work-order-photo.service.ts:**
```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { WorkOrderService } from './work-order.service';

type PhotoStage = 'BEFORE' | 'DURING' | 'AFTER';
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_PREFIXES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class WorkOrderPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly workOrderService: WorkOrderService,
  ) {}

  async uploadPhoto(
    workOrderId: string,
    companyId: string,
    userId: string,
    file: Express.Multer.File,
    stage: PhotoStage,
    caption?: string,
  ) {
    // Validar tipo e tamanho
    if (!ALLOWED_MIME_PREFIXES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo inválido. Use JPEG, PNG ou WebP.');
    }
    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException('Arquivo muito grande. Máximo: 10MB.');
    }

    // Verificar que work order pertence ao tenant (lança 404 se cross-tenant)
    await this.workOrderService.findOne(workOrderId, companyId);

    const ext = file.mimetype.split('/')[1] || 'jpg';
    const objectName = `${companyId}/work-orders/${workOrderId}/${stage.toLowerCase()}/${crypto.randomUUID()}.${ext}`;
    const fileUrl = await this.storage.uploadBuffer('orcivo-photos', objectName, file.buffer, file.mimetype);

    return this.prisma.workOrderPhoto.create({
      data: {
        company_id: companyId,
        work_order_id: workOrderId,
        uploaded_by_user_id: userId,
        photo_stage: stage,
        file_url: fileUrl,
        caption,
      },
    });
  }

  async getPhotos(workOrderId: string, companyId: string) {
    await this.workOrderService.findOne(workOrderId, companyId); // tenant check
    return this.prisma.workOrderPhoto.findMany({
      where: { work_order_id: workOrderId, company_id: companyId },
      orderBy: [{ photo_stage: 'asc' }, { created_at: 'asc' }],
    });
  }
}
```
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend build 2>&1 | grep -E "^.*error TS" | head -10 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - Ambos os services compilam sem erros TypeScript
    - work-order:seq:{company_id} usado para número sequencial
    - uploadPhoto valida mimetype e tamanho antes de chamar StorageService
    - Toda query inclui company_id (tenant scope)
  </done>
</task>

<task type="auto">
  <name>Task 2: WorkOrderController + Module + isolation spec</name>
  <files>
    apps/backend/src/work-order/work-order.controller.ts,
    apps/backend/src/work-order/work-order.module.ts,
    apps/backend/src/work-order/work-order.isolation.spec.ts,
    apps/backend/src/app.module.ts
  </files>
  <read_first>
    - apps/backend/src/customer/customer.controller.ts (molde a replicar)
    - apps/backend/src/customer/customer.isolation.spec.ts (molde do isolation spec)
    - apps/backend/src/app.module.ts (ler antes de modificar)
  </read_first>
  <action>
**work-order.controller.ts:**
```typescript
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WorkOrderCreateSchema, WorkOrderUpdateSchema } from '@orcivo/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { WorkOrderPhotoService } from './work-order-photo.service';
import { WorkOrderService } from './work-order.service';

interface TenantRequest { companyId: string; user: { id: string }; }

@Controller('work-orders')
@UseGuards(JwtAuthGuard, TenantGuard)
export class WorkOrderController {
  constructor(
    private readonly workOrderService: WorkOrderService,
    private readonly photoService: WorkOrderPhotoService,
  ) {}

  @Get()
  findAll(@Req() req: TenantRequest, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.workOrderService.findAll(req.companyId, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.workOrderService.findOne(id, req.companyId);
  }

  @Post()
  @HttpCode(201)
  create(@Body(new ZodValidationPipe(WorkOrderCreateSchema)) body: unknown, @Req() req: TenantRequest) {
    return this.workOrderService.create(body as never, req.companyId, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(WorkOrderUpdateSchema)) body: unknown, @Req() req: TenantRequest) {
    return this.workOrderService.update(id, body as never, req.companyId);
  }

  @Post(':id/photos')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPhoto(
    @Param('id') id: string,
    @Req() req: TenantRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('stage') stage: string,
    @Body('caption') caption?: string,
  ) {
    if (!['BEFORE', 'DURING', 'AFTER'].includes(stage)) {
      return Promise.reject(new Error('stage inválido. Use: BEFORE, DURING ou AFTER'));
    }
    return this.photoService.uploadPhoto(id, req.companyId, req.user.id, file, stage as never, caption);
  }

  @Get(':id/photos')
  getPhotos(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.photoService.getPhotos(id, req.companyId);
  }
}
```

**work-order.module.ts:**
```typescript
import { Module } from '@nestjs/common';
import { WorkOrderController } from './work-order.controller';
import { WorkOrderPhotoService } from './work-order-photo.service';
import { WorkOrderService } from './work-order.service';

@Module({
  controllers: [WorkOrderController],
  providers: [WorkOrderService, WorkOrderPhotoService],
  exports: [WorkOrderService], // exportado para uso no QuoteService (aprovação → cria OS)
})
export class WorkOrderModule {}
```

**app.module.ts** — adicionar `WorkOrderModule` ao array imports.

Criar **work-order.isolation.spec.ts** seguindo padrão de customer.isolation.spec.ts:
- Criar Tenant A e Tenant B
- Criar WorkOrder para Tenant B
- Verificar: GET /work-orders com tokenA retorna array sem WOs do B
- Verificar: GET /work-orders/:idDeB com tokenA retorna 404
- Verificar: PATCH /work-orders/:idDeB com tokenA retorna 404
- Verificar: POST /work-orders/:idDeB/photos com tokenA retorna 404

Instalar @types/multer se necessário:
```bash
pnpm --filter @orcivo/backend add -D @types/multer
```
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend test --testPathPattern=work-order.isolation 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Testes de isolation passam
    - Backend compila sem erros
    - WorkOrderModule registrado no AppModule e exports WorkOrderService
    - POST /work-orders/:id/photos usa FileInterceptor com limite de 10MB
    - stage validado como BEFORE|DURING|AFTER
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| cliente autenticado → POST /work-orders/:id/photos | Arquivo binário atravessa backend antes de chegar ao MinIO |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-15 | Tampering | upload de foto sem validação | mitigate | ALLOWED_MIME_PREFIXES check + tamanho máximo 10MB em WorkOrderPhotoService antes de chamar uploadBuffer |
| T-2A-16 | Information Disclosure | GET /work-orders/:id de outro tenant | mitigate | findFirst com WHERE id AND company_id; lança 404 cross-tenant; isolation spec em CI |
| T-2A-17 | Tampering | stage inválido no upload | mitigate | Controller valida stage contra enum BEFORE|DURING|AFTER antes de chamar service |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/backend test --testPathPattern=work-order.isolation
pnpm --filter @orcivo/backend build
grep -n "company_id" apps/backend/src/work-order/work-order.service.ts
grep -n "uploadBuffer\|orcivo-photos" apps/backend/src/work-order/work-order-photo.service.ts
```
</verification>

<success_criteria>
- Testes de isolation passam
- Backend compila sem erros
- POST /work-orders/:id/photos: valida mimetype (image/) e tamanho (≤10MB)
- WorkOrderService exportado do módulo (usado pelo QuoteService no P07 para criar OS ao aprovar orçamento)
- Photo path: {company_id}/work-orders/{wo_id}/{stage}/{uuid}.jpg no bucket orcivo-photos
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P06-SUMMARY.md`
</output>
