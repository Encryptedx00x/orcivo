# AGENT-HANDOFF — Orcivo

Documento de continuidade entre agentes (Claude ↔ Codex/GPT ↔ humano).
**Versionado.** Cada agente que fecha uma sessão de trabalho atualiza a seção
"Estado corrente" e adiciona uma linha no "Histórico de handoff".

> Regras: não commitar secrets/.env/tokens/prompts/transcripts aqui. Datas
> absolutas. Este arquivo descreve o estado; a fonte de verdade do GSD continua
> em `.planning/STATE.md`, `ROADMAP.md` e os `phases/*/`.

---

## Orquestração — PRAGMATIC V2.1 (2026-09-03) — THREAT_MODEL = LOCAL_TRUSTED_HOST

**O OWNER fixou o threat model.** As quatro revisões anteriores (V1, spine 1/3/4,
V2.1 architecture) rodaram contra um modelo zero-trust-do-host *implícito*. Agora:

- `THREAT_MODEL = LOCAL_TRUSTED_HOST` — o Windows local do owner e o usuário
  Windows são TRUSTED.
- `HOST_SAME_USER_ATTACKER = OUT_OF_SCOPE`;
  `ZONE_A_D_SEPARATE_WINDOWS_IDENTITIES = NOT_REQUIRED`.
- Findings cujo único exploit é adulteração same-user do host →
  `ACCEPTED_RISK_OUT_OF_SCOPE` (AR-01..AR-06): C-05, C-06, H4-01, H4-02(junction),
  H4-05, M4-02, M4-03, Zone A/D SID, docker daemon launch authority.
- Findings de correção genuína aplicados (não aceitos): **H4-06** (INTEGRATION_INTENT
  + Resolve-RemoteTruth substitui o seam pós-push que falsificava a verdade remota),
  **M4-04** (todo caminho de falha de integração grava evento durável), **H4-04**
  (`createdAt` entra no hash da attestation), **H4-03 parcial** (scan de secret
  decodifica UTF-8/UTF-16LE/UTF-16BE + bytes do candidate commitado).

Config: `.orchestration/v2/config.v2.json` → `threatModel` / `acceptedRisks` +
`taskClassifier` / `router` / `providerFailover` / `correctionLoop` /
`integrationIntent` / `generation`. Threat model completo:
`docs/agents/ORCHESTRATION-THREAT-MODEL.md` (reescrito). Closeout completo:
`.planning/reviews/PRAGMATIC-V2.1-CLOSEOUT.md`.

**Camada de autonomia construída** (sobre a spine V2, `scripts/orchestration/v2/`):

| módulo | responsabilidade | PARTE |
|---|---|---|
| `taskclass.ps1` | classifier semântico (blast radius / reversibilidade / domínio) + safety floors; agent opcional só eleva | 11 |
| `router.ps1` | router adaptativo profile→capability (sem modelo pinado; sonda `--help` real) + `Select-Reviewer` (provider oposto) | 12/16/28 |
| `providers.ps1` | failover Claude↔Codex (só control channel), `WAITING_PROVIDER`, wait record durável, poll backoff, auto-resume, restart-resume | 13/14 |
| `continuation.ps1` | rollover de contexto (whitelist fechada, sem raciocínio oculto); context exhaustion ≠ quota ≠ failover | 15 |
| `fence.ps1` | run generation fencing; provar run anterior inativo → fence → RECOVERED → nova generation; indeterminável → WAITING_HUMAN | 9 |
| `intent.ps1` | `INTEGRATION_INTENT` + `Resolve-RemoteTruth`; origin é a verdade; `AMBIGUOUS_REMOTE` em vez de falso NOT_PUBLISHED; nunca re-publica | 8 |
| `correction.ps1` | loop de correção bounded; novo candidate + nova review por ciclo; budget → `FAILED_REVIEW_BUDGET` | 17 |
| `taskgraph.ps1` | ciclos / deps ausentes / estados malformados / Level C / deps bloqueadas | 19 |
| `v2.1.ps1` | entrypoint (`status` / `selftest` / `wave0` / `explain`) | — |

Novos estados do ledger: `WAITING_PROVIDER`, `FAILED_REVIEW_BUDGET`,
`REMOTE_RECONCILING`, `NOT_PUBLISHED_CONFIRMED`, `AMBIGUOUS_REMOTE`.

