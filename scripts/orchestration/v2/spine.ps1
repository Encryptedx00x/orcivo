<#
spine.ps1 - the ONLY V2 entrypoint. Explicitly V2. Refuses real tasks.

V1 (scripts/orchestration/supervisor.ps1) is LEGACY_REJECTED_REFERENCE_ONLY after
the independent review. V2 is the clean-room security spine and is NOT production
ready. Neither V1 nor V2 executes real GSD tasks in this session.

Commands:
  status     print V2 spine status, finding coverage, and the V1/V2 boundary
  selftest   run the deterministic adversarial suite (throwaway repos, no models)
  explain    print which findings the spine addresses and which are deferred
#>
param([Parameter(Position=0)][ValidateSet('status','selftest','explain')][string]$Command = 'status')

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

switch ($Command) {
    'status' {
        $cfg = Get-V2Config
        Write-Host ""
        Write-Host "Orcivo orchestration - SECURITY SPINE V2" -ForegroundColor Cyan
        Write-Host "  spineStatus:   $($cfg.spineStatus)" -ForegroundColor Yellow
        Write-Host "  V1:            LEGACY_REJECTED_REFERENCE_ONLY (scripts/orchestration/supervisor.ps1)"
        Write-Host "  V2 state:      .orchestration/v2/  (own namespace; V1 runtime never trusted)"
        Write-Host "  real tasks:    DISABLED in V1 and V2 (guard: Assert-NotRealRepo)"
        Write-Host ""
        Write-Host "  Run 'spine.ps1 selftest' for the adversarial suite."
        Write-Host "  Run 'spine.ps1 explain' for finding coverage."
        Write-Host ""
    }
    'selftest' {
        & (Join-Path $PSScriptRoot 'tests\run-spine-tests.ps1')
        exit $LASTEXITCODE
    }
    'explain' {
        @"
V2 SECURITY SPINE - finding coverage (this session)

Addressed + adversarially tested:
  C-01  monotonic content-addressed ledger; PUBLISHED is terminal; exactly-once
  C-02  fenced JSON review envelope; schema-validated; no regex verdict scraping
  C-03  content-addressed attestations; integrator re-verifies every binding
  H-01  failure classification from the provider control channel only; neg corpus
  H-03  APPROVE must be substantiated (criteria+evidence, files, hashes) or downgraded
  H-04  global serial integration lease + fetch/CAS + PUSH_FAILED != PUBLISHED
  H-05  atomic (CreateNew) leases; leaseId + host + pid + process start time; CAS release
  H-06  frozen immutable contract; protected paths; post-diff scope classification
  H-07  mandatory preflight gate before any model is spent
  H-11  streaming redaction (raw never hits disk); artifact secret scan; crash-safe
  H-12  closed ID grammar; path canonicalization; tested Win32 argv quoting; no shell
  M-01  scope conflict recomputed from the real changed-file list
  M-03  explicit CHANGED / NO_CHANGE_JUSTIFIED contract; empty diff != done
  M-05  reviewerMeta (provider/model/effort/toolPolicy/template) in every review attestation

Partially addressed:
  C-04  human gate is a durable JSON decision bound to specHash (no planning-text un-gate);
        full first-class gate chain (approvalNonce lineage, external identity) deferred
  H-02  reviewer prompt is fenced + read-only contract; real ephemeral profile isolation deferred with C-06

Deferred to the next session (need their own review):
  C-05  Windows Job Object / verified process-tree termination on timeout
  C-06  OS-enforced executor/reviewer/integrator isolation (sandbox/ACL/clone)
  H-08  safe crash-resume protocol (immutable checkpoint manifest + revalidation)
  H-09  per-check timeouts, circuit breaker, cost/token budgets
  H-10  machine-readable GSD parser + validated dependency graph
  real Claude / Codex disposable smoke tests
"@ | Write-Host
    }
}
