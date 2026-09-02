<#
reconcile.ps1 - rebuild .orchestration/execution-index.json from .planning, at TASK
granularity, and validate it.

.planning is authoritative. This index is a derived pointer list - it is fully
reconstructable by re-running this script. It never copies requirement prose; it
copies task ids, dependencies, status (reconciled against SUMMARY files), risk,
human gates, verification requirements and best-effort scopes.

If anything is ambiguous the task is marked NEEDS_RECONCILE and the whole index
is reconciled=false. The scheduler refuses to run against a non-reconciled index.

Usage:
  . reconcile.ps1 ; Update-ExecutionIndex        # build + write
  Get-ExecutionIndex                             # read (throws if missing)
#>

. (Join-Path $PSScriptRoot 'lib.ps1')

$script:IndexPath = Join-Path $script:OrchDir 'execution-index.json'

function Get-Frontmatter {
    param([string]$Text)
    $fm = @{}
    if ($Text -match '(?s)^\s*---\s*(.*?)\s*---') {
        foreach ($line in ($matches[1] -split "`n")) {
            if ($line -match '^\s*([a-zA-Z_][\w]*)\s*:\s*(.+?)\s*$') { $fm[$matches[1]] = $matches[2].Trim().Trim('"') }
        }
    }
    return $fm
}

function ConvertTo-IdList {
    param([string]$Raw)
    if (-not $Raw) { return @() }
    if ($Raw -match '\[(.*)\]') { $Raw = $matches[1] }
    return @($Raw -split ',' | ForEach-Object { $_.Trim().Trim('"').Trim("'") } | Where-Object { $_ })
}

function Get-PhaseFromPath {
    param([string]$Path)
    if ($Path -match '[\\/]phases[\\/]([\d.]+)[-\\/]') { return $matches[1] }
    return ''
}

# "03.1" -> 3.1 ; "2A" -> 2 ; "01-vertical-slice" -> 1  (for ordering / scoping)
function Get-PhaseNum {
    param([string]$Phase)
    if ($Phase -match '^\s*([\d]+(?:\.[\d]+)?)') { return [double]$matches[1] }
    return 0.0
}

# normalise any phase label to its numeric-ish prefix: "01-vertical-slice" -> "01", "2A" -> "2A"
function Get-PhaseKey {
    param([string]$Phase)
    if ($Phase -match '^\s*([\d.]+[A-Za-z]?)') { return $matches[1] }
    return $Phase
}

# last P-number token of a plan label: "02-P02" -> "P02", "07" -> "P07", "P11" -> "P11"
function Get-PlanKey {
    param([string]$Plan)
    if ($Plan -match '[Pp]?(\d+)\s*$') { return ('P{0:D2}' -f [int]$matches[1]) }
    return $Plan
}

# best-effort scope extraction from the "Arquivos" section of a plan
function Get-PlanScopes {
    param([string]$Text)
    $scopes = @()
    if ($Text -match '(?ms)^##\s+Arquivos[^\n]*\n(.*?)(?:\n##\s|\Z)') {
        foreach ($line in ($matches[1] -split "`n")) {
            foreach ($m in [regex]::Matches($line, '`([^`]+)`')) {
                $tok = $m.Groups[1].Value.Trim()
                if ($tok -match '[\\/]' -or $tok -match '\.(ts|tsx|prisma|json|md)$' -or $tok -match '(Module|Guard|Service|Controller)$') {
                    $scopes += ($tok -replace '\\', '/')
                }
            }
        }
    }
    return @($scopes | Select-Object -Unique)
}

