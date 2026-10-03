# AGENT-HANDOFF — Orcivo

Documento de continuidade entre agentes (Claude ↔ Codex/GPT ↔ humano).
**Versionado.** Cada agente que fecha uma sessão de trabalho atualiza a seção
"Estado corrente" e adiciona uma linha no "Histórico de handoff".

> Regras: não commitar secrets/.env/tokens/prompts/transcripts aqui. Datas
> absolutas. Este arquivo descreve o estado; a fonte de verdade do GSD continua
> em `.planning/STATE.md`, `ROADMAP.md` e os `phases/*/`.

---

## Estado corrente — 2026-10-03 — MVP-LAUNCH-BATCH-2 publicado, deploy em produção feito

FASE A (16/16 tasks do batch) e FASE B (deploy VPS) concluídas nesta sessão.
Produção rodando com Mercado Pago real (`MP_ENV=production`, backend loga
"Mercado Pago initialized in production mode" sem expor segredo). Migrations
aplicadas, seed de planos confirmado, 4 domínios + webhook (401 sem
assinatura) testados, zero regressão nos outros 7 sites da VPS.

Único item que ainda depende do owner: `L2-P02-mp-production-activation`
AC3 — confirmar com um pagamento Pix real de baixo valor (Orcivo Solo,
R$9,90) + estorno pelo painel MP. Em andamento pelo owner no momento deste
registro; próxima sessão deve consultar `webhook_events`/`subscriptions`
na produção pra confirmar e então marcar a task como concluída.

**MP_PRODUCTION confirmado em 2026-10-03 pelo owner**: Pix real de R$9,90
(Orcivo Solo) pago, subscription `19cd5569` foi TRIALING→ACTIVE,
`webhook_events` com `payment.created`+`payment.updated` PROCESSED sem
duplicar. Gate aprovado, `L2-P02-mp-production-activation` concluída.
Falta só o owner estornar esse pagamento de teste pelo painel MP.

**Bugs reais de UX achados pelo owner no teste (checkout Pix, registrar
como tasks novas na próxima sessão):**
1. Ao sair da página de checkout com um Pix pendente gerado, não existe
   NENHUM jeito de recuperar aquele QR Code/código depois — a tela
   "Gerenciar assinatura" só mostra "pagamento pendente" sem link pra
   voltar ao Pix. Owner teve que cancelar o plano e assinar de novo pra
   gerar um Pix novo. Precisa: botão "ver Pix pendente" / persistir e
   expor o QR+código enquanto o pagamento não expira.
2. Sem botão de copiar o código Pix "copia e cola" — hoje é só um
   `<textarea readOnly>` em `apps/web/app/(app)/plano/checkout/checkout-form.tsx`,
   o usuário tem que selecionar e copiar manualmente. Adicionar um botão
   "Copiar código".

**Verificação pedida pelo owner (criar tasks, ainda não feito):** confirmar
que os limites/benefícios de `PLAN_LIMITS` (customers_max, quotes_per_month,
work_orders_per_month, members_max, has_logo, pdf_watermark, has_reports,
has_contracts) são realmente **aplicados** ao assinar um plano superior
(ex. Livre→Mais libera 200 clientes de fato, remove watermark do PDF) E
**retirados** ao fazer downgrade pra um plano inferior (ex. Mais→Livre
volta o limite de 5 clientes, volta o watermark, bloqueia report/contrato)
— incluindo o caso de já ter dados acima do novo limite (o que acontece
com os clientes 6-200 se cair pra Livre?). Checar `plan-limits.service.ts`
e os guards que usam `check-plan-limit.decorator.ts`.

**Pendências abertas (não bloqueantes, registradas 2026-10-03):**
- **Bug mobile (app nativo):** depois de tocar em "Começar" na tela de
  login, o painel continua com estilo web (não nativo) — usabilidade ruim
  no app. Owner reportou direto, ainda não investigado/corrigido.
- **Responsividade mobile do site/web (navegador no celular):** owner
  reportou que signup, login, dashboard e as telas internas do `apps/web`
  não são responsivas em tela de celular — crítico porque hoje é o único
  caminho real pra acessar pelo celular enquanto o app nativo não tem
  `.apk` publicado. Precisa de um levantamento tela por tela (provável
  causa: componentes com larguras fixas/px em vez de flex/grid responsivo)
  e tasks de correção — ainda não investigado, próxima sessão deve
  começar por aqui dado o impacto.
