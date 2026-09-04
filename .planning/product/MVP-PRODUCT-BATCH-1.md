---
type: product-batch
batch: MVP Product Batch #1
date: 2026-09-03
status: OWNER_APPROVED  —  SCHEDULED, GSD gates (P02 + P03) satisfied 2026-09-04
approved_at: 2026-09-03
approved_by: owner
machine_readable: .planning/product/MVP-PRODUCT-BATCH-1.tasks.json  (+ .plan.json after reconcile)
execution_plan: .planning/product/MVP-PRODUCT-BATCH-1-EXECUTION.md
generated_by: pragmatic V2.1 harness (task generation / reconciler)
sources: owner brief P-01..P-23 · 03.1-DISCOVERY-UAT-2026-09-01 (D-1..D-9) · ROADMAP.md · ADR-015/016/017
constraints:
  - APPROVAL IS NOT EXECUTION. No product task ran in the approval session.
  - Every approved task is blockedByGates [P02-T12, P02-T13, P03] — nothing runs before P03.
  - P02 gates T12/T13 stay HUMAN; P03 does not start until P02 = PASS. Not changed.
  - Level C items (6) still stop for the owner inside the harness.
---

# MVP Product Batch #1 — OWNER APPROVED (2026-09-03)

## OWNER APPROVAL

The owner approved the batch on 2026-09-03 with the per-item decisions below.
Approved items are now `SCHEDULED` in `MVP-PRODUCT-BATCH-1.tasks.json` and will
become `READY` only as GSD dependencies allow — **all of them are downstream of
the P02 human gates + P03**, so none is runnable yet.

| item | decision |
|---|---|
| **P-01** | APPROVED. reopen/correct = `@AdminOnly`. cancel/reject preserve reason + history. **never** overwrite `notes` as audit history. |
| **P-02** | APPROVED — **MVP core** audit coverage now: quote send/approve/reject/cancel/correct/reopen, OS important status, payment create/settle/change, customer important, company/profile important, appointment create/edit/delete where relevant. Human-readable contextual activity. **Not** exhaustive per-field enterprise audit yet. |
| **P-03** | APPROVED. |
| **P-04** | APPROVED. company/profile/PIX persistence now. Logo upload stays POST-MVP. |
| **P-05** | APPROVED. |
| **P-06** | APPROVED. |
| **P-07** | APPROVED. UX = **quick-create modal**; preserve the current quote draft/context. |
| **P-08** | APPROVED. |
| **P-09** | APPROVED. MVP-lite = **edit + delete**. month/day/list/full agenda views → later / Fase 4. |
| **P-10** | APPROVED. **Reusable technician signature**, applied during quote send. Simple + secure. No unrelated signature infrastructure. |
| **P-11** | APPROVED. |
| **P-12** | APPROVED. |
| **P-13** | APPROVED. Agents may **auto-generate candidate tasks for OBJECTIVE functional findings**; business/commercial/product decisions still require a future owner batch. |
| **P-14** | APPROVED. customer delete = **soft delete**. |
| **P-15** | APPROVED **AND PROMOTED TO MVP**. Scope: CSV/JSON catalogue import; stock/quantity; cost price; final/sale price; simple low-stock. Not now: distributor API (FUTURE), advanced barcode, advanced photos. Schedule **before production MVP but after core operational blockers** → new phase **F3.2**. |
| **P-16** | ALREADY APPROVED. `FREE_PLAN_OS_MONTHLY_BASELINE = 15`. |
| **P-17** | APPROVED. MVP = **in-app notifications / activity**; bell must become functional. push/email later + separate. |
| **P-18** | ALREADY APPROVED. Web MVP first; mobile parallel; mobile parity does not block Web MVP. (strategy — no task) |
| **P-19** | APPROVED. mobile Home + customer detail catch-up. Not a Web MVP blocker. |
| **P-20** | APPROVED. |
| **P-21** | KEEP DEFERRED POST-MVP. No NFS-e / fiscal now. (no task) |
| **P-22** | APPROVED. Provider-agnostic billing **architecture only**. No Mercado Pago activation/credential/account work now. Real provider activation = Level C. |
| **P-23** | APPROVED. Run the Product Completeness Audit after meaningful batches / before release / after phase completion / after important new screens. `DISCOVER` / `TRIAGE` / `PROPOSE` only; never auto-approve new business requirements. (recurring process — no product task) |

