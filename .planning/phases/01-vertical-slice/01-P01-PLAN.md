---
phase: 01-vertical-slice
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - prisma/.env.example
  - packages/shared-types/src/index.ts
  - packages/shared-types/src/auth/signup-step1.dto.ts
  - packages/shared-types/src/auth/signup-step2.dto.ts
  - packages/shared-types/src/auth/login.dto.ts
  - packages/shared-types/src/customer/customer-create.dto.ts
  - packages/shared-types/src/customer/customer-list.dto.ts
  - packages/shared-types/src/__tests__/schemas.spec.ts
  - packages/shared-types/package.json
  - apps/backend/src/auth/auth.e2e.spec.ts
  - apps/backend/src/auth/guards/tenant.guard.spec.ts
  - apps/backend/src/customer/customer.isolation.spec.ts
  - apps/backend/src/customer/customer.e2e.spec.ts
  - apps/backend/test/setup.ts
autonomous: true
requirements: [TYPES-01, TENANT-01]
must_haves:
  truths:
    - "shared-types exporta schemas Zod para signup, login, customer — sem importar @prisma/client"
    - "Banco de dados tem tabelas users, companies, company_members, customers, refresh_tokens"
    - "customers.company_id é NOT NULL com índice"
    - "Existem stubs de teste (Wave 0) que falham/skip ate a implementacao chegar"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "Schema com 4 modelos de negocio + RefreshToken + enums"
      contains: "model Customer"
    - path: "packages/shared-types/src/index.ts"
      provides: "Barrel export de todos os DTOs Zod"
      exports: ["SignupStep1Schema", "LoginSchema", "CustomerCreateSchema"]
  key_links:
    - from: "packages/shared-types/src/index.ts"
      to: "auth e customer DTOs"
      via: "export *"
      pattern: "export \\* from"
---

<objective>
Estabelecer a fundação de dados e contratos da Fase 1: o schema Prisma completo (4 tabelas de negócio + RefreshToken), os DTOs Zod em shared-types (consumidos identicamente por backend, mobile e web) e os stubs de teste do Wave 0 que definem o contrato de verificação antes de qualquer implementação.

Purpose: Tudo nas outras plans depende deste schema e destes DTOs. É o contrato (blueprint) que os executores consomem sem explorar o codebase.
Output: prisma/schema.prisma aplicado ao banco, shared-types populado, stubs de teste criados.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-vertical-slice/01-RESEARCH.md
@.planning/phases/01-vertical-slice/01-PATTERNS.md
@.planning/phases/01-vertical-slice/01-VALIDATION.md
@CLAUDE.md

<interfaces>
<!-- Schema Prisma completo: ver RESEARCH.md seção "Prisma Schema — Fase 1" (linhas 485-626). Copiar integralmente. -->
<!-- DTOs Zod completos: ver RESEARCH.md seção "shared-types DTOs com Zod" (linhas 650-750). -->

Cabeçalho obrigatório existente em packages/shared-types/src/index.ts (PRESERVAR):
```typescript
// @orcivo/shared-types — DTOs, Zod schemas, enums
// REGRA CRITICA: NAO importar @prisma/client, @nestjs/*, react, react-native neste package
```

