---
type: product-batch-execution-plan
batch: MVP Product Batch #1
date: 2026-09-03
state: OWNER_APPROVED — reconciled — nothing executed
machine_readable: .planning/product/MVP-PRODUCT-BATCH-1.plan.json
regen: powershell -File scripts/orchestration/v2/batch-reconcile.ps1
---

# MVP Product Batch #1 — execution plan

Reconciled from `MVP-PRODUCT-BATCH-1.tasks.json` by
`scripts/orchestration/v2/batch-reconcile.ps1`. **No task has been executed.**

## 1. Gate state (unchanged)

| gate | state | meaning |
|---|---|---|
| `P02-T12` | `WAITING_HUMAN` | apply pending tenant migrations to the persistent DB with backup + pre-checks — **human, not an agent** |
| `P02-T13` | `WAITING_HUMAN` | manual A/B two-tenant UAT (API / web / mobile) — **human** |
| `P02-PASS` | `BLOCKED` | derived — clears when T12 **and** T13 clear |
| `P03` | `BLOCKED_BY_P02` | storage privado — the next GSD wave after P02 = PASS. Not changed. |

## 2. Which approved items can run before P03

**None.** Every one of the 23 `PB1-*` tasks lands in a GSD phase at or after
`P03` (`P04`, `P06`, `P07`, `P07.5`, `P17-wave`, `P10`, `F3.2`, `F4`), and GSD
phases are sequential. Every task carries
`blockedByGates: [P02-T12, P02-T13, P03]`. The reconciler enforces this — a task
that did **not** carry all three gates would fail reconciliation.

Non-task items that are **not** blocked (because they are not product code):

- **P-18** — strategy (web-first / mobile-parallel). No task; recorded.
- **P-21** — NFS-e deferred. No task.
- **P-23 / P-13 (audit pass)** — the Product Completeness Audit is
  `DISCOVER / TRIAGE / PROPOSE` only. It could run against the current codebase
  at any time to refresh `DISCOVERED` items, **but** it may not auto-schedule a
  business change, and per this session's constraints it is not run now.

## 3. First agent action once the gates clear

1. `03.1-P03` — storage privado (existing GSD plan, unchanged).
2. Then the **P04 phase wave** below.

## 4. Phase waves (GSD-accurate — phases run in order after the gates)

`LEVEL C` = the harness parks the task in `WAITING_HUMAN` for the owner even
after the phase gate opens.

### P04 — aprovação atômica + máquina de estados (D-4 / ADR-016)
- `PB1-P02-audit-service` **(LEVEL C — persistent migration)** — central `AuditService` + additive `actor_user_id` migration. Promoted to the P04 lead task because P-01/P-05/P-14 all write through it.
- `PB1-P01-quote-state-machine` **(LEVEL C — business rule)**
- `PB1-P01-os-state-machine` **(LEVEL C — business rule)**
- `PB1-P12-pdf-status-semantics`  (dep: quote state machine)
- `PB1-P11-customer-pdf-download`
- `PB1-P10-technician-signature`  (dep: `PB1-P03`; private storage from P03)

### P06 — billing e limites (D-8 / ADR-017 / P-16)
- `PB1-P16-free-plan-15-os`
- `PB1-P22-billing-provider-agnostic` **(LEVEL C — external-service architecture)**

### P07 — contratos funcionais (D-1 / D-2 / D-3 / D-9)
- `PB1-P03-sidebar-real-identity`
- `PB1-P04-company-profile-pix`  (dep: audit-service)
- `PB1-P05-payment-registration` **(LEVEL C — money)**  (dep: audit-service)
- `PB1-P06-dead-contact-ctas`
- `PB1-P14-customer-edit-delete`  (dep: audit-service)
- `PB1-P07-quick-create-customer`  (dep: `PB1-P14`)
- `PB1-P09-agenda-edit-delete`  (dep: audit-service)
- `PB1-P13-dead-cta-audit-pass`  (dep: P-03 / P-05 / P-14 — audits what those fixed)

### P07.5 — trilha de auditoria (leitura + UI) (D-5 / ADR-015)
- `PB1-P02-audit-read-and-ui`  (dep: audit-service)

### P17-wave — notificações in-app (new, near P07.5)
- `PB1-P17-in-app-notifications`  (dep: audit-service + `PB1-P03`)

### P10 — fidelidade visual / estados (D-7b)
- `PB1-P08-agenda-layout-bugs`  (dep: `PB1-P09`)
- `PB1-P20-systematic-states`  (dep: `PB1-P08`)

### F3.2 — inventory-lite (new phase; P-15 promoted; after the operational blockers)
- `PB1-P15-inventory-lite-backend` **(LEVEL C — persistent migration)**
- `PB1-P15-inventory-lite-web`  (dep: backend)

### F4 — mobile catch-up (non-blocking for the web MVP)
- `PB1-P19-mobile-home-customer`

## 5. Roadmap deltas this batch introduces

| delta | where |
|---|---|
| new phase **F3.2 — inventory-lite** between 03.1 and Fase 4 | P-15 promoted to MVP |
| new wave **P17-wave — in-app notifications** near P07.5 | P-17 promoted (subset) from Fase 7 |
| `PB1-P02-audit-service` is the **P04 lead task** (not P07.5) | P-01 depends on audit |
| P08/P20 explicitly in **P10** (fidelidade visual) | P-08, P-20 |

The existing P04 / P06 / P07 / P07.5 discovery addenda in `ROADMAP.md` already
cover the rest; this batch adds the `PB1-*` task ids as the concrete work.

## 6. Recurring process registered

`PROC-product-completeness-audit` (P-23): triggers = after-meaningful-batch,
before-release, after-phase-completion, after-important-new-screens. Permission =
`DISCOVER_TRIAGE_PROPOSE_ONLY`. May not auto-approve business requirements or
auto-schedule a commercial change.

## 7. What the supervisor does with this

`MVP-PRODUCT-BATCH-1.tasks.json` + `.plan.json` are the machine-readable inputs.
The pilot supervisor (`scripts/orchestration/v2/pilot.ps1`) reads them, but in
`PILOT` mode it runs **synthetic** tasks only. A real `PB1-*` task requires:
(a) `P02-T12` + `P02-T13` + `P03` satisfied, (b) for a Level C task, an owner
gate decision, and (c) the real-execution authorization token — none of which
exist yet.
