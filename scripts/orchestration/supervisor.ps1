<#
supervisor.ps1 - the smallest Orcivo-specific orchestration loop.

  .planning        = source of truth (phases, requirements, gates, decisions)
  git              = canonical implementation state
  git worktrees    = task isolation
  claude (headless)= primary executor        codex exec = fallback / reviewer
  ai-memory        = auxiliary context only

Capabilities (and nothing more):
  index   : (re)build .orchestration/execution-index.json from .planning  [reconcilable]
  status  : show queue + runs + index
  next    : print the next READY task (respects deps + Level-C gates)
  run     : create worktree+branch, run primary headless, verify, checkpoint,
            fall back to codex on PROVIDER_* only, retry recoverable, stop unsafe.
            POC MODE: never merges to main. Leaves a validated branch for review.
  cleanup : archive a run (remove worktree, keep branch + logs + checkpoints)

Usage:
  powershell -File scripts\orchestration\supervisor.ps1 <command> [-Task <id>] [-Provider claude|codex] [-DryRun]
#>
param(
    [Parameter(Position = 0)] [ValidateSet('index','status','next','run','cleanup')] [string]$Command = 'status',
    [string]$Task,
    [ValidateSet('claude','codex')] [string]$Provider = 'claude',
    [int]$MaxRetries = 1,
    [switch]$DryRun
)

. (Join-Path $PSScriptRoot 'lib.ps1')
$cfg = Get-OrchConfig

$QueueDir = Join-Path $script:OrchDir 'queue'
$IndexPath = Join-Path $script:OrchDir 'execution-index.json'

# --- Level C detection --------------------------------------------------

function Test-LevelCGate {
    param($TaskSpec)
    if ($TaskSpec.level -eq 'C' -or $TaskSpec.humanGate) { return $true }
    $hay = (@($TaskSpec.title, $TaskSpec.notes, $TaskSpec.objective, ((ConvertTo-List $TaskSpec.scope) -join ' ')) -join ' ').ToLowerInvariant()
    foreach ($trig in $cfg.levelCGuards.triggers) {
        if ($hay -match [regex]::Escape($trig.ToLowerInvariant())) { return $true }
    }
    return $false
}

# --- execution index (reconcilable, rebuilt from .planning) -----------

function Update-ExecutionIndex {
    $entries = @()
    $planFiles = Get-ChildItem (Join-Path $script:RepoRoot '.planning\phases') -Recurse -Filter '*-PLAN.md' -ErrorAction SilentlyContinue
    foreach ($f in $planFiles) {
        $text = Get-Content -Raw -LiteralPath $f.FullName
        $fm = @{}
        if ($text -match '(?s)^---\s*(.*?)\s*---') {
            foreach ($line in ($matches[1] -split "`n")) {
                if ($line -match '^\s*([a-zA-Z_]+)\s*:\s*(.+?)\s*$') { $fm[$matches[1]] = $matches[2].Trim() }
            }
        }
        $phase = if ($fm.phase) { $fm.phase.Trim('"') } else { '' }
        $plan  = if ($fm.plan)  { $fm.plan.Trim('"') }  else { $f.BaseName }
        $deps = @()
        if ($fm.depends_on -and $fm.depends_on -match '\[(.*)\]') {
            $deps = ($matches[1] -split ',') | ForEach-Object { $_.Trim().Trim('"').Trim("'") } | Where-Object { $_ }
        }
        $risk = switch -Regex ($fm.primary_classification) {
            'HUMAN|MANUAL' { 'C'; break }
            'SAFE_AUTO'    { 'B'; break }
            default        { 'B' }
        }
        $entries += [ordered]@{
            task_id      = "$phase-$plan"
            source       = (Resolve-Path $f.FullName -Relative)
            phase        = $phase
            dependencies = $deps
            risk         = $risk
            status       = 'NEEDS_RECONCILE'
            note         = 'generated from .planning frontmatter; confirm status before run'
        }
    }
    $out = [ordered]@{
        schema    = 'orcivo.orchestration.execution-index/v1'
        generatedAt = (Get-Date).ToString('o')
        planningHead = (Get-GitHead)
        rule      = '.planning is authoritative. This index is a pointer list, rebuilt on demand. status must be reconciled against STATE.md / SUMMARY files before any run.'
        tasks     = $entries
    }
    Write-JsonFile -Path $IndexPath -Object $out
    Write-OrchLog "index: wrote $($entries.Count) task pointers -> $IndexPath"
}

