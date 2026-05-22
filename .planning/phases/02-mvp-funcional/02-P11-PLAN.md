---
phase: "2A"
plan: "02-P11"
title: "Web — Páginas de Orçamento (lista, detalhe, criação) + compartilhamento WhatsApp"
wave: 6
depends_on: ["02-P05"]
files_modified:
  - apps/web/src/app/(dashboard)/orcamentos/page.tsx
  - apps/web/src/app/(dashboard)/orcamentos/novo/page.tsx
  - apps/web/src/app/(dashboard)/orcamentos/[id]/page.tsx
  - apps/web/src/lib/quote.service.ts
  - apps/web/src/lib/whatsapp.ts
autonomous: true
requirements: ["D2.2", "D2.3"]

must_haves:
  truths:
    - "Página /orcamentos lista orçamentos com status, cliente e total formatado"
    - "Formulário /orcamentos/novo permite adicionar itens do catálogo ou manuais"
    - "Detalhe do orçamento exibe itens, subtotal, desconto e total — tudo com formatMoney()"
    - "Botão 'Enviar via WhatsApp' gera wa.me link com approvalUrl ao clicar"
    - "Após envio (send), pdf_url disponível como link de download do PDF"
    - "Cálculo de preview usa Decimal.js (multiplyDecimal, sumDecimal) — nunca parseFloat"
  artifacts:
    - path: "apps/web/src/lib/quote.service.ts"
      provides: "fetchQuotes, fetchQuote, createQuote, sendQuote"
      contains: "fetchQuotes"
    - path: "apps/web/src/lib/whatsapp.ts"
      provides: "buildWhatsAppLink(phone, approvalUrl, quoteName)"
      contains: "buildWhatsAppLink"
    - path: "apps/web/src/app/(dashboard)/orcamentos/[id]/page.tsx"
      provides: "Detalhe do orçamento com ações de envio e WhatsApp share"
      contains: "OrcamentoDetailPage"
  key_links:
    - from: "apps/web/src/app/(dashboard)/orcamentos/[id]/page.tsx"
      to: "POST /quotes/:id/send"
      via: "quoteService.sendQuote(id)"
      pattern: "sendQuote"
    - from: "apps/web/src/lib/whatsapp.ts"
      to: "window.open(wa.me link)"
      via: "buildWhatsAppLink(phone, approvalUrl, title)"
      pattern: "wa\\.me"
---

<objective>
Implementar as páginas web de Orçamento: lista com filtro por status, formulário de criação com seleção de itens do catálogo, e página de detalhe com envio (gera PDF no backend), download do PDF e botão de compartilhamento WhatsApp.

Purpose: D2.2 (orçamento web) e D2.3 (PDF + WhatsApp share na web). A web é onde o gestor/técnico cria orçamentos detalhados e os envia para aprovação.
Output: 3 páginas Next.js + quote service + whatsapp helper; cálculo de preview com Decimal.js.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- quote.service.ts backend (P05) retorna: -->
<!-- { id, number, status, title, subtotal (str), discount_type, discount_value (str), total (str), pdf_url?, approval_token?, customer: { id, name, phone }, items: [...] } -->
<!-- sendQuote retorna: { ...quote, approvalUrl } -->

<!-- RESEARCH.md §"wa.me deep link" contém buildWhatsAppLink() -->
<!-- Para web: window.open(url, '_blank') em vez de Linking.openURL *)

<!-- Cálculo de preview: multiplyDecimal e sumDecimal de @orcivo/shared-types/helpers/money -->
<!-- decimal.js deve estar instalado em @orcivo/web (instalado em P10) -->

<!-- shadcn/ui disponíveis: Table, Button, Badge, Input, Label, Select, Dialog, Tabs, Separator -->
<!-- Verificar quais já estão instalados antes de usar novos -->

<!-- apiFetch existente em apps/web/src/lib/api.ts -->
<!-- Padrão de página: apps/web/src/app/(dashboard)/catalogo/page.tsx (criado em P10) -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: quote.service.ts + whatsapp.ts + lista de orçamentos</name>
  <files>
    apps/web/src/lib/quote.service.ts,
    apps/web/src/lib/whatsapp.ts,
    apps/web/src/app/(dashboard)/orcamentos/page.tsx
  </files>
  <read_first>
    - apps/web/src/lib/api.ts (padrão de apiFetch)
    - apps/web/src/lib/catalog.service.ts (padrão de service criado em P10)
    - apps/web/src/app/(dashboard)/catalogo/page.tsx (padrão de página a replicar)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"wa.me deep link"
  </read_first>
  <action>