- **Download do app:** `apps/site/app/download/page.tsx` criado (rota
  `/download`, só Android, aponta para
  `https://s3.orcivo.com.br/orcivo-public/orcivo-latest.apk`), mas esse
  arquivo **não existe ainda** — nenhum build do app foi gerado. Falta:
  (1) conta Expo/EAS do owner pra rodar `eas build --profile preview
  --platform android` (gera o .apk, não precisa de Android SDK local);
  (2) subir o .apk resultante pro bucket MinIO `orcivo-public` nesse
  caminho exato. iOS trava até o owner assinar o Apple Developer Program
  (US$99/ano) — pré-requisito dele, não técnico. Lembrar da regra do
  próprio CLAUDE.md: não publicar em lojas antes de 3+ técnicos reais
  validarem o produto — o .apk direto do site é o caminho certo por ora.

## Estado corrente — 2026-10-01 — AUTONOMIA TOTAL CONCEDIDA (overnight)

Owner (sessão de lançamento, 2026-10-01, tarde da noite): "Gere todas as
tasks para rodar no autopilot ... pode seguir de forma 100% autônoma
decidindo o que tiver waiting for human por mim ... Até mesmo restrições dos
planos e valores se quiser alterar você tem permissão ... Você que manda a
partir de agora, até amanhã. Quero tudo pronto quando acordar." Única
exceção real: credenciais de produção do Mercado Pago + cadastro do webhook
no painel MP (`L2-P02-mp-production-activation`) — isso fica esperando o
owner, todo o resto não.

**Novo batch criado e reconciliado:** `.planning/product/MVP-LAUNCH-BATCH-2`
(`.md` + `.tasks.json` + `.plan.json`, 15 tasks `L2-*`, 1 Level C). Cobre
Passo 1 (fonte única de preços/limites — decisão tomada com o owner via
AskUserQuestion em 2026-10-01, ver `ownerDecisions.PRICING` no
`.tasks.json`), Passo 2 (Mercado Pago substituindo Asaas), Passo 3 (landing/
SEO), Passo 4 (Termos/Privacidade completos) e Passo 5 (reset de senha,
Resend, infra). `batch-reconcile.ps1` rodou OK; `dispatchableNow`:
`L2-P05-email-resend-setup`, `L2-P02-mercadopago-provider`,
`L2-P05-password-reset-invite-ui`, `L2-P03-site-seo-metadata`,
`L2-P01-plan-source-of-truth`.

**Sequenciamento decidido:** o Batch 1 (`PB1-*`) já tinha 23 tasks
`WAITING_PROVIDER` e um checkpoint `AGENT_FAILURE` em
`PB1-P13-dead-cta-audit-pass` quando esta sessão começou — nenhuma lease
`scheduler/main` ativa (todas órfãs/liberadas). Decisão: **deixar o Batch 1
terminar primeiro** antes de trocar para o Batch 2.

**BATCH 1 = 100% CONCLUÍDO (2026-10-01).** Depois de corrigir dois bugs reais
(ver abaixo) e destravar 3 defers obsoletos (`PB1-P17`, `PB1-P13`,
`PB1-P02-audit-read-and-ui`), o `pilot.ps1 run` retornou
`IDLE: no READY tasks; graph complete`. Verificação cruzada: **todas as 43
tasks `PB1-*`/`PB1-M*` têm commit `feat: <taskid>` correspondente** (70
commits `feat: pb1*` no histórico, incluindo retries) — confirmado também
por existência real de código (ex. `apps/backend/src/audit/` já tem
`audit.service.ts`, `audit-read.service.ts`, etc., apesar de
`batch-reconcile.ps1` listar essas tasks como "Level C pendente" — essa
lista é só análise estática do `tasks.json`, não olha ledger/git, então não
é confiável para saber o que já foi feito). `config.v2.json` atualizado:
`batchPlanFile`/`taskSourceFile` agora apontam para `MVP-LAUNCH-BATCH-2`.

**Dois bugs reais do dispatcher corrigidos nesta sessão** (test-first,
commits no histórico):
1. `needsFreshDispatch` não incluía `TEST_FAILURE` — resumir uma task nesse
   status crashava em vez de começar uma tentativa limpa (reproduzido em
   `PB1-P19-mobile-home-customer`). Regressão `RD-226`.
2. `PB1-P13-dead-cta-audit-pass` tinha `protectedPathGrants: [".planning/reviews/"]`
   mas `scope` nunca incluía esse caminho (listava `.planning/product`, o
   caminho que a própria task dizia NÃO usar) — toda escrita do relatório
   era rejeitada como "out-of-scope". Esse era o motivo real dos
   `AGENT_FAILURE` repetidos há várias sessões, não falta de investigação.

