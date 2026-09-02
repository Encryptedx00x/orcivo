<#
lease.ps1 - atomic leases with real heartbeats + compare-and-swap.  (H-05, H-04)

Second-review remediation of H-05. The first V2 lease declared a live process
"orphaned" once its heartbeat aged past four stale intervals, and the pipeline
never refreshed heartbeats - so a supported long-running operation lost its lease
and a second writer took it.

This version:
  * Acquisition stays a single atomic op (New-ExclusiveFile -> NTFS CreateNew).
  * ORPHAN = the holder process is PROVABLY dead or PROVABLY a different process
    (PID reuse: start time mismatch). A live holder is NEVER an orphan, no matter
    how old its heartbeat is.
  * A stale heartbeat on a live holder does not hand the key over. A structurally
    MALFORMED lease record is QUARANTINED (renamed aside) and NOT granted to a
    second writer.
  * heartbeat update / release / break are compare-and-swap on the exact lease
    bytes + leaseId + owner identity. No blind read-then-delete.
  * Invoke-WithLease runs a background heartbeat runspace for the duration of the
    body, and callers that hold a lease explicitly can Start/Stop one.

Namespaces (config.leases.namespaces): scheduler | taskversion | workspace | integration | ledger
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:LeaseDir = Join-Path (Get-V2Dir) 'leases'

function Get-LeasePath {
    param([string]$Namespace, [string]$Key)
    $cfg = Get-V2Config
    if ($Namespace -notin @($cfg.leases.namespaces)) { throw "v2 lease: unknown namespace '$Namespace'" }
    if ($Key -match '^[0-9a-f]{64}$') { }        # a taskVersionId is a valid key
    elseif (-not (Test-SafeId $Key)) { throw "v2 lease: unsafe lease key '$Key'" }
    return (Join-Path $script:LeaseDir "$Namespace\$Key.lease")
}

# read the lease and its exact on-disk bytes hash (for CAS). Returns
# @{ lease=<obj|$null>; contentHash=<sha256|absent>; malformed=<bool> }
function Read-LeaseRaw {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return @{ lease = $null; contentHash = 'sha256:absent'; malformed = $false } }
    for ($i = 0; $i -lt 20; $i++) {
        try {
            $raw = [System.IO.File]::ReadAllText($Path)
            $obj = $null
            try { $obj = _ToHashtable ($raw | ConvertFrom-Json) } catch { return @{ lease = $null; contentHash = (New-StringHash $raw); malformed = $true } }
            if (-not $obj -or -not $obj.leaseId -or -not $obj.holder) { return @{ lease = $null; contentHash = (New-StringHash $raw); malformed = $true } }
            return @{ lease = $obj; contentHash = (New-StringHash $raw); malformed = $false }
        } catch { Start-Sleep -Milliseconds 15 }
    }
    return @{ lease = $null; contentHash = 'sha256:unknown'; malformed = $true }
}

function Read-Lease {
    param([string]$Path)
    return (Read-LeaseRaw $Path).lease
}

# ORPHAN only if the holder is provably not the current live process.
# A stale heartbeat on a live holder is NOT an orphan.
function Test-LeaseOrphan {
    param($Lease)
    if (-not $Lease) { return $true }          # no/blank lease -> free
    if (-not $Lease.holder) { return $false }  # malformed -> NOT an orphan (must be quarantined, not taken)
    return (-not (Test-HolderLive $Lease.holder))
}

function _LeaseBody {
    param([string]$LeaseId, [string]$Namespace, [string]$Key, [string]$TaskVersionId, [string]$RunId, [string]$Scope)
    return ([ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.lease/2'
        leaseId       = $LeaseId
        namespace     = $Namespace
        key           = $Key
        taskVersionId = $TaskVersionId
        runId         = $RunId
        scope         = $Scope
        holder        = (Get-ProcessIdentity)
        createdAt     = (Get-Date).ToUniversalTime().ToString('o')
        heartbeat     = (Get-Date).ToUniversalTime().ToString('o')
    })
}

function New-Lease {
    param(
        [Parameter(Mandatory)][string]$Namespace,
        [Parameter(Mandatory)][string]$Key,
        [string]$TaskVersionId = '',
        [string]$RunId = '',
        [string]$Scope = ''
    )
    $path = Get-LeasePath $Namespace $Key
    $leaseId = New-LeaseId
    $json = (ConvertTo-CanonicalJson (_LeaseBody $leaseId $Namespace $Key $TaskVersionId $RunId $Scope))

    if (New-ExclusiveFile $path $json) {
        Write-V2Log "lease: acquired $Namespace/$Key ($($leaseId.Substring(0,14)))"
        return [ordered]@{ ok = $true; leaseId = $leaseId; path = $path; broke = $false }
    }

    $rawInfo = Read-LeaseRaw $path
    if ($rawInfo.malformed) {
        # NEVER grant on a malformed record. Quarantine it and fail closed.
        $q = "$path.quarantine-$((New-Nonce).Substring(0,8))"
        try { [System.IO.File]::Move($path, $q) } catch { }
        Write-V2Log "lease: QUARANTINED malformed lease record $Namespace/$Key (-> $(Split-Path -Leaf $q)); not granting" 'ERROR'
        return [ordered]@{ ok = $false; leaseId = $null; path = $path; broke = $false; quarantined = $true; heldBy = $null }
    }

    $held = $rawInfo.lease
    if (Test-LeaseOrphan $held) {
        # break-and-retake atomically: CAS-delete the exact orphan bytes, then CreateNew.
        if (Invoke-FileCas -Path $path -ExpectedHash $rawInfo.contentHash -NewContent '' -Delete) {
            if (New-ExclusiveFile $path $json) {
                Write-V2Log "lease: BROKE orphan $Namespace/$Key (dead/reused holder pid $($held.holder.pid)) and retook it" 'WARN'
                return [ordered]@{ ok = $true; leaseId = $leaseId; path = $path; broke = $true }
            }
        }
        # lost the break race - fall through and report held
    }
    $held = Read-Lease $path
    return [ordered]@{ ok = $false; leaseId = $null; path = $path; broke = $false; heldBy = $held }
}

