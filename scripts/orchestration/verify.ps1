<#
verify.ps1 - run the deterministic checks for a run's check profile, in its worktree.

Checks are proportional to task risk (see config.json checkProfiles).
Returns a verdict JSON: PASS only if every check exits 0.
Verifier failures are NEVER provider failures - the supervisor treats a FAIL here
as "needs recovery/retry/review", not "switch provider".
#>
param(
    [Parameter(Mandatory)] [string]$RunId,
    [string]$ProfileOverride = ''
)

. (Join-Path $PSScriptRoot 'lib.ps1')

$cfg    = Get-OrchConfig
$run    = Get-RunRecord $RunId
$runDir = Get-RunDir $RunId
$wt     = $run.worktreePath

$profileName = if ($ProfileOverride) { $ProfileOverride } else { $run.checkProfile }
if (-not $profileName) { $profileName = 'A' }
$checkNames = $cfg.checkProfiles.$profileName
if (-not $checkNames) { throw "unknown check profile '$profileName'" }

Write-OrchLog "verify: $RunId profile=$profileName checks=[$($checkNames -join ', ')]"
$checkResults = @()
$allPass = $true

foreach ($name in $checkNames) {
    $spec = $cfg.checks.$name
    if (-not $spec) { throw "check '$name' not defined in config.checks" }
    $cwd = if ($spec.cwd -eq '.' -or -not $spec.cwd) { $wt } else { (Join-Path $wt $spec.cwd) }
    $log = Join-Path $runDir ("checks\{0}.log" -f $name)
    New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null

    # framework-owned scripts (scripts/orchestration/*, .orchestration/*) live in the
    # main repo, not the worktree - resolve those args to absolute paths.
    $resolvedArgs = @()
    foreach ($a in @($spec.args)) {
        if ($a -match '^(scripts/orchestration/|\.orchestration/)' -and (Test-Path (Join-Path $script:RepoRoot $a))) {
            $resolvedArgs += (Join-Path $script:RepoRoot $a)
        } else { $resolvedArgs += $a }
    }
    $binPath = (Get-Command $spec.cmd -ErrorAction Stop).Source
    if ($binPath -match '\.ps1$') { $binPath = $binPath -replace '\.ps1$', '.cmd' }
    elseif (-not [System.IO.Path]::GetExtension($binPath)) { $binPath = "$binPath.cmd" }

    Write-OrchLog "verify: -> $name ($binPath $($resolvedArgs -join ' '))"
    $start = Get-Date
    $raw = Join-Path $runDir ("checks\{0}.raw" -f $name)
    $p = Start-Process -FilePath $binPath -ArgumentList $resolvedArgs -WorkingDirectory $cwd `
         -RedirectStandardOutput $raw -RedirectStandardError "$raw.err" -NoNewWindow -PassThru
    $null = $p.Handle
    $p.WaitForExit()
    $exit = $p.ExitCode
    $body = ""
    foreach ($f in @($raw, "$raw.err")) { if (Test-Path $f) { $body += (Get-Content -Raw -LiteralPath $f) } }
    Write-RedactedFile -Path $log -Content $body
    Remove-Item -LiteralPath $raw, "$raw.err" -Force -ErrorAction SilentlyContinue

    $ok = ($exit -eq 0)
    if (-not $ok) { $allPass = $false }
    $failClass = if ($spec.failureClass) { $spec.failureClass } else { 'CHECK_FAILURE' }
    # promote to INFRA_FAILURE when the check clearly failed on missing infra, not on the code
    if (-not $ok -and $body -match '(?i)(ECONNREFUSED|could not connect|connection refused).*(5433|5544|6379|6380|9000|9002|postgres|redis|minio)') { $failClass = 'INFRA_FAILURE' }
    $checkResults += [ordered]@{
        name = $name; exitCode = $exit; pass = $ok; failureClass = $(if ($ok) { '' } else { $failClass })
        durationSec = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)
        log = (Resolve-Path $log).Path
    }
    Write-OrchLog ("verify: <- {0} exit {1} ({2})" -f $name, $exit, $(if ($ok) {'PASS'} else {'FAIL'}))
}

$firstFail = @($checkResults | Where-Object { -not $_.pass } | Select-Object -First 1)
$verdict = [ordered]@{
    runId      = $RunId
    profile    = $profileName
    verdict    = if ($allPass) { 'PASS' } else { 'FAIL' }
    failureClass = if ($allPass) { '' } elseif ($firstFail) { $firstFail[0].failureClass } else { 'CHECK_FAILURE' }
    isProviderFail = $false
    checks     = $checkResults
    at         = (Get-Date).ToString('o')
}
$path = Join-Path $runDir ("verify-{0}.json" -f (Get-Date -Format 'yyyyMMddHHmmss'))
Write-JsonFile -Path $path -Object $verdict
Write-OrchLog "verify: $RunId => $($verdict.verdict)"
Write-Output $path