**Suítes (sem chamadas de modelo):**
- V1 primitivas **8/8** · V2 adversarial **108/108** (`spine.ps1 selftest`) — sem regressão.
- 8 module selftests **8/8** (`v2.1.ps1 selftest`).
- **Deterministic Wave 0 30/30** (`v2.1.ps1 wave0` — W0-01..W0-30, repos descartáveis, NC-01).

**Real provider smoke:** trivial one-shot com autenticação JÁ EXISTENTE (temp dir,
sem repo, sem secrets). `codex exec` → PONG (gpt-5.6-sol, sandbox read-only).
`claude -p --output-format json` → `{"result":"PONG","is_error":false}` (claude-sonnet-5).
Ambos `PASS`.

**Não** ligado a task real: NC-01 mantém execução real estruturalmente desabilitada
(sem verbo `run`). A Docker Linux containment é a mecânica pretendida, ainda não
construída — sob LOCAL_TRUSTED_HOST o worktree é scope boundary aceitável para o
piloto e candidate code nunca roda no supervisor (Wave 0 W0-02).

**Product Batch:** `.planning/product/MVP-PRODUCT-BATCH-1.md` — **PROPOSAL ONLY**,
P-01..P-23 reconciliados com discovery D-1..D-9 + roadmap + ADR-015/016/017.
Para em `OWNER_APPROVAL`. Nada implementado.

**Próximo passo do OWNER:** revisar o MVP Product Batch #1; resolver P02 T12/T13
quando apropriado; autorizar o primeiro lote de desenvolvimento real. P03 continua
bloqueada até P02 = PASS (não alterado).

---

## Orquestração — TERCEIRA REMEDIAÇÃO DE SEGURANÇA (2026-09-02) — V2 SECURITY SPINE

**Três revisões independentes REJEITARAM o trabalho.** O terceiro review
(`.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW-3.md`,
`SECURITY_SPINE_REVIEW = FAIL`) reproduziu, contra controles que a 2ª remediação
declarava corrigidos: procedimento de verificação controlado pelo caller
(`CheckBlock`), APPROVE de review com tipos JSON errados (objeto/null/string onde
o schema pede array), escape de fence no prompt de review, quarentena de lease
malformada não-persistente, grant de protected-path com wildcard, tamper +
refreeze retornando contrato adulterado, secret em formato JSON sobrevivendo à
redação, e observação de fetch `NO_REMOTE` forjada.

**Esta sessão fez a terceira remediação** — relatório completo em
`.planning/reviews/THIRD-SPINE-REMEDIATION-REPORT.md`. Cada exploit virou teste
de regressão permanente:

- **H3-01** — pipeline autoritativa NÃO aceita mais nenhum `ScriptBlock`
  (`-CheckBlock`/`-PostIntegrationCheck` removidos). Verificação = profile
  declarativo congelado; `effectiveInvocationHash` canônico e result-independent
  entra na attestation e é **recomputado** pelo integrator.
- **H3-02** — UMA biblioteca canônica de secret (`redaction.secretPatterns`)
  para redactor E scanner; scan recursivo pré-publicação DENTRO de
  `Invoke-Integration` antes de qualquer push → `SECRET_LEAK_BLOCKED`.
- **H3-03** — spec/acceptance/diff não confiáveis transportados **fora de banda**
  em arquivos read-only ligados por SHA-256; sem fence textual fixo.
- **H3-04** — lease malformada → marker de quarentena **durável**; todo acquire
  recusa até `Repair-QuarantinedLease` (recovery explícito, auditado).
- **H3-05** — grant de protected-path tem de ser membro exato de
  `contract.grantableProtectedPrefixes`; sem glob/root/parent/".planning inteira".
- **M3-01** — envelope de review validado com parser que preserva tipo JSON cru
  (`ConvertFrom-JsonTyped`); objeto/null/string onde se espera array → rejeitado.
- **M3-02** — refreeze roda a validação completa recompute-on-read antes de
  retornar contrato existente.
- **M3-03** — observação de fetch é autoridade **in-process** (session token);
  sem caminho de dispatch `NO_REMOTE`; `last-fetch.json` é só auditoria.
