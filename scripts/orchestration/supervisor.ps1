<#
supervisor.ps1 - the Orcivo multi-agent execution layer.

  .planning/STATE.md   = authoritative GSD state
  .planning/AGENT-HANDOFF.md = operational checkpoint
  CLAUDE.md            = policy (not status)
  git                  = canonical implementation state
  git worktrees        = per-run isolation
  claude -p (headless) = primary executor      codex exec = fallback + cross-reviewer

Commands:
  index    rebuild + validate .orchestration/execution-index.json from .planning
  status   queue + workers + providers + main sync  (K)
  next     print the next schedulable task (deps + Level-C aware)
  run      run ONE task end to end: worktree -> agent -> verify -> cross-review -> safe merge
             -NoMerge  stop at a validated+reviewed branch (POC style)
  loop     continuous scheduler: reconcile -> pick READY -> run -> repeat. Sleeps when
             idle / blocked / human-gated. Never busy-loops. Stop: create .orchestration/loop.stop
  recover  detect orphan locks / stale worktrees / interrupted runs after a crash (I)
             -Apply  clear provably-safe orphans (never touches dirty work)
  cleanup  archive a finished run: remove its worktree, keep branch + logs + checkpoints

Usage:
  powershell -File scripts\orchestration\supervisor.ps1 <command> [-Task <id>] [-Provider claude|codex]
             [-MaxRetries N] [-NoMerge] [-Apply] [-Once] [-DryRun]
#>
param(
    [Parameter(Position = 0)] [ValidateSet('index','status','next','run','loop','recover','cleanup')] [string]$Command = 'status',
    [string]$Task,
    [ValidateSet('claude','codex')] [string]$Provider,
    [int]$MaxRetries = 1,
    [switch]$NoMerge,
    [switch]$Apply,
    [switch]$Once,
    [switch]$DryRun
)

. (Join-Path $PSScriptRoot 'lib.ps1')
. (Join-Path $PSScriptRoot 'reconcile.ps1')
$cfg = Get-OrchConfig

$QueueDir  = Join-Path $script:OrchDir 'queue'
$StopFile  = Join-Path $script:OrchDir ($cfg.scheduler.stopFile)

# ======================================================================
# task specs  (two origins: the derived index, and manual queue/*.json)
# ======================================================================

function Get-QueueTasks {
    if (-not (Test-Path $QueueDir)) { return @() }
    Get-ChildItem $QueueDir -Filter '*.json' | ForEach-Object { Read-JsonFile $_.FullName }
}

function Save-TaskSpec {
    param($TaskSpec)
    Write-JsonFile -Path (Join-Path $QueueDir ("{0}.json" -f $TaskSpec.taskId)) -Object $TaskSpec
}

function Get-TaskById {
    param([string]$Id)
    $q = Get-QueueTasks | Where-Object { $_.taskId -eq $Id } | Select-Object -First 1
    if ($q) { return $q }
    # derive from the index
    try { $idx = Get-ExecutionIndex } catch { return $null }
    $t = $idx.tasks | Where-Object { $_.task_id -eq $Id } | Select-Object -First 1
    if (-not $t) { return $null }
    return (ConvertTo-DerivedSpec $t $idx)
}

function ConvertTo-DerivedSpec {
    param($IndexTask, $Idx)
    [ordered]@{
        taskId          = $IndexTask.task_id
        origin          = 'index'
        source          = $IndexTask.source
        title           = $IndexTask.description
        objective       = ("$($IndexTask.description)`n`nEntregavel esperado: $($IndexTask.deliverable)`n`nEste task pertence ao plano $($IndexTask.plan). O plano completo esta anexado acima como fonte de verdade - implemente somente $($IndexTask.task_id).")
        checkProfile    = $IndexTask.verification.profile
        risk            = $IndexTask.risk
        humanGate       = [bool]$IndexTask.humanGate
        level           = $IndexTask.risk
        dependencies    = @(ConvertTo-List $IndexTask.dependencies)
        planDependencies = @(ConvertTo-List $IndexTask.planDependencies)
        scope           = @(ConvertTo-List $IndexTask.scopes)
        scopes          = @(ConvertTo-List $IndexTask.scopes)
        status          = if ($IndexTask.status -eq 'PENDING') { 'READY' } else { $IndexTask.status }
        primaryProvider = $cfg.providers.primary
        priority        = 50
    }
}

# every schedulable task, normalised, from both origins
function Get-SchedulableTasks {
    $out = @()
    foreach ($q in (Get-QueueTasks)) {
        if (-not $q.scopes) { $q.scopes = @(ConvertTo-List $q.scope) }
        $out += ,$q
    }
    try {
        $idx = Get-ExecutionIndex
        foreach ($t in $idx.tasks) {
            if ($t.status -notin @('PENDING','READY')) { continue }
            if (@($out | Where-Object { $_.taskId -eq $t.task_id }).Count -gt 0) { continue }
            $out += ,(ConvertTo-DerivedSpec $t $idx)
        }
    } catch { }
    return @($out)
}

