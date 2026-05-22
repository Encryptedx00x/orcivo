---
phase: "2A"
plan: "02-P08"
title: "Mobile — Telas de Catálogo + Ordem de Serviço (com upload de fotos)"
wave: 5
depends_on: ["02-P04", "02-P06"]
files_modified:
  - apps/mobile/src/screens/CatalogScreen.tsx
  - apps/mobile/src/screens/CatalogItemFormScreen.tsx
  - apps/mobile/src/screens/WorkOrderListScreen.tsx
  - apps/mobile/src/screens/WorkOrderDetailScreen.tsx
  - apps/mobile/src/screens/WorkOrderPhotoScreen.tsx
  - apps/mobile/src/services/catalog.service.ts
  - apps/mobile/src/services/work-order.service.ts
autonomous: true
requirements: ["D2.1", "D2.5"]

must_haves:
  truths:
    - "CatalogScreen lista itens ativos da empresa com nome, tipo (Serviço/Produto) e preço formatado"
    - "CatalogItemFormScreen permite criar e editar item; preço exibido como string decimal"
    - "WorkOrderListScreen lista OS com status colorido e cliente"
    - "WorkOrderDetailScreen mostra OS com fotos agrupadas por stage (BEFORE/DURING/AFTER)"
    - "WorkOrderPhotoScreen permite tirar/selecionar foto via expo-image-picker e enviar ao backend"
    - "Preços exibidos com formatMoney() de shared-types (nunca parseFloat)"
    - "Loading/error/empty states em todas as telas"
    - "Todas as chamadas de API incluem header X-Client-Request-Id (D2-33 RequestIdempotency)"
  artifacts:
    - path: "apps/mobile/src/screens/CatalogScreen.tsx"
      provides: "Lista de itens do catálogo com FlatList"
      contains: "CatalogScreen"
    - path: "apps/mobile/src/screens/WorkOrderDetailScreen.tsx"
      provides: "Detalhe de OS com fotos por stage e botão de mudança de status"
      contains: "WorkOrderDetailScreen"
    - path: "apps/mobile/src/services/catalog.service.ts"
      provides: "fetchCatalog, createCatalogItem, updateCatalogItem"
      contains: "fetchCatalog"
  key_links:
    - from: "apps/mobile/src/screens/WorkOrderPhotoScreen.tsx"
      to: "POST /work-orders/:id/photos"
      via: "FormData multipart upload"
      pattern: "multipart/form-data"
    - from: "apps/mobile/src/screens/CatalogScreen.tsx"
      to: "apps/mobile/src/services/catalog.service.ts"
      via: "fetchCatalog()"
      pattern: "fetchCatalog"
---

<objective>
Implementar as telas mobile de Catálogo (lista + formulário) e Ordem de Serviço (lista + detalhe + upload de fotos), preenchendo os placeholders do shell da Fase 1.

Purpose: D2.1 (catálogo mobile) e D2.5 (OS mobile). O catálogo é usado pelo técnico ao montar orçamentos. As fotos da OS são a documentação do serviço prestado — críticas para o técnico.
Output: 5 telas mobile funcionais; 2 services de API; integração com expo-image-picker para upload; X-Client-Request-Id em todas as mutations.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@docs/ARCHITECTURE-MOLD.md
@.planning/phases/02-mvp-funcional/02-RESEARCH.md

<interfaces>
<!-- Shell mobile existente: 5 bottom tabs — "Mais" inclui Catálogo e OS como placeholders -->
<!-- Verificar paths exatos das telas placeholder: -->
<!-- apps/mobile/src/screens/ — listar antes de criar para não duplicar -->
<!-- apps/mobile/src/navigation/ — verificar navegação existente -->

<!-- Padrão de API service existente (replicar): -->
<!-- IMPORTANTE: verificar AMBOS os caminhos antes de criar services: -->
<!-- apps/mobile/src/services/api.ts — pode conter axios instance com interceptors JWT -->
<!-- apps/mobile/src/core/api.ts — pode conter axios instance alternativa -->
<!-- D2-33 RequireIdempotency: toda mutation (POST/PATCH/DELETE) DEVE incluir header X-Client-Request-Id -->
<!-- Se o arquivo api.ts já tiver interceptor adicionando X-Client-Request-Id → documentar e reutilizar -->
<!-- Se NÃO tiver → adicionar o interceptor ao arquivo api.ts antes de criar os services -->
<!-- Verificar import de formatMoney de @orcivo/shared-types -->

