# Orcivo — ROADMAP.md

> **Planejamento atual: apenas Fase 0.** Fases 1-7 estão mapeadas em alto nível. Cada fase será detalhada em seu próprio ciclo `/gsd-plan-phase` antes da execução.

---

## Visão de alto nível

| # | Fase | Goal | Duração estimada |
|---|---|---|---|
| **0** | **Validação e Fundação** | Validar dor com técnicos reais e ter infra + repo prontos para receber código | 2 semanas |
| 1 | Vertical Slice | Provar arquitetura multi-tenant — Auth + Company + Customer (mobile + web + backend) | 2-3 semanas |
| 2 | MVP Funcional | Catálogo, Orçamento, PDF, WhatsApp, OS, Agenda, Financeiro básico (mobile + web) | 12-14 semanas |
| 3 | Monetização | Asaas + checkout + limites de plano + bloqueio escalonado | 4-6 semanas |
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

## Fase 1 — Vertical Slice (detalhamento pendente)

**Goal:** Provar que a arquitetura multi-tenant funciona. Customer de ponta a ponta (banco → API → mobile → web), com todo o molde arquitetural que as fases seguintes vão replicar.

**Deliverables de alto nível:**
- D1.1 — Auth funcional (signup, login, 2FA, refresh, reset)
- D1.2 — Tenant context e isolamento (Company, CompanyMember, TenantGuard)
- D1.3 — Vertical slice Customer (mobile + web, teste de tenant isolation em CI)
- D1.4 — Documentação do molde arquitetural

**Planejar com:** `/gsd-plan-phase 1` após aprovação e conclusão da Fase 0.

---

## Fases 2-7 (alto nível — não planejar ainda)

Ver `PROJECT.md` para descrição de cada fase.

---
*Criado: 2026-05-21 — Fase 0 planejada*
*Próxima atualização: após conclusão da Fase 0 e aprovação para a Fase 1*