# --- queue / task selection -----------------------------------------

function Get-QueueTasks {
    if (-not (Test-Path $QueueDir)) { return @() }
    Get-ChildItem $QueueDir -Filter '*.json' | ForEach-Object { Read-JsonFile $_.FullName }
}

function Get-TaskById {
    param([string]$Id)
    Get-QueueTasks | Where-Object { $_.taskId -eq $Id } | Select-Object -First 1
}

function Test-DepsSatisfied {
    param($TaskSpec)
    foreach ($d in (ConvertTo-List $TaskSpec.dependencies)) {
        if (-not $d) { continue }
        $dep = Get-TaskById $d
        if (-not $dep -or $dep.status -ne 'DONE') { return $false }
    }
    return $true
}

function Test-ScopeConflict {
    param($TaskSpec, $ActiveSpecs)
    $mine = ConvertTo-List $TaskSpec.scope
    foreach ($a in $ActiveSpecs) {
        $theirs = ConvertTo-List $a.scope
        $shared = @($mine | Where-Object { $theirs -contains $_ })
        if ($shared.Count -gt 0) { return $true }
    }
    return $false
}

function Get-NextReadyTask {
    $active = @(Get-QueueTasks | Where-Object { $_.status -eq 'RUNNING' })
    foreach ($t in (Get-QueueTasks | Where-Object { $_.status -eq 'READY' } | Sort-Object { $_.priority }, { $_.taskId })) {
        if (Test-LevelCGate $t) {
            $t.status = 'WAITING_HUMAN'; Save-TaskSpec $t
            Write-OrchLog "next: $($t.taskId) is Level C -> WAITING_HUMAN (paused, not failed)" 'WARN'
            continue
        }
        if (-not (Test-DepsSatisfied $t)) { continue }
        if ($cfg.scheduler.serializeOnScopeUncertainty -and (Test-ScopeConflict $t $active)) {
            Write-OrchLog "next: $($t.taskId) deferred - scope conflict with an active run"
            continue
        }
        return $t
    }
    return $null
}

function Save-TaskSpec {
    param($TaskSpec)
    Write-JsonFile -Path (Join-Path $QueueDir ("{0}.json" -f $TaskSpec.taskId)) -Object $TaskSpec
}

# --- context assembly (from .planning) -----------------------------

