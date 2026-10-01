# PB1-P13 — Product Completeness Audit (web)

Date: 2026-10-01

Scope: `apps/web`, traced through Next route handlers and server actions to
`apps/backend`, Prisma persistence, tenant/RBAC controls, and audit services.
This is a discovery/triage/proposal artifact only. It neither changes product
scope nor schedules work.

### Triage boundary

An item is a generated candidate only when the current surface makes a
testable functional promise and the implementation objectively drops, ignores,
or cannot retrieve the required data. Candidate records are proposals, not
roadmap items: they have no assignee, priority, milestone, due date, or
automatic execution. Findings that would select a commercial flow, a planned
product capability, a retention/security policy, or an RBAC policy are kept in
the owner batch even where the UI makes that future scope visible.

## Method and coverage

Every web route and visible action was traced as applicable through:

`screen → CTA/form → client handler → web BFF/server action → Nest endpoint → service → Prisma → tenant/RBAC/audit`.

The following existing flows were confirmed as connected, including the
surface's available loading, error, or empty treatment:

| Surface | Verified chain / controls |
| --- | --- |
| Authentication and invite acceptance | Login, two-step signup, refresh/logout, and invite acceptance proxy to matching auth/invite endpoints. |
| Dashboard, lists and navigation | Authenticated server rendering uses `apiFetch`; rendered list/search/filter controls are local or backend-backed as appropriate. |
| Catalog | Create/update/import/photo upload/removal reach catalog endpoints; photo endpoints persist through the existing storage service. |
| Quotes and public approval | Create, detail edits, PDF, send, cancellation/state actions and public approval route to quote endpoints. Backend enforces tenant/RBAC/audit. |
| Work orders | Manual creation, state actions, photos and payment registration route to work-order/payment endpoints. Backend uses tenant-scoped lookups and auditable transitions. |
| Agenda | Create/update/delete reach appointment endpoints; service validates ownership and writes audit events. |
| Finance | Payment create/update/settle/delete map to admin-only backend handlers and transactions with audit entries. |
| Company/account/invites/notifications | Account and company updates, Pix, approval methods, invitations and read-state use matching handlers; relevant services are tenant-scoped. |

The controls below are exceptions. Line references are repository-relative
evidence for the classifications.

## Objective functional findings — candidate tasks generated

These are observable implementation defects independent of commercial policy.
Each has a proposed-only candidate in
`PB1-P13-WEB-OBJECTIVE-CANDIDATES.json`; none is scheduled by this audit.

| ID | Finding and evidence | Broken chain | Classification |
| --- | --- | --- |
| O-01 | New customer collects type, CPF/CNPJ, second phone, address, and tags, but submits only `name`, `phone`, `email`, `city`, `state`, and `notes` ([form](../../apps/web/app/(app)/clientes/novo/page.tsx:13), [payload](../../apps/web/app/(app)/clientes/novo/page.tsx:42)). DTO/model lack the omitted address/tag/second-contact fields ([DTO](../../packages/shared-types/src/customer/customer-create.dto.ts:3), [model](../../prisma/schema.prisma:112)). | Form state → omitted payload → no persistence/readback. | OBJECTIVE; CP-WEB-001. |
| O-02 | “Agendar visita técnica” and “Salvar endereço como obra” change shortcut state, but submit branches only on `shortcuts.quote` ([state](../../apps/web/app/(app)/clientes/novo/page.tsx:29), [submit](../../apps/web/app/(app)/clientes/novo/page.tsx:80), [controls](../../apps/web/app/(app)/clientes/novo/page.tsx:465)). | CTA → state toggle → no handler/API/persistence. | OBJECTIVE; CP-WEB-002. |
| O-03 | Customer quote CTAs append `?client_id=…` ([detail](../../apps/web/app/(app)/clientes/[id]/ClienteDetail.tsx:166)), but the quote page/form never reads search params nor initializes `customerId` ([page](../../apps/web/app/(app)/orcamentos/novo/page.tsx:1), [state](../../apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx:93)). The OS screen demonstrates the expected `useSearchParams` pattern ([OS](../../apps/web/app/(app)/ordens-de-servico/novo/page.tsx:18)). | CTA navigation → ignored query → wrong selection state. | OBJECTIVE; CP-WEB-003. |
| O-04 | Quote creation exposes “Observações internas”, stores `internalNotes`, then omits it from the create request ([state](../../apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx:105), [field](../../apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx:450), [request](../../apps/web/app/(app)/orcamentos/novo/NovoOrcamentoForm.tsx:201)). Quote schema has no such field ([schema](../../packages/shared-types/src/quote/quote-create.dto.ts:12)). | Form input → omitted DTO/API → no persistence/readback. | OBJECTIVE; CP-WEB-004. |
| O-05 | Customer profile always receives an empty quote list and records the missing filter in TODO ([page](../../apps/web/app/(app)/clientes/[id]/page.tsx:25)). Its OS, finance, address and history tabs render only generic empty text ([tabs](../../apps/web/app/(app)/clientes/[id]/ClienteDetail.tsx:416)); identity pills are hard-coded ([pills](../../apps/web/app/(app)/clientes/[id]/ClienteDetail.tsx:144)). Existing list APIs lack the needed customer-scoped reads ([quotes](../../apps/backend/src/quote/quote.controller.ts:32), [work orders](../../apps/backend/src/work-order/work-order.controller.ts:47), [payments](../../apps/backend/src/payment/payment.service.ts:72), [appointments](../../apps/backend/src/appointment/appointment.dto.ts:42)). | Screen/tab → mock/empty data → no customer-scoped read model. | OBJECTIVE; CP-WEB-005. |
| O-06 | Settings identity “Trocar logo” has no handler; six clickable-looking colour swatches are `div`s with no handler/state ([controls](../../apps/web/app/(app)/configuracoes/page.tsx:813)). `Company` has `logo_url` and `brand_color`, but profile validation/persistence exposes neither ([model](../../prisma/schema.prisma:45), [schema](../../apps/backend/src/company/company-profile-update.schema.ts:23)). | CTA → no handler/BFF → no persistence/audit. | OBJECTIVE; CP-WEB-006. |
| O-07 | “Salvar e novo” is a rendered disabled button with no implementation ([form](../../apps/web/app/(app)/clientes/novo/page.tsx:135)). The regular save flow can create the entity, so this is not an authorization state. | CTA → disabled/no handler. | OBJECTIVE; CP-WEB-007. |
| O-08 | Customer creation uses a four-column address grid with fixed 180/120/200px columns, and the wider customer/OS, settings, dashboard, plan, and detail screens use inline multi-column grids without component-level breakpoints ([customer address](../../apps/web/app/(app)/clientes/novo/page.tsx:309), [customer shell](../../apps/web/app/(app)/clientes/novo/page.tsx:150), [OS shell](../../apps/web/app/(app)/ordens-de-servico/novo/page.tsx:143), [settings](../../apps/web/app/(app)/configuracoes/page.tsx:359), [dashboard](../../apps/web/app/(app)/dashboard/page.tsx:267)). The shared responsive rules only apply to `.ov-grid-*`; these screens do not use those classes ([global rules](../../apps/web/app/globals.css:280)). | Narrow viewport → fixed inline grid → clipped/overflowing form controls rather than a usable reflow. | OBJECTIVE; CP-WEB-008. |

