<#
run-spine-tests.ps1 - deterministic ADVERSARIAL suite for the V2 security spine
(second remediation).

No real model calls. Every scenario runs against a throwaway git repo under
$env:TEMP with its own .orchestration/v2/ namespace, a bare `origin` remote, and
the .orch-v2-fixture marker (NC-01: the ONLY thing that lets the pipeline run).
The real Orcivo repo, real main and real .planning are never touched.

  powershell -NoProfile -File scripts\orchestration\v2\tests\run-spine-tests.ps1
#>
param([switch]$KeepFixtures)

$ErrorActionPreference = 'Stop'
$Here     = $PSScriptRoot
$RepoRoot = ((& git -C $Here rev-parse --show-toplevel) -replace '/', '\').Trim()
$RealCfg  = Join-Path $RepoRoot '.orchestration\v2\config.v2.json'
$RealSchemas = Join-Path $RepoRoot '.orchestration\v2\schemas'
$Probe    = Join-Path $Here '_probe.ps1'
$PS       = (Get-Command powershell).Source

$script:pass = 0; $script:fail = 0; $script:fixtures = @()

function Check([string]$Name, [scriptblock]$Body) {
    try { & $Body; $script:pass++; Write-Host "PASS  $Name" -ForegroundColor Green }
    catch {
        $script:fail++
        Write-Host "FAIL  $Name" -ForegroundColor Red
        Write-Host "      $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}
function Assert([bool]$c, [string]$m) { if (-not $c) { throw $m } }

function New-V2Fixture {
    $dir  = Join-Path $env:TEMP ("v2fx-" + [guid]::NewGuid().ToString('N').Substring(0, 10))
    $bare = "$dir.origin.git"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $script:fixtures += $dir; $script:fixtures += $bare
    $ErrorActionPreference = 'Continue'
    & git init --bare -q -b main $bare 2>$null; if ($LASTEXITCODE -ne 0) { & git init --bare -q $bare; & git -C $bare symbolic-ref HEAD refs/heads/main }
    Push-Location $dir
    try {
        & git init -q --initial-branch=main 2>$null; if ($LASTEXITCODE -ne 0) { & git init -q; & git checkout -q -b main }
        & git config user.email t@t; & git config user.name t; & git config commit.gpgsign false
        & git config core.autocrlf false; & git config core.safecrlf false
        New-Item -ItemType Directory -Force -Path (Join-Path $dir '.orchestration\v2\schemas') | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $dir '.planning') | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $dir 'work') | Out-Null

        $cfg = Get-Content -Raw -LiteralPath $RealCfg | ConvertFrom-Json
        $cfg.providers.claude.bin = 'powershell'
        $cfg.providers.codex.bin  = 'powershell'
        ($cfg | ConvertTo-Json -Depth 40) | Set-Content -LiteralPath (Join-Path $dir '.orchestration\v2\config.v2.json') -Encoding utf8
        Copy-Item (Join-Path $RealSchemas '*.json') (Join-Path $dir '.orchestration\v2\schemas\')

        # NC-01 disposable-fixture marker: the ONLY key to Assert-DisposableRoot.
        Set-Content -LiteralPath (Join-Path $dir '.orch-v2-fixture') -Value "disposable v2 test fixture" -Encoding ascii

        Set-Content -LiteralPath (Join-Path $dir '.gitignore') -Value ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n.orch-v2-fixture`n" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir 'README.md') -Value "fixture" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir '.planning\NOTES.md') -Value "fixture planning" -Encoding ascii
        & git add -A; & git commit -q -m init
        & git remote add origin $bare
        & git push -q -u origin main
    } finally { Pop-Location }
    return $dir
}

function New-Sibling {
    param([string]$Fix)
    $sib = "$Fix.sib-$([guid]::NewGuid().ToString('N').Substring(0,4))"
    $ErrorActionPreference = 'Continue'
    & git clone -q "$Fix.origin.git" $sib
    & git -C $sib config user.email s@s; & git -C $sib config user.name s
    & git -C $sib config commit.gpgsign false; & git -C $sib config core.autocrlf false
    $script:fixtures += $sib
    return $sib
}

function Invoke-Probe {
    param([string]$Fix, [string]$Do, [string]$A1 = '', [string]$A2 = '', [string]$A3 = '', [hashtable]$Env)
    $saved = @{}
    $base = @{ ORCH_V2_EXEC = ''; ORCH_V2_REVIEW = '' }
    if ($Env) { foreach ($k in $Env.Keys) { $base[$k] = $Env[$k] } }
    foreach ($k in @($base.Keys)) { $saved[$k] = [Environment]::GetEnvironmentVariable($k); [Environment]::SetEnvironmentVariable($k, $base[$k]) }
    $o = Join-Path $env:TEMP ("pr-" + [guid]::NewGuid().ToString('N').Substring(0, 8) + ".txt")
    try {
        $al = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Probe,'-Do',$Do)
        if ($A1 -ne '') { $al += @('-Arg1', $A1) }
        if ($A2 -ne '') { $al += @('-Arg2', $A2) }
        if ($A3 -ne '') { $al += @('-Arg3', $A3) }
        $p = Start-Process -FilePath $PS -ArgumentList $al -WorkingDirectory $Fix -NoNewWindow -PassThru `
             -RedirectStandardOutput $o -RedirectStandardError "$o.err"
        if (-not $p.WaitForExit(240000)) {
            try { $p.Kill($true) } catch { try { $p.Kill() } catch {} }
            $p.WaitForExit(5000) | Out-Null
            return [pscustomobject]@{ out = "PROBE_FAIL: TIMEOUT after 240s (do=$Do a1=$A1)"; code = 124 }
        }
        $out = ''
        foreach ($f in @($o, "$o.err")) { if (Test-Path $f) { $out += (Get-Content -Raw -LiteralPath $f) } }
        return [pscustomobject]@{ out = $out; code = $p.ExitCode }
    } finally {
        Remove-Item -LiteralPath $o, "$o.err" -Force -ErrorAction SilentlyContinue
        foreach ($k in @($saved.Keys)) { [Environment]::SetEnvironmentVariable($k, $saved[$k]) }
    }
}

function ProbeOK { param([string]$Fix, [string]$Do, [string]$A1='', [string]$A2='', [hashtable]$Env)
    $r = Invoke-Probe -Fix $Fix -Do $Do -A1 $A1 -A2 $A2 -Env $Env
    if ($r.out -notmatch 'PROBE_OK') { throw "probe '$Do $A1 $A2' failed: $($r.out.Trim())" }
}

Write-Host "`n=== Orcivo V2 SECURITY SPINE - adversarial suite (2nd remediation) ===`n" -ForegroundColor Cyan

# ---- primitives ---------------------------------------------------------
Check 'C-03/L-01: content hash canonical + order-independent'          { ProbeOK (New-V2Fixture) 'hash-determinism' }
Check 'C-01: ledger FSM monotonic; terminal states dead-end'          { ProbeOK (New-V2Fixture) 'fsm-monotonic' }
Check 'C-01: new spec/acceptance -> new taskVersionId'                { ProbeOK (New-V2Fixture) 'ledger-newversion-newid' }
Check 'H-12: Win32 argv round-trips a hostile corpus (no shell)'      { ProbeOK (New-V2Fixture) 'argquote-roundtrip' }
Check 'H-12: closed ID grammar + traversal + native-only exe'         { ProbeOK (New-V2Fixture) 'id-and-path-grammar' }
Check 'H-06/M-01: canonical dot-path matching (.planning etc.)'       { ProbeOK (New-V2Fixture) 'canonical-dot-path' }
Check 'H-01: negative corpus - app text never causes failover'        { ProbeOK (New-V2Fixture) 'negative-corpus' }

# ---- C-01 ledger: concurrency + integrity ------------------------------
Check 'C-01: 2 concurrent ledger writers - no corruption'             { ProbeOK (New-V2Fixture) 'ledger-concurrency' '2' }
Check 'C-01: 8 concurrent ledger writers - one serialized history'    { ProbeOK (New-V2Fixture) 'ledger-concurrency' '8' }
Check 'C-01: tail truncation -> QUARANTINED, not dispatchable'        { ProbeOK (New-V2Fixture) 'ledger-tamper' 'truncate' }
Check 'C-01: event rewrite -> QUARANTINED'                            { ProbeOK (New-V2Fixture) 'ledger-tamper' 'rewrite' }
Check 'C-01: duplicate sequence -> QUARANTINED'                       { ProbeOK (New-V2Fixture) 'ledger-tamper' 'dupseq' }
Check 'C-01: stale/ahead head seal -> QUARANTINED'                    { ProbeOK (New-V2Fixture) 'ledger-tamper' 'stalehead' }
Check 'C-01: PUBLISHED resurrection refused'                          { ProbeOK (New-V2Fixture) 'ledger-resurrection' 'published' }
Check 'C-01: QUARANTINED resurrection refused'                        { ProbeOK (New-V2Fixture) 'ledger-resurrection' 'quarantined' }

# ---- H-05 leases -------------------------------------------------------
Check 'H-05: lease CAS release + PID-reuse orphan break'              { ProbeOK (New-V2Fixture) 'lease-cas-and-pidreuse' }
Check 'H-05: LIVE owner + stale heartbeat -> second acquire FAILS'    { ProbeOK (New-V2Fixture) 'lease-live-owner-stale-heartbeat' }
Check 'H-05: malformed lease record -> quarantined, not granted'      { ProbeOK (New-V2Fixture) 'lease-malformed-quarantine' }
Check 'H-05: heartbeat renewal is holder-only (CAS)'                  { ProbeOK (New-V2Fixture) 'lease-heartbeat-renewal' }
Check 'H-05: 8 processes race for one lease - exactly one wins' {
    $fx = New-V2Fixture
    $barrier = Join-Path $env:TEMP ("barrier-" + [guid]::NewGuid().ToString('N').Substring(0,8))
    $child = Join-Path $Here 'lease-race-child.ps1'
    $outs = @(); $procs = @()
    for ($i = 0; $i -lt 8; $i++) {
        $o = Join-Path $env:TEMP ("lr-$i-" + [guid]::NewGuid().ToString('N').Substring(0,6) + ".txt")
        $outs += $o
        $procs += Start-Process -FilePath $PS -WorkingDirectory $fx -NoNewWindow -PassThru `
            -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$child,'-Barrier',$barrier,'-Key','racekey') `
            -RedirectStandardOutput $o -RedirectStandardError "$o.err"
    }
    Start-Sleep -Milliseconds 400
    Set-Content -LiteralPath $barrier -Value 'go' -Encoding ascii
    $procs | ForEach-Object { $_.WaitForExit(20000) | Out-Null }
    $allLines = @($outs | ForEach-Object { if (Test-Path $_) { Get-Content $_ } })
    $outs | ForEach-Object { Remove-Item -LiteralPath $_, "$_.err" -Force -ErrorAction SilentlyContinue }
    $won = @($allLines | Where-Object { $_ -match '^WON ' })
    $err = @($allLines | Where-Object { $_ -match '^ERR ' })
    Assert ($err.Count -eq 0) "racer error(s): $($err -join ' ; ')"
    Assert ($won.Count -eq 1) "expected exactly 1 winner, got $($won.Count): $($allLines -join ' | ')"
}

# ---- C-02 / H-03 review envelope -------------------------------------
Check 'C-02: substantiated envelope -> APPROVE'                       { ProbeOK (New-V2Fixture) 'review-parse' 'approve' 'APPROVE' }
Check 'C-02: verdict smuggled in prose -> HUMAN_REVIEW_REQUIRED'      { ProbeOK (New-V2Fixture) 'review-parse' 'inject-prose-verdict' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: multiple envelopes -> HUMAN_REVIEW_REQUIRED'             { ProbeOK (New-V2Fixture) 'review-parse' 'multi-envelope' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: truncated output -> INCOMPLETE_REVIEW'                   { ProbeOK (New-V2Fixture) 'review-parse' 'truncated' 'INCOMPLETE_REVIEW' }
Check 'C-02: invalid JSON -> HUMAN_REVIEW_REQUIRED'                   { ProbeOK (New-V2Fixture) 'review-parse' 'invalid-json' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: schema-invalid envelope -> HUMAN_REVIEW_REQUIRED'        { ProbeOK (New-V2Fixture) 'review-parse' 'bad-schema' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: extra ROOT field (additionalProperties:false)'          { ProbeOK (New-V2Fixture) 'review-parse' 'extra-root-field' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: extra NESTED field (reviewerMeta)'                       { ProbeOK (New-V2Fixture) 'review-parse' 'extra-nested-field' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: hostile JSON strings -> not APPROVE'                     { ProbeOK (New-V2Fixture) 'review-parse' 'hostile-json' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: >1MB finding -> bounded rejection'                       { ProbeOK (New-V2Fixture) 'review-parse' 'huge-finding' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: reviewer crash (exit!=0) -> HUMAN_REVIEW_REQUIRED'       { ProbeOK (New-V2Fixture) 'review-parse' 'crash' 'HUMAN_REVIEW_REQUIRED' }
Check 'H-03: APPROVE w/ no evidence -> INCOMPLETE_REVIEW'             { ProbeOK (New-V2Fixture) 'review-parse' 'approve-no-evidence' 'INCOMPLETE_REVIEW' }
Check 'H-03: APPROVE w/ critical finding -> INCOMPLETE_REVIEW'        { ProbeOK (New-V2Fixture) 'review-parse' 'approve-crit-finding' 'INCOMPLETE_REVIEW' }
Check 'H-03: APPROVE not covering a changed file -> INCOMPLETE'       { ProbeOK (New-V2Fixture) 'review-parse' 'approve-unreviewed' 'INCOMPLETE_REVIEW' }
Check 'H-03: APPROVE w/ wrong treeHash -> INCOMPLETE_REVIEW'          { ProbeOK (New-V2Fixture) 'review-parse' 'approve-wrong-hash' 'INCOMPLETE_REVIEW' }
Check 'H-03: APPROVE w/ wrong specHash -> INCOMPLETE_REVIEW'          { ProbeOK (New-V2Fixture) 'review-parse' 'approve-wrong-spec' 'INCOMPLETE_REVIEW' }
Check 'H-03: APPROVE w/ unrelated criterion id -> INCOMPLETE'         { ProbeOK (New-V2Fixture) 'review-parse' 'approve-unrelated-criterion' 'INCOMPLETE_REVIEW' }
Check 'C-02: reviewer describing hostile spec still returns own verdict' { ProbeOK (New-V2Fixture) 'review-parse' 'spec-echo-attack' 'REQUEST_CHANGES' }

# ---- contract freeze / scope (H-06 / M-01 / M-03 / NH-01) ------------
Check 'H-06: in-scope change -> CHANGED'                              { ProbeOK (New-V2Fixture) 'contract-compliance' 'in-scope' 'CHANGED' }
Check 'M-01: out-of-scope -> POLICY_BLOCK'                            { ProbeOK (New-V2Fixture) 'contract-compliance' 'out-scope' 'POLICY_BLOCK' }
Check 'H-06: protected path w/o grant -> POLICY_BLOCK (cites PROTECTED)' { ProbeOK (New-V2Fixture) 'contract-compliance' 'protected' 'POLICY_BLOCK' }
Check 'H-06: .planning + BROAD scope -> still POLICY_BLOCK (protected)' { ProbeOK (New-V2Fixture) 'protected-dot-broadscope' }
Check 'M-01: empty declaredScope FAILS CLOSED'                        { ProbeOK (New-V2Fixture) 'empty-scope-fail-closed' }
Check 'M-03: no diff, no justification -> POLICY_BLOCK'               { ProbeOK (New-V2Fixture) 'contract-compliance' 'no-change' 'POLICY_BLOCK' }
Check 'NH-01: contract freeze is idempotent'                         { ProbeOK (New-V2Fixture) 'contract-idempotent' }
Check 'C-03: tampered specText, stored specHash -> Get-Contract throws'      { ProbeOK (New-V2Fixture) 'contract-tamper' 'spec' }
Check 'C-03: tampered acceptanceText -> Get-Contract throws'                { ProbeOK (New-V2Fixture) 'contract-tamper' 'acceptance' }
Check 'C-03: swapped verification profile -> Get-Contract throws'          { ProbeOK (New-V2Fixture) 'contract-tamper' 'profile' }
Check 'C-03: tampered contract field, stored contractHash -> throws'       { ProbeOK (New-V2Fixture) 'contract-tamper' 'contractField' }
Check 'NH-02: verification profile content mutated after freeze -> stale'  { ProbeOK (New-V2Fixture) 'verification-profile-mutation' }

# ---- attestations (C-03 / NM-01) -----------------------------------
Check 'C-03: attestation STALE when the tree changes after check'         { ProbeOK (New-V2Fixture) 'attest-stale' 'tree' }
Check 'C-03: attestation STALE when config.v2.json changes'               { ProbeOK (New-V2Fixture) 'attest-stale' 'config' }
Check 'NM-01: mutating producer/payload breaks integrityHash'             { ProbeOK (New-V2Fixture) 'attest-payload-mutation' }
Check 'NM-01: old PASS + later FAIL -> integration refused'               { ProbeOK (New-V2Fixture) 'attest-latest-authoritative' 'pass-then-fail' }
Check 'NM-01: old APPROVE + later REQUEST_CHANGES -> integration refused' { ProbeOK (New-V2Fixture) 'attest-latest-authoritative' 'approve-then-reqchanges' }

# ---- preflight (H-07 / #11 / #12) + gates (#13) --------------------
Check 'H-07: dirty tree / stale index -> preflight refuses'               { ProbeOK (New-V2Fixture) 'preflight-gates' }
Check 'H-07/#11: requested version absent from EMPTY index -> reject'      { ProbeOK (New-V2Fixture) 'preflight-absent-version' 'empty-index' }
Check 'H-07/#11: requested version missing from index -> reject'          { ProbeOK (New-V2Fixture) 'preflight-absent-version' 'missing-task' }
Check '#12: forged fetch observation rejected; real fetch restores'       { ProbeOK (New-V2Fixture) 'preflight-fetch-forgery' }
Check 'C-04(partial): human gate durable + bound to specHash'            { ProbeOK (New-V2Fixture) 'human-gate-durable' }
Check '#13: gate decision tamper detected'                               { ProbeOK (New-V2Fixture) 'gate-tampering' 'decision' }
Check '#13: gate specHash tamper detected'                               { ProbeOK (New-V2Fixture) 'gate-tampering' 'specHash' }
Check '#13: gate approvalIdentity tamper detected'                       { ProbeOK (New-V2Fixture) 'gate-tampering' 'approvalIdentity' }
Check '#13: gate approvalTimestamp tamper detected'                      { ProbeOK (New-V2Fixture) 'gate-tampering' 'approvalTimestamp' }
Check '#13: gate nonce tamper detected'                                  { ProbeOK (New-V2Fixture) 'gate-tampering' 'nonce' }
Check '#13: gate taskVersionId tamper detected'                          { ProbeOK (New-V2Fixture) 'gate-tampering' 'taskVersionId' }

# ---- NC-01: env bypass -------------------------------------------
Check 'NC-01: legacy env vars unlock NOTHING; disposable-root is structural' { ProbeOK (New-V2Fixture) 'env-bypass-attempt' -Env @{ ORCH_V2_TESTING='1'; ORCH_V1_REGRESSION_HARNESS='1' } }
Check 'NC-01: V1 supervisor run/loop/cleanup hard-disabled (no override)' {
    $fx = New-V2Fixture
    foreach ($v in @('run','loop','cleanup')) {
        $r = Invoke-Probe -Fix $fx -Do 'hash-determinism' -Env @{}   # keep env clean
        $sup = Join-Path $RepoRoot 'scripts\orchestration\supervisor.ps1'
        $o = Join-Path $env:TEMP ("v1-" + [guid]::NewGuid().ToString('N').Substring(0,6) + ".txt")
        [Environment]::SetEnvironmentVariable('ORCH_V1_REGRESSION_HARNESS','1')
        $p = Start-Process -FilePath $PS -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$sup,$v) -WorkingDirectory $fx -NoNewWindow -PassThru -Wait -RedirectStandardOutput $o -RedirectStandardError "$o.e"
        [Environment]::SetEnvironmentVariable('ORCH_V1_REGRESSION_HARNESS',$null)
        $out = (Get-Content -Raw -LiteralPath $o) + (Get-Content -Raw -LiteralPath "$o.e" -ErrorAction SilentlyContinue)
        Remove-Item $o,"$o.e" -Force -ErrorAction SilentlyContinue
        Assert ($out -match 'disabled|LEGACY_REJECTED' -and $p.ExitCode -ne 0) "V1 '$v' was not hard-disabled: $($out.Trim())"
    }
}

# ---- end-to-end pipeline ----------------------------------------
Check 'C-01: e2e PUBLISHES (push confirmed), then never re-dispatches'     { ProbeOK (New-V2Fixture) 'pipeline-e2e' }
Check 'H-06: e2e out-of-scope commit -> POLICY_BLOCK'                     { ProbeOK (New-V2Fixture) 'pipeline-block' 'out-of-scope' 'POLICY_BLOCK' }
Check 'H-06: e2e executor edits .planning -> POLICY_BLOCK'               { ProbeOK (New-V2Fixture) 'pipeline-block' 'protected' 'POLICY_BLOCK' }
Check 'H-06: e2e executor edits nested .planning -> POLICY_BLOCK'        { ProbeOK (New-V2Fixture) 'pipeline-block' 'protected-dot-planning' 'POLICY_BLOCK' }
Check 'H-06: e2e executor edits scripts/orchestration -> POLICY_BLOCK'   { ProbeOK (New-V2Fixture) 'pipeline-block' 'protected-scripts' 'POLICY_BLOCK' }
Check 'M-03: e2e no-op executor (no evidence) -> POLICY_BLOCK'          { ProbeOK (New-V2Fixture) 'pipeline-block' 'no-change' 'POLICY_BLOCK' }
Check 'M-03: e2e justified no-op -> NO_CHANGE_ACCEPTED terminal'        { ProbeOK (New-V2Fixture) 'pipeline-no-change-accepted' }
Check 'H-01: e2e app 429/quota, no control channel -> FAILED (no failover)' { ProbeOK (New-V2Fixture) 'pipeline-block' 'app-429-crash' 'FAILED' }
Check 'C-01: e2e agent HUMAN_GATE -> WAITING_HUMAN'                      { ProbeOK (New-V2Fixture) 'pipeline-block' 'human-gate' 'WAITING_HUMAN' }
Check 'C-02: e2e review prose injection -> not published'               { ProbeOK (New-V2Fixture) 'pipeline-review-injection' 'inject-prose-verdict' }
Check 'C-02: e2e truncated review -> not published'                     { ProbeOK (New-V2Fixture) 'pipeline-review-injection' 'truncated' }
Check 'M-05: e2e reviewer provenance is the launcher metadata, not the envelope' { ProbeOK (New-V2Fixture) 'pipeline-reviewer-provenance' }
Check 'H-11/#15: e2e secret-crash - single-line secret never persisted' { ProbeOK (New-V2Fixture) 'pipeline-secret-crash' 'single' }
Check 'H-11/#15: e2e secret-crash - multiline PEM never persisted'      { ProbeOK (New-V2Fixture) 'pipeline-secret-crash' 'pem' }

# ---- integration (C-03 / H-04 / #6 / #7 / NM-02) -------------
Check 'C-03: commit changed after review -> integration refuses'          { ProbeOK (New-V2Fixture) 'integration-stale-after-review' }
Check 'H-04/#6: no reachable remote -> INTEGRATION_FAILED, never PUBLISHED' { ProbeOK (New-V2Fixture) 'integration-no-push-impossible' }
Check 'H-04/#7: origin advanced under us -> REMOTE_DIVERGED, ledger closed' {
    $fx = New-V2Fixture; ProbeOK $fx 'integration-remote-race' (New-Sibling $fx)
}
Check '#7: target moves after review -> STOP, rebuild/re-review required' {
    $fx = New-V2Fixture; ProbeOK $fx 'integration-post-review-target-movement' (New-Sibling $fx)
}

Write-Host ""
Write-Host ("=== {0} passed, {1} failed ===" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail) { 'Red' } else { 'Green' })

if (-not $KeepFixtures) {
    foreach ($d in ($script:fixtures | Select-Object -Unique)) { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
}
exit $script:fail
