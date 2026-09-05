# .orchestration/v2/ — V2 security spine runtime

This directory is the **V2-only** state namespace. V1 (`.orchestration/`) runtime
state is never read by V2, and no V1 PASS / review / check artifact is migrated
into V2 trust — old artifacts are untrusted historical evidence only.

Tracked in git: `config.v2.json`, `schemas/*.json`, this file.
Everything else here is runtime and gitignored:

```
ledger/<taskVersionId>.jsonl      append-only monotonic execution ledger (C-01)
contracts/<taskVersionId>.json    frozen immutable task contract (H-06)
attestations/<taskVersionId>/     content-addressed check/review/integration attestations (C-03)
leases/<namespace>/<key>.lease    atomic writer/integration leases (H-05, H-04)
gates/<taskVersionId>/<gateId>.json   durable human-gate decisions (C-04, partial)
state/index.v2.json               derived task index (written by the V2 reconciler — deferred)
state/last-fetch.json             AUDIT ONLY — the real fetch authority is in-process (M3-03)
leases/<ns>/<key>.lease.QUARANTINED   durable malformed-lease quarantine marker (H3-04)
runs/<runId>/                      per-run prompts + redacted logs
logs/spine.log                    redacted spine log
KILL_SWITCH                        create this file to stop all V2 dispatch
```

`taskVersionId = sha256(taskId, planningHead, specHash, acceptanceHash)`.
A new requirement / spec / acceptance text produces a **new** id and a **new**
ledger — a `PUBLISHED` version can never be scheduled again.

See `docs/agents/ORCHESTRATION-THREAT-MODEL.md` and
`docs/agents/ORCHESTRATION-ATTESTATIONS.md`.

## Real dispatcher

`pilot.ps1 run` consumes the existing owner-approved planning task graph and
continues until the graph is idle, a human/provider wait is reached, or the stop
file is observed. `run-once` executes at most one READY task. `status` and
`stop` are safe control-plane commands. PB1 tasks additionally require the
existing `REAL_EXECUTION_AUTHORIZED` token and all declared planning gates.
Level C tasks pause at `WAITING_HUMAN` until `approve-gate` writes an atomic,
exact-version approval under the gitignored runtime `gates/` namespace:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/orchestration/v2/pilot.ps1 approve-gate -TaskId <taskId> -TaskVersionId <64-hex-version> -ApprovalScope "<declared Level C scope>"
```

The command only authorizes that frozen task version's declared gate. It does
not execute the task or bypass planning, scope, secret, verification, review,
candidate-binding, production, or publication guards. The next `pilot.ps1 run`
resumes the same task lineage.

Each implementation runs in a disposable clone without remotes. Claude uses
its non-persistent safe mode. The managed Codex 0.152 Windows runtime currently
forces nested `workspace-write` executions to read-only, so Codex implementers
use the already-approved `LOCAL_TRUSTED_HOST` mode in that isolated clone. Git
fetch/push URLs are disabled in the child environment, and only the deterministic
integrator can publish. Reviewers receive frozen task/diff/check evidence in a
fresh opposite-provider process, have no shell, and their review-data directory
is hash-checked before and after invocation.

Model names are not pinned. The semantic classifier selects one of FAST,
BALANCED, REASONING, or CRITICAL; the router resolves that intent against the
capabilities reported by the currently installed provider CLI.

The optional memory adapter exposes `memoryBootstrap`, `memoryCheckpoint`,
`memoryFinalize`, and `memoryHandoff`. It is disabled by default, fail-open, and
never supplies authority or reviewer context. Its payload filter rejects
credentials, environment data, hidden reasoning, and transcript/history fields.

Real disposable proof (invokes both installed CLIs):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/orchestration/v2/tests/dispatcher/run-dispatcher-tests.ps1 -IncludeReal
```
