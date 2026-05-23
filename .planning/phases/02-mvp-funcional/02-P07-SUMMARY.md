---
phase: "2A"
plan: "02-P07"
title: "Backend — PDF service + Approval flow (QuoteApproval + WorkOrder automatica)"
subsystem: "backend"
tags: ["pdf", "react-pdf", "approval", "audit-log", "work-order", "idempotency", "signature", "watermark"]
dependency_graph:
  requires: ["02-P04", "02-P05", "02-P06"]
  provides: ["QuotePdfService", "approve()", "POST /quotes/public/:token/approve"]
  affects: []
tech_stack:
  added:
    - "@react-pdf/renderer@4.5.1"
    - "@types/react (devDependency)"
  patterns:
    - "JSX no backend via jsx:react-jsx no tsconfig"
    - "$transaction com updateMany count check para idempotencia"
    - "AuditLog dentro do $transaction (mesmo commit atomico)"
    - "base64 PNG → Buffer → MinIO para assinatura desenhada"
    - "WorkOrder criada automaticamente apos aprovacao"
key_files:
  created:
    - "apps/backend/src/quote/quote-pdf.service.tsx"
    - "apps/backend/src/quote/quote-pdf.service.spec.ts"
  modified:
    - "apps/backend/src/quote/quote.service.ts"
    - "apps/backend/src/quote/quote-public.controller.ts"
    - "apps/backend/src/quote/quote.module.ts"
    - "apps/backend/src/quote/quote.service.spec.ts"
    - "apps/backend/src/quote/quote.isolation.spec.ts"
    - "apps/backend/tsconfig.json"
    - "apps/backend/package.json"
    - "packages/shared-types/src/quote/quote-approval.dto.ts"
decisions:
  - "jsx:react-jsx no tsconfig — permite JSX sem import React explicito (React 17+ automatic runtime)"
  - "moduleFileExtensions tsx + transform tsx? no jest config para suportar .tsx em testes"
  - "jest.mock('./quote-pdf.service') no quote.service.spec.ts — evita ESM crash de @react-pdf/renderer"
  - "jest.mock('@react-pdf/renderer') no quote.isolation.spec.ts — mesmo motivo"
  - "approve() fora do $transaction para DRAWN_SIGNATURE (upload MinIO) e QuoteApproval.create — apenas status+auditLog dentro da transaction atomica"
metrics:
  duration: "~35min"
  completed: "2026-05-23"
  tasks_completed: 2
  files_changed: 10
---

# Phase 2A Plan 07: Backend — PDF service + Approval flow

**One-liner:** QuotePdfService gera PDF A4 com @react-pdf/renderer (marca dagua "Orcivo Livre" para plan_code=LIVRE); send() salva PDF no MinIO e retorna pdf_url; approve() usa $transaction com updateMany+count para idempotencia, cria AuditLog dentro da transaction, processa DRAWN_SIGNATURE como PNG no MinIO, cria WorkOrder automatica e retorna 409 em aprovacao dupla.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | QuotePdfService + tsconfig jsx + 5 testes | 7943eb3 | quote-pdf.service.tsx, quote-pdf.service.spec.ts, tsconfig.json, package.json |
| 2 | approve() + send() atualizado + controller + module + shared-types | c718a00 | quote.service.ts, quote-public.controller.ts, quote.module.ts, quote.service.spec.ts, quote.isolation.spec.ts, quote-approval.dto.ts |

## Verification Results

- 5 testes QuotePdfService: PASS (mock de renderToBuffer)
- 12 testes QuoteService: PASS (incluindo 5 novos testes do approve())
- TypeScript typecheck: PASS (tsc --noEmit sem erros)
- grep parseFloat( em quote-pdf.service.tsx: vazio — OK
- grep "new Decimal" em quote-pdf.service.tsx: linha 93 — OK
- grep "import Decimal from 'decimal.js'" em quote-pdf.service.tsx: linha 1 — OK
- grep auditLog.create em quote.service.ts: linha 157 — OK
- grep $transaction em quote.service.ts: linha 149 — OK
- grep workOrderService.create em quote.service.ts: linha 200 — OK
- pnpm --filter @orcivo/shared-types build: PASS (dist/index.js existe)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Jest nao suportava .tsx sem configuracao**
- **Found during:** Task 1 (execucao dos testes)
- **Issue:** package.json jest config tinha moduleFileExtensions: ["js","json","ts"] e transform apenas .ts|.js — arquivo .tsx nao era processado
- **Fix:** Adicionado "tsx" a moduleFileExtensions e mudado transform para `^.+\\.(t|j)sx?$`
- **Files modified:** apps/backend/package.json
- **Commit:** 7943eb3

**2. [Rule 1 - Bug] import React explicito desnecessario com react-jsx**
- **Found during:** Task 1 (TypeScript TS6133: 'React' is declared but its value is never read)
- **Issue:** Com jsx:react-jsx o runtime React e injetado automaticamente — import explicito gera erro TS6133
- **Fix:** Removido `import React from 'react'` do quote-pdf.service.tsx
- **Commit:** 7943eb3

**3. [Rule 3 - Blocking] @react-pdf/renderer e modulo ESM incompativel com Jest CommonJS**
- **Found during:** Task 2 (quote.service.spec.ts importou QuotePdfService que importou @react-pdf/renderer)
- **Issue:** SyntaxError: Cannot use import statement outside a module — @react-pdf/renderer usa ESM puro
- **Fix 1:** `jest.mock('./quote-pdf.service')` no topo do quote.service.spec.ts (antes de qualquer import)
- **Fix 2:** `jest.mock('@react-pdf/renderer')` no quote.isolation.spec.ts para carregar o modulo completo
- **Files modified:** quote.service.spec.ts, quote.isolation.spec.ts
- **Commit:** c718a00

**4. [Rule 2 - Missing Field] send() nao buscava company para gerar PDF**
- **Found during:** Task 2 (implementacao do send() atualizado)
- **Issue:** QuotePdfService.generate() precisa de CompanyData mas send() so tinha companyId
- **Fix:** Adicionado `this.prisma.company.findUniqueOrThrow({ where: { id: companyId } })` antes de chamar pdfService.generate()
- **Commit:** c718a00

## Known Stubs

Nenhum stub — todos os campos sao reais.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-2A-18 mitigated | quote.service.ts | $transaction com updateMany({ where: { status: 'SENT' } }) + count === 0 → 409 ConflictException |
| T-2A-20 mitigated | quote-approval.dto.ts | z.string().max(2_000_000) adicionado ao campo signature |

## Self-Check: PASSED

- apps/backend/src/quote/quote-pdf.service.tsx: FOUND
- apps/backend/src/quote/quote-pdf.service.spec.ts: FOUND
- apps/backend/src/quote/quote.service.ts: FOUND
- apps/backend/src/quote/quote-public.controller.ts: FOUND
- apps/backend/src/quote/quote.module.ts: FOUND
- packages/shared-types/src/quote/quote-approval.dto.ts: FOUND
- Commit 7943eb3: FOUND
- Commit c718a00: FOUND
