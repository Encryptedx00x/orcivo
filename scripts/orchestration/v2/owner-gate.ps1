<#
owner-gate.ps1 - durable, exact-version owner approval authority.

This promotes the pre-existing synthetic gate record into a real operator-owned
record without changing its runtime namespace. Approval authorizes only the
declared gate for one frozen taskVersionId; every other orchestration guard
remains authoritative.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'contract.ps1')

$script:GateSchemaVersion = 'orcivo.orchestration.v2.gate/2'
$script:GateHashKeys = @(
    'schemaVersion','gateId','taskId','taskVersionId','specHash','decision',
    'reason','approvalScope','requiredApprovalType','approvalIdentity',
    'approvalSource','approvalTimestamp','nonce'
)
$script:GateRecordKeys = @($script:GateHashKeys + 'gateHash')

function Get-HumanGatePath {
    param([string]$TaskVersionId, [string]$GateId)
    if ($TaskVersionId -notmatch '^[0-9a-f]{64}$') { throw 'v2 owner gate: bad taskVersionId' }
    Assert-SafeId $GateId 'gateId'
    return (Join-Path (Get-V2Dir) "gates\$TaskVersionId\$GateId.json")
}

function _GateHash {
    param($Gate)
    $bound = [ordered]@{}
    foreach ($key in $script:GateHashKeys) { $bound[$key] = [string]$Gate.$key }
    $bound.v = (Get-V2Config).gates.hashVersion
    return (New-ContentHash $bound)
}

function Get-TopLevelJsonPropertyNames {
    param([Parameter(Mandatory)][string]$Json)
    $names = New-Object System.Collections.Generic.List[string]
    $depth = 0; $inString = $false; $escaped = $false; $start = -1
    for ($i=0; $i -lt $Json.Length; $i++) {
        $ch = $Json[$i]
        if ($inString) {
            if ($escaped) { $escaped=$false; continue }
            if ($ch -eq '\') { $escaped=$true; continue }
            if ($ch -eq '"') {
                $inString=$false
                if ($depth -eq 1 -and $start -ge 0) {
                    $j=$i+1; while($j -lt $Json.Length -and [char]::IsWhiteSpace($Json[$j])){$j++}
                    if($j -lt $Json.Length -and $Json[$j] -eq ':') {
                        $token=$Json.Substring($start,$i-$start+1)
                        $names.Add([string]($token | ConvertFrom-Json))
                    }
                }
                $start=-1
            }
            continue
        }
        switch ($ch) {
            '"' { $inString=$true; $start=$i }
            '{' { $depth++ }
            '}' { $depth-- }
        }
    }
    return @($names.ToArray())
}

function Read-OwnerGateRecordStrict {
    param([Parameter(Mandatory)][string]$Path)
    $rawText = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    if ([string]::IsNullOrWhiteSpace($rawText) -or $rawText.Length -gt 16000) { throw 'gate record is empty or oversized' }
    $names = @(Get-TopLevelJsonPropertyNames $rawText)
    if ($names.Count -ne ($names | Sort-Object -Unique).Count) { throw 'gate record contains duplicate fields' }
    $typed = ConvertFrom-JsonTyped $rawText
    if ($typed -isnot [System.Collections.IDictionary]) { throw 'gate record root must be an object' }
    $actual = @($typed.Keys | ForEach-Object { [string]$_ } | Sort-Object)
    $expected = @($script:GateRecordKeys | Sort-Object)
    if (($actual -join '|') -ne ($expected -join '|')) { throw 'gate record fields do not match the closed schema' }

    foreach($key in $script:GateRecordKeys) {
        if ($typed[$key] -isnot [string]) { throw "gate field '$key' must be a string" }
    }
    if ([string]$typed.schemaVersion -ne $script:GateSchemaVersion) { throw 'unsupported gate schemaVersion' }
    if (-not (Test-SafeId ([string]$typed.gateId))) { throw 'invalid gateId' }
    if (-not (Test-SafeId ([string]$typed.taskId))) { throw 'invalid taskId' }
    if ([string]$typed.taskVersionId -notmatch '^[0-9a-f]{64}$') { throw 'invalid taskVersionId' }
    if ([string]$typed.specHash -notmatch '^sha256:[0-9a-f]{64}$') { throw 'invalid specHash' }
    if ([string]$typed.decision -ne 'APPROVED') { throw 'decision is not APPROVED' }
    if ([string]$typed.requiredApprovalType -ne 'human') { throw 'requiredApprovalType is not human' }
    if ([string]::IsNullOrWhiteSpace([string]$typed.reason) -or ([string]$typed.reason).Length -gt 512) { throw 'invalid gate reason' }
    if ([string]::IsNullOrWhiteSpace([string]$typed.approvalScope) -or ([string]$typed.approvalScope).Length -gt 4096) { throw 'invalid approval scope' }
    foreach($key in @('approvalIdentity','approvalSource')) {
        if ([string]::IsNullOrWhiteSpace([string]$typed[$key]) -or ([string]$typed[$key]).Length -gt 256) { throw "invalid $key" }
    }
    $stamp=[datetimeoffset]::MinValue
    if (-not [datetimeoffset]::TryParse([string]$typed.approvalTimestamp,[ref]$stamp) -or -not ([string]$typed.approvalTimestamp).EndsWith('Z')) { throw 'invalid approvalTimestamp' }
    if ([string]$typed.nonce -notmatch '^[0-9a-f]{32}$') { throw 'invalid nonce' }
    if ([string]$typed.gateHash -notmatch '^sha256:[0-9a-f]{64}$') { throw 'invalid gateHash' }
    return (_ToHashtable ($rawText | ConvertFrom-Json))
}

function Write-OwnerGateRecordAtomic {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)]$Record)
    $dir=Split-Path -Parent $Path
    if(-not(Test-Path -LiteralPath $dir)){New-Item -ItemType Directory -Force -Path $dir|Out-Null}
    $tmp=Join-Path $dir ('.' + [System.IO.Path]::GetFileName($Path) + '.' + [guid]::NewGuid().ToString('N') + '.tmp')
    $bytes=(New-Utf8NoBom).GetBytes((ConvertTo-CanonicalJson $Record))
    $stream=New-Object System.IO.FileStream($tmp,[System.IO.FileMode]::CreateNew,[System.IO.FileAccess]::Write,[System.IO.FileShare]::None)
    try{$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
    try{[System.IO.File]::Move($tmp,$Path)}catch{Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue;throw 'owner gate already exists or could not be committed atomically'}
}

