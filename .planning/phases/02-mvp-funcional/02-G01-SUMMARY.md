---
phase: "2A"
plan: "02-G01"
title: "Gap closure — Orçamentos mobile: registrar telas no navigator"
subsystem: mobile-navigation
tags: [gap-closure, navigation, quotes, mobile]
dependency_graph:
  requires: [02-P09]
  provides: [mobile-quotes-navigation]
  affects: [apps/mobile/src/navigation/AppTabs.tsx]
tech_stack:
  added: []
  patterns: [NativeStackNavigator nested in BottomTabNavigator]
key_files:
  modified:
    - apps/mobile/src/navigation/AppTabs.tsx
decisions:
  - Seguido o padrão existente do ClientesNavigator (mesmo arquivo, mesma estrutura)
  - QuotesStack criado no mesmo arquivo AppTabs.tsx sem extrair para arquivo separado
metrics:
  duration: "5min"
  completed: "2026-05-23"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 2A Plan G01: Gap Closure — Orçamentos Mobile

**One-liner:** Wiring do QuoteNavigator (stack com 3 telas) na aba Orçamentos do AppTabs, substituindo EmBreveScreen.

## What Was Done

A aba "Orçamentos" do navigator mobile apontava para `EmBreveScreen` mesmo após as telas de orçamento terem sido criadas no P09. Este gap closure registrou as telas no navigator.

**Mudanças em `AppTabs.tsx`:**
- Imports adicionados: `QuoteListScreen`, `QuoteDetailScreen`, `QuoteCreateScreen`
- `QuotesStack` criado via `createNativeStackNavigator()`
- Função `QuotesNavigator` criada com as 3 telas registradas (`QuotesList`, `QuoteDetail`, `QuoteCreate`) e `headerTintColor: '#6D28D9'`
- Aba "Orçamentos" atualizada para usar `QuotesNavigator` em vez de `EmBreveScreen`

## Commits

| Hash | Mensagem |
|------|----------|
| 497ea22 | feat(2A-G01): wire QuoteNavigator — aba Orçamentos mobile funcional |

## Deviations from Plan

None — plano executado exatamente como especificado.

## Known Stubs

None — apenas wiring de navegação, sem dados ou UI.

## Self-Check: PASSED

- `QuoteListScreen` presente em AppTabs.tsx: sim (linha 9)
- `QuotesNavigator` presente em AppTabs.tsx: sim (linha 27)
- Commit 497ea22 existe: sim
