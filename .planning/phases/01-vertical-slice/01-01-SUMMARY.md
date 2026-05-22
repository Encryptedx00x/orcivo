---
plan: 01
phase: 01-vertical-slice
status: complete-pending-db-push
completed_at: "2026-05-22"
---

# P01 — Schema + DTOs + Stubs: Summary

## O que foi feito

### Task 1 — Schema Prisma
- `prisma/schema.prisma` criado com 5 models: User, Company, CompanyMember, Customer, RefreshToken
- 4 enums: DocumentType, PlanCode (LIVRE/SOLO/MAIS/EQUIPE), MemberRole, CustomerType
- `customers.company_id` é `String` NOT NULL com `@@index([company_id])` e `@@index([company_id, name])`
- `prisma validate` retorna válido ✓
- `prisma generate` gerou client com sucesso ✓
- `prisma/.env.example` criado

### Task 2 — shared-types DTOs
- Instalado: `zod@3.23.8`, `jest`, `ts-jest`, `@types/jest`
- 5 DTOs criados: `signup-step1.dto`, `signup-step2.dto`, `login.dto`, `customer-create.dto`, `customer-list.dto`
- `src/index.ts` atualizado com barrel exports + 3 enums (PlanCodeEnum, CustomerTypeEnum, DocumentTypeEnum)
- Cabeçalho com REGRA CRITICA preservado
- 15 testes de schema passando ✓
- Nenhum import de `@prisma/client`, `@nestjs/*`, `react`, `react-native` ✓

### Task 3 — Stubs Wave 0
- `apps/backend/test/setup.ts` com helpers `getTestApp` (stub) e `cleanupDatabase` (teardown ordenado)
- 4 arquivos de stub criados: `auth.e2e.spec.ts`, `tenant.guard.spec.ts`, `customer.isolation.spec.ts`, `customer.e2e.spec.ts`
- 10 `it.todo` cobrindo AUTH-01..04, TENANT-02, CUSTOMER-01
- `pnpm test` no backend: 10 todo, 0 failed ✓

### Task 4 — db push
- **BLOQUEADO**: Docker Desktop não está rodando localmente
- `prisma generate` executado com sucesso ✓
- `prisma db push` pendente — executar quando Docker estiver ativo
- Não bloqueia P02 (implementação de código), mas P02 não pode rodar e2e sem banco

## Decisões tomadas

- Prisma versão `5.22.0` (disponível como última estável neste momento vs 7.x que está em desenvolvimento)
- Zod `3.23.8` (3.25.0 instalou sem dist compilado — downgrade para versão estável)
- `setup.ts` usa cleanup sequencial: customer → companyMember → company → refreshToken → user

## Pendente

- `prisma db push` (Task 4) — requer Docker ativo
- Banco de teste `orcivo_test` — criar após Docker ativo
