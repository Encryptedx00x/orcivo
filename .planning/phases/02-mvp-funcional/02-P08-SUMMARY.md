---
phase: "2A"
plan: "02-P08"
title: "Mobile — Telas de Catálogo + Ordem de Serviço (com upload de fotos)"
status: completed
completed_date: "2026-05-23"
duration_minutes: 30
tasks_completed: 2
tasks_total: 2
files_created:
  - apps/mobile/src/services/catalog.service.ts
  - apps/mobile/src/services/work-order.service.ts
  - apps/mobile/src/screens/CatalogScreen.tsx
  - apps/mobile/src/screens/CatalogItemFormScreen.tsx
  - apps/mobile/src/screens/WorkOrderListScreen.tsx
  - apps/mobile/src/screens/WorkOrderDetailScreen.tsx
  - apps/mobile/src/screens/WorkOrderPhotoScreen.tsx
files_modified:
  - apps/mobile/src/services/api.ts
  - apps/mobile/src/navigation/MaisStack.tsx
  - apps/mobile/package.json
  - apps/mobile/tsconfig.json
  - pnpm-lock.yaml
key_decisions:
  - "api.ts centraliza X-Client-Request-Id em todos os métodos mutantes (post, patch, delete, postFormData)"
  - "postFormData omite Content-Type header para fetch definir boundary correto no multipart"
  - "stage validado no mobile (BEFORE|DURING|AFTER) antes de enviar upload — defense in depth (T-2A-23)"
  - "formatMoney de @orcivo/shared-types usado em todo display de preço — nunca parseFloat"
  - "moduleResolution: node (em vez de bundler) no tsconfig mobile para compatibilidade TypeScript"
dependency_graph:
  requires: ["02-P04 (GET /catalog)", "02-P06 (GET|POST /work-orders, POST /photos)"]
  provides: ["CatalogScreen", "CatalogItemFormScreen", "WorkOrderListScreen", "WorkOrderDetailScreen", "WorkOrderPhotoScreen"]
  affects: ["02-P09 (web catalog screens)", "02-P10 (web OS screens)"]
tech_stack:
  added:
    - "expo-image-picker@56.0.12 — câmera e galeria com permissões"
    - "expo-file-system@56.0.7 — sistema de arquivos para uploads"
    - "decimal.js@10.6.0 (mobile) — formatMoney via Decimal.js"
    - "@orcivo/shared-types workspace:* — adicionado como dependência explícita de mobile"
  patterns:
    - "FlatList + onRefresh para listas com pull-to-refresh"
    - "FormData multipart upload via api.postFormData"
    - "expo-image-picker com requestCameraPermissionsAsync / requestMediaLibraryPermissionsAsync"
    - "Loading/error/empty states em todas as telas"
metrics:
  duration: "~30 min"
  completed_date: "2026-05-23"
  tasks_completed: 2
  files_changed: 12
---

# Phase 2A Plan 08: Mobile — Catálogo + Ordem de Serviço — Summary

**One-liner:** 5 telas mobile funcionais (catálogo CRUD, OS lista/detalhe/fotos) com upload multipart via expo-image-picker, formatMoney para preços e X-Client-Request-Id em todas as mutations.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Services de API + CatalogScreen + CatalogItemFormScreen | 86824b1 | catalog.service.ts, CatalogScreen.tsx, CatalogItemFormScreen.tsx, api.ts, package.json, tsconfig.json |
| 2 | WorkOrder screens — lista, detalhe, upload de fotos | 36f58c6 | work-order.service.ts, WorkOrderListScreen.tsx, WorkOrderDetailScreen.tsx, WorkOrderPhotoScreen.tsx, MaisStack.tsx |

## Deliverables

### CatalogScreen
- FlatList com pull-to-refresh
- Cada item: nome, badge "Serviço"/"Produto" com cores distintas, preço via `formatMoney()`
- FAB (+) para criar novo item
- Empty/loading/error states

### CatalogItemFormScreen
- Campos: Nome, Tipo (segmented SERVICE/PRODUCT), Preço (decimal string), Unidade, Descrição
- Validação inline (nome obrigatório, preço com regex `/^\d+(\.\d{1,2})?$/`)
- Cria ou edita dependendo de `route.params.item`

### WorkOrderListScreen
- FlatList com pull-to-refresh
- Badge de status colorido: PENDING=cinza, IN_PROGRESS=azul, DONE=verde, CANCELLED=vermelho
- Textos pt-BR: "Pendente", "Em andamento", "Concluída", "Cancelada"

