# Orchestration threat model — V2 security spine (2nd remediation)

Status: **UNDER_REVIEW / NOT_READY.** Two independent adversarial reviews have
rejected the orchestration security work so far:

1. `.planning/reviews/ORCHESTRATION-SUPERVISOR-INDEPENDENT-REVIEW.md` — rejected V1.
2. `.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW.md` — rejected the
   first V2 spine, having independently reproduced violations in controls the
   spine claimed to address.

This document records the boundary the V2 spine enforces **after the second
remediation**, and — explicitly — what it still does not.

`READY_FOR_THIRD_SECURITY_REVIEW` — see `.planning/AGENT-HANDOFF.md`. Only an
independent reviewer can set `SECURITY_SPINE_REVIEW = PASS`.

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

| #   | Adversary                                                                                    | V2 mitigation (2nd remediation)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Two supervisors / loops concurrently                                                         | Atomic `CreateNew` leases in 5 namespaces; the ledger's `select+validate+choose-seq+append+seal` runs under a single blocking `ledger` lease so no two appends pick the same sequence; 2- and 8-writer races reproduced clean (`ledger.ps1`, `lease.ps1`).                                                                                                                                                                                                                                                                                                                                               |
| A2  | Crash / timeout at any point                                                                 | Hash-chained monotonic ledger with a sealed head; **any** inconsistency (bad seq, broken prev/current hash, dup seq, truncation, stale head, illegal recorded transition, terminal-state resurrection) → `QUARANTINED`, non-dispatchable, fail closed. No "plausible state" rebuild. Leases carry pid + process start time; a live holder is never treated as an orphan. **Verified process-tree kill (C-05) and full crash-resume (H-08) remain deferred.**                                                                                                                                             |
| A3  | Hostile text (fake `VERDICT: APPROVE`, fake envelope, injection, huge finding, hostile JSON) | Review verdict comes only from one fenced JSON envelope validated against the authoritative Draft-07 schema (recursive `additionalProperties:false`) plus hard size/count/length bounds; criteria ids must equal the frozen acceptance set; every bound hash must match exactly; the reviewer process must have exited 0. Anything else → `HUMAN_REVIEW_REQUIRED` / `INCOMPLETE_REVIEW` (`review-envelope.ps1`).                                                                                                                                                                                         |
| A4  | Executor edits planning / acceptance tests / policy / scripts / out-of-scope files           | Contract frozen before dispatch, outside the worktree, content-hashed and **idempotent** (audit metadata excluded — NH-01). After the commit the real changed-file list is matched against the declared scope and the protected-path set using canonical Windows-aware paths (`.planning` etc. no longer defeated by dot-stripping). Empty declared scope **fails closed**; "unrestricted" is an explicit risk-C grant. Out-of-scope / protected → `POLICY_BLOCK`, never integrated (`contract.ps1`).                                                                                                    |
| A5  | Content changes after a check/review passes                                                  | Every attestation binds `{taskVersionId, baseSHA, headSHA, treeHash, diffHash, specHash, acceptanceHash, configHash, verificationProfileHash, verificationDefinitionHash, contractHash}`; the binding collector **recomputes** the contract hashes from the real spec/acceptance/profile (never trusts stored values); the integrity hash covers producer + payload + findings (NM-01); "latest authoritative result" wins, so a later `REQUEST_CHANGES` / `FAIL` invalidates an earlier `APPROVE` / `PASS` (`attest.ps1`).                                                                              |
| A6  | Local target or `origin` moves during a run                                                  | The integration candidate (target merged into the branch) is frozen, checked and reviewed **as one commit**; integration publishes exactly that commit and only if `origin/<target>` is still at the SHA the candidate was built on — otherwise `REMOTE_DIVERGED` and a rebuild/re-review is required (#7). Publication means **remote-confirmed**: mandatory push + ancestry + tree proof; there is no local-only `PUBLISHED`. Every remote-CAS / push / ancestry failure appends a durable terminal ledger event (`PUSH_FAILED` / `REMOTE_DIVERGED` / `INTEGRATION_FAILED` — NM-02) (`integrate.ps1`). |
| A7  | Application error that looks like a provider failure                                         | Classification reads only the CLI's structured control channel; application stdout/stderr is never consulted for a `PROVIDER_*` verdict; `UNKNOWN` never fails over; ≤ 1 cross-provider failover per lineage; negative-corpus test (`classify.ps1`).                                                                                                                                                                                                                                                                                                                                                     |
| A8  | Secrets in agent output / artifacts                                                          | Streaming redaction with a **multiline buffer** for PEM blocks; spec/acceptance/prompt text is sanitised before it is written; a recursive secret sweep runs on **every** pipeline exit path (success / fail / timeout / policy block / exception) via `try/finally`; redactor and scanner share one pattern library (`lib-v2.ps1`). **Primary control — not giving the executor secrets — still needs C-06.**                                                                                                                                                                                           |
| A9  | Hostile ID / path / provider arg → shell execution                                           | Closed ID grammar; canonical path containment; `Resolve-Executable -NativeOnly` rejects `.cmd/.bat/.ps1` wrappers; reparse-point containment when a root is supplied; tested `CommandLineToArgvW` quoting; `UseShellExecute=$false` (`lib-v2.ps1`).                                                                                                                                                                                                                                                                                                                                                      |
| A10 | Task un-gates itself                                                                         | A human gate is a durable JSON decision whose `gateHash` is recomputed on read over `{gateId, taskVersionId, specHash, decision, approvalIdentity, approvalTimestamp, nonce}`; any field tamper fails the gate; a spec change invalidates the approval; the task cannot write it (protected path). Synthetic approvals are only possible from the isolated disposable-repo harness. **Full external-identity approval chain (C-04) deferred.**                                                                                                                                                           |
| A11 | Actor flips an environment variable to re-enable real execution (NC-01)                      | Real-task execution is structurally impossible from any production entrypoint. `spine.ps1` has no `run` verb; the pipeline is a test helper under `tests/`; `Assert-DisposableRoot` rejects the authority root and requires the fixture marker. Legacy `ORCH_V1_REGRESSION_HARNESS` / `ORCH_V2_TESTING` unlock nothing.                                                                                                                                                                                                                                                                                  |

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
