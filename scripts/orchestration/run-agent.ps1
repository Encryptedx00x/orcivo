<#
run-agent.ps1 - launch ONE agent (claude|codex) against ONE worktree, once.

- Acquires the worktree writer lock (never two writers at once; orphan locks are
  cleared automatically when their owning process is dead).
- Runs the CLI headless with cwd = worktree, stdout/stderr -> redacted log files.
- Classifies the result from exit code + stderr + stdout (+ optional injected signal).
- Writes result.json into the run dir. Does NOT commit, merge, retry, or fail over.

Modes:
  execute  (default) - agent may edit files in the worktree
  review             - agent must NOT edit; read-only sandbox; emits a VERDICT line

Deterministic testing (no real CLI, no quota):
  $env:ORCH_FAKE_AGENT   = "<abs path to tests\fake-agent.ps1>"
  $env:ORCH_FAKE_SCENARIO = "ok-artifact" | "quota" | "partial-then-quota" | ...

Fault injection against the real CLI (POC):
  $env:ORCH_INJECT_FAIL = "claude:PROVIDER_QUOTA"          # provider:CLASS
  $env:ORCH_INJECT_FAIL = "claude:PROVIDER_QUOTA:after"    # run for real, THEN report
#>
param(
    [Parameter(Mandatory)] [string]$RunId,
    [Parameter(Mandatory)] [ValidateSet('claude','codex')] [string]$Provider,
    [Parameter(Mandatory)] [string]$PromptFile,
    [ValidateSet('execute','review')] [string]$Mode = 'execute',
    [int]$TimeoutSec = 900
)

. (Join-Path $PSScriptRoot 'lib.ps1')

$cfg     = Get-OrchConfig
$run     = Get-RunRecord $RunId
$runDir  = Get-RunDir $RunId
$wt      = $run.worktreePath
if (-not (Test-Path $wt)) { throw "worktree missing: $wt" }
if (-not (Test-Path $PromptFile)) { throw "prompt file missing: $PromptFile" }

$stampId  = "{0}-{1}-{2}" -f $Provider, $Mode, (Get-Date -Format 'yyyyMMddHHmmss')
$outLog   = Join-Path $runDir ("logs\{0}.stdout.log" -f $stampId)
$errLog   = Join-Path $runDir ("logs\{0}.stderr.log" -f $stampId)
$rawOut   = Join-Path $runDir ("logs\{0}.stdout.raw"  -f $stampId)
$rawErr   = Join-Path $runDir ("logs\{0}.stderr.raw"  -f $stampId)
New-Item -ItemType Directory -Force -Path (Split-Path $outLog) | Out-Null

$injected = ''
$injectAfter = $false
if ($env:ORCH_INJECT_FAIL) {
    $parts = $env:ORCH_INJECT_FAIL.Split(':')
    if ($parts.Length -ge 2 -and $parts[0] -eq $Provider) {
        $injected = $parts[1]
        if ($parts.Length -ge 3 -and $parts[2] -eq 'after') { $injectAfter = $true }
    }
}

$lock = Enter-WorktreeLock -RunId $RunId -Owner "$Provider/$Mode"
Write-OrchLog "run-agent: $Provider ($Mode) on $RunId (worktree $wt)"
$started = Get-Date
$class = ''

