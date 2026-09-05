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
. (Join-Path $PSScriptRoot 'owner-gate.ps1')

$script:V2State = Join-Path (Get-V2Dir) 'state'

# M3-03: in-process fetch authority. A forged JSON file is NEVER authority.
$script:LastPreflightFetch     = $null
$script:PreflightAuthorityToken = $null

function Get-V2IndexPath { return (Join-Path $script:V2State 'index.v2.json') }

function Get-V2Index {
    $p = Get-V2IndexPath
    if (-not (Test-Path $p)) { throw "v2 preflight: no V2 index at $p (run the V2 reconciler)" }
    return (Read-V2Json $p)
}
# #12 / M3-03: run a REAL fetch and keep the observation as IN-PROCESS authority.
# The persisted last-fetch.json is audit-only and is never read back as proof.
function Invoke-PreflightFetch {
    param([string]$RepoDir = '', [string]$Remote = 'origin')
    if (-not $RepoDir) { $RepoDir = (Get-RepoRoot) }
    $cfg = Get-V2Config
    $token = (New-Nonce)
    $obs = Invoke-GitFetchProven -Dir $RepoDir -Remote $Remote -Target $cfg.target.branch -Nonce $token
    $obs.authorityToken = $token
    $obs.observedAtTicks = [datetime]::UtcNow.Ticks
    $obs.repoDir = ([System.IO.Path]::GetFullPath($RepoDir)).TrimEnd('\')
    $script:LastPreflightFetch      = $obs
    $script:PreflightAuthorityToken = $token
    $obs.auditNote = 'AUDIT ONLY - not authority (M3-03)'
    Write-V2Json (Join-Path $script:V2State 'last-fetch.json') $obs
    return $obs
}

# the frozen fetch requirement, checked against the in-process authority object.
function Test-FetchAuthority {
    param([string]$RepoDir, $Cfg)
    $fail = @()
    $obs = $script:LastPreflightFetch
    if ($null -eq $obs) { return @("no in-process proven git fetch this session (call Invoke-PreflightFetch immediately before Test-Preflight)") }
    if (-not $script:PreflightAuthorityToken -or "$($obs.authorityToken)" -ne "$($script:PreflightAuthorityToken)") { return @("fetch observation is not the one this session minted (forged / stale authority token)") }
    if ("$($obs.nonce)" -ne "$($obs.authorityToken)") { $fail += "fetch nonce != authority token" }
    if ($obs.performed -ne $true) { $fail += "fetch not performed (result $($obs.result)) - NO_REMOTE is not a dispatch path (M3-03)" }
    if ("$($obs.result)" -ne 'OK') { $fail += "fetch result is '$($obs.result)', not OK" }
    if ("$($obs.remote)" -ne 'origin') { $fail += "fetch remote '$($obs.remote)' != origin" }
    if ("$($obs.target)" -ne "$($Cfg.target.branch)") { $fail += "fetch target '$($obs.target)' != '$($Cfg.target.branch)'" }
    $localHead = (Get-GitHeadV2 $RepoDir)
    if ("$($obs.beforeSHA)" -ne $localHead) { $fail += "fetch beforeSHA '$($obs.beforeSHA)' != current local HEAD '$localHead'" }
    if ([string]::IsNullOrWhiteSpace([string]$obs.observedRemoteSHA)) { $fail += "fetch produced no observed remote SHA" }
    else {
        $localTarget = (Get-GitHeadV2 $RepoDir)
        if ("$($obs.observedRemoteSHA)" -ne $localTarget) { $fail += "observed remote $($Cfg.target.branch) ($([string]$obs.observedRemoteSHA)) != local ($localTarget)" }
    }
    if (-not $obs.observedAtTicks) { $fail += "fetch observation has no in-process timestamp" }
    else {
        $age = ([datetime]::UtcNow.Ticks - [long]$obs.observedAtTicks) / 10000000.0
        if ($age -gt [int]$Cfg.target.requireFetchWithinSec) { $fail += "in-process fetch is stale ($([int]$age)s)" }
    }
    $rd = ([System.IO.Path]::GetFullPath($RepoDir)).TrimEnd('\')
    if ("$($obs.repoDir)" -ne $rd) { $fail += "fetch was observed for a different repo dir" }
    return @($fail)
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

    # 4. proven remote fetch freshness - IN-PROCESS authority only (#12 / M3-03)
    $fail += @(Test-FetchAuthority -RepoDir $RepoDir -Cfg $cfg)

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

    # 6. contract frozen + consistent with the index. A derived index can NEVER
    #    weaken the frozen contract (#9): taskId, gate and dependencies must match.
    $contract = $null
    try { $contract = Get-Contract $TaskVersionId } catch { $fail += $_.Exception.Message }
    if ($contract -and $idx -and $contract.planningHead -ne $idx.planningHead) {
        $fail += "contract planningHead != index planningHead (spec frozen against a different tree)"
    }
    if ($contract -and $me) {
        if ("$($me.taskId)" -ne "$($contract.taskId)") { $fail += "index taskId '$($me.taskId)' != frozen contract taskId '$($contract.taskId)'" }
        $idxGate = $(if ([string]::IsNullOrWhiteSpace([string]$me.gate)) { 'none' } else { [string]$me.gate })
        $cGate   = $(if ([string]::IsNullOrWhiteSpace([string]$contract.gate)) { 'none' } else { [string]$contract.gate })
        if ($idxGate -ne $cGate) {
            $fail += "STALE/INCONSISTENT AUTHORITY: index gate '$idxGate' != frozen contract gate '$cGate' - a derived index cannot add or drop a gate; reconcile / re-freeze required"
        }
        $idxDeps = @(@($me.deps) | Where-Object { $_ } | ForEach-Object { [string]$_ } | Sort-Object -Unique)
        $cDeps   = @(@($contract.dependencies) | Where-Object { $_ } | ForEach-Object { [string]$_ } | Sort-Object -Unique)
        if (($idxDeps -join '|') -ne ($cDeps -join '|')) {
            $fail += "STALE/INCONSISTENT AUTHORITY: index dependencies {$($idxDeps -join ',')} != frozen contract dependencies {$($cDeps -join ',')} - a derived index cannot remove a dependency"
        }
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
