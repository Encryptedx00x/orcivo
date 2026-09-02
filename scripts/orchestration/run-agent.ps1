<#
run-agent.ps1 - launch ONE agent (claude|codex) against ONE worktree, once.

- Acquires the worktree writer lock (never two writers at once).
- Runs the CLI headless with cwd = worktree, stdout/stderr -> redacted log files.
- Classifies the result from exit code + stderr + stdout (+ optional injected signal).
- Writes result.json into the run dir. Does NOT commit, merge, retry, or fail over.

Fault injection for the POC (no real quota is ever exhausted):
  $env:ORCH_INJECT_FAIL = "claude:PROVIDER_QUOTA"   # provider:CLASS  (matches the running provider)
#>
param(
    [Parameter(Mandatory)] [string]$RunId,
    [Parameter(Mandatory)] [ValidateSet('claude','codex')] [string]$Provider,
    [Parameter(Mandatory)] [string]$PromptFile,
    [int]$TimeoutSec = 900
)

. (Join-Path $PSScriptRoot 'lib.ps1')

$cfg     = Get-OrchConfig
$run     = Get-RunRecord $RunId
$runDir  = Get-RunDir $RunId
$wt      = $run.worktreePath
if (-not (Test-Path $wt)) { throw "worktree missing: $wt" }
if (-not (Test-Path $PromptFile)) { throw "prompt file missing: $PromptFile" }

$prompt   = Get-Content -Raw -LiteralPath $PromptFile
$stampId  = "{0}-{1}" -f $Provider, (Get-Date -Format 'yyyyMMddHHmmss')
$outLog   = Join-Path $runDir ("logs\{0}.stdout.log" -f $stampId)
$errLog   = Join-Path $runDir ("logs\{0}.stderr.log" -f $stampId)
$rawOut   = Join-Path $runDir ("logs\{0}.stdout.raw"  -f $stampId)   # transient, deleted after redaction
$rawErr   = Join-Path $runDir ("logs\{0}.stderr.raw"  -f $stampId)
New-Item -ItemType Directory -Force -Path (Split-Path $outLog) | Out-Null

# --- injected fault (POC only) ------------------------------------------
#   ORCH_INJECT_FAIL = "<provider>:<CLASS>"            -> report CLASS, do not call the CLI
#   ORCH_INJECT_FAIL = "<provider>:<CLASS>:after"      -> run the CLI for real, THEN report CLASS
#                                                         (simulates quota hit mid/after a partial pass)
$injected = ''
$injectAfter = $false
if ($env:ORCH_INJECT_FAIL) {
    $parts = $env:ORCH_INJECT_FAIL.Split(':')
    if ($parts.Length -ge 2 -and $parts[0] -eq $Provider) {
        $injected = $parts[1]
        if ($parts.Length -ge 3 -and $parts[2] -eq 'after') { $injectAfter = $true }
    }
}

$lock = Enter-WorktreeLock -RunId $RunId -Owner $Provider
Write-OrchLog "run-agent: $Provider on $RunId (worktree $wt)"
$started = Get-Date

