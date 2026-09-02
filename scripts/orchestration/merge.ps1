<#
merge.ps1 - integrate one validated + reviewed run branch into the target branch,
safely. No force, no destructive reset, never merges a red branch, never deletes a
branch before recovery is guaranteed.

Sequence:
  1. preconditions: verify PASS, review APPROVE, worktree committed & clean
  2. integrate target into the run branch (non-destructive merge). Conflict -> STOP.
  3. re-run the check profile on the integrated branch  == the post-merge tree
  4. main repo must be clean, on target, and target must not have moved under us
  5. git merge --no-ff <branch> into target   (branch already contains target -> no conflict)
  6. push (normal) if configured
  7. keep the branch until cleanup confirms the work is recoverable

Returns a merge-result JSON path.
#>
param(
    [Parameter(Mandatory)] [string]$RunId
)

. (Join-Path $PSScriptRoot 'lib.ps1')

$cfg    = Get-OrchConfig
$run    = Get-RunRecord $RunId
$runDir = Get-RunDir $RunId
$wt     = $run.worktreePath
$target = $cfg.merge.target
$branch = $run.branch

function Write-MergeResult {
    param([string]$Status, [string]$Reason, [hashtable]$Extra)
    $o = [ordered]@{
        schema = 'orcivo.orchestration.merge/v1'
        runId  = $RunId; branch = $branch; target = $target
        status = $Status; reason = $Reason
        targetHeadBefore = $script:targetBefore
        targetHeadAfter  = (Get-GitHead)
        at = (Get-Date).ToString('o')
    }
    if ($Extra) { foreach ($k in $Extra.Keys) { $o[$k] = $Extra[$k] } }
    $path = Join-Path $runDir ("merge-{0}.json" -f (Get-Date -Format 'yyyyMMddHHmmss'))
    Write-JsonFile -Path $path -Object $o
    Write-OrchLog "merge: $RunId => $Status ($Reason)"
    Write-Output $path
}

if (-not $cfg.merge.enabled) { return (Write-MergeResult 'SKIPPED' 'merge disabled in config' $null) }
if (-not (Test-Path $wt))    { return (Write-MergeResult 'STOPPED' "worktree gone: $wt" $null) }

# --- 1. preconditions ---
$verifyFiles = @(Get-ChildItem (Join-Path $runDir 'verify-*.json') -ErrorAction SilentlyContinue | Sort-Object Name)
if ($verifyFiles.Count -eq 0) { return (Write-MergeResult 'STOPPED' 'no verify record - refuse to merge unverified work' $null) }
$verify = Read-JsonFile $verifyFiles[-1].FullName
if ($verify.verdict -ne 'PASS') { return (Write-MergeResult 'STOPPED' "last verify verdict is $($verify.verdict) - refuse to merge a red branch" $null) }

$reviewFiles = @(Get-ChildItem (Join-Path $runDir 'review-*.json') -ErrorAction SilentlyContinue | Sort-Object Name)
if ($cfg.merge.requireReviewApprove) {
    if ($reviewFiles.Count -eq 0) { return (Write-MergeResult 'STOPPED' 'no review record - review required before merge' $null) }
    $review = Read-JsonFile $reviewFiles[-1].FullName
    if ($review.verdict -ne 'APPROVE') { return (Write-MergeResult 'STOPPED' "review verdict is $($review.verdict)" $null) }
}

& git -C $wt add -A | Out-Null
if (-not (Test-GitClean $wt)) {
    & git -C $wt -c user.name='orchestrator' -c user.email='orchestrator@local' commit -m "$($run.taskId): orchestrated change" | Out-Null
}
if (-not (Test-GitClean $wt)) { return (Write-MergeResult 'STOPPED' 'worktree still dirty after commit' $null) }

$script:targetBefore = (Get-GitHead)   # target HEAD in the main checkout right now

# --- 2. integrate target into the run branch (non-destructive) ---
$mergeOut = (& git -C $wt merge $target --no-edit 2>&1) -join "`n"
$mergeExit = $LASTEXITCODE
if ($mergeExit -ne 0) {
    & git -C $wt merge --abort 2>$null | Out-Null
    $run.status = 'NEEDS_REVIEW'; Save-RunRecord $run
    return (Write-MergeResult 'NEEDS_REVIEW' 'non-trivial conflict integrating target into branch - human required' @{ conflict = (Protect-Secrets $mergeOut) })
}

# --- 3. post-integration verify == post-merge tree ---
$vp = & (Join-Path $PSScriptRoot 'verify.ps1') -RunId $RunId
$v2 = Read-JsonFile ($vp | Select-Object -Last 1)
if ($v2.verdict -ne 'PASS') {
    $run.status = 'NEEDS_REVIEW'; Save-RunRecord $run
    return (Write-MergeResult 'NEEDS_REVIEW' "checks fail after integrating $target - $($v2.failureClass)" @{ postMergeVerdict = $v2.verdict })
}

# --- 4. target must be pristine and unmoved ---
if (-not (Test-GitClean)) { return (Write-MergeResult 'STOPPED' "main checkout is dirty - refuse to touch $target" $null) }
$curBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($curBranch -ne $target) { return (Write-MergeResult 'STOPPED' "main checkout is on '$curBranch', not '$target'" $null) }
if ((Get-GitHead) -ne $script:targetBefore) {
    return (Write-MergeResult 'NEEDS_REVIEW' "$target moved during merge prep - re-run the loop" $null)
}

# --- 5. merge branch -> target (branch already contains target: clean --no-ff) ---
Assert-SafeGitArgs @('merge', '--no-ff', $branch)
$revMsg = "$($run.taskId): orchestrated change (executor $($run.provider), cross-reviewed)"
$m2 = (& git merge --no-ff -m $revMsg $branch 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) {
    & git merge --abort 2>$null | Out-Null
    return (Write-MergeResult 'NEEDS_REVIEW' 'unexpected conflict merging branch into target' @{ conflict = (Protect-Secrets $m2) })
}
$mergeCommit = (Get-GitHead)

# --- 6. push (normal only) ---
$pushed = $false
if ($cfg.merge.pushAfterMerge) {
    $up = Get-GitUpstreamStatus
    if ($up.upstream) {
        Assert-SafeGitArgs @('push')
        & git push 2>&1 | Out-Null
        $pushed = ($LASTEXITCODE -eq 0)
        if (-not $pushed) { Write-OrchLog "merge: push failed (merge commit $mergeCommit is local) - push manually" 'WARN' }
    }
}

$run.status = 'MERGED'; $run.mergeCommit = $mergeCommit; Save-RunRecord $run
return (Write-MergeResult 'MERGED' 'ok' @{ mergeCommit = $mergeCommit; pushed = $pushed })