**quote.service.ts:**
```typescript
import { apiFetch } from './api';
import { QuoteCreateDto } from '@orcivo/shared-types';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: string;    // string decimal
  unit_price: string;  // string decimal
  total: string;       // string decimal
}

export interface Quote {
  id: string;
  number: number;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  title?: string;
  subtotal: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: string;
  total: string;
  pdf_url?: string;
  approval_token?: string;
  customer: { id: string; name: string; phone?: string };
  items: QuoteItem[];
  approval?: { approval_method: string; typed_name?: string; approved_at: string };
}

export const quoteService = {
  fetchQuotes: (page = 1) =>
    apiFetch<{ data: Quote[]; page: number }>(`/quotes?page=${page}`),
  fetchQuote: (id: string) =>
    apiFetch<Quote>(`/quotes/${id}`),
  createQuote: (dto: QuoteCreateDto) =>
    apiFetch<Quote>('/quotes', { method: 'POST', body: JSON.stringify(dto) }),
  sendQuote: (id: string) =>
    apiFetch<Quote & { approvalUrl: string }>(`/quotes/${id}/send`, { method: 'POST' }),
  cancelQuote: (id: string, reason?: string) =>
    apiFetch<Quote>(`/quotes/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
};
```

**whatsapp.ts** (conforme RESEARCH.md):
```typescript
export function buildWhatsAppLink(phone: string, approvalUrl: string, quoteName: string): string {
  const normalized = phone.replace(/\D/g, '');
  const message = encodeURIComponent(
    `Olá! Segue o orçamento "${quoteName}" para sua aprovação:\n${approvalUrl}`
  );
  return `https://wa.me/55${normalized}?text=${message}`;
}

export function openWhatsApp(phone: string, approvalUrl: string, quoteName: string): void {
  window.open(buildWhatsAppLink(phone, approvalUrl, quoteName), '_blank', 'noopener,noreferrer');
}
```

**Página /orcamentos (page.tsx):**
- `'use client'`
- Tabela shadcn/ui com colunas: Número, Título/Cliente, Status (badge), Total (formatMoney), Data criação, Ações
- Status badges:
  - DRAFT: cinza, "Rascunho"
  - SENT: amarelo #F59E0B, "Enviado"
  - APPROVED: verde, "Aprovado"
  - REJECTED: vermelho, "Recusado"
  - CANCELLED: cinza escuro, "Cancelado"
  - EXPIRED: laranja, "Expirado"
- Botão "Novo orçamento" → /orcamentos/novo
- Link no número → /orcamentos/:id
- Filtro por status (Select + botão "Filtrar") — opcional para MVP; pode ser simples
- Loading Skeleton + empty state + error Alert
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/web build 2>&1 | grep -E "^.*error|^.*Error" | grep -v "warn" | head -10 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - quote.service.ts compila sem erros
    - buildWhatsAppLink retorna URL wa.me com número normalizado (só dígitos) e mensagem codificada
    - Página /orcamentos renderiza tabela com status badges em pt-BR
    - Total exibido com formatMoney() (nunca parseFloat)
  </done>
</task>

<task type="auto">
  <name>Task 2: Formulário de criação + página de detalhe do orçamento</name>
  <files>
    apps/web/src/app/(dashboard)/orcamentos/novo/page.tsx,
    apps/web/src/app/(dashboard)/orcamentos/[id]/page.tsx
  </files>
  <read_first>
    - apps/web/src/lib/quote.service.ts (criado na Task 1)
    - apps/web/src/lib/catalog.service.ts (para buscar catálogo na criação)
    - apps/web/src/lib/whatsapp.ts (para botão de WhatsApp)
    - packages/shared-types/src/helpers/money.ts (multiplyDecimal, sumDecimal, formatMoney)
    - packages/shared-types/src/quote/quote-create.dto.ts (QuoteCreateSchema — campos e validações)
  </read_first>
  <action>
**Página /orcamentos/novo (page.tsx):**
- `'use client'`
- Campos do formulário com shadcn/ui Form + Input + Label:
  - Cliente: Select/Combobox buscando /customers (usar apiFetch)
  - Título: Input opcional
  - Data de validade: Input type="date" opcional
  - Desconto: tipo (Select PERCENT/FIXED) + valor (Input numérico string)
  - Itens do orçamento (lista dinâmica):
    - Botão "Adicionar do catálogo" → Dialog/Sheet com tabela do catálogo (fetchCatalog)
    - Botão "Adicionar manualmente" → nova linha com inputs
    - Cada linha: Descrição (Input), Qtd (Input string), Preço unit. (Input string), Total calculado (readonly)
    - Total de cada item = multiplyDecimal(qty, price) → formatMoney()
    - Botão remover item (ícone Trash2)
  - Preview de totais (Decimal.js):
    - Subtotal = sumDecimal(items.map(i => multiplyDecimal(i.qty, i.price)))
    - Total = subtotal - desconto (calculado via Decimal.js)
    - Exibir com formatMoney()
- Botão "Criar orçamento" → createQuote(dto) → redireciona para /orcamentos/:id
- CRÍTICO: quantity e unit_price enviados como strings decimais (nunca Number())

**Página /orcamentos/[id] (page.tsx):**
- `'use client'` com useParams() + useRouter()
- Busca fetchQuote(id) no mount
- Header: "Orçamento #{number} — {title || nome do cliente}", badge de status
- Tabela de itens: Descrição, Qtd, Preço unit., Total (formatMoney)
- Totais: Subtotal, Desconto, Total (em destaque, cor purple-600)
- Seção de ações por status:
  - DRAFT:
    - Botão "Enviar orçamento" → sendQuote(id) → recebe approvalUrl
    - Após envio: exibir URL copiável + botão "Compartilhar no WhatsApp" (openWhatsApp)
    - Botão "Cancelar orçamento" (Dialog confirmação → cancelQuote)
  - SENT:
    - Exibir approvalUrl (calcular de approval_token: `${NEXT_PUBLIC_WEB_URL}/approve/${approval_token}`)
    - Botão "Compartilhar no WhatsApp" → openWhatsApp(customer.phone, approvalUrl, title || `#${number}`)
    - Link "Baixar PDF" se pdf_url disponível → window.open(pdf_url)
  - APPROVED:
    - Badge verde "Aprovado", data de aprovação
    - Link "Ver OS gerada" (se houver work_order vinculado)
  - Demais: apenas exibir status