**Generated tasks:** 23 `PB1-*` tasks in `MVP-PRODUCT-BATCH-1.tasks.json`
(6 Level C: `PB1-P02-audit-service`, `PB1-P01-quote-state-machine`,
`PB1-P01-os-state-machine`, `PB1-P05-payment-registration`,
`PB1-P22-billing-provider-agnostic`, `PB1-P15-inventory-lite-backend`).
**Not scheduled outside the batch; not executed.** Execution order + gate
analysis: `MVP-PRODUCT-BATCH-1-EXECUTION.md`.

`P02-T12 = PASS` · `P02-T13 = PASS` · `P03 = PASS` (2026-09-04, owner-authorized
— `03.1-P03-T10-T13-RESULT.md`). `dispatchableNow` per `.plan.json`:
`PB1-P03-sidebar-real-identity`, `PB1-P19-mobile-home-customer`,
`PB1-P06-dead-contact-ctas`, `PB1-P16-free-plan-15-os`,
`PB1-P11-customer-pdf-download`. `PB1-P02-audit-service` (P04 lead, Level C)
still needs its own owner gate.

---

## Original proposal (for reference)

This is the full list the owner reviewed **before** authorising any real
development. It reconciles the 23 backlog items in the owner brief with what
already exists in the roadmap and the 2026-09-01 discovery.

## Backlog lifecycle

```
DISCOVERED -> TRIAGED -> PROPOSED_BATCH -> [ OWNER_APPROVAL ]  <-- we are here
           -> SCHEDULED -> IMPLEMENTED -> PRODUCT_UAT_PASS
```

Only items the owner approves move to `SCHEDULED`.

## Reconciliation legend

`EXISTING` fully built · `PARTIAL` partly built · `NEW` not started ·
`ALREADY_PLANNED` in the roadmap/discovery already · `PROMOTED_TO_MVP` was
post-MVP, owner pulled it in · `DEFERRED_POST_MVP` · `OWNER_DECISION_ALREADY_GIVEN`.

---

## Summary

