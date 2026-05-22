---
phase: "2A"
plan: "02-P09"
title: "Mobile — Telas de Orçamento (lista, detalhe, criação) + compartilhamento WhatsApp"
wave: 5
depends_on: ["02-P05"]
files_modified:
  - apps/mobile/src/screens/QuoteListScreen.tsx
  - apps/mobile/src/screens/QuoteDetailScreen.tsx
  - apps/mobile/src/screens/QuoteCreateScreen.tsx
  - apps/mobile/src/services/quote.service.ts
autonomous: true
requirements: ["D2.2", "D2.3"]

must_haves:
  truths:
    - "QuoteListScreen lista orçamentos com status badge e valor total formatado"
    - "QuoteCreateScreen permite montar orçamento com itens do catálogo ou manual"
    - "QuoteDetailScreen exibe itens, subtotal, desconto e total — todos com Decimal.js"
    - "Botão 'Enviar via WhatsApp' abre wa.me com link de aprovação pré-formatado"
    - "Preços calculados com Decimal.js (nunca number/float)"
    - "Loading/error/empty states em todas as telas"
    - "Todas as chamadas de API incluem header X-Client-Request-Id (D2-33 RequestIdempotency)"
  artifacts:
    - path: "apps/mobile/src/services/quote.service.ts"
      provides: "fetchQuotes, fetchQuote, createQuote, sendQuote"
      contains: "fetchQuotes"
    - path: "apps/mobile/src/screens/QuoteDetailScreen.tsx"
      provides: "Detalhe do orçamento com botão de envio e link WhatsApp"
      contains: "QuoteDetailScreen"
    - path: "apps/mobile/src/screens/QuoteCreateScreen.tsx"
      provides: "Formulário de criação de orçamento com seleção de itens do catálogo"
      contains: "QuoteCreateScreen"
  key_links:
    - from: "apps/mobile/src/screens/QuoteDetailScreen.tsx"
      to: "POST /quotes/:id/send"
      via: "quoteService.sendQuote(id)"
      pattern: "sendQuote"
    - from: "apps/mobile/src/screens/QuoteDetailScreen.tsx"
      to: "wa.me deep link"
      via: "Linking.openURL('https://wa.me/55...')"
      pattern: "wa\\.me"
---

<objective>
Implementar as telas mobile de Orçamento: lista de orçamentos com status, formulário de criação com seleção de itens do catálogo, e detalhe com envio (gera PDF no backend) e compartilhamento via WhatsApp.

Purpose: D2.2 (orçamento mobile) e D2.3 (compartilhamento WhatsApp). O orçamento é o fluxo central do técnico: criar, enviar via WhatsApp e aguardar aprovação.
Output: 3 telas mobile + 1 service de API; cálculo de preview de totais com Decimal.js; wa.me deep link; X-Client-Request-Id em mutations.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- DTOs disponíveis após P01: -->
<!-- QuoteCreateSchema — items: [{ catalog_item_id?, description, quantity (string), unit_price (string) }] -->
<!-- quantity e unit_price são SEMPRE strings decimais — nunca number -->

<!-- quote.service.ts (backend P05) retorna: -->
<!-- { id, number, status, total (string), subtotal (string), discount_value (string), items: [...], customer: { name } } -->

<!-- sendQuote backend retorna: { approval_token, approvalUrl } -->
<!-- approvalUrl: http://localhost:3000/approve/{token} (web) -->
<!-- wa.me: https://wa.me/55{phone}?text={encoded_message} -->

<!-- Cálculo de preview (apenas frontend): usar Decimal.js da shared-types helpers/money -->
<!-- multiplyDecimal(quantity, unit_price) para item.total -->
<!-- sumDecimal([...item.total]) para subtotal -->
<!-- Backend sempre recalcula — preview é apenas UX -->

<!-- catalogService já disponível após P08 (mesmo wave mas dependência lógica) -->
<!-- Para seleção de itens do catálogo na criação: buscar catalogService.fetchCatalog() -->

<!-- RESEARCH.md §"wa.me deep link" contém função buildWhatsAppLink() -->
<!-- Para React Native: usar Linking.openURL(waUrl) de react-native -->

