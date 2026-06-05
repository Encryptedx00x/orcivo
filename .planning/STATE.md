---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-06-04T00:00:00.000Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 36
  completed_plans: 36
  percent: 100
---

# Orcivo — STATE.md

## Estado atual

**Fase ativa:** — (todas as fases do milestone concluídas)
**Status:** Fase 3 concluída — Monetização completa (9/9 planos executados)
**Data:** 2026-06-04
**Próximo:** Fase 4 — Orcivo Mais/Equipe (planejamento futuro)
**Data:** 2026-05-28
**Próximo comando:** continuar Wave 4-5 da Fase 3 (`/gsd-execute-phase 3 --wave 4`)

## Trabalho da sessão 2026-05-28 — Fidelidade visual web

### Commits

| Hash | Descrição |
|---|---|
| `e260182` | P0/P1: gap closure visual inicial (orcamentos, clientes, dashboard) |
| `e90cd4a` | Novo cliente (form rico 2-col + right rail) + Cliente detalhe (aside + 6 abas) |
| `05bfcc9` | Aprovação pública — pub-bar/pub-hero/pub-cta fiel ao protótipo; pub-* no globals.css |
| `ec162e4` | Auth inputs 52px + botão 52px conforme auth.css do design system |

### Cobertura de telas

| Tela | Status |
|---|---|
| Login web | ✅ Fiel |
| Signup web | ✅ Fiel |
| Dashboard | ✅ Fiel |
| Lista de orçamentos | ✅ Fiel |
| Detalhe do orçamento | ✅ Fiel |
| Novo orçamento | ✅ Fiel |
| Lista de clientes | ✅ Fiel |
| Novo cliente | ✅ Fiel (rich form 2-col + right rail) |
| Detalhe do cliente | ✅ Criado (aside sticky + 6 abas) |
| Catálogo | ✅ Fiel |
| Ordens de serviço | ✅ Fiel |
| Agenda | ✅ Fiel (calendar semanal) |
| Financeiro | ✅ Fiel |
| Documentos | ✅ Fiel |
| Configurações | ✅ Fiel |
| Aprovação pública | ✅ Fiel (pub-bar/hero/cta) |

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

## Fase 3 — Monetização (em andamento)

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

Nenhum bloqueio ativo.

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
