# Orcivo — ROADMAP.md

> **Planejamento atual:** Fase 03.1 em andamento, inserida entre as Fases 3 e 4. P00 e P01 concluídas (auto); P02 aguardando gates humanos T12/T13; P03 é a próxima wave após P02 = PASS. Fase 4 permanece bloqueada.
>
> **Discovery de produto 2026-09-01:** `phases/03.1-.../03.1-DISCOVERY-UAT-2026-09-01.md` — sessão real de exploração do produto pelo owner. 9 achados (D-1..D-9) classificados e encaixados nas waves de 03.1 e na Fase 4 sem alterar o plano existente. ADRs novas: 015 (audit trail), 016 (transições de estado), 017 (billing provider-agnostic / Mercado Pago).
>
> **MVP Product Batch #1 APROVADO 2026-09-03:** `.planning/product/MVP-PRODUCT-BATCH-1.md` (+ `.tasks.json` / `.plan.json` / `-EXECUTION.md`). 23 tasks `PB1-*` encaixadas nas waves 03.1 (P04/P06/P07/P07.5/P10) + duas novas: **F3.2 — inventory-lite** (P-15 promovido; distributor API = FUTURE), inserida entre 03.1 e Fase 4; **P17-wave — notificações in-app** (P-17 subset), perto de P07.5. `PB1-P02-audit-service` é lead task de P04. Todas `blockedByGates: [P02-T12, P02-T13, P03]` — nada roda antes de P03.

---

## Visão de alto nível

| # | Fase | Goal | Duração estimada |
|---|---|---|---|
| **0** | **Validação e Fundação** | Validar dor com técnicos reais e ter infra + repo prontos para receber código | 2 semanas |
| 1 | Vertical Slice | Provar arquitetura multi-tenant — Auth + Company + Customer (mobile + web + backend) | 2-3 semanas |
| 2 | MVP Funcional | Catálogo, Orçamento, PDF, WhatsApp, OS, Agenda, Financeiro básico (mobile + web) | 12-14 semanas |
| 3 | Monetização | Asaas + checkout + limites de plano + bloqueio escalonado | 4-6 semanas |
| **03.1** | **Estabilização pós-Fase 3** | **Recuperar e verificar a baseline antes de qualquer expansão** | por waves |
| 4 | Orcivo Mais/Equipe | Contratos, gráficos, busca avançada, admin master profissional | 6-8 semanas |
| 5 | Estoque | Estoque, fotos de produto, código de barras (Orcivo Equipe) | 4-6 semanas |
| 6 | Fiscal | NFS-e via PlugNotas | 4-6 semanas |
| 7 | Escala e Expansão | iOS, IA, agenda Google, CRM básico | contínuo |

**MVP monetizável:** Fases 0-3 ≈ 22-28 semanas (~5-7 meses)

---

## Fase 0 — Validação e Fundação

**Goal:** Validar a dor com técnicos reais E ter a infra básica e os repos prontos para receber código de domínio.

**Critério de conclusão:**
- 3+ técnicos dispostos a pagar Orcivo Mais após ver protótipo
- `GET https://api.dominio.com.br/health` → 200
- APK do hello world rodando em Android real
- `https://app.dominio.com.br` respondendo com HTTPS
- Push em `main` dispara lint + type-check + build no GitHub Actions

**Duração:** 2 semanas

---

### D0.1 — Validação com técnicos reais

**Goal:** Confirmar que o problema é real e que técnicos pagariam pelo produto antes de qualquer linha de código de produto.

**Critério de pronto:** 3+ técnicos entrevistados disseram que pagariam R$199,90/ano (Orcivo Mais) após ver o fluxo completo.

**Requirements cobertos:** VAL-01, VAL-02, VAL-03, VAL-04

**Duração estimada:** 5 dias

**Success criteria:**
1. Roteiro de entrevista criado com 15 perguntas cobrindo dor atual, uso de tecnologia, disposição de pagamento
2. Protótipo (Figma ou HTML estático) do fluxo principal criado e testável
3. 5 entrevistas conduzidas com áudio gravado (com permissão)
4. Síntese documentada em tabela: quem pagaria, motivos, objeções
5. Decisão GO/NO-GO documentada baseada em evidências

