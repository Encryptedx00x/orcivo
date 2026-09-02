# Agent orchestration — Orcivo

> **Status (2026-09-02): V1 is `LEGACY_REJECTED_REFERENCE_ONLY`; the V2 spine is
> in its 3rd remediation and awaiting a FOURTH independent review.**
>
> Three independent adversarial reviews rejected the work so far:
> `.planning/reviews/ORCHESTRATION-SUPERVISOR-INDEPENDENT-REVIEW.md` (V1),
> `.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW.md` (first V2 spine),
> and `.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW-3.md` (the second
> remediation — the reviewer reproduced a caller-controlled verification
> procedure, schema-invalid review approvals via wrong JSON types, prompt-fence
> escape, non-sticky lease quarantine, a wildcard protected-path grant,
> tamper-then-refreeze, JSON-shaped secrets surviving redaction, and a forged
> `NO_REMOTE` fetch observation). The third remediation
> (`.planning/reviews/THIRD-SPINE-REMEDIATION-REPORT.md`) closes H3-01..H3-05,
> M3-01..M3-03, #9, #10 and L3-01, each as a permanent regression test.
>
> V2 is **NOT production-ready** and is `UNDER_REVIEW / NOT_READY`. Neither V1 nor
> V2 executes real GSD tasks. V1 `run` / `loop` / `cleanup` are **permanently
> disabled with no override**. See `docs/agents/ORCHESTRATION-THREAT-MODEL.md`.

---

## V2 security spine (`scripts/orchestration/v2/`)

Own state namespace (`.orchestration/v2/`), no dot-sourcing of V1, no migration
of V1 artifacts into V2 trust.

```powershell
powershell -File scripts\orchestration\v2\spine.ps1 status     # boundary + status
powershell -File scripts\orchestration\v2\spine.ps1 explain     # finding coverage
powershell -File scripts\orchestration\v2\spine.ps1 selftest    # adversarial suite (no models)
```

| file                         | concern                                                                                                                                                        | findings                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `lib-v2.ps1`                 | canonical JSON + SHA-256, atomic `CreateNew` + `Invoke-FileCas`, streaming + multiline redaction, Win32 argv quoting, canonical paths, `Assert-DisposableRoot` | C-03, H-11, H-12, NC-01, NH-01, L-01 |
| `ledger.ps1`                 | hash-chained monotonic ledger under an atomic ledger lease; sealed head; corruption → QUARANTINED                                                              | C-01                                 |
| `contract.ps1`               | idempotent freeze; recompute-on-read; canonical protected paths; empty scope fails closed; NO_CHANGE bound to frozen criteria                                  | H-06, M-01, M-03, NH-01              |
| `verification.ps1`           | declarative verification profiles (config, not task); `verificationDefinitionHash` + effective invocation                                                      | NH-02                                |
| `attest.ps1`                 | content-addressed attestations; integrity covers producer/payload; latest-authoritative-result                                                                 | C-03, NM-01                          |
| `lease.ps1`                  | atomic leases in 5 namespaces; live holder never orphan; CAS heartbeat/release/break; malformed → quarantine                                                   | H-05, H-04                           |
| `classify.ps1`               | failure class from the provider control channel only; negative corpus                                                                                          | H-01                                 |
| `review-envelope.ps1`        | fenced JSON envelope validated against the authoritative schema; size/count bounds; criteria = frozen set                                                      | C-02, H-03, M-05                     |
| `preflight.ps1`              | mandatory gate; requested version must exist in the index; proven fetch; hash-bound gate decisions                                                             | H-07, C-04 (partial), NC-01          |
| `integrate.ps1`              | the only path to the target; publication = remote-confirmed; no post-review target merge; every failure closes the ledger                                      | H-04, C-03, NM-02                    |
| `spine.ps1`                  | the only V2 entrypoint — **no `run` verb**                                                                                                                     | —                                    |
| `tests/pipeline-harness.ps1` | composes the above into one synthetic run; `Assert-DisposableRoot`; fake agent only                                                                            | NC-01                                |

Deferred (each needs its own review; **not** downgraded to PASS): **C-05**
(verified process-tree kill), **C-06** (OS-enforced executor isolation), **H-08**
(full crash-resume protocol), **H-09** (per-check hard timeouts / circuit breaker
/ budgets), **H-10** (machine-readable GSD parser), and real Claude/Codex
disposable smoke.

---

## V1 (LEGACY_REJECTED_REFERENCE_ONLY)

Kept only for comparison and as the frozen 23-case regression baseline
(`scripts/orchestration/tests/`). `index` / `status` / `next` / `recover` remain
available for inspection; `run` / `loop` / `cleanup` are blocked. The sections
below describe V1 as it was and are retained as reference — they do **not**
reflect a supported system.

---

## Source of truth