function Build-TaskPrompt {
    param($TaskSpec, [string]$RunId, [string]$Worktree, [string]$ForProvider)
    $ctx = @()
    $ctx += "# Orchestrated task: $($TaskSpec.taskId)"
    $ctx += ""
    $ctx += "You are running headless inside an ISOLATED git worktree: $Worktree"
    $ctx += "Branch: $($TaskSpec.branch). Base: $($TaskSpec.baseSha)."
    $ctx += ""
    $ctx += "## Hard rules (non-negotiable)"
    $ctx += "- Edit files ONLY inside this worktree. Do NOT run git. Do NOT push. The supervisor commits."
    $ctx += "- Do NOT touch: production, DNS, secrets/.env, persistent DB, billing/provider credentials."
    $ctx += "- Do NOT exceed Level A/B autonomy. If the task needs a Level C decision, STOP and say 'HUMAN_GATE: <why>'."
    $ctx += "- .planning is the source of truth. Do not restate or rewrite the roadmap."
    $ctx += ""
    if ($TaskSpec.source -and (Test-Path (Join-Path $script:RepoRoot $TaskSpec.source))) {
        $ctx += "## Task source (.planning excerpt)"
        $ctx += (Get-Content -Raw -LiteralPath (Join-Path $script:RepoRoot $TaskSpec.source))
        $ctx += ""
    }
    $ctx += "## Objective"
    $ctx += $TaskSpec.objective
    if ($TaskSpec.continueFromCheckpoint) {
        $ctx += ""
        $ctx += "## CONTINUATION - THIS OVERRIDES THE OBJECTIVE ABOVE"
        $ctx += "The previous agent ($($TaskSpec.previousProvider)) was cut off mid-task by a provider failure."
        $ctx += "Its partial work is ALREADY in this worktree, on disk, right now."
        $ctx += "Your job: (1) inspect the current state of the files in this worktree,"
        $ctx += "(2) work out what the Objective still needs, (3) COMPLETE the whole Objective."
        $ctx += "Do NOT recreate or rewrite parts that are already done."
        $ctx += "Any 'do only part N in this pass' / staging wording in the Objective was for the FIRST pass only -"
        $ctx += "it no longer applies. Deliver the FINISHED result now."
        $ctx += ""
        $ctx += "Checkpoint from the interrupted run (informational):"
        $ctx += (Get-Content -Raw -LiteralPath $TaskSpec.continueFromCheckpoint | Protect-Secrets)
    }
    $promptFile = Join-Path (Get-RunDir $RunId) ("prompt.{0}.txt" -f $ForProvider)
    Write-RedactedFile -Path $promptFile -Content ($ctx -join "`n")
    return $promptFile
}

# --- run lifecycle -------------------------------------------------

function New-Run {
    param($TaskSpec)
    $runId = "{0}-{1}" -f $TaskSpec.taskId, (Get-Date -Format 'yyyyMMddHHmmss')
    $base  = (Get-GitHead)
    $branch = "{0}{1}" -f $cfg.scheduler.branchPrefix, $runId
    $wt = Join-Path $script:OrchDir ("worktrees\{0}" -f $runId)

    if ($DryRun) { Write-OrchLog "[dry-run] would: git worktree add $wt -b $branch $base"; return $null }

    & git -C $script:RepoRoot worktree add -b $branch $wt $base | Out-Null
    Write-OrchLog "run: worktree $wt on $branch @ $base"

    $rec = [ordered]@{
        runId = $runId; taskId = $TaskSpec.taskId; taskSource = $TaskSpec.source
        provider = $cfg.providers.primary; branch = $branch; worktreePath = $wt
        baseSha = $base; checkProfile = $TaskSpec.checkProfile
        status = 'RUNNING'; createdAt = (Get-Date).ToString('o')
        commandsRun = @("git worktree add -b $branch"); checksRun = @()
        attempts = 0
    }
    Save-RunRecord $rec

    $TaskSpec.status = 'RUNNING'; $TaskSpec.runId = $runId; $TaskSpec.branch = $branch
    $TaskSpec.baseSha = $base
    Save-TaskSpec $TaskSpec
    return $rec
}

function Invoke-AgentAttempt {
    param($TaskSpec, $Rec, [string]$UseProvider)
    $prompt = Build-TaskPrompt -TaskSpec $TaskSpec -RunId $Rec.runId -Worktree $Rec.worktreePath -ForProvider $UseProvider
    $resultPath = & (Join-Path $PSScriptRoot 'run-agent.ps1') -RunId $Rec.runId -Provider $UseProvider -PromptFile $prompt
    $resultPath = ($resultPath | Select-Object -Last 1)
    return (Read-JsonFile $resultPath)
}