function Test-TaskStatusDone {
    param([string]$Id)
    $q = Get-QueueTasks | Where-Object { $_.taskId -eq $Id } | Select-Object -First 1
    if ($q) { return ($q.status -in @('DONE','MERGED','ARCHIVED','SKIPPED')) }
    try {
        $idx = Get-ExecutionIndex
        $t = $idx.tasks | Where-Object { $_.task_id -eq $Id } | Select-Object -First 1
        if ($t) { return ($t.status -in @('DONE','SKIPPED')) }
    } catch { }
    return $false
}

function Test-PlanResolved {
    param([string]$PlanId)
    try { $idx = Get-ExecutionIndex } catch { return $false }
    $pt = @($idx.tasks | Where-Object { $_.plan -eq $PlanId })
    if ($pt.Count -eq 0) { return $false }
    return (@($pt | Where-Object { $_.status -notin @('DONE','SKIPPED') }).Count -eq 0)
}

function Test-DepsSatisfied {
    param($TaskSpec)
    foreach ($d in (ConvertTo-List $TaskSpec.dependencies)) {
        if (-not $d) { continue }
        if (-not (Test-TaskStatusDone $d)) { return $false }
    }
    foreach ($pd in (ConvertTo-List $TaskSpec.planDependencies)) {
        if (-not $pd) { continue }
        if (-not (Test-PlanResolved $pd)) { return $false }
    }
    return $true
}

function Test-LevelCGate {
    param($TaskSpec)
    if ($TaskSpec.humanGate -or $TaskSpec.level -eq 'C' -or $TaskSpec.risk -eq 'C') { return $true }
    $hay = (@($TaskSpec.title, $TaskSpec.notes, $TaskSpec.objective, ((ConvertTo-List $TaskSpec.scope) -join ' ')) -join ' ').ToLowerInvariant()
    foreach ($trig in (ConvertTo-List $cfg.levelCGuards.triggers)) {
        if ($hay -match [regex]::Escape($trig.ToLowerInvariant())) { return $true }
    }
    return $false
}

function Get-ActiveRunSpecs {
    Get-AllRunRecords | Where-Object { $_.status -eq 'RUNNING' } | ForEach-Object {
        [pscustomobject]@{ task_id = $_.taskId; scopes = @(ConvertTo-List $_.scopes); dependencies = @(); risk = $_.risk; humanGate = $_.humanGate }
    }
}

function Get-NextReadyTask {
    $active = @(Get-ActiveRunSpecs)
    foreach ($t in (Get-SchedulableTasks | Where-Object { $_.status -in @('READY') } | Sort-Object { $_.priority }, { $_.taskId })) {
        if (Test-LevelCGate $t) { continue }
        if (-not (Test-DepsSatisfied $t)) { continue }
        if ($active.Count -gt 0) {
            $me = [pscustomobject]@{ task_id = $t.taskId; scopes = @(ConvertTo-List $t.scopes); dependencies = @(ConvertTo-List $t.dependencies); risk = $t.risk; humanGate = $t.humanGate }
            $clash = $false
            foreach ($a in $active) { if (-not (Test-CanRunTogether $me $a)) { $clash = $true; break } }
            if ($clash) {
                if ($cfg.scheduler.serializeOnScopeUncertainty) { continue }
            }
        }
        return $t
    }
    return $null
}

function Get-GatedTasks {
    # tasks that need a human before the pipeline can move: Level-C READY tasks,
    # plus index tasks already sitting in WAITING_HUMAN whose other deps are done.
    $out = @(Get-SchedulableTasks | Where-Object { $_.status -eq 'READY' -and (Test-LevelCGate $_) -and (Test-DepsSatisfied $_) })
    try {
        $idx = Get-ExecutionIndex
        foreach ($t in $idx.tasks) {
            if ($t.status -ne 'WAITING_HUMAN') { continue }
            $spec = ConvertTo-DerivedSpec $t $idx
            $spec.status = 'READY'
            if (Test-DepsSatisfied $spec) { $out += ,$spec }
        }
    } catch { }
    return @($out)
}

# ======================================================================
# J - human gate
# ======================================================================

function Show-HumanGate {
    param($TaskSpec)
    $why = if ($TaskSpec.risk -eq 'C' -or $TaskSpec.humanGate) { "task class is a human gate (Level C)" } else { "matches a Level C trigger in CLAUDE.md" }
    $src = if ($TaskSpec.source) { $TaskSpec.source } else { '(manual queue task)' }
    Write-Host ""
    Write-Host "  HUMAN GATE -----------------------------------------------" -ForegroundColor Yellow
    Write-Host ("  TASK:            {0}" -f $TaskSpec.taskId)
    Write-Host ("  WHY HUMAN:       {0}" -f $why)
    Write-Host ("  INSTRUCTIONS:    read {0}" -f $src)
    Write-Host  "                   perform the step manually; do NOT ask an agent to do it."
    Write-Host  "                   record the result in the plan's SUMMARY (mark the task done)."
    Write-Host ("  AFTER APPROVAL:  re-run 'supervisor.ps1 index'; the loop then unblocks")
    Write-Host  "                   dependent tasks automatically. Nothing is bypassed."
    Write-Host  "  ----------------------------------------------------------" -ForegroundColor Yellow
    Write-Host ""
}

# ======================================================================
# run pipeline
# ======================================================================

