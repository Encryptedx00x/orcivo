---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
last_updated: "2026-09-01T23:59:29.401Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 48
  completed_plans: 30
  percent: 63
---

# Orcivo — STATE.md

## Estado atual

**Fase ativa:** 03.1 — Estabilização pós-Fase 3
**Status:** `in_progress` — P00 PASS; P01 auto PASS; **P02 = PASS**; **P03 (storage
privado) = PASS** (T01–T13 completas; T10/T13 autorizados pelo owner e
executados 2026-09-04 — ver `phases/03.1-.../03.1-P03-T10-T13-RESULT.md`).
**P04 UNBLOCKED.**
**Data:** 2026-09-04
**Próximo:** task graph do MVP Product Batch #1 a partir de P04
(`MVP-PRODUCT-BATCH-1-EXECUTION.md` / `.plan.json` reconciliado). Dispatchable
agora (gates satisfeitos, não Level C, sem dependência pendente):
`PB1-P03-sidebar-real-identity`, `PB1-P19-mobile-home-customer`,
`PB1-P06-dead-contact-ctas`, `PB1-P16-free-plan-15-os`,
`PB1-P11-customer-pdf-download`. O lead de P04 (`PB1-P02-audit-service`) é
Level C e permanece `WAITING_HUMAN` até owner gate próprio. Execução real
segue pelo autopilot dispatcher, não implementada manualmente nesta sessão.

**P02 gates (2026-09-03):** T12 = PASS (migrations 1–6 confirmadas em `orcivo_dev`
persistente, backup feito, backfill íntegro 0/0, zero drift, reseed). T13 = PASS
(A/B funcional por automação de API — suíte backend 16/16, 100 passed; cross-tenant
→ 404, RBAC → 403, fail-closed → 401, sem vazamento em corpo de negação). UI web/mobile
A/B permanece no bloco UAT de P10. `REAL_EXECUTION_AUTHORIZED` token criado em
`.orchestration/v2/`.

**Ferramenta de orquestração (2026-09-03):** `THREAT_MODEL = LOCAL_TRUSTED_HOST`
fixado pelo owner; camada de autonomia pragmática V2.1 construída sobre a spine V2
(classifier semântico, router adaptativo, failover Claude↔Codex, WAITING_PROVIDER
+ auto-resume, context rollover, correction loop, generation fencing,
INTEGRATION_INTENT). Deterministic Wave 0 30/30; spine 108/108; smoke real
Claude/Codex PASS. **Não ligado a task real (NC-01).** Ver
`.planning/reviews/PRAGMATIC-V2.1-CLOSEOUT.md` e `AGENT-HANDOFF.md`.

**MVP Product Batch #1 APROVADO pelo owner (2026-09-03)** com decisões por item —
`.planning/product/MVP-PRODUCT-BATCH-1.md` (+ `.tasks.json` / `.plan.json` /
`-EXECUTION.md`). 23 tasks `PB1-*` (6 Level C), todas `blockedByGates:
[P02-T12, P02-T13, P03]`. Deltas: nova fase **F3.2 (inventory-lite)**, nova wave
**P17-wave**. **`P02-T12` = PASS · `P02-T13` = PASS · `P02` = PASS · `P03` = PASS
(2026-09-04)** — `.plan.json` reconciliado com os gates reais (`batch-reconcile.ps1`
passou de assertar gates fixos "sempre pendentes" para ler o estado do batch);
`dispatchableNow`: `PB1-P03-sidebar-real-identity`, `PB1-P19-mobile-home-customer`,
`PB1-P06-dead-contact-ctas`, `PB1-P16-free-plan-15-os`,
`PB1-P11-customer-pdf-download`. `PB1-P02-audit-service` (lead de P04) é Level C
→ `WAITING_HUMAN` próprio, mesmo com P02/P03 satisfeitos. **PILOT MODE**
(`scripts/orchestration/v2/pilot.ps1`, `runnerMode` default sintético; sem verbo
`run` para task real). Token `REAL_EXECUTION_AUTHORIZED` **criado** em
`.orchestration/v2/` (2026-09-03) — o loop real do pilot ainda é sintético neste
build; o implementer/reviewer real do task graph é conduzido manualmente pelo
agente (maxParallel=1).

**Discovery de produto (2026-09-01):** sessão de exploração local do produto
pelo owner, formalizada em `phases/03.1-.../03.1-DISCOVERY-UAT-2026-09-01.md`.
9 achados (D-1..D-9) classificados e encaixados nas waves existentes de 03.1 +
Fase 4 sem alterar o plano (só addenda). Wave nova **03.1-P07.5** (trilha de
auditoria de negócio). ADRs novas: 015 (audit trail), 016 (transições de estado
explícitas / histórico imutável), 017 (billing provider-agnostic / Mercado Pago
para P06). **Nada implementado** — respeitando os gates de P02/P03.
Ver `AGENT-HANDOFF.md` para continuidade entre agentes.

