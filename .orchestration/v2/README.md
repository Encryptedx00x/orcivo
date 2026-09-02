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
