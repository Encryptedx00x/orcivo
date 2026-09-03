<#
ledger.ps1 - monotonic, append-only, HASH-CHAINED execution ledger.  (C-01, L-01)

Second-review remediation of C-01. The first V2 ledger chose a sequence number and
appended in two separate operations, so eight concurrent writers reproduced
`CORRUPT`; and a sequence-only file had no hash chain or sealed tail, so tail
truncation could silently expose an earlier dispatchable state.

This version:
  * IDENTITY is content-addressed:  taskVersionId = hash(taskId, planningHead,
    specHash, acceptanceHash). A PUBLISHED / QUARANTINED version is terminal and
    can NEVER be scheduled again.
  * SELECT + VALIDATE + APPEND + SEAL run under one atomic ledger lease
    (namespace 'ledger', key = taskVersionId). No two appends can pick the same
    sequence.
  * Every event carries prevHash + eventHash. eventHash covers
    {v, taskVersion, seq, prevHash, event, fromState, toState, runId, attemptId,
     actor, payloadHash}. ts / note / holder are audit-only and excluded.
  * A sealed head file (<tvid>.head.json) records {seq, eventHash, state}. On read
    the derived tail must match the seal exactly.
  * ANY inconsistency - bad sequence, broken prev/current hash, duplicate seq,
    missing event, malformed tail, head/tail disagreement, illegal recorded
    transition, resurrection of a terminal state - makes the derived state
    QUARANTINED and non-dispatchable. No "plausible state" reconstruction.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'lease.ps1')

$script:LedgerDir = Join-Path (Get-V2Dir) 'ledger'

# monotonic transition table -------------------------------------------------
$script:Transitions = @{
    'DISCOVERED'    = @('READY', 'QUARANTINED', 'FAILED')
    'READY'         = @('DISPATCHED', 'WAITING_HUMAN', 'QUARANTINED', 'FAILED')
    'DISPATCHED'    = @('RUNNING', 'WAITING_PROVIDER', 'FAILED', 'QUARANTINED')
    'RUNNING'       = @('CHECKING', 'WAITING_HUMAN', 'WAITING_PROVIDER', 'FAILED', 'QUARANTINED')
    'CHECKING'      = @('REVIEWING', 'RUNNING', 'FAILED', 'QUARANTINED')
    'REVIEWING'     = @('APPROVED', 'NO_CHANGE_ACCEPTED', 'RUNNING', 'WAITING_HUMAN', 'FAILED', 'FAILED_REVIEW_BUDGET', 'QUARANTINED')
    'APPROVED'      = @('INTEGRATING', 'FAILED', 'QUARANTINED')
    'INTEGRATING'   = @('INTEGRATING', 'REMOTE_RECONCILING', 'PUBLISHED', 'PUSH_FAILED', 'REMOTE_DIVERGED', 'INTEGRATION_FAILED', 'AMBIGUOUS_REMOTE', 'SECRET_LEAK_BLOCKED', 'FAILED', 'QUARANTINED')
    'REMOTE_RECONCILING' = @('PUBLISHED', 'NOT_PUBLISHED_CONFIRMED', 'AMBIGUOUS_REMOTE', 'PUSH_FAILED', 'REMOTE_DIVERGED', 'INTEGRATION_FAILED', 'QUARANTINED')
    'PUBLISHED'          = @()   # terminal
    'NO_CHANGE_ACCEPTED' = @()   # terminal (M-03)
    'NOT_PUBLISHED_CONFIRMED' = @('READY', 'QUARANTINED')   # PARTE 8: remote-confirmed NOT published -> safe to retry
    'AMBIGUOUS_REMOTE'  = @('REMOTE_RECONCILING', 'QUARANTINED')   # PARTE 8: never auto-retry; reconcile or human
    'WAITING_HUMAN' = @('DISPATCHED', 'QUARANTINED', 'FAILED')     # resume ONLY via an explicit gate approval (preflight-checked)
    'WAITING_PROVIDER' = @('DISPATCHED', 'RUNNING', 'WAITING_HUMAN', 'QUARANTINED', 'FAILED')   # PARTE 14: auto-resume when a provider is healthy again
    'FAILED'        = @('READY', 'QUARANTINED')
    'FAILED_REVIEW_BUDGET' = @('READY', 'QUARANTINED')   # PARTE 17: bounded correction budget spent - human decides
    'PUSH_FAILED'       = @('READY', 'QUARANTINED')
    'REMOTE_DIVERGED'   = @('READY', 'QUARANTINED')
    'INTEGRATION_FAILED'= @('READY', 'QUARANTINED')
    'SECRET_LEAK_BLOCKED' = @('QUARANTINED')   # a leak needs human review before any retry
    'QUARANTINED'   = @()        # terminal
}
$script:TerminalStates    = @('PUBLISHED', 'NO_CHANGE_ACCEPTED', 'QUARANTINED')
$script:NonPublishedTerminal = @('NO_CHANGE_ACCEPTED', 'QUARANTINED', 'PUSH_FAILED', 'REMOTE_DIVERGED', 'INTEGRATION_FAILED', 'NOT_PUBLISHED_CONFIRMED', 'SECRET_LEAK_BLOCKED', 'FAILED', 'FAILED_REVIEW_BUDGET')

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
function Get-LedgerHeadPath {
    param([string]$TaskVersionId)
    if ($TaskVersionId -notmatch '^[0-9a-f]{64}$') { throw "v2 ledger: bad taskVersionId '$TaskVersionId'" }
    return (Join-Path $script:LedgerDir "$TaskVersionId.head.json")
}