### WorkOrderDetailScreen
- Header: número, título, status badge, cliente
- Ações contextuais: "Iniciar OS" (PENDING→IN_PROGRESS), "Concluir"/"Cancelar" (IN_PROGRESS→DONE|CANCELLED)
- Fotos agrupadas por etapa: Antes / Durante / Depois
- Botão "Adicionar foto" por etapa → navega para WorkOrderPhotoScreen com stage pré-selecionado

### WorkOrderPhotoScreen
- Picker de etapa (Antes/Durante/Depois) — pré-selecionado se vindo de WorkOrderDetailScreen
- Botões "Câmera" e "Galeria" com solicitação de permissão antes de abrir
- Preview da foto selecionada
- Campo de legenda opcional
- Upload via FormData multipart para POST /work-orders/:id/photos
- Volta para WorkOrderDetailScreen após sucesso

### api.ts
- `patch<T>` — com X-Client-Request-Id
- `delete<T>` — com X-Client-Request-Id (204 retorna undefined)
- `postFormData<T>` — sem Content-Type (boundary automático), com X-Client-Request-Id

### MaisStack.tsx
- Rotas reais para Catálogo e Ordens de Serviço (substituindo placeholders "Em breve")

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @orcivo/shared-types não estava em mobile/package.json**
- **Found during:** Task 1 — typecheck falhou com `Cannot find module '@orcivo/shared-types'`
- **Issue:** Pre-existing — auth screens (SignupStep1/Step2) e ClienteCreateScreen já importavam shared-types mas a dependência não estava declarada em `apps/mobile/package.json`
- **Fix:** Adicionado `"@orcivo/shared-types": "workspace:*"` em mobile/package.json; `pnpm install` criou o symlink
- **Files modified:** apps/mobile/package.json, pnpm-lock.yaml

**2. [Rule 3 - Blocking] tsconfig.json: moduleResolution bundler sem module ESNext**
- **Found during:** Task 1 — `error TS5095: Option 'bundler' can only be used when 'module' is set to 'preserve' or to 'es2015' or later`
- **Issue:** Pre-existing — tsconfig.base.json define `module: commonjs` mas mobile/tsconfig.json sobrescreve `moduleResolution: bundler` sem sobrescrever `module`
- **Fix:** Alterado `moduleResolution` de `bundler` para `node` em mobile/tsconfig.json (compatível com React Native e Expo)
- **Files modified:** apps/mobile/tsconfig.json

**3. [Rule 3 - Blocking] api.ts não tinha métodos patch/delete/postFormData**
- **Found during:** Task 1 — catalog.service.ts precisava de patch e delete; Task 2 precisava de postFormData para upload multipart
- **Fix:** Adicionados os 3 métodos ao api.ts, todos com X-Client-Request-Id (cumprindo D2-33)
- **Files modified:** apps/mobile/src/services/api.ts

## Known Stubs

Nenhum stub — telas consomem APIs reais dos backends (P04 e P06). Dados de catálogo e OS são reais.

## Pre-existing Issues (out of scope)

Os seguintes erros TypeScript existiam antes deste plano e não são causados por ele:

| Erro | Arquivo | Origem |
|------|---------|--------|
| TS2786 `'X' cannot be used as a JSX component` | AppTabs, AuthStack, RootNavigator, EmBreveScreen, telas novas | lucide-react-native + @types/react@18.2.x incompatibilidade de JSX types |
| TS6133 unused imports | SignupStep2Screen, ClienteCreateScreen | P01/P03 mobile shell |
| TS2580 `process` não tipado | api.ts (linha 4), SignupStep2Screen | @types/node ausente |

Estes erros são rastreados para fix em plano separado de health check do mobile.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-2A-23 mitigated | work-order.service.ts | VALID_STAGES check no cliente antes de enviar upload (defense in depth — backend valida também via P06) |

## Self-Check: PASSED

- apps/mobile/src/services/catalog.service.ts: FOUND
- apps/mobile/src/services/work-order.service.ts: FOUND
- apps/mobile/src/screens/CatalogScreen.tsx: FOUND (formatMoney em linha 66)
- apps/mobile/src/screens/CatalogItemFormScreen.tsx: FOUND
- apps/mobile/src/screens/WorkOrderListScreen.tsx: FOUND
- apps/mobile/src/screens/WorkOrderDetailScreen.tsx: FOUND
- apps/mobile/src/screens/WorkOrderPhotoScreen.tsx: FOUND (requestCameraPermissionsAsync + requestMediaLibraryPermissionsAsync)
- apps/mobile/src/services/api.ts: X-Client-Request-Id em POST (linha 25), postFormData (linha 43), PATCH (linha 60), DELETE (linha 75)
- Commit 86824b1: FOUND
- Commit 36f58c6: FOUND
- Sem parseFloat em campos de preço: CONFIRMED (grep OK)
