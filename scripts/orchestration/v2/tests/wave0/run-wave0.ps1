<#
run-wave0.ps1 - PRAGMATIC V2.1 deterministic Wave 0 (W0-01 .. W0-30).

No real model calls. Every scenario runs against a throwaway git repo under
$env:TEMP with its own .orchestration/v2/ namespace, a bare `origin`, and the
.orch-v2-fixture marker (NC-01). The real Orcivo repo / main / .planning are
never touched.

  powershell -NoProfile -File scripts\orchestration\v2\tests\wave0\run-wave0.ps1

W0-03/04/05/06/07 reuse the already-proven security-spine adversarial probe
(_probe.ps1) - the exact-candidate binding, pre-publish secret gate and
stale-review gate are spine properties and are not re-implemented here.
#>
param([switch]$KeepFixtures)

$ErrorActionPreference = 'Stop'
$Here      = $PSScriptRoot
$RepoRoot  = ((& git -C $Here rev-parse --show-toplevel) -replace '/', '\').Trim()
$RealCfg   = Join-Path $RepoRoot '.orchestration\v2\config.v2.json'
$RealSchemas = Join-Path $RepoRoot '.orchestration\v2\schemas'
$Wave0Probe = Join-Path $Here 'wave0-probe.ps1'
$SpineProbe = Join-Path $RepoRoot 'scripts\orchestration\v2\tests\_probe.ps1'
$PS        = (Get-Command powershell).Source

$script:pass = 0; $script:fail = 0; $script:fixtures = @()

function Check([string]$Name, [scriptblock]$Body) {
    try { & $Body; $script:pass++; Write-Host "PASS  $Name" -ForegroundColor Green }
    catch {
        $script:fail++
        Write-Host "FAIL  $Name" -ForegroundColor Red
        Write-Host "      $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}
function Assert($c, [string]$m) { if (-not $c) { throw $m } }

function New-Fixture {
    $dir  = Join-Path $env:TEMP ("w0fx-" + [guid]::NewGuid().ToString('N').Substring(0, 10))
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
        New-Item -ItemType Directory -Force -Path (Join-Path $dir '.planning\product') | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $dir 'work') | Out-Null

        $cfg = Get-Content -Raw -LiteralPath $RealCfg | ConvertFrom-Json
        $cfg.providers.claude.bin = 'powershell'
        $cfg.providers.codex.bin  = 'powershell'
        ($cfg | ConvertTo-Json -Depth 60) | Set-Content -LiteralPath (Join-Path $dir '.orchestration\v2\config.v2.json') -Encoding utf8
        Copy-Item (Join-Path $RealSchemas '*.json') (Join-Path $dir '.orchestration\v2\schemas\') -ErrorAction SilentlyContinue

        Set-Content -LiteralPath (Join-Path $dir '.orch-v2-fixture') -Value "disposable wave0 fixture" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir '.gitignore') -Value ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n.orch-v2-fixture`n" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir 'README.md') -Value "fixture" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir 'work\seed.md') -Value "seed" -Encoding ascii
        # a PROPOSAL-ONLY batch doc so product-batch-awaits-owner can assert on it
        Set-Content -LiteralPath (Join-Path $dir '.planning\product\MVP-PRODUCT-BATCH-1.md') -Value "# MVP Product Batch 1`n`nStatus: PROPOSAL ONLY - stops at OWNER_APPROVAL`n" -Encoding ascii
        & git add -A; & git commit -q -m init
        & git remote add origin $bare
        & git push -q -u origin main
    } finally { Pop-Location }
    return $dir
}

function Run-Probe {
    param([string]$Probe, [string]$Fix, [string]$Do, [string]$A1 = '', [string]$A2 = '', [hashtable]$Env)
    $saved = @{}
    $base = @{ ORCH_V2_EXEC = ''; ORCH_V2_REVIEW = '' }
    if ($Env) { foreach ($k in $Env.Keys) { $base[$k] = $Env[$k] } }
    foreach ($k in @($base.Keys)) { $saved[$k] = [Environment]::GetEnvironmentVariable($k); [Environment]::SetEnvironmentVariable($k, $base[$k]) }
    $o = Join-Path $env:TEMP ("w0-" + [guid]::NewGuid().ToString('N').Substring(0, 8) + ".txt")
    try {
        $al = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Probe, '-Do', $Do)
        if ($A1 -ne '') { $al += @('-Arg1', $A1) }
        if ($A2 -ne '') { $al += @('-Arg2', $A2) }
        $p = Start-Process -FilePath $PS -ArgumentList $al -WorkingDirectory $Fix -NoNewWindow -PassThru `
             -RedirectStandardOutput $o -RedirectStandardError "$o.err"
        if (-not $p.WaitForExit(240000)) {
            try { $p.Kill($true) } catch { try { $p.Kill() } catch {} }
            return [pscustomobject]@{ out = "TIMEOUT after 240s (do=$Do)"; code = 124 }
        }
        $out = ''
        foreach ($f in @($o, "$o.err")) { if (Test-Path $f) { $out += (Get-Content -Raw -LiteralPath $f) } }
        return [pscustomobject]@{ out = $out; code = $p.ExitCode }
    } finally {
        Remove-Item -LiteralPath $o, "$o.err" -Force -ErrorAction SilentlyContinue
        foreach ($k in @($saved.Keys)) { [Environment]::SetEnvironmentVariable($k, $saved[$k]) }
    }
}

function W0 { param([string]$Fix, [string]$Do, [string]$A1 = '')
    $r = Run-Probe -Probe $Wave0Probe -Fix $Fix -Do $Do -A1 $A1
    if ($r.out -notmatch 'PROBE_OK') { throw "wave0 '$Do': $($r.out.Trim())" }
    return $r.out
}
function Spine { param([string]$Fix, [string]$Do, [string]$A1 = '', [string]$A2 = '', [hashtable]$Env)
    $r = Run-Probe -Probe $SpineProbe -Fix $Fix -Do $Do -A1 $A1 -A2 $A2 -Env $Env
    if ($r.out -notmatch 'PROBE_OK') { throw "spine reuse '$Do $A1 $A2': $($r.out.Trim())" }
}

Write-Host "`n=== Orcivo PRAGMATIC V2.1 - Wave 0 (deterministic, no models) ===`n" -ForegroundColor Cyan

Check 'W0-01  implementer cannot publish (only the integrator has a push path)'      { W0 (New-Fixture) 'implementer-no-publish' }
Check 'W0-02  candidate-controlled code never runs in the supervisor process'        { W0 (New-Fixture) 'candidate-code-not-in-supervisor' }
Check 'W0-03  exact candidate == verified candidate (attestation binding)'           { Spine (New-Fixture) 'verification-substitution' }
Check 'W0-04  exact candidate == reviewed candidate (out-of-band transport)'         { Spine (New-Fixture) 'review-prompt-transport' }
Check 'W0-05  exact candidate == integration candidate (stale-after-review)'         { Spine (New-Fixture) 'integration-stale-after-review' }
Check 'W0-06  candidate with a synthetic secret blocks publish (pre-publish gate)'   { Spine (New-Fixture) 'pipeline-prepublish-secret-gate' }
Check 'W0-07  stale review blocks integration'                                       { Spine (New-Fixture) 'attest-latest-authoritative' 'approve-then-reqchanges' }
Check 'W0-08  duplicate task version produces no duplicated effect'                  { W0 (New-Fixture) 'duplicate-no-effect' }
Check 'W0-09  crash / resume preserves lineage (run generation fencing)'            { W0 (New-Fixture) 'generation-fence' }
Check 'W0-10  provider unavailable -> failover'                                      { W0 (New-Fixture) 'providers-failover' }
Check 'W0-11  fake Claude quota -> Codex continues (same lineage)'                   { W0 (New-Fixture) 'providers-failover' }
Check 'W0-12  fake Codex quota -> Claude continues'                                  { W0 (New-Fixture) 'providers-failover' }
Check 'W0-13  both providers unavailable -> WAITING_PROVIDER'                        { W0 (New-Fixture) 'waiting-provider-lifecycle' }
Check 'W0-14  provider returns -> task resumes automatically'                        { W0 (New-Fixture) 'waiting-provider-lifecycle' }
Check 'W0-15  supervisor restart during WAITING_PROVIDER -> resume polling' {
    $fx = New-Fixture
    $seedOut = (W0 $fx 'seed-waiting-provider')
    $tv = ($seedOut -split '\s+' | Where-Object { $_ -match '^[0-9a-f]{64}$' } | Select-Object -First 1)
    Assert (-not [string]::IsNullOrEmpty($tv)) "seed-waiting-provider did not print a taskVersionId"
    W0 $fx 'restart-provider-resume' $tv    # fresh child process = a "restart"
}
Check 'W0-16  context rollover -> same task, new context, no hidden reasoning'       { W0 (New-Fixture) 'context-rollover-lineage' }
Check 'W0-17  TEST_FAILED / APPLICATION_ERROR does not switch provider'              { W0 (New-Fixture) 'providers-failover' }
Check 'W0-18  REQUEST_CHANGES -> bounded correction loop'                            { W0 (New-Fixture) 'correction-bounded' }
Check 'W0-19  correction produces a NEW candidate and a NEW review'                  { W0 (New-Fixture) 'correction-bounded' }
Check 'W0-20  integration ambiguous -> remote reconciliation (never false NOT_PUBLISHED)' { W0 (New-Fixture) 'intent-reconcile' }
Check 'W0-21  push published + crash -> reconciliation, restart does not re-publish' { W0 (New-Fixture) 'intent-reconcile' }
Check 'W0-22  Level C -> WAITING_HUMAN'                                              { W0 (New-Fixture) 'level-c-waiting-human' }
Check 'W0-23  protected planning / policy modification outside the grant -> blocked' { W0 (New-Fixture) 'protected-planning-blocked' }
Check 'W0-24  semantic classifier returns a structured decision'                     { W0 (New-Fixture) 'classifier-emits-structured-decision' }
Check 'W0-25  router picks profile/provider/model from real capabilities'            { W0 (New-Fixture) 'router-picks-from-real-capabilities' }
Check 'W0-26  provider history / checkpoint are persisted'                           { W0 (New-Fixture) 'waiting-provider-lifecycle' }
Check 'W0-27  task graph respects dependencies'                                      { W0 (New-Fixture) 'taskgraph-deps' }
Check 'W0-28  opposite-provider reviewer is chosen when required'                    { W0 (New-Fixture) 'opposite-reviewer-required' }
Check 'W0-29  review budget prevents an infinite loop'                              { W0 (New-Fixture) 'correction-bounded' }
Check 'W0-30  Product Batch stays awaiting owner (no business auto-execution)'       { W0 (New-Fixture) 'product-batch-awaits-owner' }

Write-Host ""
Write-Host ("=== Wave 0: {0} passed, {1} failed ===" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail) { 'Red' } else { 'Green' })

if (-not $KeepFixtures) {
    foreach ($d in ($script:fixtures | Select-Object -Unique)) { Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue }
}
exit $script:fail
