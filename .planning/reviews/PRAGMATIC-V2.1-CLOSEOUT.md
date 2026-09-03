---
type: closeout
milestone: orchestration harness — pragmatic V2.1
date: 2026-09-03
threat_model: LOCAL_TRUSTED_HOST
status: implemented; deterministic Wave 0 complete
supersedes: >
  ORCHESTRATION-SUPERVISOR-INDEPENDENT-REVIEW, ORCHESTRATION-V2-SPINE-SECURITY-REVIEW(1/3/4),
  ORCHESTRATION-V2.1-ARCHITECTURE-SECURITY-REVIEW as *blocking* gates — see §2/§17.
---

# PRAGMATIC V2.1 — orchestration harness closeout

The purpose of this document is to end the security-architecture loop and get
back to building Orcivo. It records the final threat model, what was accepted as
out of scope, what was actually built, and the deterministic proof.

---

## 1. Final threat model

`THREAT_MODEL = LOCAL_TRUSTED_HOST` (OWNER decision, 2026-09-03).

The owner's local Windows 11 machine **and** the Windows user account the harness
runs as are **TRUSTED**. The harness defends against what the LLM agents and
candidate-controlled code do wrong, and against operational failure — **not**
against an attacker who already holds the owner's access.

- `HOST_SAME_USER_ATTACKER = OUT_OF_SCOPE`
- `ZONE_A_D_SEPARATE_WINDOWS_IDENTITIES = NOT_REQUIRED` (Zone A and Zone D may
  run as the same Windows user)
- No Windows user creation, no dedicated Windows service, no SID separation, no
  TPM, no CNG boundary, no Zone A↔D credential broker.

Full narrative: `docs/agents/ORCHESTRATION-THREAT-MODEL.md`.
Machine-readable: `.orchestration/v2/config.v2.json` → `threatModel`.

The 26 in-scope threats (PARTE 2 of the owner brief) and their containment
mechanisms are tabulated in the threat-model doc §3–§4.

---

## 2. Accepted risks

Every finding whose exploitation depends **only** on *"a process with the same
access as the trusted owner manually alters the host's artifacts / credentials /
in-memory state"* is `ACCEPTED_RISK_OUT_OF_SCOPE`. Not pretended-fixed —
documented and non-blocking.

| id | supersedes prior finding(s) | accepted because |
|---|---|---|
| AR-01 | C-05 | verified process-tree kill on timeout — a runaway agent child on the trusted same-user host is a reliability nuisance, not privilege escalation. Kept: direct-child kill + lease quarantine + run marked non-integratable. |
| AR-02 | C-06 | OS-enforced host isolation of executor/reviewer/integrator by SID/service — the executor already runs as the trusted owner; Docker Linux is the containment mechanism when real execution is possible. |
| AR-03 | H4-01, M4-03 | a coherently self-hashed rewrite of a frozen contract file / closed-world schema — requires writing `.orchestration/v2/contracts/*.json` on the trusted host. Contract immutability still blocks the LLM (it never reaches the authority namespace). |
| AR-04 | H4-05, M4-02, M3-03 (in-process) | in-process authority-token / lease-quarantine-recovery forgery from a hostile same-user process — requires code execution as the owner. Cheap hardening (atomic recovery, token hashing) retained. |
| AR-05 | Zone A/D SID, H4-02 (junction) | single Windows SID for Zone A/D; NTFS junction redirection of the authority's own out-of-band files. |
| AR-06 | Docker daemon launch authority | trusted host Docker daemon. |

Findings that remain **BLOCKERS** regardless of threat model (all handled — see
§4 and §15): LLM containment, stale candidate, incorrect review, secret leak,
crash/recovery, provider outage, duplicate task, ambiguous push, Level C bypass.

---

## 3. Implementation

Everything is layered on the existing V2 security spine (`scripts/orchestration/v2/`).
V1 remains `LEGACY_REJECTED_REFERENCE_ONLY`.

New PRAGMATIC V2.1 modules:

