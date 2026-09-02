<#
ledger.ps1 - monotonic, append-only execution ledger for the V2 spine.  (C-01, L-01)

Fixes C-01: "tasks derived from the GSD index can be executed and integrated
repeatedly". The V1 supervisor recreated the queue from the reconciled index
every loop and only wrote an event on done - there was no durable record that
excluded an already-integrated task.

Design:
  * A task's IDENTITY is content-addressed:  taskVersionId = hash(taskId,
    planningHead, specHash, acceptanceHash). A new requirement / spec / acceptance
    text -> a DIFFERENT taskVersionId -> a fresh ledger. A PUBLISHED version can
    NEVER be scheduled again just because .planning has not caught up yet.
  * The ledger is an append-only JSON-lines file per taskVersionId. Current state
    is DERIVED by replaying events (rebuildable, tamper-evident by sequence).
  * State transitions are checked against a fixed monotonic table. PUBLISHED and
    QUARANTINED are terminal.
  * run / attempt ids are UUIDs (lib-v2 New-RunId / New-AttemptId), never
    second-resolution timestamps (L-01).

This file is AUTHORITATIVE for V2 scheduling. It does not read V1 state.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:LedgerDir = Join-Path (Get-V2Dir) 'ledger'

# monotonic transition table -------------------------------------------------
$script:Transitions = @{
    'DISCOVERED'    = @('READY', 'QUARANTINED', 'FAILED')
    'READY'         = @('DISPATCHED', 'WAITING_HUMAN', 'QUARANTINED', 'FAILED')
    'DISPATCHED'    = @('RUNNING', 'FAILED', 'QUARANTINED')
    'RUNNING'       = @('CHECKING', 'WAITING_HUMAN', 'FAILED', 'QUARANTINED')
    'CHECKING'      = @('REVIEWING', 'RUNNING', 'FAILED', 'QUARANTINED')
    'REVIEWING'     = @('APPROVED', 'RUNNING', 'WAITING_HUMAN', 'FAILED', 'QUARANTINED')
    'APPROVED'      = @('INTEGRATING', 'FAILED', 'QUARANTINED')
    'INTEGRATING'   = @('INTEGRATING', 'PUBLISHED', 'FAILED', 'QUARANTINED')   # self-loop: multi-step (integrate-local -> push)
    'PUBLISHED'     = @()          # terminal
    'WAITING_HUMAN' = @('READY', 'DISPATCHED', 'QUARANTINED', 'FAILED')
    'FAILED'        = @('READY', 'QUARANTINED')
    'QUARANTINED'   = @()          # terminal
}

function Test-LedgerTransition {
    param([string]$From, [string]$To)
    if (-not $script:Transitions.ContainsKey($From)) { return $false }
    return ($script:Transitions[$From] -contains $To)
}

# identity -----------------------------------------------------------------
function New-TaskVersionId {
    param(
        [Parameter(Mandatory)][string]$TaskId,
        [Parameter(Mandatory)][string]$PlanningHead,
        [Parameter(Mandatory)][string]$SpecHash,
        [Parameter(Mandatory)][string]$AcceptanceHash
    )
    $h = New-ContentHash ([ordered]@{
        taskId         = $TaskId
        planningHead   = $PlanningHead
        specHash       = $SpecHash
        acceptanceHash = $AcceptanceHash
        v              = 'orcivo.taskversion/1'
    })
    return ($h -replace '^sha256:', '')
}

function Get-LedgerPath {
    param([string]$TaskVersionId)
    if ($TaskVersionId -notmatch '^[0-9a-f]{64}$') { throw "v2 ledger: bad taskVersionId '$TaskVersionId'" }
    return (Join-Path $script:LedgerDir "$TaskVersionId.jsonl")
}

# derived state ----------------------------------------------------------
function Get-LedgerState {
    param([string]$TaskVersionId)
    $path = Get-LedgerPath $TaskVersionId
    $events = Read-JsonLines $path
    $state = [ordered]@{
        taskVersionId = $TaskVersionId
        exists        = ($events.Count -gt 0)
        state         = 'DISCOVERED'
        seq           = 0
        attempts      = 0
        published     = $false
        quarantined   = $false
        lastRunId     = $null
        lastEventAt   = $null
        publishedCommit = $null
        history       = @()
    }
    $expectSeq = 1
    foreach ($e in $events) {
        if ([int]$e.seq -ne $expectSeq) {
            throw "v2 ledger CORRUPT for $TaskVersionId : expected seq $expectSeq got $($e.seq)"
        }
        $expectSeq++
        # seq 1 is the seed event (DISCOVERED); every later event must be a legal transition
        if ($e.seq -eq 1 -and $e.toState -eq 'DISCOVERED') { $state.state = 'DISCOVERED' }
        elseif (-not (Test-LedgerTransition $state.state $e.toState)) {
            throw "v2 ledger CORRUPT for $TaskVersionId : illegal recorded transition $($state.state) -> $($e.toState) at seq $($e.seq)"
        }
        $state.state = $e.toState
        $state.seq   = [int]$e.seq
        $state.lastEventAt = $e.ts
        if ($e.runId)    { $state.lastRunId = $e.runId }
        if ($e.event -eq 'dispatch') { $state.attempts++ }
        if ($e.toState -eq 'PUBLISHED')   { $state.published = $true; $state.publishedCommit = $e.evidence.headSHA }
        if ($e.toState -eq 'QUARANTINED') { $state.quarantined = $true }
        $state.history += ,([ordered]@{ seq = $e.seq; event = $e.event; to = $e.toState; ts = $e.ts })
    }
    return $state
}

