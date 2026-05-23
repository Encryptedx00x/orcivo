---
phase: "2A"
plan: "02-P06"
title: "Backend — WorkOrderModule (CRUD + upload de fotos)"
subsystem: "backend"
tags: ["work-order", "state-machine", "file-upload", "minio", "multi-tenant", "redis"]
dependency_graph:
  requires: ["02-P01", "02-P02"]
  provides: ["WorkOrderService", "WorkOrderModule", "WorkOrderPhotoService"]
  affects: ["02-P07"]
tech_stack:
  added:
    - "@types/multer (devDependency) — tipos para Express.Multer.File"
  patterns:
    - "Redis INCR para número sequencial por empresa (work-order:seq:{company_id})"
    - "FileInterceptor com limite de 10MB no controller"
    - "Validação de mimetype (jpeg/png/webp) no service antes de chamar uploadBuffer"
    - "Path MinIO: {company_id}/work-orders/{wo_id}/{stage}/{uuid}.ext no bucket orcivo-photos"
    - "Máquina de estados com WO_TRANSITIONS: PENDING→IN_PROGRESS→DONE|CANCELLED"
key_files:
  created:
    - "apps/backend/src/work-order/work-order.service.ts"
    - "apps/backend/src/work-order/work-order-photo.service.ts"
    - "apps/backend/src/work-order/work-order.controller.ts"
    - "apps/backend/src/work-order/work-order.module.ts"
    - "apps/backend/src/work-order/work-order.isolation.spec.ts"
  modified:
    - "apps/backend/src/app.module.ts"
    - "apps/backend/package.json"
    - "pnpm-lock.yaml"
decisions:
  - "WorkOrderService exportado do módulo para uso no QuoteModule (P07 — aprovação cria OS)"
  - "stage validado no controller (BEFORE|DURING|AFTER) para falhar rápido antes de entrar no service"
  - "ALLOWED_MIME_TYPES lista explícita em vez de prefixo image/* — mais restritivo por segurança"
metrics:
  duration: "~15min"
  completed: "2026-05-23"
  tasks_completed: 2
  files_changed: 8
---

# Phase 2A Plan 06: WorkOrderModule — CRUD + Upload de Fotos

**One-liner:** WorkOrderModule com CRUD tenant-scoped, máquina de estados PENDING→IN_PROGRESS→DONE|CANCELLED, número sequencial via Redis INCR, e upload de fotos (jpeg/png/webp ≤10MB) para MinIO via StorageService.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | WorkOrderService + WorkOrderPhotoService | 6387c4d | work-order.service.ts, work-order-photo.service.ts, package.json, pnpm-lock.yaml |
| 2 | WorkOrderController + Module + isolation spec | 407a66b | work-order.controller.ts, work-order.module.ts, work-order.isolation.spec.ts, app.module.ts |

## Verification Results

- Backend build: PASS (sem erros TypeScript)
- company_id em todas as queries WorkOrderService: confirmado por grep
- uploadBuffer + orcivo-photos em WorkOrderPhotoService: confirmado por grep
- Isolation spec: criado com 4 cenários cross-tenant (requer DB+Redis em CI)
- WorkOrderModule registrado no AppModule: confirmado

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Import `crypto` desnecessário em work-order.service.ts**
- **Found during:** Task 1 (build)
- **Issue:** O import de `crypto` foi adicionado seguindo o template do plan, mas `crypto.randomUUID()` só é usado em `work-order-photo.service.ts`. O service de OS não usa crypto diretamente.
- **Fix:** Removido o import de `crypto` de `work-order.service.ts`; mantido apenas em `work-order-photo.service.ts` onde é utilizado.
- **Commit:** 6387c4d

**2. [Rule 2 - Security] ALLOWED_MIME_TYPES usa lista explícita em vez de prefixo `image/*`**
- **Found during:** Task 1 (revisão de segurança T-2A-15)
- **Issue:** O plano usava `ALLOWED_MIME_PREFIXES` com `includes(file.mimetype)` mas a lista era de tipos completos, não prefixos. Manter como lista explícita é mais seguro (não aceita image/svg+xml, image/tiff, etc.)
- **Fix:** Renomeado para `ALLOWED_MIME_TYPES` com `['image/jpeg', 'image/png', 'image/webp']`
- **Commit:** 6387c4d

## Known Stubs

Nenhum stub — WorkOrderModule retorna dados reais do banco.

## Threat Flags

Nenhuma nova superfície além do documentado no threat_model do plan.

| Flag | File | Description |
|------|------|-------------|
| T-2A-15 mitigated | work-order-photo.service.ts | ALLOWED_MIME_TYPES check + MAX_PHOTO_SIZE 10MB antes de uploadBuffer |
| T-2A-16 mitigated | work-order.service.ts | findFirst com WHERE id AND company_id; lança 404 cross-tenant |
| T-2A-17 mitigated | work-order.controller.ts | stage validado contra VALID_STAGES antes de chamar photoService |

## Self-Check: PASSED

- apps/backend/src/work-order/work-order.service.ts: FOUND
- apps/backend/src/work-order/work-order-photo.service.ts: FOUND
- apps/backend/src/work-order/work-order.controller.ts: FOUND
- apps/backend/src/work-order/work-order.module.ts: FOUND
- apps/backend/src/work-order/work-order.isolation.spec.ts: FOUND
- Commit 6387c4d: FOUND
- Commit 407a66b: FOUND
