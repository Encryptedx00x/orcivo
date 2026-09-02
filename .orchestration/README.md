# .orchestration/

Runtime state for the Orcivo agent-orchestration layer. See
`docs/runbooks/agent-orchestration.md` for the full picture.

## Tracked (only these two)

- `config.json` — minimal config: providers, check profiles, redaction denylist,
  Level-C triggers. Textual policy stays in `.planning` + `CLAUDE.md` +
  `docs/AUTONOMY_POLICY.md` + `docs/DECISION_MATRIX.md`.
- `README.md` — this file.

## Runtime (gitignored — never committed)

| Path                   | What                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `execution-index.json` | pointer list rebuilt from `.planning` on demand (`supervisor.ps1 index`). Not authoritative — `status` is `NEEDS_RECONCILE` until confirmed. |
| `queue/<taskId>.json`  | task specs the supervisor runs                                                                                                               |
| `runs/<runId>/`        | `run.json`, prompts, agent logs, check logs, verify verdicts                                                                                 |
| `checkpoints/`         | portable redacted checkpoints (pre-failover / on pause)                                                                                      |
| `logs/`                | `supervisor.log` + per-run consoles                                                                                                          |
| `locks/<runId>.lock`   | worktree writer lock — one writer at a time                                                                                                  |
| `worktrees/<runId>/`   | the git worktree for a run (also tracked by `git worktree`)                                                                                  |

`.planning` is the source of truth. `git` is the canonical implementation state.
This directory is disposable: delete it and `supervisor.ps1 index` rebuilds the
pointer list; run branches (`orch/*`) still hold the work.