function Build-TaskPrompt {
    param($TaskSpec, [string]$RunId, [string]$Worktree, [string]$ForProvider, [string]$ExtraSection = '')
    $ctx = @()
    $ctx += "# Orchestrated task: $($TaskSpec.taskId)"
    $ctx += ""
    $ctx += "You are running headless inside an ISOLATED git worktree: $Worktree"
    $ctx += "Branch: $($TaskSpec.branch). Base: $($TaskSpec.baseSha)."
    $ctx += ""
    $ctx += "## Hard rules (non-negotiable)"
    $ctx += "- Edit files ONLY inside this worktree. Do NOT run git. Do NOT push. The supervisor commits/merges."
    $ctx += "- Do NOT touch: production, DNS, secrets/.env, persistent DB, billing/provider credentials."
    $ctx += "- Do NOT exceed Level A/B autonomy. If the task needs a Level C decision, STOP and emit a line 'HUMAN_GATE: <why>'."
    $ctx += "- .planning is the source of truth. Do not restate or rewrite the roadmap."
    $ctx += "- Follow CLAUDE.md: pt-BR UI, Decimal for money, company_id on every business query, Lucide icons, plan names Orcivo Livre/Solo/Mais/Equipe."
    $ctx += ""
    if ($TaskSpec.source -and (Test-Path (Join-Path $script:RepoRoot $TaskSpec.source))) {
        $ctx += "## Task source (.planning excerpt - authoritative)"
        $ctx += (Get-Content -Raw -LiteralPath (Join-Path $script:RepoRoot $TaskSpec.source))
        $ctx += ""
    }
    $ctx += "## Objective"
    $ctx += $TaskSpec.objective
    if ($TaskSpec.continueFromCheckpoint -and (Test-Path $TaskSpec.continueFromCheckpoint)) {
        $ctx += ""
        $ctx += "## CONTINUATION - THIS OVERRIDES ANY 'do only part N' WORDING ABOVE"
        $ctx += "The previous agent ($($TaskSpec.previousProvider)) was cut off by a provider failure."
        $ctx += "Its partial work is ALREADY in this worktree. Inspect it, work out what the"
        $ctx += "Objective still needs, and COMPLETE the whole Objective. Do not restart from scratch."
        $ctx += ""
        $ctx += (Get-Content -Raw -LiteralPath $TaskSpec.continueFromCheckpoint | Protect-Secrets)
    }
    if ($ExtraSection) { $ctx += ""; $ctx += $ExtraSection }
    $promptFile = Join-Path (Get-RunDir $RunId) ("prompt.{0}.txt" -f $ForProvider)
    Write-RedactedFile -Path $promptFile -Content ($ctx -join "`n")
    return $promptFile
}

function New-Run {
    param($TaskSpec)
    $runId = "{0}-{1}" -f $TaskSpec.taskId, (Get-Date -Format 'yyyyMMddHHmmss')
    $base  = (Get-GitHead)
    $branch = "{0}{1}" -f $cfg.scheduler.branchPrefix, $runId
    $wt = Join-Path $script:OrchDir ("worktrees\{0}" -f $runId)

    if ($DryRun) { Write-OrchLog "[dry-run] git worktree add -b $branch $wt $base"; return $null }

    Assert-SafeGitArgs @('worktree', 'add', '-b', $branch, $wt, $base)
    & git -C $script:RepoRoot worktree add -b $branch $wt $base | Out-Null
    Write-OrchLog "run: worktree $wt on $branch @ $base"

    $rec = [ordered]@{
        runId = $runId; taskId = $TaskSpec.taskId; taskSource = $TaskSpec.source; objective = $TaskSpec.objective
        provider = if ($Provider) { $Provider } elseif ($TaskSpec.primaryProvider) { $TaskSpec.primaryProvider } else { $cfg.providers.primary }
        branch = $branch; worktreePath = $wt; baseSha = $base
        checkProfile = $TaskSpec.checkProfile; risk = $TaskSpec.risk; humanGate = [bool]$TaskSpec.humanGate
        scopes = @(ConvertTo-List $TaskSpec.scopes)
        status = 'RUNNING'; createdAt = (Get-Date).ToString('o'); pid = $PID
        commandsRun = @("git worktree add -b $branch"); checksRun = @(); reviewCycle = 0; attempts = 0
    }
    Save-RunRecord $rec

    $TaskSpec.status = 'RUNNING'; $TaskSpec.runId = $runId; $TaskSpec.branch = $branch; $TaskSpec.baseSha = $base
    if ($TaskSpec.origin -ne 'index') { Save-TaskSpec $TaskSpec }
    return $rec
}

function Invoke-AgentAttempt {
    param($TaskSpec, $Rec, [string]$UseProvider, [string]$ExtraSection = '')
    $prompt = Build-TaskPrompt -TaskSpec $TaskSpec -RunId $Rec.runId -Worktree $Rec.worktreePath -ForProvider $UseProvider -ExtraSection $ExtraSection
    $rp = & (Join-Path $PSScriptRoot 'run-agent.ps1') -RunId $Rec.runId -Provider $UseProvider -PromptFile $prompt -Mode execute
    return (Read-JsonFile ($rp | Select-Object -Last 1))
}