| # | item | type | reconciliation | proposed phase | risk | owner decision |
|---|---|---|---|---|---|---|
| P-01 | explicit status transitions (quote / OS / payment) | BUSINESS_RULE | ALREADY_PLANNED (D-4, ADR-016) | 03.1-P04 (expanded) | MEDIUM | confirm the transition set |
| P-02 | friendly business audit trail | FEATURE_INCOMPLETE | ALREADY_PLANNED (D-5, ADR-015) | 03.1-P07.5 (new wave) | MEDIUM | confirm MVP subset vs full |
| P-03 | real user/company in sidebar+topbar; dead search/bell | BUG (MOCK) | ALREADY_PLANNED (D-1, D-1b) | 03.1-P07 | LOW | approve |
| P-04 | company profile / PIX persistence (`PATCH /company/me`) | FEATURE_INCOMPLETE | ALREADY_PLANNED (D-2) | 03.1-P07 | MEDIUM | approve; logo upload post-MVP? |
| P-05 | "registrar recebimento" wired to `POST /payments` | BUG (dead CTA) + FEATURE | ALREADY_PLANNED (D-3) | 03.1-P07 | MEDIUM | approve |
| P-06 | audit dead contact CTAs on OS/customer screens | BUG | ALREADY_PLANNED (D-3b) | 03.1-P07 | LOW | approve |
| P-07 | "+ new customer" from the quote client selector | UX | NEW | 03.1-P07 or Fase 4 | LOW | pick UX: quick-create modal vs draft-preserving nav |
| P-08 | agenda layout bugs (cut cards, overflow, wide buttons) | BUG / UX | PARTIAL (D-7b + agenda) | 03.1-P10 | LOW | approve |
| P-09 | agenda event edit/delete; week/day/month/list scope | FEATURE_INCOMPLETE | PARTIAL (D-6: DELETE exists, no update) | edit/delete → MVP-lite (03.1-P07); full views → Fase 4 | MEDIUM | approve MVP-lite split |
| P-10 | technician signature on quote send | FEATURE | NEW | Fase 4 (or 03.1-P04 area) | MEDIUM | pick: reusable technician signature vs sign-on-send |
| P-11 | customer can download the quote PDF on the approval page | FEATURE | NEW (small) | 03.1-P04 | LOW | approve |
| P-12 | PDF status semantics (draft/sent/approved shown wrong) | BUG | NEW (ties to D-4) | 03.1-P04 | MEDIUM | approve state-semantics fix |
| P-13 | systematic dead-CTA / mock / missing-endpoint audit | TECH_DEBT | PARTIAL (D-1b/D-3b) + recurring (P-23) | 03.1-P07 + recurring | LOW | approve; auto-generate tasks for objective findings only |
| P-14 | web customer edit/delete (`PATCH`/`DELETE /customers/:id`) | BUG | ALREADY_PLANNED (D-9) | 03.1-P07 | MEDIUM | approve (delete = soft) |
| P-15 | inventory-lite (CSV/JSON import, qty, cost price, sale price) | FEATURE | PROMOTED_TO_MVP (new) | new phase (Fase 3.2 or Fase 4 lead) | HIGH | approve scope; distributor API stays FUTURE |
| P-16 | Orcivo Livre ≥ 15 OS/month (replaces 5) | BUSINESS_RULE | OWNER_DECISION_ALREADY_GIVEN | 03.1-P06 (limits) | MEDIUM | already authorised (`FREE_PLAN_OS_MONTHLY_BASELINE = 15`) — needs controlled code/copy/test change |
| P-17 | notifications — in-app / activity for MVP; bell not a placeholder | FEATURE | PROMOTED_TO_MVP (subset; was Fase 7) | new wave near 03.1-P07.5 (activity overlaps audit) | MEDIUM | approve in-app subset; push/email stay separate |
| P-18 | web MVP ships first; mobile catch-up in parallel | STRATEGY | OWNER_DECISION_ALREADY_GIVEN | n/a | LOW | already decided |
| P-19 | mobile catch-up (Home stub, customer detail, mgmt screens) | FEATURE | ALREADY_PLANNED (D-6) — not a web-MVP blocker | Fase 4 / mobile catch-up | MEDIUM | approve backlog, non-blocking |
| P-20 | systematic loading / error / empty / responsive / disabled states | UX / TECH_DEBT | ALREADY_PLANNED (D-7b) | 03.1-P10 | LOW | approve |
| P-21 | NFS-e / fiscal (PlugNotas etc.) | FEATURE | DEFERRED_POST_MVP — OWNER_DECISION_ALREADY_GIVEN | post-MVP / Level C | n/a | keep deferred |
| P-22 | billing provider-agnostic; Mercado Pago future | TECH_DEBT / FEATURE | ALREADY_PLANNED (D-8, ADR-017) | 03.1-P06 | MEDIUM | approve arch; MP activation = Level C |
| P-23 | recurring Product Completeness Audit | PROCESS | NEW | after batch / before release / after phase | LOW | approve cadence |

**Counts:** 23 items — 8 bugs (P-03, P-05, P-06, P-08, P-12, P-13, P-14; P-01 partly),
6 features / incomplete (P-02, P-04, P-09, P-10, P-11, P-15, P-17), 4 UX
(P-07, P-08, P-20; P-09 partly), 3 business rules (P-01, P-16), 1 process (P-23),
1 strategy (P-18), 3 already-decided (P-16, P-18, P-21).

---

## Per-item detail

Each item: **problem · evidence · impact · proposed solution · complexity ·
dependencies · risk · proposed phase · generated tasks (draft) · owner decision**.

### P-01 — explicit status transitions · BUSINESS_RULE · ALREADY_PLANNED
- **Problem:** quote / OS state machines are forward-only; no cancel-with-reason,
  reject, reopen, correct. `quote.service.cancel` overwrites `notes`.
- **Evidence:** `quote-status.enum.ts`, `work-order.service.ts WO_TRANSITIONS`; discovery D-4.
- **Impact:** an operator who mis-approves or mis-closes has no recovery path; history is lost.
- **Proposed solution (ADR-016):** domain-action transitions (`enviar`, `aprovar`,
  `recusar`, `cancelar`, `reabrir`, `corrigir`, `expirar`) with mandatory reason;
  terminal states get controlled reopen/correct; every transition writes audit (P-02);
  history is never deleted.
