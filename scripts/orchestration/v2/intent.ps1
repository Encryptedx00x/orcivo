<#
intent.ps1 - INTEGRATION_INTENT + remote-truth reconciliation.
             (PRAGMATIC V2.1, PARTE 8; addresses review-4 H4-06 and the V2.1
              architecture review's sealed-manifest gap)

Before ANY git publication a durable INTEGRATION_INTENT is written. `origin` is
the FINAL truth of publication. After a timeout, a dropped connection, a push
failure, a crash, an uncertain exit, or a post-push ledger-write failure, the
recovery path FETCHES the remote, compares SHA + tree + ancestry, reconstructs
the truth, and only then sets a terminal state:

  INTEGRATION_PREPARED -> PUSH_ATTEMPTED -> REMOTE_RECONCILING
      -> PUBLISHED | NOT_PUBLISHED_CONFIRMED | AMBIGUOUS_REMOTE

Rules:
  * Never report NOT_PUBLISHED while the remote truth is unknown -> AMBIGUOUS_REMOTE.
  * Never auto-republish something already confirmed in origin.

The $script:IntentTestFaults seam ('failFetch') is set ONLY by the disposable
Wave 0 harness; there is no env var and no production caller.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'ledger.ps1')

$script:IntentDir = Join-Path (Get-V2Dir) 'integration-intents'
$script:IntentTestFaults = $null
function _intentFault { param([string]$N) return ($script:IntentTestFaults -and $script:IntentTestFaults[$N]) }

$script:IntentStates = @('INTEGRATION_PREPARED', 'PUSH_ATTEMPTED', 'REMOTE_RECONCILING', 'PUBLISHED', 'NOT_PUBLISHED_CONFIRMED', 'AMBIGUOUS_REMOTE')
$script:IntentRequiredFields = @('runId', 'taskId', 'taskVersionId', 'attemptId', 'candidateCommit', 'candidateTree',
    'baseRemoteSha', 'remoteName', 'repoIdentity', 'targetRef', 'expectedResultCommit', 'expectedResultTree', 'createdAt', 'state')

function Get-IntentPath {
    param([string]$RunId)
    Assert-SafeId $RunId 'runId'
    return (Join-Path $script:IntentDir "$RunId.json")
}

function Get-RepoIdentity {
    param([string]$RepoDir)
    $url = ''
    try { $url = (& git -C $RepoDir remote get-url origin 2>$null).Trim() } catch { }
    if (-not $url) { return 'sha256:no-remote' }
    # strip any embedded credential, normalise, then hash (never store a raw URL that could carry a token)
    $norm = ($url -replace '://[^/@]*@', '://').TrimEnd('/').ToLowerInvariant() -replace '\.git$', ''
    return (New-StringHash $norm)
}

function New-IntegrationIntent {
    param(
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][string]$TaskId,
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$AttemptId,
        [Parameter(Mandatory)][string]$RepoDir,
        [Parameter(Mandatory)][string]$CandidateCommit,
        [Parameter(Mandatory)][string]$CandidateTree,
        [Parameter(Mandatory)][string]$BaseRemoteSha,
        [string]$RemoteName = 'origin',
        [string]$TargetRef = ''
    )
    $cfg = Get-V2Config
    if (-not $TargetRef) { $TargetRef = $cfg.target.branch }
    $intent = [ordered]@{
        schemaVersion        = 'orcivo.orchestration.v2.integration-intent/1'
        runId                = $RunId
        taskId               = $TaskId
        taskVersionId        = $TaskVersionId
        attemptId            = $AttemptId
        candidateCommit      = $CandidateCommit
        candidateTree        = $CandidateTree
        baseRemoteSha        = $BaseRemoteSha
        remoteName           = $RemoteName
        repoIdentity         = (Get-RepoIdentity $RepoDir)
        targetRef            = $TargetRef
        expectedResultCommit = $null              # filled at PUSH_ATTEMPTED (the local merge commit)
        expectedResultTree   = $CandidateTree     # a no-op merge keeps the candidate tree
        createdAt            = (Get-Date).ToUniversalTime().ToString('o')
        state                = 'INTEGRATION_PREPARED'
        history              = @(@{ state = 'INTEGRATION_PREPARED'; at = (Get-Date).ToUniversalTime().ToString('o') })
    }
    foreach ($f in $script:IntentRequiredFields) { if (-not $intent.Contains($f)) { throw "v2 intent: required field '$f' missing" } }
    Write-V2JsonCanonical (Get-IntentPath $RunId) $intent
    Write-V2Log "intent: $($TaskVersionId.Substring(0,12)) run $($RunId.Substring(0,10)) INTEGRATION_PREPARED (base $($BaseRemoteSha.Substring(0,10)))"
    return $intent
}

