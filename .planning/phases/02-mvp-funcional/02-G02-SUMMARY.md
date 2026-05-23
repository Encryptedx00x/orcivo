---
phase: "2A"
plan: "02-G02"
title: "Gap closure — Web sidebar: corrigir href /ordens → /ordens-de-servico"
one-liner: "Corrigido href do item 'Ordens de Serviço' no sidebar web de '/ordens' para '/ordens-de-servico'"
completed: "2026-05-23"
duration: "< 1 min"
tasks_completed: 1
tasks_total: 1
files_modified:
  - apps/web/components/AppSidebar.tsx
key-decisions: []
---

# Phase 2A Plan G02: Gap Closure — Web Sidebar href Summary

## One-liner

Corrigido href do item "Ordens de Serviço" no sidebar web de `/ordens` para `/ordens-de-servico`, eliminando o 404 ao clicar no menu.

## Tasks

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Corrigir href em AppSidebar.tsx | 43d6cc1 | Done |

## Changes Made

**`apps/web/components/AppSidebar.tsx` — linha 11:**

```ts
// ANTES:
{ label: 'Ordens de Serviço', href: '/ordens', icon: ClipboardList },

// DEPOIS:
{ label: 'Ordens de Serviço', href: '/ordens-de-servico', icon: ClipboardList },
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `apps/web/components/AppSidebar.tsx` modificado com `/ordens-de-servico`
- Commit `43d6cc1` existe no log
- Nenhuma outra linha alterada