function Get-SummaryTaskState {
    param([string]$PlanFile)
    # <dir>/<phase>-<plan>-SUMMARY.md
    $dir = Split-Path -Parent $PlanFile
    $base = (Split-Path -Leaf $PlanFile) -replace '-PLAN\.md$', '-SUMMARY.md'
    $sum = Join-Path $dir $base
    $res = @{ found = $false; tasks = @{}; humanPending = @(); frontmatterStatus = ''; referencedTasks = @() }
    if (-not (Test-Path $sum)) { return $res }
    $text = Get-Content -Raw -LiteralPath $sum
    $fm = Get-Frontmatter $text
    $res.found = $true
    $res.frontmatterStatus = $fm.status
    if ($fm.human_pending) { $res.humanPending = ConvertTo-IdList $fm.human_pending }
    # summary tables vary: `| T01 | <status> | <note> |` or `| T01 | <class> | <status> | <note> |`.
    # find the status cell by vocabulary; the note is the longest remaining cell.
    $statusRx = '^\s*(PASS|DONE|OK|✅|\[x\]|\bx\b|PENDING|TODO|N/A|—|-|HUMAN_APPROVAL|MANUAL_UAT|HUMAN|DEFERRED|SKIPPED|BLOCKED|WAITING[_ ]?HUMAN|IN[_ ]?PROGRESS|WIP|aguardando|conclu)'
    foreach ($line in ($text -split "`n")) {
        if ($line -notmatch '^\|\s*(T\d+)\s*\|') { continue }
        $tid = ($line -replace '^\|\s*(T\d+)\s*\|.*', '$1').ToUpperInvariant()
        $cells = @(($line.Trim().Trim('|') -split '\|') | ForEach-Object { $_.Trim() })
        $cells = @($cells | Select-Object -Skip 1)   # drop the T-id cell
        $marker = ''
        foreach ($c in $cells) { if ($c -match $statusRx) { $marker = $c; break } }
        if (-not $marker -and $cells.Count -ge 1) { $marker = $cells[0] }
        $note = ($cells | Where-Object { $_ -ne $marker } | Sort-Object { $_.Length } | Select-Object -Last 1)
        $res.referencedTasks += $tid
        $res.tasks[$tid] = @{ marker = $marker; note = "$note" }
    }
    return $res
}

function Resolve-TaskStatus {
    param($Class, $SummaryState, [string]$Tnum, [bool]$SecurityCritical, [string]$PlanFrontStatus)
    $cfg = Get-OrchConfig
    if ($Class -eq 'DEFERRED') { return @{ status = 'SKIPPED'; evidence = 'class DEFERRED'; note = '' } }

    if (-not $SummaryState.found) {
        if ($PlanFrontStatus -match '(?i)complete|done|passed|verified') { return @{ status = 'DONE'; evidence = 'plan frontmatter status'; note = '' } }
        return @{ status = 'PENDING'; evidence = 'no SUMMARY'; note = '' }
    }

    $row = $SummaryState.tasks[$Tnum]
    if (-not $row) {
        # task in plan but not in summary table -> pending unless summary frontmatter says complete
        if ($SummaryState.frontmatterStatus -match '(?i)complete|passed') { return @{ status = 'DONE'; evidence = 'summary frontmatter (row missing)'; note = 'row not in summary table' } }
        return @{ status = 'PENDING'; evidence = 'not in summary table'; note = '' }
    }

    $marker = $row.marker.ToLowerInvariant()
    $isHuman = $false
    foreach ($h in (ConvertTo-List $cfg.reconcile.humanMarkers)) { if ($marker -match [regex]::Escape($h.ToLowerInvariant())) { $isHuman = $true } }
    if ($isHuman -or $Class -in @('HUMAN_APPROVAL', 'MANUAL_UAT', 'HUMAN')) {
        return @{ status = 'WAITING_HUMAN'; evidence = "summary marker '$($row.marker)'"; note = $row.note }
    }

    $isDone = $false
    foreach ($d in (ConvertTo-List $cfg.reconcile.doneMarkers)) { if ($marker -match [regex]::Escape($d.ToLowerInvariant())) { $isDone = $true } }
    if (-not $isDone) { return @{ status = 'PENDING'; evidence = "summary marker '$($row.marker)'"; note = $row.note } }

    # DONE - want some evidence in the note; a truly empty note is the only hard block
    $hasEvidence = ($row.note -match '`[^`]+`') -or ($row.note -match '\b[0-9a-f]{7,40}\b') -or ($row.note -match '(?i)test|spec|migration|adr|matrix|verific|drift|constraint|guard')
    if (-not $hasEvidence -and $row.note.Trim().Length -lt 15) {
        return @{ status = 'NEEDS_RECONCILE'; evidence = "done marker but summary note carries no file/commit/test evidence"; note = $row.note }
    }
    $ev = "summary marker '$($row.marker)'"
    if ($SecurityCritical -and $row.note -notmatch '(?i)test|spec|isolation|verific') {
        $ev += " (security-critical: confirm test evidence)"
    }
    return @{ status = 'DONE'; evidence = $ev; note = $row.note }
}

