---
phase: 01-vertical-slice
plan: 05
type: execute
wave: 5
depends_on: [04]
files_modified:
  - apps/mobile/App.tsx
  - apps/mobile/src/navigation/RootNavigator.tsx
  - apps/mobile/src/navigation/AuthStack.tsx
  - apps/mobile/src/navigation/AppTabs.tsx
  - apps/mobile/src/navigation/MaisStack.tsx
  - apps/mobile/src/contexts/AuthContext.tsx
  - apps/mobile/src/services/api.ts
  - apps/mobile/src/screens/auth/LoginScreen.tsx
  - apps/mobile/src/screens/auth/SignupStep1Screen.tsx
  - apps/mobile/src/screens/auth/SignupStep2Screen.tsx
  - apps/mobile/src/screens/clientes/ClientesScreen.tsx
  - apps/mobile/src/screens/clientes/ClienteCreateScreen.tsx
  - apps/mobile/src/screens/placeholders/EmBreveScreen.tsx
  - apps/mobile/src/screens/inicio/InicioScreen.tsx
  - apps/mobile/src/__tests__/auth-screens.spec.tsx
  - apps/mobile/jest.config.ts
  - apps/mobile/package.json
autonomous: false
requirements: [CUSTOMER-02, NAV-01, AUTH-01, AUTH-02]
must_haves:
  truths:
    - "App mobile tem 5 bottom tabs: Início, Clientes, Orçamentos, Agenda, Mais"
    - "Tab 'Mais' abre stack com os 9 itens secundários (D-07)"
    - "Usuário faz signup em 2 etapas e entra no app no contexto da empresa"
    - "Usuário faz login, lista e cria clientes (consumindo a API)"
    - "Telas não-funcionais mostram 'Em breve' (placeholder)"
  artifacts:
    - path: "apps/mobile/src/navigation/AppTabs.tsx"
      provides: "Bottom tabs com 5 itens e ícones Lucide"
      contains: "createBottomTabNavigator"
    - path: "apps/mobile/src/contexts/AuthContext.tsx"
      provides: "Estado de auth, login(), logout(), token via SecureStore"
    - path: "apps/mobile/src/services/api.ts"
      provides: "fetch wrapper com Bearer + X-Client-Request-Id"
      contains: "X-Client-Request-Id"
  key_links:
    - from: "apps/mobile/src/navigation/RootNavigator.tsx"
      to: "AuthContext"
      via: "isAuthenticated escolhe AuthStack ou AppTabs"
      pattern: "isAuthenticated"
    - from: "apps/mobile/src/screens/clientes/ClientesScreen.tsx"
      to: "/customers"
      via: "api.get"
      pattern: "customers"
---

<objective>
Construir o shell de navegação mobile completo (5 tabs + stack "Mais" com 9 itens) e tornar funcionais somente as telas de Auth (login + signup 2 etapas) e Customer (listar + criar), consumindo a API NestJS. Demais telas = placeholder "Em breve". Segue fielmente o design handoff mobile.

Purpose: Estabelece o molde de navegação que a Fase 2 só vai preencher (não recriar). Prova o consumo da API multi-tenant pelo mobile.
Output: App mobile navegável com auth e clientes funcionais; checkpoint de verificação em device.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-vertical-slice/01-RESEARCH.md
@.planning/phases/01-vertical-slice/01-PATTERNS.md
@CLAUDE.md
@docs/design-handoff/orcivo-design-system/ui_kits/mobile/README.md
@docs/FRONTEND_DESIGN_MASTER.md

<interfaces>
```typescript
import { SignupStep1Dto, SignupStep2Dto, LoginDto, LoginResponseDto,
         CustomerCreateDto, CustomerDto } from '@orcivo/shared-types';
```
<!-- Endpoints: POST /auth/signup/user, POST /auth/signup/company, POST /auth/login,
     POST /auth/logout, GET /customers, POST /customers -->