Enums duplicados (NUNCA importar de @prisma/client):
```typescript
export const PlanCodeEnum = z.enum(['LIVRE', 'SOLO', 'MAIS', 'EQUIPE']);
export const CustomerTypeEnum = z.enum(['PF', 'PJ']);
export const DocumentTypeEnum = z.enum(['CPF', 'CNPJ']);
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Criar schema Prisma e instalar dependências Prisma</name>
  <read_first>
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (seção "Prisma Schema — Fase 1", linhas 485-626)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 3, linhas 176-199)
    - infra/docker-compose.yml (confirmar DATABASE_URL do PostgreSQL local)
    - CLAUDE.md (regras: company_id em toda tabela, money Decimal, PlanCode nunca FREE/PRO/TOP)
  </read_first>
  <behavior>
    - Schema deve ter exatamente 5 models: User, Company, CompanyMember, Customer, RefreshToken
    - Customer.company_id é String NOT NULL (sem `?`)
    - Customer tem @@index([company_id]) e @@index([company_id, name])
    - enum PlanCode tem valores LIVRE, SOLO, MAIS, EQUIPE (nunca FREE/PRO/TOP)
    - RefreshToken.token_hash é @unique
  </behavior>
  <action>
    1. Instalar Prisma na raiz do monorepo: `pnpm add -D prisma` e `pnpm add @prisma/client` (versões prisma 7.8.0).
    2. Criar `prisma/schema.prisma` copiando INTEGRALMENTE o bloco da RESEARCH.md seção "Prisma Schema — Fase 1" (linhas 485-626). NÃO simplificar nem omitir campos.
       - generator client (provider "prisma-client-js"), datasource db (provider "postgresql", url env("DATABASE_URL")).
       - Models: User (email @unique, password_hash, accepted_terms_at DateTime, relações company_members/refresh_tokens/assigned_customers).
       - Company (trade_name, document_type DocumentType?, plan_code PlanCode @default(LIVRE), relações members/customers, @@map("companies")).
       - CompanyMember (company_id, user_id, role MemberRole @default(TECNICO), active, @@unique([company_id, user_id]), índices, @@map("company_members")).
       - Customer (company_id String NOT NULL, name, type CustomerType?, tax_id, phone, email, city, state, notes, assigned_to_user_id?, @@index([company_id]), @@index([company_id, name]), @@map("customers")).
       - RefreshToken (token_hash @unique, expires_at, revoked @default(false), @@map("refresh_tokens")).
       - Enums: DocumentType (CPF, CNPJ), PlanCode (LIVRE, SOLO, MAIS, EQUIPE), MemberRole (OWNER, ADMIN, TECNICO), CustomerType (PF, PJ).
    3. Criar `prisma/.env.example` com: `DATABASE_URL="postgresql://orcivo:orcivo@localhost:5432/orcivo?schema=public"` e `DATABASE_URL_TEST="postgresql://orcivo:orcivo@localhost:5432/orcivo_test?schema=public"` (ajustar credenciais conforme infra/docker-compose.yml).
    4. NÃO usar `Float`/`number` para nenhum campo. Esta fase não tem campos monetários (Decimal vem na Fase 2).
  </action>
  <verify>
    <automated>npx prisma validate --schema prisma/schema.prisma</automated>
  </verify>
  <acceptance_criteria>
    - `npx prisma validate` retorna "The schema at prisma/schema.prisma is valid"
    - grep `model Customer` em prisma/schema.prisma encontra match
    - grep `company_id String\b` (sem `?`) em prisma/schema.prisma dentro do model Customer
    - grep `LIVRE` em prisma/schema.prisma encontra match; grep `FREE` NÃO encontra match
    - grep `@@index(\[company_id\])` encontra match
    - grep `token_hash String\s+@unique` encontra match
  </acceptance_criteria>
  <done>Schema valida sem erro; 5 models e 4 enums presentes; company_id NOT NULL em customers.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Popular shared-types com DTOs Zod e testes de schema</name>
  <read_first>
    - packages/shared-types/src/index.ts (cabeçalho atual — preservar a regra crítica)
    - packages/shared-types/package.json (scripts placeholder — substituir test/typecheck por reais)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (seção "shared-types DTOs com Zod", linhas 650-750)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 9, linhas 413-447)
  </read_first>
  <behavior>
    - SignupStep1Schema rejeita password com menos de 8 chars; aceita accepted_terms apenas se literal true
    - SignupStep2Schema valida brand_color contra regex /^#[0-9A-Fa-f]{6}$/ e state com length 2
    - CustomerCreateSchema rejeita name vazio; aceita type PF/PJ opcional
    - LoginSchema rejeita email inválido
    - Nenhum arquivo importa @prisma/client, @nestjs/*, react ou react-native
  </behavior>
  <action>
    1. Instalar zod no package: `cd packages/shared-types && pnpm add zod` (versão 4.4.3).
    2. Criar os DTOs copiando da RESEARCH.md linhas 650-750:
       - `src/auth/signup-step1.dto.ts` (SignupStep1Schema + SignupStep1Dto) — password z.string().min(8).max(72), accepted_terms z.literal(true).
       - `src/auth/signup-step2.dto.ts` (SignupStep2Schema + SignupStep2Dto) — document_type z.enum(['CPF','CNPJ']).optional(), state z.string().length(2).toUpperCase().optional(), brand_color regex hex.
       - `src/auth/login.dto.ts` (LoginSchema, LoginResponseSchema + tipos) — LoginResponse com access_token, user{id,name,email}, company{id,trade_name}.
       - `src/customer/customer-create.dto.ts` (CustomerCreateSchema + CustomerCreateDto).
       - `src/customer/customer-list.dto.ts` (CustomerListQuerySchema, CustomerSchema, CustomerDto).
    3. Atualizar `src/index.ts`: PRESERVAR o cabeçalho com a regra crítica (linhas 1-3), depois adicionar os enums duplicados (PlanCodeEnum, CustomerTypeEnum, DocumentTypeEnum) e `export * from './auth/signup-step1.dto'` etc. para todos os 5 DTOs.
    4. Criar `src/__tests__/schemas.spec.ts` com testes Jest reais (não stubs) cobrindo o behavior acima: parse válido passa, parse inválido lança (use `.safeParse(...).success`).
    5. Atualizar `packages/shared-types/package.json`: trocar script `"test"` placeholder por `"jest"`, adicionar devDependencies jest, ts-jest, @types/jest e um bloco jest config minimal (`{ "preset": "ts-jest", "testEnvironment": "node" }`). Trocar `"typecheck"` por `"tsc --noEmit"`.
  </action>
  <verify>
    <automated>pnpm --filter @orcivo/shared-types test</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm --filter @orcivo/shared-types test` passa com testes reais (não placeholder echo)
    - grep `@prisma/client` em packages/shared-types/src/ NÃO encontra match
    - grep `from 'react'` ou `@nestjs` em packages/shared-types/src/ NÃO encontra match
    - grep `export \* from './auth/login.dto'` em src/index.ts encontra match
    - grep `REGRA CRITICA` em src/index.ts ainda presente (cabeçalho preservado)
    - grep `z.literal(true)` em signup-step1.dto.ts encontra match
  </acceptance_criteria>
  <done>shared-types exporta 5 DTOs + 3 enums; testes de schema passam; regra de imports respeitada.</done>
