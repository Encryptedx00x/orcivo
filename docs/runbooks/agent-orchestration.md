# Agent orchestration — Orcivo

Smallest possible multi-agent execution layer for Orcivo. **Not a framework.** It
wraps native primitives so Claude Code (primary) and Codex (fallback/reviewer)
can execute GSD tasks in isolated git worktrees, with deterministic checks and
provider failover.

> Status (2026-09-02): **SETUP + POC only.** Not wired to real GSD tasks.
> Failover is implemented and POC-proven; the continuous scheduler loop is
> designed, not built. See `.planning/AGENT-HANDOFF.md`.

---

## Architecture

```
.planning / GSD                         <- source of truth (phases, gates, decisions)
      |
config.json + execution-index.json      <- thin, reconcilable pointer layer
      |
scripts/orchestration/supervisor.ps1    <- pick READY task, deps, Level-C gate, dispatch
      |
  git worktree add  (per run)           <- isolation; branch orch/<runid>
      |
  run-agent.ps1  ->  claude -p (headless)      primary
                     codex exec (headless)     fallback / reviewer
      |
  verify.ps1  ->  deterministic checks scoped to task risk (config.checkProfiles)
      |
  checkpoint.ps1  ->  portable redacted checkpoint (before failover / on pause)
      |
  commit on the run branch  (POC: never merged to main)
```

**Ownership**

| Concern                                                  | Owner                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| phases, requirements, tasks, gates, decisions, GSD state | `.planning` (authoritative)                                  |
| canonical implementation state                           | git                                                          |
| task isolation                                           | native `git worktree`                                        |
| run/worktree/retry/failover/scheduler state              | `.orchestration/` (runtime, gitignored)                      |
| portable Claude<->Codex checkpoint                       | `.planning/AGENT-HANDOFF.md` + `.orchestration/checkpoints/` |
| auxiliary context (decisions, history, gaps)             | ai-memory — **never** source of truth                        |

---

## Files

### Tracked

```
scripts/orchestration/
  lib.ps1           shared helpers: json io, redaction, locks, failure classification
  supervisor.ps1    the loop: index | status | next | run | cleanup
  run-agent.ps1     launch ONE agent against ONE worktree, once. classify. no commit/merge.
  verify.ps1        run the check profile in the worktree. PASS iff every check exits 0.
  checkpoint.ps1    build a redacted checkpoint from git + run metadata
  poc-verify.mjs    disposable POC artifact check
.orchestration/config.json   minimal tracked config (providers, check profiles, redaction, Level-C triggers)
```

### Runtime (gitignored — `.orchestration/*` except `config.json`)

```
.orchestration/
  execution-index.json   generated pointer list, rebuilt from .planning on demand
  queue/<taskId>.json     task specs the supervisor executes
  runs/<runId>/           run.json, prompts, logs, results, verify verdicts
  checkpoints/            portable checkpoints
  logs/                   supervisor.log + per-run consoles
  locks/<runId>.lock      worktree writer lock (one writer at a time)
  worktrees/<runId>/       the git worktree for the run
```

---

## Install / prerequisites

Everything is already on this machine (verified 2026-09-01):

| Tool        | Version | Notes                                               |
| ----------- | ------- | --------------------------------------------------- |
| Claude Code | 2.1.257 | `claude.exe`, subscription auth                     |
| Codex CLI   | 0.145.0 | npm shim; auth = "Logged in using ChatGPT"          |
| git         | 2.52.0  | native worktrees                                    |
| Node        | 24.11.1 | checks + poc-verify                                 |
| pnpm        | 9.15.0  | monorepo checks                                     |
| PowerShell  | 5.1     | Windows-native; no pwsh 7, no WSL, no Docker needed |

No install step. No new dependency. No third-party orchestrator.

---

## Commands

```powershell
# rebuild the pointer index from .planning (status = NEEDS_RECONCILE until a human/agent confirms)
powershell -File scripts\orchestration\supervisor.ps1 index

# show queue + runs + index + main HEAD
powershell -File scripts\orchestration\supervisor.ps1 status

# print the next READY task (respects deps + Level-C gates)
powershell -File scripts\orchestration\supervisor.ps1 next

# run one task (worktree -> agent -> verify -> checkpoint; POC mode never merges)
powershell -File scripts\orchestration\supervisor.ps1 run -Task <taskId>

# archive a run: remove worktree, keep branch + logs + checkpoints
powershell -File scripts\orchestration\supervisor.ps1 cleanup -Task <taskId>
```

### Fault injection (POC / testing only — never exhausts real quota)

```powershell
$env:ORCH_INJECT_FAIL = "claude:PROVIDER_QUOTA"   # provider:CLASS
powershell -File scripts\orchestration\supervisor.ps1 run -Task <taskId>
Remove-Item Env:\ORCH_INJECT_FAIL
```

