---
phase: "2A"
plan: "02-G02"
title: "Gap closure — Web sidebar: corrigir href /ordens → /ordens-de-servico"
wave: 1
autonomous: true
gap_closure: true
closes_gap: "AppSidebar.tsx href='/ordens' resulta em 404 — rota real é /ordens-de-servico"
files_modified:
  - apps/web/components/AppSidebar.tsx
---

<objective>
Corrigir o link "Ordens de Serviço" no sidebar web.

AppSidebar.tsx tem `href: '/ordens'` mas a rota criada no P10 é `app/(app)/ordens-de-servico/`.
O clique no item de menu resulta em 404. Correção de 1 linha.
</objective>

<must_haves>
- [ ] AppSidebar.tsx: NAV array entry "Ordens de Serviço" tem `href: '/ordens-de-servico'`
- [ ] Nenhuma outra linha alterada
- [ ] Arquivo compila sem erros TypeScript
</must_haves>

<tasks>
## Task 1 — Corrigir href em AppSidebar.tsx

**Arquivo:** `apps/web/components/AppSidebar.tsx`

Alterar linha:
```ts
// ANTES:
{ label: 'Ordens de Serviço', href: '/ordens', icon: ClipboardList },

// DEPOIS:
{ label: 'Ordens de Serviço', href: '/ordens-de-servico', icon: ClipboardList },
```

Commit: `fix(2A-G02): corrigir href sidebar /ordens → /ordens-de-servico`

**Self-check:** `grep "ordens" apps/web/components/AppSidebar.tsx` — deve retornar `/ordens-de-servico` (não `/ordens` sozinho).
</tasks>