</task>

<task type="auto">
  <name>Task 3: Criar stubs de teste Wave 0 e config de banco de teste</name>
  <read_first>
    - apps/backend/package.json (seção jest existente — linhas ~38-45)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (seção "Multi-tenant Isolation Testing" linhas 757-820, "Wave 0 Gaps" linhas 962-968)
    - .planning/phases/01-vertical-slice/01-VALIDATION.md (Wave 0 Requirements)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 14, linhas 700-731)
  </read_first>
  <behavior>
    - Cada stub usa describe + it com `it.todo(...)` OU um teste que falha explicitamente com mensagem "Wave 0 stub — implementar em P02/P03/P04"
    - test/setup.ts exporta helper para criar/limpar banco de teste usando DATABASE_URL_TEST
  </behavior>
  <action>
    1. Instalar supertest no backend: `cd apps/backend && pnpm add -D supertest @types/supertest`.
    2. Criar `apps/backend/test/setup.ts`: helper `getTestApp()` (placeholder retornando comentário TODO) + helper de teardown que deleta em ordem (customer → company_member → company → refresh_token → user) via PrismaService. Usa `process.env.DATABASE_URL_TEST`. Marcar com comentários `// IMPLEMENTAR EM: P04` onde o setup HTTP real é necessário.
    3. Criar stubs com `it.todo()` (não falham o CI, marcam pendência):
       - `apps/backend/src/auth/auth.e2e.spec.ts` — it.todo para AUTH-01 (signup cria User+Company+CompanyMember), AUTH-02 (login retorna access+refresh), AUTH-04 (logout revoga refresh token).
       - `apps/backend/src/auth/guards/tenant.guard.spec.ts` — it.todo para AUTH-03 (TenantGuard injeta companyId correto).
       - `apps/backend/src/customer/customer.isolation.spec.ts` — it.todo para TENANT-02 (empresa A não lista/lê customer da empresa B; cross-tenant retorna 404).
       - `apps/backend/src/customer/customer.e2e.spec.ts` — it.todo para CUSTOMER-01 (POST cria com company_id; GET filtra por tenant).
    4. Em cada stub, incluir comentário no topo: `// Wave 0 stub — implementação real em P0X. Ver VALIDATION.md Per-Task Verification Map.`
  </action>
  <verify>
    <automated>cd apps/backend && pnpm test 2>&1 | grep -E "todo|passed|Tests:"</automated>
  </verify>
  <acceptance_criteria>
    - `cd apps/backend && pnpm test` executa sem erro de compilação (stubs com it.todo não falham)
    - Arquivo apps/backend/src/customer/customer.isolation.spec.ts existe e contém string "TENANT-02"
    - Arquivo apps/backend/test/setup.ts existe e contém "DATABASE_URL_TEST"
    - grep `it.todo` em apps/backend/src/auth/auth.e2e.spec.ts encontra match
  </acceptance_criteria>
  <done>5 stubs Wave 0 criados; test/setup.ts com teardown ordenado; suite roda sem erro de compilação.</done>
