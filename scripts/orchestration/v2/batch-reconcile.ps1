<#
batch-reconcile.ps1 - reconcile an OWNER_APPROVED product batch into a
machine-readable execution plan for the supervisor.  (PRAGMATIC V2.1)

Input:  .planning/product/<batch>.tasks.json  (OWNER_APPROVED)
Checks: no duplicate taskIds, every dependency resolves, no cycle, every task
        well-formed, GSD phase gates (P02 T12/T13, P03) preserved, Level C tasks
        flagged, nothing marked runnable that a gate blocks.
Output: <batch>.plan.json (machine-readable waves) + a summary. Does NOT execute
        anything and does NOT write to the ledger.
#>
param(
    [string]$TasksFile = '',
    [switch]$Quiet
)

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'taskgraph.ps1')

if (-not $TasksFile) {
    $TasksFile = Join-Path (Get-RepoRoot) '.planning\product\MVP-PRODUCT-BATCH-1.tasks.json'
}
if (-not (Test-Path $TasksFile)) { throw "batch-reconcile: tasks file not found: $TasksFile" }

# plain ConvertFrom-Json (PSCustomObject) - we only read here, never hash.
$batch = Get-Content -Raw -LiteralPath $TasksFile | ConvertFrom-Json
if ("$($batch.state)" -ne 'OWNER_APPROVED') {
    throw "batch-reconcile: batch state is '$($batch.state)', not OWNER_APPROVED - nothing to reconcile"
}

$tasks = @($batch.tasks)
$problems = @()
$byId = @{}

# 1. no duplicate taskIds
foreach ($t in $tasks) {
    if (-not $t.taskId) { $problems += "a task has no taskId"; continue }
    if ($byId.ContainsKey($t.taskId)) { $problems += "duplicate taskId '$($t.taskId)'" }
    else { $byId[$t.taskId] = $t }
}

# 2. every dependency resolves + no self-dep
foreach ($t in $tasks) {
    foreach ($d in @($t.dependencies)) {
        if (-not $byId.ContainsKey($d)) { $problems += "$($t.taskId) depends on unknown task '$d'" }
        if ($d -eq $t.taskId) { $problems += "$($t.taskId) depends on itself" }
    }
}

# 3. well-formed + graph (cycles / missing deps / Level C / blocked)
$graphTasks = @()
foreach ($t in $tasks) {
    $h = @{}
    foreach ($p in $t.PSObject.Properties) { $h[$p.Name] = $p.Value }
    # taskgraph wants a plain 'dependencies' list; it is already there
    $graphTasks += $h
}
$graph = New-TaskGraph -Tasks $graphTasks -DoneLookup { param($id) $false }
$problems += @($graph.problems)

# 4. GSD gate preservation. Gate state is read from the batch file (the human/
# agent-verified source), not hardcoded - a gate PASSes exactly once, in the GSD
# session that clears it (03.1-P02-T12-T13-RESULT.md / 03.1-P03-T10-T13-RESULT.md).
$allowedGateStates = @('WAITING_HUMAN', 'PASS', 'BLOCKED', 'BLOCKED_BY_P02')
$gateNames = @($batch.gates.PSObject.Properties.Name)
foreach ($required in @('P02-T12', 'P02-T13', 'P03')) {
    if ($gateNames -notcontains $required) { $problems += "batch does not carry the required GSD gate '$required'" }
}
foreach ($g in @('P02-T12', 'P02-T13', 'P02-PASS', 'P03')) {
    $state = "$($batch.gates.$g.state)"
    if ($state -and ($allowedGateStates -notcontains $state)) { $problems += "gate '$g' has unknown state '$state'" }
}
$gatesPassed = (
    "$($batch.gates.'P02-T12'.state)" -eq 'PASS' -and
    "$($batch.gates.'P02-T13'.state)" -eq 'PASS' -and
    "$($batch.gates.P03.state)" -eq 'PASS'
)