function Get-ActivePhaseFromState {
    $state = Join-Path $script:RepoRoot '.planning\STATE.md'
    if (-not (Test-Path $state)) { return '' }
    $text = Get-Content -Raw -LiteralPath $state
    if ($text -match '(?im)Fase ativa:\**\s*([\d.]+)') { return $matches[1] }
    return ''
}

function Test-ExternalGate {
    param([string]$Dep)
    return ($Dep -match '(?i)^(GATE|UAT|H-DB|H-)[- ]?|gate\s*r')
}

function Build-ExecutionIndex {
    param([string]$ScopeFrom = '')
    $cfg = Get-OrchConfig
    $phasesRoot = Join-Path $script:RepoRoot '.planning\phases'
    $planFiles = @(Get-ChildItem $phasesRoot -Recurse -Filter '*-PLAN.md' -ErrorAction SilentlyContinue | Sort-Object FullName)

    $activePhase = Get-ActivePhaseFromState
    if (-not $ScopeFrom) { $ScopeFrom = $activePhase }
    $floor = if ($ScopeFrom) { Get-PhaseNum $ScopeFrom } else { -1.0 }

    $errors = @(); $warnings = @(); $externalGates = @()
    $plans = @(); $tasks = @()
    $planIds = @{}
    $planDepGraph = @{}

    foreach ($f in $planFiles) {
        $text = Get-Content -Raw -LiteralPath $f.FullName
        $fm = Get-Frontmatter $text
        $phaseRaw = if ($fm.phase) { $fm.phase } else { Get-PhaseFromPath $f.FullName }
        $phaseKey = Get-PhaseKey $phaseRaw
        $phaseNum = Get-PhaseNum $phaseRaw
        $planRaw = if ($fm.plan) { $fm.plan } else { ($f.BaseName -replace '-PLAN$', '') }
        $planId = "$phaseKey-$(Get-PlanKey $planRaw)"
        $inScope = ($phaseNum -ge $floor)
        $wave = if ($fm.wave) { $fm.wave } else { '' }
        $secCrit = ($fm.security_critical -match '(?i)true|yes')
        $rel = (Resolve-Path $f.FullName -Relative) -replace '\\', '/'

        $planDeps = @(); $planGateDeps = @()
        foreach ($d in (ConvertTo-IdList $fm.depends_on)) {
            if (Test-ExternalGate $d) { $planGateDeps += $d; $externalGates += "$planId -> $d"; continue }
            $planDeps += "$phaseKey-$(Get-PlanKey $d)"
        }
        $planIds[$planId] = $phaseNum
        $planDepGraph[$planId] = $planDeps

        $sumState = Get-SummaryTaskState $f.FullName
        $scopes = Get-PlanScopes $text
        $hasAutoTests = ($text -match '(?ms)^##\s+Testes autom\S{0,2}ticos\s*\r?\n\s*\S')
        $hasHumanTests = ($text -match '(?ms)^##\s+Testes humanos\s*\r?\n\s*\S')
        $vProfile = if ($secCrit) { 'security' } else { 'B' }

        $planTaskNums = @()
        foreach ($line in ($text -split "`n")) {
            if ($line -match '^\|\s*(?:[A-Za-z0-9.]+-)?(T\d+)\s*\|\s*([A-Za-z_]+)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|') {
                $tnum = $matches[1].ToUpperInvariant()
                $class = $matches[2].ToUpperInvariant()
                $desc = $matches[3].Trim(); $deliverable = $matches[4].Trim()
                if ($class -eq 'CLASSE' -or $tnum -eq 'T00') { continue }
                if ($planTaskNums -contains $tnum) { continue }
                $planTaskNums += $tnum

                $risk = $cfg.reconcile.classToRisk.$class; if (-not $risk) { $risk = 'B' }
                $hay = "$desc $deliverable".ToLowerInvariant()
                $humanGate = ($risk -eq 'C')
                foreach ($trig in (ConvertTo-List $cfg.levelCGuards.triggers)) {
                    if ($hay -match [regex]::Escape($trig.ToLowerInvariant())) { $humanGate = $true }
                }
                $prevDep = @()
                if ($planTaskNums.Count -ge 2) { $prevDep = @("$planId-$($planTaskNums[$planTaskNums.Count - 2])") }

                $st = Resolve-TaskStatus $class $sumState $tnum $secCrit $fm.status
                # historical (out-of-scope) phase with no summary detail -> STATE.md says the phase shipped
                if (-not $inScope -and $st.status -eq 'PENDING') { $st = @{ status = 'DONE'; evidence = 'historical phase (STATE.md authoritative); not re-validated'; note = '' } }

                $tasks += [ordered]@{
                    task_id = "$planId-$tnum"; phase = $phaseKey; wave = "$wave"; plan = $planId; source = $rel
                    class = $class; risk = $risk; humanGate = [bool]$humanGate; inScope = [bool]$inScope
                    description = $desc; deliverable = $deliverable
                    dependencies = $prevDep; planDependencies = $planDeps
                    status = $st.status; evidence = $st.evidence; summaryNote = $st.note
                    verification = [ordered]@{ profile = $vProfile; hasAutoTests = [bool]$hasAutoTests; hasHumanTests = [bool]$hasHumanTests }
                    scopes = @($scopes)
                }
            }
        }

        if ($inScope) {
            foreach ($refT in ($sumState.referencedTasks | Select-Object -Unique)) {
                if ($planTaskNums -notcontains $refT) { $errors += "task-missing: $planId SUMMARY references $refT but the plan table has no such task" }
            }
            if ($fm.status -match '(?i)complete|passed' -and @($tasks | Where-Object { $_.plan -eq $planId -and $_.status -eq 'PENDING' }).Count -gt 0) {
                $errors += "status-impossible: $planId frontmatter status='$($fm.status)' but it has PENDING tasks"
            }
            if ($sumState.found -and $fm.status -match '(?i)complete|passed' -and $sumState.frontmatterStatus -match '(?i)in_progress|pending') {
                $warnings += "state-divergence: $planId plan status='$($fm.status)' vs SUMMARY status='$($sumState.frontmatterStatus)'"
            }
        }

        $plans += [ordered]@{
            plan_id = $planId; phase = $phaseKey; wave = "$wave"; source = $rel; inScope = [bool]$inScope
            frontmatterStatus = "$($fm.status)"; summaryStatus = "$($sumState.frontmatterStatus)"
            planDependencies = $planDeps; gateDependencies = $planGateDeps; taskCount = $planTaskNums.Count
        }
    }

    # dependency-missing (in-scope plans only; deps to below-floor phases count as satisfied)
    foreach ($p in ($plans | Where-Object { $_.inScope })) {
        foreach ($d in $p.planDependencies) {
            if ($planIds.ContainsKey($d)) { continue }
            $dnum = Get-PhaseNum ($d -replace '-P\d+$', '')
            if ($dnum -lt $floor -and $dnum -gt 0) { continue }   # historical, complete
            $errors += "dependency-missing: $($p.plan_id) depends on '$d' which is not a known plan"
        }
    }

    # cycle detection (in-scope subgraph)
    $inScopeIds = @{}; $plans | Where-Object { $_.inScope } | ForEach-Object { $inScopeIds[$_.plan_id] = $true }
    $cstate = @{}
    function Test-Cycle {
        param([string]$Node)
        $cstate[$Node] = 'gray'
        foreach ($n in (ConvertTo-List $planDepGraph[$Node])) {
            if (-not $planDepGraph.ContainsKey($n)) { continue }
            if ($cstate[$n] -eq 'gray') { return $true }
            if ($cstate[$n] -ne 'black') { if (Test-Cycle $n) { return $true } }
        }
        $cstate[$Node] = 'black'; return $false
    }
    foreach ($node in $inScopeIds.Keys) {
        if ($cstate[$node] -ne 'black') { if (Test-Cycle $node) { $errors += "cycle: plan dependency cycle involving $node"; break } }
    }

    # status ordering
    $byId = @{}; foreach ($t in $tasks) { $byId[$t.task_id] = $t }
    $planResolved = @{}
    foreach ($p in $plans) {
        $pt = @($tasks | Where-Object { $_.plan -eq $p.plan_id })
        $planResolved[$p.plan_id] = ($pt.Count -gt 0) -and (@($pt | Where-Object { $_.status -notin @('DONE', 'WAITING_HUMAN', 'SKIPPED') }).Count -eq 0)
    }
    foreach ($t in ($tasks | Where-Object { $_.inScope -and $_.status -eq 'DONE' })) {
        foreach ($d in (ConvertTo-List $t.dependencies)) {
            if ($byId.ContainsKey($d) -and $byId[$d].status -notin @('DONE', 'SKIPPED', 'WAITING_HUMAN')) {
                $errors += "status-impossible: $($t.task_id) is DONE but its predecessor $d is $($byId[$d].status)"
            }
        }
        foreach ($pd in (ConvertTo-List $t.planDependencies)) {
            if ($planResolved.ContainsKey($pd) -and -not $planResolved[$pd]) {
                $warnings += "ran-ahead: $($t.task_id) is DONE while dependency plan $pd is not fully resolved"
            }
        }
    }

    $needsReconcile = @($tasks | Where-Object { $_.status -eq 'NEEDS_RECONCILE' })
    foreach ($nr in $needsReconcile) { $warnings += "needs-reconcile: $($nr.task_id) - $($nr.evidence)" }

    $reconciled = ($errors.Count -eq 0) -and ($needsReconcile.Count -eq 0)

    return [ordered]@{
        schema       = 'orcivo.orchestration.execution-index/v2'
        generatedAt  = (Get-Date).ToString('o')
        planningHead = (Get-GitHead)
        activePhase  = $activePhase
        scopeFrom    = $ScopeFrom
        reconciled   = $reconciled
        rule         = '.planning is authoritative. Rebuild with reconcile.ps1. Validation covers the active phase and later; historical phases trust STATE.md. Scheduler refuses to run when reconciled=false.'
        errors       = @($errors)
        warnings     = @($warnings)
        externalGates = @($externalGates | Select-Object -Unique)
        plans        = @($plans)
        tasks        = @($tasks)
    }
}

function Update-ExecutionIndex {
    $idx = Build-ExecutionIndex
    Write-JsonFile -Path $script:IndexPath -Object $idx
    Write-OrchLog ("index: {0} plans, {1} tasks, reconciled={2}, {3} errors, {4} warnings -> {5}" -f `
        $idx.plans.Count, $idx.tasks.Count, $idx.reconciled, $idx.errors.Count, $idx.warnings.Count, $script:IndexPath)
    return $idx
}

function Get-ExecutionIndex {
    if (-not (Test-Path $script:IndexPath)) { throw "no execution-index.json - run: supervisor.ps1 index" }
    return (Read-JsonFile $script:IndexPath)
}