- Informações do cliente (nome, telefone)
- Data criação, data de validade
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/web build 2>&1 | grep -E "^.*error|^.*Error" | grep -v "warn" | head -10 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - Build Next.js sem erros
    - Formulário envia quantity e unit_price como strings (nunca Number())
    - Preview de totais usa multiplyDecimal e sumDecimal (nunca parseFloat)
    - Botão WhatsApp chama openWhatsApp(phone, approvalUrl, ...)
    - Link "Baixar PDF" usa pdf_url do backend
    - Todos os textos de UI em pt-BR
    - Ícones lucide-react only
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → window.open(wa.me) | Link externo abre WhatsApp; approvalUrl contém token opaco |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-28 | Tampering | preview de totais no browser | accept | Backend sempre recalcula; preview é apenas UX — dados enviados na criação são os itens, não os totais calculados |
| T-2A-29 | Information Disclosure | approvalUrl exposta no wa.me link | accept | Token UUID opaco (122 bits) sem dados sensíveis; TTL 7 dias no Redis |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/web build
grep -rn "parseFloat\|Number(" apps/web/src/lib/quote.service.ts apps/web/src/app/'(dashboard)'/orcamentos/ || echo "OK — sem float em money"
grep -rn "multiplyDecimal\|sumDecimal\|formatMoney" apps/web/src/app/'(dashboard)'/orcamentos/novo/page.tsx
grep -rn "openWhatsApp\|buildWhatsAppLink\|wa\.me" apps/web/src/app/'(dashboard)'/orcamentos/ | head -5
```
</verification>

<success_criteria>
- Build Next.js sem erros
- Formulário de criação: quantity e unit_price como strings decimais
- Preview: Decimal.js (multiplyDecimal/sumDecimal), nunca parseFloat
- Botão WhatsApp: openWhatsApp() com phone normalizado
- Link de PDF: window.open(pdf_url) quando disponível
- Status badges e todos os textos em pt-BR
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P11-SUMMARY.md`
</output>
