<#
lease.ps1 - atomic writer / integration leases for the V2 spine.  (H-05, H-04)

Fixes H-05: V1 Acquire-WriterLock did Test-Path, then read/remove, then write -
three separate operations, so two processes could both "acquire". The owner was a
bare PID, so a reused PID looked like the same holder.

Fixes H-04 (lock half): there is a dedicated global 'integration' namespace so
target/main integration is strictly serial across supervisors.

Design:
  * Acquisition is a single atomic filesystem op (New-ExclusiveFile -> NTFS
    CreateNew). Exactly one racer creates the file; everyone else fails.
  * A lease records leaseId (UUID) + full process identity (host, pid, PROCESS
    START TIME) + taskVersionId + runId + scope + heartbeat. PID reuse is
    detected because the start time will not match.
  * Release is compare-and-delete: only the holder whose leaseId matches may
    delete the lease.
  * A lease whose holder is provably dead (or whose heartbeat is stale AND pid
    dead) is an ORPHAN and may be broken by another acquirer, which is logged.

Namespaces (config.leases.namespaces): scheduler | taskversion | workspace | integration
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:LeaseDir = Join-Path (Get-V2Dir) 'leases'

function Get-LeasePath {
    param([string]$Namespace, [string]$Key)
    $cfg = Get-V2Config
    if ($Namespace -notin @($cfg.leases.namespaces)) { throw "v2 lease: unknown namespace '$Namespace'" }
    Assert-SafeId $Key 'lease key'
    return (Join-Path $script:LeaseDir "$Namespace\$Key.lease")
}

function Read-Lease {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    for ($i = 0; $i -lt 20; $i++) {
        try { return (_ToHashtable ([System.IO.File]::ReadAllText($Path) | ConvertFrom-Json)) }
        catch { Start-Sleep -Milliseconds 15 }
    }
    return $null
}

function Test-LeaseOrphan {
    param($Lease)
    if (-not $Lease) { return $true }
    $cfg = Get-V2Config
    $holderLive = Test-HolderLive $Lease.holder
    if ($holderLive) {
        # holder alive & same process: orphan only if heartbeat is very stale
        $ageSec = ((Get-Date).ToUniversalTime() - [datetime]::Parse($Lease.heartbeat).ToUniversalTime()).TotalSeconds
        return ($ageSec -gt ([int]$cfg.leases.staleAfterSec * 4))
    }
    return $true
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
    $body = ([ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.lease/1'
        leaseId       = $leaseId
        namespace     = $Namespace
        key           = $Key
        taskVersionId = $TaskVersionId
        runId         = $RunId
        scope         = $Scope
        holder        = (Get-ProcessIdentity)
        createdAt     = (Get-Date).ToUniversalTime().ToString('o')
        heartbeat     = (Get-Date).ToUniversalTime().ToString('o')
    })
    $json = ($body | ConvertTo-Json -Depth 10)

    if (New-ExclusiveFile $path $json) {
        Write-V2Log "lease: acquired $Namespace/$Key ($($leaseId.Substring(0,14)))"
        return [ordered]@{ ok = $true; leaseId = $leaseId; path = $path; broke = $false }
    }

    # someone holds it - is it an orphan we may break?
    $held = Read-Lease $path
    if (Test-LeaseOrphan $held) {
        # break-and-retake, but do it atomically: rename the orphan aside first,
        # and only the process that wins the rename may recreate the lease.
        $tomb = "$path.orphan-$([guid]::NewGuid().ToString('N').Substring(0,8))"
        try { [System.IO.File]::Move($path, $tomb) } catch { return (New-Lease -Namespace $Namespace -Key $Key -TaskVersionId $TaskVersionId -RunId $RunId -Scope $Scope) }
        Remove-Item -LiteralPath $tomb -Force -ErrorAction SilentlyContinue
        if (New-ExclusiveFile $path $json) {
            Write-V2Log "lease: BROKE orphan $Namespace/$Key (dead holder pid $($held.holder.pid)) and retook it" 'WARN'
            return [ordered]@{ ok = $true; leaseId = $leaseId; path = $path; broke = $true }
        }
    }
    $held = Read-Lease $path
    return [ordered]@{ ok = $false; leaseId = $null; path = $path; broke = $false; heldBy = $held }
}

function Update-LeaseHeartbeat {
    param([string]$Namespace, [string]$Key, [string]$LeaseId)
    $path = Get-LeasePath $Namespace $Key
    $held = Read-Lease $path
    if (-not $held -or $held.leaseId -ne $LeaseId) { return $false }
    $held.heartbeat = (Get-Date).ToUniversalTime().ToString('o')
    [System.IO.File]::WriteAllText($path, ($held | ConvertTo-Json -Depth 10), (New-Utf8NoBom))
    return $true
}

# compare-and-delete: only the matching leaseId may release
function Remove-Lease {
    param([string]$Namespace, [string]$Key, [string]$LeaseId)
    $path = Get-LeasePath $Namespace $Key
    $held = Read-Lease $path
    if (-not $held) { return $true }
    if ($held.leaseId -ne $LeaseId) {
        Write-V2Log "lease: refusing to release $Namespace/$Key - held by $($held.leaseId), not $LeaseId" 'WARN'
        return $false
    }
    Remove-Item -LiteralPath $path -Force
    Write-V2Log "lease: released $Namespace/$Key"
    return $true
}

# run a scriptblock while holding a lease; always released (unless we time out and
# cannot prove the child tree is dead -> caller decides quarantine, C-05)
function Invoke-WithLease {
    param(
        [string]$Namespace, [string]$Key, [scriptblock]$Body,
        [string]$TaskVersionId = '', [string]$RunId = '', [string]$Scope = ''
    )
    $l = New-Lease -Namespace $Namespace -Key $Key -TaskVersionId $TaskVersionId -RunId $RunId -Scope $Scope
    if (-not $l.ok) { throw "v2 lease: $Namespace/$Key is held (leaseId $($l.heldBy.leaseId), pid $($l.heldBy.holder.pid))" }
    try {
        return (& $Body $l.leaseId)
    } finally {
        [void](Remove-Lease -Namespace $Namespace -Key $Key -LeaseId $l.leaseId)
    }
}
