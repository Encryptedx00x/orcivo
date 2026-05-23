---
phase: "2A"
plan: "02-P02"
title: "Backend infra — StorageService (MinIO) + MailService (Resend/Console) + PlanLimitsService"
status: completed
completed_date: "2026-05-22"
duration_minutes: 10
tasks_completed: 2
tasks_total: 2
files_created:
  - apps/backend/src/storage/storage.service.ts
  - apps/backend/src/storage/storage.module.ts
  - apps/backend/src/mail/mail.service.ts
  - apps/backend/src/mail/mail.module.ts
  - apps/backend/src/mail/console-mail.service.ts
  - apps/backend/src/mail/resend-mail.service.ts
  - apps/backend/src/plan-limits/plan-limits.service.ts
  - apps/backend/src/plan-limits/plan-limits.module.ts
  - apps/backend/src/plan-limits/check-plan-limit.decorator.ts
  - apps/backend/src/plan-limits/check-plan-limit.guard.ts
files_modified:
  - apps/backend/src/app.module.ts
  - apps/backend/.env.example
key_decisions:
  - "MailModule usa factory provider para selecionar ConsoleMailService ou ResendMailService via MAIL_PROVIDER env"
  - "StorageService.onModuleInit cria buckets com política GetObject público — PutObject/ListBucket requerem credenciais"
  - "PlanLimitsService retorna allowed:false apenas para PDF_WATERMARK + plan_code LIVRE — Fase 3 plugará enforcement completo"
tech_stack_added:
  - "minio@8.0.7 em @orcivo/backend"
  - "resend@6.12.3 em @orcivo/backend"
requires: ["02-P01"]
provides: ["StorageService", "MailService", "PlanLimitsService", "CheckPlanLimit", "CheckPlanLimitGuard"]
affects: ["02-P03", "02-P06", "02-P07"]
---

# Phase 2A Plan 02: Backend infra — StorageService + MailService + PlanLimitsService — Summary

**One-liner:** Três módulos @Global() de infraestrutura — MinIO upload/bucket-init, mail com fallback console/Resend, e PlanLimitsService scaffold com guard e decorator.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | StorageService (MinIO) + MailService (Resend/Console) | 06f35dd | 6 arquivos criados + pnpm-lock.yaml |
| 2 | PlanLimitsService scaffold + registrar módulos no AppModule | af1907e | 4 arquivos criados + app.module.ts + .env.example |

## Verification Results

- `npx nest build` — exit 0, sem erros TypeScript
- StorageModule, MailModule, PlanLimitsModule presentes no app.module.ts imports
- .env.example com MINIO_ENDPOINT, MINIO_PORT, MINIO_USE_SSL, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_PUBLIC_URL, MAIL_PROVIDER, RESEND_API_KEY, RESEND_FROM, APP_WEB_URL

## Module Architecture

| Módulo | Tipo | Exports |
|--------|------|---------|
| StorageModule | @Global() | StorageService |
| MailModule | @Global() | MailService (abstract class) |
| PlanLimitsModule | @Global() | PlanLimitsService, CheckPlanLimitGuard |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ConfigService não pode ser `private readonly` em ResendMailService**
- **Found during:** Task 1 — build após criar resend-mail.service.ts
- **Issue:** TypeScript error TS6138: `Property 'config' is declared but its value is never read` — ConfigService é usado apenas no constructor para inicializar campos, não como propriedade de instância
- **Fix:** Removido `private readonly` do parâmetro `config` no constructor (mantido como parâmetro local)
- **Files modified:** apps/backend/src/mail/resend-mail.service.ts
- **Commit:** incluído no mesmo commit 06f35dd

**2. [Observação] Linter adicionou MailModule ao app.module.ts antes do commit**
- O linter/formatter do projeto aplicou o import de MailModule automaticamente entre a criação do arquivo e a leitura do app.module.ts para edição. StorageModule e PlanLimitsModule foram adicionados manualmente.

## Known Stubs

- `PlanLimitsService.check` — retorna `{ allowed: true }` para todas as features exceto PDF_WATERMARK. Enforcement completo (MAX_CUSTOMERS, MAX_QUOTES_PER_MONTH, etc.) diferido para Fase 3 (billing Asaas).

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| threat_flag: bucket_policy | storage/storage.service.ts | Política pública s3:GetObject aplicada em onModuleInit — mitiga T-2A-02 conforme threat_model |

Ameaças T-2A-03 (validação de content-type) e T-2A-04 (MAIL_PROVIDER=console em prod) documentadas em .env.example e a serem mitigadas nos módulos consumidores (P06).

## Self-Check: PASSED

- apps/backend/src/storage/storage.service.ts — presente
- apps/backend/src/storage/storage.module.ts — presente
- apps/backend/src/mail/mail.service.ts — presente
- apps/backend/src/mail/mail.module.ts — presente
- apps/backend/src/mail/console-mail.service.ts — presente
- apps/backend/src/mail/resend-mail.service.ts — presente
- apps/backend/src/plan-limits/plan-limits.service.ts — presente
- apps/backend/src/plan-limits/plan-limits.module.ts — presente
- apps/backend/src/plan-limits/check-plan-limit.decorator.ts — presente
- apps/backend/src/plan-limits/check-plan-limit.guard.ts — presente
- Commits 06f35dd e af1907e — verificados
