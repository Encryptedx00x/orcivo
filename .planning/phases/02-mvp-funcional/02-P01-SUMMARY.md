---
phase: "2A"
plan: "02-P01"
title: "Schema Prisma + DTOs shared-types"
status: completed
completed_date: "2026-05-22"
duration_minutes: 15
tasks_completed: 2
tasks_total: 2
files_created:
  - packages/shared-types/src/catalog/catalog-item-create.dto.ts
  - packages/shared-types/src/catalog/catalog-item-update.dto.ts
  - packages/shared-types/src/quote/quote-create.dto.ts
  - packages/shared-types/src/quote/quote-update.dto.ts
  - packages/shared-types/src/quote/quote-status.enum.ts
  - packages/shared-types/src/quote/quote-approval.dto.ts
  - packages/shared-types/src/work-order/work-order-create.dto.ts
  - packages/shared-types/src/work-order/work-order-update.dto.ts
  - packages/shared-types/src/plan/plan-feature.enum.ts
  - packages/shared-types/src/auth/forgot-password.dto.ts
  - packages/shared-types/src/auth/reset-password.dto.ts
  - packages/shared-types/src/helpers/money.ts
files_modified:
  - prisma/schema.prisma
  - packages/shared-types/src/index.ts
  - packages/shared-types/package.json
  - pnpm-lock.yaml
key_decisions:
  - "Decimal @db.Decimal(12,2) para todos os campos monetários — nunca Float"
  - "QuoteApproval sem company_id próprio — acesso via Quote → company_id"
  - "assertValidTransition exportado de shared-types para uso em backend e testes"
  - "formatMoney usa Decimal.js para evitar erros de ponto flutuante"
tech_stack_added:
  - "decimal.js@10.6.0 em @orcivo/shared-types"
---

# Phase 2A Plan 01: Schema Prisma + DTOs shared-types — Summary

**One-liner:** 7 modelos Prisma com campos Decimal e multi-tenancy + 13 DTOs Zod com state machine de Quote e helpers de money usando Decimal.js.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Estender schema Prisma com modelos da Fase 2A | f57b973 | prisma/schema.prisma |
| 2 | DTOs Zod em shared-types + helpers de money + state machine | ce3808d | 13 arquivos em shared-types |

## Verification Results

- `npx prisma validate` — passou sem erros
- `pnpm --filter @orcivo/shared-types build` — passou sem erros TypeScript
- Sem imports de `@prisma/client`, `@nestjs/*`, `react`, `react-native` em shared-types
- Todo campo monetário usa `Decimal @db.Decimal(12,2)` ou `Decimal @db.Decimal(10,3)`
- Toda tabela de negócio com `company_id` e `@@index([company_id])`

## Schema Additions

Modelos adicionados ao `prisma/schema.prisma`:

| Modelo | Table | Chave de negócio |
|--------|-------|-----------------|
| CatalogItem | catalog_items | company_id + @@index([company_id, is_active]) |
| Quote | quotes | @@unique([company_id, number]) + approval_token @unique |
| QuoteItem | quote_items | quote_id |
| QuoteApproval | quote_approvals | quote_id @unique |
| WorkOrder | work_orders | @@unique([company_id, number]) |
| WorkOrderPhoto | work_order_photos | work_order_id + company_id |
| AuditLog | audit_logs | company_id + @@index([company_id, entity_type, entity_id]) |

Enums adicionados: `CatalogItemType`, `QuoteStatus`, `DiscountType`, `ApprovalMethod`, `WorkOrderStatus`, `PhotoStage`

## Shared-types Exports

```
catalog/catalog-item-create.dto  → CatalogItemCreateSchema, CatalogItemCreateDto
catalog/catalog-item-update.dto  → CatalogItemUpdateSchema, CatalogItemUpdateDto
quote/quote-create.dto           → QuoteCreateSchema, QuoteItemSchema, QuoteCreateDto, QuoteItemDto
quote/quote-update.dto           → QuoteUpdateSchema, QuoteUpdateDto
quote/quote-status.enum          → QuoteStatus, DiscountType, VALID_TRANSITIONS, assertValidTransition, isTerminalStatus
quote/quote-approval.dto         → ApproveQuoteSchema, ApproveQuoteDto
work-order/work-order-create.dto → WorkOrderCreateSchema, WorkOrderCreateDto
work-order/work-order-update.dto → WorkOrderUpdateSchema, WorkOrderUpdateDto
plan/plan-feature.enum           → PlanFeature (enum)
auth/forgot-password.dto         → ForgotPasswordSchema, ForgotPasswordDto
auth/reset-password.dto          → ResetPasswordSchema, ResetPasswordDto
helpers/money                    → formatMoney, multiplyDecimal, sumDecimal
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan delivers schema and DTOs, sem stubs de dados ou UI.

## Threat Surface Scan

Ameaças mapeadas no threat_model do plano foram mitigadas:

| Threat | Mitigação aplicada |
|--------|--------------------|
| T-2A-01: Tampering em unit_price | Regex `/^\d+(\.\d{1,2})?$/` implementada em QuoteItemSchema.unit_price |
| T-2A-02: QuoteStatus público | VALID_TRANSITIONS com assertValidTransition rejeita transições inválidas |

Nenhuma nova superfície de ataque introduzida (sem endpoints, sem rotas, apenas DTOs e schema).

## Self-Check: PASSED

- prisma/schema.prisma — presente e validado
- packages/shared-types/src/quote/quote-status.enum.ts — presente com assertValidTransition exportado
- packages/shared-types/src/helpers/money.ts — presente com formatMoney, multiplyDecimal, sumDecimal
- packages/shared-types/dist/ — gerado pelo build sem erros
- Commits f57b973 e ce3808d — verificados em git log
