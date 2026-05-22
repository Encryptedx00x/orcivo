---
phase: 01-vertical-slice
plan: 07
type: execute
wave: 6
depends_on: [04, 05, 06]
files_modified:
  - .github/workflows/backend.yml
  - infra/docker-compose.test.yml
  - apps/backend/package.json
  - docs/ARCHITECTURE-MOLD.md
  - docs/decisions/ADR-013-tenant-isolation-testing.md
autonomous: true
requirements: [TENANT-02, ARCH-01]
must_haves:
  truths:
    - "CI roda a suite do backend incluindo o teste de isolamento multi-tenant contra um Postgres real"
    - "CI falha (vermelho) se o teste de isolamento TENANT-02 falhar"
    - "Existe documentação do molde arquitetural que as fases futuras vão replicar (D1.4)"
  artifacts:
    - path: "docs/ARCHITECTURE-MOLD.md"
      provides: "Molde: estrutura de módulo NestJS, TenantGuard, DTOs Zod, consumo mobile/web, teste de isolamento"
      min_lines: 60
    - path: ".github/workflows/backend.yml"
      provides: "Job de teste com serviço Postgres + Redis"
      contains: "postgres"
  key_links:
    - from: ".github/workflows/backend.yml"
      to: "customer.isolation.spec"
      via: "pnpm test contra DATABASE_URL_TEST"
      pattern: "test"
---

<objective>
Fechar a Fase 1: rodar o teste de isolamento multi-tenant em CI (com Postgres + Redis reais como serviços do GitHub Actions) e escrever a documentação do molde arquitetural (D1.4) — o blueprint que toda fase futura vai replicar.

Purpose: O teste de isolamento em CI é o gate de qualidade do multi-tenant. A documentação do molde é deliverable explícito e obrigatório (D-21, D-22).
Output: backend.yml atualizado com serviços de teste; docs/ARCHITECTURE-MOLD.md; ADR-013.
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
@.planning/phases/01-vertical-slice/01-04-SUMMARY.md
@.planning/phases/01-vertical-slice/01-05-SUMMARY.md
@.planning/phases/01-vertical-slice/01-06-SUMMARY.md