</task>

<task type="auto" gate="blocking">
  <name>Task 4: [BLOCKING] Aplicar schema ao banco (prisma db push)</name>
  <read_first>
    - prisma/schema.prisma (criado na Task 1)
    - prisma/.env.example (DATABASE_URL)
    - infra/docker-compose.yml (confirmar que PostgreSQL está acessível em localhost)
  </read_first>
  <action>
    1. Garantir que o PostgreSQL local do docker-compose está UP (`docker compose -f infra/docker-compose.yml ps` — se não estiver, `docker compose -f infra/docker-compose.yml up -d postgres`).
    2. Garantir que existe um `.env` na raiz (ou prisma/.env) com DATABASE_URL apontando para o Postgres local. Copiar de prisma/.env.example se necessário. NÃO commitar o .env real (apenas o .example).
    3. Gerar o client: `npx prisma generate`.
    4. Aplicar o schema ao banco: `npx prisma db push`. Esta tabela é NOVA (não existe ainda), portanto não há perda de dados — não usar --accept-data-loss salvo se o push reportar destrutivo.
    5. Criar o banco de teste: `createdb orcivo_test` OU rodar `DATABASE_URL=$DATABASE_URL_TEST npx prisma db push` para popular o schema no banco de teste.
  </action>
  <verify>
    <automated>npx prisma db push --skip-generate 2>&1 | grep -iE "already in sync|in sync with your Prisma schema|Your database is now in sync"</automated>
  </verify>
  <acceptance_criteria>
    - `npx prisma db push` reporta "Your database is now in sync" ou "already in sync"
    - `npx prisma generate` completa sem erro
    - O banco contém as tabelas users, companies, company_members, customers, refresh_tokens (verificável via `npx prisma db pull` ou psql `\dt`)
  </acceptance_criteria>
  <done>Schema aplicado ao banco de dev E de teste; client gerado. Verificação da fase impossível sem este passo.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| cliente → API | Bodies de signup/customer são input não confiável; validar com Zod antes de persistir |
| API → PostgreSQL | company_id deve estar presente em toda query de Customer |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-1-04 | Tampering (Mass assignment) | DTOs de signup/customer | mitigate | Zod strict schemas em shared-types; backend valida com os mesmos schemas (P02/P04) |
| T-1-03 | Information Disclosure (Tenant leak) | Customer.company_id | mitigate | company_id NOT NULL no schema + @@index; filtro obrigatório no service (P04) |
</threat_model>

<verification>
- `npx prisma validate` verde
- `pnpm --filter @orcivo/shared-types test` verde
- `npx prisma db push` reporta sync
- Stubs Wave 0 compilam e rodam (it.todo)
</verification>

<success_criteria>
- Schema com 5 models aplicado ao banco de dev e teste
- shared-types exporta todos os DTOs Zod sem violar a regra de imports
- Stubs Wave 0 criados para AUTH-01..04, TENANT-02, CUSTOMER-01
</success_criteria>

<output>
Após completar, criar `.planning/phases/01-vertical-slice/01-01-SUMMARY.md`
</output>
