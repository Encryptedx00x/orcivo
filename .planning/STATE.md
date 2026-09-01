---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Fase 03.1 em andamento — P00/Wave 0 e P01/Wave 1 (auto) verificadas; P02 liberada
last_updated: "2026-09-01T00:00:00-03:00"
progress:
  active_phase: "03.1"
  verified_waves: 2
  total_waves: 12
  percent: 17
  historical_counts_status: pending_reconciliation_in_P11
---

# Orcivo — STATE.md

## Estado atual

**Fase ativa:** 03.1 — Estabilização pós-Fase 3
**Status:** `in_progress` — P00/Wave 0 PASS; P01/Wave 1 auto-tasks PASS; `2/12` waves verificadas
**Data:** 2026-09-01
**Próximo:** 03.1-P02 — Tenant isolation e autorização (RBAC)

P01 (T01–T10, `SAFE_AUTO`) concluída: migration versionada de Payment/Appointment,
guard de DB efêmero, migrate-from-zero e upgrade verdes em DB descartável, imagem
Docker sobe com `/health` 200. Pendências humanas de P01: T11 (aplicar migration
em DB persistente — `HUMAN_APPROVAL`) e T12 (setup manual em Windows limpo —
`MANUAL_UAT`). Ver `phases/03.1-.../03.1-P01-SUMMARY.md`.

`baseline_reproducible` agora `migrations_and_container_only`. UAT permanece
`0/75` e a Fase 4 continua bloqueada.

## Baseline Git atual

| Item | Estado |
|---|---|
| Standalone | `main` em `c1cb048d1d01767b6cc36ca7709c4afe88f82483`, 171 commits (2026-09-01) |
| Remote | repositório privado; `origin/main` ahead/behind `0/0` |
| Working tree | limpa; staged e untracked não ignorado em zero |
| Git pai | detach local em `1449b648fcf6da14dc2d7ad082915ddccd578cf7` |
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
- Waves P01–P11 permanecem não verificadas.
- Gate R e todos os 75 casos UAT permanecem pendentes.
- Fase 4 não pode começar antes do encerramento da fase 03.1.

## Histórico

| Data | Evento |
|---|---|
| 2026-05-21 | Projeto inicializado no GSD; Fase 0 planejada |
| 2026-05-22 | Fase 1 planejada e executada (P01-P07) |
| 2026-05-22 | Gap closures: shared-types dist, @Public health, scripts dev:* |
| 2026-05-22 | UAT aprovado |
| 2026-05-22 | Fase 0 executada — monorepo, CI, hello world |
| 2026-05-27 | Fase 2A concluída — 12/12 deliverables verificados |
| 2026-05-28 | Design web fidelizado: 16 telas cobertas; clientes/[id] criado; pub page refeita |
| 2026-07-23 | Recuperação encerrada: P00/Wave 0 PASS; standalone privado e Git pai destacado |
