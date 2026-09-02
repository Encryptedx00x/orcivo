<#
preflight.ps1 - the mandatory gate BEFORE any model is spent.  (H-07, C-04 partial, #11-#13)

Second-review remediation:
  * H-07/#11 - a requested taskVersionId that is NOT present in the reconciled
    index is REJECTED unconditionally (empty index, stale index, wrong
    planningHead, missing task -> all reject).
  * #12 - remote freshness is PROVEN by running a real fetch through
    Invoke-GitFetchProven and binding preflight to that observation. A
    task-provided "fetchedAt" is never trusted.
  * #13 - a human gate's gateHash is recomputed on read over
    {gateId, taskVersionId, specHash, decision, approvalIdentity,
     approvalTimestamp, nonce}; any field tamper fails the gate.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'ledger.ps1')
. (Join-Path $PSScriptRoot 'contract.ps1')
. (Join-Path $PSScriptRoot 'lease.ps1')

$script:V2State = Join-Path (Get-V2Dir) 'state'

function Get-V2IndexPath { return (Join-Path $script:V2State 'index.v2.json') }

function Get-V2Index {
    $p = Get-V2IndexPath
    if (-not (Test-Path $p)) { throw "v2 preflight: no V2 index at $p (run the V2 reconciler)" }
    return (Read-V2Json $p)
}

# #12: run a REAL fetch and persist the structured observation preflight binds to.
function Invoke-PreflightFetch {
    param([string]$RepoDir = '', [string]$Remote = 'origin')
    if (-not $RepoDir) { $RepoDir = (Get-RepoRoot) }
    $cfg = Get-V2Config
    $obs = Invoke-GitFetchProven -Dir $RepoDir -Remote $Remote -Target $cfg.target.branch
    Write-V2Json (Join-Path $script:V2State 'last-fetch.json') $obs
    return $obs
}

function Test-Preflight {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [string]$RepoDir = ''
    )
    if (-not $RepoDir) { $RepoDir = (Get-RepoRoot) }
    $cfg  = Get-V2Config
    $fail = @()

    # 1. kill switch
    $ks = Join-Path (Get-V2Dir) $cfg.budgets.killSwitchFile
    if (Test-Path $ks) { $fail += "global kill switch present ($ks)" }

    # 2. target branch + clean authority tree
    $branch = (& git -C $RepoDir rev-parse --abbrev-ref HEAD).Trim()
    if ($branch -ne $cfg.target.branch) { $fail += "authority checkout is on '$branch', not target '$($cfg.target.branch)'" }
    if ($cfg.target.requireCleanAuthorityTree -and -not (Test-GitCleanV2 $RepoDir)) { $fail += "authority working tree is dirty" }

    # 3. planning committed
    $planDirty = @(& git -C $RepoDir status --porcelain=v1 -- .planning CLAUDE.md AGENTS.md)
    if ($planDirty.Count -gt 0) { $fail += "uncommitted planning/policy changes ($($planDirty.Count) path(s))" }

    # 4. proven remote fetch freshness (#12)
    $lf = Join-Path $script:V2State 'last-fetch.json'
    if (-not (Test-Path $lf)) { $fail += "no proven git fetch (call Invoke-PreflightFetch)" }
    else {
        $obs = Read-V2Json $lf
        if ("$($obs.result)" -notin @('OK','NO_REMOTE')) { $fail += "last fetch did not succeed ($($obs.result))" }
        if (-not $obs.at) { $fail += "fetch observation has no timestamp" }
        else {
            $age = ((Get-Date).ToUniversalTime() - [datetime]::Parse($obs.at).ToUniversalTime()).TotalSeconds
            if ($age -gt [int]$cfg.target.requireFetchWithinSec) { $fail += "proven fetch is stale ($([int]$age)s)" }
        }
        if ($obs.result -eq 'OK' -and $obs.observedRemoteSHA) {
            $localTarget = (Get-GitHeadV2 $RepoDir)
            if ($obs.observedRemoteSHA -ne $localTarget) { $fail += "observed remote $($cfg.target.branch) ($($obs.observedRemoteSHA.Substring(0,10))) != local ($($localTarget.Substring(0,10)))" }
        }
    }

    # 5. index reconciled + pinned to this HEAD
    $idx = $null
    try { $idx = Get-V2Index } catch { $fail += $_.Exception.Message }
    $me = $null
    if ($idx) {
        if (-not $idx.reconciled) { $fail += "V2 index not reconciled" }
        $head = (Get-GitHeadV2 $RepoDir)
        if ($idx.planningHead -ne $head) { $fail += "index planningHead ($($idx.planningHead)) != authority HEAD ($head)" }
        # #11: the requested version MUST be in the reconciled index. No condition.
        $me = @($idx.tasks | Where-Object { $_.taskVersionId -eq $TaskVersionId }) | Select-Object -First 1
        if (-not $me) { $fail += "requested taskVersionId $($TaskVersionId.Substring(0,12)) is NOT in the reconciled index (reject)" }
    } else {
        $fail += "no reconciled index - cannot verify the requested taskVersionId exists (reject)"
    }

    # 6. contract frozen + consistent with the index
    $contract = $null
    try { $contract = Get-Contract $TaskVersionId } catch { $fail += $_.Exception.Message }
    if ($contract -and $idx -and $contract.planningHead -ne $idx.planningHead) {
        $fail += "contract planningHead != index planningHead (spec frozen against a different tree)"
    }

    # 7. ledger: exactly-once + not corrupt
    $disp = Test-CanDispatch $TaskVersionId
    if (-not $disp.ok) { $fail += "ledger refuses dispatch: $($disp.reasons -join '; ')" }

    # 8. dependency gates satisfied
    if ($me) {
        foreach ($dep in @($me.deps)) {
            if (($dep -isnot [string]) -or -not $dep) { continue }
            if ($dep -notmatch '^[0-9a-f]{64}$') { $fail += "dependency '$dep' is not a taskVersionId"; continue }
            $ds = Get-LedgerState $dep
            if ($ds.corrupt) { $fail += "dependency $($dep.Substring(0,12)) ledger is CORRUPT" }
            elseif (-not $ds.published) { $fail += "dependency $($dep.Substring(0,12)) is not PUBLISHED (state $($ds.state))" }
        }
        # WAITING_HUMAN tasks resume ONLY via a satisfied gate
        $st = Get-LedgerState $TaskVersionId
        if ($me.gate -and $me.gate -ne 'none') {
            $g = Get-HumanGateStatus $TaskVersionId $me.gate
            if (-not $g.satisfied) { $fail += "human gate '$($me.gate)' not satisfied: $($g.reason)" }
        } elseif ($st.state -eq 'WAITING_HUMAN') {
            $fail += "task is WAITING_HUMAN with no declared gate - a human must act outside the spine"
        }
    }

    # 9. provider health
    foreach ($p in @('primary','fallback')) {
        $bin = $cfg.providers.($cfg.providers.$p).bin
        if (-not (Get-Command $bin -ErrorAction SilentlyContinue)) { $fail += "provider '$($cfg.providers.$p)' binary '$bin' not on PATH" }
    }

    # 10. no duplicate active lease for this task version
    $lp = Join-Path (Get-V2Dir) "leases\taskversion\$($TaskVersionId).lease"
    if (Test-Path $lp) {
        $held = Read-Lease $lp
        if ($held -and -not (Test-LeaseOrphan $held)) { $fail += "an active taskversion lease already exists (leaseId $($held.leaseId))" }
    }

    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail); checkedAt = (Get-Date).ToUniversalTime().ToString('o') }
}