- **#9** — preflight liga o índice derivado ao contrato congelado (`taskId`,
  `gate`, `dependencies`).
- **#10** — regressões determinísticas de after-CAS-push-reject (hook real) /
  ancestry-failure / tree-mismatch (seam só do harness descartável).
- **L3-01** — docs corrigidas: sem heartbeat de background; identidade de
  processo vivo é o controle load-bearing.

- Suítes: V1 primitivas **8/8**; V2 adversarial **108/108**
  (`spine.ps1 selftest`), repos descartáveis, sem chamadas de modelo. Os 86
  testes anteriores foram mantidos (nenhum substituído por teste mais fraco).
- Deferidos (não viraram PASS): **C-04 completo, C-05, C-06, H-02 completo,
  H-08, H-09 completo, H-10** + smoke real Claude/Codex. Nenhum entrypoint de
  task real.
- **NÃO** production-ready. **NÃO** READY_FOR_CANARY.
- `READY_FOR_FOURTH_SECURITY_REVIEW = YES`. Só o Codex independente pode
  declarar `SECURITY_SPINE_REVIEW = PASS`.

---

## Orquestração — SEGUNDA REMEDIAÇÃO DE SEGURANÇA (2026-09-02) — V2 SECURITY SPINE

**Duas revisões independentes REJEITARAM o trabalho até agora:** o supervisor V1
(`.planning/reviews/ORCHESTRATION-SUPERVISOR-INDEPENDENT-REVIEW.md`) e a primeira
espinha V2 (`.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW.md`,
`SECURITY_SPINE_REVIEW = FAIL`, `NEXT_REMEDIATION_STAGE_ALLOWED = NO`). O segundo
review reproduziu de forma independente: corrupção de ledger sob concorrência,
APPROVE de review schema-inválido, attestation "fresh" após mutação de contrato,
publicação sem push, quebra de lease vivo, protected dot-path quebrado, preflight
aceitando versão ausente do índice, e secret sintético cru em caminhos de falha.

**Esta sessão fez a segunda remediação:** cada exploit reproduzido pelo Codex
virou teste de regressão versionado. Ver `.planning/reviews/`, `spine.ps1 explain`
e o relatório `SECOND_SPINE_REMEDIATION` na sessão.

- V1 `run`/`loop`/`cleanup` **permanentemente desabilitados, sem override**
  (`ORCH_V1_REGRESSION_HARNESS` removido). Suíte de primitivas V1 reduzida para
  os checks que ainda têm valor e só usam `index`/`next`/`recover`/`status`
  (**8/8 verde**). Os testes behaviorais de `run`/`loop`/`merge` foram removidos
  porque o code path não existe mais.
- V2 pipeline (`Invoke-SpineRun`) movido para `scripts/orchestration/v2/tests/`
  e protegido por `Assert-DisposableRoot` (NC-01: estrutural, sem env var).
  `spine.ps1` não tem verbo `run`.
- Suítes: V1 primitivas **8/8**; V2 adversarial **86/86** (`spine.ps1 selftest`),
  repos descartáveis, sem chamadas de modelo.
- Fixados + re-testados adversarialmente: **C-01, C-02, C-03, H-01, H-03, H-04,
  H-05, H-06, H-07, H-11, H-12, M-01, M-03, M-05** + novos findings **NC-01,
  NH-01, NH-02, NM-01, NM-02** (NL-01 coberto). **C-04 e H-02 parciais.**
- Deferidos (cada um precisa de revisão própria; **não** viraram PASS): **C-05,
  C-06, H-08, H-09 completo, H-10** + smoke real Claude/Codex. Nenhum entrypoint
  de task real.
- **NÃO** production-ready. **NÃO** READY_FOR_CANARY. Nenhuma task real / P03 /
  T12 / T13 / DB persistente tocada.
- `READY_FOR_THIRD_SECURITY_REVIEW = YES`. Só o Codex independente pode declarar
  `SECURITY_SPINE_REVIEW = PASS`.

Detalhe: `docs/agents/ORCHESTRATION-THREAT-MODEL.md`,
`docs/agents/ORCHESTRATION-ATTESTATIONS.md`,
`docs/runbooks/agent-orchestration.md`.

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
