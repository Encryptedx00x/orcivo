---
plan: 06
phase: 01-vertical-slice
status: complete
completed_at: "2026-05-22"
---

# P06 — Web Shell: Summary

## O que foi feito

### Task 1 — Auth routes e middleware
- `apps/web/middleware.ts` — proteção de rotas autenticadas
- `apps/web/app/(auth)/layout.tsx`, `login/page.tsx`, `signup/page.tsx`

### Task 2 — App shell com sidebar
- `apps/web/app/(app)/layout.tsx` com AppSidebar
- `apps/web/components/AppSidebar.tsx` — sidebar com 9 itens (Início, Clientes, Ordens de Serviço, Agenda, Técnicos, Relatórios, Estoque, Planos, Configurações)
- `apps/web/components/TopBar.tsx` com usuário e logout

### Task 3 — Páginas de clientes
- `apps/web/app/(app)/page.tsx` — dashboard/início
- `apps/web/app/(app)/clientes/page.tsx` — listagem
- `apps/web/app/(app)/clientes/novo/page.tsx` — criação

### Task 4 — API client e auth routes
- `apps/web/lib/api.ts` — cliente fetch com auth
- `apps/web/app/api/auth/login/route.ts`
- `apps/web/app/api/auth/logout/route.ts`

## Commits

- `feat(phase-1/p05-p06): mobile shell (5 tabs + auth + customers) + web shell (sidebar 9 itens + auth + clientes)`

## Self-Check: PASSED

- ✓ Sidebar com 9 itens implementada
- ✓ Fluxo de auth completo (login, signup)
- ✓ Páginas de clientes (list e create)
- ✓ Design system Orcivo (Inter, --purple-600, pt-BR)
- ✓ Middleware protege rotas autenticadas