| module | responsibility |
|---|---|
| `taskclass.ps1` | semantic task classifier + safety floors/caps (PARTE 11) |
| `router.ps1` | adaptive profile→capability router, CLI capability probe, `Select-Reviewer` (PARTE 12/16/28) |
| `providers.ps1` | Claude↔Codex failover decision, `WAITING_PROVIDER`, durable wait record, backoff poll, auto-resume (PARTE 13/14) |
| `continuation.ps1` | context-window rollover checkpoint, closed whitelist (PARTE 15) |
| `fence.ps1` | run generation fencing + crash-recovery decision (PARTE 9) |
| `intent.ps1` | `INTEGRATION_INTENT` + `Resolve-RemoteTruth` remote-truth reconciliation (PARTE 8) |
| `correction.ps1` | bounded correction loop, `FAILED_REVIEW_BUDGET` (PARTE 17) |
| `taskgraph.ps1` | task generation shape + dependency graph validation (PARTE 19) |
| `ledger.ps1` (extended) | new states `WAITING_PROVIDER`, `FAILED_REVIEW_BUDGET`, `REMOTE_RECONCILING`, `NOT_PUBLISHED_CONFIRMED`, `AMBIGUOUS_REMOTE` |
| `config.v2.json` (extended) | `threatModel`, `acceptedRisks`, `taskClassifier`, `router`, `providerFailover`, `correctionLoop`, `integrationIntent`, `generation`, secret-scan encodings |

Wave 0 harness: `scripts/orchestration/v2/tests/wave0/` (`run-wave0.ps1`,
`wave0-probe.ps1`). No model calls; throwaway repos; NC-01 enforced.

---

## 4. Task classifier

`Get-TaskClassification -Task <hashtable>` → structured:

```
taskComplexity   TRIVIAL | STANDARD | COMPLEX | CRITICAL | LEVEL_C
risk             LOW | MEDIUM | HIGH | CRITICAL
recommendedProfile  FAST | BALANCED | REASONING | CRITICAL
reviewStrength   NORMAL | STRONG | CROSS_PROVIDER_REQUIRED
suggestedProvider  CLAUDE | CODEX | EITHER
confidence       0..1
reasonCodes      [ BLAST_RADIUS_WIDE, SECURITY_DOMAIN, MONEY_DOMAIN, ... ]
floorsApplied    [ securitySensitive, persistentDbMigration, ... ]
verdict          CLASSIFIED | PROHIBITED
```

Difficulty is **semantic**: blast radius, reversibility, domain signals
(tenant / money / security / migration / concurrency / external), acceptance
ambiguity, failure history. Hardcoded rules are **only** safety floors/caps:

- `securitySensitive` → never below `COMPLEX` / `REASONING` / `STRONG`
- `tenantIsolationFundamental` → `CRITICAL` (or `LEVEL_C` if it also touches a
  persistent migration) + `CROSS_PROVIDER_REQUIRED`
- `moneyArchitecture` → `CRITICAL` + `CROSS_PROVIDER_REQUIRED`
- `persistentDbMigration` → `LEVEL_C`
- `production` → `LEVEL_C`
- `forcePush` → `PROHIBITED`

An optional classifier agent can only *raise* the deterministic result, never
lower it. Deterministic scorer is the Wave 0 authority (`Test-ClassifierSelftest`).

---

## 5. Model / reasoning router

No permanently hardcoded model version. `Get-CliCapabilities` probes the
**installed** CLI (`<bin> --version`, `<bin> --help`, and `codex exec --help`),
parses the real flags for model / reasoning-effort / structured-output /
fresh-context / sandbox, caches in `state/cli-capabilities.json`, and refreshes
on a version-string change. A config `knownCapabilities` fallback fills a gap the
live probe cannot read (e.g. `codex exec --help` needing a TTY) and the route
lists it in `limitations`.

Observed on this host at closeout:

| provider | version | reasoning selector | structured output | fresh context |
|---|---|---|---|---|
| claude | 2.1.259 | `--effort` (native) | `--output-format json` | `--no-session` |
| codex  | 0.152.1 | `-c model_reasoning_effort=` | `--json` / `--output-schema` | new `codex exec` invocation |

`Resolve-Route` maps complexity → profile (`TRIVIAL→FAST … CRITICAL/LEVEL_C→CRITICAL`),
honours `suggestedProvider` and provider health, and never routes below the
classifier's recommended profile. When a CLI cannot select reasoning explicitly
the best supported mechanism is used and the limitation is recorded.

---

## 6. Failover

