# Phase 1: Vertical Slice - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Provar que a arquitetura multi-tenant funciona ponta a ponta: Auth + Company + Customer do banco → API → mobile → web, com todo o molde arquitetural que as fases seguintes vão replicar.

**Deliverables:**
- D1.1 — Auth funcional (signup, login, refresh, reset — sem 2FA nesta fase)
- D1.2 — Tenant context e isolamento (Company, CompanyMember, TenantGuard)
- D1.3 — Vertical slice Customer (mobile + web, teste de tenant isolation em CI)
- D1.4 — Documentação do molde arquitetural

**Fora de escopo desta fase:** orçamentos, OS, financeiro, billing, fiscal, 2FA/TOTP, catálogo de produtos, notificações push.

</domain>

<decisions>
## Implementation Decisions

### D1 — Signup: experiência em 2 etapas

- **D-01:** Fluxo de cadastro dividido em 2 etapas sequenciais: primeiro cria o usuário, depois cria a empresa.
- **D-02:** Etapa 1 — Criar usuário: campos `nome`, `e-mail`, `telefone`, `senha`, `aceitar termos`. Todos obrigatórios exceto telefone (recomendado).
- **D-03:** Etapa 2 — Criar empresa: campos `nome_fantasia` (obrigatório), `tipo_documento` (CPF/CNPJ), `documento` (opcional), `telefone`, `cidade`, `uf`, `cor_da_marca` (opcional), `logo` (opcional), `chave_pix` (opcional).
- **D-04:** Após criar empresa → usuário entra no app já no contexto da empresa criada (sem tela de seleção de tenant no onboarding).
- **D-05:** Plano inicial ao criar conta: `Orcivo Livre`. Não mencionar trial. Não usar FREE/PRO/TOP. Nomenclatura: Orcivo Livre, Orcivo Solo, Orcivo Mais, Orcivo Equipe.

### D2 — Navegação mobile

- **D-06:** Estrutura de navegação mobile: bottom tabs com 5 itens principais.
  - Tabs: **Início** | **Clientes** | **Orçamentos** | **Agenda** | **Mais**
- **D-07:** "Mais" (drawer/stack) contém: Ordens de Serviço, Catálogo, Financeiro, Documentos, Conta, Configurações, Usuários e permissões, Plano e assinatura, Ajuda.
- **D-08:** Seguir fielmente o design handoff existente (`docs/design-handoff/orcivo-design-system/ui_kits/mobile/`).
- **D-09:** Na Fase 1, implementar o shell de navegação completo (todas as tabs e itens do "Mais"), mas somente as telas de Auth e Customer precisam ser funcionais. Demais telas podem ser placeholder com "Em breve".

### D3 — Navegação web (sidebar)

- **D-10:** Sidebar esquerda com itens: Dashboard | Clientes | Catálogo | Orçamentos | Ordens de Serviço | Agenda | Financeiro | Documentos | Configurações.
- **D-11:** Configurações inclui subseções: Empresa, Identidade visual, Chave Pix, Usuários e permissões, Plano e assinatura, Segurança, Exportação de dados.
- **D-12:** Seguir fielmente o design handoff (`docs/design-handoff/orcivo-design-system/ui_kits/web/`).
- **D-13:** Na Fase 1, implementar o layout de shell completo (sidebar + topbar), mas somente Auth e Clientes precisam ser funcionais. Demais seções podem ser placeholder.

### D4 — Customer: campos do vertical slice

- **D-14:** Customer com campos realistas mas sem exagero: `nome` (obrigatório), `tipo` (PF/PJ, opcional), `cpf_cnpj` (opcional), `telefone` (recomendado), `email` (opcional), `cidade` (opcional), `uf` (opcional), `observacoes` (opcional), `assigned_to_user_id` (opcional — apenas se estrutura de usuários simples já existir).
- **D-15:** Não implementar nesta fase: anexos, múltiplos contatos, múltiplos endereços, histórico de atendimentos.
- **D-16:** O slice Customer deve provar: (1) criar cliente via API, (2) listar clientes via API, (3) criar cliente no mobile, (4) criar cliente na web, (5) `company_id` presente e obrigatório, (6) empresa A não acessa clientes da empresa B (teste em CI).

### D5 — Auth: escopo da Fase 1

- **D-17:** Implementar na Fase 1: signup (e-mail + senha + argon2), login, JWT access token + refresh token, validação de membership em CompanyMember, company context no request (TenantGuard), logout.
- **D-18:** **2FA/TOTP não implementar na Fase 1.** Será adicionado antes de produção real ou em fase de segurança dedicada. Registrar ADR.
- **D-19:** Reset de senha: pode ser incluído ou deferido para Fase 2 — decisão do planner. É menos crítico para o molde arquitetural.
- **D-20:** JWT só identifica. Autorização revalida a cada request com cache Redis 60s (regra travada do PROJECT.md).