- **Complexity:** COMPLEX · **Deps:** P-02 (audit) · **Risk:** MEDIUM · **Phase:** 03.1-P04 (expanded)
- **Generated tasks (draft):** state-machine refactor (quote) · state-machine refactor (OS) ·
  reason-required guard · stop overwriting `notes` · web action buttons.
- **Owner decision:** confirm the exact transition set (especially who may reopen — `@AdminOnly`?).

### P-02 — friendly business audit trail · FEATURE_INCOMPLETE · ALREADY_PLANNED
- **Problem:** `AuditLog` is written in exactly one place (`quote.approve`); no
  `actor_user_id`, no structured `{from,to,reason}`, no read endpoint, no UI. Bad
  copy like "Orçamento aprovou o orçamento".
- **Evidence:** discovery D-5; `AuditLog` model; "Histórico" tabs are static placeholders.
- **Impact:** the owner cannot reconstruct "what happened" without reading DB rows.
- **Proposed solution (ADR-015):** `AuditService.record({...})` central, called
  in-transaction by quote/OS/payment/invite/company on every relevant mutation;
  additive migration `actor_user_id`; `metadata` standardises `{from,to,reason}`;
  human-readable descriptions naming entity/context/customer;
  `GET /audit-logs?entity_type=&entity_id=` (`@AdminOnly`) + real "Histórico" tab.
- **Complexity:** COMPLEX · **Deps:** — · **Risk:** MEDIUM · **Phase:** 03.1-P07.5 (new wave)
- **Owner decision:** MVP subset (quote send/approve/reject/cancel, OS status,
  payment create/settle) vs full coverage now.

### P-03 — real identity in sidebar/topbar · BUG (MOCK) · ALREADY_PLANNED
- **Problem:** `AppSidebar.tsx` footer hardcodes "JR / João Ribeiro / Ribeiro
  Elétrica · Orcivo Mais"; topbar search + bell have no handler.
- **Evidence:** discovery D-1 / D-1b.
- **Impact:** every screenshot / demo shows a fake company; dead controls erode trust.
- **Proposed solution:** sidebar consumes `useAuth()` → `{user.name, company.trade_name, plan_code}`;
  initials from the real name; search + bell either wired (bell → P-17) or hidden/`disabled`.
- **Complexity:** STANDARD · **Deps:** P-17 for the bell · **Risk:** LOW · **Phase:** 03.1-P07
- **Owner decision:** approve.

### P-04 — company profile / PIX persistence · FEATURE_INCOMPLETE · ALREADY_PLANNED
- **Problem:** the "empresa" and "Chave Pix" tabs are inputs with only
  `placeholder` — no state, no handler, no request; no `PATCH /company/me` exists.
- **Evidence:** discovery D-2; `CompanyController` has no profile-edit endpoint.
- **Impact:** receipts / quotes / OS show incomplete company data; PIX cannot be set.
- **Proposed solution:** `PATCH /company/me` (`@AdminOnly`) validating profile
  fields + `pix_key` (by key type: CPF/CNPJ/email/phone/random); shared-types DTO;
  wire the two tabs; audit (P-02). Logo upload → post-MVP.
- **Complexity:** COMPLEX · **Deps:** P-02 · **Risk:** MEDIUM · **Phase:** 03.1-P07
- **Owner decision:** approve; confirm logo upload stays post-MVP.

### P-05 — payment registration wired · BUG (dead CTA) + FEATURE · ALREADY_PLANNED
- **Problem:** "Registrar recebimento" on the OS detail has no `onClick`; web
  finance is read-only; no creation form anywhere. `POST /payments` already works.
- **Evidence:** `WorkOrderDetail.tsx:271`; discovery D-3.
- **Impact:** finance flow is broken end-to-end on the web surface.
- **Proposed solution:** "Registrar recebimento" modal (Decimal amount, method,
  date, status) on OS detail + finance page → `POST /payments`; OS finance panel
  sums real linked payments; audit (P-02).
- **Complexity:** COMPLEX · **Deps:** P-02 · **Risk:** MEDIUM · **Phase:** 03.1-P07
- **Owner decision:** approve.