<!-- D2-33 RequestIdempotency: X-Client-Request-Id OBRIGATÓRIO em todas as mutations -->
<!-- AÇÃO OBRIGATÓRIA: ler apps/mobile/src/services/api.ts (ou core/api.ts) antes de criar services -->
<!-- Verificar se o interceptor já adiciona X-Client-Request-Id -->
<!-- Se não adicionar → adicionar interceptor antes de criar os services (ver P08 Task 1 read_first) -->
<!-- O P08 já pode ter adicionado o interceptor — verificar SUMMARY de P08 antes de duplicar -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: quote.service.ts + QuoteListScreen + QuoteDetailScreen</name>
  <files>
    apps/mobile/src/services/quote.service.ts,
    apps/mobile/src/screens/QuoteListScreen.tsx,
    apps/mobile/src/screens/QuoteDetailScreen.tsx
  </files>
  <read_first>
    - apps/mobile/src/services/api.ts (verificar se existe e se tem interceptor X-Client-Request-Id)
    - apps/mobile/src/core/api.ts (verificar se existe — caminho alternativo)
    - .planning/phases/02-mvp-funcional/2A-P08-SUMMARY.md (confirmar se P08 já adicionou X-Client-Request-Id ao interceptor)
    - apps/mobile/src/services/catalog.service.ts (criado em P08 — padrão a seguir)
    - apps/mobile/src/screens/ (listar existentes — não sobrescrever)
    - packages/shared-types/src/helpers/money.ts (formatMoney, multiplyDecimal, sumDecimal)

    AÇÃO OBRIGATÓRIA sobre X-Client-Request-Id (D2-33):
    Se P08 já adicionou o interceptor → apenas confirmar e prosseguir.
    Se P08 NÃO adicionou → adicionar agora ao arquivo api.ts antes de criar os services.
    Resultado: apps/mobile/src/services/api.ts (ou core/api.ts) DEVE conter 'X-Client-Request-Id'.
  </read_first>
  <action>
**quote.service.ts:**
```typescript
import api from './api';
import { QuoteCreateDto } from '@orcivo/shared-types';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: string;   // sempre string decimal
  unit_price: string; // sempre string decimal
  total: string;      // sempre string decimal
}

export interface Quote {
  id: string;
  number: number;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  title?: string;
  subtotal: string;   // sempre string decimal
  discount_value: string;
  total: string;      // sempre string decimal
  approval_token?: string;
  pdf_url?: string;
  customer: { id: string; name: string; phone?: string };
  items: QuoteItem[];
}

export const quoteService = {
  async fetchQuotes(page = 1): Promise<{ data: Quote[]; page: number }> {
    const { data } = await api.get('/quotes', { params: { page } });
    return data;
  },
  async fetchQuote(id: string): Promise<Quote> {
    const { data } = await api.get(`/quotes/${id}`);
    return data;
  },
  async createQuote(dto: QuoteCreateDto): Promise<Quote> {
    const { data } = await api.post('/quotes', dto);
    return data;
  },
  async sendQuote(id: string): Promise<{ approvalUrl: string; pdf_url: string }> {
    const { data } = await api.post(`/quotes/${id}/send`);
    return data;
  },
  async cancelQuote(id: string, reason?: string): Promise<Quote> {
    const { data } = await api.patch(`/quotes/${id}/cancel`, { reason });
    return data;
  },
};
```

**QuoteListScreen.tsx:**
- FlatList com pull-to-refresh
- Cada item: "#N — Título" (ou "Orçamento #N"), nome do cliente, total formatado com formatMoney(), badge de status
  - DRAFT: cinza, "Rascunho"
  - SENT: amarelo #F59E0B, "Enviado"
  - APPROVED: verde #16A34A, "Aprovado"
  - REJECTED: vermelho #DC2626, "Recusado"
  - CANCELLED: cinza escuro, "Cancelado"
  - EXPIRED: laranja #EA580C, "Expirado"
- FAB (+) para QuoteCreateScreen
- Toque navega para QuoteDetailScreen
- Loading/empty/error states
- Ícones Lucide: FileText, CheckCircle, XCircle, Clock

**QuoteDetailScreen.tsx:**
- Header: "#N — Título", nome do cliente, badge de status
- Lista de itens: descrição, quantidade × preço unitário = total (usando formatMoney)
- Totais: subtotal, desconto (se > 0), total em destaque
- Ações condicionais por status:
  - DRAFT: botão "Enviar orçamento" → chama sendQuote() → recebe approvalUrl
  - DRAFT: botão "Cancelar" com confirmação
  - SENT: botão "Compartilhar no WhatsApp" → wa.me com approvalUrl
  - SENT: exibir approvalUrl como texto copiável
  - APPROVED: badge verde + texto "Aprovado — OS criada"
  - Demais: apenas exibir status
- Botão WhatsApp: usa `Linking.openURL('https://wa.me/55{phone_sem_mascara}?text={encoded}')`
  Mensagem: `Olá {nome_cliente}! Segue o orçamento #{number} para aprovação: {approvalUrl}`
- Loading state durante sendQuote()
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/mobile typecheck 2>&1 | grep -E "error TS" | head -10 || echo "TYPECHECK OK"</automated>
  </verify>
  <done>
    - Todos os arquivos compilam sem erros TypeScript
    - quote.service.ts usa tipos string para campos monetários (nunca number)
    - QuoteDetailScreen usa formatMoney() para exibir valores
    - wa.me link construído com phone do cliente e approvalUrl
    - Todos os textos de UI em pt-BR
    - apps/mobile/src/services/api.ts (ou core/api.ts) CONTÉM 'X-Client-Request-Id' no interceptor
  </done>
</task>