try {
    if ($injected -and -not $injectAfter) {
        Write-OrchLog "run-agent: INJECTED fault $injected for $Provider (no CLI call made)" 'WARN'
        Write-RedactedFile -Path $errLog -Content "INJECTED_FAULT $injected`n(simulated provider failure; real CLI not invoked)"
        Write-RedactedFile -Path $outLog -Content ""
        $exit = 1
        $class = Get-FailureClass -Provider $Provider -ExitCode $exit -Stdout "" -Stderr "" -InjectedSignal $injected
    }
    else {
        if ($env:ORCH_FAKE_AGENT) {
            $binPath = (Get-Command powershell -ErrorAction Stop).Source
            $args = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $env:ORCH_FAKE_AGENT,
                      '-Provider', $Provider, '-Mode', $Mode, '-Worktree', $wt)
        }
        elseif ($Provider -eq 'claude') {
            $pc = $cfg.providers.claude
            $args = @() + $pc.args
            if ($Mode -eq 'review') { $args = @('-p', '--output-format', 'json', '--permission-mode', 'plan') }
            if ($pc.model) { $args += @('--model', $pc.model) }
            $args += @('--add-dir', $wt)
            $binPath = (Get-Command $pc.bin -ErrorAction Stop).Source
        }
        else {
            $pc = $cfg.providers.codex
            $args = @() + $pc.args
            if ($Mode -eq 'review') { $args = @('exec', '--sandbox', 'read-only', '--json', '--skip-git-repo-check', '-c', 'approval_policy="never"') }
            $args += @('-C', $wt)
            $lastMsg = Join-Path $runDir ("logs\{0}.codex-last.txt" -f $stampId)
            $args += @('-o', $lastMsg, '-')
            $binPath = (Get-Command $pc.bin -ErrorAction Stop).Source
        }

        if ($binPath -match '\.ps1$') { $binPath = $binPath -replace '\.ps1$', '.cmd' }
        elseif (-not [System.IO.Path]::GetExtension($binPath)) { $binPath = "$binPath.cmd" }

        Write-OrchLog ("run-agent: exec {0} ({1} args), prompt on stdin" -f $binPath, $args.Length)
        $p = Start-Process -FilePath $binPath -ArgumentList $args -WorkingDirectory $wt `
             -RedirectStandardInput $PromptFile `
             -RedirectStandardOutput $rawOut -RedirectStandardError $rawErr `
             -NoNewWindow -PassThru
        $null = $p.Handle
        if (-not $p.WaitForExit($TimeoutSec * 1000)) {
            try { $p.Kill($true) } catch { }
            $exit = 124
            $class = 'AGENT_ERROR'
        }
        else { $exit = $p.ExitCode }

        $so = if (Test-Path $rawOut) { Get-Content -Raw -LiteralPath $rawOut } else { "" }
        $se = if (Test-Path $rawErr) { Get-Content -Raw -LiteralPath $rawErr } else { "" }
        Write-RedactedFile -Path $outLog -Content $so
        Write-RedactedFile -Path $errLog -Content $se
        Remove-Item -LiteralPath $rawOut, $rawErr -Force -ErrorAction SilentlyContinue

        if (-not $class) { $class = Get-FailureClass -Provider $Provider -ExitCode $exit -Stdout $so -Stderr $se }
        if ($injectAfter) {
            Write-OrchLog "run-agent: INJECTED post-run fault $injected (CLI ran, partial work kept)" 'WARN'
            Add-Content -LiteralPath $errLog -Value "`nINJECTED_FAULT_AFTER_RUN $injected"
            $class = $injected
            $exit = 1
        }
    }
}
finally {
    Exit-WorktreeLock -RunId $RunId
}

# in review mode a reviewer must not leave edits behind
$reviewerDirtied = @()
if ($Mode -eq 'review') {
    $reviewerDirtied = @(Get-GitStatusPorcelain $wt)
    if ($reviewerDirtied.Count -gt 0) {
        & git -C $wt checkout -- . 2>$null | Out-Null
        foreach ($l in $reviewerDirtied) {
            if ($l -match '^\?\?\s+(.+)$') {
                $u = Join-Path $wt ($matches[1].Trim('"'))
                if (Test-Path $u) { Remove-Item -LiteralPath $u -Recurse -Force -ErrorAction SilentlyContinue }
            }
        }
        Write-OrchLog "run-agent: reviewer left $($reviewerDirtied.Count) edit(s) - reverted (review is read-only)" 'WARN'
    }
}

$ended = Get-Date
$result = [ordered]@{
    runId          = $RunId
    provider       = $Provider
    mode           = $Mode
    startedAt      = $started.ToString('o')
    endedAt        = $ended.ToString('o')
    durationSec    = [math]::Round(($ended - $started).TotalSeconds, 1)
    exitCode       = $exit
    failureClass   = $class
    isProviderFail = (Test-IsProviderFailure $class)
    injected       = [bool]$injected
    reviewerDirtied = $reviewerDirtied.Count
    stdoutLog      = (Resolve-Path $outLog -ErrorAction SilentlyContinue).Path
    stderrLog      = (Resolve-Path $errLog -ErrorAction SilentlyContinue).Path
    worktreePath   = $wt
    baseSha        = $run.baseSha
    headAfter      = (Get-GitHead $wt)
    dirtyAfter     = @(Get-GitStatusPorcelain $wt)
}
$resultPath = Join-Path $runDir ("results\{0}.json" -f $stampId)
Write-JsonFile -Path $resultPath -Object $result
Write-OrchLog ("run-agent: {0}/{1} -> exit {2} class {3} (provider-fail={4})" -f $Provider, $Mode, $exit, $class, $result.isProviderFail)
Write-Output $resultPath
