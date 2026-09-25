<# RD-01..RD-20 dispatcher regression suite. -IncludeReal invokes both paid CLIs. #>
param([switch]$IncludeReal,[string[]]$Only=@())
$ErrorActionPreference='Stop'
$V2=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$Repo=[System.IO.Path]::GetFullPath((Join-Path $V2 '..\..\..'))
$Root=Join-Path ([System.IO.Path]::GetTempPath()) ("orcivo-rd-suite-"+[guid]::NewGuid().ToString('N'))
$Fixture=Join-Path $Root 'repo'
$results=New-Object System.Collections.Generic.List[object]

function Ok([string]$Id,[string]$Detail){$results.Add([ordered]@{id=$Id;status='PASS';detail=$Detail})}
function Fail([string]$Id,[string]$Detail){$results.Add([ordered]@{id=$Id;status='FAIL';detail=$Detail})}
function Check([string]$Id,[scriptblock]$Body){
    if($Only.Count -and $Id -notin $Only){return}
    $hadRunnerProbe=Test-Path variable:script:DispatcherRecoveryRunnerProbe
    $priorRunnerProbe=$(if($hadRunnerProbe){$script:DispatcherRecoveryRunnerProbe}else{$null})
    $script:DispatcherRecoveryRunnerProbe=$false
    try{& $Body;Ok $Id 'ok'}catch{Fail $Id $_.Exception.Message}
    finally{
        if($hadRunnerProbe){$script:DispatcherRecoveryRunnerProbe=$priorRunnerProbe}
        else{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue}
    }
}
function Assert-True($Value,[string]$Message){if(-not $Value){throw $Message}}
function Write-Utf8([string]$Path,[string]$Text){$d=Split-Path -Parent $Path;if($d){New-Item -ItemType Directory -Force -Path $d|Out-Null};[IO.File]::WriteAllText($Path,$Text,(New-Object Text.UTF8Encoding($false)))}
function Get-SchemaNodePropertyNames($Node){
    if($Node -is [System.Collections.IDictionary]){return @($Node.Keys)}
    if($Node -is [System.Management.Automation.PSCustomObject]){return @($Node.PSObject.Properties.Name)}
    return @()
}
function Get-SchemaNodeProperty($Node,[string]$Name){
    if($Node -is [System.Collections.IDictionary]){return $Node[$Name]}
    return $Node.$Name
}
function Test-DeepSeekStrictSchemaNode($Node,[string]$Path,$Errors){
    if($null -eq $Node){$Errors.Add("$Path is null");return}
    $keys=@(Get-SchemaNodePropertyNames $Node)
    $allowed=@('$schema','$id','type','properties','required','additionalProperties','enum','pattern','minimum','maximum','anyOf','items','const')
    foreach($key in $keys){if($key -notin $allowed){$Errors.Add("$Path uses unsupported keyword '$key'")}}
    if($keys -contains 'type'){
        $type=Get-SchemaNodeProperty $Node 'type'
        if(-not($type -is [string]) -or $type -notin @('string','number','integer','boolean','null','object','array')){$Errors.Add("$Path has unsupported type encoding")}
    }
    if($keys -contains 'anyOf'){
        $branches=@(Get-SchemaNodeProperty $Node 'anyOf')
        if($branches.Count -lt 2){$Errors.Add("$Path has malformed anyOf")}
        $nullBranches=@($branches|Where-Object{(Get-SchemaNodePropertyNames $_) -contains 'type' -and [string](Get-SchemaNodeProperty $_ 'type') -eq 'null'})
        if($nullBranches.Count){
            if($branches.Count -ne 2 -or $nullBranches.Count -ne 1){$Errors.Add("$Path has malformed nullable anyOf")}
            $other=@($branches|Where-Object{[string](Get-SchemaNodeProperty $_ 'type') -ne 'null'})
            if($other.Count -ne 1 -or -not((Get-SchemaNodeProperty $other[0] 'type') -is [string])){$Errors.Add("$Path has malformed nullable branch")}
        }
        for($i=0;$i -lt $branches.Count;$i++){Test-DeepSeekStrictSchemaNode $branches[$i] "$Path.anyOf[$i]" $Errors}
    }
    if($keys -contains 'type' -and [string](Get-SchemaNodeProperty $Node 'type') -eq 'object'){
        if(-not($keys -contains 'properties')){$Errors.Add("$Path object has no properties")}
        if(-not($keys -contains 'additionalProperties') -or (Get-SchemaNodeProperty $Node 'additionalProperties') -ne $false){$Errors.Add("$Path object is not closed")}
        $declared=@(Get-SchemaNodePropertyNames (Get-SchemaNodeProperty $Node 'properties')|Sort-Object)
        $required=@($(if($keys -contains 'required'){@(Get-SchemaNodeProperty $Node 'required')}else{@()})|Sort-Object)
        if(($declared -join '|') -ne ($required -join '|')){$Errors.Add("$Path required properties do not exactly match declared properties")}
    }
    if($keys -contains 'properties'){
        $properties=Get-SchemaNodeProperty $Node 'properties'
        foreach($name in @(Get-SchemaNodePropertyNames $properties)){Test-DeepSeekStrictSchemaNode (Get-SchemaNodeProperty $properties $name) "$Path.properties.$name" $Errors}
    }
    if($keys -contains 'items'){Test-DeepSeekStrictSchemaNode (Get-SchemaNodeProperty $Node 'items') "$Path.items" $Errors}
}
function Get-DeepSeekStrictSchemaCompatibilityErrors($Schema){
    $errors=New-Object System.Collections.Generic.List[string]
    Test-DeepSeekStrictSchemaNode $Schema '$' $errors
    return @($errors.ToArray())
}
function Task([string]$Id,[string[]]$Deps=@(),[string]$Risk='B',[string]$Gate='none',[string]$Status='SCHEDULED'){
    return [ordered]@{taskId=$Id;title="task $Id";type='TEST';description="implement $Id";acceptance="AC1: $Id complete";dependencies=@($Deps);scope=@('work/');risk=$Risk;ownerGate=$Gate;blockedByGates=@('G1');candidateConstraints=[ordered]@{};verificationProfile='B';phaseGate='P1';status=$Status}
}
function Source([object[]]$Tasks){return [ordered]@{schemaVersion='orcivo.dispatcher-test/1';batch='RD';state='OWNER_APPROVED';approvedBy='test';approvedAt='2026-09-03';gates=[ordered]@{G1=[ordered]@{kind='TEST';state='PASS'}};phaseOrder=@('P1');tasks=@($Tasks)}}

function New-HistoricalResumeFixture([string]$Id){
    $workspace=Join-Path $Root ("historical-"+$Id);& git init -b main --quiet $workspace
    Write-Utf8 (Join-Path $workspace 'work.txt') "base`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m base --quiet
    $base=(& git -C $workspace rev-parse HEAD).Trim()
    Write-Utf8 (Join-Path $workspace 'work.txt') "reviewed`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m reviewed --quiet
    $historical=(& git -C $workspace rev-parse HEAD).Trim()
    Write-Utf8 (Join-Path $workspace 'work.txt') "corrected`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m corrected --quiet
    $implementation=(& git -C $workspace rev-parse HEAD).Trim()

    $task=Task ("HIST-"+$Id) @() 'C' 'level-c-persistent-migration'
    $sourcePath=Join-Path $Fixture ("historical-"+$Id+".tasks.json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
    $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0]
    $contract=New-DispatcherContract -Task $task -TaskSource $source
    New-OwnerGateApproval -TaskId $task.taskId -TaskVersionId $contract.taskVersionId -GateId $task.ownerGate -ApprovalScope 'fixture-local recovery only' -ApprovedBy owner -ApprovalSource 'dispatcher recovery regression'|Out-Null

    $runId='run-historical-'+$Id.ToLowerInvariant();$runRoot=Join-Path (Get-V2Dir) "runs\$runId";$reviewDir=Join-Path $runRoot 'review-002'
    Write-Utf8 (Join-Path $reviewDir 'diff.patch') "diff --git a/work.txt b/work.txt`n-old`n+new`n"
    $historicalBindings=Get-AttestationBindings -TaskVersionId $contract.taskVersionId -WorktreeDir $workspace -BaseSha $base -HeadSha $historical
    New-Attestation -Kind check -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$historicalBindings) -Result PASS|Out-Null
    $historicalReview=New-Attestation -Kind review -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$historicalBindings) -Result REQUEST_CHANGES -ProducerMeta @{provider='codex';invocationId='fixture-review'}
    $implementationBindings=Get-AttestationBindings -TaskVersionId $contract.taskVersionId -WorktreeDir $workspace -BaseSha $base -HeadSha $implementation
    New-Attestation -Kind check -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$implementationBindings) -Result PASS|Out-Null

    Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null
    Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase CHECKING
    Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase REVIEWING
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event review-correction -ToState RUNNING -RunId $runId|Out-Null
    Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase CHECKING
    $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;runId=$runId;workspace=$workspace;branch='main';baseSha=$base;status='RUNNING';stage='IMPLEMENT';reason='';cycle=2;attempt=2;implementationComplete=$true;requiresCorrection=$false;implementationCommit=$implementation;candidateBase=$base;candidateHead=$historical;candidateTree=$historicalBindings.treeHash;diffHash=$historicalBindings.diffHash;reviewVerdict='REQUEST_CHANGES';reviewInvocationId='fixture-review'}
    $scan=[ordered]@{clean=$false;candidate=[ordered]@{clean=$true;baseSha=$base;headSha=$implementation;hits=@()};artifacts=[ordered]@{clean=$false;hits=@('historical false positive')};hits=@('historical false positive')}
    Set-DispatcherSecretBlock -State $state -Scan $scan|Out-Null
    return @{state=$state;task=$task;source=$source;workspace=$workspace;base=$base;historical=$historical;implementation=$implementation;implementationBindings=$implementationBindings;historicalReview=$historicalReview;runRoot=$runRoot;gatePath=(Get-HumanGatePath $contract.taskVersionId $task.ownerGate)}
}

function New-ReviewBudgetSupersessionFixture([string]$Id){
    $f=New-HistoricalResumeFixture $Id
    Add-LedgerEvent -TaskVersionId $f.state.taskVersionId -Event retry -ToState READY -RunId $f.state.runId|Out-Null
    Add-LedgerEvent -TaskVersionId $f.state.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $f.state.runId|Out-Null
    Add-LedgerEvent -TaskVersionId $f.state.taskVersionId -Event running -ToState RUNNING -RunId $f.state.runId|Out-Null
    Enter-DispatcherLedgerPhase -TaskVersionId $f.state.taskVersionId -RunId $f.state.runId -Phase CHECKING
    Enter-DispatcherLedgerPhase -TaskVersionId $f.state.taskVersionId -RunId $f.state.runId -Phase REVIEWING
    $review=New-Attestation -Kind review -TaskVersionId $f.state.taskVersionId -RunId $f.state.runId -Bindings ([hashtable]$f.implementationBindings) -Result REQUEST_CHANGES -Payload @{findings=@(@{severity='high';detail='latest finding'})} -ProducerMeta @{provider='codex';invocationId=('review-'+$Id)}
    Add-LedgerEvent -TaskVersionId $f.state.taskVersionId -Event budget -ToState FAILED_REVIEW_BUDGET -RunId $f.state.runId|Out-Null
    $f.state.status='WAITING_HUMAN';$f.state.stage='REVIEW';$f.state.reason='bounded correction budget exhausted';$f.state.candidateHead=$f.implementation;$f.state.candidateTree=$f.implementationBindings.treeHash;$f.state.diffHash=$f.implementationBindings.diffHash;$f.state.reviewVerdict='REQUEST_CHANGES';$f.state.reviewInvocationId=$review.producer.invocationId
    $successor=Source @($f.task);$successor.tasks[0].description='bounded review correction successor';$successor.tasks[0].candidateConstraints=[ordered]@{resumeFromTaskVersionId=$f.state.taskVersionId;resumeFromCandidateCommit=$f.implementation;resumeFromReviewAttestationId=$review.attestationId;resumeFromReviewInvocationId=$review.producer.invocationId}
    $path=Join-Path $Fixture ("successor-$Id.json");Write-Utf8 $path ($successor|ConvertTo-Json -Depth 20);$newSource=Read-DispatcherTaskSource $path;$newTask=[hashtable]$newSource.tasks[0];$newContract=New-DispatcherContract -Task $newTask -TaskSource $newSource
    $f.review=$review;$f.newSource=$newSource;$f.newTask=$newTask;$f.newContract=$newContract;return $f
}

function New-ProviderFailureRecoveryFixture([string]$Id){
    $f=New-ReviewBudgetSupersessionFixture $Id
    $task=[hashtable]$f.newTask;$contract=$f.newContract;$source=$f.newSource
    New-OwnerGateApproval -TaskId $task.taskId -TaskVersionId $contract.taskVersionId -GateId $task.ownerGate -ApprovalScope 'fixture-local provider recovery only' -ApprovedBy owner -ApprovalSource 'dispatcher provider recovery regression'|Out-Null
    Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $f.state.runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $f.state.runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event execute-failed -ToState FAILED -RunId $f.state.runId -Note AGENT_FAILURE|Out-Null

    $invocation='att-'+[guid]::NewGuid().ToString('N')
    $logs=Join-Path $f.runRoot 'logs';$stdoutPath=Join-Path $logs 'implementer-003-claude.stdout.log';$stderrPath=Join-Path $logs 'implementer-003-claude.stderr.log'
    $prior=[ordered]@{subtype='success';is_error=$false;result='prior attempt'}
    $record=[ordered]@{api_error_status=403;is_error=$true;subtype='success';terminal_reason='api_error';result='Claude Code subscription access disabled for this account';permission_denials=@()}
    Write-Utf8 $stdoutPath ((ConvertTo-Json $prior -Compress)+"`n"+(ConvertTo-Json $record -Compress)+"`n");Write-Utf8 $stderrPath ''
    $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;runId=$f.state.runId;workspace=$f.workspace;branch='main';baseSha=$f.base;candidateBase=$f.base;status='AGENT_FAILURE';stage='IMPLEMENT';reason='';cycle=0;attempt=3;implementationComplete=$false;requiresCorrection=$true;implementationCommit=$f.implementation;recoveredCandidateCommit=$f.implementation;candidateHead='';candidateTree='';diffHash='';provider='claude';profile='REASONING';failovers=0;rollovers=0;unavailableProviders=@();providerHistory=@([ordered]@{invocationId=$invocation;role='CORRECTOR';provider='claude';attempt=3;providerClass='AGENT_FAILURE';resultClass='AGENT_FAILURE';exitCode=1});importantArtifacts=@($stdoutPath,$stderrPath);findings=@('high: authorized successor correction');decisions=@();reviewVerdict='';logicalProjectId='fixture';integration=$null}
    Write-DispatcherState $state|Out-Null
    return @{state=$state;task=$task;source=$source;contract=$contract;workspace=$f.workspace;runId=$f.state.runId;stdoutPath=$stdoutPath;evidenceHash=(New-FileHash $stdoutPath);invocation=$invocation}
}

function New-Utf8StdinRecoveryFixture([string]$Id){
    $f=New-ProviderFailureRecoveryFixture $Id
    $script:ProviderHealthFaults=@{claude='PROVIDER_AUTH';codex=$null}
    try{Recover-DispatcherHistoricalProviderFailure -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash|Out-Null}
    finally{$script:ProviderHealthFaults=$null}
    $state=Get-DispatcherState;$invocation='att-'+[guid]::NewGuid().ToString('N');$suffix=$invocation.Substring(4,8);$logs=Split-Path -Parent $f.stdoutPath
    $stem=('implementer-004-codex-{0}' -f $suffix);$promptPath=Join-Path $logs "$stem.prompt.txt";$stdoutPath=Join-Path $logs "$stem.stdout.log";$stderrPath=Join-Path $logs "$stem.stderr.log"
    $unicodePrompt="Corre$([char]0x00E7)$([char]0x00E3)o transacional $([char]0x2014) a$([char]0x00E7)$([char]0x00E3)o v$([char]0x00E1)lida.`n"
    Write-Utf8 $promptPath $unicodePrompt;Write-Utf8 $stdoutPath '';Write-Utf8 $stderrPath 'Failed to read prompt from stdin: input is not valid UTF-8 (invalid byte at offset 17). Convert it to UTF-8 and retry (e.g., `iconv -f <ENC> -t UTF-8 prompt.txt`).'
    $state.attempt=4;$state.status='AGENT_FAILURE';$state.stage='IMPLEMENT';$state.provider='codex';$state.reason="provider invocation $invocation ended as AGENT_FAILURE/AGENT_FAILURE";$state.implementationComplete=$false;$state.candidateHead='';$state.integration=$null
    $state.providerHistory=@($state.providerHistory)+@([ordered]@{invocationId=$invocation;role='CORRECTOR';provider='codex';attempt=4;providerClass='AGENT_FAILURE';resultClass='AGENT_FAILURE';exitCode=1;stdoutArtifact=$stdoutPath;stdoutHash=(New-FileHash $stdoutPath);controlRecordHash=(New-StringHash '')})
    $state.importantArtifacts=@($state.importantArtifacts)+@($stdoutPath,$stderrPath);Write-DispatcherState $state|Out-Null
    Add-LedgerEvent -TaskVersionId $state.taskVersionId -Event execute-failed -ToState FAILED -RunId $state.runId -Note AGENT_FAILURE|Out-Null
    return @{state=$state;task=$f.task;source=$f.source;contract=$f.contract;workspace=$f.workspace;runId=$f.runId;invocation=$invocation;promptPath=$promptPath;stdoutPath=$stdoutPath;stderrPath=$stderrPath;evidenceHash=(New-FileHash $stderrPath);promptHash=(New-FileHash $promptPath)}
}

function New-StoppedPartialRecoveryFixture([string]$Id){
    $f=New-Utf8StdinRecoveryFixture $Id
    Recover-DispatcherUtf8StdinFailure -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash|Out-Null
    $state=Get-DispatcherState;$state.cycle=1
    $partialDir=Join-Path $f.workspace 'work';New-Item -ItemType Directory -Force -Path $partialDir|Out-Null
    Write-Utf8 (Join-Path $partialDir 'partial.ts') "export const partial = 'preserved';`n"
    Write-Utf8 (Join-Path $partialDir 'partial.spec.ts') "export const partialTest = true;`n"
    $invocation='att-'+[guid]::NewGuid().ToString('N');$suffix=$invocation.Substring(4,8);$logs=Split-Path -Parent $f.stdoutPath
    $stdoutPath=Join-Path $logs ('implementer-005-codex-{0}.stdout.log' -f $suffix)
    $quota=[ordered]@{type='turn.failed';error=[ordered]@{message="You've hit your usage limit. Try again later."}}
    Write-Utf8 $stdoutPath (($quota|ConvertTo-Json -Compress -Depth 5)+"`n")
    $quotaEntry=[ordered]@{invocationId=$invocation;role='CORRECTOR';provider='codex';attempt=5;providerClass='QUOTA_EXHAUSTED';resultClass='AGENT_FAILURE';exitCode=1;stdoutArtifact=$stdoutPath;stdoutHash=(New-FileHash $stdoutPath);controlRecordHash=(New-FileHash $stdoutPath)}
    $claudeInvocation='att-'+[guid]::NewGuid().ToString('N')
    $claudeEntry=[ordered]@{invocationId=$claudeInvocation;role='CORRECTOR';provider='claude';attempt=6;providerClass='TEMPORARY_AUTH_FAILURE';resultClass='AGENT_FAILURE';exitCode=1}
    $state.providerHistory=@($state.providerHistory)+@($quotaEntry,$claudeEntry);$state.importantArtifacts=@($state.importantArtifacts)+@($stdoutPath)
    $state.attempt=6;$state.provider='claude';$state.status='STOPPED';$state.stage='IMPLEMENT';$state.reason='explicit stop requested';$state.implementationComplete=$false;$state.candidateHead='';$state.integration=$null;$state.unavailableProviders=@();$state.failovers=1
    Add-LedgerEvent -TaskVersionId $state.taskVersionId -Event provider-unavailable -ToState WAITING_PROVIDER -RunId $state.runId -Note 'claude/TEMPORARY_AUTH_FAILURE/IMPLEMENT'|Out-Null
    Add-LedgerEvent -TaskVersionId $state.taskVersionId -Event provider-resume -ToState DISPATCHED -RunId $state.runId -Note 'resume stage IMPLEMENT'|Out-Null
    Add-LedgerEvent -TaskVersionId $state.taskVersionId -Event running -ToState RUNNING -RunId $state.runId|Out-Null
    Write-DispatcherState $state|Out-Null
    $stopPath=Join-Path (Get-V2Dir) (Get-V2Config).pilot.stopFile;Set-Content -LiteralPath $stopPath -Value "stop requested $((Get-Date).ToString('o'))" -Encoding ascii
    Start-Sleep -Milliseconds 5
    $checkpoint=[ordered]@{schemaVersion='orcivo.orchestration.v2.pilot-checkpoint/1';runId=$state.runId;writtenAt=(Get-Date).ToUniversalTime().ToString('o');holder=[ordered]@{pid=2147483000;startTime='2000-01-01T00:00:00.0000000Z';host=$env:COMPUTERNAME;alive=$true};taskId=$state.taskId;taskVersionId=$state.taskVersionId;status='STOPPED';reason='explicit stop requested';stage='IMPLEMENT';provider='claude';providerHistory=@($state.providerHistory);ledgerState='RUNNING';candidateHead=''}
    $pilotDir=Join-Path (Get-V2Dir) 'pilot';Write-V2JsonCanonical (Join-Path $pilotDir "$($state.runId).json") $checkpoint;Write-V2JsonCanonical (Join-Path $pilotDir 'latest.json') $checkpoint
    return @{state=$state;task=$f.task;source=$f.source;contract=$f.contract;workspace=$f.workspace;runId=$f.runId;invocation=$invocation;stdoutPath=$stdoutPath;evidenceHash=(New-FileHash $stdoutPath);stopPath=$stopPath;stopHash=(New-FileHash $stopPath)}
}

function New-StoppedInflightRecoveryFixture([string]$Id){
    $f=New-StoppedPartialRecoveryFixture $Id
    Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash|Out-Null
    $state=Get-DispatcherState;$wait=Get-ProviderWait $state.taskVersionId;$wait.nextRetryAt=(Get-Date).ToUniversalTime().AddSeconds(-1).ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $state.taskVersionId) $wait
    $script:ProviderHealthFaults=@{claude='PROVIDER_AUTH';codex=$null};try{Assert-True (Resume-DispatcherProviderWait $state) 'fixture could not resume Codex'}finally{$script:ProviderHealthFaults=$null}
    $state=Get-DispatcherState;$attempt=[int]$state.attempt+1;$invocation='att-'+[guid]::NewGuid().ToString('N');$suffix=$invocation.Substring(4,8);$logs=Split-Path -Parent $f.stdoutPath
    $stdoutPath=Join-Path $logs ('implementer-{0:000}-codex-{1}.stdout.log' -f $attempt,$suffix)
    $start=[ordered]@{type='thread.started';thread_id='fixture'}|ConvertTo-Json -Compress
    $turn=[ordered]@{type='turn.started'}|ConvertTo-Json -Compress
    $itemStart=[ordered]@{type='item.started';item=[ordered]@{id='item_1';type='command_execution';status='in_progress'}}|ConvertTo-Json -Compress
    $done=[ordered]@{type='item.completed';item=[ordered]@{id='item_1';type='command_execution';status='completed';exit_code=0}}|ConvertTo-Json -Compress
    Write-Utf8 $stdoutPath "$start`n$turn`n$itemStart`n$done`n"
    Start-Sleep -Milliseconds 10;$stopPath=Join-Path (Get-V2Dir) (Get-V2Config).pilot.stopFile;Set-Content -LiteralPath $stopPath -Value "stop requested $((Get-Date).ToString('o'))" -Encoding ascii
    Start-Sleep -Milliseconds 10;$inflight=[ordered]@{type='item.started';item=[ordered]@{id='item_2';type='command_execution';status='in_progress'}}|ConvertTo-Json -Compress;Add-Content -LiteralPath $stdoutPath -Value $inflight -Encoding utf8
    $hash=New-FileHash $stdoutPath;$entry=[ordered]@{invocationId=$invocation;role='CORRECTOR';provider='codex';attempt=$attempt;providerClass='AGENT_FAILURE';resultClass='AGENT_FAILURE';exitCode=1;stdoutArtifact=$stdoutPath;stdoutHash=$hash;controlRecordHash=$hash}
    $state.providerHistory=@($state.providerHistory)+@($entry);$state.importantArtifacts=@($state.importantArtifacts)+@($stdoutPath);$state.attempt=$attempt;$state.status='AGENT_FAILURE';$state.reason="provider invocation $invocation ended as AGENT_FAILURE/AGENT_FAILURE";Write-DispatcherState $state|Out-Null
    Add-LedgerEvent -TaskVersionId $state.taskVersionId -Event execute-failed -ToState FAILED -RunId $state.runId -Note AGENT_FAILURE|Out-Null
    $checkpoint=[ordered]@{schemaVersion='orcivo.orchestration.v2.pilot-checkpoint/1';runId=$state.runId;writtenAt=(Get-Date).ToUniversalTime().ToString('o');holder=[ordered]@{pid=2147483000;startTime='2000-01-01T00:00:00.0000000Z';host=$env:COMPUTERNAME;alive=$true};taskId=$state.taskId;taskVersionId=$state.taskVersionId;status='AGENT_FAILURE';reason=$state.reason;stage='IMPLEMENT';provider='codex';providerHistory=@($state.providerHistory);ledgerState='FAILED';candidateHead=''}
    $pilotDir=Join-Path (Get-V2Dir) 'pilot';Write-V2JsonCanonical (Join-Path $pilotDir "$($state.runId).json") $checkpoint;Write-V2JsonCanonical (Join-Path $pilotDir 'latest.json') $checkpoint
    return @{state=$state;task=$f.task;source=$f.source;contract=$f.contract;workspace=$f.workspace;runId=$f.runId;invocation=$invocation;stdoutPath=$stdoutPath;evidenceHash=$hash;stopPath=$stopPath;stopHash=(New-FileHash $stopPath)}
}

function New-IncompleteProviderResultFixture([string]$Id){
    $workspace=Join-Path $Root ("incomplete-"+$Id);& git init -b main --quiet $workspace
    Write-Utf8 (Join-Path $workspace 'README.md') "base`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m base --quiet
    $base=(& git -C $workspace rev-parse HEAD).Trim()
    $task=Task ("INCOMPLETE-"+$Id) @() 'C' 'level-c-persistent-migration'
    $sourcePath=Join-Path $Fixture ("incomplete-"+$Id+".tasks.json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
    $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0];$contract=New-DispatcherContract -Task $task -TaskSource $source
    New-OwnerGateApproval -TaskId $task.taskId -TaskVersionId $contract.taskVersionId -GateId $task.ownerGate -ApprovalScope 'fixture-local incomplete result recovery only' -ApprovedBy owner -ApprovalSource 'dispatcher incomplete result regression'|Out-Null
    $runId='run-incomplete-'+$Id.ToLowerInvariant();$logs=Join-Path (Get-V2Dir) "runs\$runId\logs";$invocation='att-'+[guid]::NewGuid().ToString('N');$suffix=$invocation.Substring(4,8)
    $stdoutPath=Join-Path $logs ('implementer-007-codex-{0}.stdout.log' -f $suffix)
    $thread=[ordered]@{type='thread.started';thread_id='fixture'}|ConvertTo-Json -Compress
    $turn=[ordered]@{type='turn.started'}|ConvertTo-Json -Compress
    $inflight=[ordered]@{type='item.started';item=[ordered]@{id='item_1';type='command_execution';status='in_progress'}}|ConvertTo-Json -Compress
    Write-Utf8 $stdoutPath "$thread`n$turn`n$inflight`n"
    $partialDir=Join-Path $workspace 'work';New-Item -ItemType Directory -Force -Path $partialDir|Out-Null
    Write-Utf8 (Join-Path $partialDir 'partial.ts') "export const partial = 'preserved';`n"
    Write-Utf8 (Join-Path $partialDir 'partial.spec.ts') "export const partialTest = true;`n"
    Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event execute-failed -ToState FAILED -RunId $runId -AttemptId $invocation -Note AGENT_FAILURE|Out-Null
    $hash=New-FileHash $stdoutPath
    $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;runId=$runId;workspace=$workspace;branch='main';baseSha=$base;candidateBase=$base;status='AGENT_FAILURE';stage='IMPLEMENT';reason="provider invocation $invocation ended as NONE/AGENT_FAILURE";cycle=1;attempt=7;implementationComplete=$false;implementationCommit=$base;recoveredCandidateCommit=$base;candidateHead='';candidateTree='';diffHash='';provider='codex';profile='CRITICAL';failovers=1;rollovers=0;unavailableProviders=@();providerHistory=@([ordered]@{invocationId=$invocation;role='IMPLEMENTER';provider='codex';attempt=7;providerClass='NONE';resultClass='AGENT_FAILURE';exitCode=0;stdoutArtifact=$stdoutPath;stdoutHash=$hash;controlRecordHash=$hash});importantArtifacts=@($stdoutPath);findings=@();decisions=@();reviewVerdict='';logicalProjectId='fixture';integration=$null;gate=[ordered]@{required=$true;approval='STALE';reason=$task.ownerGate;taskVersionId=$contract.taskVersionId}}
    Write-DispatcherState $state|Out-Null
    $partial=Get-DispatcherDirtyWorkspaceProof -Workspace $workspace -Task $task
    return @{state=$state;task=$task;source=$source;contract=$contract;workspace=$workspace;runId=$runId;invocation=$invocation;stdoutPath=$stdoutPath;evidenceHash=$hash;partialDiffHash=$partial.diffHash;partialFilesHash=$partial.filesHash}
}

function New-IncompleteProviderWorkspaceMutationFixture([string]$Id){
    $f=New-IncompleteProviderResultFixture $Id
    $state=Get-DispatcherState;$workspace=$f.workspace;$logs=Split-Path -Parent $f.stdoutPath
    # Four bound files are the pre-existing recovery result; two more are
    # deliberately added after the pre-launch manifest to model a provider
    # process that exits without a terminal envelope.
    Write-Utf8 (Join-Path $workspace 'work\partial.integration.spec.ts') "export const integration = true;`n"
    Write-Utf8 (Join-Path $workspace 'work\partial.authorization.spec.ts') "export const authorization = true;`n"
    $pre=Get-DispatcherDirtyWorkspaceProof -Workspace $workspace -Task $f.task
    $state.incompleteProviderResultRecoveryHistory=@([ordered]@{recoveredAt='2026-09-08T00:00:00.0000000Z';invocationId='att-11111111111111111111111111111111';provider='codex';attempt=7;evidenceHash='sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';partialDiffHash=$pre.diffHash;partialFilesHash=$pre.filesHash;changedFiles=@($pre.paths);runId=$f.runId;workspace=$workspace;expectedHead=$state.implementationCommit;failovers=1;cycle=1})
    $invocation='att-'+[guid]::NewGuid().ToString('N');$suffix=$invocation.Substring(4,8);$promptPath=Join-Path $logs ('implementer-008-codex-{0}.prompt.txt' -f $suffix);$stdoutPath=Join-Path $logs ('implementer-008-codex-{0}.stdout.log' -f $suffix)
    Write-Utf8 $promptPath 'sanitized immutable prompt';$thread=[ordered]@{type='thread.started';thread_id='fixture'}|ConvertTo-Json -Compress;$turn=[ordered]@{type='turn.started'}|ConvertTo-Json -Compress;$inflight=[ordered]@{type='item.started';item=[ordered]@{id='item_1';type='command_execution';status='in_progress'}}|ConvertTo-Json -Compress;Write-Utf8 $stdoutPath "$thread`n$turn`n$inflight`n"
    $state.status='RUNNING';$state.stage='IMPLEMENT';$state.reason='';$state.attempt=8;$state.provider='codex';$state.profile='CRITICAL';$state.model='gpt-5.6-terra';$state.workspaceInvocationSnapshots=@()
    New-DispatcherWorkspaceInvocationSnapshot -State $state -Task $f.task -InvocationId $invocation -PromptArtifact $promptPath -PromptHash (New-FileHash $promptPath) -Provider codex -Model gpt-5.6-terra -ReasoningEffort high -Attempt 8|Out-Null
    Write-Utf8 (Join-Path $workspace 'work\test-setup.ts') "export const setup = () => undefined;`n"
    Write-Utf8 (Join-Path $workspace 'work\test-setup.spec.ts') "import { setup } from './test-setup';`nvoid setup;`n"
    $hash=New-FileHash $stdoutPath;$agentResult=[ordered]@{invocationId=$invocation;provider='codex';model='gpt-5.6-terra';reasoningIntent='high';attempt=8;promptHash=(New-FileHash $promptPath);stdoutHash=$hash};$resultSnapshot=New-DispatcherWorkspaceInvocationResultSnapshot -State $state -Task $f.task -AgentResult $agentResult
    $state.status='AGENT_FAILURE';$state.stage='IMPLEMENT';$state.reason="provider invocation $invocation ended as INCOMPLETE_PROVIDER_RESULT/AGENT_FAILURE"
    $state.providerHistory=@([ordered]@{invocationId=$invocation;role='IMPLEMENTER';provider='codex';model='gpt-5.6-terra';reasoningEffort='high';attempt=8;providerClass='INCOMPLETE_PROVIDER_RESULT';resultClass='AGENT_FAILURE';exitCode=0;promptArtifact=[IO.Path]::GetFullPath($promptPath);promptHash=(New-FileHash $promptPath);workspaceResultSnapshotHash=$resultSnapshot.resultHash;stdoutArtifact=$stdoutPath;stdoutHash=$hash;controlRecordHash=$hash})
    Write-DispatcherState $state|Out-Null;$partial=Get-DispatcherDirtyWorkspaceProof -Workspace $workspace -Task $f.task;$snapshot=(Get-DispatcherWorkspaceInvocationSnapshot -State $state -InvocationId $invocation)
    return @{state=$state;task=$f.task;source=$f.source;contract=$f.contract;workspace=$workspace;runId=$f.runId;invocation=$invocation;stdoutPath=$stdoutPath;evidenceHash=$hash;partialDiffHash=$partial.diffHash;partialFilesHash=$partial.filesHash;snapshotHash=$snapshot.snapshotHash;resultHash=$resultSnapshot.resultHash;paths=@($partial.paths)}
}

function New-IncompleteProviderQuarantineFixture([string]$Id){
    $f=New-IncompleteProviderResultFixture $Id
    # These six files model an old, incomplete invocation predating manifest
    # support.  They remain in the old workspace only; no launch/result manifest
    # is created, so the public mutation-recovery flow must reject it.
    Write-Utf8 (Join-Path $f.workspace 'work\partial.integration.spec.ts') "export const integration = true;`n"
    Write-Utf8 (Join-Path $f.workspace 'work\partial.authorization.spec.ts') "export const authorization = true;`n"
    Write-Utf8 (Join-Path $f.workspace 'work\test-setup.ts') "export const setup = () => undefined;`n"
    Write-Utf8 (Join-Path $f.workspace 'work\test-setup.spec.ts') "import { setup } from './test-setup';`nvoid setup;`n"
    $state=Get-DispatcherState
    $state.reason="provider invocation $($f.invocation) ended as INCOMPLETE_PROVIDER_RESULT/AGENT_FAILURE"
    $state.providerHistory[-1].providerClass='INCOMPLETE_PROVIDER_RESULT'
    $state.workspaceInvocationSnapshots=@();$state.workspaceInvocationResultSnapshots=@()
    Write-DispatcherState $state|Out-Null
    # New-DispatcherWorkspace deliberately clones dispatcher authority instead
    # of the untrusted old worktree. Make this fixture's trusted commit reachable
    # from that disposable authority, just as the real trusted candidate is.
    & git -C $Fixture fetch --quiet $f.workspace $state.implementationCommit
    & git -C $Fixture branch ('trusted-'+$Id.ToLowerInvariant()) $state.implementationCommit
    $partial=Get-DispatcherDirtyWorkspaceProof -Workspace $f.workspace -Task $f.task
    return @{state=$state;task=$f.task;source=$f.source;contract=$f.contract;workspace=$f.workspace;runId=$f.runId;invocation=$f.invocation;stdoutPath=$f.stdoutPath;evidenceHash=$f.evidenceHash;partialDiffHash=$partial.diffHash;partialFilesHash=$partial.filesHash;paths=@($partial.paths)}
}

# Models the one narrow -1 branch: a public recovery closed a RUNNING
# invocation, and both manifests prove its process added nothing to the
# pre-existing dirty baseline. It is intentionally distinct from legacy
# manifest-less abandonment fixtures.
function New-ReconciledIncompleteProviderQuarantineFixture([string]$Id){
    $f=New-IncompleteProviderResultFixture $Id;$state=Get-DispatcherState
    foreach($path in @('work\partial.integration.spec.ts','work\partial.authorization.spec.ts','work\test-setup.ts')){Write-Utf8 (Join-Path $f.workspace $path) ("export const fixture = '"+$Id+"';`n")}
    $logs=Split-Path -Parent $f.stdoutPath;$prompt=Join-Path $logs ('implementer-007-codex-'+$f.invocation.Substring(4,8)+'.prompt.txt');Write-Utf8 $prompt 'sanitized immutable reconciled-incomplete prompt'
    $state.status='RUNNING';$state.stage='IMPLEMENT';$state.reason='';$state.provider='codex';$state.workspaceInvocationSnapshots=@();$state.workspaceInvocationResultSnapshots=@()
    $snapshot=New-DispatcherWorkspaceInvocationSnapshot -State $state -Task $f.task -InvocationId $f.invocation -PromptArtifact $prompt -PromptHash (New-FileHash $prompt) -Provider codex -Model gpt-5.6-terra -ReasoningEffort high -Attempt 7
    $hash=New-FileHash $f.stdoutPath;$result=New-DispatcherWorkspaceInvocationResultSnapshot -State $state -Task $f.task -AgentResult ([ordered]@{invocationId=$f.invocation;provider='codex';model='gpt-5.6-terra';reasoningIntent='high';attempt=7;promptHash=(New-FileHash $prompt);stdoutHash=$hash})
    $partial=Get-DispatcherDirtyWorkspaceProof -Workspace $f.workspace -Task $f.task
    $state.status='AGENT_FAILURE';$state.stage='IMPLEMENT';$state.reason="provider invocation $($f.invocation) ended as INCOMPLETE_PROVIDER_RESULT/AGENT_FAILURE"
    $state.providerHistory=@([ordered]@{invocationId=$f.invocation;role='IMPLEMENTER';provider='codex';model='gpt-5.6-terra';reasoningEffort='high';attempt=7;providerClass='INCOMPLETE_PROVIDER_RESULT';resultClass='AGENT_FAILURE';exitCode=-1;promptArtifact=[IO.Path]::GetFullPath($prompt);promptHash=(New-FileHash $prompt);workspaceResultSnapshotHash=$result.resultHash;stdoutArtifact=$f.stdoutPath;stdoutHash=$hash;controlRecordHash=$hash})
    $state.incompleteRunningInvocationRecoveryHistory=@([ordered]@{recoveredAt='2026-09-09T00:00:00.0000000Z';invocationId=$f.invocation;evidenceHash=$hash;preManifestHash=$snapshot.snapshotHash;postManifestHash=$result.resultHash;partialDiffHash=$partial.diffHash;partialFilesHash=$partial.filesHash})
    Write-DispatcherState $state|Out-Null
    # Rebuild only this disposable fixture ledger through its public state
    # transitions so the reconciled event genuinely follows RUNNING.
    Initialize-LedgerTask -TaskVersionId $f.contract.taskVersionId -Identity @{taskId=$f.task.taskId}|Out-Null
    Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event ready -ToState READY -RunId $f.runId|Out-Null
    Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $f.runId -AttemptId $f.invocation|Out-Null
    Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event running -ToState RUNNING -RunId $f.runId -AttemptId $f.invocation|Out-Null
    $evidence=[ordered]@{invocationId=$f.invocation;provider='codex';attempt=7;evidenceHash=$hash;preManifestHash=$snapshot.snapshotHash;postManifestHash=$result.resultHash;partialDiffHash=$partial.diffHash;partialFilesHash=$partial.filesHash;derivedClass='INCOMPLETE_PROVIDER_RESULT'}
    Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event 'incomplete-running-invocation-reconciled' -ToState FAILED -RunId $f.runId -AttemptId $f.invocation -Evidence $evidence|Out-Null
    & git -C $Fixture fetch --quiet $f.workspace $state.implementationCommit
    & git -C $Fixture branch ('trusted-reconciled-'+$Id.ToLowerInvariant()) $state.implementationCommit
    return @{state=(Get-DispatcherState);task=$f.task;source=$f.source;contract=$f.contract;workspace=$f.workspace;runId=$f.runId;invocation=$f.invocation;stdoutPath=$f.stdoutPath;evidenceHash=$hash;partialDiffHash=$partial.diffHash;partialFilesHash=$partial.filesHash;snapshotHash=$snapshot.snapshotHash;resultHash=$result.resultHash;paths=@($partial.paths)}
}

# Disposable representation of the already-durable bad clean-dispatch prefix.
# Test parameters remain private to the verifier; pilot.ps1 has no override for
# these real-lineage bindings.
function New-QuarantinedRetryRouteRecoveryFixture([string]$Id){
    $f=New-ReconciledIncompleteProviderQuarantineFixture $Id;$state=Get-DispatcherState;$trusted=$state.implementationCommit
    # Keep the disposable ref under the Windows path limit. Production IDs are
    # unchanged; this is only a collision-resistant fixture namespace.
    $workspaceId=('run-'+(New-StringHash ($Id+'|'+[guid]::NewGuid().ToString('N'))).Substring(7,16));$clean=(New-DispatcherWorkspace -RunId $f.runId -WorkspaceId $workspaceId -BaseSha $trusted -SourceRepo $f.workspace)
    $record=[ordered]@{invocationId=$f.invocation;evidenceHash=$f.evidenceHash;partialDiffHash=$f.partialDiffHash;partialFilesHash=$f.partialFilesHash;cleanWorkspace=[string]$clean.workspace;trustedHead=$trusted}
    $evidence=[ordered]@{invocationId=$f.invocation;evidenceHash=$f.evidenceHash;partialDiffHash=$f.partialDiffHash;partialFilesHash=$f.partialFilesHash;cleanWorkspace=[string]$clean.workspace;trustedHead=$trusted}
    Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event 'incomplete-provider-result-abandoned' -ToState READY -RunId $f.runId -AttemptId $f.invocation -Evidence $evidence|Out-Null
    Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event 'incomplete-provider-result-clean-dispatch' -ToState DISPATCHED -RunId $f.runId -AttemptId 'att-22222222222222222222222222222222' -Evidence $evidence|Out-Null
    Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event 'incomplete-provider-result-clean-running' -ToState RUNNING -RunId $f.runId -Evidence $evidence|Out-Null
    $state.workspace=[string]$clean.workspace;$state.branch=[string]$clean.branch;$state.status='RUNNING';$state.stage='IMPLEMENT';$state.provider='codex';$state.model='gpt-5.6-terra';$state.profile='CRITICAL';$state.quarantineRetryRoute=[ordered]@{provider='codex';model='gpt-5.6-terra';profile='CRITICAL';reasoning='high';policy='CLEAN_QUARANTINED_RETRY'};$state.incompleteProviderResultAbandonmentHistory=@($record);Write-DispatcherState $state|Out-Null
    return @{state=(Get-DispatcherState);task=$f.task;source=$f.source;contract=$f.contract;workspace=[string]$clean.workspace;runId=$f.runId;invocation=$f.invocation;evidenceHash=$f.evidenceHash;partialDiffHash=$f.partialDiffHash;partialFilesHash=$f.partialFilesHash;trustedHead=$trusted;attempt=7;tailSeq=[int](Get-LedgerState $f.contract.taskVersionId).seq}
}

function New-CompletedImplementationRecoveryFixture([string]$Id){
    $providerRuntimePath=Join-Path $Fixture '.orchestration\v2\provider-runtime.v1.json'
    if(-not(Test-Path -LiteralPath $providerRuntimePath)){Copy-Item (Join-Path $Repo '.orchestration\v2\provider-runtime.v1.json') $providerRuntimePath}
    $task=Task ("COMPLETED-"+$Id) @() 'C' 'level-c-persistent-migration'
    $sourcePath=Join-Path $Fixture ("completed-"+$Id+".tasks.json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
    $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0];$contract=New-DispatcherContract -Task $task -TaskSource $source
    New-OwnerGateApproval -TaskId $task.taskId -TaskVersionId $contract.taskVersionId -GateId $task.ownerGate -ApprovalScope 'fixture completed implementation recovery' -ApprovedBy owner -ApprovalSource 'dispatcher recovery regression'|Out-Null
    $base=(& git -C $Fixture rev-parse HEAD).Trim();$runId='run-completed-'+(New-StringHash ($Id+'|run')).Substring(7,16);$workspaceId='run-'+(New-StringHash ($Id+'|workspace')).Substring(7,16);$ws=New-DispatcherWorkspace -RunId $runId -WorkspaceId $workspaceId -BaseSha $base -SourceRepo $Fixture
    Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null
    $invocation='att-'+[guid]::NewGuid().ToString('N');$suffix=$invocation.Substring(4,8);$logs=Join-Path (Get-V2Dir) "runs\$runId\logs";New-Item -ItemType Directory -Force -Path $logs|Out-Null
    $promptPath=Join-Path $logs ("implementer-349-deepseek-$suffix.prompt.txt");Write-Utf8 $promptPath 'immutable completed implementation prompt';$promptHash=New-FileHash $promptPath
    $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;runId=$runId;workspace=$ws.workspace;branch=$ws.branch;baseSha=$base;candidateBase=$base;status='RUNNING';stage='IMPLEMENT';reason='';cycle=1;attempt=349;implementationComplete=$false;requiresCorrection=$true;implementationCommit=$base;recoveredCandidateCommit=$base;candidateHead='';candidateTree='';diffHash='';provider='deepseek';model='deepseek-v4-pro';profile='REASONING';failovers=1;rollovers=0;unavailableProviders=@();providerHistory=@();importantArtifacts=@();findings=@();decisions=@();reviewVerdict='';logicalProjectId='fixture';integration=$null;quarantineReference=[ordered]@{policy='NON_AUTHORITATIVE_REFERENCE_ONLY_NO_CANDIDATE_IMPORT';contentLoaded=$false};quarantineRetryRoute=[ordered]@{provider='deepseek';model='deepseek-v4-pro';profile='REASONING';reasoning='high';policy='CLEAN_QUARANTINED_RETRY_REQUIRES_FRESH_DEEPSEEK_PRO_HIGH'}}
    Write-DispatcherState $state|Out-Null;New-DispatcherWorkspaceInvocationSnapshot -State $state -Task $task -InvocationId $invocation -PromptArtifact $promptPath -PromptHash $promptHash -Provider deepseek -Model deepseek-v4-pro -ReasoningEffort high -Attempt 349|Out-Null
    $resultPath=Join-Path $ws.workspace 'work\result.ts';Write-Utf8 $resultPath "export const recovered = true;`n"
    $body=[ordered]@{schemaVersion='orcivo.orchestration.v2.agent-result/1';role='CORRECTOR';resultClass='SUCCESS';summary='completed implementation';decisions=@('preserve result');tests=@([ordered]@{command='fixture verification';status='PASS';evidence='verified'});nextAction='review';importantArtifacts=@('work/result.ts')}
    $event=[ordered]@{type='item.completed';item=[ordered]@{type='agent_message';text=(ConvertTo-Json $body -Compress -Depth 10)}};$terminal=[ordered]@{type='turn.completed';usage=[ordered]@{input_tokens=1000;cached_input_tokens=900;output_tokens=100;reasoning_output_tokens=25}}
    # The real invocation exceeded Copy-StreamRedacted's 200k in-memory cap,
    # so its full stdout file hash and bounded control-record hash are distinct.
    $noise=@();foreach($i in 1..14){
        $noise+=(ConvertTo-Json ([ordered]@{type='item.completed';item=[ordered]@{type='command_execution';status='completed';exit_code=0;aggregated_output=('x'*15000)}}) -Compress -Depth 10)
    }
    $stdoutLines=@($noise)+@((ConvertTo-Json $event -Compress -Depth 20),(ConvertTo-Json $terminal -Compress -Depth 20))
    $stdoutPath=Join-Path $logs ("implementer-349-deepseek-$suffix.stdout.log");Write-Utf8 $stdoutPath (($stdoutLines -join "`n")+"`n");$stdoutHash=New-FileHash $stdoutPath;$controlRecordHash=Get-DispatcherCapturedStdoutControlRecordHash -Path $stdoutPath
    $request=New-DeepSeekRequestManifest -InvocationId $invocation -PromptHash $promptHash -Model deepseek-v4-pro -Reasoning high -Profile REASONING;$requestPath=Join-Path $logs ("implementer-349-deepseek-$suffix.request-manifest.json");Write-V2JsonCanonical $requestPath $request
    $agentResult=[ordered]@{invocationId=$invocation;provider='deepseek';model='deepseek-v4-pro';reasoningIntent='high';attempt=349;promptHash=$promptHash;stdoutHash=$stdoutHash};$post=New-DispatcherWorkspaceInvocationResultSnapshot -State $state -Task $task -AgentResult $agentResult
    $state.status='WAITING_PROVIDER';$state.reason='telemetry incomplete';$state.unavailableProviders=@('deepseek');$state.providerHistory=@([ordered]@{invocationId=$invocation;role='CORRECTOR';provider='deepseek';model='deepseek-v4-pro';reasoningEffort='high';attempt=349;providerClass='PROVIDER_UNAVAILABLE';resultClass='AGENT_FAILURE';exitCode=0;promptArtifact=$promptPath;promptHash=$promptHash;workspaceResultSnapshotHash=$post.resultHash;stdoutArtifact=$stdoutPath;stdoutHash=$stdoutHash;controlRecordHash=$controlRecordHash;usage=$null;cachedTokens=$null;costUsd=$null;telemetryConsistent=$false});$state.importantArtifacts=@($stdoutPath);Write-DispatcherState $state|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event provider-unavailable -ToState WAITING_PROVIDER -RunId $runId -Note 'deepseek/PROVIDER_UNAVAILABLE/IMPLEMENT'|Out-Null
    $budgetPath=Get-DeepSeekBudgetPath;$budget=[ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-budget/1';month=(Get-Date).ToUniversalTime().ToString('yyyy-MM');spentUsd=0;invocations=@([ordered]@{invocationId=$invocation;model='deepseek-v4-pro';costUsd=$null;telemetryStatus='UNKNOWN'});reservations=@([ordered]@{invocationId=$invocation;model='deepseek-v4-pro';maxUsd=0.20;status='ACTIVE'})};Write-V2JsonCanonical $budgetPath $budget
    $script:DispatcherRecoveryRunnerProbe=$false;try{$reconciled=Reconcile-DispatcherDeepSeekCacheAwareReservation -State $state -TaskVersionId $contract.taskVersionId -RunId $runId -InvocationId $invocation -ExpectedRequestManifestHash $request.manifestHash -ExpectedStdoutHash $stdoutHash -ExpectedAttempt 349 -ExpectedTailSeq 5 -BudgetPath $budgetPath -V2Root (Get-V2Dir)}finally{$script:DispatcherRecoveryRunnerProbe=$null}
    $state=Get-DispatcherState;$pre=Get-DispatcherWorkspaceInvocationSnapshot -State $state -InvocationId $invocation;$post=Get-DispatcherWorkspaceInvocationResultSnapshot -State $state -InvocationId $invocation;$tail=@(Read-JsonLines (Get-LedgerPath $contract.taskVersionId))[-1];$approval=Get-OwnerGateApprovalStatus -TaskId $task.taskId -TaskVersionId $contract.taskVersionId -GateId $task.ownerGate
    return @{state=$state;task=$task;source=$source;contract=$contract;runId=$runId;workspace=$ws.workspace;invocation=$invocation;requestHash=$request.manifestHash;stdoutHash=$stdoutHash;controlRecordHash=$controlRecordHash;preHash=$pre.snapshotHash;postHash=$post.resultHash;partialDiffHash=$post.partialDiffHash;partialFilesHash=$post.partialFilesHash;telemetryReceiptHash=$reconciled.receiptHash;gateHash=$approval.gateHash;tailSeq=[int]$tail.seq;tailEventHash=[string]$tail.eventHash;trustedHead=$base;costUsd=[decimal]$reconciled.costUsd;paths=@('work/result.ts')}
}

New-Item -ItemType Directory -Force -Path (Join-Path $Fixture '.orchestration\v2\schemas')|Out-Null
Copy-Item (Join-Path $Repo '.orchestration\v2\config.v2.json') (Join-Path $Fixture '.orchestration\v2\config.v2.json')
Copy-Item (Join-Path $Repo '.orchestration\v2\schemas\*.json') (Join-Path $Fixture '.orchestration\v2\schemas')
Write-Utf8 (Join-Path $Fixture '.gitignore') ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n.orchestration/v2/schemas/*`n!.orchestration/v2/schemas/*.json`n"
Write-Utf8 (Join-Path $Fixture 'README.md') "dispatcher unit fixture`n"
& git init -b main --quiet $Fixture
& git -C $Fixture add .
& git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m init --quiet
$OriginalPath=$env:PATH
$TestBin=Join-Path $Root 'test-bin'
New-Item -ItemType Directory -Force -Path $TestBin|Out-Null
# Route-resolution tests mock the provider process itself, but the production
# launch boundary still requires the configured CLI to be discoverable.
Write-Utf8 (Join-Path $TestBin 'opencode.cmd') "@exit /b 0`r`n"
$env:PATH="$TestBin;$OriginalPath"

try{
    Push-Location $Fixture
    try{
        . (Join-Path $V2 'dispatcher.ps1')
        . (Join-Path $V2 'correction.ps1')

        Check 'RD-01' {
            $p=Join-Path $Fixture 'tasks.json';Write-Utf8 $p ((Source @((Task '0-BLOCKED' @() 'B' 'none' 'BLOCKED'),(Task 'B' @('A')),(Task 'A')))|ConvertTo-Json -Depth 20)
            $d=Get-NextDispatcherDecision (Read-DispatcherTaskSource $p)
            Assert-True ($d.action -eq 'READY' -and $d.task.taskId -eq 'A') 'scheduler ignored dependency or source task status'
        }
        Check 'RD-01B' {
            $upstream=Task 'UPSTREAM' @() 'B' 'none' 'BLOCKED'
            $blocked=Task 'P04-BLOCKED' @('UPSTREAM')
            $blocked.phaseGate='P04'
            $later=Task 'P06-READY'
            $later.phaseGate='P06'
            $source=Source @($upstream,$blocked,$later);$source.phaseOrder=@('P04','P06')
            $p=Join-Path $Fixture 'phase-dependencies.json';Write-Utf8 $p ($source|ConvertTo-Json -Depth 20)
            $d=Get-NextDispatcherDecision (Read-DispatcherTaskSource $p)
            Assert-True ($d.action -eq 'READY' -and $d.task.taskId -eq 'P06-READY') 'dependency-blocked earlier phase starved independent ready work'
            $later.status='BLOCKED';Write-Utf8 $p ($source|ConvertTo-Json -Depth 20)
            Assert-True ((Get-NextDispatcherDecision (Read-DispatcherTaskSource $p)).action -eq 'IDLE') 'scheduler dispatched a later source-blocked task'
        }
        Check 'RD-01C' {
            $gateTask=Task 'LEVEL-C' @() 'C' 'level-c-external-service-arch'
            $p=Join-Path $Fixture 'level-c-resume.json';Write-Utf8 $p ((Source @($gateTask))|ConvertTo-Json -Depth 20)
            $source=Read-DispatcherTaskSource $p;$gateTask=[hashtable]$source.tasks[0]
            $gateState=[ordered]@{taskId='LEVEL-C';taskVersionId=('a'*64);taskSourceHash=$source.hash;status='WAITING_HUMAN';stage='GATE';reason='Level C: level-c-external-service-arch'}
            Assert-True (Test-DispatcherLoopResumeEligible -State $gateState -Task $gateTask -TaskSource $source) 'dispatcher loop failed to resume the same owner-approved Level C wait'
            $gateState.status='FAILED'
            Assert-True (-not (Test-DispatcherLoopResumeEligible -State $gateState -Task $gateTask -TaskSource $source)) 'dispatcher loop treated a failed Level C task as resumable'
        }
        Check 'RD-02' {
            $a=Get-TaskClassification -Task (Task 'FAST')
            $c=Task 'CRITICAL' @() 'C' 'OWNER_DECISION';$c.description='security tenancy money payment migration external integration irreversible architecture';$b=Get-TaskClassification -Task $c
            $order=@('FAST','BALANCED','REASONING','CRITICAL')
            Assert-True ([array]::IndexOf($order,[string]$b.recommendedProfile) -gt [array]::IndexOf($order,[string]$a.recommendedProfile)) 'semantic risk did not increase route profile'
        }
        Check 'RD-06' {
            $body='{"schemaVersion":"orcivo.orchestration.v2.agent-result/1","role":"IMPLEMENTER","resultClass":"SUCCESS","summary":"ok","decisions":[],"tests":[],"nextAction":"none","importantArtifacts":[]}'
            $co="{`"type`":`"item.completed`",`"item`":{`"type`":`"agent_message`",`"text`":$($body|ConvertTo-Json -Compress)}}"
            $cl="{`"structured_output`":$body,`"subtype`":`"success`",`"is_error`":false}"
            Assert-True ((ConvertFrom-RealCodexOutput $co).structured.resultClass -eq 'SUCCESS') 'Codex JSONL parse failed'
            Assert-True ((ConvertFrom-RealClaudeOutput $cl).structured.resultClass -eq 'SUCCESS') 'Claude structured parse failed'
        }
        Check 'RD-07' {
            Assert-True ((ConvertTo-CanonicalFailureClass 'PROVIDER_QUOTA' $null) -eq 'QUOTA_EXHAUSTED') 'quota class'
            Assert-True ((ConvertTo-CanonicalFailureClass 'PROVIDER_RATE_LIMIT' $null) -eq 'RATE_LIMIT') 'rate class'
            Assert-True ((ConvertTo-CanonicalFailureClass 'CHECK_FAILURE' $null) -eq 'TEST_FAILURE') 'test class'
        }
        Check 'RD-08' {
            $lineage='f'*64
            $script:ProviderHealthFaults=@{}
            try{$d=Get-FailoverDecision -CurrentProvider claude -Class PROVIDER_QUOTA -FailoversSoFar 0}
            finally{$script:ProviderHealthFaults=$null}
            Assert-True ($d.action -eq 'FAILOVER' -and $d.nextProvider -eq 'codex' -and $lineage -eq ('f'*64)) 'failover or lineage preservation failed'
        }
        Check 'RD-09' {Assert-True ((Get-FailoverDecision -CurrentProvider claude -Class CHECK_FAILURE).action -eq 'NO_FAILOVER') 'test failure caused provider failover'}
        Check 'RD-10' {
            $script:rdReviews=0
            $r=Invoke-CorrectionLoop -MaxCycles 2 -Execute {param($c,$f)@{ok=$true;candidateId="cand-$c"}} -Verify {param($c)@{pass=$true}} -Review {param($c)$script:rdReviews++;if($script:rdReviews-eq 1){@{verdict='REQUEST_CHANGES';findings=@('fix')}}else{@{verdict='APPROVE';findings=@()}}}
            Assert-True ($r.status -eq 'APPROVED' -and $r.distinctCandidates -eq 2 -and $r.trace.Count -eq 2) 'bounded correction did not create/review a new candidate'
        }
        Check 'RD-11' {
            $e=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=('a'*64);reviewedHead=('b'*40);treeHash=('c'*40);diffHash=('sha256:'+('d'*64));specHash=('sha256:'+('e'*64));verdict='APPROVE';criteria=@([ordered]@{id='AC1';met=$true;evidence='ok'});findings=@();filesReviewed=@('work/x');reviewerMeta=[ordered]@{provider='p';model='m';effort='e';toolPolicy='none';promptTemplateVersion='v'}}
            $w="<<<ORCIVO_REVIEW_ENVELOPE_V1`n$(ConvertTo-CanonicalJson $e)`nORCIVO_REVIEW_ENVELOPE_V1>>>"
            $x=Parse-ReviewEnvelope -Stdout $w -Expected @{taskVersion=('a'*64);head=('9'*40);treeHash=('c'*40);diffHash=('sha256:'+('d'*64));specHash=('sha256:'+('e'*64));changedFiles=@('work/x');criteriaIds=@('AC1');processOk=$true}
            Assert-True ($x.verdict -ne 'APPROVE') 'changed candidate reused an old approval'
        }
        Check 'RD-12' {
            $p=Join-Path $Fixture 'levelc.json';$t=Task 'LEVEL-C' @() 'C' 'OWNER_DECISION';Write-Utf8 $p ((Source @($t))|ConvertTo-Json -Depth 20);$s=Read-DispatcherTaskSource $p
            $r=Invoke-RealDispatcherTask -Task ([hashtable]$s.tasks[0]) -TaskSource $s
            Assert-True ($r.status -eq 'WAITING_HUMAN' -and $r.decisionNeeded) 'Level C did not wait for owner'
        }
        Check 'RD-13' {
            $stop=Join-Path (Get-V2Dir) (Get-V2Config).pilot.stopFile;Write-Utf8 $stop 'stop'
            $r=Invoke-DispatcherLoop -RunOnce -TaskFile (Join-Path $Fixture 'levelc.json')
            Assert-True ($r.status -eq 'STOPPED' -and -not (Test-Path $stop)) 'stop file was not consumed'
        }
        Check 'RD-14' {
            $s=[ordered]@{schemaVersion='x';taskId='RESUME';taskVersionId=('1'*64);runId='run-resume';status='RUNNING';stage='REVIEW';workspace='w'};Write-DispatcherState $s|Out-Null;$x=Get-DispatcherState
            Assert-True ($x.taskVersionId -eq $s.taskVersionId -and $x.stage -eq 'REVIEW') 'durable active task did not round-trip'
        }
        Check 'RD-15' {
            $tv='2'*64;Initialize-LedgerTask -TaskVersionId $tv -Identity @{taskId='WAIT'}|Out-Null;Add-LedgerEvent -TaskVersionId $tv -Event ready -ToState READY|Out-Null;Add-LedgerEvent -TaskVersionId $tv -Event dispatch -ToState DISPATCHED -RunId run-wait|Out-Null;Add-LedgerEvent -TaskVersionId $tv -Event running -ToState RUNNING -RunId run-wait|Out-Null
            Enter-WaitingProvider -TaskVersionId $tv -RunId run-wait -Context @{taskId='WAIT';generation='dispatcher';workspace='w';candidateCommit='';candidateTree='';attemptHistory=@(1);providerHistory=@('claude');verificationState='';reviewState='';checkpoint=@{nextAction='resume IMPLEMENT'};lastErrorClass='RATE_LIMIT'}|Out-Null
            $w=Get-ProviderWait $tv;Assert-True ($w.taskVersionId -eq $tv -and $w.runId -eq 'run-wait' -and $w.checkpoint.nextAction -eq 'resume IMPLEMENT') 'WAITING_PROVIDER checkpoint was not restartable'
            $state=[ordered]@{taskVersionId=$tv;runId='run-wait';stage='IMPLEMENT';status='WAITING_PROVIDER';provider='claude';task=@{};unavailableProviders=@('claude','codex')}
            $w.nextRetryAt=(Get-Date).ToUniversalTime().AddSeconds(-1).ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $tv) $w
            $script:ProviderHealthFaults=@{claude='PROVIDER_UNAVAILABLE';codex='PROVIDER_UNAVAILABLE'}
            Assert-True (-not (Resume-DispatcherProviderWait $state)) 'both unavailable providers resumed'
            $w=Get-ProviderWait $tv;$w.nextRetryAt=(Get-Date).ToUniversalTime().AddSeconds(-1).ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $tv) $w
            $script:ProviderHealthFaults=@{claude='PROVIDER_UNAVAILABLE';codex=$null}
            Assert-True ((Resume-DispatcherProviderWait $state) -and $state.provider -eq 'codex' -and (Get-LedgerState $tv).state -eq 'RUNNING') 'healthy opposite provider did not restore the same durable task'
            Assert-True ([bool](Get-ProviderWait $tv).resolvedAt) 'resumed provider wait was not durably resolved'
            $script:ProviderHealthFaults=$null
        }
        Check 'RD-16' {
            $p=Join-Path $Fixture 'done.json';Write-Utf8 $p ((Source @((Task 'DONE' @() 'B' 'none' 'DONE')))|ConvertTo-Json -Depth 20)
            Assert-True ((Get-NextDispatcherDecision (Read-DispatcherTaskSource $p)).action -eq 'IDLE') 'complete graph did not become clean idle'
        }
        Check 'RD-17' {
            $txt=(Get-Content -Raw (Join-Path $V2 'dispatcher.ps1'))+(Get-Content -Raw (Join-Path $V2 'integrate.ps1'))
            Assert-True ($txt -notmatch '(?im)^\s*[^#\r\n]*git[^\r\n]*push[^\r\n]*--force') 'force-push path exists'
        }
        Check 'RD-18' {Assert-True ((Get-Content -Raw (Join-Path $V2 'integrate.ps1')) -match 'remoteTree -ne \$candTree') 'remote publication lacks exact reviewed-tree binding'}
        Check 'RD-20' {
            $head=(& git -C $Fixture rev-parse HEAD).Trim();$clone=Join-Path $Root 'failed-candidate'; & git -c core.autocrlf=false clone --quiet $Fixture $clone
            Write-Utf8 (Join-Path $clone 'outside.txt') 'bad';& git -C $clone add .;& git -C $clone -c user.name=rd -c user.email=rd@local commit -m bad --quiet
            Assert-True ((& git -C $Fixture rev-parse HEAD).Trim() -eq $head -and -not (Test-Path (Join-Path $Fixture 'outside.txt'))) 'failed candidate touched main authority'
        }
        Check 'RG-01' {
            $pwsh=(Get-Command powershell.exe -CommandType Application -ErrorAction Stop|Select-Object -First 1).Source
            $p=Invoke-NativeCaptured -Exe $pwsh -Arguments @('-NoProfile','-Command','[Console]::Error.WriteLine("benign progress"); exit 0') -WorkingDirectory $Fixture -StdoutLog (Join-Path $Root 'rg01.stdout.log') -StderrLog (Join-Path $Root 'rg01.stderr.log') -TimeoutSec 30
            Assert-True ($p.exitCode -eq 0 -and $p.stderr -match 'benign progress') 'exit 0 plus stderr was not preserved as success'
        }
        Check 'RG-02' {
            $pwsh=(Get-Command powershell.exe -CommandType Application -ErrorAction Stop|Select-Object -First 1).Source
            $p=Invoke-NativeCaptured -Exe $pwsh -Arguments @('-NoProfile','-Command','[Console]::Error.WriteLine("real failure"); exit 17') -WorkingDirectory $Fixture -StdoutLog (Join-Path $Root 'rg02.stdout.log') -StderrLog (Join-Path $Root 'rg02.stderr.log') -TimeoutSec 30
            Assert-True ($p.exitCode -eq 17 -and $p.stderr -match 'real failure') 'nonzero exit plus stderr was not classified as failure'
        }
        Check 'RG-03' {
            $fx=Join-Path $Root 'rg03';& git init -b main --quiet $fx
            Write-Utf8 (Join-Path $fx 'work.txt') "base`n";& git -C $fx add .;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m base --quiet
            $base=(& git -C $fx rev-parse HEAD).Trim();Write-Utf8 (Join-Path $fx 'work.txt') "candidate`n"
            Write-Utf8 (Join-Path $fx '.git\hooks\pre-commit') "#!/bin/sh`nprintf '[STARTED] Backing up original state...\\n' >&2`nexit 0`n"
            $s=[ordered]@{workspace=$fx;baseSha=$base;branch='main';taskId='RG-03';runId='run-rg03';cycle=0}
            $r=Complete-DispatcherCandidateCommit -State $s
            Assert-True ($r.ok -and $r.created -and $r.exitCode -eq 0 -and $r.stderr -match '\[STARTED\]') 'benign hook stderr prevented candidate commit'
            Assert-True ((& git -C $fx rev-parse HEAD).Trim() -ne $base) 'dispatcher did not continue after benign hook stderr'
            Assert-True ((& git -C $fx log -1 --pretty=%s) -eq 'feat: rg-03') 'dispatcher candidate message is not Conventional Commits-compatible'
        }
        Check 'RG-04' {
            $fx=Join-Path $Root 'rg04';& git init -b main --quiet $fx
            Write-Utf8 (Join-Path $fx 'work.txt') "base`n";& git -C $fx add .;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m base --quiet
            $base=(& git -C $fx rev-parse HEAD).Trim();Write-Utf8 (Join-Path $fx 'work.txt') "candidate`n"
            Write-Utf8 (Join-Path $fx '.git\hooks\pre-commit') "#!/bin/sh`nprintf 'hook rejected candidate\\n' >&2`nexit 23`n"
            $s=[ordered]@{workspace=$fx;baseSha=$base;branch='main';taskId='RG-04';runId='run-rg04';cycle=0}
            $r=Complete-DispatcherCandidateCommit -State $s
            Assert-True (-not $r.ok -and $r.exitCode -ne 0 -and $r.stderr -match 'hook rejected') 'failing hook was not a classified candidate failure'
            Assert-True ((& git -C $fx rev-parse HEAD).Trim() -eq $base) 'failing hook advanced the candidate'
            $s.status='RESUMABLE';$s.stage='IMPLEMENT';$s.reason=$r.reason;$s.candidateHead='';$s.providerHistory=@([ordered]@{role='IMPLEMENTER';resultClass='SUCCESS'})
            Assert-True (Test-DispatcherCandidateResumeEligible $s) 'durable hook failure was not eligible for same-lineage restart'
        }
        Check 'RG-05' {
            $fx=Join-Path $Root 'rg05';& git init -b main --quiet $fx
            Write-Utf8 (Join-Path $fx 'work.txt') "base`n";& git -C $fx add .;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m base --quiet
            $base=(& git -C $fx rev-parse HEAD).Trim();Write-Utf8 (Join-Path $fx 'work.txt') "candidate`n"
            $s=[ordered]@{workspace=$fx;baseSha=$base;branch='main';taskId='RG-05';runId='run-rg05';cycle=0}
            $first=Complete-DispatcherCandidateCommit -State $s;$head=(& git -C $fx rev-parse HEAD).Trim();$count=(& git -C $fx rev-list --count HEAD).Trim()
            $second=Complete-DispatcherCandidateCommit -State $s
            Assert-True ($first.ok -and $first.created -and $second.ok -and -not $second.created -and $second.reused) 'restart did not reuse the existing candidate'
            Assert-True ((& git -C $fx rev-parse HEAD).Trim() -eq $head -and (& git -C $fx rev-list --count HEAD).Trim() -eq $count) 'restart duplicated the candidate commit'

            $sourcePath=Join-Path $Fixture 'rg05-tasks.json';Write-Utf8 $sourcePath ((Source @((Task 'RG05-CONTRACT')))|ConvertTo-Json -Depth 20)
            $source=Read-DispatcherTaskSource $sourcePath;$contract=New-DispatcherContract -Task ([hashtable]$source.tasks[0]) -TaskSource $source
            Write-Utf8 (Join-Path $Fixture 'head-advanced.txt') "harness fix`n";& git -C $Fixture add head-advanced.txt;& git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'advance authority head' --quiet
            $durable=[ordered]@{taskId='RG05-CONTRACT';taskVersionId=$contract.taskVersionId;taskSourceHash=$source.hash;status='RUNNING'}
            $resumed=Resolve-DispatcherContract -Task ([hashtable]$source.tasks[0]) -TaskSource $source -State $durable
            Assert-True ($resumed.taskVersionId -eq $contract.taskVersionId -and $resumed.planningHead -eq $contract.planningHead) 'restart derived a duplicate lineage after authority HEAD advanced'
        }
        Check 'RG-06' {
            $fx=Join-Path $Root 'rg06';New-Item -ItemType Directory -Force -Path $fx|Out-Null
            $s=[ordered]@{workspace=$fx;status='BLOCKED';stage='IMPLEMENT';reason='secret scan failed before review';candidateHead='';implementationComplete=$true}
            Assert-True (Test-DispatcherCandidateResumeEligible $s) 'completed candidate blocked by the pre-review secret scan was not restart-eligible'
            $s.reason='unrelated failure'
            Assert-True (-not (Test-DispatcherCandidateResumeEligible $s)) 'unrelated blocked candidate became restart-eligible'
            $s.reason='secret scan failed before review';$s.implementationComplete=$false
            Assert-True (-not (Test-DispatcherCandidateResumeEligible $s)) 'incomplete implementation became secret-scan restart-eligible'
        }
        Check 'RG-07' {
            $node=(Get-Command node.exe -CommandType Application -ErrorAction Stop|Select-Object -First 1).Source
            $expected="Corre$([char]0x00E7)$([char]0x00E3)o transacional $([char]0x2014) a$([char]0x00E7)$([char]0x00E3)o v$([char]0x00E1)lida.`n"
            $stdinPath=Join-Path $Root 'rg07.stdin.txt';Write-Utf8 $stdinPath $expected
            $expectedHash=(Get-FileHash -LiteralPath $stdinPath -Algorithm SHA256).Hash.ToLowerInvariant()
            $p=Invoke-NativeCaptured -Exe $node -Arguments @('-e',"const c=require('crypto').createHash('sha256');process.stdin.on('data',b=>c.update(b));process.stdin.on('end',()=>process.stdout.write(c.digest('hex')))") -WorkingDirectory $Fixture -StdinFile $stdinPath -StdoutLog (Join-Path $Root 'rg07.stdout.log') -StderrLog (Join-Path $Root 'rg07.stderr.log') -TimeoutSec 30
            Assert-True ($p.exitCode -eq 0 -and $p.stdout.Trim() -ceq $expectedHash) 'native stdin bytes did not round-trip as strict UTF-8'
        }
        Check 'RD-21' {
            $path=Join-Path $Root 'utf8-state.json';$expected='ação — orçamento';Write-V2JsonCanonical $path ([ordered]@{text=$expected})
            $actual=Read-V2Json $path
            Assert-True ($actual.text -ceq $expected) 'durable UTF-8 state did not round-trip across the JSON reader'
        }
        Check 'RD-22' {
            $fx=Join-Path $Root 'rd22';& git init -b main --quiet $fx
            Write-Utf8 (Join-Path $fx 'work.txt') "candidate`n";& git -C $fx add .;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m candidate --quiet
            $commit=(& git -C $fx rev-parse HEAD).Trim();$old='3'*64;$new='4'*64
            $task=Task 'SUPERSEDE';$task.candidateConstraints=[ordered]@{resumeFromTaskVersionId=$old;resumeFromCandidateCommit=$commit}
            $state=[ordered]@{taskId='SUPERSEDE';taskVersionId=$old;taskSourceHash='sha256:old';status='BLOCKED';stage='IMPLEMENT';reason='OUT OF SCOPE change';workspace=$fx;implementationCommit=$commit}
            $ok=Test-DispatcherContractSupersessionEligible -State $state -Task ([hashtable]$task) -Contract @{taskVersionId=$new} -TaskSource @{hash='sha256:new'}
            $task.candidateConstraints.resumeFromCandidateCommit='0'*40
            $bad=Test-DispatcherContractSupersessionEligible -State $state -Task ([hashtable]$task) -Contract @{taskVersionId=$new} -TaskSource @{hash='sha256:new'}
            Assert-True ($ok -and -not $bad) 'contract supersession did not require an exact durable candidate binding'
        }
        Check 'RD-23' {
            $fx=Join-Path $Root 'rd23';& git init -b main --quiet $fx
            Write-Utf8 (Join-Path $fx 'work.txt') "candidate`n";& git -C $fx add .;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m candidate --quiet
            $commit=(& git -C $fx rev-parse HEAD).Trim();$version='5'*64;$task=Task 'POLICY-RESUME';$source=@{hash='sha256:same'}
            $state=[ordered]@{taskId='POLICY-RESUME';taskVersionId=$version;taskSourceHash=$source.hash;status='BLOCKED';stage='IMPLEMENT';reason='OUT OF SCOPE change';workspace=$fx;implementationCommit=$commit;candidateHead=''}
            $ok=Test-DispatcherPolicyCorrectionResumeEligible -State $state -Task ([hashtable]$task) -Contract @{taskVersionId=$version} -TaskSource $source
            $state.implementationCommit='0'*40
            $bad=Test-DispatcherPolicyCorrectionResumeEligible -State $state -Task ([hashtable]$task) -Contract @{taskVersionId=$version} -TaskSource $source
            Assert-True ($ok -and -not $bad) 'same-contract policy correction did not require the exact durable candidate'
        }
        Check 'RD-24' {
            $fx=Join-Path $Root 'rd24';& git init -b main --quiet $fx
            $prefix='ORCIVO_'+'SYNTHETIC_SECRET_'
            Write-Utf8 (Join-Path $fx 'baseline.txt') ($prefix+'BASELINE123');& git -C $fx add .;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m baseline --quiet
            $base=(& git -C $fx rev-parse HEAD).Trim();$fixtureName='approval_'+'token';$fixtureValue='valid-test-'+'token';Write-Utf8 (Join-Path $fx 'tracked.ts') "const { token } = params;`nconst PDF_BUCKET = 'orcivo-pdfs';`n";Write-Utf8 (Join-Path $fx 'tracked.spec.ts') "const $fixtureName = '$fixtureValue';`n";& git -C $fx add tracked.ts tracked.spec.ts;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m clean --quiet
            Write-Utf8 (Join-Path $fx 'node_modules\dependency.txt') ($prefix+'UNTRACKED123')
            $clean=Test-GitTreeSecretsClean -RepoDir $fx -BaseRef $base -Ref HEAD
            Write-Utf8 (Join-Path $fx 'tracked.ts') ($prefix+'TRACKED123');& git -C $fx add tracked.ts;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m secret --quiet
            $dirty=Test-GitTreeSecretsClean -RepoDir $fx -BaseRef $base -Ref HEAD
            Assert-True ($clean.clean -and -not $dirty.clean) 'immutable diff scan included baseline/cache content or missed a changed tracked secret'
        }
        Check 'RD-25' {
            $tv='6'*64;Initialize-LedgerTask -TaskVersionId $tv -Identity @{taskId='PHASE-RESUME'}|Out-Null
            Add-LedgerEvent -TaskVersionId $tv -Event ready -ToState READY|Out-Null
            Add-LedgerEvent -TaskVersionId $tv -Event dispatch -ToState DISPATCHED -RunId run-phase|Out-Null
            Add-LedgerEvent -TaskVersionId $tv -Event running -ToState RUNNING -RunId run-phase|Out-Null
            Enter-DispatcherLedgerPhase -TaskVersionId $tv -RunId run-phase -Phase CHECKING
            $checkingSeq=(Get-LedgerState $tv).seq
            Enter-DispatcherLedgerPhase -TaskVersionId $tv -RunId run-phase -Phase CHECKING
            Assert-True ((Get-LedgerState $tv).seq -eq $checkingSeq) 'CHECKING restart duplicated a ledger event'
            Enter-DispatcherLedgerPhase -TaskVersionId $tv -RunId run-phase -Phase REVIEWING
            $reviewingSeq=(Get-LedgerState $tv).seq
            Enter-DispatcherLedgerPhase -TaskVersionId $tv -RunId run-phase -Phase REVIEWING
            Assert-True ((Get-LedgerState $tv).seq -eq $reviewingSeq) 'REVIEWING restart duplicated a ledger event'
        }
        Check 'RD-26' {
            $data=Join-Path $Root 'rd26-review'
            $prefix='ORCIVO_'+'SYNTHETIC_SECRET_'
            $fixtureField='api'+'Token';$fixtureValue='literal-to-'+'redact'
            $diff="diff --git a/source.ts b/source.ts`n+const { token } = params;`n+const PDF_BUCKET = 'orcivo-pdfs';`n+const $fixtureField = '$fixtureValue';`n+$prefix"+'TRACKED123'
            Build-ReviewPrompt -DataDir $data -TaskVersionId ('7'*64) -Head ('8'*40) -TreeHash ('9'*40) -DiffHash ('sha256:'+('a'*64)) -SpecHash ('sha256:'+('b'*64)) -AcceptanceText 'AC1: review' -SpecText 'spec' -Diff $diff -ChangedFiles @('source.ts') -CheckSummary 'PASS' -CriteriaIds @('AC1') | Out-Null
            $frozen=Get-Content (Join-Path $data 'diff.patch') -Raw
            Assert-True ($frozen -match 'const \{ token \} = params' -and $frozen -match "PDF_BUCKET = 'orcivo-pdfs'") 'review diff redacted ordinary source syntax'
            Assert-True ($frozen -match 'literal-to-redact' -and $frozen -notmatch ($prefix+'TRACKED123') -and $frozen -match '\[REDACTED\]') 'review diff lost a scan-cleared fixture or exposed a high-confidence secret'
        }
        Check 'RD-27' {
            $fx=Join-Path $Root 'rd27';& git init -b main --quiet $fx
            Write-Utf8 (Join-Path $fx 'source.ts') "const oldValue = true;`n";& git -C $fx add .;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m base --quiet
            $fixtureName='approval_'+'token';$fixtureValue='valid-test-'+'token'
            Write-Utf8 (Join-Path $fx 'source.ts') "const { token } = params;`nconst $fixtureName = '$fixtureValue';`n"
            $captured=Invoke-GitV2 -Dir $fx -Arguments @('diff','--no-color') -LogLabel 'review-source-capture' -ReviewedSourceOutput
            Assert-True ($captured.exitCode -eq 0 -and $captured.stdout -match 'approval_token' -and $captured.stdout -notmatch '\[REDACTED\]') 'git diff capture redacted scan-cleared review source'
        }
        Check 'RD-28' {
            $message=Get-IntegrationCommitMessage -TaskVersionId ('a'*64)
            Assert-True ($message -eq 'chore(orchestration): integrate aaaaaaaaaaaa') 'integrator merge subject is not Conventional Commits-compatible'
        }
        Check 'RD-29' {
            $scanRoot=Join-Path $Root 'rd29-prisma';$uri='postgresql'+'://'+'fixture-user'+':'+'fixture-pass'+'@localhost:5544/orcivo_dev'
            Write-Utf8 (Join-Path $scanRoot 'schema.prisma') "datasource db {`n  url = `"$uri`"`n}`n"
            $candidateScan=Test-ArtifactsClean -Root $scanRoot -SourceTree
            Assert-True (-not $candidateScan.clean) 'observability fixture did not produce a candidate secret hit'
            $tv='c'*64;$run='run-secret-observability'
            Initialize-LedgerTask -TaskVersionId $tv -Identity @{taskId='SECRET-OBS'}|Out-Null
            Add-LedgerEvent -TaskVersionId $tv -Event ready -ToState READY|Out-Null
            Add-LedgerEvent -TaskVersionId $tv -Event dispatch -ToState DISPATCHED -RunId $run|Out-Null
            Add-LedgerEvent -TaskVersionId $tv -Event running -ToState RUNNING -RunId $run|Out-Null
            Enter-DispatcherLedgerPhase -TaskVersionId $tv -RunId $run -Phase CHECKING
            $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';taskId='SECRET-OBS';taskVersionId=$tv;runId=$run;status='RUNNING';stage='IMPLEMENT'}
            $scan=[ordered]@{clean=$false;candidate=[ordered]@{clean=$false;baseSha=('d'*40);headSha=('e'*40);hits=@($candidateScan.hits)};artifacts=[ordered]@{clean=$true;hits=@()};hits=@($candidateScan.hits)}
            Set-DispatcherSecretBlock -State $state -Scan $scan|Out-Null
            $durable=Get-DispatcherState;$diagnostics=[string](@($durable.secretScan.hits)-join ' ')
            Assert-True ($durable.status -eq 'BLOCKED' -and -not $durable.secretScan.clean -and -not $durable.secretScan.candidate.clean -and $durable.secretScan.artifacts.clean) 'secret-block scan result was not persisted before return'
            Assert-True ($durable.secretScan.candidate.baseSha -eq ('d'*40) -and $durable.secretScan.candidate.headSha -eq ('e'*40)) 'secret-block scan omitted its immutable candidate binding'
            Assert-True ($diagnostics -match 'schema\.prisma :: /' -and $diagnostics -notmatch 'fixture-pass') 'secret-block diagnostics did not retain path + regex safely'
            Assert-True ((Get-LedgerState $tv).state -eq 'FAILED') 'secret-block did not fail the ledger closed'
        }
        Check 'RD-30' {
            $f=New-HistoricalResumeFixture 'RD30'
            Assert-True (Test-DispatcherCandidateResumeEligible -State $f.state -Task $f.task -TaskSource $f.source) 'second secret-block did not accept a fully proven historical reviewed candidate'
        }
        Check 'RD-31' {
            $f=New-HistoricalResumeFixture 'RD31';$f.state.candidateHead=$f.implementation
            Assert-True (-not(Test-DispatcherCandidateResumeEligible -State $f.state -Task $f.task -TaskSource $f.source)) 'candidateHead equal to implementationCommit was accepted as historical'
        }
        Check 'RD-32' {
            $f=New-HistoricalResumeFixture 'RD32';& git -C $f.workspace checkout -b unrelated $f.base --quiet
            Write-Utf8 (Join-Path $f.workspace 'unrelated.txt') "unrelated`n";& git -C $f.workspace add .;& git -C $f.workspace -c user.name=rd -c user.email=rd@local commit -m unrelated --quiet
            $f.state.implementationCommit=(& git -C $f.workspace rev-parse HEAD).Trim();$f.state.secretScan.candidate.headSha=$f.state.implementationCommit
            Assert-True (-not(Test-DispatcherCandidateResumeEligible -State $f.state -Task $f.task -TaskSource $f.source)) 'non-descendant implementation was accepted'
        }
        Check 'RD-33' {
            $f=New-HistoricalResumeFixture 'RD33';& git -C $f.workspace checkout $f.historical --quiet
            Assert-True (-not(Test-DispatcherCandidateResumeEligible -State $f.state -Task $f.task -TaskSource $f.source)) 'workspace HEAD divergent from implementationCommit was accepted'
        }
        Check 'RD-34' {
            $f=New-HistoricalResumeFixture 'RD34';Write-Utf8 (Join-Path $f.workspace 'dirty.txt') "dirty`n"
            Assert-True (-not(Test-DispatcherCandidateResumeEligible -State $f.state -Task $f.task -TaskSource $f.source)) 'dirty workspace was accepted'
        }
        Check 'RD-35' {
            $f=New-HistoricalResumeFixture 'RD35';Write-Utf8 (Join-Path $f.runRoot 'provider.log') ('ORCIVO_'+'SYNTHETIC_SECRET_'+('a'*16))
            Assert-True (-not(Test-DispatcherCandidateResumeEligible -State $f.state -Task $f.task -TaskSource $f.source)) 'dirty current artifact scan was accepted'
        }
        Check 'RD-36' {
            $f=New-HistoricalResumeFixture 'RD36';$path=Join-Path (Get-V2Dir) "attestations\$($f.state.taskVersionId)\review-$($f.historicalReview.attestationId).json"
            $tampered=Read-V2Json $path;$tampered.result='APPROVE';Write-V2JsonCanonical $path $tampered
            Assert-True (-not(Test-DispatcherCandidateResumeEligible -State $f.state -Task $f.task -TaskSource $f.source)) 'incompatible/tampered historical review attestation was accepted'
        }
        Check 'RD-37' {
            $f=New-HistoricalResumeFixture 'RD37';New-Attestation -Kind review -TaskVersionId $f.state.taskVersionId -RunId $f.state.runId -Bindings ([hashtable]$f.implementationBindings) -Result APPROVE|Out-Null
            Assert-True (-not(Test-DispatcherCandidateResumeEligible -State $f.state -Task $f.task -TaskSource $f.source)) 'implementationCommit with an existing review was accepted as unreviewed'
        }
        Check 'RD-38' {
            $f=New-HistoricalResumeFixture 'RD38';$run=$f.state.runId;$version=$f.state.taskVersionId;$workspace=$f.state.workspace;$cycle=$f.state.cycle;$historical=$f.state.candidateHead
            Assert-True (Resume-DispatcherCandidate -State $f.state -Task $f.task -TaskSource $f.source) 'official durable candidate-resume transition refused a proven restart'
            $durable=Get-DispatcherState
            Assert-True ($durable.status -eq 'RUNNING' -and (Get-LedgerState $version).state -eq 'RUNNING') 'restart did not durably return state/ledger to RUNNING'
            Assert-True ($durable.runId -eq $run -and $durable.taskVersionId -eq $version -and $durable.workspace -eq $workspace -and [int]$durable.cycle -eq [int]$cycle) 'restart changed run, taskVersionId, workspace, or bounded cycle'
            Assert-True ($durable.candidateHead -eq $historical -and $durable.historicalCandidate.head -eq $historical) 'restart did not preserve and label the previous candidateHead as historical'
        }
        Check 'RD-39' {
            $f=New-HistoricalResumeFixture 'RD39';$gate=Read-V2Json $f.gatePath;$gate.taskId='OTHER';Write-V2JsonCanonical $f.gatePath $gate
            Assert-True (-not(Test-DispatcherCandidateResumeEligible -State $f.state -Task $f.task -TaskSource $f.source)) 'mismatched exact-version approval was accepted'
        }
        Check 'RD-40' {
            $f=New-ReviewBudgetSupersessionFixture 'RD40'
            Assert-True (Test-DispatcherContractSupersessionEligible -State $f.state -Task $f.newTask -Contract $f.newContract -TaskSource $f.newSource) 'fresh FAILED_REVIEW_BUDGET successor was not eligible'
        }
        Check 'RD-41' {
            $f=New-ReviewBudgetSupersessionFixture 'RD41';$f.state.diffHash=('sha256:'+('0'*64))
            Assert-True (-not(Test-DispatcherContractSupersessionEligible -State $f.state -Task $f.newTask -Contract $f.newContract -TaskSource $f.newSource)) 'review binding drift was accepted'
        }
        Check 'RD-42' {
            $f=New-ReviewBudgetSupersessionFixture 'RD42';& git -C $f.workspace checkout $f.historical --quiet
            Assert-True (-not(Test-DispatcherContractSupersessionEligible -State $f.state -Task $f.newTask -Contract $f.newContract -TaskSource $f.newSource)) 'divergent workspace HEAD was accepted'
        }
        Check 'RD-43' {
            $f=New-ReviewBudgetSupersessionFixture 'RD43';Write-Utf8 (Join-Path $f.runRoot 'dirty.log') ('ORCIVO_'+'SYNTHETIC_SECRET_'+('x'*16))
            Assert-True (-not(Test-DispatcherContractSupersessionEligible -State $f.state -Task $f.newTask -Contract $f.newContract -TaskSource $f.newSource)) 'dirty artifact scan was accepted'
        }
        Check 'RD-44' {
            $f=New-ReviewBudgetSupersessionFixture 'RD44';$path=Join-Path (Get-V2Dir) "attestations\$($f.state.taskVersionId)\review-$($f.review.attestationId).json"
            $tampered=Read-V2Json $path;$tampered.payload.findings[0].detail='tampered';Write-V2JsonCanonical $path $tampered
            Assert-True (-not(Test-DispatcherContractSupersessionEligible -State $f.state -Task $f.newTask -Contract $f.newContract -TaskSource $f.newSource)) 'stale/tampered latest review attestation was accepted'
        }
        Check 'RD-45' {
            $f=New-ReviewBudgetSupersessionFixture 'RD45'
            $parsed=[ordered]@{verdict='REQUEST_CHANGES';envelope=[ordered]@{findings=@([ordered]@{severity='high';detail='newest actionable'},[ordered]@{severity='info';detail='not corrective'})}}
            Set-DispatcherReviewOutcome -State $f.state -ParsedReview $parsed -InvocationId 'latest-invocation' -Attestation $f.review|Out-Null
            $durable=Get-DispatcherState
            Assert-True ($durable.reviewVerdict -eq 'REQUEST_CHANGES' -and $durable.reviewInvocationId -eq 'latest-invocation' -and $durable.reviewAttestationId -eq $f.review.attestationId) 'latest review provenance was not persisted'
            Assert-True (@($durable.findings).Count -eq 1 -and $durable.findings[0] -eq 'high: newest actionable') 'latest actionable findings were not persisted or INFO was retained'
        }
        Check 'RD-46' {
            $f=New-ReviewBudgetSupersessionFixture 'RD46';Write-DispatcherState $f.state|Out-Null
            $run=$f.state.runId;$workspace=$f.workspace;$oldVersion=$f.state.taskVersionId;$candidate=$f.implementation
            $result=Invoke-RealDispatcherTask -Task $f.newTask -TaskSource $f.newSource
            Assert-True ($result.status -eq 'WAITING_HUMAN' -and $result.stage -eq 'GATE' -and [bool]$result.pendingContractSupersession) 'official restart did not enter the successor owner gate'
            Assert-True ($result.runId -eq $run -and $result.workspace -eq $workspace -and $result.taskVersionId -eq $f.newContract.taskVersionId) 'official restart changed the run/workspace or selected the wrong successor version'
            Assert-True ($result.supersededTaskVersionId -eq $oldVersion -and $result.recoveredCandidateCommit -eq $candidate) 'official restart did not preserve rejected-candidate lineage'
            Assert-True ($result.supersededReview.attestationId -eq $f.review.attestationId -and @($result.findings).Count -eq 1 -and $result.findings[0] -eq 'high: latest finding') 'official restart did not bind the newest rejected review and findings'
        }
        Check 'RD-47' {
            $top=ConvertFrom-ClaudeResult ([pscustomobject]@{api_error_status=403;is_error=$true;subtype='success';terminal_reason='api_error';result='SUBSCRIPTION ACCESS DISABLED for Claude Code';permission_denials=@()})
            $nested=ConvertFrom-ClaudeResult ([pscustomobject]@{is_error=$true;subtype='Success';terminal_reason='API-ERROR';error=[pscustomobject]@{status=403;message='Claude Code subscription access is unavailable'}})
            Assert-True ($top.apiErrorStatus -eq 403 -and $top.isError -and $top.subtype -eq 'success' -and $top.terminalReason -eq 'api_error') 'Claude top-level structured error fields were not preserved'
            Assert-True ((Get-FailureClassV2 -Provider claude -ExitCode 1 -Control $top) -eq 'PROVIDER_AUTH') 'top-level subscription-disabled response was not failover eligible'
            Assert-True ($nested.httpStatus -eq 403 -and (Get-FailureClassV2 -Provider claude -ExitCode 1 -Control $nested) -eq 'PROVIDER_AUTH') 'nested or mixed-case subscription-disabled response was not normalized'
            Assert-True ((ConvertTo-CanonicalFailureClass (Get-FailureClassV2 -Provider claude -ExitCode 1 -Control $top) $top) -eq 'TEMPORARY_AUTH_FAILURE') 'subscription-disabled response did not map to the canonical provider class'
        }
        Check 'RD-48' {
            $generic=ConvertFrom-ClaudeResult ([pscustomobject]@{api_error_status=403;is_error=$true;subtype='error';terminal_reason='api_error';result='request forbidden'})
            $denial=ConvertFrom-ClaudeResult ([pscustomobject]@{api_error_status=403;is_error=$true;subtype='success';terminal_reason='api_error';result='subscription access disabled';permission_denials=@('Read')})
            $refusal=ConvertFrom-ClaudeResult ([pscustomobject]@{api_error_status=403;is_error=$true;subtype='success';terminal_reason='model_refusal';result='I cannot comply with that request'})
            Assert-True ((Get-FailureClassV2 -Provider claude -ExitCode 1 -Control $generic) -eq 'APPLICATION_ERROR') 'generic HTTP 403 became failover eligible'
            Assert-True ((Get-FailureClassV2 -Provider claude -ExitCode 1 -Control $denial) -eq 'TOOL_ERROR') 'tool permission denial became provider unavailability'
            Assert-True ((Get-FailureClassV2 -Provider claude -ExitCode 1 -Control $refusal) -eq 'APPLICATION_ERROR') 'normal model refusal became provider unavailability'
        }
        Check 'RD-49' {
            $f=New-ProviderFailureRecoveryFixture 'RD49'
            $p=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash
            Assert-True ($p.eligible -and $p.derivedClass -eq 'TEMPORARY_AUTH_FAILURE') 'intact historical Claude provider failure was not recovery eligible'
        }
        Check 'RD-50' {
            $f=New-ProviderFailureRecoveryFixture 'RD50';Add-Content -LiteralPath $f.stdoutPath -Value 'tampered'
            $p=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash
            Assert-True (-not $p.eligible -and $p.reason -match 'hash') 'tampered provider evidence was accepted'
        }
        Check 'RD-51' {
            $f=New-ProviderFailureRecoveryFixture 'RD51'
            $badInvocation=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId ('att-'+('0'*32)) -EvidenceHash $f.evidenceHash
            $f.state.providerHistory[-1].provider='codex';$badProvider=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash
            $f.state.providerHistory[-1].provider='claude';$f.state.providerHistory[-1].attempt=2;$badAttempt=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash
            Assert-True (-not $badInvocation.eligible -and -not $badProvider.eligible -and -not $badAttempt.eligible) 'invocation/provider/attempt drift was accepted'
        }
        Check 'RD-52' {
            $f=New-ProviderFailureRecoveryFixture 'RD52';& git -C $f.workspace checkout $f.state.baseSha --quiet
            $badWorkspace=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash
            & git -C $f.workspace checkout $f.state.implementationCommit --quiet
            $f.source.hash='sha256:'+('0'*64);$badSource=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash
            Assert-True (-not $badWorkspace.eligible -and -not $badSource.eligible) 'workspace or task-source drift was accepted'
        }
        Check 'RD-53' {
            $f=New-ProviderFailureRecoveryFixture 'RD53';Write-Utf8 (Join-Path (Split-Path -Parent $f.stdoutPath) 'dirty.log') ('ORCIVO_'+'SYNTHETIC_SECRET_'+('r'*16))
            $p=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash
            Assert-True (-not $p.eligible -and $p.reason -match 'scan') 'dirty current artifact scan was accepted'
        }
        Check 'RD-54' {
            $f=New-ProviderFailureRecoveryFixture 'RD54';$bindings=Get-AttestationBindings -TaskVersionId $f.contract.taskVersionId -WorktreeDir $f.workspace -BaseSha $f.state.baseSha -HeadSha $f.state.implementationCommit
            New-Attestation -Kind check -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -Bindings ([hashtable]$bindings) -Result PASS|Out-Null
            $p=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash
            Assert-True (-not $p.eligible -and $p.reason -match 'attestation') 'successor attestation was ignored during recovery'
        }
        Check 'RD-55' {
            $f=New-ProviderFailureRecoveryFixture 'RD55';$gate=Get-HumanGatePath $f.contract.taskVersionId $f.task.ownerGate;$approval=Read-V2Json $gate;$approval.taskId='OTHER';Write-V2JsonCanonical $gate $approval
            $p=Test-DispatcherHistoricalProviderFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash
            Assert-True (-not $p.eligible -and $p.reason -match 'approval') 'drifted exact approval was accepted'
        }
        Check 'RD-56' {
            $f=New-ProviderFailureRecoveryFixture 'RD56';$run=$f.runId;$workspace=$f.workspace;$version=$f.contract.taskVersionId;$historyCount=@($f.state.providerHistory).Count
            $script:ProviderHealthFaults=@{claude='PROVIDER_AUTH';codex=$null}
            try{$first=Recover-DispatcherHistoricalProviderFailure -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $run -InvocationId $f.invocation -EvidenceHash $f.evidenceHash;$seq=(Get-LedgerState $version).seq;$second=Recover-DispatcherHistoricalProviderFailure -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $run -InvocationId $f.invocation -EvidenceHash $f.evidenceHash}
            finally{$script:ProviderHealthFaults=$null}
            $durable=Get-DispatcherState;$events=@(Get-Content -LiteralPath (Get-LedgerPath $version)|ForEach-Object{$_|ConvertFrom-Json})
            Assert-True ($first.status -eq 'RECOVERED' -and $second.status -eq 'ALREADY_RECOVERED') 'official provider recovery was not restart-idempotent'
            Assert-True ($durable.runId -eq $run -and $durable.workspace -eq $workspace -and $durable.taskVersionId -eq $version) 'provider recovery changed run/workspace/taskVersionId'
            Assert-True ($durable.provider -eq 'codex' -and [int]$durable.failovers -eq 1 -and (Get-LedgerState $version).seq -eq $seq) 'restart duplicated or lost the real provider failover'
            Assert-True (@($durable.providerHistory).Count -eq $historyCount -and @($durable.providerRecoveryHistory).Count -eq 1) 'historical provider event was altered or recovery evidence duplicated'
            Assert-True (@($events|Where-Object event -eq 'provider-failure-reclassified').Count -eq 1 -and @($events|Where-Object event -eq 'provider-failover').Count -eq 1) 'durable reclassification/failover transitions were missing or duplicated'
        }
        Check 'RD-57' {
            $f=New-Utf8StdinRecoveryFixture 'RD57'
            $p=Test-DispatcherUtf8StdinFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            Assert-True ($p.eligible -and $p.expectedHead -eq $f.state.implementationCommit) 'intact UTF-8 stdin infrastructure failure was not recovery eligible'
        }
        Check 'RD-58' {
            $f=New-Utf8StdinRecoveryFixture 'RD58';Add-Content -LiteralPath $f.promptPath -Value 'tampered'
            $badPrompt=Test-DispatcherUtf8StdinFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            $f=New-Utf8StdinRecoveryFixture 'RD58B';Add-Content -LiteralPath $f.stderrPath -Value 'tampered'
            $badEvidence=Test-DispatcherUtf8StdinFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            Assert-True (-not $badPrompt.eligible -and $badPrompt.reason -match 'prompt' -and -not $badEvidence.eligible -and $badEvidence.reason -match 'stderr') 'tampered UTF-8 recovery evidence was accepted'
        }
        Check 'RD-59' {
            $f=New-Utf8StdinRecoveryFixture 'RD59';$badInvocation=Test-DispatcherUtf8StdinFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId ('att-'+('0'*32)) -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            $f.state.providerHistory[-1].provider='claude';$badProvider=Test-DispatcherUtf8StdinFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            $f.state.providerHistory[-1].provider='codex';$f.state.providerHistory[-1].attempt=5;$badAttempt=Test-DispatcherUtf8StdinFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            Assert-True (-not $badInvocation.eligible -and -not $badProvider.eligible -and -not $badAttempt.eligible) 'UTF-8 recovery accepted invocation/provider/attempt drift'
        }
        Check 'RD-60' {
            $f=New-Utf8StdinRecoveryFixture 'RD60';$run=$f.runId;$workspace=$f.workspace;$version=$f.contract.taskVersionId;$historyCount=@($f.state.providerHistory).Count;$failovers=[int]$f.state.failovers;$cycle=[int]$f.state.cycle
            $first=Recover-DispatcherUtf8StdinFailure -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $run -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            $seq=(Get-LedgerState $version).seq
            $second=Recover-DispatcherUtf8StdinFailure -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $run -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            $durable=Get-DispatcherState;$events=@(Get-Content -LiteralPath (Get-LedgerPath $version)|ForEach-Object{$_|ConvertFrom-Json})
            Assert-True ($first.status -eq 'RECOVERED' -and $second.status -eq 'ALREADY_RECOVERED') 'official UTF-8 infrastructure recovery was not restart-idempotent'
            Assert-True ($durable.runId -eq $run -and $durable.workspace -eq $workspace -and $durable.taskVersionId -eq $version -and $durable.provider -eq 'codex') 'UTF-8 recovery changed run/workspace/taskVersionId/provider'
            Assert-True ([int]$durable.failovers -eq $failovers -and [int]$durable.cycle -eq $cycle -and (Get-LedgerState $version).seq -eq $seq) 'UTF-8 recovery consumed a failover/cycle or duplicated ledger transitions'
            Assert-True (@($durable.providerHistory).Count -eq $historyCount -and @($durable.agentInfrastructureRecoveryHistory).Count -eq 1) 'historical provider event was altered or infrastructure recovery duplicated'
            Assert-True (@($events|Where-Object event -eq 'agent-infrastructure-recovered').Count -eq 1 -and @($events|Where-Object event -eq 'agent-infrastructure-retry').Count -eq 1) 'durable UTF-8 recovery transitions were missing or duplicated'
        }
        Check 'RD-61' {
            $f=New-Utf8StdinRecoveryFixture 'RD61';& git -C $f.workspace checkout $f.state.baseSha --quiet
            $badWorkspace=Test-DispatcherUtf8StdinFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            & git -C $f.workspace checkout $f.state.implementationCommit --quiet
            $f.source.hash='sha256:'+('0'*64);$badSource=Test-DispatcherUtf8StdinFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            Assert-True (-not $badWorkspace.eligible -and -not $badSource.eligible) 'UTF-8 recovery accepted workspace or task-source drift'
        }
        Check 'RD-62' {
            $f=New-Utf8StdinRecoveryFixture 'RD62';Write-Utf8 (Join-Path (Split-Path -Parent $f.stderrPath) 'dirty.log') ('ORCIVO_'+'SYNTHETIC_SECRET_'+('u'*16))
            $p=Test-DispatcherUtf8StdinFailureRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PromptHash $f.promptHash
            Assert-True (-not $p.eligible -and $p.reason -match 'scan') 'UTF-8 recovery accepted a dirty current artifact scan'
        }
        Check 'RD-63' {
            $f=New-StoppedPartialRecoveryFixture 'RD63';$p=Test-DispatcherStoppedImplementationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash
            Assert-True ($p.eligible -and @($p.partial.paths).Count -eq 2) 'valid authorized dirty workspace was not recovery eligible'
        }
        Check 'RD-64' {
            $f=New-StoppedPartialRecoveryFixture 'RD64';Write-Utf8 (Join-Path $f.workspace 'outside.ts') 'export const outside = true;'
            $p=Test-DispatcherStoppedImplementationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash
            Assert-True (-not $p.eligible -and $p.reason -match 'out-of-scope') 'out-of-scope partial change was accepted'
        }
        Check 'RD-65' {
            $f=New-StoppedPartialRecoveryFixture 'RD65';$f.state.recoveredCandidateCommit=$f.state.baseSha
            $p=Test-DispatcherStoppedImplementationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash
            Assert-True (-not $p.eligible -and $p.reason -match 'HEAD') 'divergent workspace HEAD was accepted'
        }
        Check 'RD-66' {
            $f=New-StoppedPartialRecoveryFixture 'RD66';Write-Utf8 (Join-Path $f.workspace 'work\secret.ts') ("export const cloudCredential = 'AKIA"+('Z'*16)+"';")
            $p=Test-DispatcherStoppedImplementationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash
            Assert-True (-not $p.eligible -and $p.reason -match 'secret scan') 'secret-bearing partial diff was accepted'
        }
        Check 'RD-67' {
            $f=New-StoppedPartialRecoveryFixture 'RD67';Add-Content -LiteralPath $f.stdoutPath -Value 'tampered'
            $badHash=Test-DispatcherStoppedImplementationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash
            $f=New-StoppedPartialRecoveryFixture 'RD67B';$f.state.providerHistory|Where-Object invocationId -eq $f.invocation|ForEach-Object{$_.attempt=99}
            $badBinding=Test-DispatcherStoppedImplementationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash
            Assert-True (-not $badHash.eligible -and -not $badBinding.eligible) 'tampered invocation evidence or binding was accepted'
        }
        Check 'RD-68' {
            $f=New-StoppedPartialRecoveryFixture 'RD68';$script:DispatcherRecoveryRunnerProbe=$true
            try{$active=Test-DispatcherStoppedImplementationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash}finally{$script:DispatcherRecoveryRunnerProbe=$null}
            $lease=New-Lease -Namespace scheduler -Key main -RunId $f.runId
            try{$leased=Test-DispatcherStoppedImplementationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash}finally{if($lease.ok){Remove-Lease -Namespace scheduler -Key main -LeaseId $lease.leaseId|Out-Null}}
            Assert-True (-not $active.eligible -and -not $leased.eligible) 'active runner or lease was accepted'
        }
        Check 'RD-69' {
            $f=New-StoppedPartialRecoveryFixture 'RD69';Write-Utf8 $f.stopPath 'unproven stop'
            $p=Test-DispatcherStoppedImplementationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash (New-FileHash $f.stopPath)
            Assert-True (-not $p.eligible -and $p.reason -match 'provenance') 'stop without official provenance was accepted'
        }
        Check 'RD-70' {
            $f=New-StoppedPartialRecoveryFixture 'RD70';$version=$f.contract.taskVersionId;$run=$f.runId;$workspace=$f.workspace;$before=@(git -C $workspace status --porcelain=v1)
            $first=Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $run -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash;$seq=(Get-LedgerState $version).seq
            $second=Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $run -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash;$durable=Get-DispatcherState;$after=@(git -C $workspace status --porcelain=v1)
            Assert-True ($first.status -eq 'RECOVERED' -and $second.status -eq 'ALREADY_RECOVERED' -and (Get-LedgerState $version).seq -eq $seq) 'repeated recovery duplicated its transition'
            Assert-True ($durable.status -eq 'WAITING_PROVIDER' -and $durable.runId -eq $run -and $durable.workspace -eq $workspace -and [int]$durable.failovers -eq 1 -and [int]$durable.cycle -eq 1) 'recovery changed lineage, cycle, or failover count'
            Assert-True (($before -join "`n") -eq ($after -join "`n")) 'recovery did not preserve the partial workspace'
        }
        Check 'RD-71' {
            $f=New-StoppedPartialRecoveryFixture 'RD71';$script:StoppedRecoveryFaultAfterLedger=$true
            try{try{Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash|Out-Null}catch{}}finally{$script:StoppedRecoveryFaultAfterLedger=$null}
            $resumed=Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash
            $events=@(Read-JsonLines (Get-LedgerPath $f.contract.taskVersionId)|Where-Object event -eq 'stopped-implementation-recovered')
            Assert-True ($resumed.status -eq 'RECOVERED' -and $events.Count -eq 1) 'restart after recovery crash duplicated or lost the durable transition'
        }
        Check 'RD-72' {
            $f=New-StoppedPartialRecoveryFixture 'RD72';Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash|Out-Null
            $wait=Get-ProviderWait $f.contract.taskVersionId;$wait.nextRetryAt=(Get-Date).ToUniversalTime().AddSeconds(-1).ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $f.contract.taskVersionId) $wait
            $script:ProviderHealthFaults=@{claude='PROVIDER_AUTH';codex='PROVIDER_QUOTA'};try{$none=Resume-DispatcherProviderWait (Get-DispatcherState)}finally{$script:ProviderHealthFaults=$null}
            $still=Get-DispatcherState;$wasWaiting=($still.status -eq 'WAITING_PROVIDER');$wait=Get-ProviderWait $f.contract.taskVersionId;$wait.nextRetryAt=(Get-Date).ToUniversalTime().AddSeconds(-1).ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $f.contract.taskVersionId) $wait
            $script:ProviderHealthFaults=@{claude='PROVIDER_AUTH';codex=$null};try{$codex=Resume-DispatcherProviderWait $still}finally{$script:ProviderHealthFaults=$null};$durable=Get-DispatcherState
            Assert-True (-not $none -and $wasWaiting) 'both unavailable providers did not remain durably waiting'
            Assert-True ($codex -and $durable.status -eq 'RUNNING' -and $durable.provider -eq 'codex' -and [int]$durable.failovers -eq 1) 'returning Codex did not resume once without another failover'
        }
        Check 'RD-73' {
            $f=New-StoppedInflightRecoveryFixture 'RD73';$p=Test-DispatcherStoppedInflightRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash
            Add-Content -LiteralPath $f.stdoutPath -Value 'tampered';$bad=Test-DispatcherStoppedInflightRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash
            Assert-True ($p.eligible -and -not $bad.eligible -and $bad.reason -match 'hash') 'in-flight stop proof was rejected or tampered raw evidence was accepted'
        }
        Check 'RD-74' {
            $f=New-StoppedInflightRecoveryFixture 'RD74';$version=$f.contract.taskVersionId;$before=@(git -C $f.workspace status --porcelain=v1 --untracked-files=all);$failovers=[int]$f.state.failovers;$cycle=[int]$f.state.cycle
            $script:StoppedInflightRecoveryFaultAfterLedger=$true;try{try{Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash|Out-Null}catch{}}finally{$script:StoppedInflightRecoveryFaultAfterLedger=$null}
            $first=Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash;$seq=(Get-LedgerState $version).seq
            $second=Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash;$durable=Get-DispatcherState;$after=@(git -C $f.workspace status --porcelain=v1 --untracked-files=all)
            Assert-True ($first.status -eq 'RECOVERED' -and $second.status -eq 'ALREADY_RECOVERED' -and (Get-LedgerState $version).seq -eq $seq) 'in-flight recovery was not crash-safe and idempotent'
            Assert-True ($durable.status -eq 'RUNNING' -and [int]$durable.failovers -eq $failovers -and [int]$durable.cycle -eq $cycle -and (($before -join "`n") -eq ($after -join "`n"))) 'in-flight recovery changed lineage, budgets, or partial workspace'
        }
        Check 'RD-75' {
            $f=New-StoppedPartialRecoveryFixture 'RD75';$state=$f.state;$state.status='RUNNING';$state.reason='';Write-DispatcherState $state|Out-Null;$seq=(Get-LedgerState $state.taskVersionId).seq
            Assert-True (Set-DispatcherStoppedAfterAgentIfRequested $state) 'post-agent stop marker was not given precedence'
            $durable=Get-DispatcherState;Assert-True ($durable.status -eq 'STOPPED' -and $durable.reason -eq 'explicit stop requested' -and (Get-LedgerState $state.taskVersionId).seq -eq $seq) 'post-agent stop mutated the ledger or failed to persist STOPPED'
        }
        Check 'RD-76' {
            $f=New-StoppedPartialRecoveryFixture 'RD76';Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash|Out-Null
            $state=Get-DispatcherState;$first=Get-ProviderWait $state.taskVersionId;$first.resolvedAt=(Get-Date).ToUniversalTime().ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $state.taskVersionId) $first
            Enter-DispatcherProviderWait $state 'QUOTA_EXHAUSTED' 'codex'|Out-Null;$second=Get-ProviderWait $state.taskVersionId
            $second.resolvedAt=(Get-Date).ToUniversalTime().ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $state.taskVersionId) $second
            Enter-DispatcherProviderWait $state 'QUOTA_EXHAUSTED' 'codex'|Out-Null;$third=Get-ProviderWait $state.taskVersionId
            Assert-True ([int]$second.pollCount -gt [int]$first.pollCount -and [int]$third.pollCount -gt [int]$second.pollCount) 'failed real probes reset the durable provider backoff'
            Assert-True ([int]$third.nextBackoffSec -ge [int]$second.nextBackoffSec -and @($third.unavailableProviders) -contains 'codex') 'provider wait lost unavailable-provider evidence or reduced backoff'
        }
        Check 'RD-77' {
            $f=New-StoppedPartialRecoveryFixture 'RD77';Recover-DispatcherStoppedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -StopHash $f.stopHash|Out-Null
            $state=Get-DispatcherState;$wait=Get-ProviderWait $state.taskVersionId;$wait.nextRetryAt=(Get-Date).ToUniversalTime().AddSeconds(-1).ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $state.taskVersionId) $wait
            $before=@($state.unavailableProviders);$script:ProviderHealthFaults=@{claude='PROVIDER_AUTH';codex=$null}
            try{$resumed=Resume-DispatcherProviderWait $state}finally{$script:ProviderHealthFaults=$null}
            $durable=Get-DispatcherState
            Assert-True ($resumed -and $durable.status -eq 'RUNNING') 'healthy probe did not resume the preserved implementation'
            Assert-True (@($before|Where-Object{@($durable.unavailableProviders) -notcontains $_}).Count -eq 0) 'PATH-level health probe erased durable provider failures before a successful turn'
            Assert-True ([int]$durable.failovers -eq 1 -and [int]$durable.cycle -eq 1) 'provider probe changed failover or correction budgets'
        }
        Check 'RD-78' {
            $f=New-IncompleteProviderResultFixture 'RD78';$authority=Get-DispatcherOwnerGateAuthority -State $f.state -Task $f.task -TaskSource $f.source
            $first=Reconcile-DispatcherOwnerGateProjection -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId;$second=Reconcile-DispatcherOwnerGateProjection -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId;$durable=Get-DispatcherState
            Assert-True ($authority.satisfied -and $authority.approval -eq 'APPROVED' -and $first.status -eq 'RECONCILED' -and $second.status -eq 'ALREADY_RECONCILED' -and $durable.gate.approval -eq 'APPROVED') 'hash-bound approval did not reconcile a stale snapshot idempotently'
        }
        Check 'RD-79' {
            $f=New-IncompleteProviderResultFixture 'RD79';$p=Test-DispatcherIncompleteProviderResultRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash
            $badHash=Test-DispatcherIncompleteProviderResultRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash ('sha256:'+('0'*64)) -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash
            $badDiff=Test-DispatcherIncompleteProviderResultRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash ('sha256:'+('0'*64)) -PartialFilesHash $f.partialFilesHash
            Assert-True ($p.eligible -and -not $badHash.eligible -and -not $badDiff.eligible) 'incomplete exit-zero result or recovery hash bindings were accepted incorrectly'
        }
        Check 'RD-80' {
            $f=New-IncompleteProviderResultFixture 'RD80';$run=$f.runId;$workspace=$f.workspace;$version=$f.contract.taskVersionId;$before=@(git -C $workspace status --porcelain=v1 --untracked-files=all)
            $first=Recover-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $run -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash;$seq=(Get-LedgerState $version).seq
            $second=Recover-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $version -RunId $run -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash;$durable=Get-DispatcherState;$after=@(git -C $workspace status --porcelain=v1 --untracked-files=all)
            Assert-True ($first.status -eq 'RECOVERED' -and $first.dispatcherStatus -eq 'RUNNING' -and $second.status -eq 'ALREADY_RECOVERED' -and (Get-LedgerState $version).seq -eq $seq) 'approved incomplete-result recovery was not idempotent'
            Assert-True ($durable.runId -eq $run -and $durable.workspace -eq $workspace -and [int]$durable.failovers -eq 1 -and [int]$durable.cycle -eq 1 -and (($before -join "`n") -eq ($after -join "`n"))) 'incomplete-result recovery changed preserved lineage or workspace'
        }
        Check 'RD-81' {
            $f=New-IncompleteProviderResultFixture 'RD81';$f.state.gate.approval='APPROVED';$gate=Get-HumanGatePath $f.contract.taskVersionId $f.task.ownerGate;Remove-Item -LiteralPath $gate -Force
            $r=Reconcile-DispatcherOwnerGateProjection -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId;$durable=Get-DispatcherState
            Assert-True ($r.authority.approval -ne 'APPROVED' -and $durable.gate.approval -ne 'APPROVED') 'snapshot alone granted authority after hash-bound approval removal'
        }
        Check 'RD-82' {
            $f=New-IncompleteProviderResultFixture 'RD82';$script:IncompleteProviderResultRecoveryFaultAfterLedger=$true
            try{try{Recover-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash|Out-Null}catch{}}finally{$script:IncompleteProviderResultRecoveryFaultAfterLedger=$null}
            $first=Recover-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash;$second=Recover-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash
            Assert-True ($first.status -eq 'RECOVERED' -and $second.status -eq 'ALREADY_RECOVERED' -and (Get-LedgerState $f.contract.taskVersionId).state -eq 'RUNNING') 'incomplete-result recovery was not crash-safe across restart'
        }
        Check 'RD-83' {
            $f=New-IncompleteProviderResultFixture 'RD83';$gate=Get-HumanGatePath $f.contract.taskVersionId $f.task.ownerGate;Remove-Item -LiteralPath $gate -Force
            $r=Recover-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash;$durable=Get-DispatcherState
            Assert-True ($r.dispatcherStatus -eq 'WAITING_HUMAN' -and $durable.stage -eq 'GATE' -and (Get-LedgerState $f.contract.taskVersionId).state -eq 'WAITING_HUMAN') 'missing hash-bound approval did not hold incomplete recovery at Level C gate'
        }
        Check 'RD-84' {
            $f=New-IncompleteProviderResultFixture 'RD84';$script:DispatcherRecoveryRunnerProbe=$true;try{$runner=Test-DispatcherIncompleteProviderResultRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash}finally{$script:DispatcherRecoveryRunnerProbe=$null}
            $lease=New-Lease -Namespace scheduler -Key main -TaskVersionId $f.contract.taskVersionId;try{$leased=Test-DispatcherIncompleteProviderResultRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash}finally{if($lease.ok){Remove-Lease -Namespace scheduler -Key main -LeaseId $lease.leaseId|Out-Null}}
            Assert-True (-not $runner.eligible -and -not $leased.eligible) 'incomplete-result recovery accepted an active runner or lease'
        }
        Check 'RD-85' {
            $f=New-IncompleteProviderResultFixture 'RD85';Add-Content -LiteralPath $f.stdoutPath -Value '{"type":"item.started","item":{"id":"redacted","command":"[REDACTED]"' -Encoding utf8;$hash=New-FileHash $f.stdoutPath;$f.state.providerHistory[-1].stdoutHash=$hash;$f.state.providerHistory[-1].controlRecordHash=$hash
            $p=Test-DispatcherIncompleteProviderResultRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $hash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash
            Assert-True ($p.eligible) 'redacted non-terminal Codex output was not recognized as incomplete safely'
        }
        Check 'RD-86' {
            $f=New-IncompleteProviderResultFixture 'RD86';Add-Content -LiteralPath $f.stdoutPath -Value 'not a structured provider event' -Encoding utf8;$hash=New-FileHash $f.stdoutPath;$f.state.providerHistory[-1].stdoutHash=$hash;$f.state.providerHistory[-1].controlRecordHash=$hash
            $p=Test-DispatcherIncompleteProviderResultRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $hash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash
            Assert-True (-not $p.eligible -and $p.reason -match 'malformed') 'opaque malformed provider output was accepted'
        }
        Check 'RD-87' {
            $f=New-IncompleteProviderWorkspaceMutationFixture 'RD87';$p=Test-DispatcherIncompleteProviderResultWorkspaceMutationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -WorkspaceMutationSnapshotHash $f.snapshotHash -WorkspaceMutationResultHash $f.resultHash
            $r=Recover-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -WorkspaceMutationSnapshotHash $f.snapshotHash -WorkspaceMutationResultHash $f.resultHash;$again=Recover-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -WorkspaceMutationSnapshotHash $f.snapshotHash -WorkspaceMutationResultHash $f.resultHash
            Assert-True ($p.eligible -and @($p.addedPaths).Count -eq 2 -and @($f.paths).Count -eq 6 -and $r.status -eq 'RECOVERED' -and $again.status -eq 'ALREADY_RECOVERED') 'attributed six-file incomplete workspace mutation was not recovered idempotently'
        }
        Check 'RD-88' {
            $f=New-IncompleteProviderWorkspaceMutationFixture 'RD88';$plain=$false;try{Recover-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash|Out-Null}catch{$plain=$_.Exception.Message -match 'workspace-mutation'}
            $f.state.workspaceInvocationSnapshots=@();Write-DispatcherState $f.state;$missing=Test-DispatcherIncompleteProviderResultWorkspaceMutationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -WorkspaceMutationSnapshotHash $f.snapshotHash -WorkspaceMutationResultHash $f.resultHash
            Assert-True ($plain -and -not $missing.eligible -and $missing.reason -match 'absent') 'additional workspace changes bypassed the dedicated pre-invocation manifest flow'
        }
        Check 'RD-89' {
            $f=New-IncompleteProviderWorkspaceMutationFixture 'RD89';$failures=@();$i=0;foreach($path in @($f.paths)){$i++;$g=New-IncompleteProviderWorkspaceMutationFixture ('RD89-'+$i);Add-Content -LiteralPath (Join-Path $g.workspace $path) -Value 'tampered' -Encoding utf8;$p=Test-DispatcherIncompleteProviderResultWorkspaceMutationRecovery -State $g.state -Task $g.task -TaskSource $g.source -RunId $g.runId -InvocationId $g.invocation -EvidenceHash $g.evidenceHash -PartialDiffHash $g.partialDiffHash -PartialFilesHash $g.partialFilesHash -WorkspaceMutationSnapshotHash $g.snapshotHash -WorkspaceMutationResultHash $g.resultHash;if($p.eligible){$failures+=,$path}}
            Assert-True ($failures.Count -eq 0) 'one of the six partial files could be altered after the launch manifest without rejection'
        }
        Check 'RD-90' {
            $f=New-IncompleteProviderWorkspaceMutationFixture 'RD90';$f.state.workspaceInvocationSnapshots[0].promptHash='sha256:'+('0'*64);Write-DispatcherState $f.state;$p=Test-DispatcherIncompleteProviderResultWorkspaceMutationRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -WorkspaceMutationSnapshotHash $f.snapshotHash -WorkspaceMutationResultHash $f.resultHash
            Assert-True (-not $p.eligible -and $p.reason -match 'corrupt|mismatch') 'tampered prompt-bound workspace manifest was accepted'
        }
        Check 'RD-91' {
            $f=New-IncompleteProviderWorkspaceMutationFixture 'RD91';$restart=Get-DispatcherState;$p=Test-DispatcherIncompleteProviderResultWorkspaceMutationRecovery -State $restart -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -WorkspaceMutationSnapshotHash $f.snapshotHash -WorkspaceMutationResultHash $f.resultHash
            Assert-True ($p.eligible -and [string]$restart.workspaceInvocationSnapshots[0].snapshotHash -eq $f.snapshotHash) 'workspace mutation manifest did not survive dispatcher restart'
        }
        Check 'RD-92' {
            $f=New-IncompleteProviderQuarantineFixture 'RD92';$trusted=$f.state.implementationCommit;$before=@(git -C $f.workspace status --porcelain=v1 --untracked-files=all);$proof=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            $first=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted;$state=Get-DispatcherState;$after=@(git -C $f.workspace status --porcelain=v1 --untracked-files=all);$clean=@(git -C $first.workspace status --porcelain=v1 --untracked-files=all);$seq=(Get-LedgerState $f.contract.taskVersionId).seq
            $again=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            Assert-True ($proof.eligible -and @($f.paths).Count -eq 6 -and $first.status -eq 'QUARANTINED_WAITING_PROVIDER' -and $again.status -eq 'ALREADY_QUARANTINED' -and ((Get-LedgerState $f.contract.taskVersionId).seq -eq $seq)) 'unattributed six-file incomplete result was not quarantined idempotently into the required provider wait'
            Assert-True ((($before -join "`n") -eq ($after -join "`n")) -and $state.workspace -eq $first.workspace -and $state.workspace -ne $f.workspace -and $clean.Count -eq 0 -and $state.status -eq 'WAITING_PROVIDER' -and $state.provider -eq 'deepseek' -and $state.model -eq 'deepseek-v4-pro' -and $state.profile -eq 'REASONING' -and [int]$state.failovers -eq 1 -and [int]$state.cycle -eq 1 -and $state.quarantineReference.contentLoaded -eq $false -and $state.quarantineReference.policy -match 'NON_AUTHORITATIVE') 'quarantine changed old evidence, imported it, or failed to retain the required DeepSeek wait'
            Remove-DispatcherWorkspace -Workspace $first.workspace
        }
        Check 'RD-93' {
            $f=New-IncompleteProviderQuarantineFixture 'RD93';$trusted=$f.state.implementationCommit;$script:IncompleteProviderResultQuarantineFaultAfterLedger=$true
            try{try{Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted|Out-Null}catch{}}finally{$script:IncompleteProviderResultQuarantineFaultAfterLedger=$null}
            $restart=Get-DispatcherState;$resumed=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted;$durable=Get-DispatcherState
            Assert-True ($restart.status -eq 'AGENT_FAILURE' -and $resumed.status -eq 'QUARANTINED_WAITING_PROVIDER' -and $durable.status -eq 'WAITING_PROVIDER' -and $durable.workspace -ne $f.workspace -and (Get-LedgerState $f.contract.taskVersionId).state -eq 'WAITING_PROVIDER') 'quarantine was not restart-safe after its durable provider-wait prefix'
            Remove-DispatcherWorkspace -Workspace $durable.workspace
        }
        Check 'RD-94' {
            $f=New-IncompleteProviderQuarantineFixture 'RD94';$bad=@();$n=0;foreach($path in @($f.paths)){$n++;$g=New-IncompleteProviderQuarantineFixture ('RD94-'+$n);Add-Content -LiteralPath (Join-Path $g.workspace $path) -Value 'tampered' -Encoding utf8;$p=Test-DispatcherIncompleteProviderResultAbandonment -State $g.state -Task $g.task -TaskSource $g.source -RunId $g.runId -InvocationId $g.invocation -EvidenceHash $g.evidenceHash -PartialDiffHash $g.partialDiffHash -PartialFilesHash $g.partialFilesHash -TrustedHead $g.state.implementationCommit;if($p.eligible){$bad+=,$path}}
            Assert-True ($bad.Count -eq 0) 'quarantine accepted tampering of one of the six retained evidence files'
        }
        Check 'RD-95' {
            $f=New-IncompleteProviderQuarantineFixture 'RD95';$trusted=$f.state.implementationCommit;$script:DispatcherRecoveryRunnerProbe=$true;try{$runner=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted}finally{$script:DispatcherRecoveryRunnerProbe=$null}
            $lease=New-Lease -Namespace scheduler -Key main -TaskVersionId $f.contract.taskVersionId;try{$leased=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted}finally{if($lease.ok){Remove-Lease -Namespace scheduler -Key main -LeaseId $lease.leaseId|Out-Null}}
            Write-Utf8 (Join-Path $f.workspace 'outside.ts') 'export const outside = true;' ;$scope=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            Assert-True (-not $runner.eligible -and -not $leased.eligible -and -not $scope.eligible) 'quarantine accepted an active runner/lease or out-of-scope evidence file'
        }
        Check 'RD-99' {
            $f=New-IncompleteProviderQuarantineFixture 'RD99';$trusted=$f.state.implementationCommit
            $q=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            $state=Get-DispatcherState;$clean=@(git -C $state.workspace status --porcelain=v1 --untracked-files=all)
            Assert-True ($q.status -eq 'QUARANTINED_WAITING_PROVIDER' -and $clean.Count -eq 0 -and @($state.providerHistory|Where-Object{[string]$_.invocationId -ne $f.invocation}).Count -eq 0 -and $state.quarantineRetryRoute.provider -eq 'deepseek' -and $state.quarantineRetryRoute.reasoning -eq 'high') 'clean quarantined retry created an invocation or lost its pinned empty baseline'
            Remove-DispatcherWorkspace -Workspace $q.workspace
        }
        Check 'RD-101' {
            $pinned=[ordered]@{taskVersionId=('a'*64);stage='IMPLEMENT';provider='deepseek';model='deepseek-v4-pro';profile='REASONING';quarantineRetryRoute=[ordered]@{provider='deepseek';model='deepseek-v4-pro';profile='REASONING';reasoning='high';policy='CLEAN_QUARANTINED_RETRY_REQUIRES_FRESH_DEEPSEEK_PRO_HIGH'}}
            $route=Get-DispatcherPinnedQuarantinedRetryRoute $pinned;$drift=[ordered]@{}+$pinned;$drift.provider='codex';$failed=$false
            try{Resume-DispatcherProviderWait $drift|Out-Null}catch{$failed=$_.Exception.Message -eq 'quarantined retry route binding drift'}
            Assert-True ($route -and [string]$route.provider -eq 'deepseek' -and $failed) 'quarantined DeepSeek retry accepted a cross-provider resume'
        }
        Check 'RD-114' {
            $f=New-CompletedImplementationRecoveryFixture ('RD114-'+[guid]::NewGuid().ToString('N').Substring(0,8));$h=@{ExpectedRequestManifestHash=$f.requestHash;ExpectedStdoutHash=$f.stdoutHash;ExpectedControlRecordHash=$f.controlRecordHash;ExpectedPreManifestHash=$f.preHash;ExpectedPostManifestHash=$f.postHash;ExpectedPartialDiffHash=$f.partialDiffHash;ExpectedPartialFilesHash=$f.partialFilesHash;ExpectedTelemetryReceiptHash=$f.telemetryReceiptHash;ExpectedGateHash=$f.gateHash;ExpectedAttempt=349;ExpectedTailSeq=$f.tailSeq;ExpectedTailEventHash=$f.tailEventHash;TrustedHead=$f.trustedHead;ExpectedCostUsd=$f.costUsd;ExpectedPaths=$f.paths}
            $script:DispatcherRecoveryRunnerProbe=$false;try{Recover-DispatcherCompletedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @h|Out-Null}finally{$script:DispatcherRecoveryRunnerProbe=$null}
            $state=Get-DispatcherState;$state.status='WAITING_PROVIDER';$state.lastErrorClass='QUOTA_EXHAUSTED';$state.reviewerProvider='codex';$state.providerHistory=@($state.providerHistory)+@([ordered]@{invocationId='att-rd114';provider='codex';resultClass='AGENT_FAILURE';providerClass='QUOTA_EXHAUSTED'});$positive=Test-DispatcherAuthorizedQuarantinedReviewResume -State $state -ExpectedTaskId $state.taskId -ExpectedTaskVersionId $state.taskVersionId -ExpectedRunId $state.runId -ExpectedCandidateHead $state.candidateHead -ExpectedDiffHash $state.diffHash;$wrongCandidate=[ordered]@{}+$state;$wrongCandidate.candidateHead='0'*40;$wrongFailure=[ordered]@{}+$state;$wrongFailure.lastErrorClass='PROVIDER_UNAVAILABLE';$wrongReviewer=[ordered]@{}+$state;$wrongReviewer.reviewerProvider='claude'
            Assert-True ($positive -and -not(Test-DispatcherAuthorizedQuarantinedReviewResume -State $wrongCandidate -ExpectedTaskId $state.taskId -ExpectedTaskVersionId $state.taskVersionId -ExpectedRunId $state.runId -ExpectedCandidateHead $state.candidateHead -ExpectedDiffHash $state.diffHash) -and -not(Test-DispatcherAuthorizedQuarantinedReviewResume -State $wrongFailure -ExpectedTaskId $state.taskId -ExpectedTaskVersionId $state.taskVersionId -ExpectedRunId $state.runId -ExpectedCandidateHead $state.candidateHead -ExpectedDiffHash $state.diffHash) -and -not(Test-DispatcherAuthorizedQuarantinedReviewResume -State $wrongReviewer -ExpectedTaskId $state.taskId -ExpectedTaskVersionId $state.taskVersionId -ExpectedRunId $state.runId -ExpectedCandidateHead $state.candidateHead -ExpectedDiffHash $state.diffHash)) 'replacement review exception was not limited to the exact candidate, QUOTA_EXHAUSTED failure, and Codex reviewer'
            Remove-DispatcherWorkspace -Workspace $f.workspace
        }
        Check 'RD-100' {
            $f=New-IncompleteProviderQuarantineFixture 'RD100';$trusted=$f.state.implementationCommit
            $q=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            $state=Get-DispatcherState;Write-Utf8 (Join-Path $q.workspace 'outside.ts') 'export const outside = true;';$dirty=Get-DispatcherDirtyWorkspaceProof -Workspace $q.workspace -Task $f.task
            Assert-True (-not $dirty.clean -and @($state.workspaceInvocationSnapshots).Count -eq 0 -and $state.status -eq 'WAITING_PROVIDER') ("clean retry exception accepted an out-of-scope workspace mutation: dirty=$($dirty.clean); snapshots=$(@($state.workspaceInvocationSnapshots).Count); status=$($state.status); reason=$($dirty.reason)")
            Remove-DispatcherWorkspace -Workspace $q.workspace
        }
        Check 'RD-96' {
            $f=New-IncompleteProviderQuarantineFixture 'RD96';$trusted=$f.state.implementationCommit;$gate=Get-HumanGatePath $f.contract.taskVersionId $f.task.ownerGate;Remove-Item -LiteralPath $gate -Force;$approval=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            $wrong=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId 'run-wrong-version' -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            Assert-True (-not $approval.eligible -and -not $wrong.eligible) 'quarantine accepted missing approval or a divergent run/version binding'
        }
        Check 'RD-97' {
            $f=New-IncompleteProviderQuarantineFixture 'RD97';$trusted=$f.state.implementationCommit;$id=Get-DispatcherIncompleteProviderResultQuarantineWorkspaceId -RunId $f.runId -InvocationId $f.invocation;$target=Join-Path ([System.IO.Path]::GetTempPath()) ('orcivo-dispatcher\'+$id);$wait=$null
            $script:ProviderHealthFaults=@{claude='PROVIDER_UNAVAILABLE';codex='PROVIDER_UNAVAILABLE';deepseek='PROVIDER_UNAVAILABLE'}
            try{$wait=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted}finally{$script:ProviderHealthFaults=$null}
            $state=Get-DispatcherState;Assert-True ($wait.status -eq 'QUARANTINED_WAITING_PROVIDER' -and (Test-Path -LiteralPath $target) -and $state.status -eq 'WAITING_PROVIDER' -and $state.provider -eq 'deepseek' -and @($state.providerHistory).Count -eq @($f.state.providerHistory).Count) 'quarantine did not enter the canonical required-provider wait without an invocation'
            Remove-DispatcherWorkspace -Workspace $wait.workspace
        }
        Check 'RD-98' {
            $f=New-IncompleteProviderQuarantineFixture 'RD98';Add-Content -LiteralPath $f.stdoutPath -Value 'legacy non-json capture fragment' -Encoding utf8;$hash=New-FileHash $f.stdoutPath;$f.state.providerHistory[-1].stdoutHash=$hash;$f.state.providerHistory[-1].controlRecordHash=$hash
            $generic=Test-DispatcherIncompleteProviderResultRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $hash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash
            $quarantine=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $hash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $f.state.implementationCommit
            Assert-True (-not $generic.eligible -and $quarantine.eligible) ("legacy malformed incomplete evidence was accepted for work recovery or rejected for evidence-only quarantine: generic=$($generic.reason); quarantine=$($quarantine.reason)")
        }
        Check 'RD-102' {
            $legacy=New-IncompleteProviderQuarantineFixture 'RD102-legacy';$legacyProof=Test-DispatcherIncompleteProviderResultAbandonment -State $legacy.state -Task $legacy.task -TaskSource $legacy.source -RunId $legacy.runId -InvocationId $legacy.invocation -EvidenceHash $legacy.evidenceHash -PartialDiffHash $legacy.partialDiffHash -PartialFilesHash $legacy.partialFilesHash -TrustedHead $legacy.state.implementationCommit
            $f=New-ReconciledIncompleteProviderQuarantineFixture 'RD102';$proof=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $f.state.implementationCommit
            Assert-True ($legacyProof.eligible -and $proof.eligible -and $proof.base.attempt.exitCode -eq -1) 'reconciled hash-bound -1 invocation was not eligible or legacy exit-zero quarantine regressed'
        }
        Check 'RD-103a' {
            $f=New-ReconciledIncompleteProviderQuarantineFixture 'RD103a';$f.state.incompleteRunningInvocationRecoveryHistory=@();Write-DispatcherState $f.state|Out-Null;$p=Test-DispatcherIncompleteProviderResultAbandonment -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $f.state.implementationCommit
            Assert-True (-not $p.eligible) "reconciled -1 branch accepted missing receipt: $($p.reason)"
        }
        Check 'RD-103b' {
            $g=New-ReconciledIncompleteProviderQuarantineFixture 'RD103b';Add-LedgerEvent -TaskVersionId $g.contract.taskVersionId -Event retry -ToState READY -RunId $g.runId|Out-Null;Add-LedgerEvent -TaskVersionId $g.contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $g.runId -AttemptId $g.invocation|Out-Null;Add-LedgerEvent -TaskVersionId $g.contract.taskVersionId -Event unrelated -ToState FAILED -RunId $g.runId -AttemptId $g.invocation|Out-Null;$p=Test-DispatcherIncompleteProviderResultAbandonment -State $g.state -Task $g.task -TaskSource $g.source -RunId $g.runId -InvocationId $g.invocation -EvidenceHash $g.evidenceHash -PartialDiffHash $g.partialDiffHash -PartialFilesHash $g.partialFilesHash -TrustedHead $g.state.implementationCommit
            Assert-True (-not $p.eligible) "reconciled -1 branch accepted non-tail event: $($p.reason)"
        }
        Check 'RD-103c' {
            $h=New-ReconciledIncompleteProviderQuarantineFixture 'RD103c';$h.state.incompleteRunningInvocationRecoveryHistory[0].postManifestHash='sha256:'+('0'*64);Write-DispatcherState $h.state|Out-Null;$p=Test-DispatcherIncompleteProviderResultAbandonment -State (Get-DispatcherState) -Task $h.task -TaskSource $h.source -RunId $h.runId -InvocationId $h.invocation -EvidenceHash $h.evidenceHash -PartialDiffHash $h.partialDiffHash -PartialFilesHash $h.partialFilesHash -TrustedHead $h.state.implementationCommit
            Assert-True (-not $p.eligible) "reconciled -1 branch accepted tampered receipt: $($p.reason)"
        }
        Check 'RD-104' {
            $f=New-ReconciledIncompleteProviderQuarantineFixture 'RD104';Add-Content -LiteralPath $f.stdoutPath -Value '{"type":"turn.completed"}' -Encoding utf8;$terminal=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $f.state.implementationCommit
            $g=New-ReconciledIncompleteProviderQuarantineFixture 'RD104-drift';Add-Content -LiteralPath (Join-Path $g.workspace $g.paths[0]) -Value 'tampered' -Encoding utf8;$drift=Test-DispatcherIncompleteProviderResultAbandonment -State $g.state -Task $g.task -TaskSource $g.source -RunId $g.runId -InvocationId $g.invocation -EvidenceHash $g.evidenceHash -PartialDiffHash $g.partialDiffHash -PartialFilesHash $g.partialFilesHash -TrustedHead $g.state.implementationCommit
            $h=New-ReconciledIncompleteProviderQuarantineFixture 'RD104-generic';$h.state.incompleteRunningInvocationRecoveryHistory=@();Write-DispatcherState $h.state|Out-Null;$generic=Test-DispatcherIncompleteProviderResultAbandonment -State (Get-DispatcherState) -Task $h.task -TaskSource $h.source -RunId $h.runId -InvocationId $h.invocation -EvidenceHash $h.evidenceHash -PartialDiffHash $h.partialDiffHash -PartialFilesHash $h.partialFilesHash -TrustedHead $h.state.implementationCommit
            Assert-True (-not $terminal.eligible -and -not $drift.eligible -and -not $generic.eligible) 'reconciled branch accepted terminal output, workspace drift, or generic -1 failure'
        }
        Check 'RD-105' {
            $f=New-ReconciledIncompleteProviderQuarantineFixture 'RD105';$trusted=$f.state.implementationCommit;$first=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted;$restart=Get-DispatcherState;$again=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            Assert-True ($first.status -eq 'QUARANTINED_WAITING_PROVIDER' -and $again.status -eq 'ALREADY_QUARANTINED' -and $restart.status -eq 'WAITING_PROVIDER' -and $restart.workspace -eq $first.workspace -and (Get-GitHeadV2 $first.workspace) -eq $trusted) 'reconciled -1 quarantine was not restart-safe and idempotent'
            Remove-DispatcherWorkspace -Workspace $first.workspace
        }
        Check 'RD-106' {
            $f=New-QuarantinedRetryRouteRecoveryFixture 'RD106';$h=@{TrustedHead=$f.trustedHead;ExpectedTaskId=$f.task.taskId;ExpectedTaskVersionId=$f.contract.taskVersionId;ExpectedAttempt=$f.attempt;ExpectedTailSeq=$f.tailSeq};$history=@($f.state.providerHistory).Count
            $first=Recover-DispatcherQuarantinedRetryRoute -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash @h;$seq=(Get-LedgerState $f.contract.taskVersionId).seq;$second=Recover-DispatcherQuarantinedRetryRoute -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash @h;$state=Get-DispatcherState;$event=@((Read-JsonLines (Get-LedgerPath $f.contract.taskVersionId))|Where-Object event -eq 'quarantine-incompatible-route-reconciled')
            Assert-True ($first.status -eq 'RECOVERED_WAITING_PROVIDER' -and $second.status -eq 'ALREADY_RECOVERED' -and $state.status -eq 'WAITING_PROVIDER' -and $state.stage -eq 'IMPLEMENT' -and $state.provider -eq 'deepseek' -and $state.model -eq 'deepseek-v4-pro' -and $state.profile -eq 'REASONING' -and @($state.providerHistory).Count -eq $history -and $event.Count -eq 1 -and (Get-LedgerState $f.contract.taskVersionId).seq -eq $seq -and -not((Invoke-GitV2 -Dir $state.workspace -Arguments @('status','--porcelain=v1','--untracked-files=all') -LogLabel 'rd106').stdout.Trim())) 'quarantined retry route recovery was not exact, idempotent, or workspace-preserving'
            Remove-DispatcherWorkspace -Workspace $f.workspace
        }
        Check 'RD-107' {
            $f=New-QuarantinedRetryRouteRecoveryFixture 'RD107';$h=@{TrustedHead=$f.trustedHead;ExpectedTaskId=$f.task.taskId;ExpectedTaskVersionId=$f.contract.taskVersionId;ExpectedAttempt=$f.attempt;ExpectedTailSeq=$f.tailSeq};$wrongRun=Test-DispatcherQuarantinedRetryRouteRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId 'run-wrong' -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash @h;$wrongVersion=Test-DispatcherQuarantinedRetryRouteRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -ExpectedTaskVersionId ('0'*64) -ExpectedTaskId $f.task.taskId -ExpectedAttempt $f.attempt -ExpectedTailSeq $f.tailSeq -TrustedHead $f.trustedHead;$badHash=Test-DispatcherQuarantinedRetryRouteRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash ('sha256:'+('0'*64)) -PartialFilesHash $f.partialFilesHash @h;Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event unrelated -ToState FAILED -RunId $f.runId|Out-Null;$badTail=Test-DispatcherQuarantinedRetryRouteRecovery -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash @h
            Assert-True (-not $wrongRun.eligible -and -not $wrongVersion.eligible -and -not $badHash.eligible -and -not $badTail.eligible) 'quarantined retry route recovery accepted divergent bindings, hashes, or ledger tail'
            Remove-DispatcherWorkspace -Workspace $f.workspace
        }
        Check 'RD-108' {
            $f=New-QuarantinedRetryRouteRecoveryFixture 'RD108';$h=@{TrustedHead=$f.trustedHead;ExpectedTaskId=$f.task.taskId;ExpectedTaskVersionId=$f.contract.taskVersionId;ExpectedAttempt=$f.attempt;ExpectedTailSeq=$f.tailSeq};Write-Utf8 (Join-Path $f.workspace 'work\dirty.ts') 'export const dirty = true;';$dirty=Test-DispatcherQuarantinedRetryRouteRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash @h
            $g=New-QuarantinedRetryRouteRecoveryFixture 'RD108-history';$gh=@{TrustedHead=$g.trustedHead;ExpectedTaskId=$g.task.taskId;ExpectedTaskVersionId=$g.contract.taskVersionId;ExpectedAttempt=$g.attempt;ExpectedTailSeq=$g.tailSeq};$g.state.providerHistory+=@([ordered]@{invocationId='att-33333333333333333333333333333333';attempt=8;provider='deepseek'});Write-DispatcherState $g.state|Out-Null;$later=Test-DispatcherQuarantinedRetryRouteRecovery -State (Get-DispatcherState) -Task $g.task -TaskSource $g.source -RunId $g.runId -InvocationId $g.invocation -EvidenceHash $g.evidenceHash -PartialDiffHash $g.partialDiffHash -PartialFilesHash $g.partialFilesHash @gh
            $q=New-QuarantinedRetryRouteRecoveryFixture 'RD108-route';$qh=@{TrustedHead=$q.trustedHead;ExpectedTaskId=$q.task.taskId;ExpectedTaskVersionId=$q.contract.taskVersionId;ExpectedAttempt=$q.attempt;ExpectedTailSeq=$q.tailSeq};$q.state.provider='deepseek';Write-DispatcherState $q.state|Out-Null;$compatible=Test-DispatcherQuarantinedRetryRouteRecovery -State (Get-DispatcherState) -Task $q.task -TaskSource $q.source -RunId $q.runId -InvocationId $q.invocation -EvidenceHash $q.evidenceHash -PartialDiffHash $q.partialDiffHash -PartialFilesHash $q.partialFilesHash @qh
            Assert-True (-not $dirty.eligible -and -not $later.eligible -and -not $compatible.eligible) 'quarantined retry route recovery accepted dirty workspace, later invocation, or a compatible route'
            Remove-DispatcherWorkspace -Workspace $f.workspace;Remove-DispatcherWorkspace -Workspace $g.workspace;Remove-DispatcherWorkspace -Workspace $q.workspace
        }
        Check 'RD-109' {
            $f=New-QuarantinedRetryRouteRecoveryFixture 'RD109';$h=@{TrustedHead=$f.trustedHead;ExpectedTaskId=$f.task.taskId;ExpectedTaskVersionId=$f.contract.taskVersionId;ExpectedAttempt=$f.attempt;ExpectedTailSeq=$f.tailSeq};$script:DispatcherRecoveryRunnerProbe=$true;try{$runner=Test-DispatcherQuarantinedRetryRouteRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash @h}finally{$script:DispatcherRecoveryRunnerProbe=$null};$lease=New-Lease -Namespace scheduler -Key main -RunId $f.runId;try{$leased=Test-DispatcherQuarantinedRetryRouteRecovery -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash @h}finally{if($lease.ok){Remove-Lease -Namespace scheduler -Key main -LeaseId $lease.leaseId|Out-Null}}
            Assert-True (-not $runner.eligible -and -not $leased.eligible) 'quarantined retry route recovery accepted an active runner or lease'
            Remove-DispatcherWorkspace -Workspace $f.workspace
        }
        Check 'RD-110' {
            $a=New-QuarantinedRetryRouteRecoveryFixture 'RD110-available';$ah=@{TrustedHead=$a.trustedHead;ExpectedTaskId=$a.task.taskId;ExpectedTaskVersionId=$a.contract.taskVersionId;ExpectedAttempt=$a.attempt;ExpectedTailSeq=$a.tailSeq};$available=Recover-DispatcherQuarantinedRetryRoute -Task $a.task -TaskSource $a.source -TaskVersionId $a.contract.taskVersionId -RunId $a.runId -InvocationId $a.invocation -EvidenceHash $a.evidenceHash -PartialDiffHash $a.partialDiffHash -PartialFilesHash $a.partialFilesHash @ah
            $b=New-QuarantinedRetryRouteRecoveryFixture 'RD110-unavailable';$bh=@{TrustedHead=$b.trustedHead;ExpectedTaskId=$b.task.taskId;ExpectedTaskVersionId=$b.contract.taskVersionId;ExpectedAttempt=$b.attempt;ExpectedTailSeq=$b.tailSeq};$script:ProviderHealthFaults=@{deepseek='PROVIDER_UNAVAILABLE';codex=$null;claude=$null};try{$unavailable=Recover-DispatcherQuarantinedRetryRoute -Task $b.task -TaskSource $b.source -TaskVersionId $b.contract.taskVersionId -RunId $b.runId -InvocationId $b.invocation -EvidenceHash $b.evidenceHash -PartialDiffHash $b.partialDiffHash -PartialFilesHash $b.partialFilesHash @bh}finally{$script:ProviderHealthFaults=$null};$state=Get-DispatcherState
            Assert-True ($available.status -eq 'RECOVERED_WAITING_PROVIDER' -and $unavailable.status -eq 'RECOVERED_WAITING_PROVIDER' -and $state.provider -eq 'deepseek' -and $state.quarantineRetryRoute.provider -eq 'deepseek' -and $state.quarantineRetryRoute.reasoning -eq 'high' -and $state.providerHistory[-1].provider -eq 'codex') 'quarantined retry route recovery permitted fallback or depended on provider probing'
            Remove-DispatcherWorkspace -Workspace $a.workspace;Remove-DispatcherWorkspace -Workspace $b.workspace
        }
        Check 'RD-111' {
            $f=New-CompletedImplementationRecoveryFixture ('RD111-'+[guid]::NewGuid().ToString('N').Substring(0,8));$h=@{ExpectedRequestManifestHash=$f.requestHash;ExpectedStdoutHash=$f.stdoutHash;ExpectedControlRecordHash=$f.controlRecordHash;ExpectedPreManifestHash=$f.preHash;ExpectedPostManifestHash=$f.postHash;ExpectedPartialDiffHash=$f.partialDiffHash;ExpectedPartialFilesHash=$f.partialFilesHash;ExpectedTelemetryReceiptHash=$f.telemetryReceiptHash;ExpectedGateHash=$f.gateHash;ExpectedAttempt=349;ExpectedTailSeq=$f.tailSeq;ExpectedTailEventHash=$f.tailEventHash;TrustedHead=$f.trustedHead;ExpectedCostUsd=$f.costUsd;ExpectedPaths=$f.paths}
            $budgetBefore=Read-V2Json (Get-DeepSeekBudgetPath);$approvalBefore=Get-OwnerGateApprovalStatus -TaskId $f.task.taskId -TaskVersionId $f.contract.taskVersionId -GateId $f.task.ownerGate
            $script:DispatcherRecoveryRunnerProbe=$false;try{$first=Recover-DispatcherCompletedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @h;$state=Get-DispatcherState;$seq=(Get-LedgerState $f.contract.taskVersionId).seq;$second=Recover-DispatcherCompletedImplementation -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @h}finally{$script:DispatcherRecoveryRunnerProbe=$null}
            $budgetAfter=Read-V2Json (Get-DeepSeekBudgetPath);$approvalAfter=Get-OwnerGateApprovalStatus -TaskId $f.task.taskId -TaskVersionId $f.contract.taskVersionId -GateId $f.task.ownerGate
            Assert-True ($f.stdoutHash -ne $f.controlRecordHash -and $first.status -eq 'RECOVERED_TO_REVIEW' -and $second.status -eq 'ALREADY_RECOVERED' -and $state.status -eq 'RUNNING' -and $state.stage -eq 'REVIEW' -and $state.implementationComplete -and $state.candidateHead -and $state.reviewerProvider -eq 'codex' -and $state.providerHistory[-1].resultClass -eq 'SUCCESS' -and $state.providerHistory[-1].telemetryConsistent -and [int]$state.attempt -eq 349 -and [int]$state.cycle -eq 1 -and [int]$state.failovers -eq 1 -and [string]$state.runId -eq $f.runId -and [string]$state.taskVersionId -eq $f.contract.taskVersionId -and (Get-LedgerState $f.contract.taskVersionId).state -eq 'REVIEWING' -and (Get-LedgerState $f.contract.taskVersionId).seq -eq $seq -and (ConvertTo-CanonicalJson $budgetAfter) -eq (ConvertTo-CanonicalJson $budgetBefore) -and $approvalAfter.satisfied -and $approvalAfter.gateHash -eq $approvalBefore.gateHash) 'completed implementation was not recovered to review idempotently or changed preserved authority/budget/lineage'
            Remove-DispatcherWorkspace -Workspace $f.workspace
        }
        Check 'RD-112' {
            $f=New-CompletedImplementationRecoveryFixture ('RD112-'+[guid]::NewGuid().ToString('N').Substring(0,8));$h=@{ExpectedRequestManifestHash=$f.requestHash;ExpectedStdoutHash=$f.stdoutHash;ExpectedControlRecordHash=$f.controlRecordHash;ExpectedPreManifestHash=$f.preHash;ExpectedPostManifestHash=$f.postHash;ExpectedPartialDiffHash=$f.partialDiffHash;ExpectedPartialFilesHash=$f.partialFilesHash;ExpectedTelemetryReceiptHash=$f.telemetryReceiptHash;ExpectedGateHash=$f.gateHash;ExpectedAttempt=349;ExpectedTailSeq=$f.tailSeq;ExpectedTailEventHash=$f.tailEventHash;TrustedHead=$f.trustedHead;ExpectedCostUsd=$f.costUsd;ExpectedPaths=$f.paths};Add-Content -LiteralPath ((Get-DispatcherState).providerHistory[-1].stdoutArtifact) -Value 'tampered';$script:DispatcherRecoveryRunnerProbe=$false;try{$bad=Test-DispatcherCompletedImplementationRecovery -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @h}finally{$script:DispatcherRecoveryRunnerProbe=$null}
            Assert-True (-not $bad.eligible -and $bad.reason -match 'stdout') 'completed implementation recovery accepted tampered provider output'
            Remove-DispatcherWorkspace -Workspace $f.workspace
        }
        Check 'RD-113' {
            $f=New-CompletedImplementationRecoveryFixture ('RD113-'+[guid]::NewGuid().ToString('N').Substring(0,8));$h=@{ExpectedRequestManifestHash=$f.requestHash;ExpectedStdoutHash=$f.stdoutHash;ExpectedControlRecordHash=$f.controlRecordHash;ExpectedPreManifestHash=$f.preHash;ExpectedPostManifestHash=$f.postHash;ExpectedPartialDiffHash=$f.partialDiffHash;ExpectedPartialFilesHash=$f.partialFilesHash;ExpectedTelemetryReceiptHash=$f.telemetryReceiptHash;ExpectedGateHash=$f.gateHash;ExpectedAttempt=349;ExpectedTailSeq=$f.tailSeq;ExpectedTailEventHash=$f.tailEventHash;TrustedHead=$f.trustedHead;ExpectedCostUsd=$f.costUsd;ExpectedPaths=$f.paths};$state=Get-DispatcherState
            $script:DispatcherRecoveryRunnerProbe=$false;try{
                $hTail=$h.Clone();$hTail.ExpectedTailEventHash='sha256:'+('0'*64);$wrongTail=Test-DispatcherCompletedImplementationRecovery -State $state -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @hTail
                $hReceipt=$h.Clone();$hReceipt.ExpectedTelemetryReceiptHash='sha256:'+('1'*64);$wrongReceipt=Test-DispatcherCompletedImplementationRecovery -State $state -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @hReceipt
                $hControl=$h.Clone();$hControl.ExpectedControlRecordHash='sha256:'+('2'*64);$wrongControl=Test-DispatcherCompletedImplementationRecovery -State $state -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @hControl
                $hPaths=$h.Clone();$hPaths.ExpectedPaths=@('work/other.ts');$wrongPaths=Test-DispatcherCompletedImplementationRecovery -State $state -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @hPaths
                $routeState=ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $state);$routeState.provider='codex';$routeState.model='gpt-5.6-terra';$routeState.quarantineRetryRoute.provider='codex';$routeState.quarantineRetryRoute.model='gpt-5.6-terra';$badRoute=Test-DispatcherCompletedImplementationRecovery -State $routeState -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @h
                $historyState=ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $state);$historyState.providerHistory=@($historyState.providerHistory)+@([ordered]@{invocationId=('att-'+('a'*32));provider='codex';attempt=350});$later=Test-DispatcherCompletedImplementationRecovery -State $historyState -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @h
            }finally{$script:DispatcherRecoveryRunnerProbe=$null}
            $script:DispatcherRecoveryRunnerProbe=$true;try{$active=Test-DispatcherCompletedImplementationRecovery -State $state -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation @h}finally{$script:DispatcherRecoveryRunnerProbe=$null}
            Assert-True (-not $wrongTail.eligible -and -not $wrongReceipt.eligible -and -not $wrongControl.eligible -and -not $wrongPaths.eligible -and -not $badRoute.eligible -and -not $later.eligible -and -not $active.eligible) 'completed implementation recovery accepted a divergent tail, receipt, control record, path set, route, later invocation, or active execution'
            Remove-DispatcherWorkspace -Workspace $f.workspace
        }

        # ---- durable policy-correction recovery fixtures (RD-131..RD-137) ----
        function New-PolicyCorrectionFixture {
            param([string]$Id,[bool]$PersistRecord=$true,[bool]$MergeBaseline=$true,[bool]$LegacyLedger=$false)
            $workspace=Join-Path $Root ("policy-correction-"+$Id)
            & git init -b main --quiet $workspace
            Write-Utf8 (Join-Path $workspace 'work\base.ts') "export const base = true;`n"
            Write-Utf8 (Join-Path $workspace 'apps\backend\src\work-order\work-order-actions.isolation.spec.ts') "authoritative acceptance`n"
            Write-Utf8 (Join-Path $workspace 'apps\backend\src\other\other.isolation.spec.ts') "other authoritative acceptance`n"
            & git -C $workspace add .
            & git -C $workspace -c user.name=rd -c user.email=rd@local commit -m base --quiet
            $base=(& git -C $workspace rev-parse HEAD).Trim()
            & git -C $workspace checkout -b correction --quiet
            Write-Utf8 (Join-Path $workspace 'work\impl.ts') "export const implemented = true;`n"
            Write-Utf8 (Join-Path $workspace 'apps\backend\src\work-order\work-order-actions.isolation.spec.ts') "unauthorized acceptance change`n"
            & git -C $workspace add .
            & git -C $workspace -c user.name=rd -c user.email=rd@local commit -m implementation --quiet
            $implementation=(& git -C $workspace rev-parse HEAD).Trim()
            $target=$base
            if($MergeBaseline){
                & git -C $workspace checkout main --quiet
                Write-Utf8 (Join-Path $workspace 'work\target.ts') "export const target = true;`n"
                & git -C $workspace add .
                & git -C $workspace -c user.name=rd -c user.email=rd@local commit -m target --quiet
                $target=(& git -C $workspace rev-parse HEAD).Trim()
                & git -C $workspace checkout correction --quiet
                & git -C $workspace merge $target --no-edit --quiet
            }
            $baseline=(& git -C $workspace rev-parse HEAD).Trim()

            $task=Task ("POLICY-"+$Id)
            $sourcePath=Join-Path $Fixture ("policy-correction-"+$Id+".tasks.json")
            Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
            $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0]
            $contract=New-DispatcherContract -Task $task -TaskSource $source
            $runId='run-policy-'+$Id.ToLowerInvariant()
            if($LegacyLedger){
                Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null
                Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null
                Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId -AttemptId (New-AttemptId)|Out-Null
                Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null
                Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event 'policy-block' -ToState FAILED -RunId $runId -Note 'PROTECTED path modified without a contract grant: apps/backend/src/work-order/work-order-actions.isolation.spec.ts'|Out-Null
                Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event 'policy-correction-ready' -ToState READY -RunId $runId|Out-Null
                Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event 'policy-correction-dispatch' -ToState DISPATCHED -RunId $runId -AttemptId (New-AttemptId)|Out-Null
                Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event 'policy-correction-running' -ToState RUNNING -RunId $runId|Out-Null
            }
            $historicalInvocation='att-'+[guid]::NewGuid().ToString('N')
            $history=@([ordered]@{invocationId=$historicalInvocation;role='IMPLEMENTER';provider='glm';model='zai-coding-plan/glm-5.3';attempt=1;providerClass='SUCCESS';resultClass='SUCCESS';exitCode=0})
            $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';runId=$runId;taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;status='RUNNING';stage='IMPLEMENT';reason='';workspace=$workspace;branch='correction';baseSha=$base;candidateBase=$target;provider='glm';profile='FAST';model=(Get-GlmModelId);attempt=1;cycle=1;rollovers=0;failovers=0;findings=@();decisions=@();importantArtifacts=@();providerHistory=$history;unavailableProviders=@();workspaceInvocationSnapshots=@();workspaceInvocationResultSnapshots=@();implementationComplete=$false;requiresCorrection=$true;implementationCommit=$implementation;recoveredCandidateCommit='';candidateHead='';candidateTree='';diffHash='';verification=$null;reviewVerdict='';logicalProjectId='fixture';memoryEnabled=$false;memoryAvailable=$false;memoryRetrievedCount=0;memoryInjectedChars=0;memoryFallbackUsed=$false;memoryLatencyMs=0;memoryWriteCount=0;integration=$null}
            $compliance=[ordered]@{changedFiles=@('apps/backend/src/work-order/work-order-actions.isolation.spec.ts','work/impl.ts');violations=@('PROTECTED path modified without a contract grant: apps/backend/src/work-order/work-order-actions.isolation.spec.ts')}
            $record=New-DispatcherPolicyCorrectionRecord -State $state -Compliance $compliance -BaselineHead $baseline -TargetHead $target -TargetRef 'main'
            if($PersistRecord){$state.policyCorrectionRecord=$record}
            Write-DispatcherState $state|Out-Null
            $prompt=Join-Path $Root ("policy-correction-"+$Id+".prompt.txt");Write-Utf8 $prompt 'restore only the proven policy violation'
            return @{state=$state;task=$task;source=$source;contract=$contract;workspace=$workspace;base=$base;implementation=$implementation;target=$target;baseline=$baseline;record=$record;prompt=$prompt;historicalInvocation=$historicalInvocation}
        }

        function Set-PolicyPreLaunchAttempt {
            param($State,[int]$Attempt)
            $State.attempt=$Attempt
            $State.preLaunchAttempt=[ordered]@{schemaVersion='orcivo.orchestration.v2.pre-launch-attempt/1';recordedAt=(Get-Date).ToUniversalTime().ToString('o');taskVersionId=[string]$State.taskVersionId;runId=[string]$State.runId;workspace=[string]$State.workspace;attempt=$Attempt}
            $State.preLaunchAttempt.attemptHash=New-StringHash (ConvertTo-CanonicalJson ([ordered]@{taskVersionId=[string]$State.taskVersionId;runId=[string]$State.runId;workspace=[string]$State.workspace;attempt=$Attempt}))
            Write-DispatcherState $State|Out-Null
        }

        Check 'RD-131' {
            $direct=New-PolicyCorrectionFixture 'RD131-direct' $true $false $false
            $descendant=New-PolicyCorrectionFixture 'RD131-descendant' $true $true $false
            $directProof=Test-DispatcherCommittedPolicyCorrectionBaseline $direct.state
            $descendantProof=Test-DispatcherCommittedPolicyCorrectionBaseline $descendant.state
            Assert-True ($directProof.ok -and [string]$directProof.record.correctionBaselineHead -eq $direct.implementation) 'clean committed correction baseline at the implementation commit was rejected'
            Assert-True ($descendantProof.ok -and $descendant.baseline -ne $descendant.implementation) 'clean target-merge descendant correction baseline was rejected'
            $snapshot=New-DispatcherWorkspaceInvocationSnapshot -State $descendant.state -Task $descendant.task -InvocationId ('att-'+[guid]::NewGuid().ToString('N')) -PromptArtifact $descendant.prompt -PromptHash (New-FileHash $descendant.prompt) -Provider glm -Model (Get-GlmModelId) -ReasoningEffort low -Attempt 1
            Assert-True ([string]$snapshot.stateBinding.workspaceHead -eq $descendant.baseline -and @($snapshot.paths).Count -eq 0) 'clean policy-correction invocation did not bind the exact persisted baseline HEAD'
        }

        Check 'RD-132' {
            $f=New-PolicyCorrectionFixture 'RD132' $true $true $false
            Write-Utf8 (Join-Path $f.workspace 'work\unrelated.ts') "export const unrelated = true;`n"
            & git -C $f.workspace add .
            & git -C $f.workspace -c user.name=rd -c user.email=rd@local commit -m unrelated --quiet
            $proof=Test-DispatcherCommittedPolicyCorrectionBaseline $f.state
            Assert-True (-not $proof.ok -and [string]$proof.reason -match 'persisted correction baseline') 'an unrelated clean descendant satisfied the correction-baseline predicate'
        }

        Check 'RD-133' {
            $f=New-PolicyCorrectionFixture 'RD133' $true $true $false
            $fields=@('taskVersionId','runId','workspace')
            foreach($field in $fields){
                $tampered=ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $f.state)
                $tampered.$field=[string]$tampered.$field+'-tampered'
                $proof=Test-DispatcherCommittedPolicyCorrectionBaseline $tampered
                Assert-True (-not $proof.ok -and [string]$proof.reason -match "binding '$field'") "tampered $field binding was accepted"
            }
            $recordTampered=ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $f.state)
            $recordTampered.policyCorrectionRecord.targetHead=('0'*40)
            $proof=Test-DispatcherCommittedPolicyCorrectionBaseline $recordTampered
            Assert-True (-not $proof.ok -and [string]$proof.reason -match 'hash') 're-hash detection did not reject a modified authoritative target'
        }

        Check 'RD-134' {
            $exact=New-PolicyCorrectionFixture 'RD134-exact' $true $true $false
            & git -C $exact.workspace restore --source $exact.target --worktree -- 'apps/backend/src/work-order/work-order-actions.isolation.spec.ts'
            $exactProof=Get-DispatcherDirtyWorkspaceProof -Workspace $exact.workspace -Task $exact.task -PolicyCorrectionState $exact.state
            Assert-True ($exactProof.clean -and @($exactProof.paths) -contains 'apps/backend/src/work-order/work-order-actions.isolation.spec.ts') 'exact authoritative protected-path reversion was rejected'

            $byte=New-PolicyCorrectionFixture 'RD134-byte' $true $true $false
            & git -C $byte.workspace restore --source $byte.target --worktree -- 'apps/backend/src/work-order/work-order-actions.isolation.spec.ts'
            Add-Content -LiteralPath (Join-Path $byte.workspace 'apps\backend\src\work-order\work-order-actions.isolation.spec.ts') -Value 'x'
            $byteProof=Get-DispatcherDirtyWorkspaceProof -Workspace $byte.workspace -Task $byte.task -PolicyCorrectionState $byte.state
            Assert-True (-not $byteProof.clean) "one-byte protected-path deviation was accepted (reason=$($byteProof.reason))"

            $other=New-PolicyCorrectionFixture 'RD134-other' $true $true $false
            Write-Utf8 (Join-Path $other.workspace 'apps\backend\src\other\other.isolation.spec.ts') "modified other protected path`n"
            $otherProof=Get-DispatcherDirtyWorkspaceProof -Workspace $other.workspace -Task $other.task -PolicyCorrectionState $other.state
            Assert-True (-not $otherProof.clean) "a different protected acceptance path was accepted (reason=$($otherProof.reason))"

            $scope=New-PolicyCorrectionFixture 'RD134-scope' $true $true $false
            & git -C $scope.workspace restore --source $scope.target --worktree -- 'apps/backend/src/work-order/work-order-actions.isolation.spec.ts'
            Write-Utf8 (Join-Path $scope.workspace 'outside.ts') "export const outside = true;`n"
            $scopeProof=Get-DispatcherDirtyWorkspaceProof -Workspace $scope.workspace -Task $scope.task -PolicyCorrectionState $scope.state
            Assert-True (-not $scopeProof.clean -and [string]$scopeProof.reason -match 'out-of-scope') 'ordinary scope enforcement was weakened by policy correction'
        }

        Check 'RD-135' {
            $f=New-PolicyCorrectionFixture 'RD135' $true $true $false
            Write-Utf8 (Join-Path $f.workspace 'work\unrelated.ts') "export const unrelated = true;`n"
            & git -C $f.workspace add .
            & git -C $f.workspace -c user.name=rd -c user.email=rd@local commit -m unrelated --quiet
            $script:PolicyProviderLaunches=0
            $beforeLaunch={param($launch) New-DispatcherWorkspaceInvocationSnapshot -State $f.state -Task $f.task -InvocationId ([string]$launch.invocationId) -PromptArtifact $f.prompt -PromptHash (New-FileHash $f.prompt) -Provider glm -Model (Get-GlmModelId) -ReasoningEffort low -Attempt 1|Out-Null}
            $failed=$false
            try{
                & $beforeLaunch ([ordered]@{invocationId=('att-'+[guid]::NewGuid().ToString('N'))})
                $script:PolicyProviderLaunches++
            }catch{$failed=$_.Exception.Message -match 'workspace has no preserved partial changes'}
            Assert-True ($failed -and $script:PolicyProviderLaunches -eq 0 -and @($f.state.workspaceInvocationSnapshots).Count -eq 0) 'baseline proof failure crossed the provider launch boundary'
        }

        Check 'RD-136' {
            $f=New-PolicyCorrectionFixture 'RD136' $true $true $false
            Set-PolicyPreLaunchAttempt $f.state 2
            $historyBefore=ConvertTo-CanonicalJson $f.state.providerHistory
            $snapshotsBefore=ConvertTo-CanonicalJson $f.state.workspaceInvocationSnapshots
            $first=Update-DispatcherPreLaunchAttempt $f.state
            $afterFirst=Get-DispatcherState
            $second=Update-DispatcherPreLaunchAttempt $afterFirst
            $afterSecond=Get-DispatcherState
            Assert-True ($first.ok -and [int]$afterFirst.attempt -eq 1 -and -not $afterFirst.preLaunchAttempt) 'a proven BeforeLaunch failure permanently consumed its allocated attempt'
            Assert-True ($second.ok -and [int]$afterSecond.attempt -eq 1) 'pre-launch attempt recovery was not restart-idempotent'
            Assert-True ((ConvertTo-CanonicalJson $afterSecond.providerHistory) -eq $historyBefore -and (ConvertTo-CanonicalJson $afterSecond.workspaceInvocationSnapshots) -eq $snapshotsBefore -and [string]$afterSecond.providerHistory[0].model -eq 'zai-coding-plan/glm-5.3') 'pre-launch recovery rewrote historical provider evidence'

            $ambiguous=ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $afterSecond)
            Set-PolicyPreLaunchAttempt $ambiguous 2
            $ambiguous.workspaceInvocationSnapshots=@([ordered]@{invocationId=('att-'+[guid]::NewGuid().ToString('N'));attempt=2})
            $held=Update-DispatcherPreLaunchAttempt $ambiguous
            Assert-True (-not $held.ok -and [string]$held.reason -match 'conflicts') 'ambiguous pre-launch and launched evidence was refunded'
        }

        Check 'RD-137' {
            $f=New-PolicyCorrectionFixture 'RD137' $false $true $true
            $f.state.attempt=2;Write-DispatcherState $f.state|Out-Null
            $resolved=Resolve-DispatcherPolicyCorrectionRecord $f.state
            Assert-True ($resolved.ok -and $resolved.reconstructed -and [string]$resolved.record.origin -eq 'LEGACY_RECONSTRUCTION' -and [string]$resolved.record.correctionBaselineHead -eq $f.baseline -and [string]$resolved.record.targetHead -eq $f.target) 'the exact stranded legacy policy-correction lineage was not reconstructed from bound evidence'
            $normalized=Update-DispatcherPreLaunchAttempt $f.state
            Assert-True ($normalized.ok -and [int]$f.state.attempt -eq 1) 'the stranded legacy pre-launch attempt was not normalized'
            Set-PolicyPreLaunchAttempt $f.state 2
            $snapshot=New-DispatcherWorkspaceInvocationSnapshot -State $f.state -Task $f.task -InvocationId ('att-'+[guid]::NewGuid().ToString('N')) -PromptArtifact $f.prompt -PromptHash (New-FileHash $f.prompt) -Provider glm -Model (Get-GlmModelId) -ReasoningEffort low -Attempt 2
            $persisted=Get-DispatcherState
            Assert-True ([string]$snapshot.stateBinding.workspaceHead -eq $f.baseline -and [string]$persisted.policyCorrectionRecord.origin -eq 'LEGACY_RECONSTRUCTION' -and -not $persisted.preLaunchAttempt) 'legacy reconstruction was not pinned durably before the retried launch boundary'

            $ambiguous=New-PolicyCorrectionFixture 'RD137-ambiguous' $false $true $true
            Enter-DispatcherLedgerPhase -TaskVersionId $ambiguous.contract.taskVersionId -RunId $ambiguous.state.runId -Phase CHECKING
            $rejected=Resolve-DispatcherPolicyCorrectionRecord $ambiguous.state
            Assert-True (-not $rejected.ok -and [string]$rejected.reason -match "ledger state 'CHECKING' is not RUNNING") 'legacy reconstruction accepted ledger evidence beyond the exact correction-resume tail'
        }

        # ---- bounded review-reader / same-candidate review recovery (RD-138..RD-149) ----
        function New-ReviewInfrastructureFixture {
            param([string]$Id,[bool]$Technical=$true)
            $workspace=Join-Path $Root ("review-infra-"+$Id);& git init -b main --quiet $workspace
            New-Item -ItemType Directory -Force -Path (Join-Path $workspace 'work')|Out-Null
            Write-Utf8 (Join-Path $workspace 'work\result.ts') "export const result = 'base';`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m base --quiet
            $base=(& git -C $workspace rev-parse HEAD).Trim()
            Write-Utf8 (Join-Path $workspace 'work\result.ts') "export const result = 'candidate';`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m candidate --quiet
            $head=(& git -C $workspace rev-parse HEAD).Trim()
            $task=Task ("REVIEW-"+$Id);$sourcePath=Join-Path $Fixture ("review-infra-"+$Id+".json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
            $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0];$contract=New-DispatcherContract -Task $task -TaskSource $source
            $runId='run-review-'+$Id.ToLowerInvariant();$bindings=Get-AttestationBindings -TaskVersionId $contract.taskVersionId -WorktreeDir $workspace -BaseSha $base -HeadSha $head
            $diffResult=Invoke-GitV2 -Dir $workspace -Arguments @('diff','--no-color',"$base..$head") -LogLabel ("fixture-review-diff-"+$Id) -ReviewedSourceOutput
            $diff=$diffResult.stdout.TrimEnd("`r","`n");$reviewDir=Join-Path (Get-V2Dir) "runs\$runId\review-000"
            $prompt=Build-ReviewPrompt -DataDir $reviewDir -TaskVersionId $contract.taskVersionId -Head $head -TreeHash $bindings.treeHash -DiffHash $bindings.diffHash -SpecHash $contract.specHash -AcceptanceText $contract.acceptanceText -SpecText $contract.specText -Diff $diff -ChangedFiles @('work/result.ts') -CheckSummary 'PASS profile=B; secretScan=CLEAN' -CriteriaIds @($contract.acceptanceCriteriaIds) -StructuredOutput
            $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';runId=$runId;taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;status='WAITING_HUMAN';stage='REVIEW';reason='BLOCK: ok';workspace=$workspace;branch='main';baseSha=$base;candidateBase=$base;candidateHead=$head;candidateTree=$bindings.treeHash;diffHash=$bindings.diffHash;provider='glm';profile='FAST';model=(Get-GlmModelId);attempt=1;cycle=0;rollovers=0;failovers=0;findings=@('critical: fixture artifact read failed');decisions=@();importantArtifacts=@();providerHistory=@();unavailableProviders=@();implementationComplete=$true;requiresCorrection=$false;implementationCommit=$head;verification=$null;reviewVerdict='BLOCK';logicalProjectId='fixture';integration=$null}
            $record=New-DispatcherReviewArtifactRecord -DataDir $reviewDir -State $state;$state.reviewArtifactRecord=$record
            $patch=@($record.artifacts|Where-Object name -eq 'diff.patch')[0]
            $technicalBlock=$(if($Technical){[ordered]@{classification='REVIEW_INFRASTRUCTURE';failure='ARTIFACT_READ_FAILURE';artifact='diff.patch';pageOffset=0;expectedSha256=[string]$patch.sha256;detail='fixture page read failed'}}else{$null})
            $vp=Invoke-VerificationProfile -ProfileId $contract.verificationProfile -WorktreeDir $workspace -BaseSha $base -HeadSha $head;$state.verification=$vp
            $treeScan=Test-GitTreeSecretsClean -RepoDir $workspace -BaseRef $base -Ref $head;$artifactScan=Test-TreeSecretsClean -Roots @((Join-Path (Get-V2Dir) "runs\$runId"));$state.secretScan=[ordered]@{clean=([bool]$treeScan.clean -and [bool]$artifactScan.clean);candidate=[ordered]@{clean=[bool]$treeScan.clean;baseSha=$base;headSha=$head;hits=@($treeScan.hits)};artifacts=[ordered]@{clean=[bool]$artifactScan.clean;hits=@($artifactScan.hits)};hits=@($treeScan.hits)+@($artifactScan.hits)}
            Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null;Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase CHECKING;Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase REVIEWING
            $check=New-Attestation -Kind check -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$bindings) -Result PASS -Payload @{profileId=$vp.profileId;effectiveInvocationHash=$vp.effectiveInvocationHash;checks=@($vp.checks)} -ProducerMeta @{verifier='v2-deterministic';profileId=$vp.profileId;verificationDefinitionHash=$vp.verificationDefinitionHash}
            $invocation='att-'+[guid]::NewGuid().ToString('N');$review=New-Attestation -Kind review -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$bindings) -Result BLOCK -Payload @{problems=@();reason='ok';findings=@(@{severity='critical';detail='fixture artifact read failed'});technicalBlock=$technicalBlock;reviewArtifactRecordHash=[string]$record.recordHash} -ProducerMeta @{provider='deepseek';model='fixture';profile='FAST';invocationId=$invocation;fresh=$true;memory='disabled';workspace='review-data-only';exitCode=0}
            Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event review-hold -ToState WAITING_HUMAN -RunId $runId -Note BLOCK|Out-Null
            $state.reviewInvocationId=$invocation;$state.reviewAttestationId=$review.attestationId;$state.reviewTechnicalBlock=$technicalBlock;$state.reviewerProvider='deepseek';$state.providerHistory=@([ordered]@{invocationId=('att-'+[guid]::NewGuid().ToString('N'));role='IMPLEMENTER';provider='glm';model=(Get-GlmModelId);resultClass='SUCCESS';providerClass='NONE';exitCode=0},[ordered]@{invocationId=$invocation;role='REVIEWER';provider='deepseek';model='fixture';resultClass='BLOCK';providerClass='NONE';exitCode=0;stdoutHash=('sha256:'+('a'*64))})
            Write-DispatcherState $state|Out-Null
            return @{state=$state;task=$task;source=$source;contract=$contract;workspace=$workspace;base=$base;head=$head;review=$review;check=$check;record=$record;technicalBlock=$technicalBlock;prompt=$prompt}
        }

        function New-ReviewSchemaHoldFixture {
            param([string]$Id)
            $workspace=Join-Path $Root ("review-schema-"+$Id);& git init -b main --quiet $workspace
            New-Item -ItemType Directory -Force -Path (Join-Path $workspace 'work')|Out-Null
            Write-Utf8 (Join-Path $workspace 'work\result.ts') "export const result = 'base';`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m base --quiet;$base=(& git -C $workspace rev-parse HEAD).Trim()
            Write-Utf8 (Join-Path $workspace 'work\result.ts') "export const result = 'candidate';`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m candidate --quiet;$head=(& git -C $workspace rev-parse HEAD).Trim()
            $task=Task ("SCHEMA-"+$Id);$sourcePath=Join-Path $Fixture ("review-schema-"+$Id+".json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
            $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0];$contract=New-DispatcherContract -Task $task -TaskSource $source
            $runId='run-schema-'+(New-StringHash ($Id+'|run')).Substring(7,16);$bindings=Get-AttestationBindings -TaskVersionId $contract.taskVersionId -WorktreeDir $workspace -BaseSha $base -HeadSha $head
            $diffResult=Invoke-GitV2 -Dir $workspace -Arguments @('diff','--no-color',"$base..$head") -LogLabel ("fixture-schema-diff-"+$Id) -ReviewedSourceOutput;$diff=$diffResult.stdout.TrimEnd("`r","`n");$reviewDir=Join-Path (Get-V2Dir) "runs\$runId\review-000"
            $prompt=Build-ReviewPrompt -DataDir $reviewDir -TaskVersionId $contract.taskVersionId -Head $head -TreeHash $bindings.treeHash -DiffHash $bindings.diffHash -SpecHash $contract.specHash -AcceptanceText $contract.acceptanceText -SpecText $contract.specText -Diff $diff -ChangedFiles @('work/result.ts') -CheckSummary 'PASS profile=B; secretScan=CLEAN' -CriteriaIds @($contract.acceptanceCriteriaIds) -StructuredOutput
            $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';runId=$runId;taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;status='WAITING_HUMAN';stage='REVIEW';reason='HUMAN_REVIEW_REQUIRED: schema validation failed';workspace=$workspace;branch='main';baseSha=$base;candidateBase=$base;candidateHead=$head;candidateTree=$bindings.treeHash;diffHash=$bindings.diffHash;provider='glm';profile='FAST';model=(Get-GlmModelId);attempt=1;cycle=0;rollovers=0;failovers=0;findings=@();decisions=@();importantArtifacts=@();providerHistory=@();unavailableProviders=@();implementationComplete=$true;requiresCorrection=$false;implementationCommit=$head;verification=$null;reviewVerdict='HUMAN_REVIEW_REQUIRED';logicalProjectId='fixture';integration=$null;reviewSchemaRecoveryHistory=@()}
            $record=New-DispatcherReviewArtifactRecord -DataDir $reviewDir -State $state;$state.reviewArtifactRecord=$record
            $vp=Invoke-VerificationProfile -ProfileId $contract.verificationProfile -WorktreeDir $workspace -BaseSha $base -HeadSha $head;$state.verification=$vp
            $treeScan=Test-GitTreeSecretsClean -RepoDir $workspace -BaseRef $base -Ref $head;$artifactScan=Test-TreeSecretsClean -Roots @((Join-Path (Get-V2Dir) "runs\$runId"));$state.secretScan=[ordered]@{clean=([bool]$treeScan.clean -and [bool]$artifactScan.clean);candidate=[ordered]@{clean=[bool]$treeScan.clean;baseSha=$base;headSha=$head;hits=@($treeScan.hits)};artifacts=[ordered]@{clean=[bool]$artifactScan.clean;hits=@($artifactScan.hits)};hits=@()}
            Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null;Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase CHECKING;Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase REVIEWING
            $check=New-Attestation -Kind check -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$bindings) -Result PASS -Payload @{profileId=$vp.profileId;effectiveInvocationHash=$vp.effectiveInvocationHash;checks=@($vp.checks)} -ProducerMeta @{verifier='v2-deterministic';profileId=$vp.profileId;verificationDefinitionHash=$vp.verificationDefinitionHash}
            $invocation='att-'+[guid]::NewGuid().ToString('N');$attempt=2;$suffix=$invocation.Substring(4,8);$logs=Join-Path (Get-V2Dir) "runs\$runId\logs";New-Item -ItemType Directory -Force -Path $logs|Out-Null;$stem="reviewer-002-deepseek-$suffix"
            $promptPath=Join-Path $logs "$stem.prompt.txt";$stdoutPath=Join-Path $logs "$stem.stdout.log";$stderrPath=Join-Path $logs "$stem.stderr.log";$requestPath=Join-Path $logs "$stem.request-manifest.json";Write-Utf8 $promptPath $prompt;Write-Utf8 $stdoutPath "immutable fixture stdout`n";Write-Utf8 $stderrPath ''
            $request=[ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-request-manifest/1';createdAt='2026-09-22T00:00:00Z';invocationId=$invocation;provider='deepseek';baseUrl='https://api.deepseek.com/';redirectObserved=$false;requestedBillableSku='deepseek-v4-flash';reasoning='low';profile='FAST';promptHash=(New-FileHash $promptPath);runtimeConfigHash=('sha256:'+('1'*64));isolatedCodexHome='fixture';priceRegistryHash=('sha256:'+('2'*64));resolvedModelVersion='fixture';manifestHash=''};$requestSigned=[ordered]@{};foreach($key in $request.Keys){if($key -ne 'manifestHash'){$requestSigned[$key]=$request[$key]}};$request.manifestHash=New-ContentHash $requestSigned;Write-V2JsonCanonical $requestPath $request
            $toolPolicy='read-only; review_reader artifacts only (no git, no shell, no candidate workspace)'
            $envelope=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=$contract.taskVersionId;reviewedHead=$head;treeHash=$bindings.treeHash;diffHash=$bindings.diffHash;specHash=$contract.specHash;verdict='APPROVE';criteria=@([ordered]@{id='AC1';met=$true;evidence='fixture evidence'});findings=@([ordered]@{severity='info';file=$null;line=$null;detail='fixture review complete'});filesReviewed=@('work/result.ts');technicalBlock=$null;reviewerMeta=[ordered]@{provider='deepseek';model='deepseek-v4-flash';effort='low';toolPolicy=$toolPolicy;promptTemplateVersion='v2'}}
            $agent=[ordered]@{invocationId=$invocation;provider='deepseek';model='deepseek-v4-flash';profile='FAST';reasoningIntent='low';attempt=$attempt;exitCode=0;providerClass='NONE';failureDiagnostic=$null;resultClass='APPROVE';structuredResult=$envelope;promptArtifact=[IO.Path]::GetFullPath($promptPath);promptHash=(New-FileHash $promptPath);stdoutArtifact=[IO.Path]::GetFullPath($stdoutPath);stdoutHash=(New-FileHash $stdoutPath);stderrArtifact=[IO.Path]::GetFullPath($stderrPath);stderrHash=(New-FileHash $stderrPath);controlRecordHash=(New-StringHash ([IO.File]::ReadAllText($stdoutPath,[Text.Encoding]::UTF8)));duration=1;contextRolloverRequired=$false;capabilityVersion='fixture';continuationCheckpoint='';usage=@{inputTokens=1;outputTokens=1;cachedTokens=$null};cachedTokens=$null;returnedModels=@();requestManifestPath=[IO.Path]::GetFullPath($requestPath);requestManifestHash=$request.manifestHash;costUsd=$null;telemetryConsistent=$true;resultReceiptPath=(Get-RealAgentResultReceiptPath -ArtifactDir $logs -InvocationId $invocation -Role reviewer -Provider deepseek -Attempt $attempt)}
            $receipt=Write-RealAgentResultReceipt -AgentResult $agent
            $review=New-Attestation -Kind review -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$bindings) -Result HUMAN_REVIEW_REQUIRED -Payload @{problems=@('$.reviewerMeta.toolPolicy : longer than maxLength 64');reason='schema validation failed';findings=@($null);technicalBlock=$null;reviewArtifactRecordHash=[string]$record.recordHash} -ProducerMeta @{provider='deepseek';model='deepseek-v4-flash';profile='FAST';invocationId=$invocation;fresh=$true;memory='disabled';workspace='review-data-only';exitCode=0}
            Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event review-hold -ToState WAITING_HUMAN -RunId $runId -Note HUMAN_REVIEW_REQUIRED|Out-Null
            $state.reviewInvocationId=$invocation;$state.reviewAttestationId=$review.attestationId;$state.reviewTechnicalBlock=$null;$state.reviewerProvider='deepseek';$state.providerHistory=@([ordered]@{invocationId=('att-'+[guid]::NewGuid().ToString('N'));role='IMPLEMENTER';provider='glm';model=(Get-GlmModelId);resultClass='SUCCESS';providerClass='NONE';exitCode=0},[ordered]@{invocationId=$invocation;role='REVIEWER';provider='deepseek';model='deepseek-v4-flash';reasoningEffort='low';attempt=$attempt;providerClass='NONE';resultClass='APPROVE';exitCode=0;stdoutArtifact=[IO.Path]::GetFullPath($stdoutPath);stdoutHash=$agent.stdoutHash;stderrArtifact=[IO.Path]::GetFullPath($stderrPath);stderrHash=$agent.stderrHash;controlRecordHash=$agent.controlRecordHash;telemetryConsistent=$true;resultReceiptHash=[string]$receipt.receiptHash});Write-DispatcherState $state|Out-Null
            return @{state=$state;task=$task;source=$source;contract=$contract;workspace=$workspace;base=$base;head=$head;review=$review;check=$check;record=$record;invocation=$invocation;receiptPath=$agent.resultReceiptPath;receipt=$receipt;stdoutPath=$stdoutPath;toolPolicy=$toolPolicy}
        }

        # Distinct immutable hold: the reviewer process exited 0 and produced a
        # terminal agent_message framed as prose + terminal JSON envelope
        # (e.g. "All three artifacts are reconstructed: ...\n\n{...}"). The old
        # ConvertFrom-RealCodexOutput ran ConvertFrom-Json against the WHOLE
        # message, failed on the prose, and recorded structuredResult=null /
        # resultClass=AGENT_FAILURE - so Parse-ReviewEnvelope (fed
        # processOk=false) produced HUMAN_REVIEW_REQUIRED: reviewer process did
        # not exit 0 / timed out.
        function New-ReviewTerminalJsonHoldFixture {
            param([string]$Id,[switch]$DoubleMarker,[switch]$NoEnvelope)
            if($NoEnvelope){$providerRuntimePath=Join-Path (Get-V2Dir) 'provider-runtime.v1.json';if(-not(Test-Path -LiteralPath $providerRuntimePath)){Copy-Item (Join-Path $Repo '.orchestration\v2\provider-runtime.v1.json') $providerRuntimePath}}
            $workspace=Join-Path $Root ("review-tjson-"+$Id);& git init -b main --quiet $workspace
            New-Item -ItemType Directory -Force -Path (Join-Path $workspace 'work')|Out-Null
            Write-Utf8 (Join-Path $workspace 'work\result.ts') "export const result = 'base';`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m base --quiet;$base=(& git -C $workspace rev-parse HEAD).Trim()
            Write-Utf8 (Join-Path $workspace 'work\result.ts') "export const result = 'candidate';`n";& git -C $workspace add .;& git -C $workspace -c user.name=rd -c user.email=rd@local commit -m candidate --quiet;$head=(& git -C $workspace rev-parse HEAD).Trim()
            $task=Task ("TJSON-"+$Id);$sourcePath=Join-Path $Fixture ("review-tjson-"+$Id+".json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
            $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0];$contract=New-DispatcherContract -Task $task -TaskSource $source
            $runId='run-tjson-'+(New-StringHash ($Id+'|run')).Substring(7,16);$bindings=Get-AttestationBindings -TaskVersionId $contract.taskVersionId -WorktreeDir $workspace -BaseSha $base -HeadSha $head
            $diffResult=Invoke-GitV2 -Dir $workspace -Arguments @('diff','--no-color',"$base..$head") -LogLabel ("fixture-tjson-diff-"+$Id) -ReviewedSourceOutput;$diff=$diffResult.stdout.TrimEnd("`r","`n");$reviewDir=Join-Path (Get-V2Dir) "runs\$runId\review-000"
            $prompt=Build-ReviewPrompt -DataDir $reviewDir -TaskVersionId $contract.taskVersionId -Head $head -TreeHash $bindings.treeHash -DiffHash $bindings.diffHash -SpecHash $contract.specHash -AcceptanceText $contract.acceptanceText -SpecText $contract.specText -Diff $diff -ChangedFiles @('work/result.ts') -CheckSummary 'PASS profile=B; secretScan=CLEAN' -CriteriaIds @($contract.acceptanceCriteriaIds) -StructuredOutput
            $holdReason='HUMAN_REVIEW_REQUIRED: reviewer process did not exit 0 / timed out'
            $implementerProvider=$(if($NoEnvelope){'codex'}else{'glm'});$implementerModel=$(if($NoEnvelope){'fixture-codex'}else{Get-GlmModelId})
            $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';runId=$runId;taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;status='WAITING_HUMAN';stage='REVIEW';reason=$holdReason;workspace=$workspace;branch='main';baseSha=$base;candidateBase=$base;candidateHead=$head;candidateTree=$bindings.treeHash;diffHash=$bindings.diffHash;provider=$implementerProvider;profile='FAST';model=$implementerModel;attempt=1;cycle=0;rollovers=0;failovers=0;findings=@();decisions=@();importantArtifacts=@();providerHistory=@();unavailableProviders=@();implementationComplete=$true;requiresCorrection=$false;implementationCommit=$head;verification=$null;reviewVerdict='HUMAN_REVIEW_REQUIRED';logicalProjectId='fixture';integration=$null;reviewTerminalJsonRecoveryHistory=@();reviewTimeoutRetryHistory=@()}
            $record=New-DispatcherReviewArtifactRecord -DataDir $reviewDir -State $state;$state.reviewArtifactRecord=$record
            $vp=Invoke-VerificationProfile -ProfileId $contract.verificationProfile -WorktreeDir $workspace -BaseSha $base -HeadSha $head;$state.verification=$vp
            $treeScan=Test-GitTreeSecretsClean -RepoDir $workspace -BaseRef $base -Ref $head;$artifactScan=Test-TreeSecretsClean -Roots @((Join-Path (Get-V2Dir) "runs\$runId"));$state.secretScan=[ordered]@{clean=([bool]$treeScan.clean -and [bool]$artifactScan.clean);candidate=[ordered]@{clean=[bool]$treeScan.clean;baseSha=$base;headSha=$head;hits=@($treeScan.hits)};artifacts=[ordered]@{clean=[bool]$artifactScan.clean;hits=@($artifactScan.hits)};hits=@()}
            Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId|Out-Null;Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null;Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase CHECKING;Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase REVIEWING
            $check=New-Attestation -Kind check -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$bindings) -Result PASS -Payload @{profileId=$vp.profileId;effectiveInvocationHash=$vp.effectiveInvocationHash;checks=@($vp.checks)} -ProducerMeta @{verifier='v2-deterministic';profileId=$vp.profileId;verificationDefinitionHash=$vp.verificationDefinitionHash}
            $invocation='att-'+[guid]::NewGuid().ToString('N');$attempt=2;$suffix=$invocation.Substring(4,8);$logs=Join-Path (Get-V2Dir) "runs\$runId\logs";New-Item -ItemType Directory -Force -Path $logs|Out-Null;$stem="reviewer-002-deepseek-$suffix"
            $promptPath=Join-Path $logs "$stem.prompt.txt";$stdoutPath=Join-Path $logs "$stem.stdout.log";$stderrPath=Join-Path $logs "$stem.stderr.log";$requestPath=Join-Path $logs "$stem.request-manifest.json";Write-Utf8 $promptPath $prompt;Write-Utf8 $stderrPath ''
            $toolPolicy='read-only; review_reader artifacts only (no git, no shell, no candidate workspace)'
            # the envelope's own JSON key order matters: the extraction marker
            # matches only when schemaVersion is literally the first key, so
            # this MUST be an ordered hashtable rendered with a key-order-
            # preserving serializer, never ConvertTo-CanonicalJson (alphabetical).
            $envelope=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=$contract.taskVersionId;reviewedHead=$head;treeHash=$bindings.treeHash;diffHash=$bindings.diffHash;specHash=$contract.specHash;verdict='APPROVE';criteria=@([ordered]@{id='AC1';met=$true;evidence='fixture evidence'});findings=@([ordered]@{severity='info';file=$null;line=$null;detail='fixture review complete'});filesReviewed=@('work/result.ts');technicalBlock=$null;reviewerMeta=[ordered]@{provider='deepseek';model='deepseek-v4-flash';effort='low';toolPolicy=$toolPolicy;promptTemplateVersion='v2'}}
            $envelopeJson=($envelope|ConvertTo-Json -Compress -Depth 20)
            if(-not $envelopeJson.StartsWith((Get-ReviewEnvelopeTerminalMarker))){throw 'fixture: envelope JSON did not serialize with schemaVersion first'}
            $agentMessageText=$(if($NoEnvelope){'Review timed out before a structured verdict was produced.'}elseif($DoubleMarker){"All three artifacts are reconstructed.`n`n$envelopeJson extra $envelopeJson"}else{"All three artifacts are reconstructed: acceptance.txt, spec.txt, diff.patch, each matching the manifest.`n`n$envelopeJson"})
            $eventLines=@(
                (@{type='thread.started';thread_id='th_fixture'}|ConvertTo-Json -Compress -Depth 10),
                (@{type='turn.started'}|ConvertTo-Json -Compress -Depth 10),
                (@{type='item.completed';item=@{id='item_1';type='agent_message';text=$agentMessageText}}|ConvertTo-Json -Compress -Depth 20),
                (@{type='turn.completed';usage=@{input_tokens=1;output_tokens=1}}|ConvertTo-Json -Compress -Depth 10)
            )
            Write-Utf8 $stdoutPath (($eventLines -join "`n")+"`n")
            $request=[ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-request-manifest/1';createdAt='2026-09-22T00:00:00Z';invocationId=$invocation;provider='deepseek';baseUrl='https://api.deepseek.com/';redirectObserved=$false;requestedBillableSku='deepseek-v4-flash';reasoning='low';profile='FAST';promptHash=(New-FileHash $promptPath);runtimeConfigHash=('sha256:'+('1'*64));isolatedCodexHome='fixture';priceRegistryHash=('sha256:'+('2'*64));resolvedModelVersion='fixture';manifestHash=''};$requestSigned=[ordered]@{};foreach($key in $request.Keys){if($key -ne 'manifestHash'){$requestSigned[$key]=$request[$key]}};$request.manifestHash=New-ContentHash $requestSigned;Write-V2JsonCanonical $requestPath $request
            $agent=[ordered]@{invocationId=$invocation;provider='deepseek';model='deepseek-v4-flash';profile='FAST';reasoningIntent='low';attempt=$attempt;exitCode=0;providerClass='NONE';failureDiagnostic=$null;resultClass='AGENT_FAILURE';structuredResult=$null;promptArtifact=[IO.Path]::GetFullPath($promptPath);promptHash=(New-FileHash $promptPath);stdoutArtifact=[IO.Path]::GetFullPath($stdoutPath);stdoutHash=(New-FileHash $stdoutPath);stderrArtifact=[IO.Path]::GetFullPath($stderrPath);stderrHash=(New-FileHash $stderrPath);controlRecordHash=(New-StringHash ([IO.File]::ReadAllText($stdoutPath,[Text.Encoding]::UTF8)));duration=1;contextRolloverRequired=$false;capabilityVersion='fixture';continuationCheckpoint='';usage=@{inputTokens=1;outputTokens=1;cachedTokens=$null};cachedTokens=$null;returnedModels=@();requestManifestPath=[IO.Path]::GetFullPath($requestPath);requestManifestHash=$request.manifestHash;costUsd=$null;telemetryConsistent=$true;resultReceiptPath=(Get-RealAgentResultReceiptPath -ArtifactDir $logs -InvocationId $invocation -Role reviewer -Provider deepseek -Attempt $attempt)}
            $receipt=Write-RealAgentResultReceipt -AgentResult $agent
            $review=New-Attestation -Kind review -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$bindings) -Result HUMAN_REVIEW_REQUIRED -Payload @{problems=@('processOk=false');reason='reviewer process did not exit 0 / timed out';findings=@($null);technicalBlock=$null;reviewArtifactRecordHash=[string]$record.recordHash} -ProducerMeta @{provider='deepseek';model='deepseek-v4-flash';profile='FAST';invocationId=$invocation;fresh=$true;memory='disabled';workspace='review-data-only';exitCode=0}
            Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event review-hold -ToState WAITING_HUMAN -RunId $runId -Note HUMAN_REVIEW_REQUIRED|Out-Null
            $state.reviewInvocationId=$invocation;$state.reviewAttestationId=$review.attestationId;$state.reviewTechnicalBlock=$null;$state.reviewerProvider='deepseek';$state.providerHistory=@([ordered]@{invocationId=('att-'+[guid]::NewGuid().ToString('N'));role='IMPLEMENTER';provider=$implementerProvider;model=$implementerModel;resultClass='SUCCESS';providerClass='NONE';exitCode=0},[ordered]@{invocationId=$invocation;role='REVIEWER';provider='deepseek';model='deepseek-v4-flash';reasoningEffort='low';attempt=$attempt;providerClass='NONE';resultClass='AGENT_FAILURE';failureDiagnostic=$null;exitCode=0;stdoutArtifact=[IO.Path]::GetFullPath($stdoutPath);stdoutHash=$agent.stdoutHash;stderrArtifact=[IO.Path]::GetFullPath($stderrPath);stderrHash=$agent.stderrHash;controlRecordHash=$agent.controlRecordHash;telemetryConsistent=$true;resultReceiptHash=[string]$receipt.receiptHash});Write-DispatcherState $state|Out-Null
            return @{state=$state;task=$task;source=$source;contract=$contract;workspace=$workspace;base=$base;head=$head;review=$review;check=$check;record=$record;invocation=$invocation;receiptPath=$agent.resultReceiptPath;receipt=$receipt;stdoutPath=$stdoutPath;envelope=$envelope}
        }

        function Set-GlmNoVerdictReviewHold {
            param($Fixture)
            Resume-DispatcherReviewTimeoutBlock -State $Fixture.state -Task $Fixture.task -TaskSource $Fixture.source -Contract $Fixture.contract -TaskVersionId $Fixture.contract.taskVersionId -RunId $Fixture.state.runId -InvocationId $Fixture.invocation|Out-Null
            $state=Get-DispatcherState;$invocation='att-'+[guid]::NewGuid().ToString('N');$logs=Join-Path (Get-V2Dir) "runs\$($state.runId)\logs";$suffix=$invocation.Substring(4,8);$stem="reviewer-003-glm-$suffix"
            $promptPath=Join-Path $logs "$stem.prompt.txt";$stdoutPath=Join-Path $logs "$stem.stdout.log";$stderrPath=Join-Path $logs "$stem.stderr.log"
            Copy-Item ([string]$Fixture.receipt.promptArtifact) $promptPath;Write-Utf8 $stderrPath ''
            $events=@((ConvertTo-Json ([ordered]@{type='step_start';part=[ordered]@{type='step-start'}}) -Compress -Depth 8),(ConvertTo-Json ([ordered]@{type='step_finish';part=[ordered]@{type='step-finish';reason='length';tokens=[ordered]@{total=101;input=20;output=0;reasoning=80;cache=[ordered]@{write=0;read=1}};cost=0}}) -Compress -Depth 10));Write-Utf8 $stdoutPath (($events-join "`n")+"`n")
            $agent=[ordered]@{invocationId=$invocation;provider='glm';model=(Get-GlmModelId);profile='REASONING';reasoningIntent='high';attempt=3;exitCode=0;providerClass='NONE';failureDiagnostic=$null;resultClass='AGENT_FAILURE';structuredResult=$null;promptArtifact=[IO.Path]::GetFullPath($promptPath);promptHash=(New-FileHash $promptPath);stdoutArtifact=[IO.Path]::GetFullPath($stdoutPath);stdoutHash=(New-FileHash $stdoutPath);stderrArtifact=[IO.Path]::GetFullPath($stderrPath);stderrHash=(New-FileHash $stderrPath);controlRecordHash=(New-StringHash ([IO.File]::ReadAllText($stdoutPath,[Text.Encoding]::UTF8)));duration=1;contextRolloverRequired=$false;capabilityVersion='fixture';continuationCheckpoint='';usage=@{inputTokens=20;outputTokens=0;reasoningTokens=80;cachedTokens=1};cachedTokens=1;returnedModels=@();requestManifestPath='';requestManifestHash=$null;costUsd=0;telemetryConsistent=$true;resultReceiptPath=(Get-RealAgentResultReceiptPath -ArtifactDir $logs -InvocationId $invocation -Role reviewer -Provider glm -Attempt 3)};$receipt=Write-RealAgentResultReceipt -AgentResult $agent
            Enter-DispatcherLedgerPhase -TaskVersionId $state.taskVersionId -RunId $state.runId -Phase CHECKING;Enter-DispatcherLedgerPhase -TaskVersionId $state.taskVersionId -RunId $state.runId -Phase REVIEWING
            $review=New-Attestation -Kind review -TaskVersionId $state.taskVersionId -RunId $state.runId -Bindings ([hashtable](Get-AttestationBindings -TaskVersionId $state.taskVersionId -WorktreeDir $state.workspace -BaseSha $state.candidateBase -HeadSha $state.candidateHead)) -Result HUMAN_REVIEW_REQUIRED -Payload @{problems=@('processOk=false');reason='reviewer process did not exit 0 / timed out';findings=@($null);technicalBlock=$null;reviewArtifactRecordHash=[string]$state.reviewArtifactRecord.recordHash} -ProducerMeta @{provider='glm';model=(Get-GlmModelId);profile='REASONING';invocationId=$invocation;fresh=$true;memory='disabled';workspace='review-data-only';exitCode=0}
            Add-LedgerEvent -TaskVersionId $state.taskVersionId -Event review-hold -ToState WAITING_HUMAN -RunId $state.runId -Note HUMAN_REVIEW_REQUIRED|Out-Null
            $attempt=[ordered]@{invocationId=$invocation;role='REVIEWER';provider='glm';model=(Get-GlmModelId);reasoningEffort='high';attempt=3;providerClass='NONE';resultClass='AGENT_FAILURE';failureDiagnostic=$null;exitCode=0;stdoutArtifact=[IO.Path]::GetFullPath($stdoutPath);stdoutHash=$agent.stdoutHash;stderrArtifact=[IO.Path]::GetFullPath($stderrPath);stderrHash=$agent.stderrHash;controlRecordHash=$agent.controlRecordHash;telemetryConsistent=$true;resultReceiptHash=[string]$receipt.receiptHash;usage=$agent.usage}
            $state.providerHistory=@($state.providerHistory)+@($attempt);$state.status='WAITING_HUMAN';$state.stage='REVIEW';$state.reason='HUMAN_REVIEW_REQUIRED: reviewer process did not exit 0 / timed out';$state.reviewVerdict='HUMAN_REVIEW_REQUIRED';$state.reviewInvocationId=$invocation;$state.reviewAttestationId=$review.attestationId;$state.reviewerProvider='glm';Write-DispatcherState $state|Out-Null
            return @{state=$state;invocation=$invocation;receipt=$receipt;stdoutPath=$stdoutPath;review=$review}
        }

        Check 'RD-138' {
            $f=New-ReviewInfrastructureFixture 'RD138' $true
            $envelope=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=$f.contract.taskVersionId;reviewedHead=$f.head;treeHash=$f.state.candidateTree;diffHash=$f.state.diffHash;specHash=$f.contract.specHash;verdict='BLOCK';criteria=@();findings=@([ordered]@{severity='critical';detail='page unavailable'});filesReviewed=@();technicalBlock=$f.technicalBlock;reviewerMeta=[ordered]@{provider='deepseek';model='fixture';effort='low';toolPolicy='review-data-only';promptTemplateVersion='v'} }
            $wrapped="<<<ORCIVO_REVIEW_ENVELOPE_V1`n$(ConvertTo-CanonicalJson $envelope)`nORCIVO_REVIEW_ENVELOPE_V1>>>"
            $parsed=Parse-ReviewEnvelope -Stdout $wrapped -Expected @{reviewArtifacts=@($f.record.artifacts);processOk=$true}
            Assert-True ([string]$parsed.technicalBlock.classification -eq 'REVIEW_INFRASTRUCTURE' -and [string]$parsed.technicalBlock.failure -eq 'ARTIFACT_READ_FAILURE') 'strict structured technical BLOCK was not preserved'
        }

        Check 'RD-139' {
            $f=New-ReviewInfrastructureFixture 'RD139' $false
            Assert-True ([string]$f.state.status -eq 'WAITING_HUMAN' -and -not(Test-DispatcherReviewInfrastructureResumeState $f.state)) 'normal semantic BLOCK became automatically retryable'
        }

        Check 'RD-140' {
            $f=New-ReviewInfrastructureFixture 'RD140' $true;$proof=Get-DispatcherReviewInfrastructureRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract
            Assert-True ($proof.eligible -and [string]$proof.proof.origin -eq 'STRUCTURED_TECHNICAL_BLOCK' -and [string]$proof.proof.failedReaderHash -eq 'sha256:caef0352478a7e9461852fef7520762c04d853c7b4cc92e78ec945093a5b8026' -and [string]$proof.proof.recoveryReaderHash -eq 'sha256:caef0352478a7e9461852fef7520762c04d853c7b4cc92e78ec945093a5b8026') "structured infrastructure BLOCK was not recoverable with canonical reader bindings: $($proof.reason)"
        }

        Check 'RD-141' {
            $f=New-ReviewInfrastructureFixture 'RD141' $true;Write-Utf8 (Join-Path $f.workspace 'work\dirty.ts') "export const dirty = true;`n";$proof=Get-DispatcherReviewInfrastructureRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract
            Assert-True (-not $proof.eligible -and [string]$proof.reason -match 'dirty') 'candidate mutation did not prevent review recovery'
        }

        Check 'RD-142' {
            $f=New-ReviewInfrastructureFixture 'RD142' $true;$tampered=ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $f.state);$tampered.candidateTree='0'*40;$proof=Get-DispatcherReviewInfrastructureRecoveryProof -State $tampered -Task $f.task -TaskSource $f.source -Contract $f.contract
            Assert-True (-not $proof.eligible -and [string]$proof.reason -match 'binding|record') 'candidate binding tamper did not prevent review recovery'
        }

        Check 'RD-143' {
            $f=New-ReviewInfrastructureFixture 'RD143' $true;Add-Content -LiteralPath (Join-Path $f.record.dataDir 'diff.patch') -Value 'tamper';$proof=Get-DispatcherReviewInfrastructureRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract
            Assert-True (-not $proof.eligible -and [string]$proof.reason -match 'artifact|diff') 'review artifact tamper did not prevent recovery'
        }

        Check 'RD-144' {
            $vf=New-ReviewInfrastructureFixture 'RD144-v' $true;$vf.state.verification.pass=$false;$verification=Get-DispatcherReviewInfrastructureRecoveryProof -State $vf.state -Task $vf.task -TaskSource $vf.source -Contract $vf.contract
            $sf=New-ReviewInfrastructureFixture 'RD144-s' $true;$sf.state.secretScan.clean=$false;$secret=Get-DispatcherReviewInfrastructureRecoveryProof -State $sf.state -Task $sf.task -TaskSource $sf.source -Contract $sf.contract
            Assert-True (-not $verification.eligible -and -not $secret.eligible) 'verification or secret-scan drift remained recoverable'
        }

        Check 'RD-145' {
            $f=New-ReviewInfrastructureFixture 'RD145' $true;$oldHash=[string]$f.review.attestationHash;$oldPath=Join-Path (Join-Path (Get-V2Dir) "attestations\$($f.state.taskVersionId)") ("review-$($f.review.attestationId).json");$oldFileHash=New-FileHash $oldPath;$before=@($f.state.providerHistory).Count;$roles=New-Object System.Collections.Generic.List[string]
            function Invoke-RealAgent { param($Provider,$Role,$TaskVersion,$Profile,$Workspace,$StructuredPrompt,$ArtifactDir,$TimeoutSec,$Attempt,$ContinuationCheckpoint,$InvocationId,$BeforeLaunch)
                $roles.Add(([string]$Role).ToUpperInvariant());$inv='att-'+[guid]::NewGuid().ToString('N');$s=Get-DispatcherState;$c=Get-Contract $s.taskVersionId
                $e=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=$s.taskVersionId;reviewedHead=$s.candidateHead;treeHash=$s.candidateTree;diffHash=$s.diffHash;specHash=$c.specHash;verdict='BLOCK';criteria=@();findings=@([ordered]@{severity='high';detail='semantic fixture blocker'});filesReviewed=@('work/result.ts');reviewerMeta=[ordered]@{provider=$Provider;model='fixture';effort='low';toolPolicy='review-data-only';promptTemplateVersion='v'}}
                return [ordered]@{invocationId=$inv;provider=$Provider;model='fixture';profile=$Profile;reasoningIntent='low';attempt=$Attempt;exitCode=0;providerClass='NONE';resultClass='BLOCK';structuredResult=$e;stdoutArtifact='';stderrArtifact='';stdoutHash=('sha256:'+('b'*64));controlRecordHash=('sha256:'+('c'*64));usage=$null;cachedTokens=$null;costUsd=$null;telemetryConsistent=$true}
            }
            try{$result=Invoke-RealDispatcherTask -Task $f.task -TaskSource $f.source}finally{. (Join-Path $V2 'real-agent.ps1')}
            $after=Get-DispatcherState;$newEntries=@($after.providerHistory|Select-Object -Skip $before)
            Assert-True (@($roles).Count -eq 1 -and $roles[0] -eq 'REVIEWER' -and @($newEntries).Count -eq 1 -and [string]$newEntries[0].role -eq 'REVIEWER') 'review recovery invoked an implementer/corrector or did not invoke exactly one reviewer'
            Assert-True ([string]$result.status -eq 'WAITING_HUMAN' -and [string]$after.candidateHead -eq $f.head -and [string]$after.runId -eq $f.state.runId -and [string]$after.taskVersionId -eq $f.state.taskVersionId) 'review-only retry changed lineage or candidate'
            Assert-True ((New-FileHash $oldPath) -eq $oldFileHash -and (Read-V2Json $oldPath).attestationHash -eq $oldHash -and @((Get-Attestations -TaskVersionId $f.state.taskVersionId -Kind review)).Count -eq 2) 'failed review history was rewritten instead of retained with a fresh attestation'
        }

        Check 'RD-146' {
            $f=New-ReviewInfrastructureFixture 'RD146' $true;$proof=Get-DispatcherReviewInfrastructureRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract;$e=@{classification='REVIEW_INFRASTRUCTURE';failure='ARTIFACT_READ_FAILURE';proofHash=[string]$proof.proof.proofHash;candidateHead=$f.head;reviewAttestationId=$f.review.attestationId}
            Add-LedgerEvent -TaskVersionId $f.state.taskVersionId -Event 'review-infrastructure-retry-dispatch' -ToState DISPATCHED -RunId $f.state.runId -AttemptId (New-AttemptId) -Evidence $e -Note 'same-candidate review-only recovery'|Out-Null
            $resumed=Resume-DispatcherReviewInfrastructureBlock -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract;$count=@((Get-LedgerState $f.state.taskVersionId).history|Where-Object event -like 'review-infrastructure-retry-*').Count
            $again=Resume-DispatcherReviewInfrastructureBlock -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -Contract $f.contract;$countAgain=@((Get-LedgerState $f.state.taskVersionId).history|Where-Object event -like 'review-infrastructure-retry-*').Count
            Assert-True ($resumed.resumed -and $count -eq 2 -and $countAgain -eq 2 -and -not $again.resumed) 'review recovery restart was not idempotent'
        }

        Check 'RD-147' {
            $exact=[ordered]@{status='WAITING_HUMAN';stage='REVIEW';reviewVerdict='BLOCK';taskId='PB1-P01-os-state-machine';taskVersionId='a8b65877877bcb7bc6c2ac75442219b2543358f8d6060aeb586ee181058b9a62';runId='run-04a4bf671c224608bd871fd46c125281';candidateBase='afb51959dd67a224ef7f5b10d4bb55aaa8b22c6f';candidateHead='3eadd04b807669d4f8c7e7755c4ab880b82f1ded';candidateTree='8b16429b3005cc61ab42f02f8cd0dbd52949110f';diffHash='sha256:9c4dd056264be5fed077448ea3f50b58c8f6f1ae63ecf44d951eabb00531dfbf';reviewInvocationId='att-54f2af16803543a0b245f79374064c54';reviewAttestationId='atn-407022e851c24e2f80ba034d7d29c651'}
            Assert-True (Test-DispatcherReviewInfrastructureResumeState $exact) 'exact stranded legacy lineage was not classified for evidence reconstruction'
        }

        Check 'RD-148' {
            $lookalike=[ordered]@{status='WAITING_HUMAN';stage='REVIEW';reviewVerdict='BLOCK';taskId='PB1-P01-os-state-machine';taskVersionId='a8b65877877bcb7bc6c2ac75442219b2543358f8d6060aeb586ee181058b9a62';runId='run-lookalike';candidateBase='afb51959dd67a224ef7f5b10d4bb55aaa8b22c6f';candidateHead='3eadd04b807669d4f8c7e7755c4ab880b82f1ded';candidateTree='8b16429b3005cc61ab42f02f8cd0dbd52949110f';diffHash='sha256:9c4dd056264be5fed077448ea3f50b58c8f6f1ae63ecf44d951eabb00531dfbf';reviewInvocationId='att-54f2af16803543a0b245f79374064c54';reviewAttestationId='atn-407022e851c24e2f80ba034d7d29c651';findings=@('truncated')}
            Assert-True (-not(Test-DispatcherReviewInfrastructureResumeState $lookalike)) 'lookalike legacy BLOCK was accepted from natural-language similarity'
        }

        Check 'RD-149' {
            $f=New-ReviewInfrastructureFixture 'RD149' $true
            Assert-True ($f.prompt -match 'complete=false is continuation metadata' -and $f.prompt -match 'nextOffset' -and $f.prompt -match 'until complete=true' -and $f.prompt -match 'technicalBlock null' -and $f.prompt -notmatch 'technicalBlock\?' -and $f.prompt -notmatch 'omit technicalBlock') 'review prompt does not require complete deterministic pagination and explicit nullable technicalBlock semantics'
        }

        Check 'RD-156' {
            $providerSchema=Get-Content -Raw -LiteralPath (Join-Path (Get-V2Dir) 'schemas\review-agent-result.schema.json')|ConvertFrom-Json
            $errors=@(Get-DeepSeekStrictSchemaCompatibilityErrors $providerSchema)
            Assert-True ($errors.Count -eq 0) "provider-facing review schema is not recursively DeepSeek-compatible: $($errors -join '; ')"
            Assert-True (@($providerSchema.properties.technicalBlock.anyOf).Count -eq 2 -and @($providerSchema.properties.technicalBlock.anyOf|Where-Object type -eq 'null').Count -eq 1 -and @($providerSchema.properties.technicalBlock.anyOf|Where-Object type -eq 'object').Count -eq 1) 'technicalBlock is not encoded as object/null anyOf'
            Assert-True (@($providerSchema.properties.findings.items.properties.file.anyOf|Where-Object type -eq 'null').Count -eq 1 -and @($providerSchema.properties.findings.items.properties.line.anyOf|Where-Object type -eq 'null').Count -eq 1) 'nullable finding file/line are not encoded with supported anyOf branches'
        }

        Check 'RD-157' {
            $f=New-ReviewInfrastructureFixture 'RD157' $false
            $envelope=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=$f.contract.taskVersionId;reviewedHead=$f.head;treeHash=$f.state.candidateTree;diffHash=$f.state.diffHash;specHash=$f.contract.specHash;verdict='BLOCK';criteria=@();findings=@([ordered]@{severity='high';file=$null;line=$null;detail='semantic fixture blocker'});filesReviewed=@('work/result.ts');technicalBlock=$null;reviewerMeta=[ordered]@{provider='deepseek';model='fixture';effort='low';toolPolicy='review-data-only';promptTemplateVersion='v'}}
            $providerSchema=Get-Content -Raw -LiteralPath (Join-Path (Get-V2Dir) 'schemas\review-agent-result.schema.json')|ConvertFrom-Json
            Assert-True (@(Test-JsonSchema (ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $envelope)) $providerSchema).Count -eq 0) 'technicalBlock:null failed provider-output schema'
            $local=_ToHashtable ((ConvertTo-CanonicalJson $envelope)|ConvertFrom-Json);$local.findings[0].Remove('file');$local.findings[0].Remove('line');$wrapped="$((Get-V2Config).review.beginMarker)`n$(ConvertTo-CanonicalJson $local)`n$((Get-V2Config).review.endMarker)";$parsed=Parse-ReviewEnvelope -Stdout $wrapped -Expected @{reviewArtifacts=@($f.record.artifacts);processOk=$true}
            Assert-True ($parsed.verdict -eq 'BLOCK' -and $null -eq $parsed.technicalBlock -and -not(Test-DispatcherReviewInfrastructureResumeState ([ordered]@{reviewTechnicalBlock=$parsed.technicalBlock;reviewResult='BLOCK'}))) 'semantic BLOCK with null was classified as review infrastructure'
        }

        Check 'RD-158' {
            $f=New-ReviewInfrastructureFixture 'RD158' $true
            $valid=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=$f.contract.taskVersionId;reviewedHead=$f.head;treeHash=$f.state.candidateTree;diffHash=$f.state.diffHash;specHash=$f.contract.specHash;verdict='BLOCK';criteria=@();findings=@([ordered]@{severity='critical';detail='page unavailable'});filesReviewed=@();technicalBlock=$f.technicalBlock;reviewerMeta=[ordered]@{provider='deepseek';model='fixture';effort='low';toolPolicy='review-data-only';promptTemplateVersion='v'}}
            $wrapped="$((Get-V2Config).review.beginMarker)`n$(ConvertTo-CanonicalJson $valid)`n$((Get-V2Config).review.endMarker)";$parsed=Parse-ReviewEnvelope -Stdout $wrapped -Expected @{reviewArtifacts=@($f.record.artifacts);processOk=$true}
            $providerValid=_ToHashtable ((ConvertTo-CanonicalJson $valid)|ConvertFrom-Json);$providerValid.findings[0]['file']=$null;$providerValid.findings[0]['line']=$null;$providerSchema=Get-Content -Raw -LiteralPath (Join-Path (Get-V2Dir) 'schemas\review-agent-result.schema.json')|ConvertFrom-Json
            $bad=_ToHashtable ((ConvertTo-CanonicalJson $valid)|ConvertFrom-Json);$bad.technicalBlock.Remove('detail');$badWrapped="$((Get-V2Config).review.beginMarker)`n$(ConvertTo-CanonicalJson $bad)`n$((Get-V2Config).review.endMarker)";$rejected=Parse-ReviewEnvelope -Stdout $badWrapped -Expected @{reviewArtifacts=@($f.record.artifacts);processOk=$true}
            $providerErrors=@(Test-JsonSchema $providerValid $providerSchema)
            Assert-True ($providerErrors.Count -eq 0 -and [string]$parsed.technicalBlock.classification -eq 'REVIEW_INFRASTRUCTURE' -and $rejected.verdict -eq 'HUMAN_REVIEW_REQUIRED') "valid infrastructure block failed provider/local validation or malformed technicalBlock passed local validation: provider=$($providerErrors -join '; ') parsed=$($parsed.verdict)/$($parsed.reason) rejected=$($rejected.verdict)/$($rejected.reason)"
        }

        Check 'RD-159' {
            $f=New-ReviewInfrastructureFixture 'RD159' $false
            $historical=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=$f.contract.taskVersionId;reviewedHead=$f.head;treeHash=$f.state.candidateTree;diffHash=$f.state.diffHash;specHash=$f.contract.specHash;verdict='REQUEST_CHANGES';criteria=@();findings=@([ordered]@{severity='medium';detail='historical semantic finding'});filesReviewed=@('work/result.ts');reviewerMeta=[ordered]@{provider='codex';model='historical';effort='low';toolPolicy='review-data-only';promptTemplateVersion='v'}}
            $wrapped="$((Get-V2Config).review.beginMarker)`n$(ConvertTo-CanonicalJson $historical)`n$((Get-V2Config).review.endMarker)";$parsed=Parse-ReviewEnvelope -Stdout $wrapped -Expected @{processOk=$true}
            Assert-True ($parsed.verdict -eq 'REQUEST_CHANGES' -and $null -eq $parsed.technicalBlock) 'historical envelope omitting technicalBlock was rejected'
        }

        Check 'RD-160' {
            $source=Get-Content -Raw -LiteralPath (Join-Path (Get-V2Dir) 'schemas\review-agent-result.schema.json')
            $unsupported=$source|ConvertFrom-Json;$unsupported.properties.schemaVersion|Add-Member -NotePropertyName maxLength -NotePropertyValue 64
            $missingRequired=$source|ConvertFrom-Json;$missingRequired.properties.reviewerMeta.required=@($missingRequired.properties.reviewerMeta.required|Where-Object{$_ -ne 'model'})
            $multiType=$source|ConvertFrom-Json;$multiType.properties.findings.items.properties.file.PSObject.Properties.Remove('anyOf');$multiType.properties.findings.items.properties.file|Add-Member -NotePropertyName type -NotePropertyValue @('string','null')
            $malformedAnyOf=$source|ConvertFrom-Json;$malformedAnyOf.properties.technicalBlock.anyOf=@([pscustomobject]@{type='null'})
            Assert-True (@(Get-DeepSeekStrictSchemaCompatibilityErrors $unsupported).Count -gt 0 -and @(Get-DeepSeekStrictSchemaCompatibilityErrors $missingRequired).Count -gt 0 -and @(Get-DeepSeekStrictSchemaCompatibilityErrors $multiType).Count -gt 0 -and @(Get-DeepSeekStrictSchemaCompatibilityErrors $malformedAnyOf).Count -gt 0) 'recursive compatibility validator accepted an unsupported keyword, open required set, multi-type nullable encoding, or malformed anyOf'
        }

        Check 'RD-161' {
            $local=Get-Content -Raw -LiteralPath (Join-Path (Get-V2Dir) 'schemas\review-envelope.schema.json')|ConvertFrom-Json;$limits=(Get-V2Config).review.limits
            Assert-True ($local.properties.criteria.maxItems -eq 200 -and $local.properties.criteria.items.properties.id.minLength -eq 1 -and $local.properties.criteria.items.properties.evidence.maxLength -eq 4000 -and $local.properties.findings.maxItems -eq 200 -and $local.properties.findings.items.properties.detail.minLength -eq 1 -and $local.properties.findings.items.properties.detail.maxLength -eq 4000 -and $local.properties.filesReviewed.maxItems -eq 2000 -and $local.properties.filesReviewed.items.maxLength -eq 512 -and $local.properties.technicalBlock.properties.detail.minLength -eq 1 -and $local.properties.technicalBlock.properties.detail.maxLength -eq 1000 -and $limits.maxFindings -eq 200 -and $limits.maxFindingDetailChars -eq 4000 -and $limits.maxEvidenceChars -eq 4000) 'authoritative local schema/parser bounds were weakened'
        }

        Check 'RD-162' {
            $f=New-ReviewSchemaHoldFixture 'RD162';$proof=Get-DispatcherReviewSchemaHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True ($f.toolPolicy.Length -eq 82 -and $proof.eligible -and $proof.replayVerdict -eq 'APPROVE') 'the exact real 82-character toolPolicy did not pass current authoritative validation'
        }

        Check 'RD-163' {
            $f=New-ReviewSchemaHoldFixture 'RD163';$e=ConvertTo-DispatcherNormalizedReviewResult $f.receipt.structuredResult;$e.reviewerMeta.toolPolicy='x'*513;$cfg=Get-V2Config;$wrapped="$($cfg.review.beginMarker)`n$(ConvertTo-CanonicalJson $e)`n$($cfg.review.endMarker)";$p=Parse-ReviewEnvelope -Stdout $wrapped -Expected @{processOk=$true}
            Assert-True ($p.verdict -eq 'HUMAN_REVIEW_REQUIRED' -and $p.reason -eq 'schema validation failed' -and (@($p.problems)-join ' ') -match 'maxLength 512') 'toolPolicy above the new bounded maximum was accepted'
        }

        Check 'RD-164' {
            $f=New-ReviewSchemaHoldFixture 'RD164';$p=Get-DispatcherReviewSchemaHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True ($p.eligible -and $p.replayVerdict -eq 'APPROVE' -and $p.replayReason -eq 'ok' -and @($p.problems).Count -eq 0 -and $null -eq $p.technicalBlock -and -not$p.providerInvocationRequired) "historical immutable receipt did not revalidate exactly: $($p.reason)"
        }

        Check 'RD-165' {
            $f=New-ReviewSchemaHoldFixture 'RD165';$p=Get-DispatcherReviewSchemaHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId ('att-'+[guid]::NewGuid().ToString('N'))
            Assert-True (-not$p.eligible -and $p.reason -match 'invocation') 'wrong reviewer invocation was eligible'
        }

        Check 'RD-166' {
            $f=New-ReviewSchemaHoldFixture 'RD166';$results=@();foreach($field in @('candidateHead','candidateTree','diffHash')){$s=_ToHashtable ((ConvertTo-CanonicalJson $f.state)|ConvertFrom-Json);$s[$field]=$(if($field -eq 'diffHash'){'sha256:'+('0'*64)}else{'0'*40});$results+=Get-DispatcherReviewSchemaHoldRecoveryProof -State $s -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation}
            Assert-True (@($results|Where-Object eligible).Count -eq 0) 'candidate head, tree, or diff drift remained eligible'
        }

        Check 'RD-167' {
            $f=New-ReviewSchemaHoldFixture 'RD167';$source=@{hash=('sha256:'+('0'*64));path=$f.source.path;tasks=$f.source.tasks};$p=Get-DispatcherReviewSchemaHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not$p.eligible -and $p.reason -match 'contract|source') 'task/spec/acceptance authority drift remained eligible'
        }

        Check 'RD-168' {
            $f=New-ReviewSchemaHoldFixture 'RD168';Add-Content -LiteralPath (Join-Path $f.record.dataDir 'diff.patch') -Value 'tamper';$p=Get-DispatcherReviewSchemaHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not$p.eligible -and $p.reason -match 'artifact') 'changed frozen review artifact remained eligible'
        }

        Check 'RD-169' {
            $receiptFixture=New-ReviewSchemaHoldFixture 'RD169-r';Add-Content -LiteralPath $receiptFixture.receiptPath -Value 'tamper';$receiptProof=Get-DispatcherReviewSchemaHoldRecoveryProof -State $receiptFixture.state -Task $receiptFixture.task -TaskSource $receiptFixture.source -Contract $receiptFixture.contract -TaskVersionId $receiptFixture.contract.taskVersionId -RunId $receiptFixture.state.runId -InvocationId $receiptFixture.invocation
            $stdoutFixture=New-ReviewSchemaHoldFixture 'RD169-s';Add-Content -LiteralPath $stdoutFixture.stdoutPath -Value 'tamper';$stdoutProof=Get-DispatcherReviewSchemaHoldRecoveryProof -State $stdoutFixture.state -Task $stdoutFixture.task -TaskSource $stdoutFixture.source -Contract $stdoutFixture.contract -TaskVersionId $stdoutFixture.contract.taskVersionId -RunId $stdoutFixture.state.runId -InvocationId $stdoutFixture.invocation
            Assert-True (-not$receiptProof.eligible -and -not$stdoutProof.eligible) 'modified receipt or stdout remained eligible'
        }

        Check 'RD-170' {
            $f=New-ReviewSchemaHoldFixture 'RD170';Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event unrelated-failure -ToState FAILED -RunId $f.state.runId|Out-Null;$p=Get-DispatcherReviewSchemaHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not$p.eligible -and $p.reason -match 'ledger') 'wrong ledger tail remained eligible'
        }

        Check 'RD-171' {
            $f=New-ReviewSchemaHoldFixture 'RD171';$s=_ToHashtable ((ConvertTo-CanonicalJson $f.state)|ConvertFrom-Json);$s.providerHistory[-1].resultClass='BLOCK';$p=Get-DispatcherReviewSchemaHoldRecoveryProof -State $s -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not$p.eligible -and $p.reason -match 'APPROVE') 'non-APPROVE reviewer result remained eligible'
        }

        Check 'RD-172' {
            $f=New-ReviewSchemaHoldFixture 'RD172';$s=_ToHashtable ((ConvertTo-CanonicalJson $f.state)|ConvertFrom-Json);$s.reason='Level C: owner decision';$p=Get-DispatcherReviewSchemaHoldRecoveryProof -State $s -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not$p.eligible -and $p.reason -match 'schema-validation hold') 'unrelated WAITING_HUMAN decision remained eligible'
        }

        Check 'RD-173' {
            $f=New-ReviewSchemaHoldFixture 'RD173';$first=Recover-DispatcherReviewSchemaHold -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation;$second=Recover-DispatcherReviewSchemaHold -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True ($first.status -eq 'RECOVERED_TO_INTEGRATE' -and $second.status -eq 'ALREADY_RECOVERED' -and @((Get-LedgerState $f.contract.taskVersionId).history|Where-Object event -like 'review-schema-revalidation-*').Count -eq 5) 'recovery was not idempotent'
        }

        Check 'RD-174' {
            $f=New-ReviewSchemaHoldFixture 'RD174';Recover-DispatcherReviewSchemaHold -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation|Out-Null;$events=@(Get-DispatcherLedgerEvents $f.contract.taskVersionId|Select-Object -Last 6);$states=@($events|ForEach-Object toState)
            Assert-True (($states-join '|') -eq 'WAITING_HUMAN|DISPATCHED|RUNNING|CHECKING|REVIEWING|APPROVED' -and -not(Get-LedgerState $f.contract.taskVersionId).corrupt) 'bounded recovery ledger transition sequence is invalid'
        }

        Check 'RD-175' {
            $f=New-ReviewSchemaHoldFixture 'RD175';$oldPath=Join-Path (Join-Path (Get-V2Dir) "attestations\$($f.contract.taskVersionId)") "review-$($f.review.attestationId).json";$before=New-FileHash $oldPath;Recover-DispatcherReviewSchemaHold -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation|Out-Null
            Assert-True ((New-FileHash $oldPath) -eq $before -and @((Get-Attestations -TaskVersionId $f.contract.taskVersionId -Kind review)).Count -eq 2) 'original HUMAN_REVIEW_REQUIRED evidence was rewritten or lost'
        }

        Check 'RD-176' {
            $f=New-ReviewSchemaHoldFixture 'RD176';$before=ConvertTo-CanonicalJson $f.state.providerHistory;Recover-DispatcherReviewSchemaHold -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation|Out-Null;$after=Get-DispatcherState
            Assert-True ((ConvertTo-CanonicalJson $after.providerHistory) -eq $before) 'schema recovery added or rewrote providerHistory'
        }

        Check 'RD-177' {
            $f=New-ReviewSchemaHoldFixture 'RD177';$script:SchemaRecoveryProviderCalls=0;function Invoke-RealAgent{$script:SchemaRecoveryProviderCalls++;throw 'provider invocation forbidden'}
            try{Recover-DispatcherReviewSchemaHold -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation|Out-Null}finally{. (Join-Path $V2 'real-agent.ps1')}
            Assert-True ($script:SchemaRecoveryProviderCalls -eq 0) 'schema recovery invoked an external provider'
        }

        Check 'RD-178' {
            $f=New-ReviewSchemaHoldFixture 'RD178';$r=Recover-DispatcherReviewSchemaHold -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation;$s=Get-DispatcherState
            Assert-True ($r.status -eq 'RECOVERED_TO_INTEGRATE' -and $s.stage -eq 'INTEGRATE' -and $s.status -eq 'RUNNING' -and $s.reviewVerdict -eq 'APPROVE' -and (Get-LedgerState $f.contract.taskVersionId).state -eq 'APPROVED' -and $s.candidateHead -eq $f.head -and $s.implementationComplete) 'recovered state did not safely reach INTEGRATE/APPROVED'
        }

        # ---- ROOT CAUSE 1 live fix: terminal-suffix extraction -----------------
        Check 'RD-179' {
            $body='{"schemaVersion":"orcivo.orchestration.v2.agent-result/1","role":"IMPLEMENTER","resultClass":"SUCCESS","summary":"ok","decisions":[],"tests":[],"nextAction":"none","importantArtifacts":[]}'
            $co="{`"type`":`"item.completed`",`"item`":{`"type`":`"agent_message`",`"text`":$($body|ConvertTo-Json -Compress)}}"
            Assert-True ((ConvertFrom-RealCodexOutput $co).structured.resultClass -eq 'SUCCESS') 'ordinary pure-JSON agent_message regressed'
        }
        Check 'RD-180' {
            $envelope=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=('a'*64);reviewedHead=('b'*40);treeHash=('c'*40);diffHash=('sha256:'+('d'*64));specHash=('sha256:'+('e'*64));verdict='APPROVE';criteria=@();findings=@();filesReviewed=@();technicalBlock=$null;reviewerMeta=[ordered]@{provider='deepseek';model='m';effort='low';toolPolicy='t';promptTemplateVersion='v'}}
            $text="All three artifacts are reconstructed: acceptance.txt, spec.txt, diff.patch, each matching the manifest.`n`n$($envelope|ConvertTo-Json -Compress -Depth 20)"
            $co="{`"type`":`"item.completed`",`"item`":{`"type`":`"agent_message`",`"text`":$($text|ConvertTo-Json -Compress)}}"
            $r=(ConvertFrom-RealCodexOutput $co).structured
            Assert-True ($r -and $r.verdict -eq 'APPROVE' -and $r.schemaVersion -eq 'orcivo.orchestration.v2.review-envelope/1') 'prose-prefixed terminal review envelope was not extracted'
        }
        Check 'RD-181' {
            $marker=Get-ReviewEnvelopeTerminalMarker
            $text="$marker,`"x`":1} and again $marker,`"x`":2}"
            Assert-True ($null -eq (ConvertFrom-ReviewEnvelopeTerminalSuffix -Text $text)) 'multiple review-envelope markers were accepted'
        }
        Check 'RD-182' {
            $marker=Get-ReviewEnvelopeTerminalMarker
            $text="$marker,`"x`":1} trailing prose that should not be here"
            Assert-True ($null -eq (ConvertFrom-ReviewEnvelopeTerminalSuffix -Text $text)) 'trailing prose after the terminal JSON object was accepted'
        }
        Check 'RD-183' {
            $marker=Get-ReviewEnvelopeTerminalMarker
            $text="$marker,`"x`":1}`n``````"
            Assert-True ($null -eq (ConvertFrom-ReviewEnvelopeTerminalSuffix -Text $text)) 'a fenced ``` suffix after the terminal JSON object was accepted'
        }
        Check 'RD-184' {
            $marker=Get-ReviewEnvelopeTerminalMarker
            $text="prose `n`n$marker,`"x`":1"
            Assert-True ($null -eq (ConvertFrom-ReviewEnvelopeTerminalSuffix -Text $text)) 'a malformed/truncated terminal JSON suffix was accepted'
        }
        Check 'RD-185' {
            $co='{"type":"item.completed","item":{"type":"agent_message","text":"not json at all"}}'
            Assert-True ($null -eq (ConvertFrom-RealCodexOutput $co).structured) 'a non-JSON, non-review agent_message produced a spurious structured result'
        }

        # ---- ROOT CAUSE 2: local schema/provider schema null file/line parity --
        Check 'RD-186' {
            $f=New-ReviewInfrastructureFixture 'RD186' $false
            $envelope=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=$f.contract.taskVersionId;reviewedHead=$f.head;treeHash=$f.state.candidateTree;diffHash=$f.state.diffHash;specHash=$f.contract.specHash;verdict='BLOCK';criteria=@();findings=@([ordered]@{severity='high';file=$null;line=$null;detail='null file/line, keys present'});filesReviewed=@('work/result.ts');technicalBlock=$null;reviewerMeta=[ordered]@{provider='deepseek';model='fixture';effort='low';toolPolicy='review-data-only';promptTemplateVersion='v'}}
            $wrapped="$((Get-V2Config).review.beginMarker)`n$(ConvertTo-CanonicalJson $envelope)`n$((Get-V2Config).review.endMarker)"
            $parsed=Parse-ReviewEnvelope -Stdout $wrapped -Expected @{reviewArtifacts=@($f.record.artifacts);processOk=$true}
            Assert-True ($parsed.verdict -eq 'BLOCK' -and (@($parsed.problems) -join ' ') -notmatch 'expected type') "finding.file/line=null (keys present, not stripped) was rejected by the authoritative local schema: $($parsed.verdict)/$($parsed.reason)/$(@($parsed.problems)-join ';')"
        }
        Check 'RD-187' {
            $local=Get-Content -Raw -LiteralPath (Join-Path (Get-V2Dir) 'schemas\review-envelope.schema.json')|ConvertFrom-Json
            $badFile=[ordered]@{severity='low';file=123;line=1;detail='wrong type'}
            $errs=@(Test-JsonSchema (ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $badFile)) $local.properties.findings.items)
            $tooLong=[ordered]@{severity='low';file=('x'*513);line=1;detail='too long'}
            $errsLong=@(Test-JsonSchema (ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $tooLong)) $local.properties.findings.items)
            $okString=[ordered]@{severity='low';file='a/b.ts';line=1;detail='ok'}
            $errsOk=@(Test-JsonSchema (ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $okString)) $local.properties.findings.items)
            Assert-True ($errs.Count -gt 0 -and $errsLong.Count -gt 0 -and $errsOk.Count -eq 0) "non-null finding.file type/length bound was weakened: badType=$($errs.Count) tooLong=$($errsLong.Count) ok=$($errsOk.Count)"
        }

        # ---- terminal-JSON-framing hold recovery (evidence-driven) -------------
        Check 'RD-188' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD188';$p=Get-DispatcherReviewTerminalJsonHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True ($p.eligible -and $p.replayVerdict -eq 'APPROVE' -and $p.replayReason -eq 'ok' -and @($p.problems).Count -eq 0 -and $null -eq $p.technicalBlock -and -not $p.providerInvocationRequired -and $p.extractedEnvelopeHash -match '^sha256:') "immutable terminal-JSON-framing hold did not revalidate exactly: $($p.reason)"
        }
        Check 'RD-189' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD189';$p=Get-DispatcherReviewTerminalJsonHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId ('att-'+[guid]::NewGuid().ToString('N'))
            Assert-True (-not $p.eligible -and $p.reason -match 'invocation') 'wrong reviewer invocation was eligible for terminal-JSON recovery'
        }
        Check 'RD-190' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD190';$results=@();foreach($field in @('candidateHead','candidateTree','diffHash')){$s=_ToHashtable ((ConvertTo-CanonicalJson $f.state)|ConvertFrom-Json);$s[$field]=$(if($field -eq 'diffHash'){'sha256:'+('0'*64)}else{'0'*40});$results+=Get-DispatcherReviewTerminalJsonHoldRecoveryProof -State $s -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation}
            Assert-True (@($results|Where-Object eligible).Count -eq 0) 'candidate head, tree, or diff drift remained eligible for terminal-JSON recovery'
        }
        Check 'RD-191' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD191'
            $receipt=Read-V2Json $f.receiptPath;$mutated=[ordered]@{};foreach($k in $receipt.Keys){if($k -ne 'receiptHash'){$mutated[$k]=$receipt[$k]}};$mutated['structuredResult']=$f.envelope
            $signed=[ordered]@{};foreach($k in $mutated.Keys){$signed[$k]=$mutated[$k]};$mutated['receiptHash']=New-ContentHash $signed
            Write-V2JsonCanonical $f.receiptPath $mutated
            $s=_ToHashtable ((ConvertTo-CanonicalJson $f.state)|ConvertFrom-Json);$s.providerHistory[-1].resultReceiptHash=[string]$mutated.receiptHash
            $p=Get-DispatcherReviewTerminalJsonHoldRecoveryProof -State $s -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not $p.eligible -and $p.reason -match 'structured result') "an immutable receipt already carrying a structured result remained eligible for terminal-JSON-framing recovery: $($p.reason)"
        }
        Check 'RD-192' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD192';Add-Content -LiteralPath $f.stdoutPath -Value 'tamper'
            $p=Get-DispatcherReviewTerminalJsonHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not $p.eligible) 'a tampered immutable stdout remained eligible for terminal-JSON recovery'
        }
        Check 'RD-193' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD193' -DoubleMarker
            $p=Get-DispatcherReviewTerminalJsonHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not $p.eligible -and $p.reason -match 'terminal review-envelope suffix') "an immutable stdout with two review-envelope markers in one agent_message remained eligible: $($p.reason)"
        }
        Check 'RD-194' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD194';$s=_ToHashtable ((ConvertTo-CanonicalJson $f.state)|ConvertFrom-Json);$s.providerHistory[-1].providerClass='PROVIDER_UNAVAILABLE'
            $p=Get-DispatcherReviewTerminalJsonHoldRecoveryProof -State $s -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not $p.eligible -and $p.reason -match 'exit-zero') 'a non-NONE providerClass reviewer invocation remained eligible for terminal-JSON recovery'
        }
        Check 'RD-195' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD195';$script:TerminalJsonRecoveryProviderCalls=0;function Invoke-RealAgent{$script:TerminalJsonRecoveryProviderCalls++;throw 'provider invocation forbidden'}
            try{Recover-DispatcherReviewTerminalJsonHold -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation|Out-Null}finally{. (Join-Path $V2 'real-agent.ps1')}
            Assert-True ($script:TerminalJsonRecoveryProviderCalls -eq 0) 'terminal-JSON recovery invoked an external provider'
        }
        Check 'RD-196' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD196';$oldPath=Join-Path (Join-Path (Get-V2Dir) "attestations\$($f.contract.taskVersionId)") "review-$($f.review.attestationId).json";$oldHash=New-FileHash $oldPath;$beforeHistory=ConvertTo-CanonicalJson $f.state.providerHistory
            $first=Recover-DispatcherReviewTerminalJsonHold -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            $second=Recover-DispatcherReviewTerminalJsonHold -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            $s=Get-DispatcherState
            Assert-True ($first.status -eq 'RECOVERED_TO_INTEGRATE' -and $second.status -eq 'ALREADY_RECOVERED' -and $s.stage -eq 'INTEGRATE' -and $s.status -eq 'RUNNING' -and $s.reviewVerdict -eq 'APPROVE' -and (Get-LedgerState $f.contract.taskVersionId).state -eq 'APPROVED' -and $s.candidateHead -eq $f.head -and $s.implementationComplete) 'recovered state did not idempotently and safely reach INTEGRATE/APPROVED'
            Assert-True ((New-FileHash $oldPath) -eq $oldHash) 'original HUMAN_REVIEW_REQUIRED evidence was rewritten or lost'
            Assert-True ((ConvertTo-CanonicalJson $s.providerHistory) -eq $beforeHistory) 'terminal-JSON recovery added or rewrote providerHistory'
        }

        Check 'RD-212' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD212' -NoEnvelope
            $p=Get-DispatcherReviewTimeoutRetryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True ($p.eligible -and $p.providerInvocationRequired -and $p.retryProvider -eq 'glm' -and $p.retryProfile -eq 'REASONING' -and $p.candidateHead -eq $f.head) "a genuine timeout without a terminal envelope was not eligible for one exact GLM review retry: $($p.reason)"
        }
        Check 'RD-213' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD213' -NoEnvelope;$oldHead=$f.state.candidateHead;$oldHistory=ConvertTo-CanonicalJson $f.state.providerHistory
            $r=Resume-DispatcherReviewTimeoutBlock -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            $s=Get-DispatcherState;$ledger=Get-LedgerState $f.contract.taskVersionId
            Assert-True ($r.resumed -and $s.status -eq 'RUNNING' -and $s.stage -eq 'REVIEW' -and $ledger.state -eq 'RUNNING' -and $s.candidateHead -eq $oldHead -and $s.authorizedReviewRoute.provider -eq 'glm' -and $s.authorizedReviewRoute.profile -eq 'REASONING' -and $s.reviewTimeoutRetryHistory.Count -eq 1) 'timeout recovery did not preserve the candidate and enter a single pinned GLM review retry'
            Assert-True ((ConvertTo-CanonicalJson $s.providerHistory) -eq $oldHistory) 'timeout recovery rewrote immutable provider history'
        }
        Check 'RD-214' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD214' -NoEnvelope;Add-Content -LiteralPath $f.stdoutPath -Value 'tamper'
            $p=Get-DispatcherReviewTimeoutRetryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not $p.eligible -and $p.reason -match 'evidence|hash|stdout|receipt') 'tampered reviewer output remained eligible for timeout retry'
        }
        Check 'RD-215' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD215' -NoEnvelope
            Resume-DispatcherReviewTimeoutBlock -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation|Out-Null
            $p=Get-DispatcherReviewTimeoutRetryProof -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True (-not $p.eligible -and $p.reason -match 'budget exhausted') 'a second timeout retry remained authorized for the same task version'
        }
        Check 'RD-216' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD216' -NoEnvelope;Resume-DispatcherReviewTimeoutBlock -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation|Out-Null
            $calls=New-Object System.Collections.Generic.List[object]
            function Invoke-RealAgent { param($Provider,$Role,$TaskVersion,$Profile,$Workspace,$StructuredPrompt,$ArtifactDir,$TimeoutSec,$Attempt,$ContinuationCheckpoint,$InvocationId,$BeforeLaunch)
                $calls.Add([ordered]@{provider=$Provider;role=$Role;profile=$Profile});$s=Get-DispatcherState;$c=Get-Contract $s.taskVersionId;$inv='att-'+[guid]::NewGuid().ToString('N')
                $e=[ordered]@{schemaVersion='orcivo.orchestration.v2.review-envelope/1';taskVersion=$s.taskVersionId;reviewedHead=$s.candidateHead;treeHash=$s.candidateTree;diffHash=$s.diffHash;specHash=$c.specHash;verdict='BLOCK';criteria=@();findings=@([ordered]@{severity='high';file=$null;line=$null;detail='fixture semantic blocker'});filesReviewed=@('work/result.ts');technicalBlock=$null;reviewerMeta=[ordered]@{provider=$Provider;model=(Get-GlmModelId);effort='high';toolPolicy='review-data-only';promptTemplateVersion='v2'}}
                return [ordered]@{invocationId=$inv;provider=$Provider;model=(Get-GlmModelId);profile=$Profile;reasoningIntent='high';attempt=$Attempt;exitCode=0;providerClass='NONE';resultClass='BLOCK';structuredResult=$e;stdoutArtifact='';stderrArtifact='';stdoutHash=('sha256:'+('b'*64));stderrHash=('sha256:'+('d'*64));controlRecordHash=('sha256:'+('c'*64));usage=$null;cachedTokens=$null;costUsd=$null;telemetryConsistent=$true;resultReceiptHash=('sha256:'+('e'*64))}
            }
            try{$r=Invoke-RealDispatcherTask -Task $f.task -TaskSource $f.source}finally{. (Join-Path $V2 'real-agent.ps1')}
            Assert-True ($calls.Count -eq 1 -and $calls[0].role -eq 'reviewer' -and $calls[0].provider -eq 'glm' -and $calls[0].profile -eq 'REASONING' -and $r.status -eq 'WAITING_HUMAN' -and $r.candidateHead -eq $f.head) 'timeout retry did not invoke exactly one pinned GLM reviewer over the preserved candidate'
        }
        Check 'RD-217' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD217';$logs=Split-Path -Parent $f.stdoutPath;$suffix=$f.invocation.Substring(4,8);$stem="reviewer-002-glm-$suffix"
            $promptPath=Join-Path $logs "$stem.prompt.txt";$stdoutPath=Join-Path $logs "$stem.stdout.log";$stderrPath=Join-Path $logs "$stem.stderr.log"
            Copy-Item ([string]$f.receipt.promptArtifact) $promptPath;Write-Utf8 $stderrPath '';$f.envelope.reviewerMeta.provider='glm';$f.envelope.reviewerMeta.model=(Get-GlmModelId);$f.envelope.reviewerMeta.effort='high'
            $events=@((ConvertTo-Json ([ordered]@{type='step_start';part=[ordered]@{type='step-start'}}) -Compress -Depth 8),'[REDACTED: over-long line withheld (38968 chars > 16384)]',(ConvertTo-Json ([ordered]@{type='text';part=[ordered]@{type='text';text=(ConvertTo-Json $f.envelope -Depth 20)}}) -Compress -Depth 24),(ConvertTo-Json ([ordered]@{type='step_finish';part=[ordered]@{type='step-finish';reason='stop';tokens=[ordered]@{total=100;input=20;output=10;reasoning=5;cache=[ordered]@{write=0;read=70}};cost=0}}) -Compress -Depth 10));Write-Utf8 $stdoutPath (($events-join "`n")+"`n")
            $agent=[ordered]@{invocationId=$f.invocation;provider='glm';model=(Get-GlmModelId);profile='REASONING';reasoningIntent='high';attempt=2;exitCode=0;providerClass='NONE';failureDiagnostic=$null;resultClass='AGENT_FAILURE';structuredResult=$null;promptArtifact=[IO.Path]::GetFullPath($promptPath);promptHash=(New-FileHash $promptPath);stdoutArtifact=[IO.Path]::GetFullPath($stdoutPath);stdoutHash=(New-FileHash $stdoutPath);stderrArtifact=[IO.Path]::GetFullPath($stderrPath);stderrHash=(New-FileHash $stderrPath);controlRecordHash=(New-StringHash ([IO.File]::ReadAllText($stdoutPath,[Text.Encoding]::UTF8)));duration=1;contextRolloverRequired=$false;capabilityVersion='fixture';continuationCheckpoint='';usage=@{inputTokens=20;outputTokens=10;cachedTokens=70};cachedTokens=70;returnedModels=@();requestManifestPath='';requestManifestHash=$null;costUsd=0;telemetryConsistent=$true;resultReceiptPath=(Get-RealAgentResultReceiptPath -ArtifactDir $logs -InvocationId $f.invocation -Role reviewer -Provider glm -Attempt 2)};$receipt=Write-RealAgentResultReceipt -AgentResult $agent
            $review=New-Attestation -Kind review -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -Bindings ([hashtable](Get-AttestationBindings -TaskVersionId $f.contract.taskVersionId -WorktreeDir $f.workspace -BaseSha $f.base -HeadSha $f.head)) -Result HUMAN_REVIEW_REQUIRED -Payload @{problems=@('processOk=false');reason='reviewer process did not exit 0 / timed out';findings=@($null);technicalBlock=$null;reviewArtifactRecordHash=[string]$f.record.recordHash} -ProducerMeta @{provider='glm';model=(Get-GlmModelId);profile='REASONING';invocationId=$f.invocation;fresh=$true;memory='disabled';workspace='review-data-only';exitCode=0}
            $f.state.reviewAttestationId=$review.attestationId;$f.state.reviewerProvider='glm';$f.state.providerHistory[-1]=[ordered]@{invocationId=$f.invocation;role='REVIEWER';provider='glm';model=(Get-GlmModelId);reasoningEffort='high';attempt=2;providerClass='NONE';resultClass='AGENT_FAILURE';failureDiagnostic=$null;exitCode=0;stdoutArtifact=[IO.Path]::GetFullPath($stdoutPath);stdoutHash=$agent.stdoutHash;stderrArtifact=[IO.Path]::GetFullPath($stderrPath);stderrHash=$agent.stderrHash;controlRecordHash=$agent.controlRecordHash;telemetryConsistent=$true;resultReceiptHash=[string]$receipt.receiptHash};Write-DispatcherState $f.state|Out-Null
            $p=Get-DispatcherReviewTerminalJsonHoldRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $f.invocation
            Assert-True ($p.eligible -and $p.replayVerdict -eq 'APPROVE' -and $p.candidateHead -eq $f.head) "a hash-bound terminal GLM review envelope was not eligible for provider-neutral recovery: $($p.reason)"
        }
        Check 'RD-218' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD218' -NoEnvelope;$glm=Set-GlmNoVerdictReviewHold $f
            $p=Get-DispatcherReviewTimeoutRetryProof -State $glm.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $glm.invocation
            Assert-True ($p.eligible -and $p.retryProvider -eq 'claude' -and $p.retryProfile -eq 'REASONING') "an exact terminal GLM no-output result was not eligible for one Claude review fallback: $($p.reason)"
            $r=Resume-DispatcherReviewTimeoutBlock -State $glm.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $glm.invocation;$s=Get-DispatcherState
            Assert-True ($r.resumed -and $s.authorizedReviewRoute.provider -eq 'claude' -and $s.reviewTimeoutRetryHistory.Count -eq 2 -and $s.providerHistory.Count -eq 3) 'GLM no-output recovery did not preserve evidence and pin exactly one Claude review fallback'
        }
        Check 'RD-219' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD219' -NoEnvelope;$glm=Set-GlmNoVerdictReviewHold $f
            Resume-DispatcherReviewTimeoutBlock -State $glm.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $glm.invocation|Out-Null
            $p=Get-DispatcherReviewTimeoutRetryProof -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $glm.invocation
            Assert-True (-not $p.eligible -and $p.reason -match 'budget exhausted') 'a third review fallback remained authorized after GLM and Claude were exhausted'
        }
        Check 'RD-220' {
            $f=New-ReviewTerminalJsonHoldFixture 'RD220' -NoEnvelope;$glm=Set-GlmNoVerdictReviewHold $f;$glm.state.providerHistory[-1].usage.outputTokens=1
            $p=Get-DispatcherReviewTimeoutRetryProof -State $glm.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.state.runId -InvocationId $glm.invocation
            Assert-True (-not $p.eligible -and $p.reason -match 'reasoning-only no-output') 'a GLM attempt with nonzero output tokens remained eligible for Claude fallback'
        }
        Check 'RD-221' {
            $ids=@(Get-AcceptanceCriteriaIds 'AC1: first criterion; AC2: second criterion; AC3: third criterion')
            Assert-True (($ids -join '|') -eq 'AC1|AC2|AC3') "semicolon-delimited acceptance criteria were not frozen exactly: $($ids -join '|')"
        }

        Check 'RD-150' {
            $reader=Join-Path $V2 'review-reader.mjs'
            $strict=New-Object Text.UTF8Encoding($false,$true)
            $source=[IO.File]::ReadAllText($reader,$strict).Replace("`r`n","`n").Replace("`r","`n")
            $lf=Join-Path $Root 'review-reader-lf.mjs';$crlf=Join-Path $Root 'review-reader-crlf.mjs';$cr=Join-Path $Root 'review-reader-cr.mjs';$bom=Join-Path $Root 'review-reader-bom.mjs'
            [IO.File]::WriteAllText($lf,$source,(New-Object Text.UTF8Encoding($false)))
            [IO.File]::WriteAllText($crlf,($source.Replace("`n","`r`n")),(New-Object Text.UTF8Encoding($false)))
            [IO.File]::WriteAllText($cr,($source.Replace("`n","`r")),(New-Object Text.UTF8Encoding($false)))
            [IO.File]::WriteAllText($bom,$source,(New-Object Text.UTF8Encoding($true)))
            $lfHash=New-TextCapabilityHash $lf;$crlfHash=New-TextCapabilityHash $crlf;$crHash=New-TextCapabilityHash $cr;$bomHash=New-TextCapabilityHash $bom
            Assert-True ($lfHash -eq $crlfHash -and $lfHash -eq $crHash -and $lfHash -eq $bomHash -and $lfHash -eq 'sha256:caef0352478a7e9461852fef7520762c04d853c7b4cc92e78ec945093a5b8026') 'LF, CRLF, lone-CR, and BOM reader source did not share the expected canonical capability hash'
        }

        Check 'RD-151' {
            $reader=Join-Path $V2 'review-reader.mjs';$strict=New-Object Text.UTF8Encoding($false,$true)
            $source=[IO.File]::ReadAllText($reader,$strict).Replace("`r`n","`n").Replace("`r","`n")
            $changed=Join-Path $Root 'review-reader-changed.mjs';[IO.File]::WriteAllText($changed,($source+"`n// changed`n"),(New-Object Text.UTF8Encoding($false)))
            $invalid=Join-Path $Root 'review-reader-invalid.mjs';[IO.File]::WriteAllBytes($invalid,[byte[]](0x66,0x6f,0x80,0x6f))
            $invalidRejected=$false;try{New-TextCapabilityHash $invalid|Out-Null}catch{$invalidRejected=$true}
            Assert-True ((New-TextCapabilityHash $changed) -ne (New-TextCapabilityHash $reader) -and $invalidRejected) 'text changes were not distinguished or invalid UTF-8 did not fail closed'
        }

        Check 'RD-152' {
            $lf=Join-Path $Root 'artifact-lf.patch';$crlf=Join-Path $Root 'artifact-crlf.patch'
            [IO.File]::WriteAllText($lf,"line one`nline two`n",(New-Object Text.UTF8Encoding($false)))
            [IO.File]::WriteAllText($crlf,"line one`r`nline two`r`n",(New-Object Text.UTF8Encoding($false)))
            Assert-True ((New-FileHash $lf) -ne (New-FileHash $crlf)) 'exact frozen artifact hashing stopped being byte-sensitive'
        }

        Check 'RD-153' {
            $f=New-ReviewInfrastructureFixture 'RD153' $true
            Assert-True ([string]$f.record.readerHash -eq 'sha256:caef0352478a7e9461852fef7520762c04d853c7b4cc92e78ec945093a5b8026') 'CRLF checkout did not bind the canonical review-reader capability hash'
        }

        Check 'RD-154' {
            $reader=Join-Path $V2 'review-reader.mjs';$strict=New-Object Text.UTF8Encoding($false,$true)
            $source=[IO.File]::ReadAllText($reader,$strict).Replace("`r`n","`n").Replace("`r","`n")
            $crlf=Join-Path $Root 'legacy-reader-crlf.mjs';$lookalike=Join-Path $Root 'legacy-reader-lookalike.mjs'
            [IO.File]::WriteAllText($crlf,$source.Replace("`n","`r`n"),(New-Object Text.UTF8Encoding($false)))
            [IO.File]::WriteAllText($lookalike,($source+"`n// lookalike`n"),(New-Object Text.UTF8Encoding($false)))
            $record=[ordered]@{snapshotHash='sha256:a028b8143eb259057a0b973ad7f753e2796abc4250fc2b2a8c17015fc6bf1e03';readerHash=(New-TextCapabilityHash $crlf)}
            $tampered=[ordered]@{snapshotHash=$record.snapshotHash;readerHash=(New-TextCapabilityHash $lookalike)}
            Assert-True ((Test-DispatcherLegacyReviewCapability $record) -and (Test-DispatcherReviewReaderCapabilityHash $record.readerHash) -and -not(Test-DispatcherLegacyReviewCapability $tampered) -and -not(Test-DispatcherReviewReaderCapabilityHash $tampered.readerHash)) 'exact legacy CRLF reader was rejected or tampered lookalike reader was accepted for recovery'
        }

        Check 'RD-155' {
            $f=New-ReviewInfrastructureFixture 'RD155' $true;$f.state.candidateTree='0'*40
            $statePath=Get-DispatcherCurrentPath;$before=New-FileHash $statePath
            $diagnostic=@(& {Resume-DispatcherReviewInfrastructureBlock -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract|Out-Null} 6>&1) -join "`n"
            $after=New-FileHash $statePath
            Assert-True ($diagnostic -match 'review infrastructure recovery not eligible: .+' -and $before -eq $after) 'ineligible review recovery was not diagnosed or mutated durable state'
        }

        # ---- self-reconciling autopilot fault-injection harness (RD-115..RD-130) ----
        # The fake agent replaces Invoke-RealAgent only inside the restart
        # driver's dynamic scope: it performs the exact durable steps of a GLM
        # implementer (immutable prompt, pre-launch snapshot callback, in-scope
        # uncommitted change, JSONL control stream) and classifies through the
        # SAME shared core the live provider path uses.  StopAt/Scenario are
        # test-only knobs on this harness function; no production code path
        # reads them.
        $script:AutopilotAgentScenario='SUCCESS'
        function Invoke-AutopilotFakeAgent {
            param($Provider,$Role,$TaskVersion,$Profile,$Workspace,$StructuredPrompt,$ArtifactDir,$TimeoutSec=900,$Attempt=1,$ContinuationCheckpoint='',$InvocationId='',$BeforeLaunch=$null,$StopAt='')
            New-Item -ItemType Directory -Force -Path $ArtifactDir|Out-Null
            $invocationId=$(if($InvocationId){$InvocationId}else{New-AttemptId})
            $stamp='{0}-{1:000}-{2}-{3}' -f $Role,$Attempt,$Provider,$invocationId.Substring(4,8)
            $promptFile=Join-Path $ArtifactDir "$stamp.prompt.txt"
            [IO.File]::WriteAllText($promptFile,(Protect-ArtifactText $StructuredPrompt),(New-Utf8NoBom))
            $stdoutLog=Join-Path $ArtifactDir "$stamp.stdout.log";$stderrLog=Join-Path $ArtifactDir "$stamp.stderr.log"
            $route=[ordered]@{ok=$true;provider=$Provider;model=$(if($Provider -eq 'glm'){Get-GlmModelId}else{'fake-reviewer-model'});reasoningIntent='low';capabilityVersion='fake-capability';maxOutputTokens=16000}
            if($BeforeLaunch){& $BeforeLaunch ([ordered]@{invocationId=$invocationId;promptArtifact=[IO.Path]::GetFullPath($promptFile);promptHash=(New-FileHash $promptFile);provider=$Provider;model=[string]$route.model;reasoningEffort=[string]$route.reasoningIntent;profile=$Profile;attempt=$Attempt;requestManifestPath='';requestManifestHash=''})}
            if($StopAt -eq 'PRE_ONLY'){return [ordered]@{__autopilotStoppedAt='PRE_ONLY'}}
            $scenario=$script:AutopilotAgentScenario
            $raw=''
            if($Role -eq 'implementer' -and $scenario -eq 'PROVIDER_ERROR'){
                # A canonical provider transport failure: the error event alone
                # would leave no step_finish, which GLM classification treats as
                # INCOMPLETE_PROVIDER_RESULT regardless of the error - so a
                # trailing step_finish is required to prove the stream itself
                # ended (matching the reviewer-role error fixture below).
                $lines=@((ConvertTo-Json ([ordered]@{type='error';error=[ordered]@{status=503;message='provider unavailable for fixture implementer'}}) -Compress -Depth 6),(ConvertTo-Json ([ordered]@{type='step_finish';part=[ordered]@{type='step-finish';reason='stop'}}) -Compress -Depth 6))
                $raw=($lines -join "`n")+"`n"
            }elseif($Role -eq 'implementer'){
                if($scenario -eq 'CORRECT_POLICY_HOLD'){
                    Get-ChildItem -LiteralPath $Workspace -Recurse -File -Filter '*.isolation.spec.ts'|Remove-Item -Force
                }
                if($scenario -in @('SUCCESS','PARTIAL_ENVELOPE','COMMIT')){Write-Utf8 (Join-Path $Workspace 'work\impl.ts') "export const implemented = true;`n"}
                if($scenario -eq 'OUT_OF_SCOPE'){Write-Utf8 (Join-Path $Workspace 'outside.ts') "export const outside = true;`n"}
                if($scenario -eq 'COMMIT'){Write-Utf8 (Join-Path $Workspace 'work\base.txt') "modified by sneaky provider`n";& git -C $Workspace add -A;& git -C $Workspace -c user.name=fake -c user.email=fake@local commit -m sneaky --quiet}
                if($scenario -eq 'PARTIAL_ENVELOPE'){
                    $envelope=[ordered]@{resultClass='SUCCESS';taskVersion=$TaskVersion;taskId='fixture';summary='synthetic partial GLM envelope';acceptanceCoverage=@{};filesChanged=@{};verification=@{};caveats=@()}
                }else{
                    $envelope=[ordered]@{schemaVersion='orcivo.orchestration.v2.agent-result/1';role='IMPLEMENTER';resultClass='SUCCESS';summary='synthetic autopilot provider result';decisions=@('synthetic decision recorded');tests=@([ordered]@{command='fixture suite';status='PASS';evidence='synthetic'});nextAction='none';importantArtifacts=@()}
                }
                # UNSTRUCTURED_COMPLETE models the real PB1-P01 incident: every
                # step_start is paired with a step_finish (the stream is NOT
                # incomplete), but the final text carries no JSON envelope at
                # all, so structured parsing legitimately returns null and the
                # workspace is untouched (providerClass=NONE, resultClass=
                # AGENT_FAILURE, clean workspace) - distinct from INCOMPLETE
                # (missing step_finish) below.
                $prose=$(if($scenario -eq 'UNSTRUCTURED_COMPLETE'){"Let me verify .env.test is gitignored and create it locally for running checks:"}else{"All checks pass. Implementation complete (synthetic).`n`n``````json`n$(ConvertTo-Json $envelope -Depth 10)`n``````"})
                $textEvent=[ordered]@{type='text';part=[ordered]@{type='text';text=$prose}}
                $lines=@((ConvertTo-Json ([ordered]@{type='step_start';part=[ordered]@{type='step-start'}}) -Compress -Depth 6),(ConvertTo-Json $textEvent -Compress -Depth 8))
                if($scenario -ne 'INCOMPLETE'){$lines+=(ConvertTo-Json ([ordered]@{type='step_finish';part=[ordered]@{type='step-finish';reason='stop';tokens=[ordered]@{total=100;input=20;output=10;reasoning=5;cache=[ordered]@{write=0;read=70}};cost=0}}) -Compress -Depth 8)}
                $raw=($lines -join "`n")+"`n"
            }else{
                # Reviewer failure: the JSONL API-backed providers (deepseek,
                # glm) fail closed on an exit-zero stream without a terminal
                # event, which would turn this into a review-hold instead of
                # the provider-wait failover these tests pin.  The terminal
                # event keeps the failure a canonical PROVIDER_UNAVAILABLE.
                $lines=@((ConvertTo-Json ([ordered]@{type='error';error=[ordered]@{status=503;message='provider unavailable for fixture review'}}) -Compress -Depth 6))
                if($Provider -eq 'deepseek'){$lines+=(ConvertTo-Json ([ordered]@{type='turn.completed'}) -Compress -Depth 4)}
                if($Provider -eq 'glm'){$lines+=(ConvertTo-Json ([ordered]@{type='step_finish';part=[ordered]@{type='step-finish';reason='stop'}}) -Compress -Depth 6)}
                $raw=($lines -join "`n")+"`n"
            }
            [IO.File]::WriteAllText($stdoutLog,$raw,(New-Utf8NoBom));[IO.File]::WriteAllText($stderrLog,'',(New-Utf8NoBom))
            if($StopAt -eq 'PROVIDER_DONE_NO_RECEIPT'){return [ordered]@{__autopilotStoppedAt='PROVIDER_DONE_NO_RECEIPT'}}
            return (ConvertTo-RealAgentInvocationResult -Provider $Provider -Role $Role -InvocationId $invocationId -Attempt $Attempt -Profile $Profile -Route $route -ExitCode 0 -DurationSec 0.1 -StdoutText $raw -PromptFile $promptFile -StdoutLog $stdoutLog -StderrLog $stderrLog -ContinuationCheckpoint $ContinuationCheckpoint)
        }
        $script:AutopilotAgentWrapper={
            param($Provider,$Role,$TaskVersion,$Profile,$Workspace,$StructuredPrompt,$ArtifactDir,$TimeoutSec=900,$Attempt=1,$ContinuationCheckpoint='',$InvocationId='',$BeforeLaunch=$null)
            $script:AutopilotAgentCalls+=@([ordered]@{role=[string]$Role;provider=[string]$Provider;attempt=[int]$Attempt})
            Invoke-AutopilotFakeAgent -Provider $Provider -Role $Role -TaskVersion $TaskVersion -Profile $Profile -Workspace $Workspace -StructuredPrompt $StructuredPrompt -ArtifactDir $ArtifactDir -TimeoutSec $TimeoutSec -Attempt $Attempt -ContinuationCheckpoint $ContinuationCheckpoint -InvocationId $InvocationId -BeforeLaunch $BeforeLaunch
        }
        $script:AutopilotAgentCalls=@()

        function New-AutopilotFixture {
            param([string]$Id)
            # The launch-boundary route sync resolves the provider runtime,
            # so every autopilot fixture must be self-sufficient: seed the
            # fixture runtime from the authority repo when absent.
            $providerRuntimePath=Join-Path (Get-V2Dir) 'provider-runtime.v1.json'
            if(-not(Test-Path -LiteralPath $providerRuntimePath)){Copy-Item (Join-Path $Repo '.orchestration\v2\provider-runtime.v1.json') $providerRuntimePath}
            $task=Task ("AP-"+$Id) @() 'C' 'level-c-autopilot'
            $sourcePath=Join-Path $Fixture ("autopilot-"+$Id+".tasks.json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
            $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0]
            $contract=New-DispatcherContract -Task $task -TaskSource $source
            New-OwnerGateApproval -TaskId $task.taskId -TaskVersionId $contract.taskVersionId -GateId $task.ownerGate -ApprovalScope 'fixture-local autopilot reconciliation only' -ApprovedBy owner -ApprovalSource 'dispatcher autopilot regression'|Out-Null
            $base=(& git -C $Fixture rev-parse HEAD).Trim()
            $runId='run-ap-'+(New-StringHash ($Id+'|'+[guid]::NewGuid().ToString('N'))).Substring(7,16)
            $ws=New-DispatcherWorkspace -RunId $runId -WorkspaceId $runId -BaseSha $base -SourceRepo $Fixture
            $baseCount=(& git -C $ws.workspace rev-list --count HEAD).Trim()
            Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null
            Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null
            Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId -AttemptId (New-AttemptId)|Out-Null
            Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null
            $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';runId=$runId;taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;status='RUNNING';stage='IMPLEMENT';reason='';workspace=$ws.workspace;branch=$ws.branch;baseSha=$base;candidateBase=$base;provider='glm';profile='FAST';model=(Get-GlmModelId);classification=$null;attempt=0;cycle=0;rollovers=0;failovers=0;findings=@();decisions=@();importantArtifacts=@();providerHistory=@();unavailableProviders=@();workspaceInvocationSnapshots=@();implementationComplete=$false;implementationCommit='';recoveredCandidateCommit='';candidateHead='';candidateTree='';diffHash='';verification=$null;reviewVerdict='';logicalProjectId='fixture';memoryEnabled=$false;memoryAvailable=$false;memoryRetrievedCount=0;memoryInjectedChars=0;memoryFallbackUsed=$false;memoryLatencyMs=0;memoryWriteCount=0;integration=$null}
            Write-DispatcherState $state|Out-Null
            return @{state=$state;task=$task;source=$source;contract=$contract;workspace=$ws.workspace;branch=$ws.branch;runId=$runId;base=$base;baseCount=$baseCount}
        }

        function Invoke-AutopilotDriveToBoundary {
            param($f,[string]$StopAt,[string]$Scenario='SUCCESS')
            $state=Get-DispatcherState
            $state.attempt=[int]$state.attempt+1;Write-DispatcherState $state|Out-Null
            $state=Get-DispatcherState
            $role=$(if([int]$state.cycle -gt 0){'CORRECTOR'}else{'IMPLEMENTER'})
            $prompt=New-ImplementerPrompt -Task $f.task -Contract $f.contract -Findings @($state.findings) -Role $role.ToLowerInvariant() -Continuation $null -MemoryContext ''
            $preLaunch={param($launch) New-DispatcherWorkspaceInvocationSnapshot -State $state -Task $f.task -InvocationId ([string]$launch.invocationId) -PromptArtifact ([string]$launch.promptArtifact) -PromptHash ([string]$launch.promptHash) -Provider ([string]$launch.provider) -Model ([string]$launch.model) -ReasoningEffort ([string]$launch.reasoningEffort) -Attempt ([int]$launch.attempt)|Out-Null}
            $script:AutopilotAgentScenario=$Scenario
            try{
                return (Invoke-AutopilotFakeAgent -Provider $state.provider -Role 'implementer' -TaskVersion $state.taskVersionId -Profile $state.profile -Workspace $state.workspace -StructuredPrompt $prompt -ArtifactDir (Join-Path (Get-V2Dir) "runs\$($state.runId)\logs") -Attempt ([int]$state.attempt) -BeforeLaunch $preLaunch -StopAt $StopAt)
            }finally{$script:AutopilotAgentScenario='SUCCESS'}
        }

        function Invoke-AutopilotRestart {
            param($f)
            Remove-Item -LiteralPath (Join-Path (Get-V2Dir) (Get-V2Config).pilot.stopFile) -Force -ErrorAction SilentlyContinue
            $script:AutopilotAgentCalls=@()
            Set-Item -Path function:Invoke-RealAgent -Value $script:AutopilotAgentWrapper
            try{ return (Invoke-RealDispatcherTask -Task $f.task -TaskSource $f.source) }
            finally{ ${function:Invoke-RealAgent}=$script:AutopilotRealAgent }
        }
        $script:AutopilotRealAgent=${function:Invoke-RealAgent}

        function Assert-AutopilotRecoveredRun {
            param($f,$r,[string]$ExpectedSource,[int]$ExpectedNewImplementerInvocations,[int]$ExpectedImplementerHistory=1)
            Assert-True ("$($r.status)" -eq 'WAITING_PROVIDER' -and "$($r.stage)" -eq 'REVIEW') "restart did not progress to the opposite-provider review dispatch: $($r.status)/$($r.stage) reason=$($r.reason)"
            $state=Get-DispatcherState
            Assert-True ([string]$state.runId -eq $f.runId -and [string]$state.taskVersionId -eq [string]$f.contract.taskVersionId) 'restart changed runId or taskVersionId'
            $impl=@($state.providerHistory|Where-Object{$_ -and [string]$_.role -eq 'IMPLEMENTER'})
            Assert-True ($impl.Count -eq $ExpectedImplementerHistory) "expected $ExpectedImplementerHistory implementer history entries, got $($impl.Count)"
            $first=$impl[0]
            Assert-True (@($state.workspaceInvocationResultSnapshots|Where-Object{[string]$_.invocationId -eq [string]$first.invocationId}).Count -le 1) 'duplicate result snapshot for the implementer invocation'
            Assert-True ([bool]$state.implementationComplete -and [string]$state.implementationInvocationId -eq [string]$impl[-1].invocationId) 'implementation completion did not bind the implementer invocation'
            $recon=@($state.startupReconciliationHistory|Where-Object{$_})
            if($ExpectedSource -eq 'NONE'){
                Assert-True ($recon.Count -eq 0) "an already-finalized lifecycle still wrote reconciliation history (entries=$($recon.Count))"
            }else{
                Assert-True ($recon.Count -eq 1 -and [string]$recon[0].source -eq $ExpectedSource) "reconciliation was not recorded exactly once from $ExpectedSource (got $(@($recon)|ForEach-Object{[string]$_.source}) entries=$($recon.Count))"
            }
            $commitCount=(& git -C $f.workspace rev-list --count HEAD).Trim()
            Assert-True ($commitCount -eq ([string]([int]$f.baseCount+1))) "expected exactly one candidate commit over the base, got $commitCount"
            $newImpl=@($script:AutopilotAgentCalls|Where-Object{[string]$_.role -eq 'implementer'})
            Assert-True ($newImpl.Count -eq $ExpectedNewImplementerInvocations) "restart launched $($newImpl.Count) new implementer invocations, expected $ExpectedNewImplementerInvocations"
        }

        # Durable same-lineage provider/model migration fixture (RD-129): the
        # lineage starts with a FINALIZED historical invocation attempt bound
        # to the retired zai-coding-plan/glm-5.3 route - built through the
        # REAL snapshot/synthetic-result/finalizer machinery so the retired
        # model id is valid immutable historical evidence - and the durable
        # current route is left pointing at the retired model exactly as a
        # pre-migration session would have persisted it.  The historical
        # attempt is provably incomplete (no terminal provider output, no
        # workspace change), so the lineage legitimately relaunches.
        function New-ProviderMigrationLineageFixture {
            param([string]$Id)
            $f=New-AutopilotFixture $Id
            $state=Get-DispatcherState
            $state.model='zai-coding-plan/glm-5.3';$state.attempt=[int]$state.attempt+1;Write-DispatcherState $state|Out-Null
            $state=Get-DispatcherState
            $logs=Join-Path (Get-V2Dir) "runs\$($f.runId)\logs";New-Item -ItemType Directory -Force -Path $logs|Out-Null
            $hist='att-'+[guid]::NewGuid().ToString('N');$stamp=('implementer-001-glm-{0}' -f $hist.Substring(4,8))
            $promptPath=Join-Path $logs "$stamp.prompt.txt";$stdoutPath=Join-Path $logs "$stamp.stdout.log";$stderrPath=Join-Path $logs "$stamp.stderr.log"
            Write-Utf8 $promptPath 'historical pre-migration prompt';Write-Utf8 $stdoutPath '';Write-Utf8 $stderrPath ''
            New-DispatcherWorkspaceInvocationSnapshot -State $state -Task $f.task -InvocationId $hist -PromptArtifact $promptPath -PromptHash (New-FileHash $promptPath) -Provider 'glm' -Model 'zai-coding-plan/glm-5.3' -ReasoningEffort 'low' -Attempt 1|Out-Null
            $histAr=New-RealAgentSyntheticIncompleteResult -Provider 'glm' -Model 'zai-coding-plan/glm-5.3' -Profile 'FAST' -ReasoningEffort 'low' -InvocationId $hist -Attempt 1 -Role 'IMPLEMENTER' -PromptArtifact $promptPath -PromptHash (New-FileHash $promptPath) -StdoutArtifact $stdoutPath -StderrArtifact $stderrPath -ContinuationCheckpoint ''
            $finalized=Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $f.task -AgentResult $histAr -Role 'IMPLEMENTER'
            return @{f=$f;hist=$hist;disposition=[string]$finalized.disposition}
        }

        Check 'RD-115' {
            $unit=Join-Path $Root 'rd115-unit'
            & git init -b main --quiet $unit
            New-Item -ItemType Directory -Force -Path (Join-Path $unit 'work')|Out-Null
            Write-Utf8 (Join-Path $unit 'work\base.txt') "base`n"
            & git -C $unit add .
            & git -C $unit -c user.name=rd -c user.email=rd@local commit -m base --quiet
            $base=(& git -C $unit rev-parse HEAD).Trim()
            $task=Task 'RD115-FRESH-BASELINE'
            $prompt=Join-Path $Root 'rd115.prompt.txt'
            Write-Utf8 $prompt 'fresh clean implementation'
            $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';runId='run-rd115-unit';taskId=$task.taskId;taskVersionId=('f'*64);task=$task;status='RUNNING';stage='IMPLEMENT';reason='';workspace=$unit;branch='main';baseSha=$base;provider='glm';profile='FAST';model=(Get-GlmModelId);attempt=1;cycle=0;implementationComplete=$false;implementationCommit='';recoveredCandidateCommit='';candidateHead='';candidateTree='';diffHash='';providerHistory=@();workspaceInvocationSnapshots=@();workspaceInvocationResultSnapshots=@()}
            $snapshot=New-DispatcherWorkspaceInvocationSnapshot -State $state -Task $task -InvocationId ('att-'+[guid]::NewGuid().ToString('N')) -PromptArtifact $prompt -PromptHash (New-FileHash $prompt) -Provider glm -Model (Get-GlmModelId) -ReasoningEffort low -Attempt 1
            Assert-True ([string]$snapshot.stateBinding.workspaceHead -eq $base) 'fresh clean baseline did not bind workspaceHead to baseSha'
            Assert-True (@($snapshot.paths).Count -eq 0) 'fresh clean baseline unexpectedly recorded changed paths'
            Assert-True ([string]$snapshot.partialDiffHash -eq (New-StringHash '')) 'fresh clean baseline diff hash is not canonical empty hash'
            Assert-True ([string]$snapshot.partialFilesHash -eq (New-StringHash '')) 'fresh clean baseline files hash is not canonical empty hash'
            $blockedState=ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $state)
            $blockedState.workspaceInvocationSnapshots=@()
            $blockedState.providerHistory=@([ordered]@{invocationId='att-11111111111111111111111111111111';provider='glm'})
            $blocked=$false
            try{ New-DispatcherWorkspaceInvocationSnapshot -State $blockedState -Task $task -InvocationId ('att-'+[guid]::NewGuid().ToString('N')) -PromptArtifact $prompt -PromptHash (New-FileHash $prompt) -Provider glm -Model (Get-GlmModelId) -ReasoningEffort low -Attempt 1|Out-Null }catch{ $blocked=$_.Exception.Message -match 'workspace has no preserved partial changes' }
            Assert-True $blocked 'clean baseline was incorrectly accepted after provider history existed'
            Remove-Item -LiteralPath (Join-Path (Get-V2Dir) 'dispatcher\current.json') -Force -ErrorAction SilentlyContinue

            $f=New-AutopilotFixture 'RD115'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'SUCCESS'
                $finalized=Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'
                $state=Get-DispatcherState
                Assert-True ("$($finalized.disposition)" -eq 'SUCCESS') "lifecycle finalizer disposition was $($finalized.disposition)"
                $post=Get-DispatcherWorkspaceInvocationResultSnapshot -State $state -InvocationId ([string]$ar.invocationId)
                Assert-True ($post -and [string]$post.workspaceHead -eq $f.base) 'result snapshot HEAD did not come from the pre-invocation state binding on a fresh baseline'
                Assert-True (@($state.providerHistory).Count -eq 1 -and [string]$state.providerHistory[0].resultClass -eq 'SUCCESS') 'provider history was not appended exactly once with SUCCESS'
                Assert-True ([bool]$state.implementationComplete -and [string]$state.implementationInvocationId -eq [string]$ar.invocationId) 'implementation completion did not bind the invocation id'
                Assert-True ((Test-Path -LiteralPath ([string]$ar.resultReceiptPath)) -and [string]$ar.resultReceiptHash -match '^sha256:[0-9a-f]{64}$') 'durable agent result receipt was not persisted'
                $again=Complete-DispatcherAgentInvocation -State $state -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'
                $state2=Get-DispatcherState
                Assert-True ("$($again.disposition)" -eq 'SUCCESS' -and @($state2.providerHistory).Count -eq 1 -and @($state2.workspaceInvocationResultSnapshots).Count -eq 1) 're-finalizing the same invocation duplicated durable evidence'
                $candidate=Complete-DispatcherCandidateCommit -State $state2
                $commitCount=(& git -C $f.workspace rev-list --count HEAD).Trim()
                Assert-True ($candidate.ok -and $candidate.created -and $commitCount -eq ([string]([int]$f.baseCount+1))) "candidate commit was not created exactly once (count=$commitCount)"
                $repeat=Complete-DispatcherCandidateCommit -State $state2
                $commitCount2=(& git -C $f.workspace rev-list --count HEAD).Trim()
                Assert-True ($repeat.ok -and -not $repeat.created -and $repeat.reused -and $commitCount2 -eq $commitCount) 'candidate commit was duplicated on re-finalization'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-116' {
            $f=New-AutopilotFixture 'RD116a'
            try{
                Invoke-AutopilotDriveToBoundary $f 'PRE_ONLY' 'SUCCESS'|Out-Null
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'LEGACY_ARTIFACT_STRICT' 1 2
                $state=Get-DispatcherState
                Assert-True ([string]$state.providerHistory[0].providerClass -eq 'INCOMPLETE_PROVIDER_RESULT' -and [int]$state.attempt -eq 2) 'provider-never-produced-output boundary did not fall into the retry machinery'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
            $f=New-AutopilotFixture 'RD116b'
            try{
                Invoke-AutopilotDriveToBoundary $f 'PROVIDER_DONE_NO_RECEIPT' 'PARTIAL_ENVELOPE'|Out-Null
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'LEGACY_ARTIFACT_STRICT' 0 1
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-117' {
            $f=New-AutopilotFixture 'RD117'
            try{
                Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'SUCCESS'|Out-Null
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'AGENT_RESULT_RECEIPT' 0 1
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-118' {
            $f=New-AutopilotFixture 'RD118'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'SUCCESS'
                $script:DispatcherFinalizerFaultAfterResultSnapshot=$true
                try{ try{ Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'|Out-Null }catch{} }finally{ $script:DispatcherFinalizerFaultAfterResultSnapshot=$null }
                $mid=Get-DispatcherState
                Assert-True (@($mid.workspaceInvocationResultSnapshots).Count -eq 1 -and @($mid.providerHistory).Count -eq 0) 'fault seam did not stop between result snapshot and provider history'
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'AGENT_RESULT_RECEIPT' 0 1
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-119' {
            $f=New-AutopilotFixture 'RD119'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'SUCCESS'
                $script:DispatcherFinalizerFaultAfterProviderHistory=$true
                try{ try{ Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'|Out-Null }catch{} }finally{ $script:DispatcherFinalizerFaultAfterProviderHistory=$null }
                $mid=Get-DispatcherState
                Assert-True (@($mid.providerHistory).Count -eq 1 -and -not [bool]$mid.implementationComplete) 'fault seam did not stop between provider history and implementation completion'
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'AGENT_RESULT_RECEIPT' 0 1
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-120' {
            $f=New-AutopilotFixture 'RD120'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'SUCCESS'
                Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'|Out-Null
                $mid=Get-DispatcherState
                Assert-True ([bool]$mid.implementationComplete -and -not [string]$mid.implementationCommit) 'boundary did not stop after implementation completion and before the candidate commit'
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'NONE' 0 1
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-121' {
            $f=New-AutopilotFixture 'RD121'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'SUCCESS'
                Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'|Out-Null
                $state=Get-DispatcherState
                $candidate=Complete-DispatcherCandidateCommit -State $state
                Assert-True ($candidate.ok -and $candidate.created) 'pre-restart candidate commit failed'
                $state.implementationCommit=[string]$candidate.head;Write-DispatcherState $state|Out-Null
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'NONE' 0 1
                $head=Get-GitHeadV2 $f.workspace
                Assert-True ($head -eq [string]$candidate.head) 'restart advanced past the preserved candidate commit instead of reusing it'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-122' {
            $f=New-AutopilotFixture 'RD122'
            try{
                Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'COMMIT'|Out-Null
                $failed=$false
                try{ Invoke-AutopilotRestart $f|Out-Null }catch{ $failed=$_.Exception.Message -match 'workspace HEAD drift' }
                $state=Get-DispatcherState
                Assert-True ($failed -and @($state.providerHistory).Count -eq 0 -and "$($state.status)" -eq 'RUNNING') 'provider git commit was not rejected fail-closed'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-123' {
            $f=New-AutopilotFixture 'RD123'
            try{
                Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'OUT_OF_SCOPE'|Out-Null
                $r=Invoke-AutopilotRestart $f
                $state=Get-DispatcherState;$ledger=Get-LedgerState ([string]$state.taskVersionId)
                $posts=@($state.workspaceInvocationResultSnapshots|Where-Object{$_})
                $budget=[int](Get-V2Config).correctionLoop.maxCycles
                Assert-True ([string]$r.status -eq 'BLOCKED' -and [string]$ledger.state -eq 'FAILED' -and @($state.providerHistory).Count -eq (1+$budget) -and $posts.Count -eq (1+$budget) -and @($posts|Where-Object{[bool]$_.policyCompliant}).Count -eq 0 -and -not [bool]$state.implementationComplete -and -not [string]$state.candidateHead -and @($script:AutopilotAgentCalls).Count -eq $budget) 'out-of-scope provider change was not rejected through a bounded fail-closed policy hold'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-124' {
            $f=New-AutopilotFixture 'RD124'
            try{
                Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'SUCCESS'|Out-Null
                $state=Get-DispatcherState
                $state.workspaceInvocationSnapshots[0].promptHash='sha256:'+('0'*64)
                Write-DispatcherState $state|Out-Null
                $failed=$false
                try{ Invoke-AutopilotRestart $f|Out-Null }catch{ $failed=$_.Exception.Message -match 'integrity' }
                Assert-True ($failed) 'tampered pre-invocation snapshot was accepted'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-125' {
            $f=New-AutopilotFixture 'RD125'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'SUCCESS'
                Add-Content -LiteralPath ([string]$ar.stdoutArtifact) -Value '{"type":"tampered"}' -Encoding utf8
                $failed=$false
                try{ Invoke-AutopilotRestart $f|Out-Null }catch{ $failed=$_.Exception.Message -match 'unrecoverable or ambiguous' }
                $state=Get-DispatcherState
                Assert-True ($failed -and @($state.providerHistory).Count -eq 0 -and "$($state.status)" -eq 'RUNNING') 'tampered stdout with an intact receipt was accepted'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-126' {
            $f=New-AutopilotFixture 'RD126'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'SUCCESS'
                $conflict=[ordered]@{}+$ar
                $conflict.exitCode=17
                $conflict.resultReceiptPath=[string]$ar.resultReceiptPath
                $writeConflict=$false
                try{ Write-RealAgentResultReceipt -AgentResult $conflict|Out-Null }catch{ $writeConflict=$_.Exception.Message -match 'conflicting duplicate result receipt' }
                Assert-True ($writeConflict) 'a conflicting duplicate receipt write was accepted'
                $receipt=Read-V2Json ([string]$ar.resultReceiptPath)
                $receipt.attempt=2
                $signed=[ordered]@{};foreach($k in $receipt.Keys){if($k -ne 'receiptHash'){$signed[$k]=$receipt[$k]}}
                $receipt.receiptHash=New-ContentHash $signed
                Write-V2JsonCanonical ([string]$ar.resultReceiptPath) $receipt
                $failed=$false
                try{ Invoke-AutopilotRestart $f|Out-Null }catch{ $failed=$_.Exception.Message -match 'receipt binding mismatch' }
                Assert-True ($failed) 'a re-hashed receipt bound to a different invocation identity was accepted'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-127' {
            $f=New-AutopilotFixture 'RD127'
            try{
                Invoke-AutopilotDriveToBoundary $f 'PROVIDER_DONE_NO_RECEIPT' 'INCOMPLETE'|Out-Null
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'LEGACY_ARTIFACT_STRICT' 1 2
                $state=Get-DispatcherState
                Assert-True ([string]$state.providerHistory[0].resultClass -eq 'AGENT_FAILURE' -and [string]$state.providerHistory[0].providerClass -eq 'INCOMPLETE_PROVIDER_RESULT') 'nonterminal provider output was classified as anything but a provably incomplete failure'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-128' {
            $f=New-AutopilotFixture 'RD128'
            try{
                $state=Get-DispatcherState
                $state.status='WAITING_HUMAN';$state.reason='bounded correction budget exhausted';Write-DispatcherState $state|Out-Null
                $recon=Invoke-DispatcherStartupReconciliation -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -Contract $f.contract
                Assert-True ("$($recon.status)" -eq 'NO_ACTION') 'startup reconciliation auto-resumed a WAITING_HUMAN owner state'
                $state=Get-DispatcherState
                $state.status='WAITING_PROVIDER';Write-DispatcherState $state|Out-Null
                $recon2=Invoke-DispatcherStartupReconciliation -State (Get-DispatcherState) -Task $f.task -TaskSource $f.source -Contract $f.contract
                Assert-True ("$($recon2.status)" -eq 'NO_ACTION') 'startup reconciliation auto-resumed a WAITING_PROVIDER state outside the dispatch loop'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-129' {
            # Provider/model migration lineage (zai-coding-plan/glm-5.3 ->
            # nvidia/z-ai/glm-5.3).  The historical attempt is immutable
            # evidence bound to the retired model; the REAL launch boundary
            # must sync the durable current route to the resolved NVIDIA
            # route BEFORE the new invocation's pre-invocation snapshot,
            # receipt, and provider history bind a model; and restart
            # reconciliation must recover the interrupted NVIDIA invocation
            # from its own NVIDIA-bound evidence without ever rewriting or
            # being confused by the earlier Z.ai history.
            $m=New-ProviderMigrationLineageFixture 'RD129'
            $f=$m.f
            try{
                Assert-True ($m.disposition -eq 'RETRY') "the historical migration attempt did not finalize as a bounded retry: $($m.disposition)"
                $before=Get-DispatcherState
                Assert-True ([string]$before.model -eq 'zai-coding-plan/glm-5.3' -and [int]$before.attempt -eq 1 -and [string]$before.providerHistory[-1].model -eq 'zai-coding-plan/glm-5.3') 'migration fixture precondition: the durable route and history must still point at the retired model'
                $histEntryBefore=ConvertTo-CanonicalJson (@($before.providerHistory|Where-Object{[string]$_.invocationId -eq $m.hist})[0])
                $histSnapshotBefore=ConvertTo-CanonicalJson (Get-DispatcherWorkspaceInvocationSnapshot -State $before -InvocationId $m.hist)
                # Crash the first restart exactly between the new invocation's
                # result snapshot and its provider history entry: the durable
                # prefix proves the boundary synced the route before launch.
                $script:DispatcherFinalizerFaultAfterResultSnapshot=$true
                try{ try{ Invoke-AutopilotRestart $f|Out-Null }catch{} }finally{ $script:DispatcherFinalizerFaultAfterResultSnapshot=$null }
                $crashed=Get-DispatcherState
                Assert-True ([string]$crashed.model -eq 'nvidia/z-ai/glm-5.3' -and [int]$crashed.attempt -eq 2) 'the launch boundary did not sync the durable current route to the resolved NVIDIA route before the new invocation'
                $att2=[string]$crashed.workspaceInvocationSnapshots[-1].invocationId
                Assert-True ($att2 -ne $m.hist) 'the migrated invocation was not a new lineage invocation'
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'AGENT_RESULT_RECEIPT' 0 2
                $state=Get-DispatcherState
                Assert-True ([string]$state.model -eq 'nvidia/z-ai/glm-5.3' -and [string]$state.provider -eq 'glm' -and [string]$state.profile -eq 'FAST') 'the durable current route does not match the resolved NVIDIA invocation route'
                $entry=@($state.providerHistory|Where-Object{[string]$_.invocationId -eq $att2})[0]
                Assert-True ($entry -and [string]$entry.model -eq 'nvidia/z-ai/glm-5.3' -and [int]$entry.attempt -eq 2 -and [string]$entry.resultClass -eq 'SUCCESS') 'the later same-lineage invocation did not bind the NVIDIA model in provider history'
                $pre=Get-DispatcherWorkspaceInvocationSnapshot -State $state -InvocationId $att2
                Assert-True ($pre -and [string]$pre.model -eq 'nvidia/z-ai/glm-5.3' -and [string]$pre.stateBinding.model -eq 'nvidia/z-ai/glm-5.3' -and [int]$pre.attempt -eq 2) 'the pre-invocation snapshot did not bind the NVIDIA model'
                $receipt=Read-V2Json (Get-RealAgentResultReceiptPath -ArtifactDir (Split-Path -Parent $entry.stdoutArtifact) -InvocationId $att2 -Role 'implementer' -Provider 'glm' -Attempt 2)
                Assert-True ([string]$receipt.model -eq 'nvidia/z-ai/glm-5.3') 'the new invocation receipt did not bind the NVIDIA model'
                $recon=@($state.startupReconciliationHistory|Where-Object{$_})[0]
                Assert-True ($recon -and [string]$recon.invocationId -eq $att2 -and [string]$recon.source -eq 'AGENT_RESULT_RECEIPT') 'restart reconciliation did not recover the interrupted invocation from its own NVIDIA-bound receipt'
                Assert-True ((ConvertTo-CanonicalJson (@($state.providerHistory|Where-Object{[string]$_.invocationId -eq $m.hist})[0])) -eq $histEntryBefore -and (ConvertTo-CanonicalJson (Get-DispatcherWorkspaceInvocationSnapshot -State $state -InvocationId $m.hist)) -eq $histSnapshotBefore -and [string](@($state.providerHistory|Where-Object{[string]$_.invocationId -eq $m.hist})[0]).model -eq 'zai-coding-plan/glm-5.3') 'historical Z.ai evidence was rewritten by the migrated invocation or its restart reconciliation'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-130' {
            # Invocation-boundary route sync is FAIL-CLOSED: a stale durable
            # route is synced ONLY when the route resolves; when it does not,
            # nothing is mutated and the launch boundary holds BEFORE the
            # attempt increment, the pre-invocation snapshot, or the provider
            # launch, recording the hold in the durable ledger.
            $f=New-AutopilotFixture 'RD130'
            try{
                $state=Get-DispatcherState
                $state.model='zai-coding-plan/glm-5.3';Write-DispatcherState $state|Out-Null
                $sync=Sync-DispatcherInvocationRoute (Get-DispatcherState)
                Assert-True ([bool]$sync.ok -and [bool]$sync.synced) "stale route sync failed: $($sync.reason)"
                $synced=Get-DispatcherState
                Assert-True ([string]$synced.model -eq 'nvidia/z-ai/glm-5.3' -and [int]$synced.attempt -eq 0 -and @($synced.providerHistory).Count -eq 0 -and @($synced.workspaceInvocationSnapshots).Count -eq 0) 'route sync mutated the attempt counter, historical evidence, or pre-invocation snapshots'
                $oldCfg=$script:V2Config
                try{
                    $localV2=Join-Path $Root 'rd130-v2';New-Item -ItemType Directory -Force -Path $localV2|Out-Null
                    $failCfg=Get-Content -Raw -LiteralPath (Join-Path $Repo '.orchestration\v2\config.v2.json')|ConvertFrom-Json
                    $failCfg.providers.glm.bin='opencode-cli-missing-rd130'
                    $failPath=Join-Path $localV2 'config.missing-glm.v2.json';Write-Utf8 $failPath ($failCfg|ConvertTo-Json -Depth 20)
                    $script:V2Config=$failPath
                    $stale=Get-DispatcherState;$stale.model='zai-coding-plan/glm-5.3';Write-DispatcherState $stale|Out-Null
                    $refused=Sync-DispatcherInvocationRoute (Get-DispatcherState)
                    Assert-True (-not [bool]$refused.ok -and -not [bool]$refused.synced -and "$($refused.reason)" -match 'not installed') 'an unresolvable invocation route was reported as synced'
                    $refusedState=Get-DispatcherState
                    Assert-True ([string]$refusedState.model -eq 'zai-coding-plan/glm-5.3' -and [int]$refusedState.attempt -eq 0 -and @($refusedState.workspaceInvocationSnapshots).Count -eq 0) 'a refused sync mutated the durable route, attempt counter, or created a pre-invocation snapshot'
                    $r=Invoke-AutopilotRestart $f
                    $held=Get-DispatcherState
                    $tail=@(Read-JsonLines (Get-LedgerPath $f.contract.taskVersionId))[-1]
                    Assert-True ("$($r.status)" -eq 'WAITING_HUMAN' -and "$($r.reason)" -match 'invocation route sync failed' -and "$($r.reason)" -match 'not installed') "the launch boundary did not fail closed on an unresolvable route: $($r.status) / $($r.reason)"
                    Assert-True ("$($held.status)" -eq 'WAITING_HUMAN' -and [int]$held.attempt -eq 0 -and [string]$held.model -eq 'zai-coding-plan/glm-5.3' -and @($held.workspaceInvocationSnapshots).Count -eq 0) 'the failed launch incremented attempt, persisted a stale pre-invocation snapshot, or silently continued on the stale route'
                    Assert-True (@($script:AutopilotAgentCalls).Count -eq 0) 'the dispatcher launched a provider invocation despite the route sync failure'
                    Assert-True ([string]$tail.event -eq 'invocation-route-sync-hold' -and [string]$tail.toState -eq 'WAITING_HUMAN') 'the invocation route sync hold was not recorded in the durable ledger'
                }finally{$script:V2Config=$oldCfg}
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        # ---- result-snapshot zero-delta regression (RD-197..RD-206) ----
        # PB1-P01-os-state-machine incident: a completed implementer-family
        # invocation (provider=glm, exitCode=0, providerClass=NONE,
        # resultClass=AGENT_FAILURE, structuredResult=null - a real terminal
        # result, not a synthetic/incomplete one) on a CLEAN workspace could
        # not be finalized because New-DispatcherWorkspaceInvocationResultSnapshot
        # routed every workspace through Get-DispatcherDirtyWorkspaceProof,
        # which intentionally denies a clean workspace (that predicate is a
        # partial-work RECOVERY proof, not a result observation). Fixed by
        # Get-DispatcherResultSnapshotWorkspaceObservation.
        function New-ResultSnapshotUnitFixture([string]$Id){
            $workspace=Join-Path $Root ("result-unit-"+$Id);& git init -b main --quiet $workspace
            Write-Utf8 (Join-Path $workspace 'work\base.ts') "export const base = true;`n"
            & git -C $workspace add .
            & git -C $workspace -c user.name=rd -c user.email=rd@local commit -m base --quiet
            $base=(& git -C $workspace rev-parse HEAD).Trim()
            $task=Task ("RESULT-"+$Id)
            $sourcePath=Join-Path $Fixture ("result-unit-"+$Id+".tasks.json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
            $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0]
            $contract=New-DispatcherContract -Task $task -TaskSource $source
            $runId='run-result-unit-'+$Id.ToLowerInvariant()
            $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';taskId=$task.taskId;taskVersionId=$contract.taskVersionId;task=$task;taskSource=$source.path;taskSourceHash=$source.hash;runId=$runId;workspace=$workspace;branch='main';baseSha=$base;candidateBase=$base;status='RUNNING';stage='IMPLEMENT';reason='';cycle=0;attempt=1;failovers=0;implementationComplete=$false;requiresCorrection=$false;implementationCommit='';recoveredCandidateCommit='';candidateHead='';candidateTree='';diffHash='';provider='glm';model=(Get-GlmModelId);profile='FAST';unavailableProviders=@();providerHistory=@();importantArtifacts=@();findings=@();decisions=@();reviewVerdict='';logicalProjectId='fixture';integration=$null;workspaceInvocationSnapshots=@();workspaceInvocationResultSnapshots=@();incompleteProviderResultRecoveryHistory=@();quarantineReference=$null;quarantineRetryRoute=$null}
            Write-DispatcherState $state|Out-Null
            $prompt=Join-Path $Root ("result-unit-"+$Id+".prompt.txt");Write-Utf8 $prompt 'sanitized fixture prompt'
            $invocation='att-'+[guid]::NewGuid().ToString('N')
            New-DispatcherWorkspaceInvocationSnapshot -State $state -Task $task -InvocationId $invocation -PromptArtifact $prompt -PromptHash (New-FileHash $prompt) -Provider glm -Model (Get-GlmModelId) -ReasoningEffort low -Attempt 1|Out-Null
            return @{state=$state;task=$task;source=$source;contract=$contract;workspace=$workspace;runId=$runId;invocation=$invocation;prompt=$prompt;base=$base}
        }
        function New-ResultSnapshotAgentResult($f){
            return [ordered]@{invocationId=$f.invocation;provider='glm';model=(Get-GlmModelId);reasoningIntent='low';attempt=1;promptHash=(New-FileHash $f.prompt);stdoutHash=('sha256:'+('a'*64))}
        }

        Check 'RD-197' {
            # SUCCESS + dirty workspace: existing behavior unchanged.
            $s=New-AutopilotFixture 'RD197s'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $s 'RECEIPT_ONLY' 'SUCCESS'
                $finalized=Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $s.task -AgentResult $ar -Role 'IMPLEMENTER'
                $post=Get-DispatcherWorkspaceInvocationResultSnapshot -State (Get-DispatcherState) -InvocationId ([string]$ar.invocationId)
                # The new file is untracked, so `git diff HEAD` legitimately
                # shows no content for it (untracked files are invisible to
                # plain `git diff`) - partialFilesHash, not partialDiffHash, is
                # what proves the partial change was recorded.
                Assert-True ("$($finalized.disposition)" -eq 'SUCCESS' -and @($post.paths) -contains 'work/impl.ts' -and [string]$post.partialFilesHash -ne (New-StringHash '')) 'SUCCESS with a dirty workspace changed its recorded partial-change provenance'
            } finally { Remove-DispatcherWorkspace -Workspace $s.workspace }
            # AGENT_FAILURE + dirty workspace: same dirty-proof path, unchanged.
            $d=New-AutopilotFixture 'RD197d'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $d 'RECEIPT_ONLY' 'UNSTRUCTURED_COMPLETE'
                Write-Utf8 (Join-Path $d.workspace 'work\stray.ts') "export const stray = true;`n"
                $finalized=Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $d.task -AgentResult $ar -Role 'IMPLEMENTER'
                $post=Get-DispatcherWorkspaceInvocationResultSnapshot -State (Get-DispatcherState) -InvocationId ([string]$ar.invocationId)
                Assert-True ("$($finalized.disposition)" -eq 'RETRY' -and @($post.paths) -contains 'work/stray.ts' -and [string]$post.partialFilesHash -ne (New-StringHash '')) 'AGENT_FAILURE with a dirty workspace did not use the existing dirty-proof snapshot path'
            } finally { Remove-DispatcherWorkspace -Workspace $d.workspace }
        }

        Check 'RD-198' {
            # The exact incident shape: real (non-synthetic) terminal
            # AGENT_FAILURE on a CLEAN workspace must now finalize with a
            # zero-delta result snapshot instead of throwing.
            $f=New-AutopilotFixture 'RD198'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'UNSTRUCTURED_COMPLETE'
                Assert-True ([string]$ar.providerClass -eq 'NONE' -and [string]$ar.resultClass -eq 'AGENT_FAILURE' -and -not $ar.structuredResult) 'fixture drifted from the real PB1-P01 receipt shape (provider=glm exitCode=0 providerClass=NONE resultClass=AGENT_FAILURE structuredResult=null)'
                $finalized=Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'
                $post=Get-DispatcherWorkspaceInvocationResultSnapshot -State (Get-DispatcherState) -InvocationId ([string]$ar.invocationId)
                $emptyHash=New-StringHash ''
                Assert-True ("$($finalized.disposition)" -eq 'RETRY' -and $post -and [string]$post.partialDiffHash -eq $emptyHash -and [string]$post.partialFilesHash -eq $emptyHash -and @($post.paths).Count -eq 0 -and @($post.fileBindings).Count -eq 0) 'a clean-workspace AGENT_FAILURE result did not produce a zero-delta result snapshot'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-199' {
            # A canonical provider failure (PROVIDER_UNAVAILABLE) on a clean
            # workspace must also finalize via the zero-delta observation.
            $f=New-AutopilotFixture 'RD199'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'PROVIDER_ERROR'
                Assert-True ([string]$ar.providerClass -eq 'PROVIDER_UNAVAILABLE' -and [string]$ar.resultClass -eq 'AGENT_FAILURE') 'fixture did not produce a canonical provider failure'
                $finalized=Complete-DispatcherAgentInvocation -State (Get-DispatcherState) -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'
                $post=Get-DispatcherWorkspaceInvocationResultSnapshot -State (Get-DispatcherState) -InvocationId ([string]$ar.invocationId)
                $emptyHash=New-StringHash ''
                Assert-True ("$($finalized.disposition)" -eq 'PROVIDER_FAILURE' -and $post -and [string]$post.partialDiffHash -eq $emptyHash -and [string]$post.partialFilesHash -eq $emptyHash -and @($post.paths).Count -eq 0) 'a clean-workspace canonical provider failure did not produce a zero-delta result snapshot'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-200' {
            $f=New-ResultSnapshotUnitFixture 'RD200'
            Write-Utf8 (Join-Path $f.workspace 'work\extra.ts') "export const extra = true;`n"
            & git -C $f.workspace add .
            & git -C $f.workspace -c user.name=rd -c user.email=rd@local commit -m drift --quiet
            $failed=$false
            try{ New-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -Task $f.task -AgentResult (New-ResultSnapshotAgentResult $f)|Out-Null }catch{ $failed=$_.Exception.Message -match 'workspace HEAD drift' }
            Assert-True ($failed -and @($f.state.workspaceInvocationResultSnapshots).Count -eq 0) 'a result snapshot was created despite workspace HEAD drift since the pre-invocation snapshot'
        }

        Check 'RD-201' {
            $f=New-ResultSnapshotUnitFixture 'RD201'
            Write-Utf8 (Join-Path $f.workspace 'work\untracked.ts') "export const untracked = true;`n"
            $result=New-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -Task $f.task -AgentResult (New-ResultSnapshotAgentResult $f)
            Assert-True (@($result.paths) -contains 'work/untracked.ts' -and [string]$result.partialFilesHash -ne (New-StringHash '')) 'an untracked in-scope file was folded into a zero-delta result snapshot instead of the dirty-proof path'
        }

        Check 'RD-202' {
            $f=New-ResultSnapshotUnitFixture 'RD202'
            Write-Utf8 (Join-Path $f.workspace 'outside.ts') "export const outside = true;`n"
            $result=New-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -Task $f.task -AgentResult (New-ResultSnapshotAgentResult $f)
            Assert-True (-not [bool]$result.policyCompliant -and @($result.policyViolations) -contains 'out-of-scope change: outside.ts') 'an out-of-scope dirty change at result-snapshot time was accepted as policy-compliant'
        }

        Check 'RD-203' {
            # Authoritative acceptance globs are part of the protected set and
            # must remain enforced on the dirty-proof path.  Result observation
            # records the violation but never upgrades it to compliant work.
            $f=New-ResultSnapshotUnitFixture 'RD203'
            Write-Utf8 (Join-Path $f.workspace 'work\change.isolation.spec.ts') "unauthorized acceptance change`n"
            $result=New-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -Task $f.task -AgentResult (New-ResultSnapshotAgentResult $f)
            Assert-True (-not [bool]$result.policyCompliant -and @($result.policyViolations) -contains 'ungranted protected change: work/change.isolation.spec.ts') 'an ungranted protected-path dirty change at result-snapshot time was accepted as policy-compliant'
        }

        Check 'RD-204' {
            $f=New-ResultSnapshotUnitFixture 'RD204'
            Write-Utf8 (Join-Path $f.workspace 'work\secret.ts') ("export const cloudCredential = 'AKIA"+('Z'*16)+"';")
            $failed=$false
            try{ New-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -Task $f.task -AgentResult (New-ResultSnapshotAgentResult $f)|Out-Null }catch{ $failed=$_.Exception.Message -match 'secret scan' }
            Assert-True ($failed) 'a secret-bearing dirty change at result-snapshot time was accepted'
        }

        Check 'RD-205' {
            $f=New-ResultSnapshotUnitFixture 'RD205'
            $ar=New-ResultSnapshotAgentResult $f
            $first=New-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -Task $f.task -AgentResult $ar
            $emptyHash=New-StringHash ''
            Assert-True ([string]$first.partialDiffHash -eq $emptyHash -and [string]$first.partialFilesHash -eq $emptyHash -and @($first.paths).Count -eq 0 -and @($first.fileBindings).Count -eq 0) 'zero-delta result snapshot hashes were not deterministic empty hashes with empty paths/fileBindings'
            $failed=$false
            try{ New-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -Task $f.task -AgentResult $ar|Out-Null }catch{ $failed=$_.Exception.Message -match 'already has a result snapshot' }
            Assert-True ($failed -and @($f.state.workspaceInvocationResultSnapshots).Count -eq 1) 'a duplicate zero-delta result snapshot was created for the same invocation'
        }

        Check 'RD-206' {
            # Startup reconciliation of the exact real incident shape: the
            # immutable agent-result receipt was already durably persisted, so
            # restart reconciliation recovers from AGENT_RESULT_RECEIPT and
            # must be able to close the clean-workspace AGENT_FAILURE
            # invocation via the fixed zero-delta path instead of throwing.
            $f=New-AutopilotFixture 'RD206'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'UNSTRUCTURED_COMPLETE'
                Assert-True ([string]$ar.providerClass -eq 'NONE' -and [string]$ar.resultClass -eq 'AGENT_FAILURE' -and -not $ar.structuredResult -and (Test-Path -LiteralPath ([string]$ar.resultReceiptPath))) 'fixture drifted from the real PB1-P01 receipt shape'
                $receiptBefore=Read-V2Json ([string]$ar.resultReceiptPath)
                $r=Invoke-AutopilotRestart $f
                Assert-AutopilotRecoveredRun $f $r 'AGENT_RESULT_RECEIPT' 1 2
                $state=Get-DispatcherState
                $impl=@($state.providerHistory|Where-Object{[string]$_.invocationId -eq [string]$ar.invocationId})
                Assert-True ($impl.Count -eq 1 -and [string]$impl[0].resultClass -eq 'AGENT_FAILURE' -and [string]$impl[0].providerClass -eq 'NONE') 'the reconciled clean AGENT_FAILURE invocation was not recorded exactly once with its real classification'
                $post=Get-DispatcherWorkspaceInvocationResultSnapshot -State $state -InvocationId ([string]$ar.invocationId)
                $emptyHash=New-StringHash ''
                Assert-True ($post -and [string]$post.partialDiffHash -eq $emptyHash -and [string]$post.partialFilesHash -eq $emptyHash -and @($post.paths).Count -eq 0) 'reconciliation of a clean AGENT_FAILURE invocation did not produce a zero-delta result snapshot'
                $receiptAfter=Read-V2Json ([string]$ar.resultReceiptPath)
                Assert-True ([string]$receiptAfter.receiptHash -eq [string]$receiptBefore.receiptHash) 'the immutable result receipt was rewritten by reconciliation'
                $recon=@($state.startupReconciliationHistory|Where-Object{$_})[0]
                Assert-True ($recon -and [string]$recon.invocationId -eq [string]$ar.invocationId -and [string]$recon.source -eq 'AGENT_RESULT_RECEIPT') 'reconciliation did not record recovering from the durable receipt'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-207' {
            # A terminal invocation may leave useful in-scope work beside a
            # forbidden protected acceptance file.  Finalization must preserve
            # and hash-bind that exact workspace as a policy hold, then route a
            # bounded CORRECTOR over the unchanged baseline.  It must not throw,
            # silently accept the protected file, or discard the useful work.
            $f=New-ResultSnapshotUnitFixture 'RD207'
            Write-Utf8 (Join-Path $f.workspace 'work\useful.ts') "export const useful = true;`n"
            Write-Utf8 (Join-Path $f.workspace 'work\change.isolation.spec.ts') "unauthorized acceptance change`n"
            $ar=New-ResultSnapshotAgentResult $f
            $ar.providerClass='NONE';$ar.resultClass='AGENT_FAILURE';$ar.exitCode=0
            $finalized=Complete-DispatcherAgentInvocation -State $f.state -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'
            $post=Get-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -InvocationId $f.invocation
            Assert-True ([string]$finalized.disposition -eq 'POLICY_RETRY' -and $post -and -not [bool]$post.policyCompliant -and @($post.policyViolations) -contains 'ungranted protected change: work/change.isolation.spec.ts' -and [bool]$f.state.requiresCorrection -and [int]$f.state.cycle -eq 1) 'a protected dirty result was not durably routed to bounded policy correction'

            $f.state.attempt=2;Write-DispatcherState $f.state|Out-Null
            $prompt2=Join-Path $Root 'result-unit-RD207-corrector.prompt.txt';Write-Utf8 $prompt2 'remove only the recorded policy violation'
            $invocation2='att-'+[guid]::NewGuid().ToString('N')
            $pre2=New-DispatcherWorkspaceInvocationSnapshot -State $f.state -Task $f.task -InvocationId $invocation2 -PromptArtifact $prompt2 -PromptHash (New-FileHash $prompt2) -Provider glm -Model (Get-GlmModelId) -ReasoningEffort low -Attempt 2
            Assert-True (@($pre2.paths) -contains 'work/useful.ts' -and @($pre2.paths) -contains 'work/change.isolation.spec.ts') 'the exact hash-bound policy-hold baseline could not launch its corrector'
        }

        Check 'RD-208' {
            $f=New-ResultSnapshotUnitFixture 'RD208'
            Write-Utf8 (Join-Path $f.workspace 'work\useful.ts') "export const useful = true;`n"
            Write-Utf8 (Join-Path $f.workspace 'work\change.isolation.spec.ts') "unauthorized acceptance change`n"
            $ar=New-ResultSnapshotAgentResult $f
            $ar.providerClass='NONE';$ar.resultClass='AGENT_FAILURE';$ar.exitCode=0
            $finalized=Complete-DispatcherAgentInvocation -State $f.state -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'
            Assert-True ([string]$finalized.disposition -eq 'POLICY_RETRY') 'fixture did not enter a policy hold'

            # Drift after the signed hold may never be inherited by a corrector.
            Write-Utf8 (Join-Path $f.workspace 'work\useful.ts') "export const useful = 'tampered';`n"
            $f.state.attempt=2;Write-DispatcherState $f.state|Out-Null
            $prompt2=Join-Path $Root 'result-unit-RD208-corrector.prompt.txt';Write-Utf8 $prompt2 'remove only the recorded policy violation'
            $failed=$false
            try{New-DispatcherWorkspaceInvocationSnapshot -State $f.state -Task $f.task -InvocationId ('att-'+[guid]::NewGuid().ToString('N')) -PromptArtifact $prompt2 -PromptHash (New-FileHash $prompt2) -Provider glm -Model (Get-GlmModelId) -ReasoningEffort low -Attempt 2|Out-Null}catch{$failed=$_.Exception.Message -match 'ungranted protected change'}
            Assert-True ($failed) 'a drifted policy-hold workspace launched a corrector'
        }

        Check 'RD-209' {
            $f=New-ResultSnapshotUnitFixture 'RD209'
            Write-Utf8 (Join-Path $f.workspace 'work\useful.ts') "export const useful = true;`n"
            Write-Utf8 (Join-Path $f.workspace 'work\change.isolation.spec.ts') "unauthorized acceptance change`n"
            $ar=New-ResultSnapshotAgentResult $f
            $ar.providerClass='NONE';$ar.resultClass='AGENT_FAILURE';$ar.exitCode=0
            $first=Complete-DispatcherAgentInvocation -State $f.state -Task $f.task -AgentResult $ar -Role 'IMPLEMENTER'
            Assert-True ([string]$first.disposition -eq 'POLICY_RETRY') 'fixture did not enter a policy hold'

            $f.state.attempt=2;Write-DispatcherState $f.state|Out-Null
            $prompt2=Join-Path $Root 'result-unit-RD209-corrector.prompt.txt';Write-Utf8 $prompt2 'remove only the recorded policy violation'
            $invocation2='att-'+[guid]::NewGuid().ToString('N')
            New-DispatcherWorkspaceInvocationSnapshot -State $f.state -Task $f.task -InvocationId $invocation2 -PromptArtifact $prompt2 -PromptHash (New-FileHash $prompt2) -Provider glm -Model (Get-GlmModelId) -ReasoningEffort low -Attempt 2|Out-Null
            Remove-Item -LiteralPath (Join-Path $f.workspace 'work\change.isolation.spec.ts') -Force
            $ar2=[ordered]@{invocationId=$invocation2;provider='glm';model=(Get-GlmModelId);reasoningIntent='low';attempt=2;promptHash=(New-FileHash $prompt2);stdoutHash=('sha256:'+('b'*64));providerClass='NONE';resultClass='SUCCESS';exitCode=0}
            $corrected=Complete-DispatcherAgentInvocation -State $f.state -Task $f.task -AgentResult $ar2 -Role 'CORRECTOR'
            $post2=Get-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -InvocationId $invocation2
            Assert-True ([string]$corrected.disposition -eq 'SUCCESS' -and [bool]$post2.policyCompliant -and [bool]$f.state.implementationComplete -and -not [bool]$f.state.requiresCorrection -and (Test-Path -LiteralPath (Join-Path $f.workspace 'work\useful.ts')) -and -not(Test-Path -LiteralPath (Join-Path $f.workspace 'work\change.isolation.spec.ts'))) 'an exact protected-path reversion did not preserve useful work and resume SUCCESS'
        }

        Check 'RD-210' {
            # Restart the exact stranded shape end-to-end: immutable terminal
            # receipt, no provider history/result snapshot yet, useful dirty
            # work plus one protected acceptance file.  Reconciliation must
            # create the hold, launch exactly one bounded corrector, preserve
            # useful work, remove the violation, and reach review.
            $f=New-AutopilotFixture 'RD210'
            try{
                $ar=Invoke-AutopilotDriveToBoundary $f 'RECEIPT_ONLY' 'UNSTRUCTURED_COMPLETE'
                Write-Utf8 (Join-Path $f.workspace 'work\useful.ts') "export const useful = true;`n"
                Write-Utf8 (Join-Path $f.workspace 'work\change.isolation.spec.ts') "unauthorized acceptance change`n"
                $script:AutopilotAgentScenario='CORRECT_POLICY_HOLD'
                try{$r=Invoke-AutopilotRestart $f}finally{$script:AutopilotAgentScenario='SUCCESS'}
                $state=Get-DispatcherState
                $impl=@($state.providerHistory|Where-Object{$_ -and [string]$_.role -eq 'IMPLEMENTER'})
                $correctors=@($state.providerHistory|Where-Object{$_ -and [string]$_.role -eq 'CORRECTOR'})
                $posts=@($state.workspaceInvocationResultSnapshots|Where-Object{$_})
                $commitCount=(& git -C $f.workspace rev-list --count HEAD).Trim()
                $useful=Invoke-GitV2 -Dir $f.workspace -Arguments @('show','HEAD:work/useful.ts') -LogLabel 'rd210-useful'
                Assert-True ([string]$r.status -eq 'WAITING_PROVIDER' -and [string]$r.stage -eq 'REVIEW' -and $impl.Count -eq 1 -and $correctors.Count -eq 1 -and $posts.Count -eq 2 -and -not [bool]$posts[0].policyCompliant -and [bool]$posts[1].policyCompliant -and [bool]$state.implementationComplete -and -not [bool]$state.requiresCorrection -and $commitCount -eq ([string]([int]$f.baseCount+1)) -and $useful.exitCode -eq 0 -and -not(Test-Path -LiteralPath (Join-Path $f.workspace 'work\change.isolation.spec.ts')) -and @($script:AutopilotAgentCalls|Where-Object{[string]$_.role -eq 'implementer'}).Count -eq 1) 'startup policy-hold reconciliation did not complete through exactly one bounded corrector'
            } finally { Remove-DispatcherWorkspace -Workspace $f.workspace }
        }

        Check 'RD-211' {
            $f=New-ResultSnapshotUnitFixture 'RD211'
            Initialize-LedgerTask -TaskVersionId $f.contract.taskVersionId -Identity @{taskId=$f.task.taskId}|Out-Null
            Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event ready -ToState READY|Out-Null
            Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $f.runId -AttemptId (New-AttemptId)|Out-Null
            Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event running -ToState RUNNING -RunId $f.runId|Out-Null
            $f.state.cycle=[int](Get-V2Config).correctionLoop.maxCycles;Write-DispatcherState $f.state|Out-Null
            Write-Utf8 (Join-Path $f.workspace 'work\useful.ts') "export const useful = true;`n"
            Write-Utf8 (Join-Path $f.workspace 'work\change.isolation.spec.ts') "unauthorized acceptance change`n"
            $ar=New-ResultSnapshotAgentResult $f
            $ar.providerClass='NONE';$ar.resultClass='AGENT_FAILURE';$ar.exitCode=0
            $finalized=Complete-DispatcherAgentInvocation -State $f.state -Task $f.task -AgentResult $ar -Role 'CORRECTOR'
            $ledger=Get-LedgerState ([string]$f.state.taskVersionId)
            $post=Get-DispatcherWorkspaceInvocationResultSnapshot -State $f.state -InvocationId ([string]$ar.invocationId)
            Assert-True ([string]$finalized.disposition -eq 'POLICY_BLOCK' -and [string]$f.state.status -eq 'BLOCKED' -and [string]$ledger.state -eq 'FAILED' -and $post -and -not [bool]$post.policyCompliant -and (Test-Path -LiteralPath (Join-Path $f.workspace 'work\useful.ts'))) 'exhausted policy correction did not fail closed while preserving useful work'
        }
    } finally {Pop-Location}

    if($IncludeReal){
        $smoke=Join-Path $PSScriptRoot 'run-real-dispatcher-smoke.ps1'
        $pwsh=(Get-Command powershell.exe -CommandType Application -ErrorAction Stop|Select-Object -First 1).Source
        $stdoutLog=Join-Path $Root 'real-smoke.stdout.log';$stderrLog=Join-Path $Root 'real-smoke.stderr.log'
        $proc=Invoke-NativeCaptured -Exe $pwsh -Arguments @('-NoProfile','-ExecutionPolicy','Bypass','-File',$smoke,'-Direction','both') -WorkingDirectory $Repo -StdoutLog $stdoutLog -StderrLog $stderrLog -TimeoutSec 3600
        $code=$proc.exitCode;$text="$($proc.stdout)`n$($proc.stderr)"
        if($code -eq 0 -and $text -match 'claude-to-codex' -and $text -match 'codex-to-claude'){
            Ok 'RD-03' 'actual Claude CLI implemented disposable task';Ok 'RD-04' 'actual Codex CLI reviewed Claude candidate';Ok 'RD-05' 'actual Codex implemented and actual Claude reviewed';Ok 'RD-19' 'opposite-provider invocations had distinct IDs'
        }else{foreach($id in 'RD-03','RD-04','RD-05','RD-19'){Fail $id "real smoke failed: $text"}}
    }else{foreach($id in 'RD-03','RD-04','RD-05','RD-19'){$results.Add([ordered]@{id=$id;status='SKIP';detail='rerun with -IncludeReal'})}}
}finally{
    $env:PATH=$OriginalPath
    $base=[IO.Path]::GetFullPath([IO.Path]::GetTempPath());$full=[IO.Path]::GetFullPath($Root)
    if($full.StartsWith($base,[StringComparison]::OrdinalIgnoreCase)-and (Split-Path -Leaf $full)-like 'orcivo-rd-suite-*'){Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction SilentlyContinue}
}

$ordered=@($results.ToArray()|Sort-Object { [string]$_['id'] })
$ordered|ForEach-Object{Write-Host "$($_.id): $($_.status) - $($_.detail)" -ForegroundColor $(if($_.status-eq'PASS'){'Green'}elseif($_.status-eq'SKIP'){'Yellow'}else{'Red'})}
$failed=@($ordered|Where-Object status -eq 'FAIL')
    Write-Host "REAL_DISPATCHER_TESTS: $(if($failed.Count){'FAIL'}else{'PASS'}) ($(@($ordered|Where-Object status -eq 'PASS').Count)/$($ordered.Count) PASS, $(@($ordered|Where-Object status -eq 'SKIP').Count) SKIP)"
if($failed.Count){exit 1}
