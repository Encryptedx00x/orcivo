<#
spine.ps1 - the ONLY V2 entrypoint. Explicitly V2. Has NO `run` verb.

V1 (scripts/orchestration/supervisor.ps1) is LEGACY_REJECTED_REFERENCE_ONLY;
run/loop/cleanup are permanently disabled with no override. V2 is the clean-room
security spine and is NOT production ready. Neither V1 nor V2 executes real GSD
tasks. The synthetic pipeline lives under tests/ and refuses any non-disposable
repo root (NC-01: structural, no env var).

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
        Write-Host "Orcivo orchestration - SECURITY SPINE V2 (3rd remediation)" -ForegroundColor Cyan
        Write-Host "  spineStatus:   $($cfg.spineStatus)" -ForegroundColor Yellow
        Write-Host "  V1:            LEGACY_REJECTED_REFERENCE_ONLY - run/loop/cleanup permanently disabled (no override)"
        Write-Host "  V2 state:      .orchestration/v2/  (own namespace; V1 runtime never trusted)"
        Write-Host "  real tasks:    STRUCTURALLY DISABLED - pipeline lives in tests/ and refuses any non-disposable repo (NC-01)"
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
V2 SECURITY SPINE - finding coverage (3rd remediation)

Third-review reproductions now fixed + permanently regression-tested:
  H3-01 verification authority: NO caller scriptblock anywhere in the authoritative
        pipeline; canonical result-independent verification invocation hash; the
        integrator recomputes it from the frozen profile and compares
  H3-02 ONE canonical secret library (redactor == scanner); pre-publication
        recursive scan gate INSIDE Invoke-Integration, before any push;
        SECRET_LEAK_BLOCKED ledger state (fail-closed; explicit evidence-bound owner false-positive reconciliation or QUARANTINE)
  H3-03 untrusted spec/acceptance/diff transported OUT OF BAND as sha256-bound
        read-only files; no fixed textual fence to escape
  H3-04 malformed lease -> DURABLE quarantine marker; every acquire refuses until
        the explicit Repair-QuarantinedLease recovery primitive
  H3-05 protected-path grants must be exact canonical members of the orchestrator
        allowlist; no glob / root / parent / whole-.planning; risk C is not blanket
  M3-01 review envelope validated with a raw-JSON-type-preserving parser; object /
        null / string where the schema wants an array is rejected
  M3-02 re-freeze runs the full recompute-on-read validation before returning
  M3-03 fetch observation is in-process authority (session token); no NO_REMOTE
        dispatch path; a writable last-fetch.json is audit-only
  #9    preflight binds the derived index entry to the frozen contract (taskId,
        gate, dependencies) - a derived index cannot weaken a frozen contract
  #10   deterministic after-CAS-push-reject / ancestry-failure / tree-mismatch
        regressions (genuine reject hook + disposable-harness-only fault seam)
  L3-01 heartbeat docs corrected: explicit Beat-Lease checkpoints + live-process
        identity is load-bearing; there is no background renewal

Addressed + adversarially re-tested against the second review's reproductions:
  C-01  hash-chained monotonic ledger; atomic ledger lease over select+append+seal;
        sealed head; corruption -> QUARANTINED fail-closed; WAITING_HUMAN not dispatchable;
        2 & 8 concurrent writers, truncation, rewrite, dup-seq, stale head, resurrection
  C-02  authoritative JSON Schema enforced at runtime (additionalProperties:false recursive,
        size/count/length bounds); criteria ids must equal the frozen acceptance set; exact hashes;
        reviewer exit/timeout checked; extra fields / huge finding / hostile JSON / multi-envelope fail closed
  C-03  attestation bindings recompute contract hashes from real spec/acceptance/profile;
        integrityHash covers producer + payload + findings; latest-authoritative-result semantics
  H-01  failure classification from the provider control channel only; negative corpus
  H-03  APPROVE downgraded unless every frozen criterion is met with evidence + hashes exact
  H-04  publication == remote-confirmed: mandatory push, expected-remote-SHA CAS, ancestry + tree proof;
        every remote failure -> durable ledger state (PUSH_FAILED / REMOTE_DIVERGED / INTEGRATION_FAILED)
  H-05  live holder is NEVER an orphan (stale heartbeat alone does not hand over the key);
        CAS heartbeat/release/break; malformed lease -> DURABLE quarantine (H3-04), explicit recovery only;
        renewal is explicit Beat-Lease checkpoints - NO background runspace (L3-01)
  H-06  canonical Windows-aware protected-path matching (.planning etc.); empty scope FAILS CLOSED;
        unrestricted scope is an explicit risk-C grant
  H-07  preflight rejects a requested version absent from the reconciled index (unconditional);
        remote freshness PROVEN by a real fetch primitive, not a task timestamp
  H-11  streaming + multiline-buffered redaction (PEM); sanitize before every artifact write;
        final secret sweep on EVERY exit path (success/fail/timeout/policy/exception)
  H-12  closed ID grammar; native-only executable resolution (rejects .cmd/.bat/.ps1 wrappers);
        reparse-point containment; tested Win32 argv quoting; no shell
  M-01  scope + protected-path recomputed from the real changed-file list, canonical paths
  M-03  NO_CHANGE evidence bound to the exact frozen acceptance criteria + contractHash;
        terminal state NO_CHANGE_ACCEPTED (monotonic, not perpetual APPROVED)
  M-05  reviewer provenance is the launcher's captured runtime metadata; the envelope's self-report is advisory
  NC-01 real-task execution is structurally impossible from any production entrypoint;
        the pipeline lives in tests/ and Assert-DisposableRoot rejects the authority root + demands a marker;
        legacy env vars unlock nothing
  NH-01 contract freeze is idempotent (audit metadata excluded from contractHash)
  NH-02 declarative verification profiles in config; contract binds verificationDefinitionHash;
        the effective invocation is bound into the check attestation
  NM-01 attestation integrity protects producer/payload/findings; latest negative result wins
  NM-02 push-reject / remote-CAS / ancestry failures all append a durable terminal ledger event

Partially addressed:
  C-04  human gate is a durable hash-bound decision (gateHash over gateId/taskVersionId/specHash/
        decision/identity/timestamp/nonce); full external-identity approval chain still deferred
  H-02  reviewer prompt is fenced + read-only contract; real ephemeral profile isolation deferred with C-06

Deferred (each needs its own review; NOT downgraded to PASS):
  C-05  Windows Job Object / verified process-tree termination on timeout
  C-06  OS-enforced executor/reviewer/integrator isolation (sandbox/ACL/clone)
  H-08  full safe crash-resume protocol (immutable checkpoint manifest + revalidation)
  H-09  per-check hard timeouts, circuit breaker, cost/token budgets (config limits exist; not fully enforced)
  H-10  machine-readable GSD parser + validated dependency graph (V2 index is synthetic)
  real Claude / Codex disposable smoke tests; NO real task entrypoint
"@ | Write-Host
    }
}
