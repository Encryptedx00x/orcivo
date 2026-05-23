---
phase: "2A"
plan: "02-P05"
title: "Backend — QuoteModule (CRUD + state machine + BullMQ expiry + cálculo de totais)"
subsystem: "backend"
tags: ["quote", "state-machine", "bullmq", "decimal", "multi-tenant", "public-api"]
dependency_graph:
  requires: ["02-P01", "02-P02"]
  provides: ["QuoteService", "QuoteModule", "QuoteExpiryProcessor", "QuotePublicController"]
  affects: ["02-P07"]
tech_stack:
  added:
    - "@nestjs/bullmq@11.0.4"
    - "bullmq@5.77.1"
    - "@nestjs/schedule@4.1.2"
    - "decimal.js@10.6.0"
    - "class-validator + class-transformer (faltavam para ValidationPipe)"
  patterns:
    - "Redis INCR para número sequencial por empresa"
    - "approval_token UUID opaco salvo em Redis (TTL 604800s) + banco"
    - "BullMQ delayed job + @Cron sweep diário como fallback"
    - "Controller separado para rotas públicas (sem TenantGuard)"
key_files:
  created:
    - "apps/backend/src/quote/quote.service.ts"
    - "apps/backend/src/quote/quote-expiry.processor.ts"
    - "apps/backend/src/quote/quote.service.spec.ts"
    - "apps/backend/src/quote/quote.controller.ts"
    - "apps/backend/src/quote/quote-public.controller.ts"
    - "apps/backend/src/quote/quote.module.ts"
    - "apps/backend/src/quote/quote.isolation.spec.ts"
    - "apps/backend/test/globalSetup.ts"
    - "apps/backend/.env.test (gitignored)"
  modified:
    - "apps/backend/src/app.module.ts"
    - "apps/backend/src/redis/redis.service.ts"
    - "prisma/schema.prisma"
    - ".github/workflows/backend.yml"
    - "apps/backend/package.json"
decisions:
  - "bullmq@5.77.1 usado no lugar de 6.12.3 (versão 6 não existe — máximo disponível é 5.77.1)"
  - "Quote.created_by_user_id adicionado ao schema (ausente em P01, necessário para P07 approve)"
  - "QuotePublicController separado do QuoteController para evitar ForbiddenException do TenantGuard em rotas públicas"
metrics:
  duration: "~25min"
  completed: "2026-05-22"
  tasks_completed: 2
  files_changed: 14
---

# Phase 2A Plan 05: QuoteModule — CRUD + State Machine + BullMQ + Totais

**One-liner:** QuoteModule com CRUD tenant-scoped, máquina de estados validada via assertValidTransition, cálculo de totais usando Decimal.js, approval_token UUID no Redis (TTL 7 dias), BullMQ expiry + @Cron sweep diário, e QuotePublicController separado para rota pública sem guards.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | QuoteService + QuoteExpiryProcessor + 7 unit tests | 76a16f4 | quote.service.ts, quote-expiry.processor.ts, quote.service.spec.ts, redis.service.ts, schema.prisma |
| 2 | QuoteController + QuotePublicController + QuoteModule + isolation spec | dd88c6d | quote.controller.ts, quote-public.controller.ts, quote.module.ts, quote.isolation.spec.ts, app.module.ts |

## Verification Results

- 7 testes unitários: PASS (state machine, Decimal totals, BullMQ, getByApprovalToken)
- Backend typecheck: PASS (sem erros TypeScript)
- Cálculo de totais: sem parseFloat em campos monetários — confirmado por grep
- @Cron('0 2 * * *') + updateMany: presente em quote-expiry.processor.ts
- quote:seq: e quote:approval: Redis keys: confirmados
- Isolation spec: criado (requer DB+Redis em CI — não executa localmente sem infraestrutura)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Field] Quote.created_by_user_id ausente no schema após P01**
- **Found during:** Task 1 (compilação da service)
- **Issue:** plan e must_haves exigem `created_by_user_id` em `getByApprovalToken`, mas o campo não existia no model Quote do schema.prisma (estava apenas em WorkOrder)
- **Fix:** Adicionado `created_by_user_id String?` ao model Quote + back-relation `quotes_created Quote[]` no model User + regenerado Prisma client
- **Files modified:** prisma/schema.prisma
- **Commit:** 76a16f4

**2. [Rule 1 - Bug] bullmq@6.12.3 não existe no registry**
- **Found during:** Instalação de dependências
- **Issue:** RESEARCH.md especificou versão 6.12.3 mas o máximo disponível é 5.77.1
- **Fix:** Instalado bullmq@5.77.1 (compatível com @nestjs/bullmq@11.0.4 que aceita ^3.0.0 || ^4.0.0 || ^5.0.0)
- **Commit:** 76a16f4

**3. [Rule 2 - Missing Dep] class-validator e class-transformer ausentes**
- **Found during:** Task 2 (isolation spec execução)
- **Issue:** ValidationPipe do NestJS requer class-validator mas não estava instalado — todos os isolation specs falhavam
- **Fix:** Instalado class-validator + class-transformer no backend
- **Commit:** dd88c6d

**4. [Rule 2 - Missing Config] MINIO_* vars ausentes no CI e em testes locais**
- **Found during:** Task 2 (isolation spec execução)
- **Issue:** StorageService usa getOrThrow('MINIO_ENDPOINT') e falha ao inicializar mesmo em testes que não usam storage
- **Fix:** Criado .env.test (gitignored) com vars dummy + test/globalSetup.ts que carrega esse arquivo + adicionadas MINIO_* vars ao CI backend.yml
- **Files:** apps/backend/test/globalSetup.ts, .github/workflows/backend.yml
- **Commit:** dd88c6d

**5. [Rule 2 - Missing Method] RedisService sem métodos set() e incr()**
- **Found during:** Task 1 (compilação da service)
- **Issue:** QuoteService precisa de redis.incr() para número sequencial e redis.set() com TTL para approval_token, mas RedisService só tinha get/setex/del
- **Fix:** Adicionados set(key, value, exFlag?, ttl?) e incr(key) ao RedisService
- **Files:** apps/backend/src/redis/redis.service.ts
- **Commit:** 76a16f4

## Known Stubs

Nenhum stub — todos os campos retornados por getByApprovalToken são reais e persistidos no banco.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-2A-11 mitigated | quote.service.ts | computeTotals() usa Decimal.js exclusivamente — cliente não pode enviar totais |
| T-2A-12 mitigated | quote.service.ts | assertValidTransition lança BadRequestException antes de qualquer update |
| T-2A-14 mitigated | quote-expiry.processor.ts | @Cron sweep diário + BullMQ delayed job como fallback duplo |

## Self-Check: PASSED

- apps/backend/src/quote/quote.service.ts: FOUND
- apps/backend/src/quote/quote-expiry.processor.ts: FOUND
- apps/backend/src/quote/quote.service.spec.ts: FOUND
- apps/backend/src/quote/quote.controller.ts: FOUND
- apps/backend/src/quote/quote-public.controller.ts: FOUND
- apps/backend/src/quote/quote.module.ts: FOUND
- apps/backend/src/quote/quote.isolation.spec.ts: FOUND
- Commit 76a16f4: FOUND
- Commit dd88c6d: FOUND