---

## Failover — Claude -> Codex

**Switch providers ONLY for provider-level failure**, classified from exit code +
stderr + stdout (raw evidence stored in `runs/<id>/logs/` and `results/`):

| Class                                                                                      | Failover?                           |
| ------------------------------------------------------------------------------------------ | ----------------------------------- |
| `PROVIDER_QUOTA` `PROVIDER_RATE_LIMIT` `PROVIDER_AUTH_EXPIRED` `PROVIDER_TEMP_UNAVAILABLE` | **yes**                             |
| `CHECK_FAILURE` `AGENT_ERROR` `TIMEOUT` `MERGE_CONFLICT` `HUMAN_GATE`                      | no — retry / recover / stop / pause |

Sequence on a provider failure:

1. stop; the writer lock is released (no concurrent writers, ever).
2. `checkpoint.ps1` captures: task id, run id, branch, base SHA, HEAD, dirty
   files, `diff --stat`, bounded redacted diff, commands run, checks run, agent
   results, failure class, next action.
3. supervisor sets `spec.continueFromCheckpoint` + `spec.previousProvider`.
4. Codex launches in the **same worktree**, told explicitly to CONTINUE the
   partial work, not restart.
5. verify -> commit on branch. If Codex also hits a provider failure -> run
   pauses `BLOCKED_PROVIDER` for a human.

No "mental context transfer": filesystem + git + task spec + checkpoint are the
whole truth.

---

## Level C (human gates)

`WAITING_HUMAN` is a **terminal paused state, not a failure**. Triggers: the
CLAUDE.md matrix — stack change, paid service, billing/fiscal/LGPD, multi-tenant
strategy, money handling, deploy/DNS, secrets/API keys, destructive data ops,
force push / history rewrite, business-requirement change, subjective visual
judgement. Detected from the task spec (`level: "C"` / `humanGate: true`) and by
scanning title/notes/objective against `config.levelCGuards.triggers`. The agent
prompt also instructs the model to emit `HUMAN_GATE: <why>` and stop.

The scheduler may continue _other_ independent SAFE tasks only if doing so cannot
cross or invalidate the gate; otherwise the pipeline pauses.

---

## Security / redaction

- Every file that can carry CLI/agent output (`logs/`, `checkpoints/`,
  `prompts`) is passed through `Protect-Secrets` (regex denylist in
  `config.redaction`): api keys, tokens, bearer/authorization, cookies,
  `sk-...`, `ghp_...`, PEM private keys.
- Checkpoints never contain `.env`, auth files, or environment dumps.
- Prompts to the fallback agent carry the checkpoint (redacted) + task spec —
  never a raw environment or the primary's credentials.
- The agent prompt forbids touching secrets / persistent DB / production.

---

## Recovery — rebuild context from scratch

Everything is reconstructable without this tool's runtime:

```
git -C <repo> log --oneline <baseSha>..orch/<runId>     # what the run did
.planning/AGENT-HANDOFF.md                              # portable checkpoint
.planning/STATE.md  .planning/ROADMAP.md                # GSD truth
.orchestration/checkpoints/<runId>-*.json               # last known run state
.orchestration/runs/<runId>/                            # prompts, logs, verdicts
```

If `.orchestration/` is wiped: `supervisor.ps1 index` rebuilds the pointer list;
run branches (`orch/*`) still hold the work; checkpoints are gone but the diff
is in git.

---

## Turn it all off

```powershell
# stop: nothing runs on a schedule yet. Just don't invoke supervisor.ps1.

# remove all run worktrees + branches, keep nothing:
git worktree list | Select-String 'orchestration\\worktrees' | ForEach-Object {
  ($_ -split '\s+')[0]
} | ForEach-Object { git worktree remove --force $_ }
git branch --list 'orch/*' | ForEach-Object { git branch -D ($_.Trim()) }
git worktree prune

# wipe runtime (keeps tracked config.json + this doc):
Remove-Item -Recurse -Force .orchestration\runs, .orchestration\queue, `
  .orchestration\checkpoints, .orchestration\logs, .orchestration\locks, `
  .orchestration\worktrees, .orchestration\execution-index.json
```

## Remove Orca-style orchestration entirely, without damaging the repo

```powershell
git rm -r scripts/orchestration
git rm .orchestration/config.json
# remove the .gitignore block for .orchestration/
Remove-Item -Recurse -Force .orchestration
# revert docs
git rm docs/runbooks/agent-orchestration.md
git commit -m "chore: remove agent orchestration layer"
```

No production, DB, `.planning`, or app code is touched by any of the above.
`main` is unaffected — the orchestration layer only ever writes to `orch/*`
branches and `.orchestration/` runtime.
