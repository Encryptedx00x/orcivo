<#
taskgraph.ps1 - task generation + dependency graph.  (PRAGMATIC V2.1, PARTE 19)

Turns approved planning into tasks and validates the dependency graph. A task
carries at least:

  taskId title type source description acceptance dependencies scope risk
  productBatch ownerGate candidateConstraints verificationProfile status

The graph detects: cycles, missing dependencies, malformed states, Level C
tasks, and blocked dependencies. A task whose dependency has not PASSED is never
returned as ready.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:TaskStatuses = @('PENDING', 'READY', 'BLOCKED', 'RUNNING', 'DONE', 'FAILED', 'OWNER_GATE', 'LEVEL_C_HOLD', 'WAITING_PROVIDER')
$script:RequiredTaskFields = @('taskId', 'title', 'type', 'description', 'acceptance', 'dependencies', 'scope', 'risk', 'verificationProfile', 'status')

function Test-TaskWellFormed {
    param([hashtable]$Task)
    $problems = @()
    foreach ($f in $script:RequiredTaskFields) {
        if (-not $Task.ContainsKey($f)) { $problems += "missing field '$f'" }
    }
    if ($Task.taskId -and -not (Test-SafeId $Task.taskId)) { $problems += "taskId '$($Task.taskId)' violates the id grammar" }
    if ($Task.status -and ($Task.status -notin $script:TaskStatuses)) { $problems += "malformed status '$($Task.status)' (allowed: $($script:TaskStatuses -join ', '))" }
    if ($Task.risk -and ($Task.risk -notin @('A', 'B', 'C'))) { $problems += "risk '$($Task.risk)' not A/B/C" }
    if ($Task.verificationProfile -and ($Task.verificationProfile -notin @('A', 'B', 'C'))) { $problems += "verificationProfile '$($Task.verificationProfile)' not A/B/C" }
    if ($Task.ContainsKey('dependencies') -and $Task.dependencies -isnot [System.Collections.IEnumerable]) { $problems += "dependencies must be a list" }
    return [ordered]@{ ok = ($problems.Count -eq 0); problems = @($problems) }
}

# Is a task Level C? ownerGate set, risk C, or the classifier said LEVEL_C.
function Test-TaskLevelC {
    param([hashtable]$Task)
    if ("$($Task.ownerGate)" -and "$($Task.ownerGate)" -ne 'none' -and "$($Task.ownerGate)" -ne 'false') { return $true }
    if ("$($Task.risk)" -eq 'C') { return $true }
    if ("$($Task.classification.taskComplexity)" -eq 'LEVEL_C') { return $true }
    return $false
}

# DFS cycle detection. Returns @(cyclePathStrings).
function Get-GraphCycles {
    param([hashtable]$Adj)   # taskId -> @(depTaskIds)
    $WHITE = 0; $GRAY = 1; $BLACK = 2
    $color = @{}
    foreach ($k in $Adj.Keys) { $color[$k] = $WHITE }
    $cyclesList = New-Object System.Collections.Generic.List[string]
    $stack = New-Object System.Collections.Generic.List[string]

    $visit = {
        param($u)
        $color[$u] = $GRAY
        $stack.Add($u)
        foreach ($v in @($Adj[$u])) {
            if (-not $Adj.ContainsKey($v)) { continue }   # missing dep handled elsewhere
            if ($color[$v] -eq $GRAY) {
                $i = $stack.IndexOf($v)
                $cyclesList.Add((($stack.GetRange($i, $stack.Count - $i) + $v) -join ' -> '))
            } elseif ($color[$v] -eq $WHITE) {
                & $visit $v
            }
        }
        $stack.RemoveAt($stack.Count - 1)
        $color[$u] = $BLACK
    }

    foreach ($k in $Adj.Keys) { if ($color[$k] -eq $WHITE) { & $visit $k } }
    return @($cyclesList.ToArray() | Select-Object -Unique)
}