### P-06 — dead contact CTAs · BUG · ALREADY_PLANNED
- **Problem:** WhatsApp / phone buttons on `WorkOrderDetail.tsx` (~245-250) have no handler.
- **Evidence:** discovery D-3b.
- **Impact:** visible buttons that do nothing.
- **Proposed solution:** wire to `tel:` / `https://wa.me/` using the customer's
  phone, or hide when no phone; audit the rest of OS/customer screens for the same.
- **Complexity:** TRIVIAL · **Deps:** — · **Risk:** LOW · **Phase:** 03.1-P07
- **Owner decision:** approve.

### P-07 — create customer from the quote selector · UX · NEW
- **Problem:** during quote creation the client selector has no "cadastrar novo cliente".
- **Evidence:** owner brief; the quote wizard.
- **Impact:** the technician must abandon the draft to add a customer.
- **Proposed solution (owner to choose):** (a) quick-create modal in place, or
  (b) navigation that preserves the draft/context. Recommend (a).
- **Complexity:** STANDARD · **Deps:** P-14 (customer write path) · **Risk:** LOW · **Phase:** 03.1-P07 or Fase 4
- **Owner decision:** pick (a) modal or (b) draft-preserving nav.

### P-08 — agenda layout bugs · BUG / UX · PARTIAL
- **Problem:** cut cards, overflow, over-wide buttons, poor responsiveness.
- **Evidence:** owner brief; overlaps D-7b.
- **Impact:** the agenda looks broken.
- **Proposed solution:** fix the weekly calendar layout (grid overflow, card
  clamping, button sizing) within the approved design system; feed the systematic
  responsiveness pass (P-20).
- **Complexity:** STANDARD · **Deps:** — · **Risk:** LOW · **Phase:** 03.1-P10
- **Owner decision:** approve.

### P-09 — agenda event edit/delete + view scope · FEATURE_INCOMPLETE · PARTIAL
- **Problem:** `Appointment` has `GET`/`POST`/`DELETE` but no update; UI has no
  edit; only a weekly view.
- **Evidence:** discovery D-6 matrix.
- **Impact:** an appointment created wrong can only be deleted and recreated.
- **Proposed solution:** MVP-lite → `PATCH /appointments/:id` + edit UI + confirm
  delete. Full month/day/list views → Fase 4.
- **Complexity:** COMPLEX (full) / STANDARD (MVP-lite) · **Deps:** — · **Risk:** MEDIUM · **Phase:** split
- **Owner decision:** approve the MVP-lite (edit/delete) vs full-views split.

### P-10 — technician signature on quote send · FEATURE · NEW
- **Problem:** a quote can only be signed by the customer; the technician cannot
  send it already signed.
- **Evidence:** owner brief.
- **Impact:** quotes that need the technician's signature require an out-of-band step.
- **Proposed solution (owner to choose):** (a) a reusable technician signature
  stored on the user/company, applied on send, or (b) sign-in-the-flow on send,
  mirroring the customer signature flow.
- **Complexity:** COMPLEX · **Deps:** P-03 (real user), storage (P03) · **Risk:** MEDIUM · **Phase:** Fase 4 / 03.1-P04 area
- **Owner decision:** pick (a) reusable or (b) sign-on-send.

### P-11 — customer PDF download on the approval page · FEATURE · NEW
- **Problem:** the public approval page has no "download PDF".
- **Evidence:** owner brief; `approve/[token]` page.
- **Impact:** the customer cannot keep a copy of what they approved.
- **Proposed solution:** a download button on the approval page serving the
  already-generated quote PDF for that token.
- **Complexity:** TRIVIAL · **Deps:** P03 (private storage) · **Risk:** LOW · **Phase:** 03.1-P04
- **Owner decision:** approve.

### P-12 — PDF status semantics · BUG · NEW
- **Problem:** a sent PDF can display "Rascunho"; after approval it displays
  "Enviado". The label does not match the state at generation time.
- **Evidence:** owner brief.
- **Impact:** the document misrepresents the quote's status.
- **Proposed solution:** define and fix the state semantics (`draft` / `sent` /
  `approved` / `rejected` / `expired`); the PDF stamps the state that was true at
  the moment it was generated/sent; ties into P-01 (state machine).
- **Complexity:** COMPLEX · **Deps:** P-01 · **Risk:** MEDIUM · **Phase:** 03.1-P04
- **Owner decision:** approve the state-semantics definition.