# hash chain -------------------------------------------------------------
function _EventHash {
    param($E, [string]$TaskVersionId)
    $cfg = Get-V2Config
    $payloadHash = New-StringHash (ConvertTo-CanonicalJson ([ordered]@{} + ($E.evidence)))
    return (New-ContentHash ([ordered]@{
        v          = $cfg.ledger.hashChainVersion
        taskVersion = $TaskVersionId
        seq        = [int]$E.seq
        prevHash   = [string]$E.prevHash
        event      = [string]$E.event
        fromState  = [string]$E.fromState
        toState    = [string]$E.toState
        runId      = [string]$E.runId
        attemptId  = [string]$E.attemptId
        actor      = [string]$E.actor
        payloadHash = $payloadHash
    }))
}

function _GenesisHash {
    param([string]$TaskVersionId)
    return (New-StringHash ("orcivo.ledger.genesis/2:" + $TaskVersionId))
}

# derived state ----------------------------------------------------------
# returns an object; on ANY corruption -> state QUARANTINED, corrupt=$true,
# dispatchable=$false. Never throws for tamper (callers must treat quarantine as
# terminal); throws only for a structurally impossible taskVersionId.
function Get-LedgerState {
    param([string]$TaskVersionId)
    $path = Get-LedgerPath $TaskVersionId
    $headPath = Get-LedgerHeadPath $TaskVersionId
    $state = [ordered]@{
        taskVersionId = $TaskVersionId
        exists        = $false
        state         = 'DISCOVERED'
        seq           = 0
        attempts      = 0
        published     = $false
        quarantined   = $false
        corrupt       = $false
        corruption    = $null
        lastRunId     = $null
        lastEventAt   = $null
        publishedCommit = $null
        headEventHash = $null
        history       = @()
    }
    if (-not (Test-Path -LiteralPath $path)) { return $state }
    $state.exists = $true

    # parse strictly: each non-empty line must be valid JSON
    $rawLines = @()
    try { $rawLines = [System.IO.File]::ReadAllLines($path) } catch { return (_quarantine $state "cannot read ledger file") }
    $events = @()
    foreach ($l in $rawLines) {
        if (-not $l.Trim()) { continue }
        $obj = $null
        try { $obj = _ToHashtable ($l | ConvertFrom-Json) } catch { return (_quarantine $state "malformed ledger line (not JSON)") }
        $events += ,$obj
    }
    if ($events.Count -eq 0) { return (_quarantine $state "ledger file exists but has no events") }

    $expectSeq = 1
    $prevHash  = _GenesisHash $TaskVersionId
    $cur = 'DISCOVERED'
    foreach ($e in $events) {
        if (($e.seq -eq $null) -or ([int]$e.seq -ne $expectSeq)) {
            return (_quarantine $state "sequence break: expected $expectSeq got $($e.seq)")
        }
        if ([string]$e.prevHash -ne $prevHash) {
            return (_quarantine $state "prevHash mismatch at seq $($e.seq)")
        }
        $recomputed = _EventHash $e $TaskVersionId
        if ([string]$e.eventHash -ne $recomputed) {
            return (_quarantine $state "eventHash mismatch at seq $($e.seq) (rewritten)")
        }
        if ($e.seq -eq 1) {
            if ($e.toState -ne 'DISCOVERED' -or $e.fromState -ne 'DISCOVERED') {
                return (_quarantine $state "seed event is not DISCOVERED->DISCOVERED")
            }
        } else {
            if ([string]$e.fromState -ne $cur) {
                return (_quarantine $state "recorded fromState '$($e.fromState)' != derived '$cur' at seq $($e.seq)")
            }
            if (-not (Test-LedgerTransition $cur $e.toState)) {
                return (_quarantine $state "illegal recorded transition $cur -> $($e.toState) at seq $($e.seq)")
            }
        }
        if ($cur -in $script:TerminalStates) {
            return (_quarantine $state "event after terminal state $cur (resurrection) at seq $($e.seq)")
        }
        $cur = [string]$e.toState
        $expectSeq++
        $prevHash = [string]$e.eventHash
        $state.seq = [int]$e.seq
        $state.lastEventAt = $e.ts
        if ($e.runId) { $state.lastRunId = $e.runId }
        if ($e.event -eq 'dispatch') { $state.attempts++ }
        if ($e.toState -eq 'PUBLISHED')   { $state.published = $true; $state.publishedCommit = $e.evidence.headSHA }
        if ($e.toState -eq 'QUARANTINED') { $state.quarantined = $true }
        $state.history += ,([ordered]@{ seq = $e.seq; event = $e.event; to = $e.toState; ts = $e.ts })
    }
    $state.state = $cur
    $state.headEventHash = $prevHash

    # sealed head must match the derived tail exactly (truncation / stale head)
    if (Test-Path -LiteralPath $headPath) {
        $head = $null
        try { $head = Read-V2Json $headPath } catch { return (_quarantine $state "head seal is not readable JSON") }
        if ([int]$head.seq -ne $state.seq) { return (_quarantine $state "head seal seq $($head.seq) != tail seq $($state.seq) (truncation / stale head)") }
        if ([string]$head.eventHash -ne $prevHash) { return (_quarantine $state "head seal eventHash != tail eventHash (tampered / stale head)") }
        if ([string]$head.state -ne $cur) { return (_quarantine $state "head seal state $($head.state) != tail state $cur") }
    } else {
        return (_quarantine $state "no head seal for an existing ledger")
    }
    return $state
}