### D6 — Molde arquitetural (D1.4)

- **D-21:** Documentar o padrão que todas as fases seguirão: estrutura de módulo NestJS, TenantGuard, DTOs com Zod em shared-types, como mobile e web consomem a API, como testar isolamento multi-tenant em CI.
- **D-22:** A documentação do molde é um deliverable explícito — não é opcional.

### Claude's Discretion

- Estrutura interna dos módulos NestJS (Auth, Company, Customer)
- Estratégia de refresh token (httpOnly cookie vs localStorage vs SecureStore)
- Formato exato do JWT payload
- Implementação do TenantGuard (decorator ou guard global)
- Estratégia de testes de isolamento multi-tenant no CI
- Se usar Zod ou class-validator para validação dos DTOs no backend
- Decisão sobre reset de senha: incluir ou diferir para Fase 2

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system
- `docs/design-handoff/orcivo-design-system/README.md` — Design system oficial
- `docs/design-handoff/orcivo-design-system/colors_and_type.css` — Tokens CSS (primary: #6D28D9)
- `docs/design-handoff/orcivo-design-system/ui_kits/web/README.md` — UI Kit web (sidebar, topbar, etc.)
- `docs/design-handoff/orcivo-design-system/ui_kits/mobile/README.md` — UI Kit mobile (bottom tabs, etc.)

### Planejamento e regras
- `docs/PLANEJAMENTO_FINAL_V3_1_ORCIVO_PLANOS_ATUALIZADO.md` §3-4 (stack), §5 (domínio), §8 (auth), §11-13 (planos)
- `.planning/PROJECT.md` — Stack travada, decisões de produto, regras de money/multi-tenant
- `CLAUDE.md` — Regras absolutas de projeto (design, nomenclatura, autoria, regras técnicas)
- `.planning/ROADMAP.md` — Deliverables D1.1–D1.4

### ADRs relevantes
- `docs/decisions/ADR-006-auth-jwt-proprio.md` — Auth com NestJS Passport + JWT + argon2
- `docs/decisions/ADR-011-multi-tenant-company-id.md` — Multi-tenancy por company_id
- `docs/decisions/ADR-010-money-decimal.md` — Money como Prisma.Decimal (sem number/float)
- `docs/decisions/ADR-005-database-postgresql.md` — PostgreSQL 16 + Prisma

### Telas de referência frontend
- `docs/FRONTEND_DESIGN_MASTER.md` §4 (mobile), §5 (web) — Screen specs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/backend/src/app.module.ts` — Módulo raiz NestJS; adicionar Auth, Company, Customer como módulos filhos
- `apps/backend/src/health/health.controller.ts` — Padrão de controller; usar como referência de estrutura
- `apps/mobile/App.tsx` — Ponto de entrada Expo; será substituído pela navegação com bottom tabs
- `apps/web/app/layout.tsx` — Layout raiz Next.js com lang="pt-BR" e Inter font; manter e adicionar sidebar

### Established Patterns
- Monorepo pnpm workspaces — cada módulo em `apps/backend/src/{nome}/`
- Commits técnicos sem referência a IA: `feat(auth): add signup endpoint`, `feat(customer): add tenant isolation`
- shared-types em `packages/shared-types/src/` — DTOs e enums sem @prisma/client

### Integration Points
- `prisma/` — ainda sem schema; criar schema completo com User, Company, CompanyMember, Customer
- `packages/shared-types/src/index.ts` — exportar DTOs de signup, login, customer, company
- `infra/docker-compose.yml` — PostgreSQL e Redis já configurados para uso local

</code_context>

<specifics>
## Specific Ideas

- Signup em 2 etapas é o fluxo exato: tela 1 (usuário) → tela 2 (empresa) → entrar no app
- Bottom tabs mobile: 5 tabs (Início, Clientes, Orçamentos, Agenda, Mais) — exatamente como no design handoff
- Sidebar web com 9 itens — exatamente como no design handoff
- O shell de navegação completo deve ser criado agora (não apenas as telas funcionais) para que Phase 2 só precise preencher as telas, não recriar a estrutura

</specifics>

<deferred>
## Deferred Ideas

- **2FA/TOTP** — implementar antes de produção real, em fase de segurança futura. Registrar ADR-012.
- **Reset de senha** — pode ir para Fase 2 se o planner decidir focar no molde arquitetural
- **Verificação de e-mail no signup** — deferido; aceitar e-mail sem verificação por enquanto
- **Multi-device / sessão única** — deferido para fase de segurança
- **Social login (Google/Apple)** — fora do escopo (auth próprio travado no PROJECT.md)
- **Notificações push** — Fase 2+
- **Onboarding wizard após signup** — deferido; pode ir para Fase 3 junto com billing

</deferred>

---

*Phase: 01-vertical-slice*
*Context gathered: 2026-05-21 (via handoff da sessão anterior)*