**Planos:**
- P0.1.1 — Criar roteiro de entrevista
- P0.1.2 — Criar protótipo do fluxo principal (pode ser HTML estático usando o design system existente)
- P0.1.3 — Conduzir entrevistas e registrar respostas
- P0.1.4 — Síntese e decisão GO/NO-GO

**Gate:** Se < 3 confirmações de pagamento → PAUSAR. Não avançar para D0.2 sem GO.

---

### D0.2 — VPS segura e provisionada

**Goal:** Servidor pronto para hospedar todos os serviços, com segurança básica estabelecida.

**Critério de pronto:** VPS pronta, SSH só por chave, firewall ativo, Docker instalado e funcional.

**Requirements cobertos:** INFRA-01..09

**Duração estimada:** 2 dias

**Success criteria:**
1. Login SSH funciona apenas com chave pública (senha rejeitada)
2. `ufw status` mostra apenas 22, 80, 443 permitidos
3. `docker compose version` executa sem erro
4. `timedatectl` mostra America/Sao_Paulo
5. Runbook `docs/runbooks/vps-setup.md` escrito e verificado

**Planos:**
- P0.2.1 — Hardening inicial (usuário, SSH, UFW, fail2ban)
- P0.2.2 — Docker, timezone, swap e documentação

---

### D0.3 — Stack core deployada

**Goal:** PostgreSQL, Redis, MinIO e Caddy rodando via Docker Compose, com HTTPS funcional nos subdomínios.

**Critério de pronto:** Todos os serviços UP, HTTPS válido em todos os subdomínios, credenciais em vault.

**Requirements cobertos:** STACK-01..09

**Duração estimada:** 3 dias

**Success criteria:**
1. `docker compose ps` mostra postgres, redis, minio, caddy como Up
2. `psql` conecta no banco local
3. `redis-cli ping` retorna PONG
4. Console MinIO acessível via HTTPS
5. `curl -I https://api.dominio.com.br` retorna 200 ou 404 (sem erro SSL)
6. Credenciais NÃO estão no repositório

**Planos:**
- P0.3.1 — DNS e `docker-compose.yml` base (postgres, redis, minio)
- P0.3.2 — Caddy + HTTPS automático + verificação dos subdomínios
- P0.3.3 — Vault de credenciais e backup inicial

---

### D0.4 — Monorepo e CI

**Goal:** Estrutura do repositório pronta para receber código; push em `main` dispara CI com lint + type-check + build.

**Critério de pronto:** CI passa em todos os apps placeholder sem erros.

**Requirements cobertos:** MONO-01..12, CI-01..04, DOCS-01..02

**Duração estimada:** 3 dias

**Success criteria:**
1. `pnpm install` funciona na raiz e instala todos os workspaces
2. `turbo run lint` passa sem erros
3. `turbo run build` passa (mesmo com apps placeholder)
4. Push em `main` dispara os 3 workflows do GitHub Actions (backend, mobile, web) e todos ficam verdes
5. `apps/`, `packages/`, `prisma/`, `docs/`, `infra/` existem com estrutura correta
6. `docs/decisions/` tem ADRs 001-011

**Planos:**
- P0.4.1 — Scaffold do monorepo (pnpm workspaces, Turborepo, tsconfig base)
- P0.4.2 — Ferramentas de qualidade (ESLint, Prettier, commitlint, Husky)
- P0.4.3 — Placeholder apps (backend, mobile, web, site, admin) e packages (shared-types, ui)
- P0.4.4 — GitHub Actions CI (backend.yml, mobile.yml, web.yml)
- P0.4.5 — ADRs e documentação de fundação

---

### D0.5 — Hello world mobile + web + backend

**Goal:** Cada plataforma funciona end-to-end: backend responde healthcheck, mobile abre tela, web abre página.

**Critério de pronto:** `GET https://api.dominio.com.br/health` → 200; APK testado em Android real; `https://app.dominio.com.br` no ar.

**Requirements cobertos:** HELLO-01..09, DOCS-03

**Duração estimada:** 2 dias

**Success criteria:**
1. `curl https://api.dominio.com.br/health` retorna `{"status":"ok"}` com HTTPS
2. APK instalado em Android real exibe resultado do health check
3. `https://app.dominio.com.br` carrega página com conteúdo (não erro de SSL ou 502)
4. Runbook `docs/runbooks/deploy.md` documentado com passos de SSH + docker pull + compose up

