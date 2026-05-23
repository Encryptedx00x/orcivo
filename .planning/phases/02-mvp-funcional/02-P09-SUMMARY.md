---
phase: "2A"
plan: "02-P09"
title: "Mobile — Telas de Orçamento (lista, detalhe, criação) + compartilhamento WhatsApp"
status: completed
completed_date: "2026-05-23"
duration_minutes: 25
tasks_completed: 2
tasks_total: 2
files_created:
  - apps/mobile/src/services/quote.service.ts
  - apps/mobile/src/screens/QuoteListScreen.tsx
  - apps/mobile/src/screens/QuoteDetailScreen.tsx
  - apps/mobile/src/screens/QuoteCreateScreen.tsx
files_modified: []
key_decisions:
  - "parseFloat usado apenas para validação de entrada (checar se é número), nunca para cálculo monetário — cálculo real usa multiplyDecimal/sumDecimal de Decimal.js"
  - "wa.me deep link normaliza phone removendo máscara e adicionando DDI 55 se ausente"
  - "buildWhatsAppLink inline em QuoteDetailScreen — função pura sem dependência externa"
  - "sendQuote retorna approvalUrl que fica em state local para botão WhatsApp sem recarregar"
  - "QuoteCreateScreen usa customer_id como campo de texto no MVP — seletor de clientes diferido"
dependency_graph:
  requires: ["02-P05 (GET|POST /quotes, POST /quotes/:id/send)", "02-P08 (api.ts com X-Client-Request-Id, catalog.service.ts)"]
  provides: ["QuoteListScreen", "QuoteDetailScreen", "QuoteCreateScreen", "quoteService"]
  affects: ["02-P10 (web quote screens)", "02-P11 (aprovação pública)"]
tech_stack:
  added: []
  patterns:
    - "FlatList + onRefresh para listas com pull-to-refresh"
    - "Modal animationType=slide para seleção do catálogo"
    - "Linking.openURL para wa.me deep link"
    - "Alert.alert para confirmação de cancelamento"
    - "multiplyDecimal + sumDecimal para preview de totais (nunca number/float)"
    - "formatMoney para toda exibição de valores monetários"
key_files:
  created:
    - apps/mobile/src/services/quote.service.ts
    - apps/mobile/src/screens/QuoteListScreen.tsx
    - apps/mobile/src/screens/QuoteDetailScreen.tsx
    - apps/mobile/src/screens/QuoteCreateScreen.tsx
  modified: []
decisions:
  - "Preview de totais usa Decimal.js via multiplyDecimal/sumDecimal — backend sempre recalcula os valores reais (T-2A-24 accepted)"
  - "approvalUrl armazenado em state local após sendQuote para habilitar botão WhatsApp imediatamente"
  - "Seletor de cliente simplificado para campo de texto no MVP — seletor com busca diferido"
metrics:
  duration: "~25 min"
  completed_date: "2026-05-23"
  tasks_completed: 2
  files_changed: 4
---

# Phase 2A Plan 09: Mobile — Telas de Orçamento + WhatsApp — Summary

**One-liner:** 3 telas mobile de orçamento (lista, detalhe com envio/cancelamento, criação com seleção de catálogo) com preview de totais via Decimal.js e compartilhamento WhatsApp via wa.me deep link.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | quote.service.ts + QuoteListScreen + QuoteDetailScreen | f0d6a72 | quote.service.ts, QuoteListScreen.tsx, QuoteDetailScreen.tsx |
| 2 | QuoteCreateScreen com seleção de itens do catálogo e cálculo de preview | 58370d6 | QuoteCreateScreen.tsx |

## Deliverables

### quote.service.ts
- `fetchQuotes(page)` — GET /quotes?page=N
- `fetchQuote(id)` — GET /quotes/:id
- `createQuote(dto)` — POST /quotes (X-Client-Request-Id via api.ts)
- `sendQuote(id)` — POST /quotes/:id/send (X-Client-Request-Id via api.ts)
- `cancelQuote(id, reason?)` — PATCH /quotes/:id/cancel (X-Client-Request-Id via api.ts)
- Todos os campos monetários como `string` decimal — nunca `number`

