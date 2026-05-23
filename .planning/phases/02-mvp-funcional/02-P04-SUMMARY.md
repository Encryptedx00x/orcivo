---
phase: "2A"
plan: "02-P04"
subsystem: "backend"
tags: ["catalog", "crud", "multi-tenant", "nestjs"]
dependency_graph:
  requires: ["02-P01", "02-P02"]
  provides: ["CatalogModule", "GET /catalog", "POST /catalog", "PATCH /catalog/:id", "DELETE /catalog/:id"]
  affects: ["02-P05 (QuoteModule depende de catalog_item_id)"]
tech_stack:
  added: []
  patterns: ["TenantGuard pattern", "soft-delete via is_active=false", "404 cross-tenant"]
key_files:
  created:
    - apps/backend/src/catalog/catalog.service.ts
    - apps/backend/src/catalog/catalog.controller.ts
    - apps/backend/src/catalog/catalog.module.ts
    - apps/backend/src/catalog/catalog.isolation.spec.ts
  modified:
    - apps/backend/src/app.module.ts
    - apps/backend/src/customer/customer.isolation.spec.ts
decisions:
  - "DELETE é soft-delete (is_active=false) — nunca hard delete"
  - "404 para cross-tenant access, não 403"
  - "company_id obrigatório em todas as queries do CatalogService"
metrics:
  duration: "~10 min"
  completed_date: "2026-05-22"
  tasks_completed: 2
  files_changed: 5
---

# Phase 2A Plan 04: Backend — CatalogModule (CRUD de itens do catálogo) Summary

CatalogModule com 5 endpoints REST, tenant scope obrigatório, soft-delete e 4 testes de isolation multi-tenant cobrindo GET/PATCH/DELETE cross-tenant.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CatalogService + Controller + Module | 2976222 | catalog.service.ts, catalog.controller.ts, catalog.module.ts, app.module.ts |
| 2 | Teste de isolation multi-tenant | e767904 | catalog.isolation.spec.ts, customer.isolation.spec.ts |

## Deliverables

- `GET /catalog` — lista itens da empresa autenticada (apenas ativos por padrão; `?all=true` inclui inativos)
- `GET /catalog/:id` — detalhe; 404 se cross-tenant
- `POST /catalog` — cria item; unit_price validado como string decimal via Zod
- `PATCH /catalog/:id` — atualiza; 404 se cross-tenant
- `DELETE /catalog/:id` — soft-delete via `is_active=false`; 404 se cross-tenant
- `CatalogModule` registrado no `AppModule`
- `@UseGuards(JwtAuthGuard, TenantGuard)` no class level do controller
- Teste de isolation `TENANT-02` com 4 assertions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fix import de supertest nos specs de isolation**
- **Found during:** Task 2 — execução dos testes
- **Issue:** `import * as request from 'supertest'` falha com TypeScript quando `esModuleInterop: true` — o tipo não é callable
- **Fix:** Alterado para `import request from 'supertest'` (default import)
- **Files modified:** `apps/backend/src/catalog/catalog.isolation.spec.ts`, `apps/backend/src/customer/customer.isolation.spec.ts`
- **Commit:** e767904

**2. [Rule 3 - Blocking] Prisma Client desatualizado**
- **Found during:** Task 1 — build falhou com `Property 'catalogItem' does not exist on type 'PrismaService'`
- **Issue:** Prisma Client não estava gerado com o modelo `CatalogItem` (schema.prisma tinha o modelo mas o client não tinha sido regenerado)
- **Fix:** Executado `pnpm exec prisma generate` na raiz do monorepo
- **Files modified:** node_modules (gerado automaticamente)

## Known Stubs

Nenhum stub — todos os endpoints retornam dados reais do banco.

## Threat Surface

Ameaças T-2A-09 (Information Disclosure cross-tenant) e T-2A-10 (Tampering unit_price) mitigadas:
- T-2A-09: `findMany` e `findFirst` sempre filtram `WHERE company_id = req.companyId`; teste de isolation verifica em CI
- T-2A-10: `CatalogItemUpdateSchema` valida `unit_price` com regex `/^\d+(\.\d{1,2})?$/` antes de chegar ao service

## Self-Check: PASSED

- apps/backend/src/catalog/catalog.service.ts: FOUND
- apps/backend/src/catalog/catalog.controller.ts: FOUND
- apps/backend/src/catalog/catalog.module.ts: FOUND
- apps/backend/src/catalog/catalog.isolation.spec.ts: FOUND
- Commit 2976222: FOUND
- Commit e767904: FOUND
