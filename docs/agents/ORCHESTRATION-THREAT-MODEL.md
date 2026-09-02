# Orchestration threat model — V2 security spine

Status: **UNDER_REVIEW / NOT_READY.** This documents the boundary the V2 spine
actually enforces today and, explicitly, what it does not.

## Context

The V1 supervisor (`scripts/orchestration/supervisor.ps1`) was rejected by an
independent adversarial review
(`.planning/reviews/ORCHESTRATION-SUPERVISOR-INDEPENDENT-REVIEW.md`, VERDICT:
REJECT). V2 (`scripts/orchestration/v2/`) is a clean-room rebuild of the load-
bearing security primitives. Neither V1 nor V2 executes real GSD tasks.

## Assets

1. `main` / the target branch and its history.
2. `.planning/`, `CLAUDE.md`, `AGENTS.md`, policy docs — the authority that
   defines what agents may do.
3. `scripts/orchestration/**`, `.orchestration/**` — the harness itself.
4. Authoritative acceptance tests (`*.isolation.spec.ts`, `prisma/schema.prisma`).
5. Provider credentials / secrets on the developer machine.
6. The correctness of "this task was done exactly once".

## Adversaries considered

| #   | Adversary                                                                                                                   | V2 mitigation                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Two supervisors / loops running concurrently                                                                                | Atomic `CreateNew` leases in 4 namespaces (`scheduler`, `taskversion`, `workspace`, `integration`); global serial `integration` lease; ledger append verifies its own sequence number after writing (`lease.ps1`, `ledger.ps1`)                                                                                                                            |
| A2  | Crash / timeout at any point                                                                                                | Monotonic ledger replay is authoritative; `PUBLISHED`/`QUARANTINED` terminal; leases carry `pid + process start time` so a reused PID is not mistaken for the holder; timeout marks the run non-integratable. **Verified process-tree kill is deferred (C-05).**                                                                                           |
| A3  | Task spec / diff / output contains hostile text (fake `VERDICT: APPROVE`, fake envelope, prompt injection)                  | Review verdict comes only from a single fenced JSON envelope, schema-validated, no regex scraping; text outside the envelope / multiple envelopes / truncation / invalid JSON all fail closed to `HUMAN_REVIEW_REQUIRED`; spec + diff are fenced as `UNTRUSTED_*` in the reviewer prompt (`review-envelope.ps1`)                                           |
| A4  | Executor violates instructions — edits planning, acceptance tests, policy, orchestration scripts, or files outside its task | Contract frozen before dispatch (outside the worktree, immutable, hashed); after the commit the real changed-file list is compared to the declared scope and the protected-path set; out-of-scope or protected → `POLICY_BLOCK`, never integrated, even if a review "approved" it (`contract.ps1`)                                                         |
| A5  | Content changes after a check/review passes (orphan process, operator, second supervisor)                                   | Every check/review/integration attestation is bound to `{taskVersionId, baseSHA, headSHA, treeHash, diffHash, specHash, acceptanceHash, configHash, verificationProfileHash, contractHash}`; the integrator recomputes all of them immediately before integrating and rejects any drift; no `git add -A` in the integrator (`attest.ps1`, `integrate.ps1`) |
| A6  | Local target or `origin` moves during a run                                                                                 | Preflight pins the reconciled index to `HEAD`; integration does `git fetch` + compares `origin/<target>` to local before touching the branch; push failure → `PUSH_FAILED` / `BLOCKED`, never `PUBLISHED`; remote ancestry of the merge commit is verified after push (`preflight.ps1`, `integrate.ps1`)                                                   |
| A7  | Application error that looks like a provider failure (`429`, `quota`, `billing`, `service unavailable` in test/app output)  | Classification reads only the CLI's structured control channel; application stdout/stderr is never consulted for a `PROVIDER_*` verdict; `UNKNOWN` never fails over; ≤ 1 cross-provider failover per attempt lineage; a negative corpus test proves it (`classify.ps1`)                                                                                    |
| A8  | Contaminated local config / secrets in agent output                                                                         | Redaction is streaming — raw stdout/stderr never touches disk; the same secret-shape patterns are used for redaction and for a post-run artifact scan; a synthetic-secret crash test proves nothing raw is persisted (`lib-v2.ps1`). **Primary control — not giving the executor secrets at all — needs the isolation work in C-06.**                      |
| A9  | Hostile task ID / path / provider arg → shell execution on Windows                                                          | Closed ID grammar (`^[A-Za-z0-9][A-Za-z0-9._-]*$`, ≤128, no `..`); path canonicalization + root containment; tested Microsoft `CommandLineToArgvW` argv quoting; `UseShellExecute=$false`, explicit executable resolution, never a shell string (`lib-v2.ps1`)                                                                                             |
| A10 | Task un-gates itself by editing planning prose                                                                              | A human gate is a durable JSON decision file bound to `specHash`; a spec change invalidates the approval; the task cannot write it (protected path). **Full first-class gate lineage (approvalNonce chain, external identity) is deferred (C-04).**                                                                                                        |

## What the V2 spine does NOT yet defend against (deferred, need their own review)

- **C-05** — a timed-out agent's child/grandchild processes surviving the kill.
  There is no Windows Job Object / verified process-tree termination yet. Today a
  timeout is recorded and the run is not integratable, but co-existing writers
  are not provably impossible if a child outlives the parent.
- **C-06** — OS-enforced isolation of the executor. The worktree is **not** a
  security boundary. The executor still runs with the developer's shell, config,
  credentials and network reachable. Enforcement must come from an OS
  sandbox / ACL / disposable clone, not from prompt instructions.
- **H-08** — a safe crash-resume protocol (immutable checkpoint manifest +
  full revalidation) beyond the ledger.
- **H-09** — per-check timeouts, circuit breaker, cost/token budgets.
- **H-10** — a machine-readable GSD parser with a validated dependency graph;
  the V2 index is currently produced by the test harness, not a real reconciler.
- **Real Claude / Codex disposable execution** — the only executor exercised so
  far is the deterministic fake agent.

## Roles (target design; privileges NOT yet OS-enforced)

| Role       | May touch `main` | May push        | Secrets | Network         | Notes                                                    |
| ---------- | ---------------- | --------------- | ------- | --------------- | -------------------------------------------------------- |
| EXECUTOR   | no               | no              | none    | deny by default | writes only its worktree/clone; tool allowlist           |
| REVIEWER   | no               | no              | none    | deny            | read-only; no memory / MCP / hooks / session persistence |
| INTEGRATOR | yes (only role)  | yes (only role) | minimal | as needed       | deterministic, no LLM                                    |

The V2 code separates these responsibilities (the integrator is `integrate.ps1`,
a deterministic process; the reviewer prompt is read-only and fenced). The
_enforcement_ of the privilege columns is C-06 and is not done.