function Set-TaskDone {
    param($TaskSpec, [string]$FinalStatus)
    if ($TaskSpec.origin -eq 'index') {
        Write-OrchLog "run: index task $($TaskSpec.taskId) -> $FinalStatus. Update the plan SUMMARY + re-run 'index' to persist." 'INFO'
    } else {
        $TaskSpec.status = $FinalStatus; Save-TaskSpec $TaskSpec
    }
}

function Invoke-Pipeline {
    param([string]$TaskId)
    $spec = Get-TaskById $TaskId
    if (-not $spec) { throw "no schedulable task '$TaskId'" }

    if (Test-LevelCGate $spec) {
        Show-HumanGate $spec
        Set-TaskDone $spec 'WAITING_HUMAN'
        Write-OrchLog "run: $TaskId is Level C -> WAITING_HUMAN (paused, not failed)" 'WARN'
        return
    }
    if (-not (Test-DepsSatisfied $spec)) { Write-OrchLog "run: deps not satisfied for $TaskId" 'WARN'; return }

    $rec = New-Run $spec
    if (-not $rec) { return }

    $provider = $rec.provider
    $attempt = 0
    $verdict = $null

    # ---- execute + verify + failover loop ----
    while ($true) {
        $attempt++; $rec.attempts = $attempt; Save-RunRecord $rec
        Write-OrchLog "run: $($rec.runId) attempt $attempt provider=$provider"
        $ar = Invoke-AgentAttempt -TaskSpec $spec -Rec $rec -UseProvider $provider

        if ($ar.failureClass -eq 'OK') {
            $vp = & (Join-Path $PSScriptRoot 'verify.ps1') -RunId $rec.runId
            $verdict = Read-JsonFile ($vp | Select-Object -Last 1)
            $rec.checksRun += $verdict.profile; Save-RunRecord $rec
            if ($verdict.verdict -eq 'PASS') { break }
            & (Join-Path $PSScriptRoot 'checkpoint.ps1') -RunId $rec.runId -Reason 'verify-failed' -FailureClass $verdict.failureClass -NextAction 'retry same provider with check output; then human review' | Out-Null
            if ($attempt -le $MaxRetries) { Write-OrchLog "run: verify FAIL ($($verdict.failureClass)) -> retry same provider" 'WARN'; continue }
            $rec.status = 'CHECK_FAILED'; $rec.verdict = 'FAIL'; Save-RunRecord $rec
            Set-TaskDone $spec 'NEEDS_RECOVERY'
            Write-OrchLog "run: $($rec.runId) STOPPED - checks still failing after $attempt attempts. Human review." 'ERROR'
            return
        }

        if ($ar.failureClass -eq 'HUMAN_GATE') {
            & (Join-Path $PSScriptRoot 'checkpoint.ps1') -RunId $rec.runId -Reason 'agent-hit-human-gate' -FailureClass 'HUMAN_GATE' -NextAction 'human clears the gate' | Out-Null
            $rec.status = 'WAITING_HUMAN'; Save-RunRecord $rec
            Set-TaskDone $spec 'WAITING_HUMAN'
            Show-HumanGate $spec
            return
        }

        $cpPath = & (Join-Path $PSScriptRoot 'checkpoint.ps1') -RunId $rec.runId -Reason 'agent-failed' -FailureClass $ar.failureClass -NextAction 'see failover policy' | Select-Object -Last 1

        if ($ar.isProviderFail) {
            if ($provider -eq $cfg.providers.fallback) {
                Write-OrchLog "run: fallback provider ALSO hit $($ar.failureClass). Pausing for human." 'ERROR'
                $rec.status = 'BLOCKED_PROVIDER'; Save-RunRecord $rec
                Set-TaskDone $spec 'BLOCKED_PROVIDER'
                return
            }
            Write-OrchLog "run: PROVIDER failure ($($ar.failureClass)) on $provider -> checkpoint + fail over to $($cfg.providers.fallback), SAME worktree" 'WARN'
            $spec.continueFromCheckpoint = $cpPath; $spec.previousProvider = $provider
            $provider = $cfg.providers.fallback
            $rec.provider = $provider; Save-RunRecord $rec
            continue
        }

        # AGENT_ERROR / UNKNOWN / INFRA / etc -> retry once, never fail over
        if ($attempt -le $MaxRetries -and $ar.failureClass -in @('AGENT_ERROR')) {
            Write-OrchLog "run: $($ar.failureClass) -> retry same provider (no failover)" 'WARN'; continue
        }
        Write-OrchLog "run: $($rec.runId) STOPPED - $($ar.failureClass) is not a provider failure. Human review." 'ERROR'
        $rec.status = $ar.failureClass; Save-RunRecord $rec
        Set-TaskDone $spec 'NEEDS_RECOVERY'
        return
    }

    # ---- commit the branch ----
    & git -C $rec.worktreePath add -A | Out-Null
    if (-not (Test-GitClean $rec.worktreePath)) {
        & git -C $rec.worktreePath -c user.name='orchestrator' -c user.email='orchestrator@local' commit -m "$($spec.taskId): orchestrated change" | Out-Null
        $rec.commandsRun += "git commit ($($rec.branch))"
    }
    $rec.headAfter = (Get-GitHead $rec.worktreePath)
    $rec.status = 'VALIDATED'; Save-RunRecord $rec

    # ---- cross-review cycles ----
    $maxCycles = if ($cfg.review.maxCycles) { [int]$cfg.review.maxCycles } else { 2 }
    if ($cfg.review.enabled) {
        while ($true) {
            $rvp = & (Join-Path $PSScriptRoot 'review.ps1') -RunId $rec.runId -ExecutorProvider $rec.provider
            $rv = Read-JsonFile ($rvp | Select-Object -Last 1)
            if ($rv.verdict -eq 'APPROVE') { $rec.status = 'REVIEW_APPROVED'; Save-RunRecord $rec; break }
            if ($rv.verdict -eq 'HUMAN_REVIEW_REQUIRED') {
                $rec.status = 'WAITING_HUMAN'; Save-RunRecord $rec
                Set-TaskDone $spec 'WAITING_HUMAN'
                Write-OrchLog "run: $($rec.runId) review -> HUMAN_REVIEW_REQUIRED. Branch $($rec.branch) left for a human." 'WARN'
                return
            }
            # REQUEST_CHANGES
            $rec.reviewCycle = [int]$rec.reviewCycle + 1; Save-RunRecord $rec
            if ($rec.reviewCycle -gt $maxCycles) {
                $rec.status = 'REVIEW_EXHAUSTED'; Save-RunRecord $rec
                Set-TaskDone $spec 'NEEDS_RECOVERY'
                Write-OrchLog "run: $($rec.runId) exceeded $maxCycles review cycles. Human review. Branch kept." 'ERROR'
                return
            }
            Write-OrchLog "run: review REQUEST_CHANGES (cycle $($rec.reviewCycle)/$maxCycles) -> back to $($rec.provider)" 'WARN'
            $fix = "## REVIEW FEEDBACK - address every point, then stop`nThe cross-reviewer ($($rv.reviewer)) requested changes:`n`n$($rv.findings)"
            $ar2 = Invoke-AgentAttempt -TaskSpec $spec -Rec $rec -UseProvider $rec.provider -ExtraSection $fix
            if ($ar2.failureClass -ne 'OK') {
                $rec.status = "FIX_FAILED_$($ar2.failureClass)"; Save-RunRecord $rec
                Set-TaskDone $spec 'NEEDS_RECOVERY'
                Write-OrchLog "run: fix attempt failed ($($ar2.failureClass)). Human review." 'ERROR'
                return
            }
            & git -C $rec.worktreePath add -A | Out-Null
            if (-not (Test-GitClean $rec.worktreePath)) {
                & git -C $rec.worktreePath -c user.name='orchestrator' -c user.email='orchestrator@local' commit -m "$($spec.taskId): review fixes (cycle $($rec.reviewCycle))" | Out-Null
            }
            $vp2 = & (Join-Path $PSScriptRoot 'verify.ps1') -RunId $rec.runId
            $v2 = Read-JsonFile ($vp2 | Select-Object -Last 1)
            if ($v2.verdict -ne 'PASS') {
                $rec.status = 'CHECK_FAILED'; Save-RunRecord $rec
                Set-TaskDone $spec 'NEEDS_RECOVERY'
                Write-OrchLog "run: checks fail after review fixes ($($v2.failureClass)). Human review." 'ERROR'
                return
            }
        }
    } else { $rec.status = 'REVIEW_APPROVED'; Save-RunRecord $rec }

    # ---- merge ----
    if ($NoMerge -or -not $cfg.merge.enabled) {
        $rec.status = 'VALIDATED_AWAITING_REVIEW'; Save-RunRecord $rec
        Set-TaskDone $spec 'DONE'
        Write-OrchLog "run: $($rec.runId) validated + reviewed. -NoMerge: branch $($rec.branch) NOT merged." 'INFO'
        return
    }
    $mp = & (Join-Path $PSScriptRoot 'merge.ps1') -RunId $rec.runId
    $mr = Read-JsonFile ($mp | Select-Object -Last 1)
    if ($mr.status -eq 'MERGED') {
        Set-TaskDone $spec 'MERGED'
        Write-OrchLog "run: $($rec.runId) MERGED -> $($mr.mergeCommit) (pushed=$($mr.pushed))" 'INFO'
    } else {
        Set-TaskDone $spec 'NEEDS_RECOVERY'
        Write-OrchLog "run: $($rec.runId) merge => $($mr.status): $($mr.reason). Branch $($rec.branch) kept." 'WARN'
    }
}

