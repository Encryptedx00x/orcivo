# AGENT-HANDOFF — Orcivo

Documento de continuidade entre agentes (Claude ↔ Codex/GPT ↔ humano).
**Versionado.** Cada agente que fecha uma sessão de trabalho atualiza a seção
"Estado corrente" e adiciona uma linha no "Histórico de handoff".

> Regras: não commitar secrets/.env/tokens/prompts/transcripts aqui. Datas
> absolutas. Este arquivo descreve o estado; a fonte de verdade do GSD continua
> em `.planning/STATE.md`, `ROADMAP.md` e os `phases/*/`.

---

## Orquestração — REMEDIAÇÃO DE SEGURANÇA (2026-09-02) — V2 SECURITY SPINE

**O supervisor V1 foi REJEITADO** por revisão adversarial independente do Codex
(`.planning/reviews/ORCHESTRATION-SUPERVISOR-INDEPENDENT-REVIEW.md`, VERDICT:
REJECT). V1 é agora `LEGACY_REJECTED_REFERENCE_ONLY` — preservado só para
comparação e como baseline de regressão (23/23). `run`/`loop`/`cleanup` do V1
estão bloqueados (guard em `supervisor.ps1`); `index`/`status`/`next`/`recover`
seguem disponíveis só para inspeção.

**V2 — `scripts/orchestration/v2/`** (clean-room, namespace próprio
`.orchestration/v2/`, não faz dot-source do V1, não migra artefato V1 para
confiança V2). Esta sessão construiu e **provou adversarialmente** a espinha de
segurança:

- `SECURITY_SPINE_V2 = PASS` — suíte `v2/tests/run-spine-tests.ps1` **40/40 verde**,
  repositórios git descartáveis, sem chamadas de modelo.
- Fixados + testados: **C-01, C-02, C-03, H-01, H-03, H-04, H-05, H-06, H-07,
  H-11, H-12, M-01, M-03, M-05**; **C-04 e H-02 parciais**.
- Deferidos (próxima sessão, cada um precisa de revisão própria): **C-05, C-06,
  H-08, H-09, H-10** + smoke real Claude/Codex descartável.
- `SECURITY_SPINE_V2` docs: `docs/agents/ORCHESTRATION-THREAT-MODEL.md`,
  `docs/agents/ORCHESTRATION-ATTESTATIONS.md`.
- **NÃO** é production-ready. **NÃO** declarado READY_FOR_CANARY. Nenhuma task
  real / P03 / T12 / T13 / DB persistente tocada.
- `READY_FOR_SECOND_SECURITY_REVIEW = YES` (para a espinha; C-05/C-06/H-08..H-10
  ficam para depois desse review).

Detalhe da matriz e arquitetura: `docs/runbooks/agent-orchestration.md`.

---

## Orquestração multi-agente (2026-09-02) — SUPERVISOR V1 (REJEITADO — histórico)

> A seção abaixo descrevia o V1 como "production-ready". Isso foi **refutado**
> pela revisão independente. Mantida como registro histórico.

`docs/runbooks/agent-orchestration.md` + `scripts/orchestration/` +
`.orchestration/config.json`. Camada mínima, Windows-nativa (PowerShell 5.1),
sem dependência de terceiros. **orca-cli/orca descartado** (esqueleto abandonado).

Executores: **Claude Code headless** (`claude -p`, primário) + **Codex**
(`codex exec`, fallback + reviewer cruzado). Codex via ChatGPT (sem API key).
Isolamento por **git worktree** nativo.

Scripts: `supervisor.ps1` (`index|status|next|run|loop|recover|cleanup`),
`reconcile.ps1`, `run-agent.ps1`, `verify.ps1`, `review.ps1`, `merge.ps1`,
`checkpoint.ps1`. Suite determinística: `scripts/orchestration/tests/`
(`fake-agent.ps1` + `run-tests.ps1`, 23 casos, **sem chamadas reais de modelo**).

