---
phase: "2A"
plan: "02-P10"
title: "Web — Páginas de Catálogo + Ordem de Serviço"
wave: 6
depends_on: ["02-P04", "02-P06"]
files_modified:
  - apps/web/src/app/(dashboard)/catalogo/page.tsx
  - apps/web/src/app/(dashboard)/catalogo/novo/page.tsx
  - apps/web/src/app/(dashboard)/catalogo/[id]/editar/page.tsx
  - apps/web/src/app/(dashboard)/ordens-de-servico/page.tsx
  - apps/web/src/app/(dashboard)/ordens-de-servico/[id]/page.tsx
  - apps/web/src/lib/catalog.service.ts
  - apps/web/src/lib/work-order.service.ts
autonomous: true
requirements: ["D2.1", "D2.5"]

must_haves:
  truths:
    - "Página /catalogo lista itens com tipo, preço formatado e badge ativo/inativo"
    - "Formulário de catálogo cria e edita item; preço como string decimal"
    - "Página /ordens-de-servico lista OS com status colorido, cliente e data"
    - "Detalhe da OS exibe fotos agrupadas por stage com upload via formulário"
    - "Todos os valores monetários exibidos com formatMoney() de shared-types"
    - "Loading/error/empty states com shadcn/ui Skeleton e Alert"
  artifacts:
    - path: "apps/web/src/app/(dashboard)/catalogo/page.tsx"
      provides: "Página de lista do catálogo com tabela shadcn/ui"
      contains: "CatalogoPage"
    - path: "apps/web/src/app/(dashboard)/ordens-de-servico/[id]/page.tsx"
      provides: "Detalhe da OS com fotos e mudança de status"
      contains: "WorkOrderDetailPage"
    - path: "apps/web/src/lib/catalog.service.ts"
      provides: "fetchCatalog, createCatalogItem, updateCatalogItem"
      contains: "fetchCatalog"
  key_links:
    - from: "apps/web/src/app/(dashboard)/ordens-de-servico/[id]/page.tsx"
      to: "POST /work-orders/:id/photos"
      via: "FormData upload via fetch"
      pattern: "FormData"
    - from: "apps/web/src/lib/catalog.service.ts"
      to: "GET /catalog"
      via: "apiFetch('/catalog')"
      pattern: "apiFetch.*catalog"
---

<objective>
Implementar as páginas web de Catálogo (lista + formulário) e Ordem de Serviço (lista + detalhe com upload de fotos), preenchendo os placeholders do sidebar da Fase 1.

Purpose: D2.1 (catálogo web) e D2.5 (OS web). A web é a interface de gestão — o gestor/dono de empresa acompanha OS, atualiza status e faz upload de fotos via desktop.
Output: 5 páginas Next.js com shadcn/ui; 2 services de API; tabelas com filtros básicos; upload de fotos via FormData.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- Shell web existente: sidebar com 9 itens — Catálogo e Ordens de Serviço já têm links -->
<!-- Verificar layout existente: apps/web/src/app/(dashboard)/layout.tsx -->
<!-- Verificar padrão de apiFetch: apps/web/src/lib/api.ts -->
<!-- Verificar uso de shadcn/ui existente: apps/web/src/components/ ou apps/web/src/app -->

<!-- shadcn/ui componentes disponíveis (verificar quais já instalados): -->
<!-- Table, Button, Badge, Input, Label, Select, Skeleton, Alert, Dialog, Form -->

<!-- Design system: -->
<!-- Primary: --purple-600 #6D28D9 -->
<!-- Fundo: #FFFFFF, tinta: #0A0A0F -->
<!-- Fonte: Inter -->
<!-- Ícones: lucide-react only -->
<!-- Idioma UI: pt-BR -->

<!-- formatMoney de @orcivo/shared-types — instalar decimal.js se não estiver: -->
<!-- pnpm --filter @orcivo/web add decimal.js@10.6.0 -->

