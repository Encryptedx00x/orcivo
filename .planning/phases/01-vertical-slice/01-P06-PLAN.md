---
phase: 01-vertical-slice
plan: 06
type: execute
wave: 5
depends_on: [04]
files_modified:
  - apps/web/middleware.ts
  - apps/web/app/(auth)/layout.tsx
  - apps/web/app/(auth)/login/page.tsx
  - apps/web/app/(auth)/signup/page.tsx
  - apps/web/app/(app)/layout.tsx
  - apps/web/app/(app)/page.tsx
  - apps/web/app/(app)/clientes/page.tsx
  - apps/web/app/(app)/clientes/novo/page.tsx
  - apps/web/components/AppSidebar.tsx
  - apps/web/components/TopBar.tsx
  - apps/web/lib/api.ts
  - apps/web/app/api/auth/login/route.ts
  - apps/web/app/api/auth/logout/route.ts
  - apps/web/src/__tests__/sidebar.spec.tsx
  - apps/web/jest.config.ts
  - apps/web/package.json
autonomous: false
requirements: [CUSTOMER-03, NAV-02, AUTH-01, AUTH-02]
must_haves:
  truths:
    - "Web tem sidebar esquerda com exatamente 9 itens (D-10)"
    - "Layout tem sidebar (260px) + topbar (64px) no route group (app)"
    - "Rotas autenticadas redirecionam para /login se não houver cookie de access token"
    - "Usuário faz login, lista e cria clientes na web"
    - "Seções não-funcionais mostram placeholder"
  artifacts:
    - path: "apps/web/components/AppSidebar.tsx"
      provides: "Sidebar com 9 itens de navegação e ícones Lucide"
    - path: "apps/web/middleware.ts"
      provides: "Proteção de rotas via cookie httpOnly"
      contains: "access_token"
    - path: "apps/web/app/(app)/clientes/page.tsx"
      provides: "Listagem de clientes do tenant"
  key_links:
    - from: "apps/web/middleware.ts"
      to: "cookie access_token"
      via: "redireciona /login se ausente"
      pattern: "redirect"
    - from: "apps/web/app/(app)/clientes/page.tsx"
      to: "/customers"
      via: "fetch server-side com Bearer"
      pattern: "customers"
---