<!-- Padrões completos: PATTERNS.md Grupo 10 (linhas 451-576) — RootNavigator, AppTabs, api.ts -->
<!-- App.tsx atual: cores Orcivo (#6D28D9, #FFFFFF, #6B7280, #E5E7EB), EXPO_PUBLIC_API_URL -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Navegação shell + AuthContext + api service</name>
  <read_first>
    - apps/mobile/App.tsx (cores/tokens estabelecidos — preservar paleta)
    - apps/mobile/package.json (deps atuais)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 10 linhas 451-576)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (Pattern 3 linhas 393-416, Pattern 5 linhas 446-468, Pitfall 3-4 linhas 842-857)
    - docs/design-handoff/orcivo-design-system/ui_kits/mobile/README.md
  </read_first>
  <behavior>
    - RootNavigator mostra SplashScreen enquanto AuthContext.isLoading; depois AuthStack (não auth) ou AppTabs (auth)
    - AppTabs tem exatamente 5 tabs com ícones Lucide (Home, Users, FileText, Calendar, MoreHorizontal)
    - MaisStack lista os 9 itens de D-07 (Ordens de Serviço, Catálogo, Financeiro, Documentos, Conta, Configurações, Usuários e permissões, Plano e assinatura, Ajuda)
    - api.ts: get() e post(); post envia X-Client-Request-Id (UUID) e Bearer do SecureStore
  </behavior>
  <action>
    1. Instalar deps mobile: `cd apps/mobile && pnpm add @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated expo-secure-store expo-crypto lucide-react-native`. Versões: ver RESEARCH.md linhas 113-124.
    2. Criar `src/services/api.ts` — copiar PATTERNS.md Grupo 10 (linhas 543-575): get/post com SecureStore + X-Client-Request-Id (expo-crypto randomUUID) + Bearer. EXPO_PUBLIC_API_URL.
    3. Criar `src/contexts/AuthContext.tsx`: estado { isAuthenticated, isLoading, user, company }; `login(email, password)` chama POST /auth/login, grava access_token + refresh_token no SecureStore, seta user/company; `logout()` chama POST /auth/logout e limpa SecureStore; ao montar lê SecureStore (isLoading true→false).
    4. Criar `src/navigation/RootNavigator.tsx` — copiar PATTERNS.md Grupo 10 (linhas 466-493): enableScreens(), NavigationContainer, escolhe AppTabs/AuthStack por isAuthenticated; SplashScreen enquanto isLoading.
    5. Criar `src/navigation/AppTabs.tsx` — copiar PATTERNS.md Grupo 10 (linhas 511-539): 5 tabs (Início, Clientes, Orçamentos→EmBreve, Agenda→EmBreve, Mais→MaisStack), tabBarActiveTintColor #6D28D9. Ícones Lucide.
    6. Criar `src/navigation/MaisStack.tsx`: native stack listando os 9 itens de D-07; cada item não-funcional aponta para EmBreveScreen.
    7. Criar `src/navigation/AuthStack.tsx`: native stack com LoginScreen, SignupStep1Screen, SignupStep2Screen.
    8. Substituir `App.tsx` — copiar PATTERNS.md Grupo 10 (linhas 497-508): apenas <AuthProvider><RootNavigator/></AuthProvider>.
  </action>
  <verify>
    <automated>cd apps/mobile && pnpm exec tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `cd apps/mobile && pnpm exec tsc --noEmit` sem erro de tipo
    - grep `createBottomTabNavigator` em src/navigation/AppTabs.tsx
    - grep conta exatamente 5 ocorrências de `Tab.Screen` em AppTabs.tsx
    - grep `lucide-react-native` em AppTabs.tsx; grep emoji unicode NÃO presente
    - grep `X-Client-Request-Id` em src/services/api.ts
    - grep `enableScreens` em src/navigation/RootNavigator.tsx
    - grep `isAuthenticated` em RootNavigator.tsx
  </acceptance_criteria>
  <done>Shell de navegação completo (5 tabs + 9 itens "Mais"); AuthContext e api.ts prontos; tsc verde.</done>
</task>