# 5. every task must be blocked by the P02/P03 gates (structural - the gates a
# task lists never shrink; whether they are currently satisfied is $gatesPassed)
foreach ($t in $tasks) {
    $bg = @($t.blockedByGates)
    $gatesOk = ($bg -contains 'P03') -and ($bg -contains 'P02-T12') -and ($bg -contains 'P02-T13')
    if (-not $gatesOk) {
        $problems += "$($t.taskId) is NOT blockedByGates [P02-T12, P02-T13, P03] - a product task cannot be runnable before P03"
    }
}
# every task in this batch carries the identical 3-gate list (enforced above),
# so once $gatesPassed is true every task's GSD gate is satisfied at once.
$runnableNow = @()
$dispatchableNow = $(if ($gatesPassed) { @($graph.readyTasks) } else { @() })

# 6. Level C tasks must not claim to be dispatchable
$levelC = @($graph.levelCTasks)
foreach ($id in $levelC) {
    if ($graph.readyTasks -contains $id) { $problems += "Level C task '$id' is in the ready set" }
}

# ---- waves (topological, phase-ordered) -------------------------------------
$phaseOrder = @($batch.phaseOrder)
$phaseRank = @{}
for ($i = 0; $i -lt $phaseOrder.Count; $i++) { $phaseRank[$phaseOrder[$i]] = $i }

$depth = @{}
function _Depth {
    param($id)
    if ($depth.ContainsKey($id)) { return $depth[$id] }
    $t = $byId[$id]
    $max = 0
    foreach ($d in @($t.dependencies)) {
        if ($byId.ContainsKey($d)) { $dd = (_Depth $d) + 1; if ($dd -gt $max) { $max = $dd } }
    }
    $depth[$id] = $max
    return $max
}
foreach ($id in $byId.Keys) { [void](_Depth $id) }

