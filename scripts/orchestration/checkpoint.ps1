<#
checkpoint.ps1 - capture a portable, redacted checkpoint of one run.

Written before a provider failover and whenever the supervisor pauses a run.
Everything here is reconstructable from Git + .planning; this file just makes the
handoff explicit. NEVER contains auth data, .env, tokens, cookies or env dumps.
#>
param(
    [Parameter(Mandatory)] [string]$RunId,
    [string]$Reason = 'checkpoint',
    [string]$FailureClass = '',
    [string]$NextAction = '',
    [string]$Notes = ''
)

. (Join-Path $PSScriptRoot 'lib.ps1')

$run    = Get-RunRecord $RunId
$runDir = Get-RunDir $RunId
$wt     = $run.worktreePath

$dirty   = @(Get-GitStatusPorcelain $wt)
$headNow = (Get-GitHead $wt)
# intent-to-add so brand-new files show up in the diff (agents often only create files)
& git -C $wt add -A -N 2>$null | Out-Null
$diffStat = @(& git -C $wt diff --stat $run.baseSha)
# bounded, redacted unified diff (guard against a huge dump)
$diffRaw = (& git -C $wt diff $run.baseSha) -join "`n"
if ($diffRaw.Length -gt 60000) { $diffRaw = $diffRaw.Substring(0, 60000) + "`n... [diff truncated at 60k chars]" }

# collect prior agent results for this run
$results = @()
$resDir = Join-Path $runDir 'results'
if (Test-Path $resDir) {
    Get-ChildItem $resDir -Filter '*.json' | Sort-Object Name | ForEach-Object {
        $r = Read-JsonFile $_.FullName
        $results += [ordered]@{
            provider = $r.provider; exitCode = $r.exitCode; failureClass = $r.failureClass
            isProviderFail = $r.isProviderFail; durationSec = $r.durationSec; endedAt = $r.endedAt
        }
    }
}

$checkpoint = [ordered]@{
    schema         = 'orcivo.orchestration.checkpoint/v1'
    createdAt      = (Get-Date).ToString('o')
    reason         = $Reason
    taskId         = $run.taskId
    taskSource     = $run.taskSource
    runId          = $RunId
    provider       = $run.provider
    branch         = $run.branch
    worktreePath   = $wt
    baseSha        = $run.baseSha
    headNow        = $headNow
    advancedFromBase = ($headNow -ne $run.baseSha)
    dirtyFiles     = $dirty
    diffStat       = $diffStat
    diff           = (Protect-Secrets $diffRaw)
    commandsRun    = $run.commandsRun
    checksRun      = $run.checksRun
    agentResults   = $results
    failureClass   = $FailureClass
    nextAction     = $NextAction
    notes          = $Notes
    reconstructFrom = @(
        "git -C <repo> log --oneline $($run.baseSha)..$($run.branch)",
        ".planning/AGENT-HANDOFF.md",
        ".planning/STATE.md",
        "$($run.taskSource)",
        ".orchestration/runs/$RunId/"
    )
}

$path = Join-Path $script:OrchDir ("checkpoints\{0}-{1}.json" -f $RunId, (Get-Date -Format 'yyyyMMddHHmmss'))
Write-JsonFile -Path $path -Object $checkpoint
Write-OrchLog "checkpoint: $RunId ($Reason) -> $path"
Write-Output $path