function Get-OwnerGateApprovalStatus {
    param([Parameter(Mandatory)][string]$TaskId,[Parameter(Mandatory)][string]$TaskVersionId,[Parameter(Mandatory)][string]$GateId)
    $path=Get-HumanGatePath $TaskVersionId $GateId
    if(Test-Path -LiteralPath $path){
        try{$gate=Read-OwnerGateRecordStrict $path}catch{return [ordered]@{satisfied=$false;approval='INVALID';reason=$_.Exception.Message;path=$path}}
        if([string]$gate.taskId -ne $TaskId){return [ordered]@{satisfied=$false;approval='INVALID';reason='gate is for a different taskId';path=$path}}
        if([string]$gate.taskVersionId -ne $TaskVersionId){return [ordered]@{satisfied=$false;approval='INVALID';reason='gate is for a different taskVersionId';path=$path}}
        if([string]$gate.gateId -ne $GateId){return [ordered]@{satisfied=$false;approval='INVALID';reason='gateId mismatch';path=$path}}
        if((_GateHash $gate) -ne [string]$gate.gateHash){return [ordered]@{satisfied=$false;approval='INVALID';reason='gateHash mismatch (tampered)';path=$path}}
        $contract=$null;try{$contract=Get-Contract $TaskVersionId}catch{return [ordered]@{satisfied=$false;approval='INVALID';reason='frozen contract is unavailable or invalid';path=$path}}
        if([string]$contract.taskId -ne $TaskId -or [string]$contract.gate -ne $GateId){return [ordered]@{satisfied=$false;approval='INVALID';reason='approval does not match the frozen contract authority';path=$path}}
        if([string]$gate.specHash -ne [string]$contract.specHash){return [ordered]@{satisfied=$false;approval='STALE';reason='approval was for a different spec hash';path=$path}}
        return [ordered]@{satisfied=$true;approval='APPROVED';reason='approved';path=$path;approvedBy=$gate.approvalIdentity;approvedAt=$gate.approvalTimestamp;approvalScope=$gate.approvalScope;approvalSource=$gate.approvalSource;gateHash=$gate.gateHash}
    }

    $root=Join-Path (Get-V2Dir) 'gates'
    if(Test-Path -LiteralPath $root){
        foreach($candidate in @(Get-ChildItem -LiteralPath $root -Recurse -File -Filter "$GateId.json" -ErrorAction SilentlyContinue)){
            if($candidate.FullName -eq $path){continue}
            try{$other=Read-OwnerGateRecordStrict $candidate.FullName}catch{continue}
            if([string]$other.taskId -eq $TaskId -and [string]$other.gateId -eq $GateId -and [string]$other.taskVersionId -ne $TaskVersionId){
                return [ordered]@{satisfied=$false;approval='STALE';reason='approval exists only for another taskVersionId';path=$path}
            }
        }
    }
    return [ordered]@{satisfied=$false;approval='MISSING';reason='no approval event';path=$path}
}

