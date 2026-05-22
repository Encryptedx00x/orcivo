---
phase: 01-vertical-slice
plan: 04
type: execute
wave: 4
depends_on: [02, 03]
files_modified:
  - apps/backend/src/customer/customer.module.ts
  - apps/backend/src/customer/customer.controller.ts
  - apps/backend/src/customer/customer.service.ts
  - apps/backend/src/customer/customer.e2e.spec.ts
  - apps/backend/src/customer/customer.isolation.spec.ts
  - apps/backend/src/app.module.ts
autonomous: true
requirements: [CUSTOMER-01, TENANT-01, TENANT-02]
must_haves:
  truths:
    - "POST /customers cria um customer com company_id do tenant atual (nunca do body)"
    - "GET /customers retorna apenas customers do tenant atual"
    - "Empresa A não consegue listar nem ler por ID customers da empresa B (retorna 404)"
    - "Toda query de Customer tem company_id no WHERE"
  artifacts:
    - path: "apps/backend/src/customer/customer.service.ts"
      provides: "CRUD com tenant scope obrigatório"
      contains: "company_id"
    - path: "apps/backend/src/customer/customer.isolation.spec.ts"
      provides: "Teste de isolamento multi-tenant (TENANT-02)"
      contains: "404"
  key_links:
    - from: "apps/backend/src/customer/customer.service.ts"
      to: "prisma.customer"
      via: "where company_id obrigatório"
      pattern: "company_id"
    - from: "apps/backend/src/customer/customer.controller.ts"
      to: "TenantGuard"
      via: "@UseGuards(JwtAuthGuard, TenantGuard)"
      pattern: "TenantGuard"
---

<objective>
Implementar o vertical slice Customer no backend: CRUD (create + list + findOne) sempre filtrado por company_id, com o teste de isolamento multi-tenant em CI provando que empresa A não acessa dados de empresa B. Este é o slice canônico que toda feature de domínio futura vai replicar.

Purpose: Prova ponta a ponta o molde multi-tenant no backend (o consumo mobile/web vem em P05/P06). O teste de isolamento é o gate da fase.
Output: CustomerModule registrado; customer.isolation.spec e customer.e2e.spec verdes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-vertical-slice/01-RESEARCH.md
@.planning/phases/01-vertical-slice/01-PATTERNS.md
@CLAUDE.md
@.planning/phases/01-vertical-slice/01-02-SUMMARY.md
@.planning/phases/01-vertical-slice/01-03-SUMMARY.md

