---
phase: "2A"
plan: "02-P04"
title: "Backend — CatalogModule (CRUD de itens do catálogo)"
wave: 3
depends_on: ["02-P01", "02-P02"]
files_modified:
  - apps/backend/src/catalog/catalog.module.ts
  - apps/backend/src/catalog/catalog.controller.ts
  - apps/backend/src/catalog/catalog.service.ts
  - apps/backend/src/catalog/catalog.isolation.spec.ts
  - apps/backend/src/app.module.ts
autonomous: true
requirements: ["D2.1"]

must_haves:
  truths:
    - "GET /catalog retorna apenas itens da empresa autenticada"
    - "POST /catalog cria item com unit_price como Decimal (nunca number)"
    - "PATCH /catalog/:id atualiza item — retorna 404 para id de outro tenant"
    - "DELETE /catalog/:id soft-delete via is_active=false"
    - "Teste de isolation: Tenant A não vê itens do Tenant B"
  artifacts:
    - path: "apps/backend/src/catalog/catalog.service.ts"
      provides: "findAll, findOne, create, update, deactivate com tenant scope"
      exports: ["CatalogService"]
    - path: "apps/backend/src/catalog/catalog.isolation.spec.ts"
      provides: "Teste de multi-tenant isolation seguindo padrão ARCHITECTURE-MOLD.md"
      contains: "Multi-tenant isolation"
  key_links:
    - from: "apps/backend/src/catalog/catalog.controller.ts"
      to: "JwtAuthGuard + TenantGuard"
      via: "@UseGuards(JwtAuthGuard, TenantGuard)"
      pattern: "TenantGuard"
    - from: "apps/backend/src/catalog/catalog.service.ts"
      to: "prisma.catalogItem"
      via: "findMany/findFirst com company_id"
      pattern: "company_id: companyId"
---

<objective>
Implementar o CatalogModule completo seguindo o molde do CustomerModule: controller com guards, service com tenant scope, e spec de isolation. CRUD de itens do catálogo (SERVICE|PRODUCT) por empresa.

Purpose: D2.1 — catálogo é requisito da Fase 2A. É também a dependência do QuoteModule (QuoteItem referencia catalog_item_id). Deve funcionar antes das telas mobile/web.
Output: CatalogModule com 5 endpoints; teste de isolation; registrado no AppModule.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- MOLDE CANÔNICO — replicar exatamente: -->
<!-- apps/backend/src/customer/customer.controller.ts -->
<!-- apps/backend/src/customer/customer.service.ts -->
<!-- apps/backend/src/customer/customer.module.ts -->
<!-- apps/backend/src/customer/customer.isolation.spec.ts -->

<!-- DTOs disponíveis após P01: -->
<!-- CatalogItemCreateSchema, CatalogItemCreateDto de @orcivo/shared-types -->
<!-- CatalogItemUpdateSchema, CatalogItemUpdateDto de @orcivo/shared-types -->

<!-- Prisma model: catalogItem (snake_case no banco, camelCase no Prisma) -->
<!-- company_id obrigatório em TODAS as queries -->
<!-- 404 para cross-tenant (nunca 403) -->

<!-- PrismaService, RedisService são @Global() — injetáveis sem importar módulo -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: CatalogService + Controller + Module</name>
  <files>
    apps/backend/src/catalog/catalog.service.ts,
    apps/backend/src/catalog/catalog.controller.ts,
    apps/backend/src/catalog/catalog.module.ts,
    apps/backend/src/app.module.ts
  </files>
  <read_first>
    - apps/backend/src/customer/customer.service.ts (molde — replicar padrão)
    - apps/backend/src/customer/customer.controller.ts (molde — replicar padrão)
    - apps/backend/src/customer/customer.module.ts (molde — replicar padrão)
    - apps/backend/src/app.module.ts (ler antes de modificar — adicionar CatalogModule)
  </read_first>
  <behavior>
    - Test 1: findAll(companyId) → retorna apenas CatalogItems com company_id === companyId
    - Test 2: findOne(id, wrongCompanyId) → lança NotFoundException
    - Test 3: create(dto, companyId) → salva unit_price como Decimal (nunca number)
    - Test 4: deactivate(id, companyId) → seta is_active=false; não deleta o registro
  </behavior>
  <action>
Criar seguindo EXATAMENTE o molde do CustomerModule:

**catalog.service.ts:**
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogItemCreateDto, CatalogItemUpdateDto } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, onlyActive = true) {
    return this.prisma.catalogItem.findMany({
      where: { company_id: companyId, ...(onlyActive ? { is_active: true } : {}) },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.catalogItem.findFirst({ where: { id, company_id: companyId } });
    if (!item) throw new NotFoundException();
    return item;
  }

  async create(dto: CatalogItemCreateDto, companyId: string) {
    return this.prisma.catalogItem.create({ data: { ...dto, company_id: companyId } });
  }

  async update(id: string, dto: CatalogItemUpdateDto, companyId: string) {
    await this.findOne(id, companyId); // lança 404 se cross-tenant
    return this.prisma.catalogItem.update({ where: { id }, data: dto });
  }

  async deactivate(id: string, companyId: string) {
    await this.findOne(id, companyId); // lança 404 se cross-tenant
    return this.prisma.catalogItem.update({ where: { id }, data: { is_active: false } });
  }
}
```

**catalog.controller.ts** (seguindo padrão CustomerController):
```typescript
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CatalogItemCreateSchema, CatalogItemUpdateSchema } from '@orcivo/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CatalogService } from './catalog.service';

interface TenantRequest { companyId: string; }

@Controller('catalog')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  findAll(@Req() req: TenantRequest, @Query('all') all?: string) {
    return this.catalogService.findAll(req.companyId, all !== 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.catalogService.findOne(id, req.companyId);
  }

  @Post()
  @HttpCode(201)
  create(@Body(new ZodValidationPipe(CatalogItemCreateSchema)) body: unknown, @Req() req: TenantRequest) {
    return this.catalogService.create(body as never, req.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(CatalogItemUpdateSchema)) body: unknown, @Req() req: TenantRequest) {
    return this.catalogService.update(id, body as never, req.companyId);
  }

  @Delete(':id')
  @HttpCode(200)
  deactivate(@Param('id') id: string, @Req() req: TenantRequest) {
    return this.catalogService.deactivate(id, req.companyId);
  }
}
```

**catalog.module.ts:**
```typescript
import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({ controllers: [CatalogController], providers: [CatalogService] })
export class CatalogModule {}
```

**app.module.ts:** adicionar `CatalogModule` ao array imports.
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend build 2>&1 | grep -E "^.*error TS" | head -10 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - Backend compila sem erros
    - CatalogModule registrado no AppModule
    - 5 endpoints presentes (GET /, GET /:id, POST /, PATCH /:id, DELETE /:id)
    - @UseGuards(JwtAuthGuard, TenantGuard) no class level
    - Nenhuma query sem company_id
  </done>
</task>

<task type="auto">
  <name>Task 2: Teste de isolation multi-tenant do CatalogModule</name>
  <files>apps/backend/src/catalog/catalog.isolation.spec.ts</files>
  <read_first>
    - apps/backend/src/customer/customer.isolation.spec.ts (molde EXATO a replicar — copiar estrutura)
    - docs/ARCHITECTURE-MOLD.md §"5. Teste de isolamento multi-tenant em CI"
  </read_first>
  <action>
Criar catalog.isolation.spec.ts seguindo EXATAMENTE o padrão de customer.isolation.spec.ts:

1. Criar dois tenants reais (Tenant A e Tenant B) via HTTP (signup step1 + step2 + login)
2. Criar um CatalogItem para o Tenant B via POST /catalog
3. Verificar:
   - GET /catalog com token do Tenant A retorna array vazio (não lista itens do B)
   - GET /catalog/:idDeB com token do Tenant A retorna 404
   - PATCH /catalog/:idDeB com token do Tenant A retorna 404
   - DELETE /catalog/:idDeB com token do Tenant A retorna 404

Usar `getTestApp()` e `cleanupDatabase()` do helper existente (verificar path exato em customer.isolation.spec.ts).
Usar `describe('CatalogItem — Multi-tenant isolation (TENANT-02)', ...)`.
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/backend test --testPathPattern=catalog.isolation 2>&1 | tail -30</automated>
  </verify>
  <done>
    - Todos os testes de isolation passam (verde)
    - Tenant A não vê dados do Tenant B em nenhuma rota
    - 404 retornado para cross-tenant access (não 403)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| cliente autenticado → GET /catalog | TenantGuard garante company_id; service não aceita company_id do body |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-09 | Information Disclosure | GET /catalog cross-tenant | mitigate | findMany sempre filtra WHERE company_id = req.companyId; teste de isolation em CI garante |
| T-2A-10 | Tampering | unit_price via PATCH | mitigate | CatalogItemUpdateSchema valida formato decimal via regex antes de chegar ao service |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/backend test --testPathPattern=catalog.isolation
pnpm --filter @orcivo/backend build
grep -n "company_id" apps/backend/src/catalog/catalog.service.ts
```
</verification>

<success_criteria>
- Testes de isolation passam
- Backend compila sem erros
- Toda query no CatalogService inclui company_id: companyId
- DELETE é soft-delete (is_active=false), não hard delete
- Resposta de 404 para cross-tenant (não 403)
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P04-SUMMARY.md`
</output>