**Planos:**
- P0.5.1 — Backend NestJS: health check + Dockerfile + deploy na VPS
- P0.5.2 — Mobile Expo: tela hello world + fetch /health + EAS Build + teste APK
- P0.5.3 — Web Next.js: página hello world + Dockerfile + deploy na VPS + runbook

---

## Fase 1 — Vertical Slice

**Goal:** Provar que a arquitetura multi-tenant funciona. Customer de ponta a ponta (banco → API → mobile → web), com todo o molde arquitetural que as fases seguintes vão replicar.

**Deliverables de alto nível:**
- D1.1 — Auth funcional (signup 2 etapas, login, refresh, logout — sem 2FA e sem reset nesta fase)
- D1.2 — Tenant context e isolamento (Company, CompanyMember, TenantGuard)
- D1.3 — Vertical slice Customer (mobile + web, teste de tenant isolation em CI)
- D1.4 — Documentação do molde arquitetural

**Requirements cobertos:** AUTH-01..04, TENANT-01, TENANT-02, CUSTOMER-01, CUSTOMER-02, CUSTOMER-03, NAV-01, NAV-02, TYPES-01, ARCH-01

**Plans:** 7 plans em 6 waves

**Status:** ✅ Completa — 2026-05-22

Plans:
- [x] 01-P01-PLAN.md — Schema Prisma + DTOs Zod + stubs Wave 0 + db push (Wave 1)
- [x] 01-P02-PLAN.md — Módulo Auth NestJS: signup 2 etapas, login, refresh, logout, guards, TenantGuard (Wave 2)
- [x] 01-P03-PLAN.md — Módulo Company: GET /company/me via TenantGuard (Wave 3)
- [x] 01-P04-PLAN.md — Módulo Customer: CRUD com tenant scope + teste de isolamento (Wave 4)
- [x] 01-P05-PLAN.md — Shell mobile + telas de Auth e Customer (Wave 5)
- [x] 01-P06-PLAN.md — Shell web (sidebar + topbar) + páginas de Auth e Clientes (Wave 5)
- [x] 01-P07-PLAN.md — Teste de isolamento em CI + documentação do molde (D1.4) (Wave 6)

**Decisões:** Reset de senha diferido para Fase 2 (D-19); 2FA diferido (D-18, ADR-012).

---

## Fase 2A — MVP Funcional Core

**Goal:** Técnico consegue cadastrar catálogo, montar orçamento, gerar PDF, compartilhar via WhatsApp, receber aprovação por link público (3 métodos), executar OS com fotos — tudo no mobile e na web.

**Deliverables:**
- D2.1 — Catálogo de serviços/produtos (mobile + web)
- D2.2 — Orçamento estruturado com máquina de estados (mobile + web)
- D2.3 — Geração de PDF + compartilhamento WhatsApp
- D2.4 — Aprovação por link público (3 métodos: botão, nome, assinatura)
- D2.5 — Ordem de Serviço com fotos BEFORE/DURING/AFTER (mobile + web)
- + Reset de senha (D2-02)
- + StorageService MinIO (D2-17)
- + PlanLimitsService scaffold (D2-18)

**Requirements cobertos:** D2.1, D2.2, D2.3, D2.4, D2.5, AUTH

**Plans:** 12 plans em 7 waves

**Status:** ✅ Completa — 2026-05-24 (verificação 12/12)