function _quarantine {
    param($State, [string]$Why)
    $State.state = 'QUARANTINED'
    $State.quarantined = $true
    $State.corrupt = $true
    $State.corruption = $Why
    Write-V2Log "ledger QUARANTINE $($State.taskVersionId.Substring(0,12)): $Why" 'ERROR'
    return $State
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
    $path = Get-LedgerPath $TaskVersionId
    $headPath = Get-LedgerHeadPath $TaskVersionId

    # one atomic lease covers read-tail / validate / choose-seq / append / seal
    $lease = New-LeaseWait -Namespace 'ledger' -Key $TaskVersionId -TaskVersionId $TaskVersionId -TimeoutSec 60
    if (-not $lease.ok) { throw "v2 ledger: could not obtain the ledger lease for $TaskVersionId within 60s (held by $($lease.heldBy.leaseId))" }
    try {
        $cur = Get-LedgerState $TaskVersionId
        if ($cur.corrupt) { throw "v2 ledger: $TaskVersionId is CORRUPT ($($cur.corruption)); refusing to append. Human action required." }
        if ($cur.published -and $ToState -ne 'PUBLISHED') {
            throw "v2 ledger C-01: $TaskVersionId is PUBLISHED (terminal); cannot enter '$ToState'."
        }
        if ($cur.state -in $script:TerminalStates) {
            throw "v2 ledger: $TaskVersionId is in terminal state $($cur.state); cannot enter '$ToState'."
        }
        if (-not (Test-LedgerTransition $cur.state $ToState)) {
            throw "v2 ledger: illegal transition $($cur.state) -> $ToState for $TaskVersionId (event '$Event')"
        }

        $prevHash = $cur.headEventHash
        if (-not $prevHash) { $prevHash = _GenesisHash $TaskVersionId }

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
            prevHash  = $prevHash
        }
        $rec.eventHash = _EventHash $rec $TaskVersionId

        Add-JsonLine $path $rec

        # seal the new head via CAS on the previous head content
        $oldHeadHash = New-FileHash $headPath
        $newHead = ConvertTo-CanonicalJson ([ordered]@{
            schemaVersion = 'orcivo.orchestration.v2.ledger-head/2'
            taskVersionId = $TaskVersionId
            seq           = $rec.seq
            eventHash     = $rec.eventHash
            state         = $ToState
            sealedAt      = (Get-Date).ToUniversalTime().ToString('o')
        })
        if (-not (Invoke-FileCas -Path $headPath -ExpectedHash $oldHeadHash -NewContent $newHead)) {
            throw "v2 ledger: head seal CAS lost a race for $TaskVersionId (concurrent writer outside the ledger lease?)"
        }

        $after = Get-LedgerState $TaskVersionId
        if ($after.corrupt -or $after.seq -ne $rec.seq -or $after.state -ne $ToState) {
            throw "v2 ledger: post-append verification failed for $TaskVersionId (seq $($after.seq)/$($after.state), corrupt=$($after.corrupt))"
        }
        Write-V2Log "ledger: $($TaskVersionId.Substring(0,12)) $($rec.fromState) -> $ToState ($Event) seq $($rec.seq)"
        return $after
    }
    finally { [void](Remove-Lease -Namespace 'ledger' -Key $TaskVersionId -LeaseId $lease.leaseId) }
}