### P-13 — systematic dead-CTA / mock audit · TECH_DEBT · PARTIAL + recurring
- **Problem:** buttons without handlers, fake links, placeholders, forms without
  persistence, unused endpoints, missing endpoints, hardcoded data, partially
  functional screens.
- **Evidence:** discovery D-1b/D-3b; owner brief P-13.
- **Impact:** the owner should not have to hand-find every dead element.
- **Proposed solution:** a Product Completeness Audit pass (SCREEN → CTA → handler
  → API → persistence → tenant/RBAC → audit → loading/error/empty → domain-state
  → web/mobile scope → responsiveness → mock/dead element). Agents DISCOVER /
  TRIAGE / PROPOSE; objective findings auto-generate tasks; business/commercial
  changes need batch approval.
- **Complexity:** COMPLEX · **Deps:** — · **Risk:** LOW · **Phase:** 03.1-P07 + recurring (P-23)
- **Owner decision:** approve; confirm "auto-generate tasks for objective findings only".

### P-14 — web customer edit/delete · BUG · ALREADY_PLANNED
- **Problem:** `clientes/[id]/editar` calls `PATCH /api/customers/:id`, which does
  not exist; no `DELETE` either.
- **Evidence:** discovery D-9; `CustomerController`.
- **Impact:** every customer edit fails with "Erro ao salvar".
- **Proposed solution:** `PATCH /customers/:id` + `DELETE /customers/:id` (soft
  delete), tenant-scoped + ownership, audit (P-02); reuse the existing DTO.
- **Complexity:** COMPLEX · **Deps:** P-02 · **Risk:** MEDIUM · **Phase:** 03.1-P07
- **Owner decision:** approve; confirm delete = soft.

### P-15 — inventory-lite · FEATURE · PROMOTED_TO_MVP
- **Problem:** no stock/quantity, no cost price vs sale price, no catalogue import.
- **Evidence:** owner brief P-15.
- **Impact:** the technician cannot track materials or margin.
- **Proposed solution:** catalogue import via CSV/JSON; `quantity`/`stock`,
  `cost_price` (Decimal), `sale_price` (Decimal) on catalogue items; simple
  low-stock indicator. **Not now:** advanced photos, full barcode, automatic
  distributor integration (distributor API extraction = FUTURE).
- **Complexity:** COMPLEX → possibly its own phase · **Deps:** catalogue module, money handling · **Risk:** HIGH · **Phase:** new (Fase 3.2 or a Fase 4 lead item)
- **Owner decision:** approve scope + where it lands; confirm distributor API stays FUTURE.

### P-16 — Orcivo Livre ≥ 15 OS/month · BUSINESS_RULE · OWNER_DECISION_ALREADY_GIVEN
- **Problem:** the current free limit is 5 OS/month.
- **Evidence:** owner brief P-16 — `FREE_PLAN_OS_MONTHLY_BASELINE = 15`.
- **Impact:** commercial — the free tier must allow at least 15 OS/month.
- **Proposed solution:** change the plan-limits config + the copy on `/plano` and
  the paywall + the limit tests. No need to re-ask whether 15 is authorised.
- **Complexity:** STANDARD · **Deps:** P-22 (limits area) · **Risk:** MEDIUM · **Phase:** 03.1-P06
- **Owner decision:** already given — this line just needs controlled execution.

### P-17 — notifications (in-app / activity) · FEATURE · PROMOTED_TO_MVP (subset)
- **Problem:** no `Notification` model/service; the bell has no action; "Histórico"
  activity text lacks context.
- **Evidence:** discovery D-6 matrix (was Fase 7); owner brief P-17.
- **Impact:** the bell cannot stay a permanent placeholder for the MVP.
- **Proposed solution:** MVP subset = in-app notification / activity feed
  (backed by the audit trail P-02, with correct contextual text); the bell shows
  unread in-app items. Push / email stay a separate scope (Fase 7).
- **Complexity:** COMPLEX · **Deps:** P-02 · **Risk:** MEDIUM · **Phase:** new wave near 03.1-P07.5
- **Owner decision:** approve the in-app subset; confirm push/email stay separate.

### P-18 — web first, mobile parallel · STRATEGY · OWNER_DECISION_ALREADY_GIVEN
- Web MVP may ship first. Mobile is not abandoned — controlled parallel catch-up.
  The web launch is not blocked because mobile admin screens have not reached
  parity. No task; recorded as a planning constraint.

