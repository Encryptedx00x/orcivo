<# RD-01..RD-20 dispatcher regression suite. -IncludeReal invokes both paid CLIs. #>
param([switch]$IncludeReal)
$ErrorActionPreference='Stop'
$V2=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$Repo=[System.IO.Path]::GetFullPath((Join-Path $V2 '..\..\..'))
$Root=Join-Path ([System.IO.Path]::GetTempPath()) ("orcivo-rd-suite-"+[guid]::NewGuid().ToString('N'))
$Fixture=Join-Path $Root 'repo'
$results=New-Object System.Collections.Generic.List[object]

function Ok([string]$Id,[string]$Detail){$results.Add([ordered]@{id=$Id;status='PASS';detail=$Detail})}
function Fail([string]$Id,[string]$Detail){$results.Add([ordered]@{id=$Id;status='FAIL';detail=$Detail})}
function Check([string]$Id,[scriptblock]$Body){try{& $Body;Ok $Id 'ok'}catch{Fail $Id $_.Exception.Message}}
function Assert-True($Value,[string]$Message){if(-not $Value){throw $Message}}
function Write-Utf8([string]$Path,[string]$Text){$d=Split-Path -Parent $Path;if($d){New-Item -ItemType Directory -Force -Path $d|Out-Null};[IO.File]::WriteAllText($Path,$Text,(New-Object Text.UTF8Encoding($false)))}
function Task([string]$Id,[string[]]$Deps=@(),[string]$Risk='B',[string]$Gate='none',[string]$Status='SCHEDULED'){
    return [ordered]@{taskId=$Id;title="task $Id";type='TEST';description="implement $Id";acceptance="AC1: $Id complete";dependencies=@($Deps);scope=@('work/');risk=$Risk;ownerGate=$Gate;blockedByGates=@('G1');candidateConstraints=[ordered]@{};verificationProfile='B';phaseGate='P1';status=$Status}
}
function Source([object[]]$Tasks){return [ordered]@{schemaVersion='orcivo.dispatcher-test/1';batch='RD';state='OWNER_APPROVED';approvedBy='test';approvedAt='2026-09-03';gates=[ordered]@{G1=[ordered]@{kind='TEST';state='PASS'}};phaseOrder=@('P1');tasks=@($Tasks)}}

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
            $lineage='f'*64;$d=Get-FailoverDecision -CurrentProvider claude -Class PROVIDER_QUOTA -FailoversSoFar 0
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
Write-Host "REAL_DISPATCHER_TESTS: $(if($failed.Count){'FAIL'}else{'PASS'}) ($(@($ordered|Where-Object status -eq 'PASS').Count)/20 PASS, $(@($ordered|Where-Object status -eq 'SKIP').Count) SKIP)"
if($failed.Count){exit 1}
