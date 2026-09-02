<#
preflight.ps1 - the mandatory gate BEFORE any model is spent.  (H-07)

Fixes H-07: V1 used the current local HEAD as the base without proving the target
branch, a clean tree, remote sync, or that the reconciled index matched that HEAD;
dirty/stale conditions were only discovered after checks and models were spent.

Every V2 dispatch entrypoint MUST call Test-Preflight and refuse to dispatch on
ANY failure. Nothing here is controllable by a task spec.
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

# recorded after a real `git fetch` so preflight can prove remote freshness
function Register-Fetch {
    param([string]$Remote = 'origin')
    Write-V2Json (Join-Path $script:V2State 'last-fetch.json') ([ordered]@{
        remote = $Remote; at = (Get-Date).ToUniversalTime().ToString('o')
        head = (Get-GitHeadV2)
    })
}

function Test-Preflight {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [string]$RepoDir = ''
    )
    if (-not $RepoDir) { $RepoDir = (Get-RepoRoot) }
    $cfg  = Get-V2Config
    $fail = @()

    # 0. never against the real repo
    try { Assert-NotRealRepo 'preflight' } catch { $fail += $_.Exception.Message }

    # 1. kill switch
    $ks = Join-Path (Get-V2Dir) $cfg.budgets.killSwitchFile
    if (Test-Path $ks) { $fail += "global kill switch present ($ks)" }

    # 2. target branch + clean authority tree
    $branch = (& git -C $RepoDir rev-parse --abbrev-ref HEAD).Trim()
    if ($branch -ne $cfg.target.branch) { $fail += "authority checkout is on '$branch', not target '$($cfg.target.branch)'" }
    if ($cfg.target.requireCleanAuthorityTree -and -not (Test-GitCleanV2 $RepoDir)) { $fail += "authority working tree is dirty" }

    # 3. planning committed
    $planDirty = @(& git -C $RepoDir status --porcelain=v1 -- .planning CLAUDE.md AGENTS.md)
    if ($planDirty.Count -gt 0) { $fail += "uncommitted planning/policy changes ($($planDirty.Count) path(s)) - commit before dispatch" }

    # 4. remote fetch freshness
    $lf = Join-Path $script:V2State 'last-fetch.json'
    if (-not (Test-Path $lf)) { $fail += "no recorded git fetch (call Register-Fetch after fetching origin)" }
    else {
        $age = ((Get-Date).ToUniversalTime() - [datetime]::Parse((Read-V2Json $lf).at).ToUniversalTime()).TotalSeconds
        if ($age -gt [int]$cfg.target.requireFetchWithinSec) { $fail += "git fetch is stale ($([int]$age)s > $($cfg.target.requireFetchWithinSec)s)" }
    }

    # 5. index reconciled + pinned to this HEAD
    $idx = $null
    try { $idx = Get-V2Index } catch { $fail += $_.Exception.Message }
    if ($idx) {
        if (-not $idx.reconciled) { $fail += "V2 index not reconciled" }
        $head = (Get-GitHeadV2 $RepoDir)
        if ($idx.planningHead -ne $head) { $fail += "index planningHead ($($idx.planningHead)) != authority HEAD ($head)" }
    }

    # 6. contract frozen + consistent with the index
    $contract = $null
    try { $contract = Get-Contract $TaskVersionId } catch { $fail += "contract not frozen for $TaskVersionId" }
    if ($contract -and $idx -and $contract.planningHead -ne $idx.planningHead) {
        $fail += "contract planningHead != index planningHead (spec frozen against a different tree)"
    }

    # 7. ledger: exactly-once
    $disp = Test-CanDispatch $TaskVersionId
    if (-not $disp.ok) { $fail += "ledger refuses dispatch: $($disp.reasons -join '; ')" }

    # 8. dependency gates satisfied (dep taskVersionIds must be PUBLISHED)
    if ($idx) {
        $me = @($idx.tasks | Where-Object { $_.taskVersionId -eq $TaskVersionId }) | Select-Object -First 1
        if ($me) {
            foreach ($dep in @($me.deps)) {
                if (($dep -isnot [string]) -or -not $dep) { continue }
                if ($dep -notmatch '^[0-9a-f]{64}$') { $fail += "dependency '$dep' is not a taskVersionId"; continue }
                $ds = Get-LedgerState $dep
                if (-not $ds.published) { $fail += "dependency $($dep.Substring(0,12)) is not PUBLISHED (state $($ds.state))" }
            }
            if ($me.gate -and $me.gate -ne 'none') {
                $g = Get-HumanGateStatus $TaskVersionId $me.gate
                if (-not $g.satisfied) { $fail += "human gate '$($me.gate)' not satisfied: $($g.reason)" }
            }
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
        if (-not (Test-LeaseOrphan $held)) { $fail += "an active taskversion lease already exists (leaseId $($held.leaseId))" }
    }

    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail); checkedAt = (Get-Date).ToUniversalTime().ToString('o') }
}

# ---- human gates: durable, not planning text (partial - C-04 full is deferred) ----
# The spine models a gate decision as a signed-ish JSON event file, so a task
# cannot un-gate itself by editing planning prose. Full first-class gates
# (approvalNonce chain, external identity) land with C-04 in the next session.
function Get-HumanGatePath {
    param([string]$TaskVersionId, [string]$GateId)
    Assert-SafeId $GateId 'gateId'
    return (Join-Path (Get-V2Dir) "gates\$TaskVersionId\$GateId.json")
}

function Get-HumanGateStatus {
    param([string]$TaskVersionId, [string]$GateId)
    $p = Get-HumanGatePath $TaskVersionId $GateId
    if (-not (Test-Path $p)) { return [ordered]@{ satisfied = $false; reason = 'no approval event' } }
    $g = Read-V2Json $p
    $c = $null
    try { $c = Get-Contract $TaskVersionId } catch { }
    if ($g.status -ne 'APPROVED') { return [ordered]@{ satisfied = $false; reason = "status $($g.status)" } }
    if ($c -and $g.approvedSpecHash -ne $c.specHash) { return [ordered]@{ satisfied = $false; reason = 'approval was for a different spec hash (stale)' } }
    return [ordered]@{ satisfied = $true; reason = 'approved'; approvedBy = $g.approvedBy; approvedAt = $g.approvedAt }
}

# test-only synthetic approval (never approve a real gate)
function New-SyntheticGateApproval {
    param([string]$TaskVersionId, [string]$GateId, [string]$ApprovedBy = 'synthetic-test')
    Assert-NotRealRepo 'approve a gate'
    $c = Get-Contract $TaskVersionId
    $g = [ordered]@{
        schemaVersion   = 'orcivo.orchestration.v2.gate/1'
        taskVersionId   = $TaskVersionId
        gateId          = $GateId
        status          = 'APPROVED'
        reason          = 'synthetic approval for the deterministic test harness'
        requiredApprovalType = 'human'
        approvedBy      = $ApprovedBy
        approvedAt      = (Get-Date).ToUniversalTime().ToString('o')
        approvedSpecHash = $c.specHash
        approvalNonce   = [guid]::NewGuid().ToString('N')
    }
    $g.gateHash = New-ContentHash $g
    Write-V2Json (Get-HumanGatePath $TaskVersionId $GateId) $g
    return $g
}