### P-19 — mobile catch-up · FEATURE · ALREADY_PLANNED (non-blocking)
- **Problem:** mobile Home is a stub; no customer detail; management screens
  incomplete.
- **Evidence:** discovery D-6.
- **Impact:** the field technician lacks a useful Home and customer detail.
- **Proposed solution:** a coherent mobile backlog — useful Home (KPIs + day
  agenda + quick actions) + customer detail — **not** a web-MVP blocker.
  Agenda / finance / config / team / plan on mobile stay out of the mobile
  surface's scope (dual-surface: mobile = field, web = management).
- **Complexity:** COMPLEX · **Deps:** — · **Risk:** MEDIUM · **Phase:** Fase 4 / mobile catch-up
- **Owner decision:** approve the backlog; confirm it does not block the web MVP.

### P-20 — systematic states / responsiveness · UX / TECH_DEBT · ALREADY_PLANNED
- **Problem:** no systematic loading / error / empty states, skeletons,
  `error.tsx` / `not-found.tsx`, breakpoint discipline; overflow / disabled
  feedback inconsistent.
- **Evidence:** discovery D-7b.
- **Impact:** rough edges across the product; not a hard MVP blocker.
- **Proposed solution:** a systematic pass on loading/error/empty/mobile-tablet-desktop
  responsiveness/overflow/disabled feedback, within the approved design system.
- **Complexity:** COMPLEX · **Deps:** — · **Risk:** LOW · **Phase:** 03.1-P10
- **Owner decision:** approve.

### P-21 — NFS-e / fiscal · FEATURE · DEFERRED_POST_MVP
- Explicitly FUTURE / POST-MVP. Do not implement now; do not let it delay the MVP.
  PlugNotas / fiscal stay Level C / future. Recorded, not scheduled.

### P-22 — billing provider-agnostic · TECH_DEBT / FEATURE · ALREADY_PLANNED
- **Problem:** placeholders are Asaas-shaped; the domain imports the SDK directly.
- **Evidence:** discovery D-8; ADR-017 (Mercado Pago preference, transparent checkout).
- **Impact:** switching providers later would touch the domain.
- **Proposed solution:** a `BillingProvider` / `PaymentProvider` interface;
  `MercadoPagoProvider` designed but not implemented; no account, no credentials,
  no production. Activation = Level C owner gate.
- **Complexity:** COMPLEX · **Deps:** — · **Risk:** MEDIUM · **Phase:** 03.1-P06
- **Owner decision:** approve the architecture; MP activation stays Level C.

### P-23 — recurring Product Completeness Audit · PROCESS · NEW
- **Problem:** dead elements and gaps reappear as the product grows.
- **Proposed solution:** run the Product Completeness Audit after each batch,
  before a release, after a phase completes, and when important new screens
  appear. It produces new `DISCOVERED` items. It never auto-executes new business
  rules.
- **Complexity:** STANDARD (process) · **Deps:** harness operational · **Risk:** LOW · **Phase:** recurring
- **Owner decision:** approve the cadence.

---

## Constraints carried from GSD state (PARTE 25)

- **P02 T12** — apply pending migrations to the persistent DB with backup /
  pre-checks — **human gate, not executed by an agent.**
- **P02 T13** — manual A/B two-tenant UAT (API / web / mobile) — **human gate.**
- **P03** does not start until **P02 = PASS** per the current planning. Not
  changed silently.

## Constraints carried from the threat model / harness

- Persistent migrations, production, DNS/VPS, billing credentials, LGPD, force
  push, destructive remote ops → **Level C** (owner gate) inside the harness too.
- The harness may DISCOVER / TRIAGE / PROPOSE product changes; it may not
  auto-execute a commercial decision.

---

## Owner decision menu

Reply with any combination:

- `APPROVE_ALL`
- `approve all except P-15 and P-10`
- `approve bugs only` (P-03, P-05, P-06, P-08, P-12, P-13, P-14)
- `defer P-15`
- `P-01: reopen is @AdminOnly, approved`
- `P-07: quick-create modal`
- `P-10: reusable technician signature`
- `P-09: MVP-lite edit/delete only`
- `P-02: MVP subset only`

Only approved items become `SCHEDULED`. Nothing here has been implemented.