P02 (T01–T10): TenantGuard global + RoleGuard, ownership de IDs relacionados,
`company_id` em quote_items/quote_approvals, 35 testes de integração A/B verdes
(cross-tenant read/list/detail/update/delete/nested/related-IDs/invites + RBAC +
fail-closed). Fecha G-1..G-4. **T12 (migrations em DB persistente) = PASS · T13
(A/B por automação de API) = PASS** (2026-09-03, autorizados pelo owner). Ver
`03.1-P02-SUMMARY.md` e `03.1-P02-T12-T13-RESULT.md`.

P01 (T01–T10, `SAFE_AUTO`) concluída: migration versionada de Payment/Appointment,
guard de DB efêmero, migrate-from-zero e upgrade verdes em DB descartável, imagem
Docker sobe com `/health` 200. Pendências humanas de P01: **T11 (aplicar migration
em DB persistente) — tecnicamente coberto pela execução de T12 de P02** (migration
4 `20260901000000_phase_2b_payments_appointments` confirmada em `orcivo_dev`);
T12 de P01 (setup manual em Windows limpo — `MANUAL_UAT`) segue pendente.
Ver `phases/03.1-.../03.1-P01-SUMMARY.md`.

`baseline_reproducible` agora `migrations_and_container_only`. UAT permanece
`0/75` e a Fase 4 continua bloqueada.

## Baseline Git atual

| Item | Estado |
|---|---|
| Standalone | `main` ativo — HEAD/contagem via `git log -1` / `git rev-list --count HEAD` (não fixar SHA aqui) |
| Remote | repositório privado; sync via `git status` / `supervisor.ps1 status` |
| Working tree | ver `git status` |
| Git pai | detach local preservado (recuperação P00) |
| Recuperação | P00 complete; archive, backup e bundle preservados |

## Snapshot histórico — cobertura Web auditada em 2026-06-05

As seções históricas abaixo são preservadas como registro da época. Elas não
substituem a verification da fase 03.1 e serão reconciliadas de forma ampla em
P11.

| Tela | Status |
|---|---|
| Login web | ✅ Fiel |
| Signup web | ✅ Fiel |
| Dashboard | ✅ Fiel (KPIs, agenda, ações rápidas, atividades) |
| Lista de orçamentos | ✅ Fiel |
| Detalhe do orçamento | ✅ Fiel |
| Novo orçamento (stepper 5 etapas) | ✅ Fiel |
| Lista de clientes | ✅ Fiel |
| Novo cliente | ✅ Fiel (form 2-col + right rail) |
| Detalhe do cliente | ✅ Fiel (aside + 6 abas + botões Editar/Nova OS) |
| Editar cliente | ✅ Fiel (form PATCH + preview ao vivo) |
| Catálogo | ✅ Fiel |
| Novo item catálogo | ✅ Fiel |
| Ordens de Serviço (lista) | ✅ Fiel (colunas Técnico/Finalizada/Total + 4 filtros) |
| Nova OS | ✅ Fiel |
| Detalhe da OS | ✅ Fiel (grid 2-col, painel dir: cliente/financeiro/histórico) |
| Agenda | ✅ Fiel (calendar semanal) |
| Financeiro | ✅ Fiel (KPIs + gráfico barras + tabela 4 filtros) |
| Documentos | ✅ Fiel (5 tabs incl. Contratos + thumb PDF + ações) |
| Equipe | ✅ Fiel (tabela + convites + seção permissões por função) |
| Configurações | ✅ Fiel (9 tabs: empresa/visual/pix/usuários/plano/aprovação/seg/notif/exp) |
| Plano e assinatura | ✅ Criada (card gradient + histórico + comparativo 4 planos) |
| Aprovação pública | ✅ Fiel (pub-bar/hero/cta) |
| Sidebar | ✅ Fiel (checkmark 32px, active purple-800, font-mono, footer) |
| TopBar | ✅ Fiel (iconbtns sem borda) |
| AuthArtPanel | ✅ Fiel (gradient 155deg + grid + glows + glass logo) |

## Commits da sessão 2026-06-05

| Hash | Descrição |
|---|---|
| `9f4c4dc` | feat(web): nova OS — form criação com seleção de cliente e agendamento |
| `37635cd` | feat(web): editar cliente — form PATCH com pré-carga |
| `788a063` | fix(web): AuthArtPanel — gradiente fiel ao design |
| `501b899` | fix(web): sidebar — checkmark icon, active purple-800, font-mono, footer |
| `164bd46` | fix(web): topbar iconbtns, OS colunas+filtros, OS detail painel direito, config tabs, docs contratos+ações |
| `b8486f7` | feat(web): plano page; equipe permissões; financeiro filtro clientes; config ícone |

