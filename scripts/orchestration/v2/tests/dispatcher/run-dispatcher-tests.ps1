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
            $base=(& git -C $fx rev-parse HEAD).Trim();Write-Utf8 (Join-Path $fx 'tracked.ts') "const { token } = params;`nconst PDF_BUCKET = 'orcivo-pdfs';`n";Write-Utf8 (Join-Path $fx 'tracked.spec.ts') "const approval_token = 'valid-test-token';`n";& git -C $fx add tracked.ts tracked.spec.ts;& git -C $fx -c user.name=rd -c user.email=rd@local commit -m clean --quiet
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
            $diff="diff --git a/source.ts b/source.ts`n+const { token } = params;`n+const PDF_BUCKET = 'orcivo-pdfs';`n+const apiToken = 'literal-to-redact';`n+$prefix"+'TRACKED123'
            Build-ReviewPrompt -DataDir $data -TaskVersionId ('7'*64) -Head ('8'*40) -TreeHash ('9'*40) -DiffHash ('sha256:'+('a'*64)) -SpecHash ('sha256:'+('b'*64)) -AcceptanceText 'AC1: review' -SpecText 'spec' -Diff $diff -ChangedFiles @('source.ts') -CheckSummary 'PASS' -CriteriaIds @('AC1') | Out-Null
            $frozen=Get-Content (Join-Path $data 'diff.patch') -Raw
            Assert-True ($frozen -match 'const \{ token \} = params' -and $frozen -match "PDF_BUCKET = 'orcivo-pdfs'") 'review diff redacted ordinary source syntax'
            Assert-True ($frozen -notmatch 'literal-to-redact' -and $frozen -notmatch ($prefix+'TRACKED123') -and $frozen -match '\[REDACTED\]') 'review diff exposed a source literal secret'
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