# append -----------------------------------------------------------------
function Add-LedgerEvent {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$Event,
        [Parameter(Mandatory)][string]$ToState,
        [string]$RunId,
        [string]$AttemptId,
        [string]$Actor = 'spine',
        [hashtable]$Evidence = @{},
        [string]$Note = ''
    )
    if (-not $script:Transitions.ContainsKey($ToState)) { throw "v2 ledger: unknown state '$ToState'" }
    $cur = Get-LedgerState $TaskVersionId

    if ($cur.published -and $ToState -ne 'PUBLISHED') {
        throw "v2 ledger C-01: $TaskVersionId is PUBLISHED (terminal). It CANNOT re-enter '$ToState'. A new requirement must produce a new taskVersionId."
    }
    if ($cur.quarantined) {
        throw "v2 ledger: $TaskVersionId is QUARANTINED (terminal). Human action required outside the spine."
    }
    if (-not (Test-LedgerTransition $cur.state $ToState)) {
        throw "v2 ledger: illegal transition $($cur.state) -> $ToState for $TaskVersionId (event '$Event')"
    }

    $rec = [ordered]@{
        seq       = ($cur.seq + 1)
        ts        = (Get-Date).ToUniversalTime().ToString('o')
        event     = $Event
        fromState = $cur.state
        toState   = $ToState
        runId     = $RunId
        attemptId = $AttemptId
        actor     = $Actor
        note      = $Note
        evidence  = ([ordered]@{} + $Evidence)
        holder    = (Get-ProcessIdentity)
    }
    Add-JsonLine (Get-LedgerPath $TaskVersionId) $rec

    # verify our write landed at the sequence we expected (detects a lost race)
    $after = Get-LedgerState $TaskVersionId
    if ($after.seq -ne $rec.seq -or $after.state -ne $ToState) {
        throw "v2 ledger: concurrent append detected for $TaskVersionId (wanted seq $($rec.seq)/$ToState, got $($after.seq)/$($after.state))"
    }
    Write-V2Log "ledger: $($TaskVersionId.Substring(0,12)) $($rec.fromState) -> $ToState ($Event) seq $($rec.seq)"
    return $after
}

# scheduling gate  (C-01: exactly-once) --------------------------------
function Test-CanDispatch {
    param([string]$TaskVersionId)
    $cfg = Get-V2Config
    $s = Get-LedgerState $TaskVersionId
    $reasons = @()
    if ($s.published)   { $reasons += 'already PUBLISHED (terminal - exactly-once)' }
    if ($s.quarantined) { $reasons += 'QUARANTINED' }
    if ($s.state -notin @($cfg.ledger.dispatchableStates)) { $reasons += "state '$($s.state)' is not dispatchable" }
    if ($s.attempts -ge [int]$cfg.ledger.maxAttemptsPerVersion) { $reasons += "attempt budget exhausted ($($s.attempts)/$($cfg.ledger.maxAttemptsPerVersion))" }
    return [ordered]@{ ok = ($reasons.Count -eq 0); state = $s.state; attempts = $s.attempts; reasons = @($reasons) }
}

function Initialize-LedgerTask {
    param([string]$TaskVersionId, [hashtable]$Identity)
    $path = Get-LedgerPath $TaskVersionId
    if (Test-Path $path) { return (Get-LedgerState $TaskVersionId) }
    $rec = [ordered]@{
        seq = 1; ts = (Get-Date).ToUniversalTime().ToString('o')
        event = 'discover'; fromState = 'DISCOVERED'; toState = 'DISCOVERED'
        runId = $null; attemptId = $null; actor = 'reconcile'; note = 'task version discovered'
        evidence = ([ordered]@{} + $Identity); holder = (Get-ProcessIdentity)
    }
    # first line is written exclusively so two reconcilers cannot both seed it
    if (New-ExclusiveFile $path ((ConvertTo-CanonicalJson $rec) + "`n")) {
        Write-V2Log "ledger: discovered $($TaskVersionId.Substring(0,12)) ($($Identity.taskId))"
    }
    return (Get-LedgerState $TaskVersionId)
}