<!-- Upload de foto no web: input type="file" accept="image/*" → FormData → fetch POST /work-orders/:id/photos -->
<!-- Sem presigned URL — sempre via backend proxy (decisão D2-17) -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Services + páginas de Catálogo (lista + formulário)</name>
  <files>
    apps/web/src/lib/catalog.service.ts,
    apps/web/src/app/(dashboard)/catalogo/page.tsx,
    apps/web/src/app/(dashboard)/catalogo/novo/page.tsx,
    apps/web/src/app/(dashboard)/catalogo/[id]/editar/page.tsx
  </files>
  <read_first>
    - apps/web/src/lib/api.ts (padrão apiFetch a replicar)
    - apps/web/src/app/(dashboard)/ (verificar estrutura de diretórios e layout)
    - apps/web/src/components/ ou apps/web/src/app/(dashboard)/clientes/page.tsx (se existir — padrão de tabela a seguir)
    - packages/shared-types/src/helpers/money.ts (formatMoney)
  </read_first>
  <action>
Instalar se necessário:
```bash
pnpm --filter @orcivo/web add decimal.js@10.6.0
```

**catalog.service.ts** (seguindo padrão de apiFetch):
```typescript
import { apiFetch } from './api';
import { CatalogItemCreateDto, CatalogItemUpdateDto } from '@orcivo/shared-types';

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  type: 'SERVICE' | 'PRODUCT';
  unit_price: string; // string decimal
  unit?: string;
  is_active: boolean;
}

export const catalogService = {
  fetchCatalog: (onlyActive = true) =>
    apiFetch<CatalogItem[]>(`/catalog${onlyActive ? '' : '?all=true'}`),
  createItem: (dto: CatalogItemCreateDto) =>
    apiFetch<CatalogItem>('/catalog', { method: 'POST', body: JSON.stringify(dto) }),
  updateItem: (id: string, dto: CatalogItemUpdateDto) =>
    apiFetch<CatalogItem>(`/catalog/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deactivateItem: (id: string) =>
    apiFetch<void>(`/catalog/${id}`, { method: 'DELETE' }),
};
```

**Página /catalogo (page.tsx)** — Server Component ou Client Component:
- `'use client'` (necessário para interatividade)
- Tabela shadcn/ui (Table, TableHeader, TableBody, TableRow, TableCell) com colunas:
  - Nome, Tipo (badge "Serviço"/"Produto"), Preço (formatMoney(unit_price)), Unidade, Status (badge "Ativo"/"Inativo")
  - Ações: botão editar (ícone Pencil → /catalogo/:id/editar), botão desativar (ícone Trash2 com confirmação Dialog)
- Botão "Novo item" (ícone Plus) → /catalogo/novo
- Loading: Skeleton table rows
- Empty state: Alert com texto "Nenhum item no catálogo. Adicione o primeiro item."
- Toggle "Mostrar inativos" → refetch com ?all=true

**Formulário /catalogo/novo e /catalogo/[id]/editar:**
- Ambos usam o mesmo componente de formulário (extrair CatalogItemForm)
- Campos com shadcn/ui Form + Input + Label + Select:
  - Nome (Input, required)
  - Tipo (Select: Serviço / Produto)
  - Preço unitário (Input type="text" com placeholder "0,00", stored como string decimal)
  - Unidade (Input opcional: hr, un, m²)
  - Descrição (Textarea opcional)
  - Ativo (Switch/Checkbox, padrão: true)
- Botão "Salvar" + botão "Cancelar" → volta para /catalogo
- Loading no botão durante submit
- Validação client-side: nome obrigatório, preço deve ser número positivo
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/web build 2>&1 | grep -E "error|Error" | grep -v "warn" | head -15 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - Build Next.js sem erros
    - Página /catalogo renderiza tabela com dados da API
    - formatMoney() usado para exibir unit_price (nunca parseFloat)
    - Formulário envia unit_price como string decimal (nunca Number())
    - Todos os textos de UI em pt-BR
    - Ícones lucide-react only
  </done>
</task>

<task type="auto">
  <name>Task 2: Páginas de Ordem de Serviço (lista + detalhe com fotos)</name>
  <files>
    apps/web/src/lib/work-order.service.ts,
    apps/web/src/app/(dashboard)/ordens-de-servico/page.tsx,
    apps/web/src/app/(dashboard)/ordens-de-servico/[id]/page.tsx
  </files>
  <read_first>
    - apps/web/src/lib/api.ts (padrão de apiFetch)
    - apps/web/src/app/(dashboard)/catalogo/page.tsx (padrão de página recém-criado)
    - apps/web/src/lib/catalog.service.ts (padrão de service a replicar)
  </read_first>
  <action>
**work-order.service.ts:**
```typescript
import { apiFetch } from './api';