function Get-IntegrationIntent {
    param([string]$RunId)
    $p = Get-IntentPath $RunId
    if (-not (Test-Path $p)) { return $null }
    return (Read-V2Json $p)
}

function Update-IntegrationIntentState {
    param(
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][ValidateSet('INTEGRATION_PREPARED', 'PUSH_ATTEMPTED', 'REMOTE_RECONCILING', 'PUBLISHED', 'NOT_PUBLISHED_CONFIRMED', 'AMBIGUOUS_REMOTE')][string]$State,
        [hashtable]$Patch = @{}
    )
    $p = Get-IntentPath $RunId
    $i = Get-IntegrationIntent $RunId
    if (-not $i) { throw "v2 intent: no intent for run $RunId" }
    $i.state = $State
    foreach ($k in $Patch.Keys) { $i.$k = $Patch[$k] }
    $h = @($i.history); $h += @{ state = $State; at = (Get-Date).ToUniversalTime().ToString('o') }
    $i.history = $h
    Write-V2JsonCanonical $p $i
    return $i
}

# Reconstruct publication truth from the ACTUAL remote. Never trusts local belief.
function Resolve-RemoteTruth {
    param(
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][string]$RepoDir
    )
    $i = Get-IntegrationIntent $RunId
    if (-not $i) { throw "v2 intent: no intent for run $RunId" }
    Update-IntegrationIntentState -RunId $RunId -State 'REMOTE_RECONCILING' | Out-Null

    $ev = [ordered]@{ fetchOk = $false; remoteSha = $null; remoteTree = $null; containsCandidate = $false; containsExpected = $false }

    $hasRemote = [bool](& git -C $RepoDir remote 2>$null)
    if ($hasRemote -and -not (_intentFault 'failFetch')) {
        & git -C $RepoDir fetch $i.remoteName --prune --quiet 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $ev.fetchOk = $true }
    }
    if (-not $ev.fetchOk) {
        # remote truth is UNKNOWN - never claim "not published"
        $out = Update-IntegrationIntentState -RunId $RunId -State 'AMBIGUOUS_REMOTE' -Patch @{ reconcileEvidence = $ev; reconcileReason = 'could not fetch the remote - publication truth is unknown' }
        return [ordered]@{ state = 'AMBIGUOUS_REMOTE'; published = $null; reason = 'remote unreachable during reconciliation'; evidence = $ev }
    }

    $rs = (& git -C $RepoDir rev-parse "$($i.remoteName)/$($i.targetRef)" 2>$null)
    if ($rs) { $ev.remoteSha = $rs.Trim() }
    if ($ev.remoteSha) {
        $rt = (& git -C $RepoDir rev-parse "$($ev.remoteSha)^{tree}" 2>$null)
        if ($rt) { $ev.remoteTree = $rt.Trim() }
        & git -C $RepoDir merge-base --is-ancestor $i.candidateCommit $ev.remoteSha 2>$null
        $ev.containsCandidate = ($LASTEXITCODE -eq 0)
        if ($i.expectedResultCommit) {
            & git -C $RepoDir merge-base --is-ancestor $i.expectedResultCommit $ev.remoteSha 2>$null
            $ev.containsExpected = ($LASTEXITCODE -eq 0)
        }
    }

    $state = $null; $published = $null; $reason = ''
    if (-not $ev.remoteSha) {
        $state = 'AMBIGUOUS_REMOTE'; $published = $null; $reason = "fetched but $($i.remoteName)/$($i.targetRef) does not resolve"
    }
    elseif ($ev.containsExpected -or ($ev.containsCandidate -and $ev.remoteTree -eq $i.expectedResultTree)) {
        $state = 'PUBLISHED'; $published = $true; $reason = 'remote contains the candidate and matches the expected result tree'
    }
    elseif ($ev.containsCandidate -and $ev.remoteTree -ne $i.expectedResultTree) {
        $state = 'AMBIGUOUS_REMOTE'; $published = $null; $reason = 'remote contains the candidate commit but the tree differs from the expected result'
    }
    elseif ($ev.remoteSha -eq $i.baseRemoteSha) {
        $state = 'NOT_PUBLISHED_CONFIRMED'; $published = $false; $reason = 'remote is still at the base SHA - nothing was published'
    }
    else {
        $state = 'NOT_PUBLISHED_CONFIRMED'; $published = $false; $reason = 'remote advanced but does not contain our candidate - our change did not land'
    }

    $out = Update-IntegrationIntentState -RunId $RunId -State $state -Patch @{ reconcileEvidence = $ev; reconcileReason = $reason }
    Write-V2Log "intent: $($i.taskVersionId.Substring(0,12)) run $($RunId.Substring(0,10)) reconciled -> $state ($reason)" 'WARN'
    return [ordered]@{ state = $state; published = $published; reason = $reason; evidence = $ev; intent = $out }
}