<task type="auto">
  <name>Task 2: QuoteCreateScreen com seleção de itens do catálogo e cálculo de preview</name>
  <files>apps/mobile/src/screens/QuoteCreateScreen.tsx</files>
  <read_first>
    - apps/mobile/src/screens/QuoteDetailScreen.tsx (padrão de tela a seguir)
    - apps/mobile/src/services/catalog.service.ts (para buscar itens do catálogo)
    - packages/shared-types/src/helpers/money.ts (multiplyDecimal, sumDecimal para preview)
    - packages/shared-types/src/quote/quote-create.dto.ts (QuoteCreateSchema — campos obrigatórios)
  </read_first>
  <action>
**QuoteCreateScreen.tsx** — formulário de criação de orçamento:

Campos do formulário:
- Cliente: seletor (picker/search) de clientes da empresa
- Título: TextInput opcional
- Data de validade: opcional (DatePicker ou TextInput formato dd/mm/aaaa)
- Itens do orçamento (lista dinâmica):
  - Botão "Adicionar item do catálogo" → modal/sheet com lista do catálogo (fetchCatalog)
  - Botão "Adicionar item manual" → linha com campo descrição, quantidade, preço unitário
  - Para itens do catálogo: pre-preenche description e unit_price
  - quantity como TextInput numérico (string decimal)
  - unit_price como TextInput numérico (string decimal)
  - total calculado em tempo real via multiplyDecimal(quantity, unit_price) → formatMoney()
  - Ícone de remoção do item (X) Lucide
- Preview de totais (NUNCA number/float):
  - subtotal = sumDecimal(items.map(i => multiplyDecimal(i.quantity, i.unit_price)))
  - Exibido como "Subtotal: R$ {formatMoney(subtotal)}"
  - Total igual ao subtotal (desconto não implementado no MVP mobile — deixar para futura melhoria)

Validação:
- Pelo menos 1 item obrigatório
- Todos os itens devem ter description não vazio e quantity/unit_price > 0
- Mostrar erros de validação inline (campo vazio em vermelho)

Submit:
- Constrói QuoteCreateDto:
  ```typescript
  const dto: QuoteCreateDto = {
    customer_id: selectedCustomerId,
    title: title || undefined,
    items: items.map(i => ({
      catalog_item_id: i.catalog_item_id,
      description: i.description,
      quantity: i.quantity,   // string decimal
      unit_price: i.unit_price, // string decimal
    })),
  };
  ```
- Chama quoteService.createQuote(dto)
- Sucesso: navega para QuoteDetailScreen com o ID do quote criado
- Loading durante submit (botão desabilitado)

Design: seguir design system purple-600 #6D28D9. Ícones Lucide: Plus, Trash2, ShoppingBag (catálogo), Pencil (manual).
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/mobile typecheck 2>&1 | grep -E "error TS" | head -10 || echo "TYPECHECK OK"</automated>
  </verify>
  <done>
    - QuoteCreateScreen compila sem erros TypeScript
    - Cálculo de preview usa multiplyDecimal e sumDecimal de shared-types (nunca parseFloat)
    - QuoteCreateDto tem quantity e unit_price como strings decimais (nunca Number())
    - Submit constrói DTO correto antes de chamar quoteService.createQuote()
    - Validação inline: pelo menos 1 item, campos obrigatórios
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| mobile → wa.me | Deep link abre WhatsApp no device; approvalUrl contém token opaco (UUID) |
| mobile → todas as mutations | X-Client-Request-Id obrigatório para idempotência (D2-33) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-24 | Tampering | cálculo de preview no mobile | accept | Preview é apenas UX — backend sempre recalcula totais reais; cliente não pode enviar totais manipulados |
| T-2A-25 | Information Disclosure | approvalUrl no link WhatsApp | accept | URL contém apenas token UUID opaco; sem dados sensíveis na URL |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/mobile typecheck
grep -rn "parseFloat\|Number(" apps/mobile/src/screens/Quote* | grep -v "Number(page)" || echo "OK — sem float em money"
grep -rn "multiplyDecimal\|sumDecimal\|formatMoney" apps/mobile/src/screens/QuoteCreateScreen.tsx
grep -rn "wa\.me" apps/mobile/src/screens/QuoteDetailScreen.tsx
grep -rn "X-Client-Request-Id" apps/mobile/src/services/api.ts apps/mobile/src/core/api.ts 2>/dev/null || echo "MISSING — interceptor não encontrado"
```
</verification>

<success_criteria>
- typecheck sem erros TypeScript
- Preview de totais em QuoteCreateScreen usa Decimal.js (multiplyDecimal, sumDecimal)
- QuoteCreateDto enviado com quantity e unit_price como strings
- wa.me link construído com phone do cliente (normalizado sem máscara) e approvalUrl
- Todos os textos UI em pt-BR
- Loading/error/empty states nas 3 telas
- apps/mobile/src/services/api.ts (ou core/api.ts) contém 'X-Client-Request-Id' no interceptor de request
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P09-SUMMARY.md`
</output>