Fechado nesta sessão (gaps do POC):
- **reconciliador real** `.planning → execution-index.json` em granularidade de
  task; valida ciclo / dependência inexistente / task ausente / status
  impossível / STATE-SUMMARY divergente / DONE sem evidência; escopo = fase
  ativa e diante (fases históricas confiam em STATE.md). Real: 48 planos, 184
  tasks, `reconciled=true`.
- **scheduler contínuo** `supervisor.ps1 loop` — reconcile → READY → run →
  repeat; dorme em idle / blocked / human-gate; nunca busy-loop; para via
  `.orchestration/loop.stop`. `maxParallel=1` (teto 2).
- **dependency + scope-conflict scheduling** — serializa quando independência
  não é provável (schema/shared-types/lockfile/CI/Level-C).
- **merge policy segura** — integra target no branch → re-verify (== árvore
  pós-merge) → `merge --no-ff` → push normal. Nunca force/reset; nunca faz merge
  de branch vermelha; conflito não trivial → `NEEDS_REVIEW`, main intacta.
- **reviewer cruzado** Claude↔Codex — `APPROVE | REQUEST_CHANGES |
  HUMAN_REVIEW_REQUIRED`; REQUEST_CHANGES volta ao executor (máx. 2 ciclos).
- **failure classification** endurecida: 12 classes; failover só nas 4
  `PROVIDER_*` corroboradas; `UNKNOWN` não faz failover.
- **redaction** endurecida: headers/bearer/cookies/`*_SECRET`/`*_TOKEN`/
  `DATABASE_URL`/URLs com credencial + colapso estrutural de dumps `.env`.
- **crash recovery** `supervisor.ps1 recover` — locks órfãos (pid morto),
  worktrees/ runs interrompidos → `RECOVERABLE`/`NEEDS_REVIEW`; **nunca** apaga
  trabalho sujo; `-Apply` só limpa órfãos provadamente seguros.

Ainda aberto antes de ligar em task real de produção: endurecer os regexes de
classificação com stderr real das versões instaladas (2.1.258 / 0.152.1) sob
falha genuína; revisão independente por Codex do próprio supervisor; política de
merge order quando 2 branches `orch/*` tocam áreas adjacentes. **Não ligado a
tasks reais do GSD. P03 segue bloqueada por P02.**

Runtime em `.orchestration/` é gitignored (exceto `config.json` + `README.md`).

---

## Estado corrente — 2026-09-02

Valores mutáveis não são copiados aqui — consultar a fonte.

| Campo | Fonte autoritativa |
|---|---|
| Branch / HEAD / origin sync | `git status` · `git log -1` · `supervisor.ps1 status` |
| Fase GSD ativa / waves / progresso | `.planning/STATE.md` |
| Índice de tasks + gates + dependências | `.orchestration/execution-index.json` (`supervisor.ps1 index`) |

Instantâneo (2026-09-02, pode envelhecer):

- Branch `main`; HEAD = commit de hardening da orquestração (ver `git log -1`).
- Fase GSD ativa **03.1**. P00 PASS, P01 auto PASS.
- **P02 — Tenant isolation e RBAC**: T01–T11 done + testes verdes; **aguardando
  gates humanos T12 (HUMAN_APPROVAL) e T13 (MANUAL_UAT)** — ver
  `03.1-P02-T12-T13-HANDOFF.md`.
- Próxima wave **P03 (storage privado) — bloqueada até P02 = PASS**. P03+ não iniciar.
- `supervisor.ps1 next` → "no READY task" (correto: P03 depende de P02 não resolvida).

### Última tarefa concluída

**Discovery de produto (2026-09-01)** — sessão de exploração local do produto
pelo owner, formalizada em
`phases/03.1-.../03.1-DISCOVERY-UAT-2026-09-01.md`:
9 achados (D-1..D-9) classificados (BUG / MOCK / FEATURE INCOMPLETA / REQUISITO
NOVO / DESIGN GAP), matriz de paridade web/mobile, MUST-HAVE vs pós-MVP, e
encaixe nas waves existentes de 03.1 + Fase 4 **sem alterar o plano existente**
(só addenda). 3 ADRs novas (015 audit trail, 016 transições de estado, 017
billing provider-agnostic/Mercado Pago).

