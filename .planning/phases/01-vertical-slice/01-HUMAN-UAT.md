---
status: partial
phase: 01-vertical-slice
source: [01-VERIFICATION.md]
started: 2026-05-22T00:00:00Z
updated: 2026-05-22T00:00:00Z
---

## Como rodar para testar

Ver guia completo em `docs/runbooks/local-dev.md`.

**Ordem rápida:**

```bash
# Pré-requisito (1x ou após alterar DTOs)
pnpm --filter @orcivo/shared-types build

# Terminal 0 (infra)
pnpm dev:infra
npx prisma db push

# Terminal 1 (backend) — compila shared-types antes de iniciar
pnpm dev:backend
# → http://localhost:3000/health deve retornar {"status":"ok"}

# Terminal 2 (web) — compila shared-types antes de iniciar
pnpm dev:web
# → http://localhost:3001

# Terminal 3 (mobile — opcional)
pnpm dev:mobile
# → escanear QR Code com Expo Go
```

## Current Test

[awaiting human testing]

## Tests

### 1. Web — redirecionamento sem autenticação
expected: Abrir http://localhost:3001 sem login redireciona para /login
result: [pending]

### 2. Web — signup 2 etapas
expected: Preencher dados pessoais (step 1) → dados da empresa (step 2) → login automático com sidebar visível
result: [pending]

### 3. Web — sidebar com 9 itens
expected: Sidebar mostra: Início, Clientes, Ordens de Serviço, Agenda, Técnicos, Relatórios, Estoque, Planos, Configurações
result: [pending]

### 4. Web — criar cliente
expected: Clientes → Novo Cliente → preencher nome + telefone → salvar → aparecer na listagem
result: [pending]

### 5. Web — logout
expected: Logout remove o cookie e redireciona para /login; token não acessível via JavaScript
result: [pending]

### 6. Mobile — 5 tabs
expected: Após login/signup, bottom tabs mostram: Agenda, Clientes, Ordens, Mais, Config
result: [pending]

### 7. Mobile — fluxo de criação de cliente
expected: Tab Clientes → botão + → formulário → salvar → cliente aparece na lista
result: [pending]

### 8. CI — job "Test (with Postgres + Redis)"
expected: Push para branch → GitHub Actions → job "Test" verde → log mostra "Tests: 2 passed" para customer.isolation.spec.ts
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