Plans:
- [x] 02-P01-PLAN.md — Schema Prisma + DTOs shared-types (Wave 1)
- [x] 02-P02-PLAN.md — Backend infra: StorageService + MailService + PlanLimitsService (Wave 2)
- [x] 02-P03-PLAN.md — Auth reset de senha: forgot-password + reset-password (Wave 2)
- [x] 02-P04-PLAN.md — Backend CatalogModule CRUD com isolation spec (Wave 3)
- [x] 02-P05-PLAN.md — Backend QuoteModule: CRUD + state machine + BullMQ + isolation spec (Wave 3)
- [x] 02-P06-PLAN.md — Backend WorkOrderModule: CRUD + upload fotos + isolation spec (Wave 3)
- [x] 02-P07-PLAN.md — PDF service + Approval flow: QuoteApproval + WorkOrder automática (Wave 4)
- [x] 02-P08-PLAN.md — Mobile: Catálogo + OS com upload de fotos (Wave 5)
- [x] 02-P09-PLAN.md — Mobile: Orçamentos + compartilhamento WhatsApp (Wave 5)
- [x] 02-P10-PLAN.md — Web: Catálogo + Ordem de Serviço (Wave 6)
- [x] 02-P11-PLAN.md — Web: Orçamentos + WhatsApp share (Wave 6)
- [x] 02-P12-PLAN.md — Página pública de aprovação + prisma migrate + smoke tests (Wave 7)

---

## Fase 3 — Monetização

**Goal:** Asaas integrado, site público com checkout, limites de plano enforced, bloqueio escalonado por inadimplência.

**Deliverables:**
- D3.1 — Schema Prisma: Subscription, SubscriptionPayment, WebhookEvent, PlanLimit
- D3.2 — BillingModule backend: Asaas API client, webhooks idempotentes (WebhookEvent), SubscriptionStatusGuard
- D3.3 — PlanLimitsService completo: GET /me/plan-limits, enforce nos endpoints, bloqueio de criação por plano
- D3.4 — Bloqueio escalonado: carência por plano, PAST_DUE → BLOCKED, banner no app/web, email
- D3.5 — Site público (apps/site/): landing + pricing + checkout Asaas (Next.js)
- D3.6 — Fluxo de upgrade/downgrade + convites de membros

**Requirements cobertos:** §11, §12, §13, §14 do planejamento mestre

**Regras críticas:**
- Checkout 100% no site público (Next.js); sem botão de compra no mobile
- Mensagem neutra no mobile: "Sua assinatura está inativa. Acesse o site para regularizar."
- Inadimplente PODE logar/ver dados/exportar; NÃO PODE criar/modificar/emitir
- Orcivo Livre sem cobrança via Asaas (não cria Subscription com gateway)
- WebhookEvent obrigatório para todos os eventos Asaas (idempotência)
- Limites vêm do backend via GET /me/plan-limits; nunca hardcoded no app

**Duração estimada:** 4-6 semanas

**Plans:** 9 plans em 5 waves

**Status histórico registrado:** ✅ Completa — 2026-06-04

**Reconciliação atual:** pendente em P11. O registro histórico e os checkboxes
abaixo não substituem verification, summaries e UAT da fase 03.1.

Plans:
- [x] 03-P01-PLAN.md — Schema Prisma: Subscription, SubscriptionPayment, WebhookEvent, PlanLimit (Wave 1)
- [x] 03-P02-PLAN.md — BillingModule + AsaasClient + SubscriptionService (Wave 2)
- [x] 03-P03-PLAN.md — WebhookModule + BullMQ worker + CronJob carência (Wave 2)
- [x] 03-P04-PLAN.md — PlanLimitsService completo + GET /me/plan-limits + enforce (Wave 3)
- [x] 03-P05-PLAN.md — SubscriptionStatusGuard + bloqueio escalonado (Wave 3)
- [x] 03-P06-PLAN.md — Site público apps/site/ — landing + pricing + checkout (Wave 4)
- [x] 03-P07-PLAN.md — Banner de inadimplência mobile + web (Wave 4)
- [x] 03-P08-PLAN.md — Convites de membros (InviteModule) (Wave 4)
- [x] 03-P09-PLAN.md — Prisma migrate + smoke tests + documentação (Wave 5)

---

## Fase 03.1 — Estabilização pós-Fase 3

**Goal:** tornar a baseline standalone, migrations, isolamento, storage,
aprovação, auth, billing, contratos, qualidade e UAT reproduzíveis antes da Fase
4.

**Status:** **EM ANDAMENTO — 2/13 waves verificadas** (P07.5 adicionada pelo discovery de 2026-09-01)

**Estado de saída atual:**

- P00/Wave 0: PASS;
- P01/Wave 1: PASS (T01–T10, `SAFE_AUTO`); T11 (`HUMAN_APPROVAL`) e T12 (`MANUAL_UAT`) pendentes;
- `baseline_reproducible`: `migrations_and_container_only`;
- UAT: 0/75;
- Fase 4: bloqueada.