### Próxima tarefa

**Humano:** executar os gates de P02 conforme
`03.1-P02-T12-T13-HANDOFF.md` (aplicar migrations 4/5/6 em DB persistente +
UAT A/B). **Nenhum agente executa T12/T13.**

**Agente (quando P02 = PASS):** planejar/executar P03 (storage privado). Os
addenda do discovery entram naturalmente quando P04/P06/P07/P07.5 forem
planejadas — não antecipar.

### Testes — última execução (2026-09-01, pré-discovery)

| Suite | Comando | Resultado |
|---|---|---|
| Backend completa | `pnpm --filter @orcivo/backend test:ci` (infra test compose) | 16 suites, 100 passed / 5 todo / 0 fail |
| Tenant/RBAC A/B | `p02-tenant-rbac.isolation.spec.ts` | 35 passed |
| Idempotência | `idempotency.isolation.spec.ts` | 10 passed |
| Migrate-from-zero + upgrade | DB efêmero (`orcivo_verify`) | zero drift |
| Docker backend build + `/health` | — | 200 `{"status":"ok"}` |

O discovery **não tocou código de app** — nenhuma re-execução necessária.

### Ambiente para retomar

- Node 20+ / pnpm 9 / Docker Desktop.
- `pnpm install` na raiz; `pnpm --filter @orcivo/shared-types build`.
- Dev infra: `pnpm dev:infra` (Postgres host **5544**, Redis 6379, MinIO 9000/9001).
- Schema: `npx prisma generate && npx prisma migrate deploy` (**nunca `db push`**).
- Test infra: `docker compose -f infra/docker-compose.test.yml up -d`
  (Postgres 5433, Redis 6380, MinIO 9002); `.env.test` a partir de
  `apps/backend/.env.test.example`.
- Mobile em device físico: `EXPO_PUBLIC_API_URL` = IP LAN da máquina.
- `.env` files são locais/gitignored — não versionar.

### Blockers

- P02 T12/T13 são gates humanos — não há blocker técnico, só aprovação.
- Mobile `.eslintrc` ainda tem o bug de `parserOptions.project` quando rodado da
  raiz (backend já corrigido; mobile pendente — anotado em P08).
- Hook do GSD reescreve o frontmatter de `STATE.md` (`status: verifying`,
  `percent: 63`) — o corpo do arquivo é a fonte confiável.

### Decisões tomadas por agente (Nível B) nesta sessão

- Discovery classificado sem implementar nada (respeita gate de P02/P03).
- Achados encaixados nas waves **existentes** via addenda, não reescrevendo
  planos; só **P07.5** é wave nova (audit trail é escopo grande e transversal).
- `D-6` (mobile Agenda/Financeiro/Config/Equipe/Plano): classificado **fora de
  escopo mobile** por causa do dual-surface do `PROJECT.md` (mobile = campo,
  web = gestão) — não é bug. Só Home útil + Cliente detalhe entram (Fase 4).
- ADR-008 (Asaas) marcada Superseded para escolha de provedor; ADR-017 fixa
  arquitetura provider-agnostic. **Nada implementado.**

### Decisões humanas pendentes (Nível C)

- P02-T12: aplicar migrations em DB persistente + backfill.
- P02-T13: UAT manual A/B.
- P06: escolha formal do provedor de billing + criar conta / credenciais /
  sandbox Mercado Pago (ADR-017).
- Qualquer hard delete de dados de cliente (P07-T04).

### Arquivos principais tocados nesta sessão