# scheduling gate  (C-01: exactly-once) --------------------------------
function Test-CanDispatch {
    param([string]$TaskVersionId)
    $cfg = Get-V2Config
    $s = Get-LedgerState $TaskVersionId
    $reasons = @()
    if ($s.corrupt)     { $reasons += "ledger CORRUPT: $($s.corruption)" }
    if ($s.published)   { $reasons += 'already PUBLISHED (terminal - exactly-once)' }
    if ($s.quarantined) { $reasons += 'QUARANTINED' }
    if ($s.state -in $script:TerminalStates) { $reasons += "state '$($s.state)' is terminal" }
    if ($s.state -notin @($cfg.ledger.dispatchableStates)) { $reasons += "state '$($s.state)' is not dispatchable" }
    if ($s.attempts -ge [int]$cfg.ledger.maxAttemptsPerVersion) { $reasons += "attempt budget exhausted ($($s.attempts)/$($cfg.ledger.maxAttemptsPerVersion))" }
    return [ordered]@{ ok = ($reasons.Count -eq 0); state = $s.state; attempts = $s.attempts; corrupt = $s.corrupt; reasons = @($reasons) }
}

function Initialize-LedgerTask {
    param([string]$TaskVersionId, [hashtable]$Identity)
    $path = Get-LedgerPath $TaskVersionId
    $headPath = Get-LedgerHeadPath $TaskVersionId
    if (Test-Path $path) { return (Get-LedgerState $TaskVersionId) }

    $lease = New-LeaseWait -Namespace 'ledger' -Key $TaskVersionId -TaskVersionId $TaskVersionId -TimeoutSec 60
    if (-not $lease.ok) { throw "v2 ledger: could not obtain the ledger lease to seed $TaskVersionId" }
    try {
        if (Test-Path $path) { return (Get-LedgerState $TaskVersionId) }
        $prevHash = _GenesisHash $TaskVersionId
        $rec = [ordered]@{
            seq = 1; ts = (Get-Date).ToUniversalTime().ToString('o')
            event = 'discover'; fromState = 'DISCOVERED'; toState = 'DISCOVERED'
            runId = $null; attemptId = $null; actor = 'reconcile'; note = 'task version discovered'
            evidence = ([ordered]@{} + $Identity); holder = (Get-ProcessIdentity)
            prevHash = $prevHash
        }
        $rec.eventHash = _EventHash $rec $TaskVersionId
        if (New-ExclusiveFile $path ((ConvertTo-CanonicalJson $rec) + "`n")) {
            $head = ConvertTo-CanonicalJson ([ordered]@{
                schemaVersion = 'orcivo.orchestration.v2.ledger-head/2'
                taskVersionId = $TaskVersionId; seq = 1; eventHash = $rec.eventHash
                state = 'DISCOVERED'; sealedAt = (Get-Date).ToUniversalTime().ToString('o')
            })
            [void](Invoke-FileCas -Path $headPath -ExpectedHash 'sha256:absent' -NewContent $head)
            Write-V2Log "ledger: discovered $($TaskVersionId.Substring(0,12)) ($($Identity.taskId))"
        }
        return (Get-LedgerState $TaskVersionId)
    }
    finally { [void](Remove-Lease -Namespace 'ledger' -Key $TaskVersionId -LeaseId $lease.leaseId) }
}
