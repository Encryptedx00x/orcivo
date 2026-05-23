---
phase: "2A"
plan: "02-P10"
title: "Web — Páginas de Catálogo + Ordem de Serviço"
status: complete
completed_at: "2026-05-23"
duration_minutes: 45
tasks_completed: 2
tasks_total: 2

subsystem: web
tags: [catalog, work-order, next.js, server-actions, upload, server-components]

dependency_graph:
  requires:
    - "02-P04 — CatalogModule backend (GET /catalog, POST, PATCH, DELETE)"
    - "02-P06 — WorkOrderModule backend (GET /work-orders, PATCH status, POST photos)"
  provides:
    - "web /catalogo — lista, criação e edição de itens"
    - "web /ordens-de-servico — lista com status colorido"
    - "web /ordens-de-servico/:id — detalhe com ações de status e upload de fotos"
  affects:
    - "AppSidebar links /catalogo e /ordens agora resolvem páginas reais"

tech_stack:
  added: []
  patterns:
    - "Server Component + Server Action para formulários de catálogo (sem JS no cliente)"
    - "Server Component (lista/detalhe) + Client Component filho (interatividade)"
    - "Route Handler /api/work-orders/:id/photos como proxy de upload (lê httpOnly cookie)"
    - "upload-photo.ts separado de work-order.service.ts para evitar next/headers no cliente"

key_files:
  created:
    - apps/web/lib/catalog.service.ts
    - apps/web/lib/work-order.service.ts
    - apps/web/lib/upload-photo.ts
    - apps/web/app/(app)/catalogo/page.tsx
    - apps/web/app/(app)/catalogo/novo/page.tsx
    - apps/web/app/(app)/catalogo/[id]/editar/page.tsx
    - apps/web/app/(app)/catalogo/actions.ts
    - apps/web/app/(app)/ordens-de-servico/page.tsx
    - apps/web/app/(app)/ordens-de-servico/actions.ts
    - apps/web/app/(app)/ordens-de-servico/[id]/page.tsx
    - apps/web/app/(app)/ordens-de-servico/[id]/WorkOrderDetail.tsx
    - apps/web/app/api/work-orders/[id]/photos/route.ts
  modified:
    - apps/web/app/(app)/clientes/novo/page.tsx (JSX.Element return type)
    - apps/web/app/(app)/clientes/page.tsx (JSX.Element return type)
    - apps/web/app/(app)/layout.tsx (JSX.Element return type)
    - apps/web/app/(app)/page.tsx (never return type)
    - apps/web/app/(auth)/layout.tsx (JSX.Element return type)
    - apps/web/app/(auth)/login/page.tsx (JSX.Element return type)
    - apps/web/app/layout.tsx (JSX.Element return type)
    - apps/web/app/page.tsx (Promise<JSX.Element> return type)
    - apps/web/components/AppSidebar.tsx (JSX.Element return type)
    - apps/web/components/TopBar.tsx (JSX.Element return type)

decisions:
  - "Server Actions para formulários de catálogo — token JWT em httpOnly cookie não é acessível
     ao JS, portanto os formulários usam `action={}` do Next.js 14 que executa no servidor"
  - "upload-photo.ts separado de work-order.service.ts — api.ts importa next/headers
     (server-only); transitive import bloquearia Client Components; separação elimina o conflito"
  - "Route Handler /api/work-orders/:id/photos como proxy — JWT em httpOnly cookie é lido
     server-side e injetado como Authorization: Bearer; NÃO usa credentials:include"
  - "WorkOrderDetail como Client Component filho — necessário para useState/handlers de upload;
     servidor (page.tsx) busca dados e passa como prop initial"
---

# Phase 2A Plan 10: Web — Catálogo + Ordem de Serviço — Summary