```
.planning/phases/03.1-.../03.1-DISCOVERY-UAT-2026-09-01.md   (novo)
.planning/AGENT-HANDOFF.md                                    (novo)
.planning/ROADMAP.md                                          (editado: header, P04/P06/P07 notas, P07.5, Fase 4)
.planning/phases/03.1-.../03.1-P04-PLAN.md                    (addendum T15-T19: máquina de estados)
.planning/phases/03.1-.../03.1-P06-PLAN.md                    (addendum T17-T20: provider-agnostic)
.planning/phases/03.1-.../03.1-P07-PLAN.md                    (addendum T14-T16: company/PIX/pagamento/sidebar)
docs/decisions/ADR-015-business-audit-trail.md               (novo)
docs/decisions/ADR-016-explicit-state-transitions.md         (novo)
docs/decisions/ADR-017-billing-provider-agnostic-mercadopago.md (novo)
```

### O que NÃO refazer

- Não re-auditar a retomada de estado — está confirmada.
- Não reabrir P00/P01/P02 T01–T11 — concluídos e verdes.
- Não implementar os achados do discovery agora — respeitar a ordem GSD.
- Não recriar design — o visual web foi aprovado pelo owner.
- Não aplicar migrations em DB persistente — gate humano.

### Comandos para retomar rápido

```bash
git -C <repo> log --oneline -5
cat .planning/STATE.md
cat .planning/phases/03.1-estabilizacao-pos-fase-3/03.1-P02-SUMMARY.md
cat .planning/phases/03.1-estabilizacao-pos-fase-3/03.1-DISCOVERY-UAT-2026-09-01.md
```

---

## Histórico de handoff

| Data | Agente | Entregue | HEAD ao fechar |
|---|---|---|---|
| 2026-09-02 | Claude | **Remediação de segurança da orquestração.** V1 marcado `LEGACY_REJECTED_REFERENCE_ONLY` (guard bloqueia run/loop/cleanup; regressão 23/23 preservada). V2 security spine clean-room em `scripts/orchestration/v2/` (namespace `.orchestration/v2/`): ledger monotônico content-addressed (C-01), contract freeze + protected paths + post-diff scope (H-06/M-01/M-03), attestations content-addressed + staleness (C-03), review envelope JSON fail-closed (C-02/H-03/M-05), leases atômicas 4 namespaces + integração serial + fetch/CAS (H-05/H-04), preflight obrigatório + human gate durável (H-07/C-04 parcial), classificação por control channel + corpus negativo (H-01), streaming redaction + secret scan (H-11), Win32 argv/ID grammar (H-12). Suíte adversarial 40/40 (`v2/tests/`, repos descartáveis, sem modelo). Docs: THREAT-MODEL + ATTESTATIONS. Deferidos: C-05/C-06/H-08/H-09/H-10 + smoke real. NÃO production-ready; NÃO READY_FOR_CANARY. `READY_FOR_SECOND_SECURITY_REVIEW = YES`. | (ver `git log -1`) |
| 2026-09-02 | Claude | Supervisor de orquestração production-ready: reconciliador real (`reconcile.ps1`), scheduler `loop`, scope-conflict, `merge.ps1` (safe merge, sem force/reset), reviewer cruzado (`review.ps1`), classificação de falha (12 classes), redaction endurecida, `recover`. Suite determinística 23/23 (`tests/`, fake-agent, sem chamadas de modelo). Drift documental corrigido (CLAUDE.md deixa de afirmar Fase 0). Não ligado a tasks reais; P02/P03 inalterados. | (ver `git log -1`) |
| 2026-09-02 | Claude | Camada de orquestração multi-agente: SETUP + POC (14/14). `scripts/orchestration/` + `docs/runbooks/agent-orchestration.md`. orca-cli descartado (esqueleto abandonado). Não ligado a tarefas reais. P02/P03 inalterados. | `ae668f4` |
| 2026-09-01 | Claude (Decision Agent) | Discovery de produto incorporado ao planejamento; ADRs 015/016/017; addenda P04/P06/P07; wave P07.5. P02 segue aguardando T12/T13. | `0260a72` |
| 2026-09-01 | Claude | Handoff T12/T13 de P02 preparado (`03.1-P02-T12-T13-HANDOFF.md`); dev local destravado (Postgres 5544, seed via node TS-strip). | `c5fbf04` |
| 2026-09-01 | Claude | P02 T11 (request idempotency mobile) + auditoria de write-path. | `7628802` |