<task type="auto">
  <name>Task 2: Telas funcionais de Auth e Customer + placeholder + teste</name>
  <read_first>
    - apps/mobile/App.tsx (paleta de cores estabelecida)
    - .planning/phases/01-vertical-slice/01-CONTEXT.md (D-02 campos signup step1, D-03 step2, D-14 campos customer)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Shared Patterns: tokens de design linhas 773-787, idioma pt-BR linhas 789-797)
    - docs/FRONTEND_DESIGN_MASTER.md (§4 mobile screen specs)
  </read_first>
  <behavior>
    - SignupStep1Screen: campos nome, e-mail, telefone, senha, aceitar termos (D-02); valida com SignupStep1Schema antes de enviar; sucesso navega para SignupStep2
    - SignupStep2Screen: campos da empresa (D-03); ao criar, usuário entra no app (AppTabs) no contexto da empresa (D-04)
    - LoginScreen: e-mail + senha; sucesso entra no app
    - ClientesScreen: GET /customers, lista por nome; botão para criar
    - ClienteCreateScreen: campos de D-14; POST /customers; volta para lista
    - EmBreveScreen: texto "Em breve" com paleta Orcivo
    - Labels e mensagens em pt-BR; nomes de plano corretos (Orcivo Livre etc.)
  </behavior>
  <action>
    1. Criar `src/screens/placeholders/EmBreveScreen.tsx`: tela centralizada "Em breve", cores Orcivo (#6D28D9 / #6B7280), ícone Lucide.
    2. Criar `src/screens/inicio/InicioScreen.tsx`: tela de boas-vindas simples (pode exibir nome da empresa de AuthContext).
    3. Criar `src/screens/auth/SignupStep1Screen.tsx`: form com campos D-02 (nome, e-mail, telefone opcional, senha, checkbox aceitar termos). Valida com `SignupStep1Schema.safeParse`; em erro mostra mensagens pt-BR. POST /auth/signup/user; sucesso → navega SignupStep2 passando o token/userId.
    4. Criar `src/screens/auth/SignupStep2Screen.tsx`: form com campos D-03 (nome_fantasia obrigatório, tipo_documento CPF/CNPJ, documento, telefone, cidade, uf, cor_da_marca, chave_pix — logo opcional pode ser deixado como TODO de upload). POST /auth/signup/company; em sucesso grava tokens via AuthContext → entra no app (D-04). Mencionar plano "Orcivo Livre" se exibir plano (nunca FREE/PRO).
    5. Criar `src/screens/auth/LoginScreen.tsx`: e-mail + senha, link para signup; chama AuthContext.login.
    6. Criar `src/screens/clientes/ClientesScreen.tsx`: `api.get('/customers')`, FlatList por nome, FAB/botão "Novo cliente" → ClienteCreateScreen. Estado vazio com mensagem pt-BR.
    7. Criar `src/screens/clientes/ClienteCreateScreen.tsx`: form com campos D-14 (name obrigatório; type PF/PJ, tax_id, phone, email, city, state, notes opcionais). Valida com CustomerCreateSchema; `api.post('/customers', dto)`; sucesso → volta para lista.
    8. Configurar `jest.config.ts` (jest-expo preset + @testing-library/react-native) e instalar devDeps; criar `src/__tests__/auth-screens.spec.tsx`: renderiza LoginScreen, SignupStep1Screen, SignupStep2Screen sem erro (smoke test).
    9. Atualizar `package.json` script `test` para `jest`.
  </action>
  <verify>
    <automated>cd apps/mobile && pnpm test</automated>
  </verify>
  <acceptance_criteria>
    - `cd apps/mobile && pnpm test` passa (auth-screens.spec renderiza 3 telas)
    - grep `SignupStep1Schema` em src/screens/auth/SignupStep1Screen.tsx
    - grep `CustomerCreateSchema` em src/screens/clientes/ClienteCreateScreen.tsx
    - grep `aceitar` ou `termos` (case-insensitive) em SignupStep1Screen.tsx (D-02)
    - grep `FREE` ou `PRO` ou `TOP` NÃO aparece em nenhuma screen
    - grep `Em breve` em src/screens/placeholders/EmBreveScreen.tsx
  </acceptance_criteria>
  <done>Auth (signup 2 etapas + login) e Customer (listar+criar) funcionais; placeholders "Em breve"; smoke test verde.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verificação em device do fluxo mobile</name>
  <what-built>App mobile com 5 bottom tabs, stack "Mais" com 9 itens, signup 2 etapas, login, listar/criar clientes consumindo a API NestJS.</what-built>
  <how-to-verify>
    1. Garantir backend rodando localmente (`cd apps/backend && pnpm start:dev`) e EXPO_PUBLIC_API_URL apontando para ele.
    2. Rodar o app: `cd apps/mobile && pnpm start` e abrir no Expo Go ou build de dev em Android.
    3. Verificar 5 tabs no rodapé: Início, Clientes, Orçamentos, Agenda, Mais (ícones Lucide, tab ativo roxo #6D28D9).
    4. Tocar "Mais" → confirmar os 9 itens (Ordens de Serviço, Catálogo, Financeiro, Documentos, Conta, Configurações, Usuários e permissões, Plano e assinatura, Ajuda); itens não-funcionais mostram "Em breve".
    5. Fazer signup: etapa 1 (usuário) → etapa 2 (empresa) → entrar no app já no contexto da empresa.
    6. Em "Clientes": criar um cliente e confirmar que ele aparece na lista.
    7. Confirmar UI em pt-BR e ausência de FREE/PRO/TOP.
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva os problemas encontrados.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| app mobile → API | App envia Bearer + X-Client-Request-Id; isolamento de tenant é decisão do backend |
| token no device | access/refresh token guardados em expo-secure-store (keychain/keystore) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-1-02 | Information Disclosure (Token theft) | armazenamento de token mobile | mitigate | expo-secure-store (keychain/keystore), nunca AsyncStorage |
| T-1-07 | Tampering (Duplicate mutation) | POST /customers retry | mitigate | X-Client-Request-Id em toda mutation (RequestIdempotency) |
</threat_model>

<verification>
- `pnpm exec tsc --noEmit` verde
- `pnpm test` verde (smoke das telas de auth)
- Checkpoint humano: 5 tabs, 9 itens "Mais", signup 2 etapas, criar cliente — aprovado
</verification>

<success_criteria>
- Shell de navegação completo (5 tabs + 9 itens "Mais")
- Auth (signup 2 etapas, login) e Customer (listar+criar) funcionais consumindo a API
- Tokens em SecureStore; idempotência em mutations; UI pt-BR
</success_criteria>

<output>
Após completar, criar `.planning/phases/01-vertical-slice/01-05-SUMMARY.md`
</output>