# Crash recovery: for a non-terminal intent, reconcile against the remote and
# bring the ledger to the correct terminal state. Idempotent - a task already
# PUBLISHED is left alone (never re-published).
function Invoke-IntentReconciliation {
    param([Parameter(Mandatory)][string]$RunId, [Parameter(Mandatory)][string]$RepoDir)
    $i = Get-IntegrationIntent $RunId
    if (-not $i) { return [ordered]@{ ok = $false; reason = "no intent for run $RunId" } }
    if ($i.state -in @('PUBLISHED', 'NOT_PUBLISHED_CONFIRMED')) {
        return [ordered]@{ ok = $true; reason = "intent already terminal ($($i.state))"; state = $i.state; noop = $true }
    }

    $led = Get-LedgerState $i.taskVersionId
    if ($led.published) {
        Update-IntegrationIntentState -RunId $RunId -State 'PUBLISHED' -Patch @{ reconcileReason = 'ledger already PUBLISHED' } | Out-Null
        return [ordered]@{ ok = $true; reason = 'ledger already PUBLISHED - no action'; state = 'PUBLISHED'; noop = $true }
    }

    $truth = Resolve-RemoteTruth -RunId $RunId -RepoDir $RepoDir

    if ($truth.state -eq 'PUBLISHED') {
        # the push DID land before the crash - record PUBLISHED exactly once
        if ($led.state -notin $script:TerminalStates) {
            foreach ($step in @(
                @{ from = @('APPROVED'); ev = 'integrate-start'; to = 'INTEGRATING' },
                @{ from = @('INTEGRATING'); ev = 'remote-reconciled-published'; to = 'PUBLISHED' })) {
                $cur = (Get-LedgerState $i.taskVersionId).state
                if ($cur -in $step.from) {
                    $extra = @{}
                    if ($step.to -eq 'PUBLISHED') { $extra = @{ Evidence = @{ headSHA = $truth.evidence.remoteSha; remoteSHA = $truth.evidence.remoteSha; pushed = $true; reconciled = $true } } }
                    Add-LedgerEvent -TaskVersionId $i.taskVersionId -Event $step.ev -ToState $step.to -RunId $RunId @extra | Out-Null
                }
            }
        }
        return [ordered]@{ ok = $true; reason = 'reconciled: PUBLISHED confirmed on origin'; state = 'PUBLISHED' }
    }
    elseif ($truth.state -eq 'NOT_PUBLISHED_CONFIRMED') {
        if ((Get-LedgerState $i.taskVersionId).state -in @('INTEGRATING', 'REMOTE_RECONCILING')) {
            Add-LedgerEvent -TaskVersionId $i.taskVersionId -Event 'remote-reconciled-not-published' -ToState 'NOT_PUBLISHED_CONFIRMED' -RunId $RunId -Note $truth.reason | Out-Null
        }
        return [ordered]@{ ok = $true; reason = 'reconciled: confirmed NOT published - safe to retry'; state = 'NOT_PUBLISHED_CONFIRMED' }
    }
    else {
        if ((Get-LedgerState $i.taskVersionId).state -eq 'INTEGRATING') {
            Add-LedgerEvent -TaskVersionId $i.taskVersionId -Event 'remote-ambiguous' -ToState 'AMBIGUOUS_REMOTE' -RunId $RunId -Note $truth.reason | Out-Null
        }
        return [ordered]@{ ok = $false; reason = "reconciled: AMBIGUOUS_REMOTE - $($truth.reason); human / retry-reconcile required"; state = 'AMBIGUOUS_REMOTE' }
    }
}

