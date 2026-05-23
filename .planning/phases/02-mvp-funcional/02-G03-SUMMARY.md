---
phase: "2A"
plan: "02-G03"
title: "Gap closure — Prisma migrations: gerar e versionar no git"
type: gap-closure
completed_at: "2026-05-23"
duration_minutes: 8
tasks_completed: 1
tasks_total: 1
files_created:
  - prisma/migrations/20260523000000_phase_2a/migration.sql
key_decisions:
  - "prisma migrate dev não funciona em ambiente não-interativo; usado migrate diff + resolve como alternativa"
---

# Phase 2A Plan 02-G03: Prisma Migrations — Gap Closure Summary

**One-liner:** Migration inicial gerada via `prisma migrate diff` e versionada com `prisma migrate resolve --applied`, cobrindo as 12 tabelas e 11 enums do schema da Fase 2A.

## Tasks Executadas

| Task | Descrição | Commit | Status |
|------|-----------|--------|--------|
| 1 | Gerar migration e commitar | 4ce37ed | Concluído |

## O que foi feito

- Subiu container PostgreSQL via `docker compose -f infra/docker-compose.dev.yml up -d postgres`
- Gerou SQL completo com `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
- Criou `prisma/migrations/20260523000000_phase_2a/migration.sql` com todo o DDL do schema da Fase 2A
- Aplicou a migration ao banco local e registrou no histórico de migrations via `npx prisma migrate resolve --applied`
- Validou com `npx prisma validate` — resultado: schema válido
- Commitou o diretório `prisma/migrations/` no git

## Schema coberto pela migration

**Enums (11):** DocumentType, PlanCode, MemberRole, CustomerType, CatalogItemType, QuoteStatus, DiscountType, ApprovalMethod, WorkOrderStatus, PhotoStage

**Tabelas (12):**
- `users`, `companies`, `company_members` — auth e multi-tenant
- `customers` — CRM
- `refresh_tokens` — segurança JWT
- `catalog_items` — catálogo de produtos/serviços
- `quotes`, `quote_items`, `quote_approvals` — orçamentos
- `work_orders`, `work_order_photos` — ordens de servico
- `audit_logs` — rastreabilidade

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `prisma migrate dev` não funciona em ambiente não-interativo**
- **Found during:** Task 1
- **Issue:** O comando `prisma migrate dev` detecta ausência de TTY e rejeita a execução, mesmo com `--create-only`. Isso ocorre em agentes Claude Code que não possuem terminal interativo.
- **Fix:** Usado `prisma migrate diff --from-empty --to-schema-datamodel ... --script` para gerar o SQL, seguido de criação manual do arquivo de migration e `prisma migrate resolve --applied` para registrar no histórico de migrations.
- **Files modified:** `prisma/migrations/20260523000000_phase_2a/migration.sql` (criado)
- **Commit:** 4ce37ed

## Self-Check

- [x] `prisma/migrations/20260523000000_phase_2a/migration.sql` existe
- [x] Commit 4ce37ed existe no git
- [x] `npx prisma validate` retorna schema válido
- [x] Migration marcada como aplicada no banco local

## Self-Check: PASSED
