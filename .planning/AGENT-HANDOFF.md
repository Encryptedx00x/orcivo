# AGENT-HANDOFF — Orcivo

Documento de continuidade entre agentes (Claude ↔ Codex/GPT ↔ humano).
**Versionado.** Cada agente que fecha uma sessão de trabalho atualiza a seção
"Estado corrente" e adiciona uma linha no "Histórico de handoff".

> Regras: não commitar secrets/.env/tokens/prompts/transcripts aqui. Datas
> absolutas. Este arquivo descreve o estado; a fonte de verdade do GSD continua
> em `.planning/STATE.md`, `ROADMAP.md` e os `phases/*/`.

---

## Estado corrente — 2026-09-01

| Campo | Valor |
|---|---|
| Branch | `main` |
| HEAD | `c5fbf04` (antes do commit de discovery) |
| origin/main | ahead/behind `0/0` |
| Working tree | modificações de planejamento pendentes de commit (discovery) |
| Fase GSD ativa | **03.1 — Estabilização pós-Fase 3** |
| Waves verificadas | P00 PASS, P01 PASS (auto) — 2/13 |
| Wave em andamento | **P02 — Tenant isolation e RBAC**: T01–T11 done + testes verdes; **aguardando gates humanos T12 (HUMAN_APPROVAL) e T13 (MANUAL_UAT)** |
| Próxima wave | P03 (storage privado) — **bloqueada até P02 = PASS** |
| P03+ | não iniciar |

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
| 2026-09-01 | Claude (Decision Agent) | Discovery de produto incorporado ao planejamento; ADRs 015/016/017; addenda P04/P06/P07; wave P07.5. P02 segue aguardando T12/T13. | (commit de discovery — ver git log) |
| 2026-09-01 | Claude | Handoff T12/T13 de P02 preparado (`03.1-P02-T12-T13-HANDOFF.md`); dev local destravado (Postgres 5544, seed via node TS-strip). | `c5fbf04` |
| 2026-09-01 | Claude | P02 T11 (request idempotency mobile) + auditoria de write-path. | `7628802` |