try {
    if ($injected -and -not $injectAfter) {
        Write-OrchLog "run-agent: INJECTED fault $injected for $Provider (no CLI call made)" 'WARN'
        Write-RedactedFile -Path $errLog -Content "INJECTED_FAULT $injected`n(simulated provider failure; real CLI not invoked)"
        Write-RedactedFile -Path $outLog -Content ""
        $exit = 1
        $class = Get-FailureClass -Provider $Provider -ExitCode $exit -Stdout "" -Stderr "" -InjectedSignal $injected
    }
    else {
        # prompt goes on STDIN (avoids the Windows command-line length limit and
        # any interactive stdin wait). Both CLIs read the prompt from stdin.
        if ($Provider -eq 'claude') {
            $pc = $cfg.providers.claude
            $args = @()
            $args += $pc.args
            if ($pc.model) { $args += @('--model', $pc.model) }
            $args += @('--add-dir', $wt)
            $bin = $pc.bin
        }
        else {
            $pc = $cfg.providers.codex
            $args = @()
            $args += $pc.args
            $args += @('-C', $wt)
            $lastMsg = Join-Path $runDir ("logs\{0}.codex-last.txt" -f $stampId)
            $args += @('-o', $lastMsg)
            $args += '-'   # read prompt from stdin
            $bin = $pc.bin
        }

        # resolve to a Start-Process-runnable file. npm shims resolve to .ps1 /
        # extensionless first; Start-Process needs the .cmd (or a real .exe).
        $binPath = (Get-Command $bin -ErrorAction Stop).Source
        if ($binPath -match '\.ps1$') { $binPath = $binPath -replace '\.ps1$', '.cmd' }
        elseif (-not [System.IO.Path]::GetExtension($binPath)) { $binPath = "$binPath.cmd" }

        Write-OrchLog ("run-agent: exec {0} ({1} args), prompt on stdin" -f $binPath, $args.Length)
        $p = Start-Process -FilePath $binPath -ArgumentList $args -WorkingDirectory $wt `
             -RedirectStandardInput $PromptFile `
             -RedirectStandardOutput $rawOut -RedirectStandardError $rawErr `
             -NoNewWindow -PassThru
        $null = $p.Handle   # cache handle so .ExitCode is readable after exit (PS 5.1 quirk)
        if (-not $p.WaitForExit($TimeoutSec * 1000)) {
            try { $p.Kill($true) } catch { }
            $exit = 124
            $class = 'TIMEOUT'
        }
        else {
            $exit = $p.ExitCode
        }

        $so = if (Test-Path $rawOut) { Get-Content -Raw -LiteralPath $rawOut } else { "" }
        $se = if (Test-Path $rawErr) { Get-Content -Raw -LiteralPath $rawErr } else { "" }
        Write-RedactedFile -Path $outLog -Content $so
        Write-RedactedFile -Path $errLog -Content $se
        Remove-Item -LiteralPath $rawOut, $rawErr -Force -ErrorAction SilentlyContinue

        if (-not $class) {
            $class = Get-FailureClass -Provider $Provider -ExitCode $exit -Stdout $so -Stderr $se
        }
        if ($injectAfter) {
            Write-OrchLog "run-agent: INJECTED post-run fault $injected for $Provider (CLI ran, partial work kept)" 'WARN'
            Add-Content -LiteralPath $errLog -Value "`nINJECTED_FAULT_AFTER_RUN $injected"
            $class = $injected
            $exit = 1
        }
    }
}
finally {
    Exit-WorktreeLock -RunId $RunId
}

$ended = Get-Date
$result = [ordered]@{
    runId          = $RunId
    provider       = $Provider
    startedAt      = $started.ToString('o')
    endedAt        = $ended.ToString('o')
    durationSec    = [math]::Round(($ended - $started).TotalSeconds, 1)
    exitCode       = $exit
    failureClass   = $class
    isProviderFail = (Test-IsProviderFailure $class)
    injected       = [bool]$injected
    stdoutLog      = (Resolve-Path $outLog -ErrorAction SilentlyContinue).Path
    stderrLog      = (Resolve-Path $errLog -ErrorAction SilentlyContinue).Path
    worktreePath   = $wt
    baseSha        = $run.baseSha
    headAfter      = (Get-GitHead $wt)
    dirtyAfter     = @(Get-GitStatusPorcelain $wt)
}
$resultPath = Join-Path $runDir ("results\{0}.json" -f $stampId)
Write-JsonFile -Path $resultPath -Object $result
Write-OrchLog ("run-agent: {0} -> exit {1} class {2} (provider-fail={3})" -f $Provider, $exit, $class, $result.isProviderFail)

# echo the result path so the supervisor can pick it up
Write-Output $resultPath
