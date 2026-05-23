---
phase: "2A"
plan: "02-P11"
title: "Web — Páginas de Orçamento (lista, detalhe, criação) + compartilhamento WhatsApp"
status: complete
completed_at: "2026-05-23"
duration_minutes: 40
tasks_completed: 2
tasks_total: 2

subsystem: web
tags: [quote, whatsapp, next.js, server-components, client-components, route-handlers, decimal]

dependency_graph:
  requires:
    - "02-P05 — QuoteModule backend (GET /quotes, POST, POST /send, PATCH /cancel)"
    - "02-P10 — padrão de páginas web (Server Component + Client Component filho)"
  provides:
    - "web /orcamentos — lista com status badges coloridos e formatMoney"
    - "web /orcamentos/novo — formulário de criação com itens dinâmicos e seleção do catálogo"
    - "web /orcamentos/:id — detalhe com envio, WhatsApp share, download PDF e cancelamento"
    - "apps/web/lib/quote.service.ts — fetchQuotes/fetchQuote/createQuote/sendQuote/cancelQuote"
    - "apps/web/lib/whatsapp.ts — buildWhatsAppLink/openWhatsApp"
  affects:
    - "AppSidebar link /orcamentos agora resolve página real"

tech_stack:
  added: []
  patterns:
    - "Server Component (async) para /orcamentos e /orcamentos/:id — apiFetch usa next/headers (server-only)"
    - "Client Component filho (OrcamentoDetail) para interatividade (send, cancel, WhatsApp)"
    - "Client Component (NovoOrcamentoForm) para formulário com itens dinâmicos"
    - "Route Handler proxies /api/quotes, /api/quotes/[id]/send, /api/quotes/[id]/cancel, /api/customers, /api/catalog"
    - "multiplyDecimal + sumDecimal de @orcivo/shared-types para preview de totais (nunca parseFloat)"
    - "buildWhatsAppLink normaliza telefone (só dígitos) e gera wa.me com mensagem pt-BR codificada"

key_files:
  created:
    - apps/web/lib/quote.service.ts
    - apps/web/lib/whatsapp.ts
    - apps/web/app/(app)/orcamentos/page.tsx
    - apps/web/app/(app)/orcamentos/novo/page.tsx
    - apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx
    - apps/web/app/(app)/orcamentos/[id]/page.tsx
    - apps/web/app/(app)/orcamentos/[id]/OrcamentoDetail.tsx
    - apps/web/app/api/quotes/route.ts
    - apps/web/app/api/quotes/[id]/send/route.ts
    - apps/web/app/api/quotes/[id]/cancel/route.ts
    - apps/web/app/api/customers/route.ts
    - apps/web/app/api/catalog/route.ts
  modified: []

decisions:
  - "Route Handler proxies para mutações client-side — apiFetch usa next/headers (server-only),
     portanto Client Components chamam /api/* same-origin que injetam JWT do cookie httpOnly"
  - "OrcamentoDetail como Client Component filho — Server Component page.tsx busca dados e passa
     como prop inicial; Client Component gerencia estado local de send/cancel/approvalUrl"
  - "NovoOrcamentoForm como Client Component puro — formulário dinâmico com lista de itens
     requer useState; dados de customers e catalog carregados via /api/* Route Handlers"
  - "Preview de total usa sumDecimal([subtotal, '-discountAmount']) — subtração sem importar
     decimal.js diretamente no web app (evita conflito de tipos @types/react 18 vs 19)"
---

# Phase 2A Plan 11: Web — Orçamentos + WhatsApp — Summary

**One-liner:** Páginas Next.js de lista, criação e detalhe de orçamentos com preview Decimal.js, status badges pt-BR, compartilhamento WhatsApp via wa.me e download de PDF; serviços e proxies Route Handler seguindo padrão httpOnly JWT cookie.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | quote.service.ts + whatsapp.ts + lista /orcamentos | 25dd347 | 6 arquivos criados |
| 2 | Formulário de criação + detalhe do orçamento | 8b0cc7d | 6 arquivos criados |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Caminho de import errado em OrcamentoDetail e page.tsx**
- **Found during:** Task 2 — primeiro build
- **Issue:** Arquivos em `app/(app)/orcamentos/[id]/` precisam de `../../../../lib/` (4 níveis),
  mas o template do plano usava `../../../lib/` (3 níveis)
- **Fix:** Corrigidos para `../../../../lib/whatsapp` e `../../../../lib/quote.service`
- **Commit:** 8b0cc7d

**2. [Rule 3 - Blocking] `decimal.js` não disponível diretamente no web app**
- **Found during:** Task 2 — type check
- **Issue:** `require('decimal.js')` em Client Component causava "Cannot find module 'decimal.js'"
  pois o pacote é dependência de `@orcivo/shared-types`, não do web app diretamente
- **Fix:** Removida importação dinâmica de decimal.js; subtração de desconto implementada via
  `sumDecimal([subtotal, '-' + discountAmount])` usando apenas helpers de @orcivo/shared-types
- **Commit:** 8b0cc7d

### Architecture Note: padrão apiFetch (server-only)

O plano especificava componentes com `'use client'` chamando os services diretamente.
Porém `apiFetch` importa `next/headers` (server-only) — impossível usar em Client Components.

Seguindo o padrão estabelecido em P10:
- **Server Components** (async) para páginas que só leem dados: `/orcamentos`, `/orcamentos/:id`
- **Client Components** filhos para interatividade: `OrcamentoDetail`, `NovoOrcamentoForm`
- **Route Handler proxies** para mutações client-side: `/api/quotes/*`, `/api/customers`, `/api/catalog`

## Threat Model Coverage

| Threat ID | Mitigation |
|-----------|-----------|
| T-2A-28 | Backend sempre recalcula totais; preview client-side é apenas UX |
| T-2A-29 | approvalUrl usa token opaco (UUID 122 bits); wa.me link abre WhatsApp sem expor dados sensíveis |

## Known Stubs

Nenhum stub crítico. Todas as páginas buscam dados reais da API.

Nota: `/orcamentos` lista apenas a página 1 (sem paginação). Paginação pode ser adicionada em Fase 2B.

## Self-Check: PASSED

Arquivos criados:
- apps/web/lib/quote.service.ts ✓
- apps/web/lib/whatsapp.ts ✓
- apps/web/app/(app)/orcamentos/page.tsx ✓
- apps/web/app/(app)/orcamentos/novo/page.tsx ✓
- apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx ✓
- apps/web/app/(app)/orcamentos/[id]/page.tsx ✓
- apps/web/app/(app)/orcamentos/[id]/OrcamentoDetail.tsx ✓
- apps/web/app/api/quotes/route.ts ✓
- apps/web/app/api/quotes/[id]/send/route.ts ✓
- apps/web/app/api/quotes/[id]/cancel/route.ts ✓
- apps/web/app/api/customers/route.ts ✓
- apps/web/app/api/catalog/route.ts ✓

Commits:
- 25dd347 feat(2A-P11): quote.service, whatsapp helper e lista /orcamentos ✓
- 8b0cc7d feat(2A-P11): formulário de criação e detalhe de orçamento ✓

Build: `pnpm --filter @orcivo/web build` → ✓ Compiled successfully, 17/17 páginas geradas.
(EPERM standalone: problema pré-existente de permissão Windows — não afeta compilação)