<interfaces>
<!-- Workflow existente (Fase 0): .github/workflows/backend.yml — preservar lint/build, adicionar job de test com serviços -->
<!-- Teste de isolamento: apps/backend/src/customer/customer.isolation.spec.ts (de P04) -->
<!-- ADRs existentes 001-012 em docs/decisions/ — seguir o mesmo formato -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: CI com Postgres + Redis e teste de isolamento</name>
  <read_first>
    - .github/workflows/backend.yml (workflow atual da Fase 0 — preservar steps existentes)
    - apps/backend/package.json (scripts test; adicionar test:ci se necessário)
    - apps/backend/test/setup.ts (DATABASE_URL_TEST de P01)
    - infra/docker-compose.yml (versões postgres 16-alpine, redis 7-alpine)
  </read_first>
  <behavior>
    - O job de teste sobe Postgres 16 e Redis 7 como `services` do GitHub Actions
    - Aplica o schema (`prisma db push`) no banco de teste antes de rodar os testes
    - Roda a suite do backend (incluindo customer.isolation.spec) e falha o workflow se algum teste falhar
  </behavior>
  <action>
    1. Editar `.github/workflows/backend.yml`: adicionar (ou estender) um job `test` com:
       - `services:` postgres (`postgres:16-alpine`, env POSTGRES_USER/PASSWORD/DB, health check), redis (`redis:7-alpine`, health check).
       - env: `DATABASE_URL_TEST` e `DATABASE_URL` apontando para o postgres do service (localhost:5432), `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (valores de teste distintos), `REDIS_HOST=localhost`, `REDIS_PORT=6379`.
       - steps: checkout, setup-node + pnpm, `pnpm install`, `npx prisma generate`, `DATABASE_URL=$DATABASE_URL_TEST npx prisma db push`, `pnpm --filter @orcivo/backend test`.
       - PRESERVAR os jobs/steps de lint e build existentes da Fase 0.
    2. Adicionar script `"test:ci": "jest --runInBand"` em apps/backend/package.json (integration tests com banco real devem rodar serializados).
    3. Criar `infra/docker-compose.test.yml` (opcional para rodar a suite localmente): postgres + redis em portas dedicadas para `orcivo_test`, espelhando o ambiente de CI.
  </action>
  <verify>
    <automated>cd apps/backend && pnpm test:ci 2>&1 | grep -iE "Tests:|isolation|passed"</automated>
  </verify>
  <acceptance_criteria>
    - grep `postgres` E `redis` em .github/workflows/backend.yml (services)
    - grep `prisma db push` em .github/workflows/backend.yml
    - grep `DATABASE_URL_TEST` em .github/workflows/backend.yml
    - grep `test:ci` em apps/backend/package.json
    - `pnpm test:ci` localmente roda a suite (com Postgres local) e customer.isolation passa
    - jobs de lint/build da Fase 0 ainda presentes em backend.yml
  </acceptance_criteria>
  <done>CI roda teste de isolamento contra Postgres+Redis reais; workflow falha se TENANT-02 falhar; steps anteriores preservados.</done>
</task>

<task type="auto">
  <name>Task 2: Documentação do molde arquitetural (D1.4) e ADR-013</name>
  <read_first>
    - .planning/phases/01-vertical-slice/01-CONTEXT.md (D-21, D-22 — o que documentar)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (Architecture Patterns linhas 169-478)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Shared Patterns linhas 734-818)
    - apps/backend/src/customer/ (módulo de referência já implementado em P04)
    - docs/decisions/ (formato dos ADRs existentes)
  </read_first>
  <behavior>
    - ARCHITECTURE-MOLD.md descreve concretamente, com exemplos do código real implementado: estrutura de módulo NestJS, padrão TenantGuard, DTOs Zod em shared-types, como mobile e web consomem a API, como testar isolamento em CI
    - Documento referencia o CustomerModule como exemplo canônico a copiar
  </behavior>
  <action>
    1. Criar `docs/ARCHITECTURE-MOLD.md` cobrindo as 5 áreas de D-21 (usar o código real de P02/P03/P04/P05/P06 como referência, não pseudocódigo):
       - **Estrutura de módulo NestJS**: pasta `src/{dominio}/` com module/controller/service; @Global PrismaModule/RedisModule; exemplo CustomerModule.
       - **TenantGuard e tenant scope**: @UseGuards(JwtAuthGuard, TenantGuard); company_id obrigatório em todo WHERE; 404 (não 403) cross-tenant; JWT só identifica, autorização revalida via Redis 60s.
       - **DTOs Zod em shared-types**: schema + tipo inferido; sem @prisma/client; ZodValidationPipe no backend; mesmos schemas no mobile/web.
       - **Consumo da API**: mobile (Bearer + X-Client-Request-Id + SecureStore) e web (cookie httpOnly + fetch server-side).
       - **Teste de isolamento em CI**: padrão de 2 tenants, asserts de vazamento, serviços Postgres/Redis no Actions.
       - Seção "Como adicionar uma nova feature de domínio" com checklist passo a passo replicável.
    2. Criar `docs/decisions/ADR-013-tenant-isolation-testing.md`: registrar a estratégia de teste de isolamento multi-tenant em CI (2 tenants, 404 cross-tenant, Postgres/Redis como services do Actions) como decisão arquitetural.
    3. Atualizar a tabela "Referências rápidas" do CLAUDE.md adicionando uma linha apontando para `docs/ARCHITECTURE-MOLD.md` (edição cirúrgica, não reescrever o arquivo).
  </action>
  <verify>
    <automated>test -f docs/ARCHITECTURE-MOLD.md && test -f docs/decisions/ADR-013-tenant-isolation-testing.md && wc -l docs/ARCHITECTURE-MOLD.md</automated>
  </verify>
  <acceptance_criteria>
    - docs/ARCHITECTURE-MOLD.md existe e tem mais de 60 linhas
    - grep `TenantGuard` E `company_id` E `shared-types` E `isolamento` em docs/ARCHITECTURE-MOLD.md
    - grep `CustomerModule` em docs/ARCHITECTURE-MOLD.md (módulo de referência)
    - docs/decisions/ADR-013-tenant-isolation-testing.md existe
    - grep `ARCHITECTURE-MOLD` em CLAUDE.md (referência adicionada)
  </acceptance_criteria>
  <done>Molde arquitetural documentado cobrindo as 5 áreas de D-21; ADR-013 criado; CLAUDE.md referencia o molde.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CI → banco de teste | Banco efêmero do Actions; sem dados reais; isolamento validado por teste |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-1-03 | Information Disclosure (Tenant leak) | regressão de isolamento | mitigate | customer.isolation.spec em CI bloqueia merge se vazamento for introduzido |
| T-1-09 | Repudiation (Molde não seguido) | features futuras | accept | Documentação do molde + ADR-013 reduzem risco; enforcement é por revisão humana |
</threat_model>

<verification>
- `pnpm test:ci` roda isolamento contra Postgres real
- backend.yml com services postgres+redis e prisma db push
- docs/ARCHITECTURE-MOLD.md e ADR-013 existem
</verification>

<success_criteria>
- Teste de isolamento multi-tenant roda em CI e falha o workflow em regressão (TENANT-02)
- Documentação do molde arquitetural (D1.4) completa cobrindo as 5 áreas de D-21
</success_criteria>

<output>
Após completar, criar `.planning/phases/01-vertical-slice/01-07-SUMMARY.md`
</output>