function Complete-Run {
    param($TaskSpec, $Rec, $Verdict)
    $wt = $Rec.worktreePath
    & git -C $wt add -A | Out-Null
    $dirty = @(Get-GitStatusPorcelain $wt)
    if ($dirty.Count -gt 0) {
        & git -C $wt -c user.name='orchestrator' -c user.email='orchestrator@local' commit -m "$($TaskSpec.taskId): orchestrated change (branch review only)" | Out-Null
        $Rec.commandsRun += "git commit (branch $($Rec.branch))"
    }
    $Rec.headAfter = (Get-GitHead $wt)
    $Rec.status = if ($Verdict.verdict -eq 'PASS') { 'VALIDATED_AWAITING_REVIEW' } else { 'CHECK_FAILED' }
    $Rec.verdict = $Verdict.verdict
    Save-RunRecord $Rec
    $TaskSpec.status = if ($Verdict.verdict -eq 'PASS') { 'DONE' } else { 'NEEDS_RECOVERY' }
    Save-TaskSpec $TaskSpec
    Write-OrchLog "run: $($Rec.runId) -> $($Rec.status) (verdict $($Verdict.verdict)). POC MODE: NOT merged to main."
}

function Invoke-Run {
    param([string]$TaskId)
    $spec = Get-TaskById $TaskId
    if (-not $spec) { throw "no queued task '$TaskId'" }
    if (Test-LevelCGate $spec) {
        $spec.status = 'WAITING_HUMAN'; Save-TaskSpec $spec
        Write-OrchLog "run: $TaskId is Level C -> WAITING_HUMAN. Not a failure. Human must clear the gate." 'WARN'
        return
    }
    if (-not (Test-DepsSatisfied $spec)) { throw "deps not satisfied for $TaskId" }

    $rec = New-Run $spec
    if (-not $rec) { return }

    $provider = if ($spec.primaryProvider) { $spec.primaryProvider } else { $cfg.providers.primary }
    $rec.provider = $provider; Save-RunRecord $rec
    $attempt = 0
    while ($true) {
        $attempt++
        $rec.attempts = $attempt
        Save-RunRecord $rec
        Write-OrchLog "run: $($rec.runId) attempt $attempt provider=$provider"
        $ar = Invoke-AgentAttempt -TaskSpec $spec -Rec $rec -UseProvider $provider

        if ($ar.failureClass -eq 'OK') {
            $vp = & (Join-Path $PSScriptRoot 'verify.ps1') -RunId $rec.runId
            $verdict = Read-JsonFile ($vp | Select-Object -Last 1)
            $rec.checksRun += $verdict.profile
            if ($verdict.verdict -eq 'PASS') { Complete-Run $spec $rec $verdict; return }
            # verifier FAIL - recover, never fail over
            & (Join-Path $PSScriptRoot 'checkpoint.ps1') -RunId $rec.runId -Reason 'verify-failed' -FailureClass 'CHECK_FAILURE' -NextAction 'retry same provider with check output, then human review' | Out-Null
            if ($attempt -le $MaxRetries) { Write-OrchLog "run: verify FAIL -> retry ($provider)" 'WARN'; continue }
            Complete-Run $spec $rec $verdict
            Write-OrchLog "run: $($rec.runId) STOPPED - checks still failing after $attempt attempts. Human review required." 'ERROR'
            return
        }

        # agent invocation failed. classify.
        $cpPath = & (Join-Path $PSScriptRoot 'checkpoint.ps1') -RunId $rec.runId -Reason 'agent-failed' -FailureClass $ar.failureClass -NextAction 'see failoverPlan' | Select-Object -Last 1

        if ($ar.isProviderFail) {
            if ($provider -eq $cfg.providers.fallback) {
                Write-OrchLog "run: fallback provider ALSO hit $($ar.failureClass). Pausing run for human." 'ERROR'
                $rec.status = 'BLOCKED_PROVIDER'; Save-RunRecord $rec
                $spec.status = 'BLOCKED_PROVIDER'; Save-TaskSpec $spec
                return
            }
            Write-OrchLog "run: PROVIDER failure ($($ar.failureClass)) on $provider -> checkpoint + fail over to $($cfg.providers.fallback), SAME worktree" 'WARN'
            $spec.continueFromCheckpoint = $cpPath
            $spec.previousProvider = $provider
            Save-TaskSpec $spec
            $provider = $cfg.providers.fallback
            $rec.provider = $provider
            Save-RunRecord $rec
            continue
        }

        # non-provider agent error - retry once then stop, do NOT fail over
        if ($attempt -le $MaxRetries) { Write-OrchLog "run: agent error ($($ar.failureClass)) -> retry same provider" 'WARN'; continue }
        Write-OrchLog "run: $($rec.runId) STOPPED - agent error $($ar.failureClass), not a provider failure. Human review." 'ERROR'
        $rec.status = 'AGENT_ERROR'; Save-RunRecord $rec
        $spec.status = 'NEEDS_RECOVERY'; Save-TaskSpec $spec
        return
    }
}