# ======================================================================
# C - continuous scheduler
# ======================================================================

function Invoke-Loop {
    Write-OrchLog "loop: starting. maxParallel=$($cfg.scheduler.maxParallel) (ceiling $($cfg.scheduler.maxParallelCeiling)). Stop: create $StopFile"
    $maxPar = [Math]::Min([int]$cfg.scheduler.maxParallel, [int]$cfg.scheduler.maxParallelCeiling)
    if ($maxPar -lt 1) { $maxPar = 1 }

    while ($true) {
        if (Test-Path $StopFile) { Write-OrchLog "loop: stop file present -> exiting."; Remove-Item $StopFile -Force -ErrorAction SilentlyContinue; break }

        $idx = Update-ExecutionIndex
        if ($cfg.scheduler.refuseRunWhenNotReconciled -and -not $idx.reconciled) {
            Write-OrchLog "loop: index NOT reconciled ($($idx.errors.Count) errors). Not running anything. Fix .planning, then continue." 'WARN'
            if ($Once) { break }
            Start-Sleep -Seconds ([int]$cfg.scheduler.blockedSleepSec); continue
        }

        $active = @(Get-AllRunRecords | Where-Object { $_.status -eq 'RUNNING' })
        if ($active.Count -ge $maxPar) {
            Write-OrchLog "loop: $($active.Count)/$maxPar workers busy - waiting."
            if ($Once) { break }
            Start-Sleep -Seconds ([int]$cfg.scheduler.idleSleepSec); continue
        }

        $next = Get-NextReadyTask
        if (-not $next) {
            $gated = @(Get-GatedTasks)
            if ($gated.Count -gt 0) {
                Write-OrchLog "loop: nothing runnable; $($gated.Count) task(s) waiting on a human gate:" 'WARN'
                foreach ($g in $gated) { Show-HumanGate $g }
            } else {
                Write-OrchLog "loop: no READY task (all blocked / done). Waiting."
            }
            if ($Once) { break }
            Start-Sleep -Seconds ([int]$(if ($gated.Count -gt 0) { $cfg.scheduler.humanGateSleepSec } else { $cfg.scheduler.blockedSleepSec }))
            continue
        }

        Write-OrchLog "loop: dispatching $($next.taskId)"
        try { Invoke-Pipeline -TaskId $next.taskId }
        catch { Write-OrchLog "loop: pipeline error for $($next.taskId): $($_.Exception.Message)" 'ERROR' }

        if ($Once) { break }
        Start-Sleep -Seconds ([int]$cfg.scheduler.idleSleepSec)
    }
}