Planos:

- [x] 03.1-P00-PLAN.md — Recuperação do repositório (Wave 0)
- [x] 03.1-P01-PLAN.md — Migrations e reprodutibilidade (Wave 1 — auto PASS; T11/T12 humanos pendentes)
- [ ] 03.1-P02-PLAN.md — Tenant isolation e autorização (Wave 2 — READY)
- [ ] 03.1-P03-PLAN.md — Storage privado (Wave 3)
- [ ] 03.1-P04-PLAN.md — Aprovação atômica e idempotente (Wave 4) — **escopo expandido pelo discovery: máquina de estados completa de Quote + WorkOrder, ações `cancelar`/`reabrir`/`corrigir`, fim da sobrescrita de `notes`, audit em toda transição (ADR-016, D-4)**
- [ ] 03.1-P05-PLAN.md — Auth e sessões (Wave 5)
- [ ] 03.1-P06-PLAN.md — Billing e limites (Wave 6) — **+ arquitetura billing provider-agnostic (`PaymentProvider`) e refatoração dos placeholders Asaas; Mercado Pago fica desenhado, não implementado (ADR-017, D-8)**
- [ ] 03.1-P07-PLAN.md — Contratos funcionais (Wave 7) — **escopo expandido pelo discovery: remover todo CTA morto; `PATCH /company/me` (perfil + PIX); `PATCH`/`DELETE /customers/:id`; modal "Registrar recebimento"; sidebar/topbar com dados reais da sessão (D-1, D-2, D-3, D-9)**
- [ ] 03.1-P07.5-PLAN.md — **Trilha de auditoria de negócio (nova wave, discovery)** — `AuditService` central, migration `actor_user_id` (aditiva), cobertura quote/OS/payment/company/invite, `GET /audit-logs`, aba "Histórico" no web (ADR-015, D-5)
- [ ] 03.1-P08-PLAN.md — Baseline de qualidade (Wave 8)
- [ ] 03.1-P09-PLAN.md — Preparação de UAT (Wave 9)
- [ ] 03.1-P10-PLAN.md — Fidelidade visual (Wave 10)
- [ ] 03.1-P11-PLAN.md — Reconciliação GSD (Wave 11)

**Próximo gate:** P02 — tenant isolation e RBAC. Só depois de P02 as colunas
soltas de `payments`/`appointments` recebem FK/constraints compostas de tenant
(deferido de P01 por decisão de escopo, ver `03.1-P01-T01-DRIFT-MATRIX.md`).
P01-T11 (aplicar migration em DB persistente) segue como gate humano `H-DB`.

---

## Fases 4-7 (alto nível — não planejar ainda)

Ver `PROJECT.md` para descrição de cada fase.

**Itens do discovery 2026-09-01 encaixados na Fase 4:**

- **Mobile catch-up (D-6):** `InicioScreen` deixa de ser stub — Home útil para o
  técnico em campo (KPIs do dia, agenda do dia, ações rápidas); tela de
  **detalhe do cliente** no mobile. Agenda/Financeiro/Configurações/Equipe/Plano
  no mobile permanecem **fora de escopo** (dual-surface: web = gestão) até
  decisão de produto em contrário.
- **Agenda web completa:** views mês/dia/lista, filtros, editar evento
  (`OPERATIONS_UI_MISSING_SPECS.md` já tem a spec).
- **Documentos:** recibos (a partir de `Payment`) e contratos.
- **Trilha de auditoria — leitura/UI completa** caso não finalize em 03.1-P07.5.

**Fase 7:** Notificações (modelo `Notification`/`DeviceToken`, push, e-mail,
in-app) — hoje o ícone de sino no TopBar é placeholder (D-1b).

---
*Criado: 2026-05-21 — Fase 0 planejada*
*Atualizado: 2026-05-22 — Fase 2A planejada (12 plans, 7 waves)*
*Atualizado: 2026-07-23 — Fase 03.1 em andamento; P00 concluída*
*Atualizado: 2026-09-01 — Discovery de produto incorporado; P02 aguardando gates humanos; wave P07.5 (audit trail) adicionada; ADRs 015/016/017*
