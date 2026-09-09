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

Third-review remediation (H3-04): a malformed lease record now produces a
DURABLE quarantine marker (`<key>.lease.QUARANTINED`). While that marker exists,
NO New-Lease for the namespace/key can acquire - first, second, eighth,
simultaneous, all refuse. The marker is cleared ONLY by the explicit
Repair-QuarantinedLease recovery primitive, which validates namespace/key, proves
there is no live owner, records who/what requested recovery and a recovery token,
and is entirely separate from normal acquire. There is no silent auto-recovery.

L3-01: heartbeats are NOT a background renewal. Renewal happens only at explicit
Beat-Lease checkpoints; live-process identity is the load-bearing anti-theft
rule. Start/Stop-LeaseHeartbeat are checkpoint bookkeeping, not a runspace.

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

function Get-LeaseQuarantinePath {
    param([string]$Namespace, [string]$Key)
    return ((Get-LeasePath $Namespace $Key) + '.QUARANTINED')
}

# H3-04: a namespace/key is quarantined iff the marker file exists. A malformed
# marker still counts as quarantined - fail closed.
function Test-LeaseQuarantined {
    param([string]$Namespace, [string]$Key)
    return (Test-Path -LiteralPath (Get-LeaseQuarantinePath $Namespace $Key))
}