**O que NÃO fazer (reforçado pela autonomia total):** autonomia total não
significa pular os "Não fazer" estruturais abaixo (editar ledger/approvals/
checkpoints à mão, usar reset/force-push, simular provider). Significa não
pausar em `WAITING_HUMAN`/Level C deste batch — decidir e seguir, documentando
a decisão.

---

## Estado corrente — 2026-09-25 — AUTOPILOT ATIVO

`main`/`origin/main` continham `b085e83` antes desta atualização documental.
O dispatcher agora congela corretamente critérios inline (`AC1; AC2; AC3`) e
permite retry/failover limitado somente sobre um snapshot parcial exato,
assinado e policy-compliant. Regressões RD-197, RD-207, RD-208, RD-209,
RD-221 e RD-222: PASS.

O autopilot está em `PB1-P06-dead-contact-ctas`, task version
`d14e15a25ed1cfe00b4cf6e373df7dcb2ab84cec06d6907156f6e788a020368b`,
run `run-fa985eff349d445985f1649df6ece086`. Último estado observado:
`WAITING_PROVIDER / IMPLEMENT`, provider `claude`, após `RATE_LIMIT`. O
backoff é durável e o trabalho parcial do candidato está preservado pelos
snapshots de invocação/resultado.

### Próxima ação exata