**One-liner:** Páginas Next.js de Catálogo (lista + CRUD via Server Actions) e Ordens de Serviço (lista + detalhe com upload de fotos via Route Handler proxy) com formatMoney(), badges coloridos pt-BR e ícones Lucide.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Services + páginas de Catálogo | e8ccdad | catalog.service.ts, /catalogo/*, actions.ts + 10 fixes |
| 2 | Páginas de Ordem de Serviço | 1e116a4 | work-order.service.ts, upload-photo.ts, /ordens-de-servico/*, Route Handler |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript @types/react version conflict (18 vs 19)**
- **Found during:** Task 1 — primeiro build
- **Issue:** Projeto tem @types/react 18 e 19 instalados simultaneamente via dependências transitivas;
  TypeScript não conseguia inferir o tipo de retorno de componentes exportados sem anotação explícita.
  Erro: "The inferred type of 'X' cannot be named without a reference to @types/react@19"
- **Fix:** Adicionado `JSX.Element` / `Promise<JSX.Element>` / `never` como anotações explícitas
  de retorno em todos os 10 componentes web pré-existentes afetados
- **Files modified:** clientes/novo/page.tsx, clientes/page.tsx, (app)/layout.tsx, (app)/page.tsx,
  (auth)/layout.tsx, login/page.tsx, app/layout.tsx, app/page.tsx, AppSidebar.tsx, TopBar.tsx
- **Commits:** e8ccdad

**2. [Rule 3 - Blocking] next/headers transitive import bloqueava Client Components**
- **Found during:** Task 2 — segundo build
- **Issue:** work-order.service.ts importa apiFetch de api.ts que usa next/headers (server-only).
  O Client Component WorkOrderDetail importava o service — isso causava erro de webpack.
- **Fix:** Criado upload-photo.ts separado sem dependência de api.ts; WorkOrderDetail importa
  uploadWorkOrderPhoto de upload-photo.ts (sem next/headers)
- **Files:** apps/web/lib/upload-photo.ts (novo)
- **Commit:** 1e116a4

**3. [Rule 1 - Bug] useTransition não aceita async callbacks no React 18**
- **Found during:** Task 2 — typecheck
- **Issue:** startTransition(async () => {...}) lança type error no React 18 (TransitionFunction não aceita Promise)
- **Fix:** Substituído por useState + try/finally pattern padrão
- **Commit:** 1e116a4

### Architecture Deviation: Server Actions em vez de Client-side fetch

O plano especificava formulários com `onSubmit` client-side chamando o service diretamente.
Porém o JWT está em cookie `httpOnly` — inacessível ao JavaScript. Server Actions são a
abordagem correta para Next.js 14 com httpOnly cookie auth.

Resultado funcional equivalente: formulário envia dados → servidor valida → redireciona.

## Token Security (T-2A-27)

O JWT está armazenado em cookie `httpOnly: true, sameSite: 'strict'` (ver `/api/auth/login/route.ts`).
Isso significa que o token **não é acessível ao JavaScript** — mitigação adequada para XSS.

Padrão de acesso ao token:
- **Server Components / Server Actions / Route Handlers:** `cookies().get('access_token')` via next/headers
- **Client Components:** chamam Route Handlers same-origin que injetam o token server-side

Upload de foto: client chama `/api/work-orders/:id/photos` (same-origin Next.js Route Handler)
→ Route Handler lê cookie e injeta `Authorization: Bearer` → backend valida.

Sem `credentials:'include'` (não é cross-origin).

## Threat Model Coverage

| Threat ID | Mitigation |
|-----------|-----------|
| T-2A-26 | `accept="image/*"` no input file; backend valida mimetype independentemente |
| T-2A-27 | JWT em httpOnly cookie — não exposto ao JS; Route Handler injeta token server-side |

## Known Stubs

Nenhum stub crítico. As páginas buscam dados reais da API. Se a API não retornar dados,
empty states exibem mensagens informativas (não dados fictícios).

Nota: a página `/catalogo/[id]/editar` carrega o item via `fetchCatalog(false)` e filtra por ID
localmente — isso é ineficiente se o catálogo for grande. O backend idealmente deveria ter
`GET /catalog/:id`. Registrado para Fase 2B.

## Self-Check: PASSED

Arquivos criados:
- apps/web/lib/catalog.service.ts ✓
- apps/web/lib/work-order.service.ts ✓
- apps/web/lib/upload-photo.ts ✓
- apps/web/app/(app)/catalogo/page.tsx ✓
- apps/web/app/(app)/catalogo/novo/page.tsx ✓
- apps/web/app/(app)/catalogo/[id]/editar/page.tsx ✓
- apps/web/app/(app)/catalogo/actions.ts ✓
- apps/web/app/(app)/ordens-de-servico/page.tsx ✓
- apps/web/app/(app)/ordens-de-servico/actions.ts ✓
- apps/web/app/(app)/ordens-de-servico/[id]/page.tsx ✓
- apps/web/app/(app)/ordens-de-servico/[id]/WorkOrderDetail.tsx ✓
- apps/web/app/api/work-orders/[id]/photos/route.ts ✓

Commits:
- e8ccdad feat(2A-P10): web catalog pages + service + JSX return type fixes ✓
- 1e116a4 feat(2A-P10): web work-order pages + service + photo upload proxy ✓

Build: `pnpm --filter @orcivo/web build` → ✓ Compiled successfully, 12/12 páginas geradas.
TypeScript: `tsc --noEmit` → limpo (sem erros).