<!-- Design system: purple-600 #6D28D9, Inter, Lucide icons only, pt-BR -->
<!-- Status colors para OS: PENDING=gray, IN_PROGRESS=blue, DONE=green, CANCELLED=red -->

<!-- expo-image-picker instalação: pnpm --filter @orcivo/mobile add expo-image-picker@56.0.12 -->
<!-- expo-file-system: pnpm --filter @orcivo/mobile add expo-file-system@56.0.7 -->
<!-- decimal.js: pnpm --filter @orcivo/mobile add decimal.js@10.6.0 -->

<!-- Upload de foto: FormData + fetch/axios para POST /work-orders/:id/photos -->
<!-- Body: stage (BEFORE|DURING|AFTER), file (multipart), caption? (opcional) -->
<!-- Pedir permissão de câmera/galeria antes de usar image picker -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Services de API (catalog + work-order) + CatalogScreen + CatalogItemFormScreen</name>
  <files>
    apps/mobile/src/services/catalog.service.ts,
    apps/mobile/src/screens/CatalogScreen.tsx,
    apps/mobile/src/screens/CatalogItemFormScreen.tsx
  </files>
  <read_first>
    - apps/mobile/src/services/api.ts (verificar se existe e se tem interceptor X-Client-Request-Id)
    - apps/mobile/src/core/api.ts (verificar se existe — caminho alternativo do interceptor)
    - apps/mobile/src/screens/ (listar arquivos existentes antes de criar — não sobrescrever)
    - apps/mobile/src/navigation/ (verificar rotas existentes para Catálogo)
    - packages/shared-types/src/helpers/money.ts (formatMoney — usar para exibir preços)

    AÇÃO OBRIGATÓRIA sobre X-Client-Request-Id (D2-33):
    1. Ler apps/mobile/src/services/api.ts OU apps/mobile/src/core/api.ts (whichever exists)
    2. Verificar se o interceptor de request já adiciona 'X-Client-Request-Id'
    3. SE NÃO adiciona → adicionar interceptor ao arquivo api.ts:
       ```typescript
       import { randomUUID } from 'crypto'; // ou uuid lib
       api.interceptors.request.use(config => {
         config.headers['X-Client-Request-Id'] = randomUUID();
         return config;
       });
       ```
    4. SE JÁ adiciona → apenas documentar em comentário no service file criado
  </read_first>
  <action>
Instalar dependências:
```bash
pnpm --filter @orcivo/mobile add decimal.js@10.6.0 expo-image-picker@56.0.12 expo-file-system@56.0.7
```

**catalog.service.ts** (seguindo padrão do service existente):
```typescript
import api from './api';
import { CatalogItemCreateDto, CatalogItemUpdateDto } from '@orcivo/shared-types';

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  type: 'SERVICE' | 'PRODUCT';
  unit_price: string; // string decimal — nunca number
  unit?: string;
  is_active: boolean;
}

export const catalogService = {
  async fetchCatalog(onlyActive = true): Promise<CatalogItem[]> {
    const { data } = await api.get('/catalog', { params: onlyActive ? {} : { all: 'true' } });
    return data;
  },
  async createItem(dto: CatalogItemCreateDto): Promise<CatalogItem> {
    const { data } = await api.post('/catalog', dto);
    return data;
  },
  async updateItem(id: string, dto: CatalogItemUpdateDto): Promise<CatalogItem> {
    const { data } = await api.patch(`/catalog/${id}`, dto);
    return data;
  },
  async deactivateItem(id: string): Promise<void> {
    await api.delete(`/catalog/${id}`);
  },
};
```

**CatalogScreen.tsx** — lista de itens:
- FlatList com pull-to-refresh (onRefresh)
- Cada item: nome (bold), badge "Serviço"/"Produto" com cores distintas, preço formatado com formatMoney()
- Botão FAB (+) para navegar para CatalogItemFormScreen
- Empty state: texto "Nenhum item no catálogo ainda" + botão "Adicionar item"
- Loading state: ActivityIndicator
- Error state: texto de erro + botão "Tentar novamente"
- Usar cores do design system: purple-600 #6D28D9 para FAB e badges de destaque
- Ícones Lucide: Package (produto), Wrench (serviço), Plus (FAB)
- Todos os textos em pt-BR