# ======================================================================
# I - crash recovery
# ======================================================================

function Invoke-Recover {
    Write-Host "`n== recovery scan ==" -ForegroundColor Cyan
    $findings = @()

    foreach ($o in (Get-OrphanLocks)) {
        $runStatus = try { (Get-RunRecord $o.runId).status } catch { '(no run record)' }
        $safe = ($runStatus -ne 'RUNNING')
        $findings += [ordered]@{ kind = 'orphan-lock'; id = $o.runId; detail = "held by $($o.owner) pid $($o.pid) (dead); run status=$runStatus"; action = if ($safe) { 'clear (safe)' } else { 'clear + mark run RECOVERABLE' } }
    }

    $runById = @{}; Get-AllRunRecords | ForEach-Object { $runById[$_.runId] = $_ }
    foreach ($wt in (Get-OrchWorktrees)) {
        $runId = Split-Path -Leaf $wt.path
        $rec = $runById[$runId]
        $dirty = @(Get-GitStatusPorcelain $wt.path)
        $hasCommits = $false
        if ($rec) { $hasCommits = ((& git -C $script:RepoRoot rev-list --count "$($rec.baseSha)..$($wt.branch)" 2>$null) -as [int]) -gt 0 }
        if (-not $rec) {
            $findings += [ordered]@{ kind = 'stale-worktree'; id = $runId; detail = "worktree with no run record; dirty=$($dirty.Count) commits=$hasCommits"; action = if ($dirty.Count -eq 0 -and -not $hasCommits) { 'removable' } else { 'KEEP - has work; human review' } }
        }
        elseif ($rec.status -eq 'RUNNING') {
            $alive = Test-PidAlive ([int]$rec.pid)
            if (-not $alive) {
                $cp = @(Get-ChildItem (Join-Path $script:OrchDir 'checkpoints') -Filter "$runId-*.json" -ErrorAction SilentlyContinue)
                $newStatus = if ($dirty.Count -gt 0 -and $cp.Count -eq 0) { 'NEEDS_REVIEW' } else { 'RECOVERABLE' }
                $findings += [ordered]@{ kind = 'interrupted-run'; id = $runId; detail = "status RUNNING but pid $($rec.pid) dead; dirty=$($dirty.Count) checkpoints=$($cp.Count)"; action = "mark $newStatus (never auto-clean dirty work)" }
                if ($Apply) { $rec.status = $newStatus; Save-RunRecord $rec }
            }
        }
        elseif ($dirty.Count -gt 0) {
            $findings += [ordered]@{ kind = 'dirty-worktree'; id = $runId; detail = "run status=$($rec.status), $($dirty.Count) uncommitted change(s)"; action = 'KEEP - never auto-clean' }
        }
    }

    foreach ($b in (& git -C $script:RepoRoot branch --list "$($cfg.scheduler.branchPrefix)*")) {
        $bn = $b.Trim().TrimStart('* ').Trim()
        if (-not $bn) { continue }
        $merged = (& git -C $script:RepoRoot branch --merged $cfg.merge.target 2>$null | ForEach-Object { $_.Trim().TrimStart('* ').Trim() }) -contains $bn
        if (-not $merged) {
            $findings += [ordered]@{ kind = 'unmerged-branch'; id = $bn; detail = "not merged into $($cfg.merge.target)"; action = 'KEEP until reviewed/merged or explicitly abandoned' }
        }
    }

    $cpDir = Join-Path $script:OrchDir 'checkpoints'
    if (Test-Path $cpDir) {
        $cps = @(Get-ChildItem $cpDir -Filter '*.json')
        if ($cps.Count -gt 0) { $findings += [ordered]@{ kind = 'checkpoints'; id = "$($cps.Count) file(s)"; detail = "latest: $(($cps | Sort-Object LastWriteTime | Select-Object -Last 1).Name)"; action = 'context for resuming an interrupted run' } }
    }

    if ($findings.Count -eq 0) { Write-Host "  clean - no orphan locks, stale worktrees or interrupted runs." -ForegroundColor Green }
    foreach ($f in $findings) {
        Write-Host ("  [{0,-16}] {1,-40} {2}" -f $f.kind, $f.id, $f.detail)
        Write-Host ("  {0,-19} -> {1}" -f '', $f.action) -ForegroundColor DarkGray
    }

    if ($Apply) {
        foreach ($o in (Get-OrphanLocks)) {
            $rec = try { Get-RunRecord $o.runId } catch { $null }
            if ($rec -and $rec.status -eq 'RUNNING') { $rec.status = 'RECOVERABLE'; Save-RunRecord $rec }
            Remove-Item -LiteralPath $o.path -Force
            Write-OrchLog "recover: cleared orphan lock $($o.runId)"
        }
        foreach ($wt in (Get-OrchWorktrees)) {
            $runId = Split-Path -Leaf $wt.path
            $rec = $runById[$runId]
            $dirty = @(Get-GitStatusPorcelain $wt.path)
            if (-not $rec -and $dirty.Count -eq 0) {
                $hasCommits = ((& git -C $script:RepoRoot rev-list --count "HEAD..$($wt.branch)" 2>$null) -as [int]) -gt 0
                if (-not $hasCommits) {
                    & git -C $script:RepoRoot worktree remove $wt.path 2>$null | Out-Null
                    Write-OrchLog "recover: removed empty stale worktree $runId"
                }
            }
        }
        & git -C $script:RepoRoot worktree prune | Out-Null
        Write-Host "`n  applied: cleared safe orphans + pruned empty worktrees. Dirty work untouched." -ForegroundColor Green
    } else {
        Write-Host "`n  (read-only. re-run with -Apply to clear provably-safe orphans.)" -ForegroundColor DarkGray
    }

    Write-JsonFile -Path (Join-Path $script:OrchDir 'recover-report.json') -Object ([ordered]@{
        at = (Get-Date).ToString('o'); applied = [bool]$Apply; items = @($findings)
    })
}