<interfaces>
```typescript
import { CustomerCreateSchema, CustomerCreateDto,
         CustomerListQuerySchema, CustomerListQueryDto, CustomerDto } from '@orcivo/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
```
<!-- Customer model (P01): company_id NOT NULL, name, type?, tax_id?, phone?, email?, city?, state?, notes?, assigned_to_user_id? -->
<!-- Padrão de service com tenant scope: PATTERNS.md Shared Patterns linhas 750-771 -->
<!-- Teste de isolamento: RESEARCH.md linhas 757-820 -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: CustomerService + CustomerController com tenant scope</name>
  <read_first>
    - apps/backend/src/auth/guards/tenant.guard.ts (contrato request.companyId)
    - apps/backend/src/common/zod-validation.pipe.ts (de P02)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 2 linhas 136-162, Shared Patterns "company_id em todo WHERE" linhas 750-771)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (Pitfall 1 linhas 826-834)
  </read_first>
  <behavior>
    - create(dto, companyId): cria customer com company_id = companyId; ignora qualquer company_id do dto
    - findAll(companyId, query): retorna apenas where company_id = companyId, paginado (page/limit), busca opcional por name
    - findOne(id, companyId): findFirst where { id, company_id }; se null → NotFoundException (404, não 403)
  </behavior>
  <action>
    1. Criar `src/customer/customer.service.ts`:
       - `create(dto: CustomerCreateDto, companyId: string)`: `prisma.customer.create({ data: { ...dto, company_id: companyId } })`. NÃO permitir company_id vindo do dto sobrescrever (o DTO de shared-types não tem company_id — confirmar).
       - `findAll(companyId: string, query: CustomerListQueryDto)`: `findMany({ where: { company_id: companyId, ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}) }, orderBy: { created_at: 'desc' }, skip: (page-1)*limit, take: limit })`. Retornar `{ data, page, limit }`.
       - `findOne(id: string, companyId: string)`: `findFirst({ where: { id, company_id: companyId } })`; null → `throw new NotFoundException()` (NUNCA ForbiddenException — não vazar existência).
    2. Criar `src/customer/customer.controller.ts` (@Controller('customers'), @UseGuards(JwtAuthGuard, TenantGuard)):
       - `GET ` → findAll(req.companyId, query validado por ZodValidationPipe(CustomerListQuerySchema)).
       - `POST ` @HttpCode(201) → create(dto validado por ZodValidationPipe(CustomerCreateSchema), req.companyId).
       - `GET :id` → findOne(id, req.companyId).
    3. Criar `src/customer/customer.module.ts`: providers CustomerService, controllers CustomerController.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm build` compila sem erro
    - grep `company_id: companyId` em src/customer/customer.service.ts (create injeta tenant)
    - grep `where: { company_id` em customer.service.ts (findAll e findOne filtram)
    - grep `NotFoundException` em customer.service.ts; grep `ForbiddenException` NÃO em findOne
    - grep `@UseGuards(JwtAuthGuard, TenantGuard)` em customer.controller.ts
  </acceptance_criteria>
  <done>CustomerService com tenant scope em todas as queries; controller protegido; build verde.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Testes de isolamento multi-tenant (TENANT-02) e e2e (CUSTOMER-01)</name>
  <read_first>
    - apps/backend/src/customer/customer.isolation.spec.ts (stub Wave 0 de P01)
    - apps/backend/src/customer/customer.e2e.spec.ts (stub Wave 0 de P01)
    - apps/backend/test/setup.ts (de P01)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (seção "Multi-tenant Isolation Testing" linhas 757-820)
  </read_first>
  <behavior>
    - customer.e2e: POST /customers como tenant A cria customer com company_id de A; GET /customers como A lista só os de A
    - customer.isolation: empresa A não vê customer criado por B (lista vazia); GET /customers/:idDeB como A retorna 404
  </behavior>
  <action>
    1. Implementar `src/customer/customer.e2e.spec.ts` (substituir it.todo): bootstrap app NestJS de teste (Test.createTestingModule importando AppModule + override de DATABASE_URL_TEST), criar 1 tenant via signup/login real (ou via PrismaService direto + token emitido), POST /customers, GET /customers — assert que o customer aparece com company_id correto. Teardown via test/setup.ts.
    2. Implementar `src/customer/customer.isolation.spec.ts` (substituir it.todo): copiar estrutura RESEARCH.md linhas 762-817. Criar 2 tenants distintos (A e B), criar customer em B, então:
       - GET /customers como A → `res.body.data` tem length 0.
       - GET /customers/:customerB.id como A → status 404.
    3. Garantir teardown deleta na ordem customer → company_member → company → refresh_token → user.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm test -- --testPathPattern="customer.(e2e|isolation)"</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm test -- --testPathPattern="customer.(e2e|isolation)"` passa (não it.todo)
    - grep `toHaveLength(0)` em customer.isolation.spec.ts (A não vê customers de B)
    - grep `.expect(404)` ou `expect(.*).toBe(404)` em customer.isolation.spec.ts (cross-tenant findOne)
    - grep `it.todo` NÃO aparece em customer.isolation.spec.ts nem customer.e2e.spec.ts
  </acceptance_criteria>
  <done>TENANT-02 e CUSTOMER-01 verdes; isolamento multi-tenant provado em CI.</done>
</task>

<task type="auto">
  <name>Task 3: Registrar CustomerModule no AppModule</name>
  <read_first>
    - apps/backend/src/app.module.ts (estado após P03)
  </read_first>
  <action>
    Adicionar `CustomerModule` aos imports de `src/app.module.ts`, preservando todos os módulos de P01/P02/P03 (ConfigModule, PrismaModule, RedisModule, ThrottlerModule, HealthModule, AuthModule, CompanyModule). Edição cirúrgica.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm build && pnpm test</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm build` compila sem erro
    - `pnpm test` (suite completa do backend) verde
    - grep `CustomerModule` em src/app.module.ts; grep `CompanyModule` E `AuthModule` ainda presentes
  </acceptance_criteria>
  <done>CustomerModule registrado; suite completa do backend verde; módulos anteriores preservados.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| cliente → /customers | Body é input não confiável; company_id nunca aceito do body |
| API → PostgreSQL | company_id obrigatório em todo WHERE de Customer |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-1-03 | Information Disclosure (Tenant leak) | CustomerService queries | mitigate | company_id obrigatório no WHERE; findOne retorna 404 cross-tenant; teste de isolamento em CI |
| T-1-04 | Tampering (Mass assignment) | POST /customers body | mitigate | ZodValidationPipe(CustomerCreateSchema); company_id injetado do TenantGuard, não do body |
</threat_model>

<verification>
- `pnpm build` verde
- `pnpm test -- --testPathPattern="customer.(e2e|isolation)"` verde
- `pnpm test` (suite completa) verde
- Teste de isolamento TENANT-02 obrigatoriamente verde (gate da fase)
</verification>

<success_criteria>
- CRUD Customer com tenant scope em toda query
- Empresa A não acessa dados de empresa B (testado em CI, 404 cross-tenant)
- CustomerModule registrado sem quebrar suite
</success_criteria>

<output>
Após completar, criar `.planning/phases/01-vertical-slice/01-04-SUMMARY.md`
</output>