# ---- human gates: durable, hash-bound decisions (#13; C-04 full still deferred) ----
$script:GateHashKeys = @('gateId','taskVersionId','specHash','decision','approvalIdentity','approvalTimestamp','nonce')

function Get-HumanGatePath {
    param([string]$TaskVersionId, [string]$GateId)
    Assert-SafeId $GateId 'gateId'
    return (Join-Path (Get-V2Dir) "gates\$TaskVersionId\$GateId.json")
}

function _GateHash {
    param($G)
    $h = [ordered]@{}
    foreach ($k in $script:GateHashKeys) { $h[$k] = [string]$G.$k }
    $h.v = (Get-V2Config).gates.hashVersion
    return (New-ContentHash $h)
}

function Get-HumanGateStatus {
    param([string]$TaskVersionId, [string]$GateId)
    $p = Get-HumanGatePath $TaskVersionId $GateId
    if (-not (Test-Path $p)) { return [ordered]@{ satisfied = $false; reason = 'no approval event' } }
    $g = $null
    try { $g = Read-V2Json $p } catch { return [ordered]@{ satisfied = $false; reason = 'gate file not readable' } }

    if ((_GateHash $g) -ne $g.gateHash) { return [ordered]@{ satisfied = $false; reason = 'gateHash mismatch (tampered)' } }
    if ("$($g.taskVersionId)" -ne $TaskVersionId) { return [ordered]@{ satisfied = $false; reason = 'gate is for a different taskVersionId' } }
    if ("$($g.gateId)" -ne $GateId) { return [ordered]@{ satisfied = $false; reason = 'gateId mismatch' } }
    if ("$($g.decision)" -ne 'APPROVED') { return [ordered]@{ satisfied = $false; reason = "decision $($g.decision)" } }

    $c = $null
    try { $c = Get-Contract $TaskVersionId } catch { }
    if ($c -and "$($g.specHash)" -ne "$($c.specHash)") { return [ordered]@{ satisfied = $false; reason = 'approval was for a different spec hash (stale)' } }

    return [ordered]@{ satisfied = $true; reason = 'approved'; approvedBy = $g.approvalIdentity; approvedAt = $g.approvalTimestamp }
}

# test-only synthetic approval. Requires the isolated disposable-repo harness -
# there is no env var and no code path to approve a real gate.
function New-SyntheticGateApproval {
    param([string]$TaskVersionId, [string]$GateId, [string]$RepoDir = '', [string]$ApprovedBy = 'synthetic-test-harness')
    if (-not $RepoDir) { $RepoDir = (Get-RepoRoot) }
    Assert-DisposableRoot -RepoDir $RepoDir -Why 'approve a synthetic gate'
    $c = Get-Contract $TaskVersionId
    $g = [ordered]@{
        schemaVersion     = 'orcivo.orchestration.v2.gate/2'
        gateId            = $GateId
        taskVersionId     = $TaskVersionId
        specHash          = $c.specHash
        decision          = 'APPROVED'
        reason            = 'synthetic approval for the isolated deterministic test harness'
        requiredApprovalType = 'human'
        approvalIdentity  = $ApprovedBy
        approvalTimestamp = (Get-Date).ToUniversalTime().ToString('o')
        nonce             = (New-Nonce)
    }
    $g.gateHash = _GateHash $g
    Write-V2JsonCanonical (Get-HumanGatePath $TaskVersionId $GateId) $g
    return $g
}