# Build + validate the graph. $DoneLookup: scriptblock taskId -> $true if that
# task's work is PUBLISHED / PASSED (the ledger is the real source in the pipeline).
function New-TaskGraph {
    param(
        [Parameter(Mandatory)][hashtable[]]$Tasks,
        [scriptblock]$DoneLookup = { param($id) $false }
    )
    $problems = @()
    $byId = @{}
    foreach ($t in $Tasks) {
        $wf = Test-TaskWellFormed $t
        if (-not $wf.ok) { $problems += "$($t.taskId): $($wf.problems -join '; ')" }
        if ($t.taskId) {
            if ($byId.ContainsKey($t.taskId)) { $problems += "duplicate taskId '$($t.taskId)'" }
            else { $byId[$t.taskId] = $t }
        }
    }

    $adj = @{}
    foreach ($id in $byId.Keys) { $adj[$id] = @($byId[$id].dependencies | Where-Object { $_ } | ForEach-Object { [string]$_ }) }

    # missing dependencies
    $missing = @()
    foreach ($id in $adj.Keys) {
        foreach ($d in $adj[$id]) {
            if (-not $byId.ContainsKey($d)) { $missing += "$id depends on unknown task '$d'" }
            if ($d -eq $id) { $missing += "$id depends on itself" }
        }
    }
    $problems += $missing

    $cycles = Get-GraphCycles $adj
    if ($cycles.Count -gt 0) { foreach ($c in $cycles) { $problems += "dependency cycle: $c" } }

    $levelC = @($byId.Values | Where-Object { Test-TaskLevelC $_ } | ForEach-Object { $_.taskId })

    # ready / blocked
    $ready = @(); $blocked = @()
    foreach ($id in $byId.Keys) {
        $t = $byId[$id]
        if ("$($t.status)" -in @('DONE', 'FAILED', 'RUNNING')) { continue }
        $depIssues = @()
        foreach ($d in $adj[$id]) {
            if (-not $byId.ContainsKey($d)) { $depIssues += "unknown dep $d"; continue }
            if (-not (& $DoneLookup $d)) { $depIssues += "dep $d not PASSED" }
        }
        if (Test-TaskLevelC $t) { $blocked += [ordered]@{ taskId = $id; reason = 'LEVEL_C - owner gate required' }; continue }
        if ($depIssues.Count -gt 0) { $blocked += [ordered]@{ taskId = $id; reason = ($depIssues -join '; ') }; continue }
        if ($cycles.Count -gt 0 -and ($cycles -join ' ') -match [regex]::Escape($id)) { $blocked += [ordered]@{ taskId = $id; reason = 'in a dependency cycle' }; continue }
        $ready += $id
    }

    return [ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.taskgraph/1'
        ok            = ($problems.Count -eq 0)
        problems      = @($problems)
        taskCount     = $byId.Count
        cycles        = @($cycles)
        missingDependencies = @($missing)
        levelCTasks   = @($levelC)
        readyTasks    = @($ready)
        blockedTasks  = @($blocked)
        builtAt       = (Get-Date).ToUniversalTime().ToString('o')
    }
}

# Do not execute a task whose dependency has not passed.
function Test-TaskDispatchable {
    param([hashtable]$Task, [hashtable[]]$AllTasks, [scriptblock]$DoneLookup)
    $g = New-TaskGraph -Tasks $AllTasks -DoneLookup $DoneLookup
    if (Test-TaskLevelC $Task) { return [ordered]@{ ok = $false; reason = 'LEVEL_C task - owner gate' } }
    if ($g.readyTasks -contains $Task.taskId) { return [ordered]@{ ok = $true; reason = 'ready' } }
    $b = @($g.blockedTasks | Where-Object { $_.taskId -eq $Task.taskId }) | Select-Object -First 1
    return [ordered]@{ ok = $false; reason = $(if ($b) { $b.reason } else { 'not in the ready set' }) }
}

# ---- Wave 0 selftest ------------------------------------------------------
function _mkTask { param($id, $deps, $status = 'PENDING', $risk = 'B', $gate = 'none')
    return @{ taskId = $id; title = "task $id"; type = 'BUG'; source = 'test'; description = "do $id";
             acceptance = "AC1: $id done"; dependencies = @($deps); scope = @("apps/x/$id"); risk = $risk;
             productBatch = 'B1'; ownerGate = $gate; candidateConstraints = @(); verificationProfile = 'B'; status = $status }
}

function Test-TaskGraphSelftest {
    $fail = @()

    # good graph: A -> B -> C
    $g = New-TaskGraph -Tasks @((_mkTask 'A' @()), (_mkTask 'B' @('A')), (_mkTask 'C' @('B'))) -DoneLookup { param($id) $id -eq 'A' }
    if (-not $g.ok) { $fail += "good graph flagged problems: $($g.problems -join '; ')" }
    if ($g.readyTasks -notcontains 'B') { $fail += "B should be ready (A done)" }
    if ($g.readyTasks -contains 'C') { $fail += "C should be blocked (B not done)" }

    # cycle
    $g = New-TaskGraph -Tasks @((_mkTask 'X' @('Z')), (_mkTask 'Y' @('X')), (_mkTask 'Z' @('Y')))
    if ($g.ok) { $fail += "cycle not detected" }
    if ($g.cycles.Count -eq 0) { $fail += "cycles list empty for a cyclic graph" }

    # missing dependency
    $g = New-TaskGraph -Tasks @((_mkTask 'P' @('DOES_NOT_EXIST')))
    if ($g.ok) { $fail += "missing dependency not detected" }
    if ($g.missingDependencies.Count -eq 0) { $fail += "missingDependencies empty" }

    # malformed status
    $g = New-TaskGraph -Tasks @((_mkTask 'Q' @() 'NONSENSE'))
    if ($g.ok) { $fail += "malformed status not detected" }

    # Level C
    $g = New-TaskGraph -Tasks @((_mkTask 'L' @() 'PENDING' 'C'), (_mkTask 'M' @() 'PENDING' 'B' 'owner-approval'))
    if ($g.levelCTasks -notcontains 'L') { $fail += "risk C not flagged Level C" }
    if ($g.levelCTasks -notcontains 'M') { $fail += "ownerGate not flagged Level C" }
    if ($g.readyTasks -contains 'L' -or $g.readyTasks -contains 'M') { $fail += "Level C task in ready set" }

    # blocked dependency: dep not passed
    $g = New-TaskGraph -Tasks @((_mkTask 'D1' @()), (_mkTask 'D2' @('D1'))) -DoneLookup { param($id) $false }
    if ($g.readyTasks -contains 'D2') { $fail += "D2 ready despite D1 not passed" }

    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail) }
}
