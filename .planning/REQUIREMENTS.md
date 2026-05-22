# Orcivo — REQUIREMENTS.md

> Escopo: **apenas Fase 0**. Fases 1-7 estão em PROJECT.md como Active e serão detalhadas em seus próprios ciclos de planejamento.

---

## Fase 0 — Requisitos v1

### VALIDACAO — Validação de mercado

- [ ] **VAL-01**: Entrevistar no mínimo 5 técnicos instaladores com roteiro de 15 perguntas (~30min cada)
- [ ] **VAL-02**: Demonstrar protótipo do fluxo orçamento → aprovação → OS → recebimento
- [ ] **VAL-03**: Registrar síntese com tabela: quem pagaria Orcivo Mais (R$199,90/ano), quem não pagaria, motivos
- [ ] **VAL-04**: Atingir pelo menos 3 técnicos dispostos a pagar R$199,90/ano após ver o protótipo

**Critério de saída:** VAL-04 = true. Se < 3 confirmações, pausar e ajustar proposta antes de avançar.

### INFRA — Infraestrutura da VPS

- [ ] **INFRA-01**: VPS atualizada com sistema operacional Ubuntu 22.04 ou Debian 12
- [ ] **INFRA-02**: Usuário não-root com sudo configurado; login root via SSH desabilitado
- [ ] **INFRA-03**: Autenticação SSH apenas por chave pública (PasswordAuthentication no)
- [ ] **INFRA-04**: Firewall UFW ativo permitindo apenas portas 22, 80 e 443
- [ ] **INFRA-05**: fail2ban configurado com jail SSH
- [ ] **INFRA-06**: Docker e Docker Compose plugin instalados e funcionais
- [ ] **INFRA-07**: Timezone configurado para America/Sao_Paulo
- [ ] **INFRA-08**: Swap de 4GB configurado se RAM ≤ 4GB
- [ ] **INFRA-09**: Runbook `/docs/runbooks/vps-setup.md` documentando todos os passos

### STACK — Stack core deployada

- [ ] **STACK-01**: DNS com registros A configurados para: api, app, admin, www, status, errors, analytics, storage
- [ ] **STACK-02**: `docker-compose.yml` com PostgreSQL 16, Redis 7, MinIO e Caddy
- [ ] **STACK-03**: Volumes persistentes em `/mnt/data` com backup automático configurado
- [ ] **STACK-04**: Caddyfile com reverse proxy e HTTPS automático via Let's Encrypt
- [ ] **STACK-05**: PostgreSQL acessível e respondendo a conexão local
- [ ] **STACK-06**: Redis respondendo a `PING`
- [ ] **STACK-07**: MinIO acessível via console e API
- [ ] **STACK-08**: HTTPS válido e certificado em todos os subdomínios configurados
- [ ] **STACK-09**: Credenciais armazenadas em vault seguro fora da VPS (não no repositório)

### MONOREPO — Estrutura do repositório

- [ ] **MONO-01**: Repositório GitHub privado criado com estrutura de monorepo
- [ ] **MONO-02**: pnpm workspaces configurado com `pnpm-workspace.yaml`
- [ ] **MONO-03**: Turborepo configurado com `turbo.json`
- [ ] **MONO-04**: `tsconfig.base.json` compartilhado entre todos os apps
- [ ] **MONO-05**: `.gitignore` robusto cobrindo node_modules, .env, build artifacts, uploads de IA
- [ ] **MONO-06**: `.nvmrc` com Node 20 LTS
- [ ] **MONO-07**: ESLint + Prettier + commitlint configurados e funcionais
- [ ] **MONO-08**: Husky com pre-commit (lint-staged) funcional
- [ ] **MONO-09**: `apps/backend/`, `apps/mobile/`, `apps/web/`, `apps/site/`, `apps/admin/` criados como placeholders
- [ ] **MONO-10**: `packages/shared-types/` criado como placeholder (sem `@prisma/client`)
- [ ] **MONO-11**: `packages/ui/` criado como placeholder
- [ ] **MONO-12**: `prisma/`, `docs/`, `infra/`, `.claude/` criados

### CI — GitHub Actions

- [ ] **CI-01**: `.github/workflows/backend.yml` — lint + test + build do backend em push para main
- [ ] **CI-02**: `.github/workflows/mobile.yml` — lint + type-check do mobile em push para main
- [ ] **CI-03**: `.github/workflows/web.yml` — lint + type-check + build do web em push para main
- [ ] **CI-04**: Todos os workflows passando com código placeholder

### HELLO — Hello world funcional

- [ ] **HELLO-01**: `apps/backend` com NestJS funcional, `GET /health` retornando `{ status: "ok" }`
- [ ] **HELLO-02**: Backend containerizado com Dockerfile multi-stage e rodando no Docker Compose da VPS
- [ ] **HELLO-03**: `https://api.dominio.com.br/health` respondendo 200 com HTTPS válido
- [ ] **HELLO-04**: `apps/mobile` com Expo SDK 51+, TypeScript configurado, tela inicial buscando `/health` e exibindo resultado
- [ ] **HELLO-05**: APK gerado via EAS Build (internal distribution) e testado em dispositivo Android real
- [ ] **HELLO-06**: `apps/web` com Next.js + TypeScript + Tailwind + shadcn/ui configurados, página inicial buscando `/health`
- [ ] **HELLO-07**: Web containerizado e rodando na VPS via Docker Compose
- [ ] **HELLO-08**: `https://app.dominio.com.br` respondendo com HTTPS válido
- [ ] **HELLO-09**: Runbook `/docs/runbooks/deploy.md` documentando o processo de deploy

### DOCS — Documentação de fundação

- [ ] **DOCS-01**: `docs/decisions/` com ADRs 001-011 cobrindo as decisões travadas do projeto
- [ ] **DOCS-02**: `README.md` com instruções de setup local
- [ ] **DOCS-03**: `docs/PRODUCT.md`, `docs/ARCHITECTURE.md` com esqueletos

---

## v2 Requirements (deferidos — não planejar na Fase 0)

- Auth completo (signup, login, 2FA, refresh, reset)
- Multi-tenant com TenantGuard
- CRUD de Cliente
- Catálogo, Orçamento, OS, Agenda, Financeiro
- PDF, aprovação por link, assinatura digital
- Notificações push
- Monetização (Asaas)
- Fiscal (PlugNotas)

---

## Out of Scope (Fase 0)

| Item | Motivo |
|---|---|
| Qualquer feature de domínio (clientes, orçamentos, etc.) | Fase 0 é fundação — feature vem na Fase 1+ |
| Admin master | Fase 2 mínimo, Fase 4 profissional |
| GlitchTip / Umami / Uptime Kuma | Configurar junto ao hello world da VPS, mas não é bloqueante para CI |
| Design system no código | Tokens CSS já estão nos docs — implementar na Fase 1 |
| Prisma schema completo | Schema mínimo para o hello world; schema completo na Fase 1 |

---

## Traceability

| REQ-ID | Deliverable | Fase |
|---|---|---|
| VAL-01..04 | D0.1 — Validação | 0 |
| INFRA-01..09 | D0.2 — VPS | 0 |
| STACK-01..09 | D0.3 — Stack core | 0 |
| MONO-01..12 | D0.4 — Monorepo | 0 |
| CI-01..04 | D0.4 — CI | 0 |
| HELLO-01..09 | D0.5 — Hello world | 0 |
| DOCS-01..03 | D0.4 / D0.5 | 0 |

---
*Criado: 2026-05-21 — Fase 0*
