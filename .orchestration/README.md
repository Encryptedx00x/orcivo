# .orchestration/

Runtime state for the Orcivo agent-orchestration layer. Full picture:
`docs/runbooks/agent-orchestration.md`.

> **This directory is V1 runtime state. V1 is `LEGACY_REJECTED_REFERENCE_ONLY`**
> (independent review VERDICT: REJECT). The security remediation lives in
> `.orchestration/v2/` with its own namespace — V2 never reads V1 state, and no
> V1 PASS/review/check artifact carries any trust into V2. V1 `run`/`loop`/
> `cleanup` are disabled; `index`/`status`/`next`/`recover` remain for inspection.

## Tracked (only these two)

- `config.json` — knobs only (providers, check profiles, scheduler limits, merge
  - review policy, redaction denylist, Level-C triggers). **No status lives here.**
- `README.md` — this file.

## Runtime (gitignored — never committed)

| Path                   | What                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `execution-index.json` | task index derived from `.planning` (`supervisor.ps1 index`). Reconstructable. `reconciled=false` ⇒ the loop refuses to run. |
| `queue/<taskId>.json`  | manual task specs (`supervisor.ps1 run -Task …`)                                                                             |
| `runs/<runId>/`        | `run.json`, prompts, agent + check logs, verify / review / merge verdicts                                                    |
| `checkpoints/`         | portable redacted checkpoints (pre-failover / on pause)                                                                      |
| `logs/`                | `supervisor.log`                                                                                                             |
| `locks/<runId>.lock`   | worktree writer lock — cleared automatically when its pid is dead                                                            |
| `worktrees/<runId>/`   | the git worktree for a run                                                                                                   |
| `loop.stop`            | create this file to stop `supervisor.ps1 loop` at the next tick                                                              |
| `recover-report.json`  | last `supervisor.ps1 recover` scan                                                                                           |

`.planning/STATE.md` is the source of truth. `git` is the canonical
implementation state. This directory is disposable: delete it and
`supervisor.ps1 index` rebuilds the index; `orch/*` branches still hold the work.
