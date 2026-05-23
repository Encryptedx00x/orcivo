---
phase: "2A"
plan: "02-P12"
title: "Web pública — Página de aprovação de orçamento + smoke tests + prisma migrate"
status: complete
completed_at: "2026-05-23"
duration_minutes: 30
tasks_completed: 2
tasks_total: 2

subsystem: web
tags: [approval, public-page, canvas, signature, next.js, client-component, no-auth]

dependency_graph:
  requires:
    - "02-P07 — approve() backend + POST /quotes/public/:token/approve"
    - "02-P11 — páginas web de orçamento + approvalUrl"
  provides:
    - "web /approve/:token — página pública sem autenticação"
    - "apps/web/lib/approval.service.ts — fetchPublicQuote/approveQuote sem JWT"
    - "apps/web/app/approve/[token]/SignatureCanvas.tsx — canvas HTML5 com base64 PNG"
  affects:
    - "loop completo: técnico envia WhatsApp → cliente abre /approve/:token → aprova → OS gerada"

tech_stack:
  added: []
  patterns:
    - "Página fora do layout (app) — sem sidebar/auth — layout raiz apenas"
    - "fetch direto (sem apiFetch/next-headers) para rota pública sem JWT"
    - "SignatureCanvas com canvas HTML5 nativo: mouse + touch events, toDataURL PNG"
    - "3 tabs de aprovação: APPROVE_BUTTON, TYPED_NAME, DRAWN_SIGNATURE"

key_files:
  created:
    - apps/web/lib/approval.service.ts
    - apps/web/app/approve/[token]/page.tsx
    - apps/web/app/approve/[token]/SignatureCanvas.tsx
  modified: []

decisions:
  - "fetch direto em approval.service.ts — apiFetch usa next/headers (server-only), impossível em Client Component puro sem JWT"
  - "Página em app/approve/[token]/ fora do grupo (app) — fica fora do AppSidebar/TopBar automaticamente via estrutura de rotas Next.js"

metrics:
  duration: "~20min"
  completed: "2026-05-23"
  tasks_completed: 1
  files_changed: 3
---

# Phase 2A Plan 12: Web pública — Aprovação de orçamento

**One-liner:** Página pública /approve/:token sem autenticação com 3 métodos de aprovação (botão simples, nome digitado, canvas HTML5), formatMoney nos totais, confirmação em pt-BR e approvalService (fetchPublicQuote/approveQuote) usando fetch direto sem JWT.

## Tasks

| Task | Nome | Commit | Arquivos |
|------|------|--------|----------|
| 1 | approval.service.ts + Página /approve/:token + SignatureCanvas | bcf2a3b | 3 arquivos criados |
| 2 | Smoke tests completos + prisma migrate | aprovado pelo usuário | prisma migrate dev --name phase-2a executado |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tipo de retorno explícito necessário em componentes React**
- **Found during:** Task 1 — primeiro build
- **Issue:** TypeScript exigiu `): JSX.Element` explícito em `ApprovePage` e `SignatureCanvas` devido ao conflito de versões `@types/react` (18 vs 19) no monorepo — mesmo padrão documentado em P11
- **Fix:** Adicionado `: JSX.Element` como tipo de retorno em ambos os componentes
- **Files modified:** page.tsx, SignatureCanvas.tsx
- **Commit:** bcf2a3b

### Architecture Note: fetch direto sem apiFetch

O plano especificava `approval.service.ts` sem autenticação usando `fetch` direto — este padrão foi seguido corretamente. Como `apiFetch` importa `next/headers` (server-only), a página de aprovação — que é um Client Component — não pode utilizá-lo. O `approvalService` usa `fetch()` nativo sem cabeçalho `Authorization`, compatível com a rota pública do backend.

## Threat Model Coverage

| Threat ID | Mitigation |
|-----------|-----------|
| T-2A-30 | Frontend exibe "Link inválido ou expirado" quando backend retorna não-200 para token inexistente |
| T-2A-31 | Assinatura canvas é evidência visual; backend armazena ip_address + user_agent como evidência legal |
| T-2A-32 | Token é opaco (UUID 122 bits); backend valida tenant via token — sem company_id na URL pública |

## Known Stubs

Nenhum stub — página busca dados reais da API pública.

## Self-Check: PASSED

Arquivos criados:
- apps/web/lib/approval.service.ts: FOUND
- apps/web/app/approve/[token]/page.tsx: FOUND
- apps/web/app/approve/[token]/SignatureCanvas.tsx: FOUND

Commits:
- bcf2a3b feat(2A-P12): página pública /approve/:token + SignatureCanvas + approvalService: FOUND

Build: `pnpm --filter @orcivo/web build` → Compiled successfully (EPERM standalone é problema pré-existente Windows, não causado por este plano)
TypeScript: `tsc --noEmit` → sem erros

## Smoke Tests Aprovados

O usuário executou os 4 smoke tests e confirmou aprovação:

1. **Smoke test 1 — Catálogo:** Item criado com preço correto formatado como R$ 150,00
2. **Smoke test 2 — Orçamento + WhatsApp:** Orçamento criado, preview de subtotal correto, botão WhatsApp com approvalUrl gerado
3. **Smoke test 3 — Aprovação pública:** Página /approve/:token acessível sem login, aprovação por nome registrada, tela de confirmação exibida, WorkOrder criada automaticamente
4. **Smoke test 4 — OS mobile:** OS aberta no Expo Go, status atualizado para "Em andamento", foto adicionada com sucesso

**Prisma migration:** `npx prisma migrate dev --name phase-2a` executado e aplicado ao banco local.