### QuoteListScreen
- FlatList com pull-to-refresh
- Badge de status com ícone Lucide e cor específica por status:
  - DRAFT: cinza + FileText
  - SENT: amarelo #F59E0B + Clock
  - APPROVED: verde #16A34A + CheckCircle
  - REJECTED: vermelho #DC2626 + XCircle
  - CANCELLED: cinza escuro #374151 + XCircle
  - EXPIRED: laranja #EA580C + Clock
- Total formatado com `formatMoney()` de shared-types
- FAB (+) para QuoteCreateScreen
- Loading/empty/error states

### QuoteDetailScreen
- Header com número, título (se existir), nome do cliente e badge de status
- Lista de itens com `quantidade × preço unitário = total` formatados com `formatMoney()`
- Seção de totais: subtotal, desconto (se > 0), total em destaque (roxo)
- Ações condicionais por status:
  - DRAFT: "Enviar orçamento" (chama sendQuote) + "Cancelar orçamento" (com Alert de confirmação)
  - SENT: "Compartilhar no WhatsApp" + exibição do approvalUrl copiável
  - APPROVED: box verde "Aprovado — OS criada"
- wa.me deep link: normaliza phone (remove máscara, adiciona 55 se necessário)
- Mensagem pré-formatada: `Olá {nome}! Segue o orçamento #{number} para aprovação: {url}`

### QuoteCreateScreen
- Campos: cliente (texto), título (opcional), validade (opcional)
- Botão "Do catálogo" → modal com FlatList do catalogService + botão (+) por item
- Botão "Manual" → adiciona linha com campos descrição, quantidade, preço
- Preview de total por item: `multiplyDecimal(quantity, unit_price)` → formatMoney()
- Preview de subtotal geral: `sumDecimal(items.map(...))` → formatMoney()
- Validação inline: pelo menos 1 item, todos os campos obrigatórios por item
- Submit: constrói QuoteCreateDto com quantity/unit_price como strings decimais
- Loading state durante submit (botão desabilitado)
- Navega para QuoteDetailScreen com ID do orçamento criado

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TS6133: variável idx não utilizada em QuoteCreateScreen**
- **Found during:** Task 2 — typecheck retornou `'idx' is declared but its value is never read`
- **Issue:** `items.forEach((item, idx) => {...})` usava `idx` apenas como placeholder sem uso real
- **Fix:** Removido `idx` do parâmetro do forEach
- **Files modified:** apps/mobile/src/screens/QuoteCreateScreen.tsx

## Known Stubs

**QuoteCreateScreen — campo de cliente simplificado:**
- O campo de cliente aceita texto livre (nome ou ID) em vez de um seletor com busca
- No submit, o valor digitado é passado diretamente como `customer_id`
- Isso causa erro de negócio se o backend exigir UUID válido de customer
- Motivo: seletor de clientes com busca requer tela/modal adicional não incluída neste plano
- Plano futuro: adicionar CustomerPickerModal que busca GET /customers?q= e retorna { id, name }

## Pre-existing Issues (out of scope)

Os seguintes erros TypeScript existiam antes deste plano (documentados em P08):

| Erro | Afeta arquivos P09 | Origem |
|------|-------------------|--------|
| TS2786 `lucide-react-native JSX` | QuoteListScreen, QuoteDetailScreen, QuoteCreateScreen | lucide-react-native + @types/react@18.2.x incompatibilidade de JSX types |

Estes erros são rastreados para fix em plano separado de health check do mobile.

## Threat Flags

Nenhuma surface nova além do wa.me deep link documentado no threat model do plano (T-2A-25 accepted).

## Self-Check: PASSED

- apps/mobile/src/services/quote.service.ts: FOUND
- apps/mobile/src/screens/QuoteListScreen.tsx: FOUND
- apps/mobile/src/screens/QuoteDetailScreen.tsx: FOUND (wa.me em linha 43, formatMoney presente)
- apps/mobile/src/screens/QuoteCreateScreen.tsx: FOUND (multiplyDecimal linha 37, sumDecimal linha 110)
- Commit f0d6a72: FOUND
- Commit 58370d6: FOUND
- X-Client-Request-Id: confirmado em api.ts (P08) linhas 25, 43, 60, 75
- Sem parseFloat para cálculo monetário: CONFIRMED (parseFloat apenas para validação de entrada)
- wa.me deep link: CONFIRMED (QuoteDetailScreen linha 43)
- formatMoney em todas as exibições de valor: CONFIRMED
