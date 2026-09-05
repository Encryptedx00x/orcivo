<#
run-pilot-selftest.ps1 - SYNTHETIC pilot validation.  (PRAGMATIC V2.1, PARTE 34)

Builds ONE throwaway repo (bare origin + .orch-v2-fixture marker, NC-01) and
drives the composed pilot lifecycle (Invoke-PilotTask) through the guarded
scenarios. No model calls. No Orcivo product task. The real Orcivo repo / main /
.planning are never touched.

  powershell -NoProfile -File scripts\orchestration\v2\tests\pilot\run-pilot-selftest.ps1
#>
param([switch]$KeepFixture)
$ErrorActionPreference = 'Stop'
$Here     = $PSScriptRoot
$RepoRoot = ((& git -C $Here rev-parse --show-toplevel) -replace '/', '\').Trim()
$Probe    = Join-Path $Here 'pilot-probe.ps1'
$PS       = (Get-Command powershell).Source
$RealCfg  = Join-Path $RepoRoot '.orchestration\v2\config.v2.json'
$RealSchemas = Join-Path $RepoRoot '.orchestration\v2\schemas'
. (Join-Path $RepoRoot 'scripts\orchestration\v2\lib-v2.ps1')

$pass = 0; $fail = 0; $fx = $null

function New-Fixture {
    $dir  = Join-Path $env:TEMP ("pilotfx-" + [guid]::NewGuid().ToString('N').Substring(0, 10))
    $bare = "$dir.origin.git"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $ErrorActionPreference = 'Continue'
    & git init --bare -q -b main $bare 2>$null; if ($LASTEXITCODE -ne 0) { & git init --bare -q $bare; & git -C $bare symbolic-ref HEAD refs/heads/main }
    Push-Location $dir
    try {
        & git init -q --initial-branch=main 2>$null; if ($LASTEXITCODE -ne 0) { & git init -q; & git checkout -q -b main }
        & git config user.email t@t; & git config user.name t; & git config commit.gpgsign false
        & git config core.autocrlf false; & git config core.safecrlf false
        New-Item -ItemType Directory -Force -Path (Join-Path $dir '.orchestration\v2\schemas') | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $dir 'work') | Out-Null
        $cfg = Get-Content -Raw -LiteralPath $RealCfg | ConvertFrom-Json
        $cfg.providers.claude.bin = 'powershell'; $cfg.providers.codex.bin = 'powershell'
        ($cfg | ConvertTo-Json -Depth 60) | Set-Content -LiteralPath (Join-Path $dir '.orchestration\v2\config.v2.json') -Encoding utf8
        Copy-Item (Join-Path $RealSchemas '*.json') (Join-Path $dir '.orchestration\v2\schemas\') -ErrorAction SilentlyContinue
        Set-Content -LiteralPath (Join-Path $dir '.orch-v2-fixture') -Value "disposable pilot fixture" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir '.gitignore') -Value ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n.orch-v2-fixture`n" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir 'README.md') -Value "fixture" -Encoding ascii
        Set-Content -LiteralPath (Join-Path $dir 'work\seed.md') -Value "seed" -Encoding ascii
        & git add -A; & git commit -q -m init; & git remote add origin $bare; & git push -q -u origin main
    } finally { Pop-Location }
    return $dir
}

function Check([string]$Name, [string]$Scenario) {
    $o = Join-Path $env:TEMP ("po-" + [guid]::NewGuid().ToString('N').Substring(0, 8) + ".txt")
    $al = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Probe, '-Do', $Scenario)
    $p = Invoke-NativeCaptured -Exe $PS -Arguments $al -WorkingDirectory $fx -StdoutLog $o -StderrLog "$o.err" -TimeoutSec 240
    $out = "$($p.stdout)`n$($p.stderr)"
    Remove-Item -LiteralPath $o, "$o.err" -Force -ErrorAction SilentlyContinue
    if ($p.exitCode -eq 0 -and $out -match 'PROBE_OK') { $script:pass++; Write-Host "PASS  $Name" -ForegroundColor Green }
    else { $script:fail++; Write-Host "FAIL  $Name" -ForegroundColor Red; Write-Host "      $($out.Trim() -split "`n" | Select-Object -Last 4)" -ForegroundColor DarkYellow }
}

Write-Host "`n=== Orcivo PILOT MODE - synthetic validation (no models) ===`n" -ForegroundColor Cyan

$fx = New-Fixture
Check 'PS-01  happy path: classify -> route -> implement -> verify -> secret -> review(opposite) -> integrate -> PUBLISHED' 'happy'
$fx = New-Fixture
Check 'PS-02  Level C task -> WAITING_HUMAN (levelCStop), not executed'                                 'level-c'
$fx = New-Fixture
Check 'PS-03  both providers down -> WAITING_PROVIDER; restore -> auto-resume -> completes'             'provider-down-resume'
$fx = New-Fixture
Check 'PS-04  provider quota on claude -> failover to codex -> completes (same lineage)'                'failover'
$fx = New-Fixture
Check 'PS-05  REQUEST_CHANGES -> bounded correction (new candidate + new review) -> PUBLISHED'          'correction'
$fx = New-Fixture
Check 'PS-06  correction budget spent -> FAILED_REVIEW_BUDGET (WAITING_HUMAN), no infinite loop'        'correction-budget'
$fx = New-Fixture
Check 'PS-07  crash mid-run -> restart reconciliation fences the dead generation and recovers'          'crash-recover'
$fx = New-Fixture
Check 'PS-08  durable checkpoint written + pilot status reads it'                                       'checkpoint'
$fx = New-Fixture
Check 'PS-09  no force-push anywhere in the pilot / integrator authoritative path'                      'no-force-push'
$fx = New-Fixture
Check 'PS-10  real PB1 task refused (no auth token; gates unsatisfied)'                                 'real-refused'
$fx = New-Fixture
Check 'PS-11  docker composition static invariants (read-only candidate, --network none test, no sock/HOME/secrets)' 'docker-static'

Write-Host ""
Write-Host ("=== pilot synthetic: {0} passed, {1} failed ===" -f $pass, $fail) -ForegroundColor $(if ($fail) { 'Red' } else { 'Green' })
if (-not $KeepFixture -and $fx) {
    Get-ChildItem $env:TEMP -Filter 'pilotfx-*' -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item -Recurse -Force $_.FullName -ErrorAction SilentlyContinue }
}
exit $fail
