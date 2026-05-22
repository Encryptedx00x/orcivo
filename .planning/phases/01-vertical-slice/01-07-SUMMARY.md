---
plan: 07
phase: 01-vertical-slice
status: complete
completed_at: "2026-05-22"
---

# P07 — CI + Molde Arquitetural: Summary

## O que foi feito

### Task 1 — CI com Postgres + Redis e teste de isolamento

- `.github/workflows/backend.yml` atualizado: novo job `test` com services postgres:16-alpine e redis:7-alpine
- Env vars de CI: `DATABASE_URL_TEST`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_HOST`, `REDIS_PORT`
- Steps: checkout, pnpm, node, install, prisma generate, prisma db push --force-reset, pnpm test:ci
- `apps/backend/package.json`: script `test:ci` adicionado (`jest --runInBand`)
- `infra/docker-compose.test.yml`: Postgres na porta 5433 + Redis na 6380 para ambiente local
- `apps/backend/test/setup.ts`: `getTestApp()` implementado (bootstrap NestJS + ValidationPipe); `cleanupDatabase()` mantido
- `apps/backend/src/customer/customer.isolation.spec.ts`: teste de isolamento real implementado (2 tenants, lista vazia, 404 cross-tenant)

### Task 2 — Documentação do molde arquitetural

- `docs/ARCHITECTURE-MOLD.md` criado (265 linhas) cobrindo 5 áreas + checklist:
  - Estrutura de módulo NestJS
  - TenantGuard e tenant scope
  - DTOs Zod em shared-types
  - Consumo da API (mobile e web)
  - Teste de isolamento em CI
  - "Como adicionar nova feature de domínio" (checklist 9 passos)
- `docs/decisions/ADR-013-tenant-isolation-testing.md` criado
- `CLAUDE.md` atualizado: linha adicionada na tabela de referências rápidas

## Critérios atendidos

- ✓ `grep postgres redis .github/workflows/backend.yml` — 7 ocorrências
- ✓ `grep DATABASE_URL_TEST .github/workflows/backend.yml`
- ✓ `grep prisma db push .github/workflows/backend.yml`
- ✓ `grep test:ci apps/backend/package.json`
- ✓ docs/ARCHITECTURE-MOLD.md com 265 linhas (> 60)
- ✓ grep TenantGuard|company_id|shared-types|isolamento|CustomerModule — 30 ocorrências
- ✓ docs/decisions/ADR-013 existe
- ✓ grep ARCHITECTURE-MOLD CLAUDE.md

## Self-Check: PASSED

- ✓ TENANT-02: CI falha se teste de isolamento falhar (teste real implementado)
- ✓ ARCH-01: Molde arquitetural documentado cobrindo as 5 áreas de D-21
- ✓ Jobs de lint/build da Fase 0 preservados no backend.yml
- ✓ CustomerModule referenciado como exemplo canônico