Provider attribution comes **only** from the CLI control channel (`classify.ps1`,
H-01). `Get-FailoverDecision`:

- provider class (`PROVIDER_AUTH` / `PROVIDER_QUOTA` / `PROVIDER_RATE_LIMIT` /
  `PROVIDER_TRANSIENT`) + an alternate healthy provider → `FAILOVER`, same task
  lineage, ≤ 1 switch per lineage.
- provider class + no alternate healthy → `WAITING_PROVIDER`.
- `TEST_FAILED` / `APPLICATION_ERROR` / `CHECK_FAILURE` / `UNKNOWN` /
  `BUILD_FAILED` / `REVIEW_REQUEST_CHANGES` → `NO_FAILOVER` (a task failure is
  not a provider outage).

Wave 0: W0-10/11/12 (failover both directions), W0-17 (no switch on task failure).

---

## 7. WAITING_PROVIDER

`Enter-WaitingProvider` persists everything needed to resume (PARTE 14): task,
taskVersion, workspace/candidate, generation, attempt history, provider history,
verification state, review state, checkpoint, last error class, next retry
time/backoff. Ledger → `WAITING_PROVIDER` (dispatchable only via the resume
path). `Invoke-ProviderPollSweep` runs on a backoff schedule
(`pollBackoffSec = [30,60,120,300,600]`, cap 900s) and resumes automatically
when a provider is healthy again — no human action.

Wave 0: W0-13 (both down → WAITING_PROVIDER, persisted, still-waiting on poll),
W0-26 (all PARTE-14 fields present).

---

## 8. Automatic provider resume

`Resume-FromWaitingProvider` transitions `WAITING_PROVIDER → DISPATCHED` with
event `provider-resume` (NOT `dispatch`), so a resume never consumes a fresh
attempt from the `maxAttemptsPerVersion` budget. Wave 0: W0-14 (auto-resume on
the healthy provider, attempt count unchanged).

---

## 9. Restart provider resume

`Invoke-ProviderPollSweep` is called both by the running scheduler and at
supervisor startup (state reconciliation). A fresh process finds every
`WAITING_PROVIDER` task from its durable wait record and resumes it when a
provider is healthy. Wave 0: W0-15 (seed WAITING_PROVIDER in one process; a
**separate** process resumes it — no "continue" from the owner).

---

## 10. Context rollover

`Test-IsContextExhaustion` distinguishes a context-length control message from
quota / rate / auth — context exhaustion is **NOT** a provider failure and
NEVER fails over. `New-ContinuationCheckpoint` writes a hash-bound checkpoint
containing ONLY: `taskIdentity, acceptance, decisions, candidate, diffSummary,
verificationResults, openFindings, nextAction, importantArtifacts`. Forbidden
keys (`chainOfThought`, `reasoning`, `transcript`, `messages`, …) and any
unknown key fail closed. A fresh invocation continues the **same task lineage**.

Wave 0: W0-16.

---

## 11. Independent review

`Select-Reviewer` prefers the **opposite** provider from the implementer. For
`CROSS_PROVIDER_REQUIRED` (CRITICAL / LEVEL_C) with the opposite provider
unavailable → **escalate**, never review with the same provider. For `NORMAL`
review strength a same-provider fresh review is permitted when the opposite is
down. The reviewer receives task / acceptance / candidate identity / exact
diff / check results / secret-scan evidence — **not** the implementer's hidden
reasoning (out-of-band SHA-bound transport, spine H3-03). Wave 0: W0-28.

---

## 12. Correction loop

`Invoke-CorrectionLoop` drives Execute → Verify → Review, bounded by
`config.correctionLoop.maxCycles` (2). Each cycle MUST produce a **distinct
candidate id** and a **fresh review** (enforced — a reused candidate id fails).
`REQUEST_CHANGES` after the budget → `FAILED_REVIEW_BUDGET` (→ WAITING_HUMAN),
never an infinite loop. `HUMAN_REVIEW_REQUIRED` / `INCOMPLETE_REVIEW` → WAITING_HUMAN
immediately. Wave 0: W0-18/19/29.

---

## 13. Integration truth

