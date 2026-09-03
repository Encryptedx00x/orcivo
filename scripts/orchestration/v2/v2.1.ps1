<#
v2.1.ps1 - PRAGMATIC V2.1 status + selftest entrypoint.

THREAT_MODEL = LOCAL_TRUSTED_HOST. This adds the autonomy layer (semantic task
classifier, adaptive model router, Claude<->Codex failover, WAITING_PROVIDER +
auto-resume, context rollover, bounded correction loop, run generation fencing,
INTEGRATION_INTENT remote-truth reconciliation, task graph) on top of the V2
security spine.

Real-task execution stays STRUCTURALLY DISABLED (NC-01): there is no `run` verb.
Wave 0 proves every autonomy behaviour deterministically against the real spine,
real ledger and real git, with no model calls.

Commands:
  status     print the pragmatic V2.1 layer status + threat model
  selftest   run every module selftest (fast, in-process)
  wave0      run the full deterministic Wave 0 suite (W0-01..W0-30, child procs)
  explain    what each module addresses
#>
param([Parameter(Position=0)][ValidateSet('status','selftest','wave0','explain')][string]$Command = 'status')

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

switch ($Command) {
    'status' {
        $cfg = Get-V2Config
        Write-Host ""
        Write-Host "Orcivo orchestration - PRAGMATIC V2.1" -ForegroundColor Cyan
        Write-Host "  threatModel:   $($cfg.threatModel.id)  (owner decision $($cfg.threatModel.decidedAt))" -ForegroundColor Yellow
        Write-Host "  HOST_SAME_USER_ATTACKER: OUT_OF_SCOPE   ZONE_A_D_SEPARATE_WINDOWS_IDENTITIES: NOT_REQUIRED"
        Write-Host "  acceptedRisks: $((@($cfg.acceptedRisks).ForEach({ $_.id })) -join ', ')"
        Write-Host ""
        Write-Host "  autonomy layer (scripts/orchestration/v2/):"
        Write-Host "    taskclass.ps1   semantic classifier + safety floors"
        Write-Host "    router.ps1      adaptive profile->capability router + Select-Reviewer"
        Write-Host "    providers.ps1   Claude<->Codex failover + WAITING_PROVIDER + auto-resume"
        Write-Host "    continuation.ps1 context-window rollover (closed whitelist)"
        Write-Host "    fence.ps1       run generation fencing + crash recovery"
        Write-Host "    intent.ps1      INTEGRATION_INTENT + remote-truth reconciliation"
        Write-Host "    correction.ps1  bounded correction loop"
        Write-Host "    taskgraph.ps1   dependency graph validation"
        Write-Host ""
        Write-Host "  real tasks:    STRUCTURALLY DISABLED (NC-01) - no 'run' verb, no production entrypoint"
        Write-Host "  Wave 0:        scripts\orchestration\v2\tests\wave0\run-wave0.ps1  (deterministic, no models)"
        Write-Host "  closeout:      .planning\reviews\PRAGMATIC-V2.1-CLOSEOUT.md"
        Write-Host "  product batch: .planning\product\MVP-PRODUCT-BATCH-1.md  (PROPOSAL ONLY)"
        Write-Host ""
    }
    'selftest' {
        $mods = @('taskclass', 'router', 'providers', 'continuation', 'fence', 'correction', 'taskgraph', 'intent')
        $fns  = @{ taskclass = 'Test-ClassifierSelftest'; router = 'Test-RouterSelftest'; providers = 'Test-ProvidersSelftest'
                   continuation = 'Test-ContinuationSelftest'; fence = 'Test-FenceSelftest'; correction = 'Test-CorrectionLoopSelftest'
                   taskgraph = 'Test-TaskGraphSelftest'; intent = 'Test-IntentSelftest' }
        $fail = 0
        foreach ($m in $mods) {
            . (Join-Path $PSScriptRoot "$m.ps1")
            $r = & $fns[$m]
            if ($r.ok) { Write-Host ("PASS  {0,-13} selftest" -f $m) -ForegroundColor Green }
            else { $fail++; Write-Host ("FAIL  {0,-13} {1}" -f $m, ($r.failures -join ' | ')) -ForegroundColor Red }
        }
        Write-Host ""
        Write-Host ("=== {0}/{1} module selftests passed ===" -f ($mods.Count - $fail), $mods.Count) -ForegroundColor $(if ($fail) { 'Red' } else { 'Green' })
        exit $fail
    }
    'wave0' {
        & (Join-Path $PSScriptRoot 'tests\wave0\run-wave0.ps1')
        exit $LASTEXITCODE
    }
    'explain' {
        @"
PRAGMATIC V2.1 - module coverage (THREAT_MODEL = LOCAL_TRUSTED_HOST)

  taskclass.ps1    PARTE 11  semantic difficulty (blast radius / reversibility /
                             domain / ambiguity), not LOC/path counting. Hardcoded
                             rules are safety FLOORS only. Optional agent can only raise.
  router.ps1       PARTE 12  no pinned model version; discovers installed CLI flags
                   PARTE 16  for model/effort/output/fresh-context; abstract profiles
                   PARTE 28  FAST/BALANCED/REASONING/CRITICAL; opposite-provider review.
  providers.ps1    PARTE 13  provider class (control channel only) -> FAILOVER;
                   PARTE 14  both unavailable -> WAITING_PROVIDER, durable wait record,
                             backoff poll, auto-resume, survives restart. TEST_FAILED
                             never fails over.
  continuation.ps1 PARTE 15  context exhaustion != quota, != failover. Structured
                             checkpoint, closed whitelist, no hidden reasoning.
  fence.ps1        PARTE 9   run generation. Prove prior run inactive -> fence old
                             generation -> RECOVERED -> new generation. Undeterminable
                             -> WAITING_HUMAN.
  intent.ps1       PARTE 8   INTEGRATION_INTENT before any push; origin is truth;
                             fetch + SHA/tree/ancestry reconstruction; AMBIGUOUS_REMOTE
                             instead of a false NOT_PUBLISHED; never re-publish.
  correction.ps1   PARTE 17  bounded loop; new candidate + new review each cycle;
                             budget spent -> FAILED_REVIEW_BUDGET (WAITING_HUMAN).
  taskgraph.ps1    PARTE 19  cycles / missing deps / malformed states / Level C /
                             blocked dependencies. Never dispatch on an unpassed dep.

Deferred (documented, not blocking under LOCAL_TRUSTED_HOST):
  - a wired real-task entrypoint (NC-01 keeps it structurally disabled)
  - the disposable Docker Linux container composition for implementer/reviewer
  - classifier agent tuning against real GSD tasks
  - full H-09 budget/circuit-breaker enforcement on every path
"@ | Write-Host
    }
}
