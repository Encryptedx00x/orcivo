# Continue — Orcivo autopilot

Updated: 2026-09-25. This is the operational checkpoint for a fresh Claude/Codex session.

## Last action

`main` and `origin/main` are at `b085e83`. The dispatcher now freezes inline `AC1; AC2; AC3` criteria and permits a bounded retry/failover to inherit only an exact, signed, policy-compliant partial workspace snapshot. Targeted regressions RD-197, RD-207, RD-208, RD-209, RD-221, and RD-222 pass.

The live autopilot is on `PB1-P06-dead-contact-ctas`, task version `d14e15a25ed1cfe00b4cf6e373df7dcb2ab84cec06d6907156f6e788a020368b`, run `run-fa985eff349d445985f1649df6ece086`. It is in `WAITING_PROVIDER / IMPLEMENT` after Claude returned `RATE_LIMIT`; the provider backoff is durable and the partial product work is preserved by invocation/result snapshots.

## Next action

From the repository root, inspect the durable state and resume the official loop:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\orchestration\v2\pilot.ps1 status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\orchestration\v2\pilot.ps1 run
```

If a `pilot.ps1 run` process already owns `scheduler/main`, monitor that process instead of launching a second loop. Otherwise the second command must remain in the foreground and be monitored through provider backoff, implementation, check, opposite-provider review, integration, publication, and the remaining queue. Diagnose and fix mechanical dispatcher bugs with test-first changes, normal commits, and normal pushes, then resume the same durable run.

## Why

PB1-P06 already contains useful in-scope implementation work. Starting a new implementation or manually repairing dispatcher state would discard verified lineage. The durable snapshots now authorize exact continuation across the Codex-to-Claude failover; current `RATE_LIMIT` is transient, not a product or human decision.

## User authority

The owner authorized autonomous decisions for every queued test-project task and every `WAITING_HUMAN` state except a literal request that only the owner can satisfy by visually operating the running app/site. Normal commits and pushes are authorized. Continue without asking about routine technical choices.

## Do not

- Do not manually edit the managed candidate workspace or dispatcher JSON, ledgers, approvals, checkpoints, or attestations.
- Do not use `git reset`, `git stash`, `git clean`, force-push, history rewriting, or destructive commands.
- Do not create a second implementation or discard partial candidate work.
- Do not fake provider results, copy prompts manually, or use the interactive agent as the product implementer; let the supervisor launch real provider CLIs.
- Do not invoke providers outside the official autopilot/recovery path or add unnecessary probes.
- Stop only before a destructive action or a genuinely human-only visual/business decision.

## Useful evidence

- Durable current state: `.orchestration/v2/dispatcher/current.json`
- Pilot/ledger diagnostics: `scripts/orchestration/v2/pilot.ps1 status` and `.orchestration/v2/logs/spine.log`
- Queue authority: `.planning/product/MVP-PRODUCT-BATCH-1.plan.json`
- Latest regression: `scripts/orchestration/v2/tests/dispatcher/run-dispatcher-tests.ps1 -Only @('RD-197','RD-207','RD-208','RD-209','RD-221','RD-222')`
