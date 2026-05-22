---
status: partial
phase: 01-vertical-slice
source: [01-VERIFICATION.md]
started: 2026-05-22T00:00:00Z
updated: 2026-05-22T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Mobile — fluxo completo (device ou simulador Android/iOS)
expected: App abre com tela de login; signup em 2 etapas funciona; AppTabs mostra 5 tabs (Agenda, Clientes, Ordens, Mais, Config); tela de Clientes lista e cria; tab Mais mostra MaisStack com 9 itens
result: [pending]

### 2. Web — fluxo completo (browser)
expected: Acesso sem login redireciona para /login; após login sidebar mostra 9 itens; criação de cliente funciona; logout limpa cookie e redireciona; token não exposto ao JavaScript (cookie httpOnly)
result: [pending]

### 3. CI — job "Test (with Postgres + Redis)" no GitHub Actions
expected: Job verde; log mostra "Tests: 2 passed" para customer.isolation.spec.ts; merge bloqueado se teste de isolamento falhar
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