**CatalogItemFormScreen.tsx** — formulário criar/editar:
- Campos: Nome (TextInput, required), Tipo (Picker/SegmentedControl SERVICE/PRODUTO), Preço (TextInput numeric, required), Unidade (TextInput opcional: "hr", "un", "m²"), Descrição (TextInput multiline, opcional)
- Preço: valor digitado como string, validado como decimal antes de enviar
- Submit: chama catalogService.createItem ou updateItem dependendo de se há `item` nos params
- Erro de validação inline (campo obrigatório vazio)
- Loading state no botão de submit (disable durante request)
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/mobile typecheck 2>&1 | grep -E "error TS" | head -10 || echo "TYPECHECK OK"</automated>
  </verify>
  <done>
    - catalog.service.ts compila sem erros TypeScript
    - CatalogScreen e CatalogItemFormScreen compilam sem erros
    - Nenhum uso de parseFloat ou Number() em campos de preço — usar formatMoney de shared-types
    - Todos os textos de UI em pt-BR
    - Ícones Lucide only (sem emoji)
    - apps/mobile/src/services/api.ts (ou core/api.ts) CONTÉM 'X-Client-Request-Id' no interceptor
  </done>
</task>

<task type="auto">
  <name>Task 2: WorkOrder screens — lista, detalhe, upload de fotos</name>
  <files>
    apps/mobile/src/services/work-order.service.ts,
    apps/mobile/src/screens/WorkOrderListScreen.tsx,
    apps/mobile/src/screens/WorkOrderDetailScreen.tsx,
    apps/mobile/src/screens/WorkOrderPhotoScreen.tsx
  </files>
  <read_first>
    - apps/mobile/src/services/api.ts (padrão de service — confirmar que X-Client-Request-Id está no interceptor)
    - apps/mobile/src/screens/ (verificar telas existentes)
    - .planning/phases/02-mvp-funcional/02-RESEARCH.md §"Pattern 7: Canvas de assinatura mobile → PNG → MinIO" (padrão de upload multipart)
    - apps/mobile/src/navigation/ (rotas existentes)
  </read_first>
  <action>