| Concern                                       | Owner                                                              |
| --------------------------------------------- | ------------------------------------------------------------------ |
| phases, tasks, gates, decisions, GSD state    | `.planning/STATE.md` (+ `ROADMAP.md`, `phases/*/`) — authoritative |
| operational checkpoint between sessions       | `.planning/AGENT-HANDOFF.md`                                       |
| policy / autonomy rules                       | `CLAUDE.md`, `docs/AUTONOMY_POLICY.md`, `docs/DECISION_MATRIX.md`  |
| canonical implementation state                | git                                                                |
| task isolation                                | native `git worktree`                                              |
| derived task index, run/lock/checkpoint state | `.orchestration/` (runtime, gitignored)                            |

`.orchestration/execution-index.json` is **derived** — rebuilt from `.planning`
on demand, never hand-edited. `config.json` holds knobs, never status.

---

## Pipeline

```
.planning ──reconcile──▶ execution-index.json  (tasks, deps, gates, status, scopes)
                               │
              supervisor.ps1 loop / run
                               │  pick READY (deps satisfied, not Level C, scope-safe)
                               ▼
        git worktree add  ─ branch orch/<runid>  (main never touched here)
                               │
   run-agent.ps1 ─▶ claude -p (primary)  ──PROVIDER_* only──▶ codex exec (same worktree, continues)
                               │
   verify.ps1 ─▶ deterministic checks scoped to task risk (config.checkProfiles)
                               │  PASS
   review.ps1 ─▶ the OTHER provider reviews the diff
                               │  APPROVE   (REQUEST_CHANGES → back to executor, ≤2 cycles)
   merge.ps1 ─▶ integrate main into branch → re-verify → merge --no-ff → push
                               │
   task → MERGED / WAITING_HUMAN / NEEDS_REVIEW   (branch always kept until cleanup)
```

---

## Commands

> `run` / `loop` / `cleanup` below are **permanently disabled** (no override).
> Only `index` / `status` / `next` / `recover` remain, for inspection.

```powershell
# rebuild + validate the task index from .planning
powershell -File scripts\orchestration\supervisor.ps1 index

# queue + workers + providers + main sync
powershell -File scripts\orchestration\supervisor.ps1 status

# the next auto-runnable task (deps + Level-C aware)
powershell -File scripts\orchestration\supervisor.ps1 next

# run ONE task end to end (worktree → agent → verify → cross-review → safe merge)
powershell -File scripts\orchestration\supervisor.ps1 run -Task <taskId> [-NoMerge]

# continuous scheduler — reconcile → run READY → repeat; sleeps when idle/blocked/gated
powershell -File scripts\orchestration\supervisor.ps1 loop
#   stop it: New-Item .orchestration\loop.stop

# after a crash / closed terminal / reboot — detect orphans, never delete dirty work
powershell -File scripts\orchestration\supervisor.ps1 recover        # read-only report
powershell -File scripts\orchestration\supervisor.ps1 recover -Apply # clear provably-safe orphans

# archive a finished run: remove its worktree, keep branch + logs + checkpoints
powershell -File scripts\orchestration\supervisor.ps1 cleanup -Task <taskId>
```

### Config knobs (`.orchestration/config.json`)

- `scheduler.maxParallel` = **1** (ceiling 2). Keep 1 until a real wave passes.
- `scheduler.refuseRunWhenNotReconciled` = true — the loop will not run against a
  broken index.
- `merge.enabled`, `merge.requireReviewApprove`, `merge.pushAfterMerge`.
- `review.enabled`, `review.maxCycles` = 2.
- `providers.failoverOn` — the only four classes that trigger Claude→Codex.

---

## Reconciliation & validation

`supervisor.ps1 index` parses every `*-PLAN.md`, reconciles each task's status
against its `*-SUMMARY.md`, and validates:

| Check                                                    | Result                   |
| -------------------------------------------------------- | ------------------------ |
| task in a SUMMARY that the plan table doesn't declare    | ERROR                    |
| dependency on a plan that doesn't exist (in-scope)       | ERROR                    |
| plan dependency cycle                                    | ERROR                    |
| plan `status: complete` but a task is still PENDING      | ERROR                    |
| in-plan predecessor not resolved but the task is DONE    | ERROR                    |
| DONE with an empty SUMMARY note                          | NEEDS_RECONCILE (blocks) |
| task DONE while a dependency _plan_ isn't fully resolved | warning (`ran-ahead`)    |
| plan vs SUMMARY frontmatter status disagree              | warning                  |

Validation covers the **active phase (from `STATE.md`) and later**; historical
phases trust `STATE.md`. If `reconciled=false`, `loop` refuses to run.

---

## Failover — Claude → Codex

Switch providers **only** for a corroborated provider-level failure:

