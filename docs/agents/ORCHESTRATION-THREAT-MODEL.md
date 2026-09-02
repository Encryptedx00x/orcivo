# Orchestration threat model — V2 security spine (3rd remediation)

Status: **UNDER_REVIEW / NOT_READY.** Three independent adversarial reviews have
rejected the orchestration security work so far:

1. `.planning/reviews/ORCHESTRATION-SUPERVISOR-INDEPENDENT-REVIEW.md` — rejected V1.
2. `.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW.md` — rejected the
   first V2 spine.
3. `.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW-3.md` — rejected the
   second remediation (H3-01..H3-05, M3-01..M3-03 reproduced).

This document records the boundary the V2 spine enforces **after the third
remediation**, and — explicitly — what it still does not.

`READY_FOR_FOURTH_SECURITY_REVIEW` — see `.planning/AGENT-HANDOFF.md` and
`.planning/reviews/THIRD-SPINE-REMEDIATION-REPORT.md`. Only an independent
reviewer can set `SECURITY_SPINE_REVIEW = PASS`.

## Third remediation — reproduced exploits now closed

| #     | Boundary now enforced                                                                                                                                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H3-01 | No caller `ScriptBlock` in the authoritative pipeline. Verification is the frozen declarative profile; a canonical result-independent invocation hash is bound into the check attestation and **recomputed** by the integrator.                 |
| H3-02 | ONE canonical secret library (`redaction.secretPatterns`) for redactor **and** scanner. A recursive pre-publication scan runs **inside `Invoke-Integration` before any push**; a hit → `SECRET_LEAK_BLOCKED` (recovers only via `QUARANTINED`). |
| H3-03 | Untrusted spec / acceptance / diff are transported **out of band** as SHA-256-bound read-only files. No fixed textual fence exists to escape.                                                                                                   |
| H3-04 | A malformed lease writes a **durable** quarantine marker; every acquire refuses until the explicit `Repair-QuarantinedLease` primitive (validates key, proves no live owner, audits the recovery).                                              |
| H3-05 | A protected-path grant must be an **exact canonical member** of `contract.grantableProtectedPrefixes`. No glob / root / parent / whole-`.planning`. Risk C is not a blanket grant.                                                              |
| M3-01 | Review envelope validated with a raw-JSON-type-preserving parser (`ConvertFrom-JsonTyped`). Object / null / string where the schema wants an array is rejected.                                                                                 |
| M3-02 | Re-freeze runs the full recompute-on-read validation (`Get-Contract`) before returning any existing contract.                                                                                                                                   |
| M3-03 | The fetch observation is **in-process authority** (session token). No `NO_REMOTE` dispatch path. `last-fetch.json` is audit-only.                                                                                                               |
| #9    | Preflight binds the derived index entry to the frozen contract (`taskId`, `gate`, `dependencies`). A derived index can never weaken a frozen contract.                                                                                          |
| #10   | Deterministic after-CAS-push-reject (genuine reject hook) / ancestry-failure / tree-mismatch (disposable-harness-only fault seam) regressions.                                                                                                  |
| L3-01 | Docs corrected: renewal is explicit `Beat-Lease` checkpoints; **live-process identity** is the load-bearing anti-theft rule. No background runspace.                                                                                            |

## Context

Neither V1 nor V2 executes real GSD tasks. V1's `run` / `loop` / `cleanup` are
**permanently disabled with no runtime override** (the previous
`ORCH_V1_REGRESSION_HARNESS=1` bypass is removed). The V2 synthetic pipeline
lives under `scripts/orchestration/v2/tests/` and `Assert-DisposableRoot` refuses
to run it against anything that overlaps the authority repo or lacks the
throwaway-fixture marker — there is no environment variable that changes this
(NC-01).

## Assets

1. `main` / the target branch and its history.
2. `.planning/`, `CLAUDE.md`, `AGENTS.md`, policy docs.
3. `scripts/orchestration/**`, `.orchestration/**` — the harness itself.
4. Authoritative acceptance tests (`*.isolation.spec.ts`, `prisma/schema.prisma`).
5. Provider credentials / secrets on the developer machine.
6. The correctness of "this task was done exactly once".