`INTEGRATION_INTENT` (`intent.ps1`) is written **before** any git publication
with all PARTE-8 fields (`runId, taskId, taskVersionId, attemptId,
candidateCommit, candidateTree, baseRemoteSha, remoteName, repoIdentity,
targetRef, expectedResultCommit, expectedResultTree, createdAt, state`).
`repoIdentity` is a hash of the credential-stripped remote URL.

States: `INTEGRATION_PREPARED → PUSH_ATTEMPTED → REMOTE_RECONCILING →
{ PUBLISHED | NOT_PUBLISHED_CONFIRMED | AMBIGUOUS_REMOTE }`.

`Resolve-RemoteTruth` fetches `origin`, compares SHA / tree / ancestry, and is
the **authority** for the terminal state — local belief is never trusted:

- remote contains the candidate + tree matches expected → `PUBLISHED`
- remote at base, nothing landed → `NOT_PUBLISHED_CONFIRMED`
- remote advanced but does not contain the candidate → `NOT_PUBLISHED_CONFIRMED`
- **fetch failed / remote unresolvable → `AMBIGUOUS_REMOTE`** (never a false
  "NOT_PUBLISHED")
- remote contains the candidate but the tree differs → `AMBIGUOUS_REMOTE`

`Invoke-IntentReconciliation` is idempotent: a task already `PUBLISHED` (ledger
or reconciled) is never re-published. This closes review-4 **H4-06** — the
post-push test seam that falsified remote truth is replaced by a real fetch.

Wave 0: W0-20 (fetch failure → AMBIGUOUS_REMOTE), W0-21 (push lands, "crash"
before ledger, reconciliation confirms PUBLISHED, no duplicate).

---

## 14. Crash recovery

`fence.ps1`: every run claims a monotonic **generation** with a durable fence
record `{generation, runId, holder(pid+startTime), state}`. `Invoke-FenceRecovery`:

1. detect stale/failed owner
2. if the holder is provably **live** → `STILL_ACTIVE`, refuse to recover
3. if provably dead → **fence the old generation** (bump the counter), THEN
   `RECOVERED`, THEN a new generation
4. if liveness is undeterminable (unreadable fence) →
   `config.generation.undeterminableState` (`WAITING_HUMAN`)

A stale executor from generation N is rejected by `Test-GenerationCurrent`.
Never `RECOVERED` first and then check. Wave 0: W0-09.

Ledger-level: the hash-chained monotonic ledger already quarantines any
inconsistency fail-closed; every integration failure path appends a durable
terminal event (review-4 **M4-04** addressed).

---

## 15. Human gates

Level C (`preflight.ps1` durable hash-bound gate) still requires the owner:
production, persistent DB migrations, destructive data, secrets/API keys,
billing, fiscal, LGPD, fundamental multi-tenant strategy, fundamental money
architecture, major stack/architecture change, paid/new external service, DNS,
VPS, force push, destructive remote operation, business-requirement change,
subjective product decision. The classifier and task graph both flag Level C;
the ledger goes `WAITING_HUMAN` and is not auto-dispatchable. Normal coding
tasks do not ask the owner. Wave 0: W0-22.

---

## 16. Deterministic Wave 0

`powershell -NoProfile -File scripts\orchestration\v2\tests\wave0\run-wave0.ps1`

W0-01 … W0-30 — see `run-wave0.ps1`. No model calls. W0-03/04/05/06/07 reuse the
already-proven security-spine adversarial probe. Result at closeout: **see
`.planning/AGENT-HANDOFF.md` and the commit message** (`DETERMINISTIC_WAVE0`).

The pre-existing V2 spine adversarial suite (`spine.ps1 selftest`) is re-run to
confirm no regression from the ledger / config changes.

---

## 17. Real provider smoke

Deterministic Wave 0 does not call a model. A real disposable smoke of the
Claude and Codex CLIs is evaluated separately — see
`REAL_CLAUDE_SMOKE` / `REAL_CODEX_SMOKE` in the final report. It is gated on
being able to run **without** copying the owner's HOME, copying git publication
credentials, creating a new credential, exposing Orcivo secrets, changing Docker
global config, installing a dependency, requiring admin, or starting a paid
service. If any of those would be required → `WAITING_OWNER_APPROVAL` with the
smallest necessary action stated.

---

## 18. Limitations (honest)

