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
function Check([string]$Id,[scriptblock]$Body){if($Only.Count -and $Id -notin $Only){return};try{& $Body;Ok $Id 'ok'}catch{Fail $Id $_.Exception.Message}}
function Assert-True($Value,[string]$Message){if(-not $Value){throw $Message}}
function Write-Utf8([string]$Path,[string]$Text){$d=Split-Path -Parent $Path;if($d){New-Item -ItemType Directory -Force -Path $d|Out-Null};[IO.File]::WriteAllText($Path,$Text,(New-Object Text.UTF8Encoding($false)))}
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

New-Item -ItemType Directory -Force -Path (Join-Path $Fixture '.orchestration\v2\schemas')|Out-Null
Copy-Item (Join-Path $Repo '.orchestration\v2\config.v2.json') (Join-Path $Fixture '.orchestration\v2\config.v2.json')
Copy-Item (Join-Path $Repo '.orchestration\v2\schemas\*.json') (Join-Path $Fixture '.orchestration\v2\schemas')
Write-Utf8 (Join-Path $Fixture '.gitignore') ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n.orchestration/v2/schemas/*`n!.orchestration/v2/schemas/*.json`n"
Write-Utf8 (Join-Path $Fixture 'README.md') "dispatcher unit fixture`n"
& git init -b main --quiet $Fixture
& git -C $Fixture add .
& git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m init --quiet

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
            Assert-True ($proof.eligible -and @($f.paths).Count -eq 6 -and $first.status -eq 'QUARANTINED_AND_REDISPATCHED' -and $again.status -eq 'ALREADY_QUARANTINED' -and ((Get-LedgerState $f.contract.taskVersionId).seq -eq $seq)) 'unattributed six-file incomplete result was not quarantined idempotently'
            Assert-True ((($before -join "`n") -eq ($after -join "`n")) -and $state.workspace -eq $first.workspace -and $state.workspace -ne $f.workspace -and $clean.Count -eq 0 -and [int]$state.failovers -eq 1 -and [int]$state.cycle -eq 1 -and $state.quarantineReference.contentLoaded -eq $false -and $state.quarantineReference.policy -match 'NON_AUTHORITATIVE') 'quarantine changed old evidence, imported it, or failed to create a clean retry workspace'
            Remove-DispatcherWorkspace -Workspace $first.workspace
        }
        Check 'RD-93' {
            $f=New-IncompleteProviderQuarantineFixture 'RD93';$trusted=$f.state.implementationCommit;$script:IncompleteProviderResultQuarantineFaultAfterLedger=$true
            try{try{Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted|Out-Null}catch{}}finally{$script:IncompleteProviderResultQuarantineFaultAfterLedger=$null}
            $restart=Get-DispatcherState;$resumed=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted;$durable=Get-DispatcherState
            Assert-True ($restart.status -eq 'AGENT_FAILURE' -and $resumed.status -eq 'QUARANTINED_AND_REDISPATCHED' -and $durable.status -eq 'RUNNING' -and $durable.workspace -ne $f.workspace -and (Get-LedgerState $f.contract.taskVersionId).state -eq 'RUNNING') 'quarantine was not restart-safe after its durable ledger prefix'
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
            $state=Get-DispatcherState;$route=[hashtable]$state.quarantineRetryRoute;$logs=Join-Path (Get-V2Dir) "runs\$($state.runId)\logs";$launch='att-'+[guid]::NewGuid().ToString('N');$prompt=Join-Path $logs ('implementer-{0:000}-{1}.prompt.txt' -f [int]$state.attempt,$launch.Substring(4,8));Write-Utf8 $prompt 'sanitized clean retry prompt'
            $snap=New-DispatcherWorkspaceInvocationSnapshot -State $state -Task $f.task -InvocationId $launch -PromptArtifact $prompt -PromptHash (New-FileHash $prompt) -Provider ([string]$route.provider) -Model ([string]$route.model) -ReasoningEffort $(if([string]$route.reasoning){[string]$route.reasoning}else{'high'}) -Attempt ([int]$state.attempt)
            $restart=Get-DispatcherState;$durable=Get-DispatcherWorkspaceInvocationSnapshot -State $restart -InvocationId $launch
            Assert-True ($q.status -eq 'QUARANTINED_AND_REDISPATCHED' -and @($snap.paths).Count -eq 0 -and @($snap.fileBindings).Count -eq 0 -and $snap.partialDiffHash -eq (New-StringHash '') -and $snap.partialFilesHash -eq (New-StringHash '') -and $durable -and $durable.snapshotHash -eq $snap.snapshotHash) 'clean quarantined retry did not receive a durable empty launch baseline'
            Remove-DispatcherWorkspace -Workspace $q.workspace
        }
        Check 'RD-101' {
            $pinned=[ordered]@{taskVersionId=('a'*64);stage='IMPLEMENT';provider='deepseek';model='deepseek-v4-pro';profile='REASONING';quarantineRetryRoute=[ordered]@{provider='deepseek';model='deepseek-v4-pro';profile='REASONING';reasoning='high';policy='CLEAN_QUARANTINED_RETRY_REQUIRES_FRESH_DEEPSEEK_PRO_HIGH'}}
            $route=Get-DispatcherPinnedQuarantinedRetryRoute $pinned;$drift=[ordered]@{}+$pinned;$drift.provider='codex';$failed=$false
            try{Resume-DispatcherProviderWait $drift|Out-Null}catch{$failed=$_.Exception.Message -eq 'quarantined retry route binding drift'}
            Assert-True ($route -and [string]$route.provider -eq 'deepseek' -and $failed) 'quarantined DeepSeek retry accepted a cross-provider resume'
        }
        Check 'RD-100' {
            $f=New-IncompleteProviderQuarantineFixture 'RD100';$trusted=$f.state.implementationCommit
            $q=Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            $state=Get-DispatcherState;$route=[hashtable]$state.quarantineRetryRoute;Write-Utf8 (Join-Path $q.workspace 'outside.ts') 'export const outside = true;';$logs=Join-Path (Get-V2Dir) "runs\$($state.runId)\logs";$launch='att-'+[guid]::NewGuid().ToString('N');$prompt=Join-Path $logs ('implementer-{0:000}-{1}.prompt.txt' -f [int]$state.attempt,$launch.Substring(4,8));Write-Utf8 $prompt 'sanitized dirty retry prompt';$failed=$false
            try{New-DispatcherWorkspaceInvocationSnapshot -State $state -Task $f.task -InvocationId $launch -PromptArtifact $prompt -PromptHash (New-FileHash $prompt) -Provider ([string]$route.provider) -Model ([string]$route.model) -ReasoningEffort $(if([string]$route.reasoning){[string]$route.reasoning}else{'high'}) -Attempt ([int]$state.attempt)|Out-Null}catch{$failed=$_.Exception.Message -match 'out-of-scope'}
            Assert-True $failed 'clean retry exception accepted an out-of-scope workspace mutation'
            Remove-DispatcherWorkspace -Workspace $q.workspace
        }
        Check 'RD-96' {
            $f=New-IncompleteProviderQuarantineFixture 'RD96';$trusted=$f.state.implementationCommit;$gate=Get-HumanGatePath $f.contract.taskVersionId $f.task.ownerGate;Remove-Item -LiteralPath $gate -Force;$approval=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            $wrong=Test-DispatcherIncompleteProviderResultAbandonment -State $f.state -Task $f.task -TaskSource $f.source -RunId 'run-wrong-version' -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted
            Assert-True (-not $approval.eligible -and -not $wrong.eligible) 'quarantine accepted missing approval or a divergent run/version binding'
        }
        Check 'RD-97' {
            $f=New-IncompleteProviderQuarantineFixture 'RD97';$trusted=$f.state.implementationCommit;$id=Get-DispatcherIncompleteProviderResultQuarantineWorkspaceId -RunId $f.runId -InvocationId $f.invocation;$target=Join-Path ([System.IO.Path]::GetTempPath()) ('orcivo-dispatcher\'+$id);$blocked=$false
            $script:ProviderHealthFaults=@{claude='PROVIDER_UNAVAILABLE';codex='PROVIDER_UNAVAILABLE';deepseek='PROVIDER_UNAVAILABLE'}
            try{try{Quarantine-DispatcherIncompleteProviderResult -Task $f.task -TaskSource $f.source -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -InvocationId $f.invocation -EvidenceHash $f.evidenceHash -PartialDiffHash $f.partialDiffHash -PartialFilesHash $f.partialFilesHash -TrustedHead $trusted|Out-Null}catch{$blocked=$_.Exception.Message -match 'no eligible provider route'}}finally{$script:ProviderHealthFaults=$null}
            Assert-True ($blocked -and -not(Test-Path -LiteralPath $target)) 'quarantine created an unregistered retry workspace before provider routing was eligible'
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
            Assert-True ($first.status -eq 'QUARANTINED_AND_REDISPATCHED' -and $again.status -eq 'ALREADY_QUARANTINED' -and $restart.workspace -eq $first.workspace -and (Get-GitHeadV2 $first.workspace) -eq $trusted) 'reconciled -1 quarantine was not restart-safe and idempotent'
            Remove-DispatcherWorkspace -Workspace $first.workspace
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
    $base=[IO.Path]::GetFullPath([IO.Path]::GetTempPath());$full=[IO.Path]::GetFullPath($Root)
    if($full.StartsWith($base,[StringComparison]::OrdinalIgnoreCase)-and (Split-Path -Leaf $full)-like 'orcivo-rd-suite-*'){Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction SilentlyContinue}
}

$ordered=@($results.ToArray()|Sort-Object { [string]$_['id'] })
$ordered|ForEach-Object{Write-Host "$($_.id): $($_.status) - $($_.detail)" -ForegroundColor $(if($_.status-eq'PASS'){'Green'}elseif($_.status-eq'SKIP'){'Yellow'}else{'Red'})}
$failed=@($ordered|Where-Object status -eq 'FAIL')
    Write-Host "REAL_DISPATCHER_TESTS: $(if($failed.Count){'FAIL'}else{'PASS'}) ($(@($ordered|Where-Object status -eq 'PASS').Count)/$($ordered.Count) PASS, $(@($ordered|Where-Object status -eq 'SKIP').Count) SKIP)"
if($failed.Count){exit 1}