## Adversaries considered

| #   | Adversary                                                                                                      | V2 mitigation (2nd remediation)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Two supervisors / loops concurrently                                                                           | Atomic `CreateNew` leases in 5 namespaces; the ledger's `select+validate+choose-seq+append+seal` runs under a single blocking `ledger` lease so no two appends pick the same sequence; 2- and 8-writer races reproduced clean (`ledger.ps1`, `lease.ps1`).                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| A2  | Crash / timeout at any point                                                                                   | Hash-chained monotonic ledger with a sealed head; **any** inconsistency (bad seq, broken prev/current hash, dup seq, truncation, stale head, illegal recorded transition, terminal-state resurrection) → `QUARANTINED`, non-dispatchable, fail closed. No "plausible state" rebuild. Leases carry pid + process start time; a live holder is never treated as an orphan; renewal is explicit `Beat-Lease` checkpoints (no background runspace — L3-01). A malformed lease record → **durable quarantine marker**; every acquire refuses until the explicit `Repair-QuarantinedLease` recovery primitive (H3-04). **Verified process-tree kill (C-05) and full crash-resume (H-08) remain deferred.** |
| A3  | Hostile text (fake `VERDICT: APPROVE`, fake envelope, injection, huge finding, hostile JSON, wrong JSON types) | Untrusted spec/acceptance/diff are transported **out of band** as SHA-256-bound read-only files — no fixed fence to escape (H3-03). The verdict comes only from one JSON envelope validated against the authoritative Draft-07 schema using a **raw-JSON-type-preserving** parser (object/null/string where an array is required is rejected — M3-01), recursive `additionalProperties:false`, hard size/count/length bounds; criteria ids must equal the frozen acceptance set; every bound hash exact; the reviewer process must have exited 0. Anything else → `HUMAN_REVIEW_REQUIRED` / `INCOMPLETE_REVIEW` (`review-envelope.ps1`).                                                             |
| A4  | Executor edits planning / acceptance tests / policy / scripts / out-of-scope files                             | Contract frozen before dispatch, outside the worktree, content-hashed and **idempotent** (audit metadata excluded — NH-01). After the commit the real changed-file list is matched against the declared scope and the protected-path set using canonical Windows-aware paths (`.planning` etc. no longer defeated by dot-stripping). Empty declared scope **fails closed**; "unrestricted" is an explicit risk-C grant. Out-of-scope / protected → `POLICY_BLOCK`, never integrated (`contract.ps1`).                                                                                                                                                                                                |
| A5  | Content changes after a check/review passes                                                                    | Every attestation binds `{taskVersionId, baseSHA, headSHA, treeHash, diffHash, specHash, acceptanceHash, configHash, verificationProfileHash, verificationDefinitionHash, contractHash}`; the binding collector **recomputes** the contract hashes from the real spec/acceptance/profile (never trusts stored values); the integrity hash covers producer + payload + findings (NM-01); "latest authoritative result" wins, so a later `REQUEST_CHANGES` / `FAIL` invalidates an earlier `APPROVE` / `PASS` (`attest.ps1`).                                                                                                                                                                          |
| A6  | Local target or `origin` moves during a run                                                                    | The integration candidate (target merged into the branch) is frozen, checked and reviewed **as one commit**; integration publishes exactly that commit and only if `origin/<target>` is still at the SHA the candidate was built on — otherwise `REMOTE_DIVERGED` and a rebuild/re-review is required (#7). Publication means **remote-confirmed**: mandatory push + ancestry + tree proof; there is no local-only `PUBLISHED`. Every remote-CAS / push / ancestry failure appends a durable terminal ledger event (`PUSH_FAILED` / `REMOTE_DIVERGED` / `INTEGRATION_FAILED` — NM-02) (`integrate.ps1`).                                                                                             |
| A7  | Application error that looks like a provider failure                                                           | Classification reads only the CLI's structured control channel; application stdout/stderr is never consulted for a `PROVIDER_*` verdict; `UNKNOWN` never fails over; ≤ 1 cross-provider failover per lineage; negative-corpus test (`classify.ps1`).                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A8  | Secrets in agent output / artifacts                                                                            | ONE canonical library (`redaction.secretPatterns`) drives streaming redaction (line + multiline PEM buffer), sanitize-before-write, the **pre-publication scan gate inside `Invoke-Integration` — before any push** (a hit → `SECRET_LEAK_BLOCKED`, no push, no `PUBLISHED` — H3-02), and the final sweep. The `try/finally` sweep on every exit path stays as defence in depth. JSON `"password"/"token"/"DATABASE_URL"` shapes covered. **Primary control — not giving the executor secrets — still needs C-06.**                                                                                                                                                                                  |
| A9  | Hostile ID / path / provider arg → shell execution                                                             | Closed ID grammar; canonical path containment; `Resolve-Executable -NativeOnly` rejects `.cmd/.bat/.ps1` wrappers; reparse-point containment when a root is supplied; tested `CommandLineToArgvW` quoting; `UseShellExecute=$false` (`lib-v2.ps1`).                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| A10 | Task un-gates itself / weakens its own contract via the derived index                                          | A human gate is a durable JSON decision whose `gateHash` is recomputed on read over `{gateId, taskVersionId, specHash, decision, approvalIdentity, approvalTimestamp, nonce}`; any field tamper fails the gate; a spec change invalidates the approval. **Preflight also binds the derived index entry to the frozen contract** (`taskId`, `gate`, `dependencies`) — a derived index that drops a gate or a dependency is `STALE/INCONSISTENT AUTHORITY` and rejected (#9). A protected-path grant must be an exact allowlist member (H3-05). Synthetic approvals only from the isolated disposable-repo harness. **Full external-identity approval chain (C-04) deferred.**                         |
| A11 | Actor flips an environment variable to re-enable real execution (NC-01)                                        | Real-task execution is structurally impossible from any production entrypoint. `spine.ps1` has no `run` verb; the pipeline is a test helper under `tests/`; `Assert-DisposableRoot` rejects the authority root and requires the fixture marker. Legacy `ORCH_V1_REGRESSION_HARNESS` / `ORCH_V2_TESTING` unlock nothing.                                                                                                                                                                                                                                                                                                                                                                              |

## What the V2 spine does NOT yet defend against (deferred, each needs its own review)

- **C-05** — a timed-out agent's child/grandchild processes surviving the kill.
  No Windows Job Object / verified process-tree termination.
- **C-06** — OS-enforced isolation of the executor. The worktree is **not** a
  security boundary. The executor still runs with the developer's shell, config,
  credentials and network reachable.
- **H-08** — a full safe crash-resume protocol beyond the ledger (immutable
  checkpoint manifest + revalidation of spec/base/head/tree/lease).
- **H-09** — per-check hard timeouts, circuit breaker, cost/token budgets. Config
  carries the limits; enforcement across every executable path is not complete
  (arbitrary check scriptblocks, native streaming).
- **H-10** — a machine-readable GSD parser with a validated dependency graph; the
  V2 index is produced by the test harness, not a real reconciler.
- **Real Claude / Codex disposable execution** — the only executor exercised is
  the deterministic fake agent.

These are **not** downgraded to PASS anywhere.

## Roles (target design; privileges NOT yet OS-enforced)

| Role       | May touch `main` | May push        | Secrets | Network         | Notes                                                    |
| ---------- | ---------------- | --------------- | ------- | --------------- | -------------------------------------------------------- |
| EXECUTOR   | no               | no              | none    | deny by default | writes only its worktree/clone; tool allowlist           |
| REVIEWER   | no               | no              | none    | deny            | read-only; no memory / MCP / hooks / session persistence |
| INTEGRATOR | yes (only role)  | yes (only role) | minimal | as needed       | deterministic, no LLM                                    |

The V2 code separates these responsibilities. The _enforcement_ of the privilege
columns is C-06 and is not done.