# ======================================================================
# K - status
# ======================================================================

function Get-ProviderState {
    param([string]$Name)
    $bin = $cfg.providers.$Name.bin
    if (Get-Command $bin -ErrorAction SilentlyContinue) { return 'AVAILABLE' }
    return 'MISSING'
}

function Show-Status {
    Write-Host ""
    Write-Host "Orcivo orchestration" -ForegroundColor Cyan
    Write-Host ""

    try {
        $idx = Get-ExecutionIndex
        $stale = ([datetime]::UtcNow - [datetime]$idx.generatedAt).TotalMinutes
        Write-Host ("index: {0} tasks, reconciled={1}{2}, generated {3:N0}m ago" -f $idx.tasks.Count, $idx.reconciled, $(if ($idx.errors.Count) { " ($($idx.errors.Count) errors)" } else { '' }), $stale)
        if (-not $idx.reconciled) { foreach ($e in $idx.errors) { Write-Host "  ERROR  $e" -ForegroundColor Red } }
        Write-Host ""
        $show = @($idx.tasks | Where-Object { $_.status -ne 'DONE' -and $_.status -ne 'SKIPPED' } | Select-Object -First 25)
        foreach ($t in $show) {
            $col = switch -Regex ($t.status) { 'WAITING_HUMAN' { 'Yellow' } 'NEEDS_RECONCILE' { 'Red' } 'READY|PENDING' { 'Gray' } default { 'White' } }
            $dep = if ((ConvertTo-List $t.dependencies).Count -or (ConvertTo-List $t.planDependencies).Count) { " <- " + (@(@(ConvertTo-List $t.dependencies) + @(ConvertTo-List $t.planDependencies)) -join ',') } else { '' }
            Write-Host ("  {0,-24} {1,-16} {2}{3}" -f $t.task_id, $t.status, $t.risk, $dep) -ForegroundColor $col
        }
        if (@($idx.tasks).Count -gt $show.Count + @($idx.tasks | Where-Object { $_.status -in @('DONE','SKIPPED') }).Count) { Write-Host "  ..." -ForegroundColor DarkGray }
    } catch { Write-Host "index: not built - run: supervisor.ps1 index" -ForegroundColor DarkGray }

    $q = @(Get-QueueTasks)
    if ($q.Count) {
        Write-Host "`nmanual queue:" -ForegroundColor Cyan
        foreach ($t in ($q | Sort-Object { $_.taskId })) { Write-Host ("  {0,-24} {1}" -f $t.taskId, $t.status) }
    }

    Write-Host "`nWorkers:" -ForegroundColor Cyan
    $runs = @(Get-AllRunRecords | Where-Object { $_.status -in @('RUNNING','RECOVERABLE','NEEDS_REVIEW','BLOCKED_PROVIDER') })
    if (-not $runs.Count) { Write-Host "  none" } else {
        foreach ($r in $runs) {
            $alive = if ($r.status -eq 'RUNNING') { if (Test-PidAlive ([int]$r.pid)) { 'alive' } else { 'DEAD - run recover' } } else { '' }
            Write-Host ("  {0,-40} {1,-16} {2} {3}" -f $r.runId, $r.status, $r.provider, $alive)
        }
    }

    Write-Host "`nProviders:" -ForegroundColor Cyan
    Write-Host ("  Claude {0}" -f (Get-ProviderState 'claude'))
    Write-Host ("  Codex  {0}" -f (Get-ProviderState 'codex'))

    $up = Get-GitUpstreamStatus
    Write-Host "`n$($cfg.merge.target):" -ForegroundColor Cyan
    Write-Host ("  HEAD {0}" -f (Get-GitHeadShort))
    Write-Host ("  {0}" -f $(if (Test-GitClean) { 'clean' } else { 'DIRTY' }))
    Write-Host ("  origin sync: {0}" -f $(if ($up.upstream) { "ahead $($up.ahead) / behind $($up.behind) ($($up.upstream))" } else { 'no upstream' }))
    if (Get-OrphanLocks) { Write-Host "`n  ! orphan locks present - run: supervisor.ps1 recover" -ForegroundColor Yellow }
    Write-Host ""
}