function Get-HumanGateStatus {
    param([string]$TaskVersionId,[string]$GateId)
    $contract=$null;try{$contract=Get-Contract $TaskVersionId}catch{return [ordered]@{satisfied=$false;approval='INVALID';reason='frozen contract is unavailable or invalid'}}
    return (Get-OwnerGateApprovalStatus -TaskId ([string]$contract.taskId) -TaskVersionId $TaskVersionId -GateId $GateId)
}

function New-OwnerGateApproval {
    param(
        [Parameter(Mandatory)][string]$TaskId,[Parameter(Mandatory)][string]$TaskVersionId,[Parameter(Mandatory)][string]$GateId,
        [Parameter(Mandatory)][string]$ApprovalScope,[string]$ApprovedBy='owner',[string]$ApprovalSource='pilot.ps1 approve-gate'
    )
    $contract=Get-Contract $TaskVersionId
    if([string]$contract.taskId -ne $TaskId){throw 'owner gate taskId does not match the frozen contract'}
    if([string]$contract.gate -ne $GateId -or $GateId -eq 'none'){throw 'owner gate does not match the frozen contract'}
    $existing=Get-OwnerGateApprovalStatus -TaskId $TaskId -TaskVersionId $TaskVersionId -GateId $GateId
    if($existing.approval -eq 'APPROVED'){
        if($existing.approvalScope -ne $ApprovalScope -or $existing.approvedBy -ne $ApprovedBy -or $existing.approvalSource -ne $ApprovalSource){throw 'an exact-version approval already exists with different authority metadata'}
        return (Read-OwnerGateRecordStrict $existing.path)
    }
    if($existing.approval -eq 'INVALID'){throw "existing owner gate is invalid: $($existing.reason)"}
    $gate=[ordered]@{
        schemaVersion=$script:GateSchemaVersion;gateId=$GateId;taskId=$TaskId;taskVersionId=$TaskVersionId;specHash=[string]$contract.specHash
        decision='APPROVED';reason="Level C: $GateId";approvalScope=$ApprovalScope;requiredApprovalType='human'
        approvalIdentity=$ApprovedBy;approvalSource=$ApprovalSource;approvalTimestamp=(Get-Date).ToUniversalTime().ToString('o');nonce=(New-Nonce)
    }
    $gate.gateHash=_GateHash $gate
    Write-OwnerGateRecordAtomic -Path (Get-HumanGatePath $TaskVersionId $GateId) -Record $gate
    return $gate
}

function New-SyntheticGateApproval {
    param([string]$TaskVersionId,[string]$GateId,[string]$RepoDir='',[string]$ApprovedBy='synthetic-test-harness')
    if(-not $RepoDir){$RepoDir=Get-RepoRoot}
    Assert-DisposableRoot -RepoDir $RepoDir -Why 'approve a synthetic gate'|Out-Null
    $contract=Get-Contract $TaskVersionId
    return (New-OwnerGateApproval -TaskId ([string]$contract.taskId) -TaskVersionId $TaskVersionId -GateId $GateId -ApprovalScope 'isolated disposable test fixture only' -ApprovedBy $ApprovedBy -ApprovalSource 'synthetic-test-harness')
}