## Deliverables concluídos na Fase 2A

| Deliverable | Status |
|---|---|
| D2.1 — Catálogo de serviços/produtos (mobile + web) | ✅ Completo |
| D2.2 — Orçamento estruturado com máquina de estados (mobile + web) | ✅ Completo |
| D2.3 — Geração de PDF + compartilhamento WhatsApp | ✅ Completo |
| D2.4 — Aprovação por link público (3 métodos: botão, nome, assinatura) | ✅ Completo |
| D2.5 — Ordem de Serviço com fotos BEFORE/DURING/AFTER (mobile + web) | ✅ Completo |
| D2.6 — Reset de senha (forgot-password + reset-password) | ✅ Completo |
| D2.7 — StorageService MinIO + MailService + PlanLimitsService scaffold | ✅ Completo |

## Deliverables concluídos na Fase 1

| Deliverable | Status |
|---|---|
| D1.1 — Auth (signup 2 etapas, login, refresh, logout) | ✅ Completo |
| D1.2 — Tenant context + isolamento (Company, TenantGuard) | ✅ Completo |
| D1.3 — Vertical slice Customer (mobile + web + CI) | ✅ Completo |
| D1.4 — Documentação do molde arquitetural | ✅ Completo |

## Snapshot histórico — Fase 3 registrada como em andamento

Waves 1-3 concluídas. Pendentes:

| Wave | Plano | Descrição |
|---|---|---|
| 4 | P06 | apps/site/ — landing page + pricing + checkout |
| 4 | P07 | Banner de inadimplência (subscription guard) |
| 5 | P08 | InviteModule — convite de equipe |
| 5 | P09 | Migrations finais + smoke tests |

## Gap closures aplicados (pós-execução)

| Gap | Fix |
|---|---|
| `@orcivo/shared-types` apontava para `src` em runtime | `main`/`types`/`exports` corrigidos para `dist` |
| `GET /health` retornava 401 | `@Public()` adicionado ao `HealthController` |
| Scripts `dev:*` não garantiam build de shared-types | compilam shared-types antes de iniciar |
| `parseFloat` em `OrcamentoDetail` linha 172 | corrigido para `multiplyDecimal` |
| WorkOrder status `OPEN` inexistente no schema | corrigido para `PENDING` |

## Bloqueios

- Migration-from-zero, upgrade versionado e integração segura ainda dependem de
  P01.

- Waves P00–P03 verificadas (P02 = PASS 2026-09-03; P03 = PASS 2026-09-04).
  Waves P04–P11 não verificadas.
- Gate R e todos os 75 casos UAT permanecem pendentes (execução pós-P10).
- Fase 4 não pode começar antes do encerramento da fase 03.1 (P04+ dos
  `PB1-*` já pode começar — não é a Fase 4 do roadmap histórico).

## Histórico

| Data | Evento |
|---|---|
| 2026-09-04 | P03 = PASS: T10 (policy privada aplicada/verificada em `LOCAL_DEV` — `orcivo_minio_dev`; produção real fica na VPS, sem creds neste host) e T13 (UAT automatizado, `storage.e2e.spec.ts`, 8/8) autorizados pelo owner e executados. Suite backend 18/125 (120 passed / 5 todo). `batch-reconcile.ps1` corrigido para ler o estado real dos gates em vez de assumir "sempre pendente"; `.plan.json` reconciliado com `gatesPassed=true`. P04 UNBLOCKED. |
| 2026-09-03 | P02 = PASS: T12 (migrations em `orcivo_dev` persistente + backfill íntegro + backup) e T13 (A/B por automação de API, suíte 16/16) autorizados pelo owner e executados. P03 UNBLOCKED. `REAL_EXECUTION_AUTHORIZED` criado. |
| 2026-05-21 | Projeto inicializado no GSD; Fase 0 planejada |
| 2026-05-22 | Fase 1 planejada e executada (P01-P07) |
| 2026-05-22 | Gap closures: shared-types dist, @Public health, scripts dev:* |
| 2026-05-22 | UAT aprovado |
| 2026-05-22 | Fase 0 executada — monorepo, CI, hello world |
| 2026-05-27 | Fase 2A concluída — 12/12 deliverables verificados |
| 2026-05-28 | Design web fidelizado: 16 telas cobertas; clientes/[id] criado; pub page refeita |
| 2026-07-23 | Recuperação encerrada: P00/Wave 0 PASS; standalone privado e Git pai destacado |