- The V2.1 driver composes the spine primitives; a single monolithic
  `Invoke-V21Run` production entrypoint is **not** shipped — real-task execution
  stays structurally disabled (NC-01). Wave 0 proves each autonomy behaviour in
  isolation against the real spine + real ledger + real git.
- The classifier agent path is defined but off; the deterministic scorer is the
  authority. Tuning it against real GSD tasks is future work.
- Docker Linux containment for the implementer/reviewer is the **intended**
  mechanism (config `zoneSeparation.containment`); the disposable-container
  composition itself is not yet built — under `LOCAL_TRUSTED_HOST` the worktree
  is an acceptable scope boundary for the pilot, and candidate-controlled code
  still never runs in the supervisor (Wave 0 W0-02).
- H4-03 is **partially** closed: UTF-8/UTF-16LE/UTF-16BE decoding + committed
  candidate blob scanning are configured; exotic encodings beyond those are not
  covered.
- Per-check hard timeouts / circuit breaker / token budgets (former H-09) have
  config limits but are not enforced on every path.

None of these block the pilot under the pragmatic threat model.

---

## 19. Product batch status

`MVP PRODUCT BATCH #1` is generated as **PROPOSAL ONLY** at
`.planning/product/MVP-PRODUCT-BATCH-1.md`. It reconciles the owner's P-01…P-23
backlog with the existing roadmap / discovery (D-1…D-9) / ADRs 015-017. It
**STOPS at `OWNER_APPROVAL`**. No item is scheduled, no code is written. Wave 0
W0-30 asserts no code path auto-approves a batch.

`FREE_PLAN_OS_MONTHLY_BASELINE = 15` (P-16) and `NFS-e = FUTURE` (P-21) are
recorded as owner decisions already given; they still enter controlled
execution, not this batch's implementation.

---

## 20. Owner approval + PILOT MODE (2026-09-03 addendum)

The owner **approved MVP Product Batch #1** with per-item decisions
(`.planning/product/MVP-PRODUCT-BATCH-1.md` → OWNER APPROVAL). Reconciled into
`MVP-PRODUCT-BATCH-1.tasks.json` (23 `PB1-*` tasks, 6 Level C) +
`MVP-PRODUCT-BATCH-1.plan.json` (`batch-reconcile.ps1`, reconcile OK). Execution
order + gate analysis: `MVP-PRODUCT-BATCH-1-EXECUTION.md`.

- Every `PB1-*` carries `blockedByGates: [P02-T12, P02-T13, P03]` — the reconciler
  rejects any task that does not. **Nothing runs before P03.**
- Roadmap deltas: new phase **F3.2 (inventory-lite)** (P-15 promoted); new wave
  **P17-wave** (P-17 subset promoted). `PB1-P02-audit-service` promoted to the
  P04 lead task (P-01 depends on it).
- Recurring process `PROC-product-completeness-audit` (P-23): DISCOVER / TRIAGE /
  PROPOSE only.

**PILOT MODE** (`scripts/orchestration/v2/pilot.ps1`) is the guarded composed
lifecycle. Guards in `config.pilot`: `maxParallel=1`, `forcePush=false`,
`levelCStop=true`, bounded retries + review cycles, durable checkpoints, failover
+ auto-resume + restart-resume, opposite-provider review, exact candidate, secret
gate, remote-truth reconciliation. `runnerMode` default `inproc-fake` (synthetic,
no models). Docker composition: `infra/orchestration/Dockerfile.agent-runner` +
`runner-docker.ps1` (read-only candidate, `--network none` test stage, no
docker.sock / HOME / secrets, non-root, caps) — daemon is up; the one remaining
action is a single `docker build` (base-image pull, no credential).

Synthetic pilot validation: `pilot.ps1 selftest` → PS-01..PS-11
(classify→route→implement→verify→secret→opposite-review→integrate→checkpoint;
Level C → WAITING_HUMAN; both-down → WAITING_PROVIDER → auto-resume; failover;
bounded correction → FAILED_REVIEW_BUDGET; crash → fence → recover; durable
checkpoint; no force-push; real PB1 refused; docker invariants). No model calls,
no Orcivo product task.

**Real execution is still gated shut:** a `PB1-*` task needs
`.orchestration/v2/REAL_EXECUTION_AUTHORIZED` + P02/P03 satisfied + (Level C) an
owner gate. None exist, and there is still no `run` verb for a real task.