No root do repositório:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\orchestration\v2\pilot.ps1 status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\orchestration\v2\pilot.ps1 run
```

Se um processo `pilot.ps1 run` já possuir a lease `scheduler/main`, monitorar
esse processo em vez de iniciar outro. Caso contrário, manter o segundo comando
em foreground e acompanhar backoff, implementação, check, review por provedor
oposto, integração, publicação e as tasks seguintes da fila. Corrigir bugs
mecânicos do dispatcher test-first, commitar/push normal e retomar o mesmo run.

### Autoridade já concedida pelo owner

Decidir autonomamente todas as escolhas técnicas reversíveis e todos os
`WAITING_HUMAN` da fila, exceto uma solicitação literalmente humana de operar e
avaliar visualmente app/site. Commit e push normais estão autorizados. Não
pedir aprovação para decisões técnicas rotineiras.

### Não fazer

- Não editar manualmente managed candidate workspace, dispatcher JSON, ledger,
  approvals, checkpoints ou attestations.
- Não usar reset, stash, clean, force-push, reescrita de histórico ou comandos
  destrutivos.
- Não iniciar segunda implementação nem descartar o parcial existente.
- Não simular provider, copiar prompt manualmente ou usar a sessão interativa
  como implementadora; o supervisor deve lançar CLIs reais.
- Não invocar providers fora do fluxo oficial nem fazer probes desnecessários.
- Parar somente antes de ação destrutiva ou decisão visual/de negócio realmente
  humana.

Evidência viva: `.orchestration/v2/dispatcher/current.json`,
`.orchestration/v2/logs/spine.log`, `pilot.ps1 status` e
`.planning/product/MVP-PRODUCT-BATCH-1.plan.json`.

---

## P03 = PASS — T10/T13 executados (2026-09-04)

O owner autorizou **explicitamente** T10 e T13, incluindo a orientação para
determinar o ambiente real antes de tratar como produção. Executados nesta
sessão:

- **Ambiente identificado primeiro:** `apps/backend/.env` aponta para
  `localhost:9000`; `docker ps` mostra que o único MinIO de aplicação
  alcançável deste host é `orcivo_minio_dev` (dev). `infra/docker-compose.yml`
  (produção) é feito para rodar na VPS e não está em execução aqui — confirma
  o que a sessão de P02-T12 já havia registrado (produção real = VPS
  `/opt/orcivo`, sem creds neste host). **`STORAGE_ENVIRONMENT = LOCAL_DEV`.**
- **T10 = PASS.** Os buckets `orcivo-pdfs`/`orcivo-photos` ainda carregavam a
  policy pública legada (`Principal:"*"`, do build anterior ao T03). Snapshot
  da policy salvo para rollback; `setBucketPolicy(bucket,'')` aplicado (mesma
  operação do `onModuleInit`) — nenhum outro bucket tocado. Verificado depois:
  policy = `NoSuchBucketPolicy` (privado), objetos preservados (2 PDFs + 6
  fotos, contagem idêntica), GET anônimo → 403, signed URL → 200, assinatura
  adulterada → 403. Rollback documentado, não usado.
- **T13 = PASS.** Suite nova `apps/backend/src/storage/storage.e2e.spec.ts` —
  app real + DB de teste efêmero + MinIO de teste real (sem mock de storage):
  dono abre PDF/foto via signed URL resolvida (conteúdo byte-a-byte), signed
  URL re-emitida continua válida, acesso anônimo direto negado, assinatura
  adulterada negada, assinatura inválida negada, cross-tenant negado (quote e
  fotos). **8/8 PASS.** TTL/expiração/magic-bytes/path-traversal já cobertos
  por T11 (`storage.isolation.spec.ts`, 12 testes). Único item genuinamente
  manual: confirmação visual de renderização na tela — não bloqueia T13.
- Suite backend completa após a mudança: **18 suites, 120 passed / 5 todo / 0
  fail** (`pnpm --filter @orcivo/backend test:ci`).
- `scripts/orchestration/v2/batch-reconcile.ps1` **corrigido**: antes
  assumia (hardcoded) que os gates `P02-T12`/`P02-T13`/`P03` ficariam
  `WAITING_HUMAN`/`BLOCKED_BY_P02` para sempre; agora lê o estado real do
  `.tasks.json` e calcula `gatesPassed` + `dispatchableNow` (tasks
  gate-satisfeitas, não Level C, sem dependência de task pendente). Rodado
  contra `MVP-PRODUCT-BATCH-1.tasks.json` (gates atualizados para `PASS`) →
  `.plan.json` regenerado, `ok: true`.

Evidência: **`phases/03.1-.../03.1-P03-T10-T13-RESULT.md`**. Docs
atualizados: `STATE.md`, `ROADMAP.md`, `03.1-P03-PROGRESS.md`,
`03.1-P03-PLAN.md`, `MVP-PRODUCT-BATCH-1.md`,
`MVP-PRODUCT-BATCH-1-EXECUTION.md`, `MVP-PRODUCT-BATCH-1.tasks.json`,
`MVP-PRODUCT-BATCH-1.plan.json`.

**P03 = PASS · P04 = UNBLOCKED.** `dispatchableNow`:
`PB1-P03-sidebar-real-identity`, `PB1-P19-mobile-home-customer`,
`PB1-P06-dead-contact-ctas`, `PB1-P16-free-plan-15-os`,
`PB1-P11-customer-pdf-download`. `PB1-P02-audit-service` (P04 lead task) é
Level C — `WAITING_HUMAN` para gate próprio, mesmo com P02/P03 satisfeitos.
**Esta sessão não implementou nenhuma task `PB1-*`** — por instrução
explícita do owner, a execução real do product batch é do autopilot
dispatcher, não desta sessão de planejamento.

---

## P02 = PASS — T12/T13 executados (2026-09-03)

O owner autorizou **explicitamente** T12 e T13. Executados nesta sessão:

- **T12 = PASS.** DB alvo = `orcivo_dev` (localhost:5544, volume `postgres_dev_data`,
  dados fictícios, **não é produção** — produção é a VPS `/opt/orcivo` sem creds
  neste host). Backup `~/orcivo-preP02-20260903-205329.sql.gz`. Migrations 1–6 já
  aplicadas (2026-09-02) e confirmadas via `_prisma_migrations`; `migrate status`
  limpo. Orphan precheck 0/0. Backfill íntegro: 0 null `company_id`, 0 mismatch em
  `quote_items` e `quote_approvals`; `NOT NULL` ativo nas duas. `migrate diff
  --exit-code` = 0 (zero drift). `request_idempotency` existe/vazia. Reseed
  idempotente (`plan_limits`).
- **T13 = PASS.** Validação funcional A/B por **automação de API**: `pnpm
  --filter @orcivo/backend test:ci` no commit `66d5e5a`, DB `orcivo_test`
  efêmero → **16 suites, 100 passed / 5 todo / 0 fail** (35 testes A/B tenant/RBAC
  + 10 idempotência). Cross-tenant read/list/detail/update/delete/mutation/
  related-ID → 404; RBAC → 403; fail-closed → 401; sem vazamento em corpo de
  negação (inspeção de código). UI web/mobile A/B fica no bloco UAT de P10.

Evidência: **`phases/03.1-.../03.1-P02-T12-T13-RESULT.md`**. Docs atualizados:
`STATE.md`, `ROADMAP.md`, `03.1-P02-SUMMARY.md`, `03.1-VERIFICATION.md`,
`03.1-UAT.md`, `03.1-P02-T12-T13-HANDOFF.md` (procedimento preservado).

**P02 = PASS · P03 = UNBLOCKED.** `REAL_EXECUTION_AUTHORIZED` criado em
`.orchestration/v2/` (autorização durável do owner; o loop real do pilot ainda é
sintético neste build — o task graph real é conduzido pelo agente como implementer,
maxParallel=1). Próximo trabalho READY: **03.1-P03 (storage privado)**; os `PB1-*`
entram a partir de P04.

---

## MVP Product Batch #1 — OWNER APPROVED + PILOT MODE (2026-09-03)

**O owner aprovou o MVP Product Batch #1** com decisões por item
(`.planning/product/MVP-PRODUCT-BATCH-1.md` seção "OWNER APPROVAL"). Decisões
notáveis: P-07 = quick-create modal; P-09 = MVP-lite edit/delete; P-10 =
assinatura reutilizável do técnico; P-14 = soft delete; P-13 = auto-gerar tasks
só para achados funcionais OBJETIVOS; P-15 PROMOVIDO ao MVP (nova fase **F3.2**,
distributor API = FUTURE); P-17 subset in-app (nova wave **P17-wave**); P-02 =
cobertura MVP core (não enterprise field-level).

**Máquina-legível:** `.planning/product/MVP-PRODUCT-BATCH-1.tasks.json` (23 tasks
`PB1-*`, 6 Level C) + `.plan.json` (gerado por
`scripts/orchestration/v2/batch-reconcile.ps1` — reconcile OK). Ordem de execução
+ análise de gates: `.planning/product/MVP-PRODUCT-BATCH-1-EXECUTION.md`.

Todos os 23 `PB1-*` carregam `blockedByGates: [P02-T12, P02-T13, P03]` (o
reconciler recusa qualquer task que não carregue os três). **Atualização
2026-09-04: os três = `PASS`** (ver seção "P03 = PASS" acima). Primeira ação
do agente após os gates: `03.1-P03` (feito) → wave da fase P04
(`PB1-P02-audit-service` promovido a lead task, Level C).

Deltas de roadmap: nova fase **F3.2 (inventory-lite)** entre 03.1 e Fase 4; nova
wave **P17-wave** perto de P07.5. Processo recorrente registrado:
`PROC-product-completeness-audit` (P-23) — DISCOVER/TRIAGE/PROPOSE only.

**PILOT MODE construído** (`scripts/orchestration/v2/pilot.ps1`): loop de
supervisor guardado que compõe fence → classify → route → [Level C →
WAITING_HUMAN] → [no provider → WAITING_PROVIDER] → implement → verify → secret
scan → opposite-provider review → bounded correction → integrate (remote-truth) →
durable checkpoint. Guards (`config.pilot`): maxParallel=1, forcePush=false,
levelCStop=true, bounded retries/reviews, durable checkpoints, failover +
auto-resume + restart-resume, opposite-provider review, exact candidate, secret
gate, remote-truth reconciliation.

`runnerMode` default = `inproc-fake` (validação SINTÉTICA, sem modelo). `docker` /
`host-trusted` para agentes reais (Docker composition em `infra/orchestration/` +
`runner-docker.ps1` — read-only candidate, `--network none` no test, sem
docker.sock/HOME/secrets, non-root). **Execução real de uma task `PB1-*` exige
adicionalmente:** token `REAL_EXECUTION_AUTHORIZED` em `.orchestration/v2/` +
gates P02/P03 satisfeitos + (Level C) owner gate. Nenhum existe. **Ainda não há
verbo `run` que despache task real do Orcivo.**

Comandos: `pilot.ps1 status|selftest|docker-preflight|start|stop`. `start` neste
build só imprime o gating (sem loop real). `v2.1.ps1` inclui `pilot` passthrough.

**Docker:** daemon rodando; imagem `orcivo-agent-runner:v1` ainda não construída
(1 comando `docker build`, pull de `node:22-bookworm-slim` ~75MB, sem
credencial). `pilot.ps1 docker-preflight` reporta exatamente isso. Sob
LOCAL_TRUSTED_HOST o Docker **não é necessário** para o pilot sintético nem para
uma task real com os profiles A/B/C atuais (declarativos, não rodam build/test);
vira necessário quando um profile executar build/test de candidate.

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
| 2026-09-25 | Codex | Autopilot PB1-P06 preservado em WAITING_PROVIDER/IMPLEMENT; parser de AC inline e continuidade hash-bound de parciais em retry/failover corrigidos e testados. Instruções exatas de retomada e limites de autonomia adicionados no topo. | (ver `git log -1`) |
| 2026-09-04 | Claude | **P03 = PASS.** Ambiente identificado primeiro (`STORAGE_ENVIRONMENT = LOCAL_DEV`, único MinIO alcançável deste host). T10 (policy privada aplicada/verificada com rollback documentado) e T13 (UAT automatizado `storage.e2e.spec.ts`, 8/8: autenticado/anônimo/adulterado/cross-tenant) autorizados pelo owner e executados. Suite backend 18/125 (120 passed/5 todo/0 fail). `batch-reconcile.ps1` corrigido para ler gates reais em vez de assumir estado fixo; `.plan.json` reconciliado (`gatesPassed=true`, `dispatchableNow` com 5 tasks). P04 UNBLOCKED. Planning atualizado (STATE/ROADMAP/PROGRESS/PLAN/HANDOFF + product batch docs + `03.1-P03-T10-T13-RESULT.md`). Nenhuma task `PB1-*` implementada (execução real é do autopilot dispatcher). | (ver `git log -1`) |
| 2026-09-03 | Claude | **P02 = PASS.** T12 (migrations em `orcivo_dev` persistente + backup + backfill íntegro 0/0 + zero drift + reseed) e T13 (A/B por automação de API, suíte 16/16) autorizados pelo owner e executados. P03 UNBLOCKED. `REAL_EXECUTION_AUTHORIZED` criado. Planning atualizado (STATE/ROADMAP/SUMMARY/VERIFICATION/UAT/HANDOFF + `03.1-P02-T12-T13-RESULT.md`). | (ver `git log -1`) |
| 2026-09-02 | Claude | **Remediação de segurança da orquestração.** V1 marcado `LEGACY_REJECTED_REFERENCE_ONLY` (guard bloqueia run/loop/cleanup; regressão 23/23 preservada). V2 security spine clean-room em `scripts/orchestration/v2/` (namespace `.orchestration/v2/`): ledger monotônico content-addressed (C-01), contract freeze + protected paths + post-diff scope (H-06/M-01/M-03), attestations content-addressed + staleness (C-03), review envelope JSON fail-closed (C-02/H-03/M-05), leases atômicas 4 namespaces + integração serial + fetch/CAS (H-05/H-04), preflight obrigatório + human gate durável (H-07/C-04 parcial), classificação por control channel + corpus negativo (H-01), streaming redaction + secret scan (H-11), Win32 argv/ID grammar (H-12). Suíte adversarial 40/40 (`v2/tests/`, repos descartáveis, sem modelo). Docs: THREAT-MODEL + ATTESTATIONS. Deferidos: C-05/C-06/H-08/H-09/H-10 + smoke real. NÃO production-ready; NÃO READY_FOR_CANARY. `READY_FOR_SECOND_SECURITY_REVIEW = YES`. | (ver `git log -1`) |
| 2026-09-02 | Claude | Supervisor de orquestração production-ready: reconciliador real (`reconcile.ps1`), scheduler `loop`, scope-conflict, `merge.ps1` (safe merge, sem force/reset), reviewer cruzado (`review.ps1`), classificação de falha (12 classes), redaction endurecida, `recover`. Suite determinística 23/23 (`tests/`, fake-agent, sem chamadas de modelo). Drift documental corrigido (CLAUDE.md deixa de afirmar Fase 0). Não ligado a tasks reais; P02/P03 inalterados. | (ver `git log -1`) |
| 2026-09-02 | Claude | Camada de orquestração multi-agente: SETUP + POC (14/14). `scripts/orchestration/` + `docs/runbooks/agent-orchestration.md`. orca-cli descartado (esqueleto abandonado). Não ligado a tarefas reais. P02/P03 inalterados. | `ae668f4` |
| 2026-09-01 | Claude (Decision Agent) | Discovery de produto incorporado ao planejamento; ADRs 015/016/017; addenda P04/P06/P07; wave P07.5. P02 segue aguardando T12/T13. | `0260a72` |
| 2026-09-01 | Claude | Handoff T12/T13 de P02 preparado (`03.1-P02-T12-T13-HANDOFF.md`); dev local destravado (Postgres 5544, seed via node TS-strip). | `c5fbf04` |
| 2026-09-01 | Claude | P02 T11 (request idempotency mobile) + auditoria de write-path. | `7628802` |