function _WriteQuarantineMarker {
    param([string]$Namespace, [string]$Key, [string]$Reason, [string]$MovedTo = '')
    $qp = Get-LeaseQuarantinePath $Namespace $Key
    $body = ConvertTo-CanonicalJson ([ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.lease-quarantine/1'
        namespace     = $Namespace
        key           = $Key
        quarantinedAt = (Get-Date).ToUniversalTime().ToString('o')
        reason        = $Reason
        byProcess     = (Get-ProcessIdentity)
        originalRecordMovedTo = $MovedTo
        recovered     = $false
    })
    if (-not (New-ExclusiveFile $qp $body)) {
        # marker already exists - already quarantined, that is fine
    }
    Write-V2Log "lease: QUARANTINE marker set for $Namespace/$Key ($Reason)" 'ERROR'
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

    # H3-04: a durable quarantine marker blocks EVERY acquire until explicit recovery.
    if (Test-LeaseQuarantined $Namespace $Key) {
        return [ordered]@{ ok = $false; leaseId = $null; path = $path; broke = $false; quarantined = $true; heldBy = $null }
    }

    $leaseId = New-LeaseId
    $json = (ConvertTo-CanonicalJson (_LeaseBody $leaseId $Namespace $Key $TaskVersionId $RunId $Scope))

    if (New-ExclusiveFile $path $json) {
        # re-check the marker: it may have appeared between the two ops.
        if (Test-LeaseQuarantined $Namespace $Key) {
            [void](Invoke-FileCas -Path $path -ExpectedHash (New-StringHash $json) -NewContent '' -Delete)
            return [ordered]@{ ok = $false; leaseId = $null; path = $path; broke = $false; quarantined = $true; heldBy = $null }
        }
        Write-V2Log "lease: acquired $Namespace/$Key ($($leaseId.Substring(0,14)))"
        return [ordered]@{ ok = $true; leaseId = $leaseId; path = $path; broke = $false }
    }

    $rawInfo = Read-LeaseRaw $path
    if ($rawInfo.malformed) {
        # NEVER grant on a malformed record. DURABLE quarantine + fail closed.
        $q = "$path.malformed-$((New-Nonce).Substring(0,8))"
        try { [System.IO.File]::Move($path, $q) } catch { }
        _WriteQuarantineMarker -Namespace $Namespace -Key $Key -Reason 'malformed lease record' -MovedTo (Split-Path -Leaf $q)
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
        $q = "$path.malformed-$((New-Nonce).Substring(0,8))"
        try { [System.IO.File]::Move($path, $q) } catch { }
        _WriteQuarantineMarker -Namespace $Namespace -Key $Key -Reason 'malformed lease record on release' -MovedTo (Split-Path -Leaf $q)
        Write-V2Log "lease: refusing to release malformed $Namespace/$Key - quarantined" 'WARN'
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

# Scheduler/main is global infrastructure, rather than task-owned state.  A
# dead holder may therefore be reconciled only through this explicit, hash-bound
# operation.  It deliberately does not call New-Lease: breaking and retaking a
# lease is appropriate for a live caller, whereas reconciliation must first
# preserve the exact old bytes and leave a durable audit trail.
function Get-OrphanedSchedulerLeaseReconciliationPaths {
    param([Parameter(Mandatory)][string]$LeaseId,[Parameter(Mandatory)][string]$LeaseHash)
    if($LeaseId -notmatch '^lease-[0-9a-f]{32}$'){throw 'scheduler lease reconciliation: invalid lease id'}
    if($LeaseHash -notmatch '^sha256:[0-9a-f]{64}$'){throw 'scheduler lease reconciliation: invalid lease hash'}
    $path=Get-LeasePath scheduler main
    $tag="$LeaseId-$($LeaseHash.Substring(7,16))"
    return [ordered]@{
        leasePath=$path
        archivePath="$path.orphaned-$tag.archive"
        tombstonePath="$path.orphaned-$tag.tombstone.json"
        releasedPath="$path.orphaned-$tag.released.json"
    }
}

function Write-LeaseBytesExclusive {
    param([Parameter(Mandatory)][string]$Path,[Parameter(Mandatory)][byte[]]$Bytes)
    $dir=Split-Path -Parent $Path;if($dir -and -not(Test-Path -LiteralPath $dir)){New-Item -ItemType Directory -Force -Path $dir|Out-Null}
    try{
        $fs=New-Object System.IO.FileStream($Path,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write,[System.IO.FileShare]::None)
        try{$fs.Write($Bytes,0,$Bytes.Length);$fs.Flush($true)}finally{$fs.Dispose()}
        return $true
    }catch [System.IO.IOException]{if(Test-Path -LiteralPath $Path){return $false};throw}
}

function Get-OrphanedSchedulerLeaseOwnerEvidence {
    param([Parameter(Mandatory)][string]$OwnerRunId)
    $checkpointPath=Join-Path (Get-V2Dir) "pilot\$OwnerRunId.json"
    $checkpoint=$null;$checkpointState='ABSENT'
    if(Test-Path -LiteralPath $checkpointPath){
        try{$checkpoint=Read-V2Json $checkpointPath}catch{throw 'scheduler lease reconciliation: owner checkpoint is malformed'}
        if([string]$checkpoint.runId -ne $OwnerRunId){throw 'scheduler lease reconciliation: owner checkpoint run binding mismatch'}
        $checkpointState='BOUND'
        if($checkpoint.holder -and (Test-HolderLive (_ToHashtable $checkpoint.holder))){return [ordered]@{active=$true;reason='owner checkpoint holder is active';checkpoint=$checkpointState;dispatcherStates=@();ledgerRuns=@()}}
    }
    $dispatcherStates=@()
    $taskDir=Join-Path (Get-V2Dir) 'dispatcher\tasks'
    if(Test-Path -LiteralPath $taskDir){
        foreach($path in @(Get-ChildItem -LiteralPath $taskDir -File -Filter '*.json' -ErrorAction SilentlyContinue)){
            try{$state=Read-V2Json $path.FullName}catch{throw 'scheduler lease reconciliation: a dispatcher task state is malformed'}
            if([string]$state.runId -eq $OwnerRunId){
                $dispatcherStates+=,[ordered]@{path=$path.FullName;status=[string]$state.status;stage=[string]$state.stage;taskVersionId=[string]$state.taskVersionId}
                if([string]$state.status -in @('RUNNING','DISPATCHED','CHECKING','REVIEWING','INTEGRATING')){return [ordered]@{active=$true;reason='owner dispatcher state is active';checkpoint=$checkpointState;dispatcherStates=$dispatcherStates;ledgerRuns=@()}}
            }
        }
    }
    $ledgerRuns=@()
    $ledgerDir=Join-Path (Get-V2Dir) 'ledger'
    if(Test-Path -LiteralPath $ledgerDir){
        foreach($path in @(Get-ChildItem -LiteralPath $ledgerDir -File -Filter '*.jsonl' -ErrorAction SilentlyContinue)){
            foreach($event in @(Read-JsonLines $path.FullName)){
                if([string]$event.runId -eq $OwnerRunId){$ledgerRuns+=,[ordered]@{path=$path.FullName;seq=[int]$event.seq;toState=[string]$event.toState}}
            }
        }
    }
    return [ordered]@{active=$false;reason='owner run is not active';checkpoint=$checkpointState;dispatcherStates=$dispatcherStates;ledgerRuns=$ledgerRuns}
}

function Test-OrphanedSchedulerLeaseProcessSafety {
    param([Parameter(Mandatory)]$Lease,[Parameter(Mandatory)][string]$OwnerRunId)
    if([string]$Lease.holder.host -ne [string]$env:COMPUTERNAME){return [ordered]@{ok=$false;reason='lease holder host is not the local host'}}
    $holderProcessId=[int]$Lease.holder.pid
    if(Get-Process -Id $holderProcessId -ErrorAction SilentlyContinue){return [ordered]@{ok=$false;reason='lease holder PID is still present (including PID reuse)'}}
    # A child can outlive the parent.  Treat every direct descendant as live
    # work, irrespective of its executable name.
    $children=@(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue|Where-Object{[int]$_.ParentProcessId -eq $holderProcessId})
    if($children.Count){return [ordered]@{ok=$false;reason='a descendant of the lease holder is still active'}}
    foreach($p in @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)){
        if([int]$p.ProcessId -eq $PID){continue}
        if([string]$p.CommandLine -match [regex]::Escape($OwnerRunId)){return [ordered]@{ok=$false;reason='a process for the owner run is still active'}}
    }
    return [ordered]@{ok=$true;reason='holder, descendants, and owner-run processes are absent'}
}

function New-OrphanedSchedulerLeaseTombstone {
    param([Parameter(Mandatory)]$Lease,[Parameter(Mandatory)][string]$LeaseHash,[Parameter(Mandatory)][string]$ArchivePath,[Parameter(Mandatory)][string]$ArchiveHash,[Parameter(Mandatory)]$OwnerEvidence)
    $material=[ordered]@{
        schemaVersion='orcivo.orchestration.v2.orphaned-scheduler-lease/1'
        leaseId=[string]$Lease.leaseId;leaseHash=$LeaseHash;holder=$Lease.holder
        ownerRunId=[string]$Lease.runId;taskVersionId=[string]$Lease.taskVersionId;scope=[string]$Lease.scope
        createdAt=[string]$Lease.createdAt;heartbeat=[string]$Lease.heartbeat
        nonce=[string]$Lease.nonce;fencingToken=[string]$Lease.fencingToken
        archivePath=$ArchivePath;archiveHash=$ArchiveHash;reason='HOLDER_DEAD'
        authorizedBy='owner';source='owner decision via pilot.ps1';ownerEvidence=$OwnerEvidence
    }
    return [ordered]@{}+$material+[ordered]@{reconciliationHash=(New-ContentHash $material);preparedAt=(Get-Date).ToUniversalTime().ToString('o')}
}

function Test-OrphanedSchedulerLeaseTombstone {
    param([Parameter(Mandatory)]$Tombstone,[Parameter(Mandatory)][string]$LeaseId,[Parameter(Mandatory)][string]$LeaseHash,[Parameter(Mandatory)][string]$OwnerRunId)
    if([string]$Tombstone.schemaVersion -ne 'orcivo.orchestration.v2.orphaned-scheduler-lease/1' -or [string]$Tombstone.leaseId -ne $LeaseId -or [string]$Tombstone.leaseHash -ne $LeaseHash -or [string]$Tombstone.ownerRunId -ne $OwnerRunId -or [string]$Tombstone.reason -ne 'HOLDER_DEAD'){return $false}
    $material=[ordered]@{schemaVersion=[string]$Tombstone.schemaVersion;leaseId=[string]$Tombstone.leaseId;leaseHash=[string]$Tombstone.leaseHash;holder=$Tombstone.holder;ownerRunId=[string]$Tombstone.ownerRunId;taskVersionId=[string]$Tombstone.taskVersionId;scope=[string]$Tombstone.scope;createdAt=[string]$Tombstone.createdAt;heartbeat=[string]$Tombstone.heartbeat;nonce=[string]$Tombstone.nonce;fencingToken=[string]$Tombstone.fencingToken;archivePath=[string]$Tombstone.archivePath;archiveHash=[string]$Tombstone.archiveHash;reason=[string]$Tombstone.reason;authorizedBy=[string]$Tombstone.authorizedBy;source=[string]$Tombstone.source;ownerEvidence=$Tombstone.ownerEvidence}
    return ((New-ContentHash $material) -eq [string]$Tombstone.reconciliationHash)
}

function Reconcile-OrphanedSchedulerLease {
    param(
        [Parameter(Mandatory)][string]$LeaseId,[Parameter(Mandatory)][string]$LeaseHash,
        [Parameter(Mandatory)][string]$OwnerRunId,[Parameter(Mandatory)][string]$HolderHost,
        [Parameter(Mandatory)][int]$HolderPid,[Parameter(Mandatory)][string]$HolderStartTime,
        [string]$ExpectedTaskVersionId='',[string]$ExpectedScope='',[string]$ExpectedNonce='',[string]$ExpectedFencingToken=''
    )
    $paths=Get-OrphanedSchedulerLeaseReconciliationPaths -LeaseId $LeaseId -LeaseHash $LeaseHash
    $path=[string]$paths.leasePath
    $archive=[string]$paths.archivePath;$tombstonePath=[string]$paths.tombstonePath;$releasedPath=[string]$paths.releasedPath
    $info=Read-LeaseRaw $path
    if(-not $info.lease){
        if(-not(Test-Path -LiteralPath $archive) -or -not(Test-Path -LiteralPath $tombstonePath)){throw 'scheduler lease reconciliation: lease absent without a complete reconciliation trail'}
        $tombstone=Read-V2Json $tombstonePath
        if(-not(Test-OrphanedSchedulerLeaseTombstone -Tombstone $tombstone -LeaseId $LeaseId -LeaseHash $LeaseHash -OwnerRunId $OwnerRunId) -or (New-FileHash $archive) -ne $LeaseHash){throw 'scheduler lease reconciliation: existing reconciliation trail is invalid'}
        if(-not(Test-Path -LiteralPath $releasedPath)){
            $receipt=[ordered]@{schemaVersion='orcivo.orchestration.v2.orphaned-scheduler-lease-release/1';reconciliationHash=[string]$tombstone.reconciliationHash;leaseId=$LeaseId;leaseHash=$LeaseHash;releasedAt=(Get-Date).ToUniversalTime().ToString('o');releasedByProcess=(Get-ProcessIdentity)}
            if(-not(New-ExclusiveFile $releasedPath (ConvertTo-CanonicalJson $receipt))){throw 'scheduler lease reconciliation: release receipt creation raced'}
        }
        return [ordered]@{status='ALREADY_RECONCILED';leaseId=$LeaseId;leaseHash=$LeaseHash;archivePath=$archive;tombstonePath=$tombstonePath;releasedPath=$releasedPath}
    }
    if($info.malformed -or $info.contentHash -ne $LeaseHash){throw 'scheduler lease reconciliation: lease hash or schema changed'}
    $lease=$info.lease
    if([string]$lease.schemaVersion -ne 'orcivo.orchestration.v2.lease/2' -or [string]$lease.namespace -ne 'scheduler' -or [string]$lease.key -ne 'main' -or [string]$lease.leaseId -ne $LeaseId){throw 'scheduler lease reconciliation: lease identity mismatch'}
    if([string]$lease.runId -ne $OwnerRunId -or [string]$lease.taskVersionId -ne $ExpectedTaskVersionId -or [string]$lease.scope -ne $ExpectedScope){throw 'scheduler lease reconciliation: owner run, task version, or scope mismatch'}
    if([string]$lease.holder.host -ne $HolderHost -or [int]$lease.holder.pid -ne $HolderPid -or [string]$lease.holder.startTime -ne $HolderStartTime){throw 'scheduler lease reconciliation: holder identity mismatch'}
    if($lease.Contains('nonce') -and [string]$lease.nonce -ne $ExpectedNonce){throw 'scheduler lease reconciliation: nonce mismatch'}
    if($lease.Contains('fencingToken') -and [string]$lease.fencingToken -ne $ExpectedFencingToken){throw 'scheduler lease reconciliation: fencing token mismatch'}
    $processSafety=Test-OrphanedSchedulerLeaseProcessSafety -Lease $lease -OwnerRunId $OwnerRunId
    if(-not $processSafety.ok){throw "scheduler lease reconciliation: $($processSafety.reason)"}
    $ownerEvidence=Get-OrphanedSchedulerLeaseOwnerEvidence -OwnerRunId $OwnerRunId
    if($ownerEvidence.active){throw "scheduler lease reconciliation: $($ownerEvidence.reason)"}
    # Re-read immediately before preserving any evidence.  This catches heartbeat
    # renewal, a substituted holder, and every byte-level replacement.
    $again=Read-LeaseRaw $path
    if($again.malformed -or -not $again.lease -or $again.contentHash -ne $LeaseHash -or [string]$again.lease.leaseId -ne $LeaseId -or [string]$again.lease.heartbeat -ne [string]$lease.heartbeat -or [string]$again.lease.holder.startTime -ne $HolderStartTime){throw 'scheduler lease reconciliation: lease changed during verification'}
    $bytes=[System.IO.File]::ReadAllBytes($path)
    if((New-FileHash $path) -ne $LeaseHash){throw 'scheduler lease reconciliation: lease bytes changed before archive'}
    if(-not(Write-LeaseBytesExclusive -Path $archive -Bytes $bytes) -and (New-FileHash $archive) -ne $LeaseHash){throw 'scheduler lease reconciliation: archive path contains different bytes'}
    if($script:OrphanedSchedulerLeaseAfterArchiveHook){& $script:OrphanedSchedulerLeaseAfterArchiveHook}
    $tombstone=New-OrphanedSchedulerLeaseTombstone -Lease $lease -LeaseHash $LeaseHash -ArchivePath $archive -ArchiveHash (New-FileHash $archive) -OwnerEvidence $ownerEvidence
    $tombstoneJson=ConvertTo-CanonicalJson $tombstone
    if(-not(New-ExclusiveFile $tombstonePath $tombstoneJson)){
        $existing=Read-V2Json $tombstonePath
        if(-not(Test-OrphanedSchedulerLeaseTombstone -Tombstone $existing -LeaseId $LeaseId -LeaseHash $LeaseHash -OwnerRunId $OwnerRunId)){throw 'scheduler lease reconciliation: tombstone path contains conflicting record'}
        $tombstone=$existing
    }
    if($script:OrphanedSchedulerLeaseBeforeReleaseHook){& $script:OrphanedSchedulerLeaseBeforeReleaseHook}
    if(-not(Invoke-FileCas -Path $path -ExpectedHash $LeaseHash -NewContent '' -Delete)){throw 'scheduler lease reconciliation: lease changed before release'}
    $receipt=[ordered]@{schemaVersion='orcivo.orchestration.v2.orphaned-scheduler-lease-release/1';reconciliationHash=[string]$tombstone.reconciliationHash;leaseId=$LeaseId;leaseHash=$LeaseHash;releasedAt=(Get-Date).ToUniversalTime().ToString('o');releasedByProcess=(Get-ProcessIdentity)}
    if(-not(New-ExclusiveFile $releasedPath (ConvertTo-CanonicalJson $receipt))){throw 'scheduler lease reconciliation: release receipt creation raced'}
    return [ordered]@{status='RECONCILED';leaseId=$LeaseId;leaseHash=$LeaseHash;archivePath=$archive;tombstonePath=$tombstonePath;releasedPath=$releasedPath;ownerEvidence=$ownerEvidence}
}

# H3-04: the ONLY way out of lease quarantine. Explicit, authenticated, audited,
# and separate from acquire. Proves there is no live owner where it can.
function Repair-QuarantinedLease {
    param(
        [Parameter(Mandatory)][string]$Namespace,
        [Parameter(Mandatory)][string]$Key,
        [Parameter(Mandatory)][string]$RecoveryToken,
        [Parameter(Mandatory)][string]$RequestedBy
    )
    $qp = Get-LeaseQuarantinePath $Namespace $Key
    if (-not (Test-Path -LiteralPath $qp)) { return [ordered]@{ ok = $false; reason = 'not quarantined' } }
    [void](Get-LeasePath $Namespace $Key)   # validates namespace + key grammar
    if (-not $RecoveryToken -or $RecoveryToken.Length -lt 8) { return [ordered]@{ ok = $false; reason = 'recovery token missing/too short' } }

    $path = Get-LeasePath $Namespace $Key
    $noLiveOwner = $true
    $residual = @(Get-ChildItem -LiteralPath (Split-Path $path) -Filter ((Split-Path -Leaf $path) + '*') -ErrorAction SilentlyContinue)
    foreach ($r in $residual) {
        if ($r.FullName -eq $qp) { continue }
        $l = Read-Lease $r.FullName
        if ($l -and $l.holder -and (Test-HolderLive $l.holder)) { $noLiveOwner = $false }
    }
    if (-not $noLiveOwner) { return [ordered]@{ ok = $false; reason = 'a residual lease record still has a LIVE owner - not safe to recover' } }

    $marker = $null
    try { $marker = Read-V2Json $qp } catch { }
    $rec = [ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.lease-quarantine/1'
        namespace = $Namespace; key = $Key
        quarantinedAt = $(if ($marker) { $marker.quarantinedAt } else { $null })
        reason = $(if ($marker) { $marker.reason } else { 'unknown (marker unreadable)' })
        recovered = $true
        recoveredAt = (Get-Date).ToUniversalTime().ToString('o')
        recoveredBy = $RequestedBy
        recoveryToken = (New-StringHash $RecoveryToken)
        verifiedNoLiveOwner = $true
        recoveredByProcess = (Get-ProcessIdentity)
    }
    $audit = Join-Path (Get-V2Dir) "leases\$Namespace\$Key.lease.recovered-$((New-Nonce).Substring(0,8)).json"
    Write-V2JsonCanonical $audit $rec
    foreach ($r in $residual) { try { Remove-Item -LiteralPath $r.FullName -Force } catch { } }
    Write-V2Log "lease: RECOVERED $Namespace/$Key by $RequestedBy (audit $(Split-Path -Leaf $audit))" 'WARN'
    return [ordered]@{ ok = $true; reason = 'recovered'; audit = $audit }
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