# ======================================================================
# cleanup
# ======================================================================

function Invoke-Cleanup {
    param([string]$TaskId)
    $rec = $null
    if ($TaskId) {
        $spec = Get-TaskById $TaskId
        if ($spec -and $spec.runId) { $rec = Get-RunRecord $spec.runId }
    }
    if (-not $rec -and $TaskId) {
        $rec = Get-AllRunRecords | Where-Object { $_.taskId -eq $TaskId } | Sort-Object createdAt | Select-Object -Last 1
    }
    if (-not $rec) { Write-OrchLog "cleanup: no run for '$TaskId'"; return }

    # never remove a worktree with uncommitted work
    if ((Test-Path $rec.worktreePath) -and -not (Test-GitClean $rec.worktreePath)) {
        Write-OrchLog "cleanup: $($rec.runId) worktree has uncommitted changes - refusing. Commit or review first." 'WARN'; return
    }
    # never drop the branch unless the work is merged (recoverable)
    $merged = (& git -C $script:RepoRoot branch --merged $cfg.merge.target 2>$null | ForEach-Object { $_.Trim().TrimStart('* ').Trim() }) -contains $rec.branch
    if (Test-Path $rec.worktreePath) {
        & git -C $script:RepoRoot worktree remove $rec.worktreePath 2>$null | Out-Null
        Write-OrchLog "cleanup: removed worktree $($rec.worktreePath) (branch $($rec.branch) kept, merged=$merged)"
    }
    Exit-WorktreeLock -RunId $rec.runId
    $rec.status = if ($rec.status -eq 'MERGED') { 'ARCHIVED' } else { $rec.status }
    Save-RunRecord $rec
}

# ======================================================================
# dispatch
# ======================================================================

switch ($Command) {
    'index'  {
        $idx = Update-ExecutionIndex
        Write-Host ("`nindex: {0} plans, {1} tasks, reconciled={2}" -f $idx.plans.Count, $idx.tasks.Count, $idx.reconciled) -ForegroundColor $(if ($idx.reconciled) { 'Green' } else { 'Red' })
        foreach ($e in $idx.errors)   { Write-Host "  ERROR   $e" -ForegroundColor Red }
        foreach ($w in $idx.warnings) { Write-Host "  warn    $w" -ForegroundColor Yellow }
        if (-not $idx.reconciled) { Write-Host "`nnot reconciled - the loop will refuse to run. Fix .planning and re-run 'index'." -ForegroundColor Red }
    }
    'status'  { Show-Status }
    'next'    {
        $n = Get-NextReadyTask
        if ($n) { Write-Host "next: $($n.taskId)  (profile $($n.checkProfile), risk $($n.risk))" }
        else {
            $g = @(Get-GatedTasks)
            if ($g.Count) { Write-Host "no auto-runnable task. $($g.Count) waiting on a human gate:"; $g | ForEach-Object { Show-HumanGate $_ } }
            else { Write-Host "no READY task (all blocked / waiting human / done)" }
        }
    }
    'run'     {
        if (-not $Task) { $t = Get-NextReadyTask; if (-not $t) { Write-Host 'nothing READY'; break }; $Task = $t.taskId }
        Invoke-Pipeline -TaskId $Task
    }
    'loop'    { Invoke-Loop }
    'recover' { Invoke-Recover }
    'cleanup' { if (-not $Task) { throw '-Task required' }; Invoke-Cleanup -TaskId $Task }
}
