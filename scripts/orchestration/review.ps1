<#
review.ps1 - cross-provider review of one run's branch.

Claude implements -> Codex reviews.   Codex implements -> Claude reviews.

The reviewer receives: task spec + acceptance criteria + the git diff (redacted,
bounded) + the deterministic check results. It does NOT edit by default
(run-agent runs it in a read-only sandbox and reverts anything it touches).

Reviewer output must contain a line:  VERDICT: APPROVE | REQUEST_CHANGES | HUMAN_REVIEW_REQUIRED
On REQUEST_CHANGES the caller (supervisor) feeds the findings back to the executor
in the SAME worktree, up to config.review.maxCycles times.

Returns a review verdict JSON path.
#>
param(
    [Parameter(Mandatory)] [string]$RunId,
    [string]$ExecutorProvider
)

. (Join-Path $PSScriptRoot 'lib.ps1')

$cfg    = Get-OrchConfig
$run    = Get-RunRecord $RunId
$runDir = Get-RunDir $RunId
$wt     = $run.worktreePath

if (-not $ExecutorProvider) { $ExecutorProvider = $run.provider }
$reviewer = if ($ExecutorProvider -eq 'claude') { 'codex' } else { 'claude' }

# --- assemble review context ---
& git -C $wt add -A -N 2>$null | Out-Null
$diff = (& git -C $wt diff $run.baseSha) -join "`n"
if ($diff.Length -gt 80000) { $diff = $diff.Substring(0, 80000) + "`n... [diff truncated at 80k]" }

$verifyFiles = @(Get-ChildItem (Join-Path $runDir 'verify-*.json') -ErrorAction SilentlyContinue | Sort-Object Name)
$verifySummary = 'no verify record'
if ($verifyFiles.Count -gt 0) {
    $v = Read-JsonFile $verifyFiles[-1].FullName
    $verifySummary = "verdict=$($v.verdict) profile=$($v.profile) checks=" + (@($v.checks | ForEach-Object { "$($_.name):$(if($_.pass){'PASS'}else{'FAIL'})" }) -join ', ')
}

$taskText = ''
if ($run.taskSource -and (Test-Path (Join-Path $script:RepoRoot $run.taskSource))) {
    $taskText = Get-Content -Raw -LiteralPath (Join-Path $script:RepoRoot $run.taskSource)
}

$ctx = @()
$ctx += "# Cross-review: run $RunId  (executor=$ExecutorProvider, reviewer=$reviewer)"
$ctx += ""
$ctx += "You are REVIEWING a change on branch $($run.branch). DO NOT EDIT ANY FILE."
$ctx += "Output your review as markdown. The FINAL line MUST be exactly one of:"
$ctx += "  VERDICT: APPROVE"
$ctx += "  VERDICT: REQUEST_CHANGES"
$ctx += "  VERDICT: HUMAN_REVIEW_REQUIRED"
$ctx += ""
$ctx += "Use HUMAN_REVIEW_REQUIRED only for a Level C concern (money handling, tenant"
$ctx += "strategy, secrets, destructive data, production, billing) or something you cannot judge."
$ctx += ""
$ctx += "## Check every item"
foreach ($c in (ConvertTo-List $cfg.review.checklist)) { $ctx += "- $c" }
$ctx += ""
$ctx += "## Task"
$ctx += $run.taskId
if ($taskText) { $ctx += ""; $ctx += "### Task source (.planning excerpt)"; $ctx += $taskText }
if ($run.objective) { $ctx += ""; $ctx += "### Objective"; $ctx += $run.objective }
$ctx += ""
$ctx += "## Deterministic checks"
$ctx += $verifySummary
$ctx += ""
$ctx += "## git diff (base $($run.baseSha))"
$ctx += '```diff'
$ctx += $diff
$ctx += '```'

$promptFile = Join-Path $runDir ("review.prompt.{0}.txt" -f $reviewer)
Write-RedactedFile -Path $promptFile -Content ($ctx -join "`n")

$cycle = if ($run.reviewCycle) { [int]$run.reviewCycle } else { 0 }
Write-OrchLog "review: $RunId cycle $cycle - $reviewer reviewing $ExecutorProvider's work"

$resPath = & (Join-Path $PSScriptRoot 'run-agent.ps1') -RunId $RunId -Provider $reviewer -PromptFile $promptFile -Mode review
$resPath = ($resPath | Select-Object -Last 1)
$ar = Read-JsonFile $resPath

$verdict = 'HUMAN_REVIEW_REQUIRED'
$findings = ''
if ($ar.failureClass -eq 'OK' -and (Test-Path $ar.stdoutLog)) {
    $body = Get-Content -Raw -LiteralPath $ar.stdoutLog
    $findings = $body
    if     ($body -match '(?im)^\s*VERDICT:\s*APPROVE\s*$')                 { $verdict = 'APPROVE' }
    elseif ($body -match '(?im)^\s*VERDICT:\s*REQUEST_CHANGES\s*$')         { $verdict = 'REQUEST_CHANGES' }
    elseif ($body -match '(?im)^\s*VERDICT:\s*HUMAN_REVIEW_REQUIRED\s*$')   { $verdict = 'HUMAN_REVIEW_REQUIRED' }
    else {
        Write-OrchLog "review: $reviewer produced no parseable VERDICT line -> HUMAN_REVIEW_REQUIRED" 'WARN'
    }
}
else {
    Write-OrchLog "review: reviewer invocation failed ($($ar.failureClass)) -> HUMAN_REVIEW_REQUIRED" 'WARN'
}

$out = [ordered]@{
    schema     = 'orcivo.orchestration.review/v1'
    runId      = $RunId
    executor   = $ExecutorProvider
    reviewer   = $reviewer
    cycle      = $cycle
    verdict    = $verdict
    failureClass = $ar.failureClass
    findings   = (Protect-Secrets $findings)
    at         = (Get-Date).ToString('o')
}
$path = Join-Path $runDir ("review-{0}.json" -f (Get-Date -Format 'yyyyMMddHHmmss'))
Write-JsonFile -Path $path -Object $out
Write-OrchLog "review: $RunId => $verdict (reviewer $reviewer)"
Write-Output $path
