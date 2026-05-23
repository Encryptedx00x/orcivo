---
phase: "2A"
plan: "02-P03"
title: "Auth — Reset de senha"
status: completed
completed_at: "2026-05-22"
duration_minutes: 20
tasks_completed: 2
tasks_total: 2

subsystem: backend/auth
tags: [auth, password-reset, redis, mail, tdd]

dependency_graph:
  requires: ["02-P01", "02-P02"]
  provides: ["POST /auth/forgot-password", "POST /auth/reset-password"]
  affects: ["apps/backend/src/auth/"]

tech_stack:
  added: []
  patterns:
    - "Token UUID v4 no Redis com TTL 900s (15 min) — key pattern pwd:reset:{uuid}"
    - "TDD: RED (spec com 4 testes) → GREEN (implementação) → testes passam"

key_files:
  created:
    - apps/backend/src/auth/auth.service.spec.ts
  modified:
    - apps/backend/src/auth/auth.service.ts
    - apps/backend/src/auth/auth.controller.ts
    - apps/backend/src/auth/auth.module.ts
    - apps/backend/src/app.module.ts

decisions:
  - "Usar redis.setex(key, ttl, value) em vez de redis.set(key, value, 'EX', ttl) — RedisService expoe setex"
  - "forgotPassword silencia e-mail inexistente (retorna void) — mitigacao T-2A-06 ASVS V2"
  - "resetPassword chama redis.del imediatamente apos uso — token one-shot (T-2A-07)"
---

# Phase 2A Plan 03: Auth — Reset de senha — Summary

**One-liner:** Reset de senha com token UUID v4 no Redis (TTL 15min), email via MailService, invalidacao one-shot apos uso.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Testes unitarios forgotPassword/resetPassword | 404c6e2 | auth.service.spec.ts, auth.module.ts, app.module.ts |
| 1 (GREEN) | Implementacao forgotPassword e resetPassword | 1cbb819 | auth.service.ts, auth.service.spec.ts |
| 2 | Endpoints @Public() no AuthController | 5088d38 | auth.controller.ts |

## Verification

- 4 testes unitarios passam (jest)
- `pnpm --filter @orcivo/backend build` — sem erros TypeScript
- POST /auth/forgot-password e POST /auth/reset-password presentes com @Public() e @HttpCode(200)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] RedisService usa setex() nao set()**
- **Found during:** Task 1 (GREEN) — teste falhou com TS2339
- **Issue:** O plano referenciava `redis.set(key, value, 'EX', ttl)` mas RedisService expoe apenas `setex(key, ttl, value)`
- **Fix:** Adaptou chamada para `redis.setex('pwd:reset:${token}', 900, user.id)` e atualizou spec
- **Files modified:** auth.service.ts, auth.service.spec.ts

**2. [Rule 3 - Blocker] MailModule nao estava registrado no AppModule**
- **Found during:** Verificacao inicial — P02 estava pendente
- **Issue:** mail/ directory existia com arquivos mas MailModule nao estava no AppModule nem AuthModule
- **Fix:** Adicionou MailModule aos imports de AppModule e AuthModule
- **Files modified:** app.module.ts, auth.module.ts

## Known Stubs

Nenhum stub — implementacao completa com fluxo real de Redis e MailService.

## TDD Gate Compliance

- RED gate: commit 404c6e2 `test(2A-P03)` — 4 testes falhando conforme esperado
- GREEN gate: commit 1cbb819 `feat(2A-P03)` — 4 testes passando

## Self-Check

- [x] auth.service.spec.ts existe e tem 4 testes passando
- [x] auth.service.ts tem forgotPassword e resetPassword
- [x] auth.controller.ts tem POST forgot-password e reset-password com @Public()
- [x] Commits 404c6e2, 1cbb819, 5088d38 existem