function Invoke-Cleanup {
    param([string]$TaskId)
    $spec = Get-TaskById $TaskId
    $runId = $spec.runId
    if (-not $runId) { Write-OrchLog "cleanup: $TaskId has no run"; return }
    $rec = Get-RunRecord $runId
    if (Test-Path $rec.worktreePath) {
        & git -C $script:RepoRoot worktree remove --force $rec.worktreePath | Out-Null
        Write-OrchLog "cleanup: removed worktree $($rec.worktreePath) (branch $($rec.branch) kept)"
    }
    Exit-WorktreeLock -RunId $runId
    $rec.status = 'ARCHIVED'; Save-RunRecord $rec
    $spec.status = 'ARCHIVED'; Save-TaskSpec $spec
}

function Show-Status {
    Write-Host "`n== execution index ==" -ForegroundColor Cyan
    if (Test-Path $IndexPath) {
        $idx = Read-JsonFile $IndexPath
        Write-Host ("  {0} task pointers, generated {1}" -f $idx.tasks.Count, $idx.generatedAt)
    } else { Write-Host "  (not built - run: supervisor.ps1 index)" }

    Write-Host "`n== queue ==" -ForegroundColor Cyan
    $q = Get-QueueTasks
    if (-not $q) { Write-Host "  (empty)" }
    foreach ($t in ($q | Sort-Object { $_.taskId })) {
        Write-Host ("  {0,-28} {1,-24} deps=[{2}] profile={3}" -f $t.taskId, $t.status, ((ConvertTo-List $t.dependencies) -join ","), $t.checkProfile)
    }

    Write-Host "`n== runs ==" -ForegroundColor Cyan
    $runsDir = Join-Path $script:OrchDir 'runs'
    if (Test-Path $runsDir) {
        Get-ChildItem $runsDir -Directory | Sort-Object Name | ForEach-Object {
            $r = Get-RunRecord $_.Name
            $locked = if (Test-WorktreeLock $_.Name) { 'LOCKED' } else { '' }
            Write-Host ("  {0,-40} {1,-26} {2,-10} attempts={3} {4}" -f $r.runId, $r.status, $r.provider, $r.attempts, $locked)
        }
    }
    Write-Host ("`nmain HEAD: {0}" -f (Get-GitHead)) -ForegroundColor DarkGray
}

# --- dispatch ----------------------------------------------------

switch ($Command) {
    'index'   { Update-ExecutionIndex }
    'status'  { Show-Status }
    'next'    {
        $n = Get-NextReadyTask
        if ($n) { Write-Host "next READY: $($n.taskId)  (profile $($n.checkProfile), deps [$((ConvertTo-List $n.dependencies) -join ",")])" }
        else    { Write-Host "no READY task (all blocked / waiting human / done)" }
    }
    'run'     {
        if (-not $Task) { $t = Get-NextReadyTask; if (-not $t) { Write-Host 'nothing READY'; break }; $Task = $t.taskId }
        Invoke-Run -TaskId $Task
    }
    'cleanup' { if (-not $Task) { throw '-Task required' }; Invoke-Cleanup -TaskId $Task }
}