<objective>
Construir o shell web completo (sidebar 9 itens + topbar) com route groups (auth)/(app), middleware de proteção via cookie httpOnly, e tornar funcionais somente Login/Signup e Clientes (listar + criar), consumindo a API NestJS. Demais seções = placeholder. Segue o design handoff web (Inter, roxo #6D28D9, Lucide).

Purpose: Estabelece o molde web que a Fase 2 vai preencher. Prova consumo da API multi-tenant pelo web com auth via cookie httpOnly.
Output: App web navegável com auth e clientes funcionais; checkpoint de verificação no browser.
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
@docs/design-handoff/orcivo-design-system/ui_kits/web/README.md
@docs/FRONTEND_DESIGN_MASTER.md

<interfaces>
```typescript
import { SignupStep1Dto, SignupStep2Dto, LoginDto, LoginResponseDto,
         CustomerCreateDto, CustomerDto } from '@orcivo/shared-types';
```
<!-- Endpoints: POST /auth/login, POST /auth/logout, GET /customers, POST /customers -->
<!-- Padrões: PATTERNS.md Grupo 11 (layouts, linhas 580-633), Grupo 12 (middleware, linhas 637-665), Grupo 13 (server component fetch, linhas 669-696) -->
<!-- Root layout atual (PRESERVAR): apps/web/app/layout.tsx — html lang=pt-BR, Inter, bg-white -->
<!-- Cores: text-[#6D28D9] roxo primário, text-gray-500 secundário, border-gray-200 -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Shell web — middleware, route groups, sidebar, topbar</name>
  <read_first>
    - apps/web/app/layout.tsx (root layout — preservar)
    - apps/web/app/page.tsx (padrão Server Component com fetch)
    - apps/web/package.json (deps; Next/Tailwind já instalados)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 11 linhas 580-633, Grupo 12 linhas 637-665)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (Pattern 4 linhas 418-444, Pitfall 5 linhas 859-868)
    - docs/design-handoff/orcivo-design-system/ui_kits/web/README.md
    - .planning/phases/01-vertical-slice/01-CONTEXT.md (D-10 sidebar 9 itens, D-11 subseções de Configurações)
  </read_first>
  <behavior>
    - middleware redireciona para /login se não houver cookie access_token em rotas não-públicas; redireciona para /clientes se logado acessar /login. Matcher exclui /api/.
    - AppSidebar tem exatamente 9 itens (D-10): Dashboard, Clientes, Catálogo, Orçamentos, Ordens de Serviço, Agenda, Financeiro, Documentos, Configurações
    - (app)/layout.tsx: sidebar 260px + topbar 64px + main
    - (auth)/layout.tsx: centralizado sem sidebar
  </behavior>
  <action>
    1. Instalar `cd apps/web && pnpm add lucide-react`.
    2. Criar `middleware.ts` — copiar PATTERNS.md Grupo 12 (linhas 643-664): lê cookie `access_token`, publicPaths ['/login','/signup'], matcher exclui /api/.
    3. Criar `lib/api.ts`: helper server-side para chamar a API com Bearer do cookie (ler cookie via `next/headers` cookies()), base `process.env.API_URL`.
    4. Criar `components/AppSidebar.tsx`: lista exatamente os 9 itens de D-10 com ícones Lucide (lucide-react). Item ativo em roxo #6D28D9. Largura 260px.
    5. Criar `components/TopBar.tsx`: barra 64px com nome da empresa (placeholder) e botão de logout (chama /api/auth/logout).
    6. Criar `app/(app)/layout.tsx` — copiar PATTERNS.md Grupo 11 (linhas 607-620): flex com Sidebar + (Topbar + main).
    7. Criar `app/(auth)/layout.tsx` — copiar PATTERNS.md Grupo 11 (linhas 625-632): centralizado, bg-white.
    8. Criar `app/(app)/page.tsx`: redireciona para /clientes (dashboard é Fase 2).
  </action>
  <verify>
    <automated>cd apps/web && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `cd apps/web && pnpm build` compila sem erro
    - grep conta exatamente 9 itens de navegação em components/AppSidebar.tsx (9 labels/links)
    - grep `access_token` em middleware.ts
    - grep `(?!api` em middleware.ts (matcher exclui /api/)
    - grep `lucide-react` em AppSidebar.tsx; grep emoji NÃO presente
    - grep `260` (px) em app/(app)/layout.tsx ou AppSidebar.tsx
  </acceptance_criteria>
  <done>Shell web completo (sidebar 9 itens + topbar); middleware protege rotas; build verde.</done>
</task>

<task type="auto">
  <name>Task 2: Páginas funcionais de Auth e Clientes + cookie httpOnly + teste</name>
  <read_first>
    - apps/web/app/page.tsx (padrão Server Component fetch)
    - .planning/phases/01-vertical-slice/01-PATTERNS.md (Grupo 13 linhas 669-696, Shared Patterns tokens/idioma linhas 773-797)
    - .planning/phases/01-vertical-slice/01-RESEARCH.md (Pattern 1 linhas 299-303 — cookie httpOnly web)
    - .planning/phases/01-vertical-slice/01-CONTEXT.md (D-02/D-03 signup, D-14 customer)
    - docs/FRONTEND_DESIGN_MASTER.md (§5 web screen specs)
  </read_first>
  <behavior>
    - /api/auth/login (Route Handler): repassa para a API NestJS; ao receber tokens, grava access_token em cookie httpOnly + SameSite=Strict; retorna 200
    - /api/auth/logout: chama API logout e limpa o cookie
    - (auth)/login: form e-mail+senha → POST /api/auth/login → redireciona /clientes
    - (auth)/signup: form 2 etapas (D-02 + D-03) → cria usuário e empresa → entra no app
    - (app)/clientes: Server Component, fetch GET /customers com Bearer do cookie, lista por nome; link "Novo cliente"
    - (app)/clientes/novo: form D-14 → POST /customers → volta para lista
    - UI pt-BR; planos Orcivo Livre/Solo/Mais/Equipe; nunca FREE/PRO/TOP
  </behavior>
  <action>
    1. Criar Route Handler `app/api/auth/login/route.ts`: POST recebe {email,password}, valida LoginSchema, chama API NestJS POST /auth/login; em sucesso usa `cookies().set('access_token', token, { httpOnly: true, sameSite: 'strict', secure: true, path: '/' })` e retorna user/company. Erro → 401.
    2. Criar `app/api/auth/logout/route.ts`: chama API logout, `cookies().delete('access_token')`, retorna 200.
    3. Criar `app/(auth)/login/page.tsx` (client component): form e-mail+senha; chama /api/auth/login; sucesso → router.push('/clientes'). Link para /signup. Labels pt-BR.
    4. Criar `app/(auth)/signup/page.tsx` (client component): wizard 2 etapas — etapa 1 campos D-02, etapa 2 campos D-03; valida com SignupStep1Schema/SignupStep2Schema; POST signup/user → signup/company; sucesso grava cookie e entra no app. Se exibir plano: "Orcivo Livre".
    5. Criar `app/(app)/clientes/page.tsx` (Server Component) — padrão PATTERNS.md Grupo 13: fetch GET /customers com Bearer do cookie (cache: 'no-store'); renderiza tabela/lista por nome; estado vazio pt-BR; link "Novo cliente".
    6. Criar `app/(app)/clientes/novo/page.tsx` (client component): form D-14; valida CustomerCreateSchema; POST /customers (via lib/api ou route handler); sucesso → redireciona /clientes.
    7. Configurar `jest.config.ts` (@testing-library/react + jsdom) e devDeps; criar `src/__tests__/sidebar.spec.tsx`: renderiza AppSidebar e assert que há 9 itens de navegação. Atualizar `package.json` script test → jest.
  </action>
  <verify>
    <automated>cd apps/web && pnpm test && pnpm build</automated>
  </verify>
  <acceptance_criteria>
    - `cd apps/web && pnpm test` passa (sidebar.spec verifica 9 itens)
    - `pnpm build` compila sem erro
    - grep `httpOnly: true` em app/api/auth/login/route.ts
    - grep `sameSite` (Strict) em app/api/auth/login/route.ts
    - grep `SignupStep2Schema` em app/(auth)/signup/page.tsx
    - grep `CustomerCreateSchema` em app/(app)/clientes/novo/page.tsx
    - grep `FREE` ou `PRO` ou `TOP` NÃO aparece em nenhuma página
  </acceptance_criteria>
  <done>Login/signup com cookie httpOnly; Clientes listar+criar funcionais; sidebar.spec verde; build verde.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verificação no browser do fluxo web</name>
  <what-built>App web com sidebar de 9 itens + topbar, signup 2 etapas, login com cookie httpOnly, listar/criar clientes consumindo a API NestJS.</what-built>
  <how-to-verify>
    1. Garantir backend rodando (`cd apps/backend && pnpm start:dev`) e API_URL do web apontando para ele.
    2. `cd apps/web && pnpm dev` e abrir http://localhost:3000.
    3. Sem login, acessar /clientes → deve redirecionar para /login.
    4. Fazer signup (etapa 1 usuário → etapa 2 empresa) → entrar no app.
    5. Confirmar sidebar com 9 itens (Dashboard, Clientes, Catálogo, Orçamentos, Ordens de Serviço, Agenda, Financeiro, Documentos, Configurações) e item ativo em roxo #6D28D9.
    6. Em Clientes: criar um cliente e confirmar que aparece na lista.
    7. Confirmar fonte Inter, UI pt-BR, ausência de FREE/PRO/TOP; logout limpa o cookie e redireciona para /login.
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva os problemas encontrados.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → web (Next.js) | Cookie httpOnly inacessível ao JS (anti-XSS) |
| web → API NestJS | Bearer derivado do cookie server-side; isolamento de tenant é decisão do backend |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-1-02 | Information Disclosure (Token theft / XSS) | armazenamento de token web | mitigate | cookie httpOnly + SameSite=Strict + secure; JS não acessa o token |
| T-1-08 | Spoofing (Acesso a rota protegida sem sessão) | rotas (app) | mitigate | middleware.ts redireciona /login se sem cookie |
</threat_model>

<verification>
- `pnpm build` verde
- `pnpm test` verde (sidebar 9 itens)
- Checkpoint humano: redirect sem login, signup 2 etapas, sidebar 9 itens, criar cliente — aprovado
</verification>

<success_criteria>
- Shell web completo (sidebar 9 itens + topbar)
- Auth (signup 2 etapas, login via cookie httpOnly) e Clientes (listar+criar) funcionais
- Proteção de rotas via middleware; UI pt-BR/Inter; sem FREE/PRO/TOP
</success_criteria>

<output>
Após completar, criar `.planning/phases/01-vertical-slice/01-06-SUMMARY.md`
</output>