## Owner batch — product/commercial decisions, not auto-scheduled

These are intentionally excluded from candidate tasks and need future
product/business owner direction.

| ID | Evidence | Why not auto-scheduled |
| --- | --- | --- |
| D-01 | Non-current Plan cards show active-looking `Mudar para …` buttons with no `onClick` ([plan](../../apps/web/app/(app)/plano/page.tsx:381)); checkout exists ([controller](../../apps/backend/src/billing/billing.controller.ts:20)). | Wiring it initiates a paid commercial subscription. |
| D-02 | Global search is deliberately disabled as “Busca em breve” ([top bar](../../apps/web/components/TopBar.tsx:131)); no search endpoint/module exists. | Search scope, indexed entities, permissions and ranking are product decisions. |
| D-03 | Documents' Contract tab says contracts will arrive later ([documents](../../apps/web/app/(app)/documentos/DocumentosContent.tsx:181)); no contract API/persistence exists. | Planned product capability, not a defect with a determined implementation. |
| D-04 | Security, Notifications and Export settings are explicit future placeholders ([settings](../../apps/web/app/(app)/configuracoes/page.tsx:841)). | Separate product/security/retention/export requirements. |
| D-05 | Team declares custom permissions future and member removal is marked future ([team](../../apps/web/app/(app)/equipe/page.tsx:254), [permissions](../../apps/web/app/(app)/equipe/page.tsx:315)). | RBAC and membership-lifecycle policy require owner direction. |
| D-06 | Custom tag creation and CEP lookup are unavailable ([tags](../../apps/web/app/(app)/clientes/novo/page.tsx:211), [CEP](../../apps/web/app/(app)/clientes/novo/page.tsx:287)). | Tags/address model and any CEP provider are product/data/commercial decisions. O-01/O-02 cover only existing silent-loss/dead-control defects. |

## Missing endpoint, tenant, audit and state assessment

Every existing web BFF action was matched to a backend endpoint. The missing
endpoint findings are O-05 (customer-scoped aggregate reads) and O-06
(logo/brand update); D-02/D-03 are deferred product surfaces. Protected
mutations are not called missing merely because a non-admin may receive 403:
Nest enforces `@AdminOnly`, tenant context is used by services, and the reviewed
mutations record audit events in their transactions.

No operational surface reviewed substitutes mock rows for a persisted backend
response. O-05's profile pills/statistics/tabs are the discovered mock
presentation. Explicitly disabled/deferred elements are itemized above rather
than represented as working functionality.

The pass makes no subjective visual judgement. It is confined to objectively
traceable functionality and does not alter the design system.

The responsive review found O-08 rather than making a subjective layout
assessment: the cited fixed pixel columns are wider than their parent at a
narrow viewport, and the only shared breakpoints do not select those inline
grids. No visual redesign is proposed; the candidate is limited to preserving
the existing controls and information through an explicit responsive layout.

## Audit limits and handoff

This pass is static source tracing. It validates the web route, BFF, backend
controller/service, schema, and persistence chains available in this clone;
it does not claim a live backend/browser exercise. The isolated clone has no
installed workspace dependencies, so the Next.js typecheck and dependency
backed browser tests cannot be invoked here. The report's source evidence and
the candidate JSON can nevertheless be mechanically checked without changing
the product surface. A follow-up implementation task should run the normal
workspace typecheck, build, and affected browser/API tests after dependencies
are restored.