**work-order.service.ts:**
```typescript
import api from './api';
import * as FileSystem from 'expo-file-system';

export interface WorkOrder {
  id: string;
  number: number;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  customer: { id: string; name: string };
  scheduled_at?: string;
  photos: WorkOrderPhoto[];
}

export interface WorkOrderPhoto {
  id: string;
  photo_stage: 'BEFORE' | 'DURING' | 'AFTER';
  file_url: string;
  caption?: string;
}

export const workOrderService = {
  async fetchAll(page = 1): Promise<{ data: WorkOrder[]; page: number }> {
    const { data } = await api.get('/work-orders', { params: { page } });
    return data;
  },
  async fetchOne(id: string): Promise<WorkOrder> {
    const { data } = await api.get(`/work-orders/${id}`);
    return data;
  },
  async updateStatus(id: string, status: string): Promise<WorkOrder> {
    const { data } = await api.patch(`/work-orders/${id}`, { status });
    return data;
  },
  async uploadPhoto(workOrderId: string, fileUri: string, stage: string, caption?: string): Promise<WorkOrderPhoto> {
    // Ler arquivo como base64 via expo-file-system
    const mimeType = fileUri.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: `photo.${mimeType.split('/')[1]}`,
    } as never);
    formData.append('stage', stage);
    if (caption) formData.append('caption', caption);

    // Usar a instância api (que já inclui X-Client-Request-Id via interceptor)
    const { data } = await api.post(`/work-orders/${workOrderId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
```

**WorkOrderListScreen.tsx:**
- FlatList com pull-to-refresh
- Cada item: número (#N), título, nome do cliente, badge de status colorido
  - PENDING: cinza, texto "Pendente"
  - IN_PROGRESS: azul #2563EB, texto "Em andamento"
  - DONE: verde #16A34A, texto "Concluída"
  - CANCELLED: vermelho #DC2626, texto "Cancelada"
- Toque navega para WorkOrderDetailScreen
- Loading/empty/error states
- Ícones Lucide: ClipboardList, Clock, CheckCircle

**WorkOrderDetailScreen.tsx:**
- Header com: número, título, status badge, cliente
- Botão de mudança de status contextual:
  - PENDING: botão "Iniciar OS" → IN_PROGRESS
  - IN_PROGRESS: botões "Concluir" → DONE | "Cancelar" → CANCELLED
  - DONE/CANCELLED: sem botão de ação
- Seção de fotos agrupada por stage:
  - "Antes" (BEFORE), "Durante" (DURING), "Depois" (AFTER)
  - Grid de thumbnails por stage
  - Botão "Adicionar foto" em cada stage → navega para WorkOrderPhotoScreen com stage pré-selecionado
- Loading state geral

**WorkOrderPhotoScreen.tsx:**
- Picker de stage (BEFORE/DURING/AFTER) se não pré-selecionado
- Dois botões: "Câmera" | "Galeria"
- Pede permissão via ImagePicker.requestCameraPermissionsAsync() / requestMediaLibraryPermissionsAsync()
- Após seleção: preview da imagem + campo caption (opcional) + botão "Enviar foto"
- Loading durante upload
- Sucesso: volta para WorkOrderDetailScreen e atualiza lista de fotos
  </action>
  <verify>
    <automated>cd /c/Users/Encryptedx/Desktop/orcivo && pnpm --filter @orcivo/mobile typecheck 2>&1 | grep -E "error TS" | head -10 || echo "TYPECHECK OK"</automated>
  </verify>
  <done>
    - Todos os arquivos compilam sem erros TypeScript
    - work-order.service.ts usa instância api (com interceptor) para upload — não fetch direto com credentials:'include'
    - WorkOrderListScreen mostra badges de status coloridos em pt-BR
    - WorkOrderPhotoScreen pede permissão antes de abrir câmera/galeria
    - Textos UI todos em pt-BR ("Iniciar OS", "Concluir", "Cancelada", etc.)
    - Ícones Lucide only
    - apps/mobile/src/services/api.ts (ou core/api.ts) CONTÉM 'X-Client-Request-Id' no interceptor de request
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| mobile → POST /work-orders/:id/photos | Upload multipart; JWT no header; arquivo validado no backend |
| mobile → todas as mutations | X-Client-Request-Id obrigatório para idempotência (D2-33) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-2A-22 | Information Disclosure | FileSystem.readAsStringAsync | accept | Leitura de arquivo local do device do usuário; sem acesso a arquivos de outros apps (sandbox iOS/Android) |
| T-2A-23 | Tampering | stage inválido enviado do mobile | mitigate | Backend valida stage como BEFORE|DURING|AFTER no controller (P06); mobile também valida antes de enviar |
</threat_model>

<verification>
```bash
cd /c/Users/Encryptedx/Desktop/orcivo
pnpm --filter @orcivo/mobile typecheck
grep -rn "parseFloat\|Number(" apps/mobile/src/screens/Catalog* || echo "OK — sem float em money"
grep -rn "formatMoney\|Decimal" apps/mobile/src/screens/Catalog*
grep -rn "X-Client-Request-Id" apps/mobile/src/services/api.ts apps/mobile/src/core/api.ts 2>/dev/null || echo "MISSING — adicionar interceptor"
grep -rn "pt-BR\|pt_BR" apps/mobile/src/screens/ | head -5 || grep -rn "Serviço\|Produto\|Cancelar\|Concluir" apps/mobile/src/screens/ | head -5
```
</verification>

<success_criteria>
- typecheck sem erros TypeScript
- CatalogScreen exibe preços com formatMoney() (nunca parseFloat)
- WorkOrderPhotoScreen pede permissão antes de abrir câmera/galeria
- Upload de foto funciona via FormData para POST /work-orders/:id/photos
- Todas as strings de UI em pt-BR
- Ícones apenas Lucide (sem emoji, sem custom icons)
- Loading/error/empty states em todas as 5 telas
- apps/mobile/src/services/api.ts (ou core/api.ts) contém 'X-Client-Request-Id' no interceptor de request
</success_criteria>

<output>
Após conclusão, criar `.planning/phases/02-mvp-funcional/2A-P08-SUMMARY.md`
</output>