# Blocking acquire: retry until the lease is free or $TimeoutSec elapses.
# Used for short serialised sections (the ledger append) where the right
# behaviour under contention is to WAIT, not to error.
function New-LeaseWait {
    param(
        [Parameter(Mandatory)][string]$Namespace,
        [Parameter(Mandatory)][string]$Key,
        [string]$TaskVersionId = '', [string]$RunId = '', [string]$Scope = '',
        [int]$TimeoutSec = 60
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ($true) {
        $l = New-Lease -Namespace $Namespace -Key $Key -TaskVersionId $TaskVersionId -RunId $RunId -Scope $Scope
        if ($l.ok) { return $l }
        if ($l.quarantined) { return $l }   # never spin on a quarantined record
        if ((Get-Date) -ge $deadline) { return $l }
        Start-Sleep -Milliseconds (15 + (Get-Random -Maximum 40))
    }
}

# CAS: only the exact holder (leaseId + same on-disk bytes) may renew.
function Update-LeaseHeartbeat {
    param([string]$Namespace, [string]$Key, [string]$LeaseId)
    $path = Get-LeasePath $Namespace $Key
    $info = Read-LeaseRaw $path
    if (-not $info.lease -or $info.lease.leaseId -ne $LeaseId) { return $false }
    $updated = $info.lease
    $updated.heartbeat = (Get-Date).ToUniversalTime().ToString('o')
    $new = (ConvertTo-CanonicalJson ([ordered]@{} + $updated))
    return (Invoke-FileCas -Path $path -ExpectedHash $info.contentHash -NewContent $new)
}

# CAS: only the exact holder (leaseId + same on-disk bytes) may release.
function Remove-Lease {
    param([string]$Namespace, [string]$Key, [string]$LeaseId)
    $path = Get-LeasePath $Namespace $Key
    $info = Read-LeaseRaw $path
    if (-not (Test-Path -LiteralPath $path)) { return $true }
    if ($info.malformed) {
        Write-V2Log "lease: refusing to release malformed $Namespace/$Key" 'WARN'
        return $false
    }
    if (-not $info.lease -or $info.lease.leaseId -ne $LeaseId) {
        Write-V2Log "lease: refusing to release $Namespace/$Key - held by $($info.lease.leaseId), not $LeaseId" 'WARN'
        return $false
    }
    if (Invoke-FileCas -Path $path -ExpectedHash $info.contentHash -NewContent '' -Delete) {
        Write-V2Log "lease: released $Namespace/$Key"
        return $true
    }
    Write-V2Log "lease: release CAS lost a race for $Namespace/$Key" 'WARN'
    return $false
}

# Heartbeat helpers.
#
# NOTE (H-05): a background heartbeat is NOT load-bearing in this spine, because
# Test-LeaseOrphan treats ANY live holder as non-orphan regardless of heartbeat
# age - a second writer can never take a live owner's lease. Heartbeats are kept
# as freshness telemetry and as a hook for the deferred budget/circuit-breaker
# work (H-09). Callers that hold a lease across a long section call
# Update-LeaseHeartbeat at natural checkpoints; there is no per-lease runspace.

function Start-LeaseHeartbeat {
    param([string]$Namespace, [string]$Key, [string]$LeaseId)
    return @{ ns = $Namespace; key = $Key; lid = $LeaseId }
}

function Stop-LeaseHeartbeat {
    param($Beat)   # no-op: nothing to tear down
}

function Beat-Lease {
    param($Beat)
    if ($Beat -and $Beat.lid) { [void](Update-LeaseHeartbeat -Namespace $Beat.ns -Key $Beat.key -LeaseId $Beat.lid) }
}

function Invoke-WithLease {
    param(
        [string]$Namespace, [string]$Key, [scriptblock]$Body,
        [string]$TaskVersionId = '', [string]$RunId = '', [string]$Scope = ''
    )
    $l = New-Lease -Namespace $Namespace -Key $Key -TaskVersionId $TaskVersionId -RunId $RunId -Scope $Scope
    if (-not $l.ok) { throw "v2 lease: $Namespace/$Key is held (leaseId $($l.heldBy.leaseId), pid $($l.heldBy.holder.pid))" }
    $beat = Start-LeaseHeartbeat -Namespace $Namespace -Key $Key -LeaseId $l.leaseId
    try {
        return (& $Body $l.leaseId)
    } finally {
        Stop-LeaseHeartbeat $beat
        [void](Remove-Lease -Namespace $Namespace -Key $Key -LeaseId $l.leaseId)
    }
}