| Class                                                                                                                | Failover?                           |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `PROVIDER_QUOTA` `PROVIDER_RATE_LIMIT` `PROVIDER_AUTH_EXPIRED` `PROVIDER_TEMP_UNAVAILABLE`                           | **yes**                             |
| `AGENT_ERROR` `CHECK_FAILURE` `BUILD_FAILURE` `TEST_FAILURE` `MERGE_CONFLICT` `INFRA_FAILURE` `HUMAN_GATE` `UNKNOWN` | no — retry / recover / stop / pause |

`UNKNOWN` never fails over (conservative). On failover: checkpoint → Codex
launches in the **same worktree**, told to CONTINUE the partial work. If Codex
also hits a provider failure → run pauses `BLOCKED_PROVIDER` for a human.

---

## Cross-review

Claude implements → Codex reviews. Codex implements → Claude reviews. The reviewer
gets the task spec + acceptance criteria + the git diff + the check results, runs
**read-only**, and emits `VERDICT: APPROVE | REQUEST_CHANGES | HUMAN_REVIEW_REQUIRED`.

`REQUEST_CHANGES` → feedback goes back to the executor in the same worktree
(≤ `review.maxCycles`). `HUMAN_REVIEW_REQUIRED` → task pauses `WAITING_HUMAN`,
branch kept.

---

## Safe merge

1. preconditions: verify PASS + review APPROVE + branch committed & clean
2. `git merge <target>` into the branch — conflict → `NEEDS_REVIEW`, stop
3. re-run the check profile on the integrated branch (= the post-merge tree)
4. `main` checkout must be clean, on `main`, and unmoved since the run started
5. `git merge --no-ff <branch>` into `main` (branch already contains `main` → clean)
6. `git push` (normal) if `merge.pushAfterMerge`

**Never**: force push, `reset --hard`, deleting a branch before its work is
merged, merging a red branch. `Assert-SafeGitArgs` blocks those literally.

---

## Level C — human gates

`WAITING_HUMAN` is a **terminal paused state, not a failure**. Detected from the
task class (`HUMAN_APPROVAL` / `MANUAL_UAT`) and by scanning the task text against
`config.levelCGuards.triggers` (persistent DB, secrets, billing, deploy, DNS,
money handling, destructive data, force push, business-requirement change…). The
supervisor prints the gate (task / why / instructions / what happens after) and
never tries to work around it. Clear the gate by doing the step manually and
recording it in the plan's SUMMARY, then re-run `index`.

---

## Crash recovery

Everything is reconstructable from git + `.planning` + `.orchestration/`.
`supervisor.ps1 recover` detects: orphan locks (dead pid), stale worktrees,
interrupted `RUNNING` runs, dirty branches, checkpoints. It marks interrupted
runs `RECOVERABLE` (has a checkpoint) or `NEEDS_REVIEW` (dirty, no checkpoint) and
**never deletes dirty work**. `-Apply` only clears provably-safe orphan locks and
prunes empty worktrees.

---

## Security / redaction

Every file that can carry CLI/agent output (`logs/`, `checkpoints/`, prompts,
review findings, merge conflict dumps) passes through `Protect-Secrets`:
`Authorization`/`Bearer`/cookies, `*_SECRET` / `*_TOKEN` / `*_PASSWORD` /
`*_KEY`, `DATABASE_URL`, `scheme://user:pass@host`, JWTs, `sk-…`, `ghp_…`, AWS
keys, PEM keys — plus a structural guard that collapses any `.env`-style
`KEY=VALUE` dump wholesale. No environment dumps are ever persisted.

---

## Tests

```powershell
powershell -File scripts\orchestration\tests\run-tests.ps1
```

23 deterministic cases against throwaway git repos under `$env:TEMP` — real
`main` and real `.planning` are never touched. `fake-agent.ps1` stands in for
`claude -p` / `codex exec` (no quota, no network). Covers: reconciliation,
dependency gating, scope conflict, `maxParallel`, `WAITING_HUMAN`, both
executors, Claude→Codex failover, both reviewers, review-reject→correction,
check-failure ≠ provider-failure, crash recovery, orphan lock, dirty-worktree
preservation, redaction, main-changed-during-run, safe merge, post-merge verify.

---

## Turn it off

```powershell
New-Item .orchestration\loop.stop        # stops the loop at the next tick

# remove run worktrees + branches (keeps nothing), safe for main:
git worktree list | Select-String 'orchestration\\worktrees' | ForEach-Object { ($_ -split '\s+')[0] } |
  ForEach-Object { git worktree remove --force $_ }
git branch --list 'orch/*' | ForEach-Object { git branch -D ($_.Trim()) }
git worktree prune
```

`main`, production, the DB and `.planning` are never touched by the orchestration
layer — it only ever writes `orch/*` branches, `.orchestration/` runtime, and (on
a successful reviewed merge) a `--no-ff` merge commit on `main`.