$ordered = @($tasks | Sort-Object `
    @{ e = { [int]$phaseRank["$($_.phaseGate)"] } }, `
    @{ e = { [int]$depth["$($_.taskId)"] } }, `
    @{ e = { "$($_.taskId)" } })

$waves = New-Object System.Collections.Generic.List[object]
$done = New-Object System.Collections.Generic.HashSet[string]
$remaining = [System.Collections.Generic.List[object]]::new()
$ordered | ForEach-Object { [void]$remaining.Add($_) }
$waveN = 0
while ($remaining.Count -gt 0 -and $waveN -lt 50) {
    $waveN++
    $thisWave = @()
    foreach ($t in @($remaining)) {
        $depsSatisfied = $true
        foreach ($d in @($t.dependencies)) { if (-not $done.Contains($d)) { $depsSatisfied = $false; break } }
        if ($depsSatisfied) { $thisWave += $t }
    }
    if ($thisWave.Count -eq 0) { $problems += "wave planner stalled - possible cycle"; break }
    # maxParallel = 1 in pilot, but the plan records the logical wave; the
    # scheduler still serialises. Split a wave by phase so order stays legible.
    $waves.Add([ordered]@{
        wave      = $waveN
        taskIds   = @($thisWave | ForEach-Object { $_.taskId })
        phases    = @($thisWave | ForEach-Object { "$($_.phaseGate)" } | Select-Object -Unique)
        levelC    = @($thisWave | Where-Object { $levelC -contains $_.taskId } | ForEach-Object { $_.taskId })
    })
    foreach ($t in $thisWave) { [void]$done.Add($t.taskId); [void]$remaining.Remove($t) }
}

# ---- phase waves (GSD-accurate: phases are sequential) ---------------------
$phaseWaves = New-Object System.Collections.Generic.List[object]
foreach ($ph in $phaseOrder) {
    $inPhase = @($tasks | Where-Object { "$($_.phaseGate)" -eq $ph })
    if ($inPhase.Count -eq 0) { continue }
    $phaseWaves.Add([ordered]@{
        phase   = $ph
        taskIds = @($inPhase | ForEach-Object { $_.taskId })
        levelC  = @($inPhase | Where-Object { $levelC -contains $_.taskId } | ForEach-Object { $_.taskId })
        blocked = -not $gatesPassed
        blockedBy = @('P02-T12', 'P02-T13', 'P03')
    })
}

$plan = [ordered]@{
    schemaVersion   = 'orcivo.product-batch-plan/1'
    batch           = "$($batch.batch)"
    reconciledAt    = (Get-Date).ToUniversalTime().ToString('o')
    ok              = ($problems.Count -eq 0)
    problems        = @($problems)
    taskCount       = $tasks.Count
    levelCTasks     = @($levelC)
    gates           = [ordered]@{
        'P02-T12'  = "$($batch.gates.'P02-T12'.state)"
        'P02-T13'  = "$($batch.gates.'P02-T13'.state)"
        'P02-PASS' = "$($batch.gates.'P02-PASS'.state)"
        'P03'      = "$($batch.gates.P03.state)"
    }
    gatesPassed     = $gatesPassed
    runnableBeforeP03 = @($runnableNow)      # historical/definitional - always empty, nothing ran before P03
    dispatchableNow = @($dispatchableNow)    # gate-satisfied AND task-dep-satisfied AND not Level C; Level C still needs its own owner gate
    phaseWaves      = @($phaseWaves.ToArray())     # GSD-accurate: phases run in order after the gates
    dependencyWaves = @($waves.ToArray())          # finer-grained task dependency layers within/across phases
    firstAgentActionAfterGates = 'plan + execute 03.1-P03 (storage privado); then the P04 phase wave (PB1-P02-audit-service is the Level C lead task and still parks at WAITING_HUMAN for its own owner gate even though P02/P03 are satisfied)'
}

$planPath = [System.IO.Path]::ChangeExtension($TasksFile, $null).TrimEnd('.') + '.plan.json'
$planPath = ($TasksFile -replace '\.tasks\.json$', '.plan.json')
Write-V2JsonCanonical $planPath $plan

if (-not $Quiet) {
    Write-Host ""
    Write-Host "Batch: $($batch.batch)  state=$($batch.state)  tasks=$($tasks.Count)" -ForegroundColor Cyan
    Write-Host "Reconcile: $(if ($plan.ok) { 'OK' } else { 'PROBLEMS' })" -ForegroundColor $(if ($plan.ok) { 'Green' } else { 'Red' })
    foreach ($p in $problems) { Write-Host "  - $p" -ForegroundColor DarkYellow }
    Write-Host ""
    Write-Host "Gates: P02-T12 $($plan.gates.'P02-T12') | P02-T13 $($plan.gates.'P02-T13') | P03 $($plan.gates.P03)"
    Write-Host "Level C tasks (owner gate): $(@($levelC) -join ', ')"
    if ($gatesPassed) {
        Write-Host "Dispatchable now (gates satisfied, not Level C, deps clear): $(if ($dispatchableNow.Count) { $dispatchableNow -join ', ' } else { 'NONE (remaining tasks depend on a Level C task)' })"
    } else {
        Write-Host "Runnable before P03: NONE (every product task is downstream of the P02->P03 chain)"
    }
    Write-Host ""
    Write-Host "Execution waves (scheduler serialises; maxParallel=1):"
    foreach ($w in $waves) {
        Write-Host ("  wave {0}  [{1}]" -f $w.wave, ($w.phases -join ','))
        foreach ($tid in $w.taskIds) {
            $lc = $(if ($w.levelC -contains $tid) { ' (LEVEL C -> WAITING_HUMAN)' } else { '' })
            Write-Host ("      {0}{1}" -f $tid, $lc)
        }
    }
    Write-Host ""
    Write-Host "Plan written: $planPath"
}

exit $(if ($plan.ok) { 0 } else { 1 })
