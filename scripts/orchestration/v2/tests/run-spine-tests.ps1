<#
run-spine-tests.ps1 - deterministic ADVERSARIAL suite for the V2 security spine.

No real model calls. Every scenario runs against a throwaway git repo under
$env:TEMP with its own .orchestration/v2/ namespace and a bare `origin` remote.
The real Orcivo repo, real main and real .planning are never touched.

  powershell -NoProfile -File scripts\orchestration\v2\tests\run-spine-tests.ps1
#>
param([switch]$KeepFixtures)

$ErrorActionPreference = 'Stop'
$Here     = $PSScriptRoot
$V2Dir    = Split-Path -Parent $Here
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

        Set-Content -LiteralPath (Join-Path $dir '.gitignore') -Value ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir 'README.md') -Value "fixture" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir '.planning\STATE.md') -Value "fixture planning" -Encoding ascii
        & git add -A; & git commit -q -m init
        & git remote add origin $bare
        & git push -q -u origin main
    } finally { Pop-Location }
    return $dir
}

function Invoke-Probe {
    param([string]$Fix, [string]$Do, [string]$A1 = '', [string]$A2 = '', [string]$A3 = '', [hashtable]$Env)
    $saved = @{}
    $base = @{ ORCH_V2_TESTING = '1'; ORCH_V2_EXEC = ''; ORCH_V2_REVIEW = '' }
    if ($Env) { foreach ($k in $Env.Keys) { $base[$k] = $Env[$k] } }
    foreach ($k in @($base.Keys)) { $saved[$k] = [Environment]::GetEnvironmentVariable($k); [Environment]::SetEnvironmentVariable($k, $base[$k]) }
    $o = Join-Path $env:TEMP ("pr-" + [guid]::NewGuid().ToString('N').Substring(0, 8) + ".txt")
    try {
        $al = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Probe,'-Do',$Do)
        if ($A1 -ne '') { $al += @('-Arg1', $A1) }
        if ($A2 -ne '') { $al += @('-Arg2', $A2) }
        if ($A3 -ne '') { $al += @('-Arg3', $A3) }
        $p = Start-Process -FilePath $PS -ArgumentList $al -WorkingDirectory $Fix -NoNewWindow -PassThru -Wait `
             -RedirectStandardOutput $o -RedirectStandardError "$o.err"
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

Write-Host "`n=== Orcivo V2 SECURITY SPINE - adversarial suite ===`n" -ForegroundColor Cyan

# ---- primitives ---------------------------------------------------------
Check 'C-03/L-01: content hash is canonical + order-independent' { ProbeOK (New-V2Fixture) 'hash-determinism' }
Check 'C-01: ledger FSM is monotonic; PUBLISHED/QUARANTINED terminal'  { ProbeOK (New-V2Fixture) 'fsm-monotonic' }
Check 'C-01: new spec/acceptance -> new taskVersionId'                  { ProbeOK (New-V2Fixture) 'ledger-newversion-newid' }
Check 'H-12: Win32 argv round-trips a hostile corpus (no shell)'        { ProbeOK (New-V2Fixture) 'argquote-roundtrip' }
Check 'H-12: closed ID grammar + path traversal blocked'               { ProbeOK (New-V2Fixture) 'id-and-path-grammar' }
Check 'H-05: lease CAS release + PID-reuse orphan detection'            { ProbeOK (New-V2Fixture) 'lease-cas-and-pidreuse' }
Check 'H-01: negative corpus - app text never causes failover'         { ProbeOK (New-V2Fixture) 'negative-corpus' }

# ---- H-05 real concurrency --------------------------------------------
Check 'H-05: N processes race for one lease - exactly one wins' {
    $fx = New-V2Fixture
    $barrier = Join-Path $env:TEMP ("barrier-" + [guid]::NewGuid().ToString('N').Substring(0,8))
    $child = Join-Path $Here 'lease-race-child.ps1'
    $outs = @()
    $procs = @()
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
    $results = $allLines
    Assert ($err.Count -eq 0) "racer error(s): $($err -join ' ; ')"
    Assert ($won.Count -eq 1) "expected exactly 1 winner, got $($won.Count): $($results -join ' | ')"
}

# ---- review envelope (C-02 / H-03) -----------------------------------
Check 'C-02: valid substantiated envelope -> APPROVE' { ProbeOK (New-V2Fixture) 'review-parse' 'approve' 'APPROVE' }
Check 'C-02: verdict smuggled in prose outside envelope -> HUMAN_REVIEW_REQUIRED' { ProbeOK (New-V2Fixture) 'review-parse' 'inject-prose-verdict' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: multiple envelopes -> HUMAN_REVIEW_REQUIRED' { ProbeOK (New-V2Fixture) 'review-parse' 'multi-envelope' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: truncated output (no end marker) -> INCOMPLETE_REVIEW' { ProbeOK (New-V2Fixture) 'review-parse' 'truncated' 'INCOMPLETE_REVIEW' }
Check 'C-02: invalid JSON envelope -> HUMAN_REVIEW_REQUIRED' { ProbeOK (New-V2Fixture) 'review-parse' 'invalid-json' 'HUMAN_REVIEW_REQUIRED' }
Check 'C-02: schema-invalid envelope -> HUMAN_REVIEW_REQUIRED' { ProbeOK (New-V2Fixture) 'review-parse' 'bad-schema' 'HUMAN_REVIEW_REQUIRED' }
Check 'H-03: APPROVE with no evidence -> INCOMPLETE_REVIEW' { ProbeOK (New-V2Fixture) 'review-parse' 'approve-no-evidence' 'INCOMPLETE_REVIEW' }
Check 'H-03: APPROVE with a critical finding -> INCOMPLETE_REVIEW' { ProbeOK (New-V2Fixture) 'review-parse' 'approve-crit-finding' 'INCOMPLETE_REVIEW' }
Check 'H-03: APPROVE not covering a changed file -> INCOMPLETE_REVIEW' { ProbeOK (New-V2Fixture) 'review-parse' 'approve-unreviewed' 'INCOMPLETE_REVIEW' }
Check 'H-03: APPROVE with wrong treeHash -> INCOMPLETE_REVIEW' { ProbeOK (New-V2Fixture) 'review-parse' 'approve-wrong-hash' 'INCOMPLETE_REVIEW' }
Check 'C-02: reviewer describing hostile spec text still returns its own verdict' { ProbeOK (New-V2Fixture) 'review-parse' 'spec-echo-attack' 'REQUEST_CHANGES' }

# ---- contract freeze / scope (H-06 / M-01 / M-03) -------------------
Check 'H-06: in-scope change -> CHANGED (compliant)' { ProbeOK (New-V2Fixture) 'contract-compliance' 'in-scope' 'CHANGED' }
Check 'M-01: out-of-scope change -> POLICY_BLOCK' { ProbeOK (New-V2Fixture) 'contract-compliance' 'out-scope' 'POLICY_BLOCK' }
Check 'H-06: protected path without a grant -> POLICY_BLOCK' { ProbeOK (New-V2Fixture) 'contract-compliance' 'protected' 'POLICY_BLOCK' }
Check 'M-03: no diff, no justification -> POLICY_BLOCK (empty diff != done)' { ProbeOK (New-V2Fixture) 'contract-compliance' 'no-change' 'POLICY_BLOCK' }

# ---- attestations (C-03) -------------------------------------------
Check 'C-03: attestation goes STALE when the tree changes after the check' { ProbeOK (New-V2Fixture) 'attest-stale' }
Check 'C-03: attestation goes STALE when config.v2.json changes'           { ProbeOK (New-V2Fixture) 'attest-stale-config' }

# ---- preflight (H-07) + human gate (C-04 partial) ------------------
Check 'H-07: dirty tree / stale index -> preflight refuses dispatch' { ProbeOK (New-V2Fixture) 'preflight-gates' }
Check 'C-04(partial): human gate is a durable decision bound to specHash' { ProbeOK (New-V2Fixture) 'human-gate-durable' }

# ---- end-to-end pipeline ------------------------------------------
Check 'C-01: e2e run PUBLISHES, then repeated reconcile never re-dispatches' { ProbeOK (New-V2Fixture) 'pipeline-e2e' }
Check 'H-06: e2e out-of-scope executor commit -> POLICY_BLOCK, not published' { ProbeOK (New-V2Fixture) 'pipeline-block' 'out-of-scope' 'POLICY_BLOCK' }
Check 'H-06: e2e executor edits .planning -> POLICY_BLOCK'                    { ProbeOK (New-V2Fixture) 'pipeline-block' 'protected' 'POLICY_BLOCK' }
Check 'H-06: e2e executor edits scripts/orchestration -> POLICY_BLOCK'       { ProbeOK (New-V2Fixture) 'pipeline-block' 'protected-scripts' 'POLICY_BLOCK' }
Check 'M-03: e2e no-op executor -> POLICY_BLOCK'                             { ProbeOK (New-V2Fixture) 'pipeline-block' 'no-change' 'POLICY_BLOCK' }
Check 'H-01: e2e app text 429/quota + no control channel -> FAILED (no failover)' { ProbeOK (New-V2Fixture) 'pipeline-block' 'app-429-crash' 'FAILED' }
Check 'C-01: e2e agent HUMAN_GATE -> WAITING_HUMAN'                          { ProbeOK (New-V2Fixture) 'pipeline-block' 'human-gate' 'WAITING_HUMAN' }
Check 'C-02: e2e review injection -> not published, ledger not PUBLISHED' { ProbeOK (New-V2Fixture) 'pipeline-review-injection' 'inject-prose-verdict' }
Check 'C-02: e2e truncated review -> not published' { ProbeOK (New-V2Fixture) 'pipeline-review-injection' 'truncated' }
Check 'H-11: e2e secret-crash - raw synthetic secret never persisted' { ProbeOK (New-V2Fixture) 'pipeline-secret-crash' }

# ---- integration (C-03 / H-04) -----------------------------------
Check 'C-03: commit changed after review -> integration refuses (stale)' { ProbeOK (New-V2Fixture) 'integration-stale-after-review' }
Check 'H-04: remote origin/main advanced under us -> integration blocks, not PUBLISHED' {
    $fx = New-V2Fixture
    $sib = "$fx.sib"
    $ErrorActionPreference = 'Continue'
    & git clone -q "$fx.origin.git" $sib
    & git -C $sib config user.email s@s; & git -C $sib config user.name s; & git -C $sib config commit.gpgsign false
    & git -C $sib config core.autocrlf false
    $script:fixtures += $sib
    ProbeOK $fx 'integration-remote-race' $sib
}

# ---- boundary / documentation -----------------------------------
Check 'guard: pipeline refuses to run without ORCH_V2_TESTING=1' {
    $fx = New-V2Fixture
    $r = Invoke-Probe -Fix $fx -Do 'pipeline-e2e' -Env @{ ORCH_V2_TESTING = '' }
    Assert ($r.out -match 'ORCH_V2_TESTING' -or $r.out -match 'PROBE_FAIL') "pipeline ran without the test guard: $($r.out.Trim())"
}

Write-Host ""
Write-Host ("=== {0} passed, {1} failed ===" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail) { 'Red' } else { 'Green' })

if (-not $KeepFixtures) {
    foreach ($d in ($script:fixtures | Select-Object -Unique)) { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
}
exit $script:fail