export interface WorkOrderPhoto {
  id: string;
  photo_stage: 'BEFORE' | 'DURING' | 'AFTER';
  file_url: string;
  caption?: string;
}

export interface WorkOrder {
  id: string;
  number: number;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  customer: { id: string; name: string };
  scheduled_at?: string;
  started_at?: string;
  finished_at?: string;
  photos: WorkOrderPhoto[];
  quote?: { id: string; number: number };
}

export const workOrderService = {
  fetchAll: (page = 1) => apiFetch<{ data: WorkOrder[]; page: number }>(`/work-orders?page=${page}`),
  fetchOne: (id: string) => apiFetch<WorkOrder>(`/work-orders/${id}`),
  updateStatus: (id: string, status: string) =>
    apiFetch<WorkOrder>(`/work-orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  uploadPhoto: async (workOrderId: string, file: File, stage: string, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('stage', stage);
    if (caption) formData.append('caption', caption);
    // apiFetch com Content-Type não definido (browser define boundary automaticamente para multipart)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/work-orders/${workOrderId}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<WorkOrderPhoto>;
  },
};
```

**Página /ordens-de-servico (page.tsx):**
- `'use client'`
- Tabela com colunas: Número, Título, Cliente, Status (badge colorido), Agendamento, Ações
- Status badges:
  - PENDING: Badge variant="secondary", texto "Pendente"
  - IN_PROGRESS: Badge azul, texto "Em andamento"
  - DONE: Badge verde, texto "Concluída"
  - CANCELLED: Badge vermelho, texto "Cancelada"
- Link no número/título → /ordens-de-servico/:id
- Loading Skeleton + empty state + error Alert
- Paginação simples (botões "Anterior"/"Próxima")

**Página /ordens-de-servico/[id] (page.tsx):**
- `'use client'` com useParams()
- Header: "OS #N — Título", badge de status, nome do cliente
- Seção de ações de status:
  - PENDING: botão "Iniciar OS" → PATCH status=IN_PROGRESS
  - IN_PROGRESS: botões "Concluir" (DONE) e "Cancelar" (CANCELLED) com Dialog de confirmação
  - DONE/CANCELLED: sem ações
- Seção de fotos agrupadas por stage:
  - Tabs ou seções "Antes" / "Durante" / "Depois"
  - Grid de imagens (img tags com file_url)
  - Por stage: botão "Upload de foto" → input file (accept="image/*") → FormData upload
  - Legenda/caption opcional por foto
  - Loading durante upload
- Seção de informações: datas (agendado, início, fim), observações, vínculo com orçamento (link)
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/web build 2>&1 | grep -E "error|Error" | grep -v "warn" | head -15 || echo "BUILD OK"</automated>
  </verify>
  <done>
    - Build Next.js sem erros
    - Página /ordens-de-servico renderiza tabela com status colorido
    - Upload de foto via FormData (sem presigned URL)
    - Authorization header incluído no fetch de fotos (via credentials: 'include' ou header manual)
    - Fotos agrupadas por stage na página de detalhe
    - Todos os textos em pt-BR
    - Ícones lucide-react only
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → POST /work-orders/:id/photos | Upload de arquivo via FormData; JWT via cookie httpOnly |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-26 | Tampering | input file type no browser | mitigate | accept="image/*" no input limita seleção; backend valida mimetype real independentemente |
| T-2A-27 | Information Disclosure | Authorization header no fetch manual | mitigate | Usar credentials:'include' + cookie httpOnly; não expor JWT ao JavaScript do browser |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/web build
grep -rn "parseFloat\|Number(" apps/web/src/lib/catalog.service.ts apps/web/src/app/'(dashboard)'/catalogo/ || echo "OK — sem float em money"
grep -rn "formatMoney\|Decimal" apps/web/src/app/'(dashboard)'/catalogo/page.tsx
grep -rn "pt-BR\|Pendente\|Concluída\|Cancelada" apps/web/src/app/'(dashboard)'/ordens-de-servico/ | head -5
```
</verification>

<success_criteria>
- `pnpm --filter @orcivo/web build` sem erros
- unit_price exibido com formatMoney() (nunca parseFloat)
- Upload de foto web via FormData (proxy do backend, não presigned URL)
- Status badges coloridos em pt-BR nas duas tabelas
- Loading/empty/error states com shadcn/ui Skeleton e Alert
- Ícones apenas lucide-react (sem emoji)
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P10-SUMMARY.md`
</output>