# ---- Wave 0 selftest (own throwaway bare repo) --------------------------------
function Test-IntentSelftest {
    $fail = @()
    $root = Join-Path $env:TEMP ("intentfx-" + [guid]::NewGuid().ToString('N').Substring(0, 10))
    $bare = "$root.git"
    $ec = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try {
        & git init --bare -q -b main $bare 2>$null; if ($LASTEXITCODE -ne 0) { & git init --bare -q $bare; & git -C $bare symbolic-ref HEAD refs/heads/main }
        & git clone -q $bare $root 2>$null
        & git -C $root config user.email t@t; & git -C $root config user.name t
        & git -C $root config commit.gpgsign false; & git -C $root config core.autocrlf false
        Set-Content -LiteralPath (Join-Path $root 'a.txt') -Value 'base' -Encoding ascii
        & git -C $root add -A; & git -C $root commit -q -m base; & git -C $root push -q -u origin main
        $base = (& git -C $root rev-parse HEAD).Trim()

        # scenario 1: push lands, "crash" before ledger, reconciliation confirms PUBLISHED
        & git -C $root checkout -q -b work
        Set-Content -LiteralPath (Join-Path $root 'a.txt') -Value 'candidate change' -Encoding ascii
        & git -C $root commit -aq -m 'candidate'
        $cand = (& git -C $root rev-parse HEAD).Trim()
        $candTree = (& git -C $root rev-parse "HEAD^{tree}").Trim()
        & git -C $root checkout -q main
        & git -C $root merge --no-ff -q -m 'integrate' $cand
        $mergeCommit = (& git -C $root rev-parse HEAD).Trim()

        $runA = 'run-intentaaaa'
        New-IntegrationIntent -RunId $runA -TaskId 'T-i' -TaskVersionId ('1' * 64) -AttemptId 'att-1' -RepoDir $root `
            -CandidateCommit $cand -CandidateTree $candTree -BaseRemoteSha $base | Out-Null
        Update-IntegrationIntentState -RunId $runA -State 'PUSH_ATTEMPTED' -Patch @{ expectedResultCommit = $mergeCommit } | Out-Null
        & git -C $root push -q origin main   # push SUCCEEDS
        # ... process "crashes" here, before writing PUBLISHED ...

        $truth = Resolve-RemoteTruth -RunId $runA -RepoDir $root
        if ($truth.state -ne 'PUBLISHED') { $fail += "scenario1: reconciliation -> $($truth.state), expected PUBLISHED" }
        if ($truth.published -ne $true) { $fail += "scenario1: published != true" }
        $i = Get-IntegrationIntent $runA
        if ($i.state -ne 'PUBLISHED') { $fail += "scenario1: intent state $($i.state)" }

        # scenario 2: remote unreachable during reconciliation -> AMBIGUOUS_REMOTE (never NOT_PUBLISHED)
        $runB = 'run-intentbbbb'
        New-IntegrationIntent -RunId $runB -TaskId 'T-i' -TaskVersionId ('2' * 64) -AttemptId 'att-1' -RepoDir $root `
            -CandidateCommit $cand -CandidateTree $candTree -BaseRemoteSha $base | Out-Null
        Update-IntegrationIntentState -RunId $runB -State 'PUSH_ATTEMPTED' -Patch @{ expectedResultCommit = ('f' * 40) } | Out-Null
        $script:IntentTestFaults = @{ failFetch = $true }
        try {
            $truth = Resolve-RemoteTruth -RunId $runB -RepoDir $root
        } finally { $script:IntentTestFaults = $null }
        if ($truth.state -ne 'AMBIGUOUS_REMOTE') { $fail += "scenario2: fetch failure -> $($truth.state), expected AMBIGUOUS_REMOTE" }
        if ($null -ne $truth.published) { $fail += "scenario2: published should be null (unknown), got $($truth.published)" }

        # scenario 3: nothing pushed, remote at base -> NOT_PUBLISHED_CONFIRMED
        $root2 = Join-Path $env:TEMP ("intentfx2-" + [guid]::NewGuid().ToString('N').Substring(0, 10))
        & git clone -q $bare $root2 2>$null
        & git -C $root2 config user.email t@t; & git -C $root2 config user.name t; & git -C $root2 config commit.gpgsign false
        $base2 = (& git -C $root2 rev-parse HEAD).Trim()
        $runC = 'run-intentcccc'
        New-IntegrationIntent -RunId $runC -TaskId 'T-i' -TaskVersionId ('3' * 64) -AttemptId 'att-1' -RepoDir $root2 `
            -CandidateCommit ('e' * 40) -CandidateTree ('d' * 40) -BaseRemoteSha $base2 | Out-Null
        Update-IntegrationIntentState -RunId $runC -State 'PUSH_ATTEMPTED' | Out-Null
        $truth = Resolve-RemoteTruth -RunId $runC -RepoDir $root2
        if ($truth.state -ne 'NOT_PUBLISHED_CONFIRMED') { $fail += "scenario3: nothing pushed -> $($truth.state), expected NOT_PUBLISHED_CONFIRMED" }
        if ($truth.published -ne $false) { $fail += "scenario3: published != false" }

        Remove-Item -Recurse -Force $root2 -ErrorAction SilentlyContinue
        foreach ($rn in @($runA, $runB, $runC)) { Remove-Item -Force (Get-IntentPath $rn) -ErrorAction SilentlyContinue }
    } finally {
        $ErrorActionPreference = $ec
        Remove-Item -Recurse -Force $root, $bare -ErrorAction SilentlyContinue
    }
    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail) }
}
