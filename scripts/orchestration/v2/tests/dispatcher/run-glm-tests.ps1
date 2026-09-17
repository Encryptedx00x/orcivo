<# GL-01..GL-10 GLM (zai-coding-plan/glm-5.3 via OpenCode) provider integration suite.
   Deterministic: no model calls; provider health is pinned through the harness
   fault seam and CLI resolution through a fixture config. #>
param()
$ErrorActionPreference='Stop'
$v2=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$root=Join-Path ([IO.Path]::GetTempPath()) ('orcivo-glm-tests-'+[guid]::NewGuid().ToString('N'))
$results=New-Object System.Collections.Generic.List[object]
function Check([string]$Id,[scriptblock]$Body){try{& $Body;$results.Add("$Id PASS")}catch{$results.Add("$Id FAIL: $($_.Exception.Message)")}}
function Assert-True($Value,[string]$Message){if(-not $Value){throw $Message}}
function Write-TestJson([string]$Path,$Value){New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path)|Out-Null;[IO.File]::WriteAllText($Path,($Value|ConvertTo-Json -Depth 20),(New-Object Text.UTF8Encoding($false)))}
try{
    . (Join-Path $v2 'lib-v2.ps1');. (Join-Path $v2 'classify.ps1');. (Join-Path $v2 'deepseek.ps1');. (Join-Path $v2 'glm.ps1');. (Join-Path $v2 'router.ps1');. (Join-Path $v2 'providers.ps1');. (Join-Path $v2 'ledger.ps1');. (Join-Path $v2 'dispatcher.ps1')
    New-Item -ItemType Directory -Force -Path $root|Out-Null
    $runtime=Join-Path $root 'provider-runtime.v1.json';$script:DeepSeekRuntimePath=$runtime;$script:DeepSeekBudgetDir=Join-Path $root 'budgets';$registry=Join-Path $root 'deepseek-price-registry.v1.json';Copy-Item (Join-Path $v2 'deepseek-price-registry.v1.json') $registry;$script:DeepSeekPriceRegistryPath=$registry
    $manifest=Read-V2Json $registry
    function New-GlmRuntime([string]$GlmModel='zai-coding-plan/glm-5.3',[string[]]$Enabled=@('glm','deepseek')){
        return [ordered]@{schemaVersion='orcivo.orchestration.v2.provider-runtime/1';enabled=$true;enabledProviders=$Enabled;excludedProviders=@('claude','codex');budgets=[ordered]@{monthlyDeepSeekBudgetUsd=5};deepseek=[ordered]@{baseUrl='https://api.deepseek.com/';wireApi='responses';envKey='DEEPSEEK_API_KEY';codexHomeRoot='orcivo-dispatcher/providers/deepseek-codex';profiles=[ordered]@{FAST=[ordered]@{model='deepseek-v4-flash';reasoning='low';maxEstimatedUsd=0.03};BALANCED=[ordered]@{model='deepseek-v4-pro';reasoning='high';maxEstimatedUsd=0.20};REASONING=[ordered]@{model='deepseek-v4-pro';reasoning='high';maxEstimatedUsd=0.20}};pricing=[ordered]@{status='VERIFIED';manifestHash=[string]$manifest.manifestHash}};codex=[ordered]@{profiles=[ordered]@{CRITICAL=[ordered]@{model='gpt-5.6-terra';reasoning='high'}}};glm=[ordered]@{model=$GlmModel}}
    }
    $cfg=New-GlmRuntime;Write-TestJson $runtime $cfg

    Check 'GL-01' {
        Assert-True ((Get-GlmModelId) -eq 'zai-coding-plan/glm-5.3') 'model contract id drifted'
        $args=@(Get-GlmInvocationArgs)
        Assert-True (($args -join ' ') -eq 'run --model zai-coding-plan/glm-5.3 --format json --pure') "invocation args drifted: $($args -join ' ')"
        Assert-True ($args -notcontains '--variant') 'variant selector must never be pinned'
        Assert-True ($args -notcontains '--continue' -and $args -notcontains '--session') 'session continuation must never be pinned'
    }
    Check 'GL-02' {
        foreach($profile in @('FAST','BALANCED','REASONING')){
            $plan=Get-GlmRuntimePlan -Profile $profile
            Assert-True ($plan.ok -and $plan.model -eq 'zai-coding-plan/glm-5.3') "$profile did not resolve the exact model"
        }
        Assert-True (-not (Get-GlmRuntimePlan -Profile CRITICAL).ok) 'CRITICAL must stay reserved for Codex Plus Terra'
        Write-TestJson $runtime (New-GlmRuntime -GlmModel 'glm-drifted-model')
        Assert-True (-not (Get-GlmRuntimePlan -Profile REASONING).ok) 'runtime model drift was accepted'
        $disabled=New-GlmRuntime;$disabled.enabled=$false;Write-TestJson $runtime $disabled
        Assert-True (-not (Get-GlmRuntimePlan -Profile REASONING).ok) 'disabled runtime was accepted'
        Write-TestJson $runtime (New-GlmRuntime)
    }
    Check 'GL-03' {
        $oldCfg=$script:V2Config;$oldV2=$script:V2Dir
        try{
            $localV2=Join-Path $root 'v2';New-Item -ItemType Directory -Force -Path $localV2|Out-Null
            $fixtureCfg=Get-Content -Raw -LiteralPath (Join-Path (Get-RepoRoot) '.orchestration\v2\config.v2.json')|ConvertFrom-Json
            $fixtureCfg.providers.glm.bin='powershell'
            $fixturePath=Join-Path $localV2 'config.v2.json';Write-TestJson $fixturePath $fixtureCfg
            $script:V2Config=$fixturePath;$script:V2Dir=$localV2
            $r=Resolve-Provider -Profile REASONING -Provider 'glm'
            Assert-True ($r.ok) "glm route failed: $($r.reason)"
            Assert-True ($r.model -eq 'zai-coding-plan/glm-5.3') "glm route model drifted: $($r.model)"
            Assert-True (($r.invocationArgs -join ' ') -match 'zai-coding-plan/glm-5.3') 'route args lost the exact model'
            $bad=Resolve-Provider -Profile REASONING -Provider 'glm' -ModelOverride 'other-model'
            Assert-True (-not $bad.ok) 'model override was accepted'
            $fixtureCfg.providers.glm.bin='opencode-cli-missing-glmtest'
            Write-TestJson $fixturePath $fixtureCfg
            $missing=Resolve-Provider -Profile REASONING -Provider 'glm'
            Assert-True (-not $missing.ok -and $missing.reason -match 'not installed') 'missing OpenCode CLI did not fail closed'
            $health=Get-ProviderHealth -Provider 'glm'
            Assert-True (-not $health.healthy -and $health.class -eq 'PROVIDER_UNAVAILABLE') 'missing CLI health did not fail closed as PROVIDER_UNAVAILABLE'
        }finally{$script:V2Config=$oldCfg;$script:V2Dir=$oldV2}
    }
    Check 'GL-04' {
        $body='{"schemaVersion":"orcivo.orchestration.v2.agent-result/1","role":"IMPLEMENTER","resultClass":"SUCCESS","summary":"ok","decisions":[],"tests":[],"nextAction":"none","importantArtifacts":[]}'
        $escapedText=$body|ConvertTo-Json -Compress
        $textEvent='{"type":"text","part":{"type":"text","text":'+$escapedText+'}}'
        $lines=@(
            '{"type":"step_start","part":{"type":"step-start"}}',
            $textEvent,
            '{"type":"step_finish","part":{"type":"step-finish","reason":"stop","tokens":{"total":19136,"input":24,"output":5,"reasoning":35,"cache":{"write":0,"read":19072}},"cost":0}}'
        )
        $parsed=ConvertFrom-RealGlmOutput (($lines -join "`n")+"`n")
        Assert-True ($parsed.structured -and $parsed.structured.resultClass -eq 'SUCCESS') 'structured agent envelope was not parsed'
        Assert-True (Test-GlmFinalStructuredEvent @($parsed.events)) 'terminal step_finish was not recognized'
        Assert-True ($parsed.control -and -not $parsed.control.isError) 'completed stream produced an error control channel'
        $usage=Get-GlmUsageFromEvents @($parsed.events)
        Assert-True ($usage.inputTokens -eq 24 -and $usage.outputTokens -eq 5 -and $usage.cachedTokens -eq 19072 -and [decimal]$usage.costUsd -eq 0) "usage telemetry parse failed: $(ConvertTo-Json $usage)"
        $truncated=ConvertFrom-RealGlmOutput (($lines[0..1] -join "`n")+"`n")
        Assert-True (-not (Test-GlmFinalStructuredEvent @($truncated.events))) 'truncated stream passed the terminal test'
        $noisy=ConvertFrom-RealGlmOutput ((@('not json at all',$lines[0]) -join "`n")+"`n")
        Assert-True (@($noisy.events).Count -eq 1) 'malformed lines were not ignored'
        $empty=ConvertFrom-RealGlmOutput ''
        Assert-True (-not $empty.structured -and -not $empty.control) 'empty stream produced a structured result'
    }
    Check 'GL-05' {
        $cases=@(
            @(@{type='error';error=@{status=401;message='authentication required for zai-coding-plan'}},1,'TEMPORARY_AUTH_FAILURE'),
            @(@{type='error';error=@{status=402;message='insufficient quota for the coding plan'}},1,'QUOTA_EXHAUSTED'),
            @(@{type='error';error=@{message='rate limit exceeded, too many requests (429)'}},1,'RATE_LIMIT'),
            @(@{type='error';error=@{status=503;message='provider response'}},1,'PROVIDER_UNAVAILABLE')
        )
        foreach($case in $cases){
            $control=ConvertFrom-GlmEvents @($case[0])
            Assert-True ($control -and $control.isError -and $control.channel -eq 'glm') 'error event did not produce a glm control channel'
            $legacy=Get-FailureClassV2 -Provider glm -ExitCode $case[1] -Control $control
            $canonical=ConvertTo-CanonicalFailureClass $legacy $control
            Assert-True ($canonical -eq $case[2]) "classification drifted: $($case[2]) -> $canonical"
        }
        $timeout=ConvertTo-CanonicalFailureClass (Get-FailureClassV2 -Provider glm -ExitCode 124 -Control $null) $null
        Assert-True ($timeout -eq 'TRANSIENT_PROVIDER_NETWORK') 'glm timeout was not a transient transport class'
        $incomplete=Get-FailureClassV2 -Provider glm -ExitCode 0 -Control $null
        Assert-True ($incomplete -eq 'INCOMPLETE_PROVIDER_RESULT' -and -not (Test-IsCanonicalProviderClass $incomplete)) 'exit-zero without terminal must stay fail-closed INCOMPLETE'
    }
    Check 'GL-06' {
        Assert-True ((Get-OrcivoEnabledProviders) -join ',' -eq 'glm,deepseek') 'enabled set must be glm,deepseek with glm first'
        $rv=Select-Reviewer -ImplementerProvider 'glm' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('glm','deepseek')
        Assert-True ($rv.reviewer -eq 'deepseek' -and $rv.crossProvider) 'GLM implementer must be reviewed by DeepSeek'
        $rv=Select-Reviewer -ImplementerProvider 'deepseek' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('glm','deepseek')
        Assert-True ($rv.reviewer -eq 'glm' -and $rv.crossProvider) 'DeepSeek implementer must be reviewed by GLM (current candidate)'
        $rv=Select-Reviewer -ImplementerProvider 'deepseek' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('deepseek')
        Assert-True (-not $rv.ok -and $rv.escalate) 'opposite unavailable must escalate, never same-provider'
        Assert-True ((Get-OrcivoOppositeProvider -Provider 'codex' -Candidates @('claude','codex','deepseek','glm')) -eq 'deepseek') 'codex opposite drifted'
        Assert-True ((Get-OrcivoOppositeProvider -Provider 'claude' -Candidates @('claude','codex')) -eq 'codex') 'claude opposite drifted'
    }
    Check 'GL-07' {
        $oldV2=$script:V2Dir;$oldCfg=$script:V2Config;$oldLedger=$script:LedgerDir;$oldRuntime=$script:DeepSeekRuntimePath;$oldBudget=$script:DeepSeekBudgetDir;$oldRegistry=$script:DeepSeekPriceRegistryPath
        try{
            $localV2=Join-Path $root 'v2resume';New-Item -ItemType Directory -Force -Path $localV2|Out-Null;Copy-Item (Join-Path (Get-RepoRoot) '.orchestration\v2\config.v2.json') (Join-Path $localV2 'config.v2.json')
            $script:V2Dir=$localV2;$script:V2Config=Join-Path $localV2 'config.v2.json';$script:LedgerDir=Join-Path $localV2 'ledger';$script:DeepSeekRuntimePath=$runtime;$script:DeepSeekBudgetDir=Join-Path $localV2 'budgets';$script:DeepSeekPriceRegistryPath=$registry
            $tv='a'*64;$run='run-glm-current-candidate'
            Initialize-LedgerTask -TaskVersionId $tv -Identity @{taskId='PB1-P02-audit-service'}|Out-Null
            Add-LedgerEvent -TaskVersionId $tv -Event ready -ToState READY -RunId $run|Out-Null
            Add-LedgerEvent -TaskVersionId $tv -Event dispatch -ToState DISPATCHED -RunId $run|Out-Null
            Add-LedgerEvent -TaskVersionId $tv -Event running -ToState RUNNING -RunId $run|Out-Null
            $candidateHead='fb2093860d30fc24836ae20c136ef0d38da830c6'
            $diffHash='sha256:2ab242e04bd29eef9d004786f6d08a7b6e161b4f86c9930934f27220eab76cbb'
            $state=[ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';taskId='PB1-P02-audit-service';taskVersionId=$tv;runId=$run;status='WAITING_PROVIDER';stage='REVIEW';reason='';provider='deepseek';model='deepseek-v4-pro';profile='REASONING';reviewerProvider='codex';lastErrorClass='QUOTA_EXHAUSTED';candidateHead=$candidateHead;candidateTree='ed9501e99062dcdc32bf8bf83a0b4a5229cc00b6';diffHash=$diffHash;implementationComplete=$true;unavailableProviders=@();providerHistory=@([ordered]@{invocationId='att-11111111111111111111111111111111';role='REVIEWER';provider='codex';providerClass='QUOTA_EXHAUSTED';resultClass='AGENT_FAILURE';exitCode=1});quarantineRetryRoute=[ordered]@{provider='deepseek';model='deepseek-v4-pro';profile='REASONING';reasoning='high';policy='CLEAN_QUARANTINED_RETRY_REQUIRES_FRESH_DEEPSEEK_PRO_HIGH'}}
            $positive=Test-DispatcherAuthorizedQuarantinedReviewResume -State $state -ExpectedTaskId 'PB1-P02-audit-service' -ExpectedTaskVersionId $tv -ExpectedRunId $run -ExpectedCandidateHead $candidateHead -ExpectedDiffHash $diffHash
            Assert-True ($positive) 'the closed replacement-review exception did not bind the exact current candidate'
            foreach($mutated in @('candidateHead','diffHash','reviewerProvider','lastErrorClass')){
                $wrong=[ordered]@{}+$state
                switch($mutated){
                    'candidateHead'{$wrong.candidateHead='0'*40}
                    'diffHash'{$wrong.diffHash='sha256:'+('0'*64)}
                    'reviewerProvider'{$wrong.reviewerProvider='claude'}
                    'lastErrorClass'{$wrong.lastErrorClass='PROVIDER_UNAVAILABLE'}
                }
                $bad=Test-DispatcherAuthorizedQuarantinedReviewResume -State $wrong -ExpectedTaskId 'PB1-P02-audit-service' -ExpectedTaskVersionId $tv -ExpectedRunId $run -ExpectedCandidateHead $candidateHead -ExpectedDiffHash $diffHash
                Assert-True (-not $bad) "mutating $mutated was accepted by the closed exception"
            }
            $wait=Enter-WaitingProvider -TaskVersionId $tv -RunId $run -Context @{taskId='PB1-P02-audit-service';generation='dispatcher';workspace='';candidateCommit=$candidateHead;candidateTree='';attemptHistory=@(1);providerHistory=@();verificationState='PASS';reviewState='';checkpoint=@{nextAction='resume REVIEW'};lastErrorClass='QUOTA_EXHAUSTED'}
            Assert-True ((Get-LedgerState $tv).state -eq 'WAITING_PROVIDER') 'quota exhaustion did not land in WAITING_PROVIDER'
            $wait.nextRetryAt=(Get-Date).ToUniversalTime().AddSeconds(-1).ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $tv) $wait
            $plain=[ordered]@{}+$state;$plain.Remove('quarantineRetryRoute')
            $script:ProviderHealthFaults=@{glm='PROVIDER_UNAVAILABLE';deepseek='PROVIDER_UNAVAILABLE'}
            try{
                $blocked=Resume-DispatcherProviderWait $plain
                $tail=@(Read-JsonLines (Get-LedgerPath $tv))[-1]
                Assert-True (-not $blocked -and (Get-LedgerState $tv).state -eq 'WAITING_PROVIDER' -and [string]$tail.toState -ne 'DISPATCHED' -and [string]$tail.toState -ne 'RUNNING') 'unavailable reviewer produced DISPATCHED/RUNNING or left WAITING_PROVIDER'
            }finally{$script:ProviderHealthFaults=@{}}
            $wait.nextRetryAt=(Get-Date).ToUniversalTime().AddSeconds(-1).ToString('o');Write-V2JsonCanonical (Get-ProviderWaitPath $tv) $wait
            try{
                $resumed=Resume-DispatcherProviderWait $plain
                Assert-True ($resumed) 'healthy GLM reviewer did not resume the review stage'
                $ledger=Get-LedgerState $tv
                Assert-True ($ledger.state -eq 'REVIEWING') "review resume did not reach REVIEWING: $($ledger.state)"
                Assert-True ($plain.candidateHead -eq $candidateHead -and $plain.diffHash -eq $diffHash -and $plain.stage -eq 'REVIEW' -and $plain.provider -eq 'deepseek') 'resume mutated candidate, diff, stage, or implementer provenance'
                Assert-True ((Get-OrcivoOppositeProvider -Provider ([string]$plain.provider)) -eq 'glm') 'dispatch reviewer for the current candidate is not GLM'
            }finally{$script:ProviderHealthFaults=$null}
        }finally{$script:V2Dir=$oldV2;$script:V2Config=$oldCfg;$script:LedgerDir=$oldLedger;$script:DeepSeekRuntimePath=$oldRuntime;$script:DeepSeekBudgetDir=$oldBudget;$script:DeepSeekPriceRegistryPath=$oldRegistry}
    }
    Check 'GL-08' {
        $schemaPath=Join-Path (Get-RepoRoot) '.orchestration\v2\schemas\agent-result.schema.json'
        $schema=Get-Content -Raw -LiteralPath $schemaPath|ConvertFrom-Json
        $valid=@{schemaVersion='orcivo.orchestration.v2.agent-result/1';role='IMPLEMENTER';resultClass='SUCCESS';summary='ok';decisions=@();tests=@();nextAction='stop';importantArtifacts=@()}
        $validErrors=Test-JsonSchema (ConvertFrom-JsonTyped (ConvertTo-Json $valid -Depth 10 -Compress)) $schema
        Assert-True ($validErrors.Count -eq 0) "valid envelope rejected: $($validErrors -join '; ')"
        $invalid=@{schemaVersion='orcivo.orchestration.v2.agent-result/1';role='IMPLEMENTER';summary='missing resultClass';decisions=@();tests=@();nextAction='stop';importantArtifacts=@()}
        $invalidErrors=Test-JsonSchema (ConvertFrom-JsonTyped (ConvertTo-Json $invalid -Depth 10 -Compress)) $schema
        Assert-True ($invalidErrors.Count -gt 0) 'schema-invalid structured envelope was accepted'
        $lines=@(
            '{"type":"text","part":{"type":"text","text":"{\"schemaVersion\":\"orcivo.orchestration.v2.agent-result/1\",\"role\":\"IMPLEMENTER\",\"summary\":\"no resultClass\"}"}}'
        )
        $parsed=ConvertFrom-RealGlmOutput (($lines -join "`n")+"`n")
        Assert-True ($parsed.structured -and -not $parsed.structured.Contains('resultClass') -and -not (Test-GlmFinalStructuredEvent @($parsed.events))) 'invalid envelope guard preconditions drifted'
    }
    Check 'GL-09' {
        $route=Resolve-Provider -Profile BALANCED -Provider 'glm'
        Assert-True (-not $route.ok -or $route.model -eq 'zai-coding-plan/glm-5.3') 'resolved glm route lost the exact model'
        Assert-True ((Get-GlmRuntimePlan -Profile BALANCED).model -eq 'zai-coding-plan/glm-5.3') 'plan model drifted'
    }
    Check 'GL-10' {
        $cfg2=New-GlmRuntime -Enabled @('glm','deepseek','claude','codex');Write-TestJson $runtime $cfg2
        $enabled=Get-OrcivoEnabledProviders
        Assert-True (($enabled -join ',') -eq 'glm,deepseek') "excluded providers leaked into the enabled set: $($enabled -join ',')"
        Write-TestJson $runtime (New-GlmRuntime)
    }
    Check 'GL-11' {
        function New-ReviewSuccessionState {
            return [ordered]@{taskId='PB1-P02-audit-service';taskVersionId='9072101439aa09bbb494e28b3e2c8e985dcb91d0235d68ff7f7164b2ada65798';runId='run-31fa07ca662c48b087d32ad0666e9a22';status='WAITING_PROVIDER';stage='REVIEW';provider='deepseek';model='deepseek-v4-pro';profile='REASONING';reviewerProvider='codex';lastErrorClass='QUOTA_EXHAUSTED';candidateHead='fb2093860d30fc24836ae20c136ef0d38da830c6';candidateTree='ed9501e99062dcdc32bf8bf83a0b4a5229cc00b6';diffHash='sha256:2ab242e04bd29eef9d004786f6d08a7b6e161b4f86c9930934f27220eab76cbb';taskSourceHash='sha256:bb69f0b1925f0b30a162790ee5e9f34094446f68a3bfafc4fe9fdc9edcd9d420';workspace='C:\nowhere';providerHistory=@([ordered]@{invocationId='att-rdquota';role='REVIEWER';provider='codex';providerClass='QUOTA_EXHAUSTED';resultClass='AGENT_FAILURE'})}
        }
        Assert-True (Test-DispatcherAuthorizedReviewSuccessionState -State (New-ReviewSuccessionState)) 'the exact closed succession state was rejected'
        foreach($case in @(
            @{field='candidateHead';value='0'*40},
            @{field='diffHash';value='sha256:'+('0'*64)},
            @{field='taskVersionId';value='1'*64},
            @{field='runId';value='run-attacker-0000000000000000000000000'},
            @{field='lastErrorClass';value='PROVIDER_UNAVAILABLE'},
            @{field='reviewerProvider';value='claude'},
            @{field='reviewerProvider';value='glm'},
            @{field='provider';value='glm'},
            @{field='provider';value='codex'},
            @{field='model';value='deepseek-v4-flash'},
            @{field='profile';value='CRITICAL'},
            @{field='status';value='RUNNING'},
            @{field='status';value='WAITING_HUMAN'},
            @{field='stage';value='IMPLEMENT'},
            @{field='taskId';value='PB1-P02-other-task'}
        )){
            $wrong=New-ReviewSuccessionState;$wrong[$case.field]=$case.value
            Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionState -State $wrong)) ("closed succession accepted a mutated $($case.field)")
        }
        $wrongHistory=New-ReviewSuccessionState;$wrongHistory.providerHistory=@([ordered]@{provider='codex';providerClass='AGENT_FAILURE';resultClass='AGENT_FAILURE'})
        Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionState -State $wrongHistory)) 'closed succession accepted a non-quota failure history'
        $wrongLast=New-ReviewSuccessionState;$wrongLast.providerHistory=@([ordered]@{provider='claude';providerClass='QUOTA_EXHAUSTED';resultClass='AGENT_FAILURE'})
        Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionState -State $wrongLast)) 'closed succession accepted a non-codex reviewer failure history'
    }
    Check 'GL-12' {
        $state=[ordered]@{taskId='PB1-P02-audit-service';taskVersionId='9072101439aa09bbb494e28b3e2c8e985dcb91d0235d68ff7f7164b2ada65798';runId='run-31fa07ca662c48b087d32ad0666e9a22';status='WAITING_PROVIDER';stage='REVIEW';provider='deepseek';model='deepseek-v4-pro';profile='REASONING';reviewerProvider='codex';lastErrorClass='QUOTA_EXHAUSTED';candidateHead='fb2093860d30fc24836ae20c136ef0d38da830c6';diffHash='sha256:2ab242e04bd29eef9d004786f6d08a7b6e161b4f86c9930934f27220eab76cbb';taskSourceHash='sha256:bb69f0b1925f0b30a162790ee5e9f34094446f68a3bfafc4fe9fdc9edcd9d420';workspace='C:\nowhere';providerHistory=@([ordered]@{provider='codex';providerClass='QUOTA_EXHAUSTED';resultClass='AGENT_FAILURE'})}
        $task=[ordered]@{taskId='PB1-P02-audit-service';candidateConstraints=[ordered]@{resumeFromTaskVersionId='9072101439aa09bbb494e28b3e2c8e985dcb91d0235d68ff7f7164b2ada65798';resumeFromCandidateCommit='fb2093860d30fc24836ae20c136ef0d38da830c6'}}
        $contract=[ordered]@{taskVersionId='2'*64}
        $source=[ordered]@{hash='sha256:successor-source-hash-0000000000000000000000'}
        # everything correct except the workspace (checked last) - the successor
        # binding checks below must still be exercised deterministically
        $wrongVersion=[ordered]@{}+$task;$wrongVersion.candidateConstraints=[ordered]@{}+$task.candidateConstraints;$wrongVersion.candidateConstraints.resumeFromTaskVersionId='3'*64
        Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionEligible -State $state -Task $wrongVersion -Contract $contract -TaskSource $source)) 'eligibility accepted a constraint bound to the wrong taskVersionId'
        $wrongCommit=[ordered]@{}+$task;$wrongCommit.candidateConstraints=[ordered]@{}+$task.candidateConstraints;$wrongCommit.candidateConstraints.resumeFromCandidateCommit='0'*40
        Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionEligible -State $state -Task $wrongCommit -Contract $contract -TaskSource $source)) 'eligibility accepted a constraint bound to the wrong candidate commit'
        Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionEligible -State $state -Task $task -Contract ([ordered]@{taskVersionId=$state.taskVersionId}) -TaskSource $source)) 'eligibility accepted the same taskVersionId'
        Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionEligible -State $state -Task $task -Contract $contract -TaskSource ([ordered]@{hash=$state.taskSourceHash}))) 'eligibility accepted the same task source'
        Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionEligible -State $state -Task $task -Contract $contract -TaskSource $source)) 'eligibility accepted a state without the preserved workspace'
    }
    Check 'GL-13' {
        $pinned=[ordered]@{authorizedReviewRoute=[ordered]@{provider='glm';model='zai-coding-plan/glm-5.3';profile='REASONING'}}
        $okRoute=[ordered]@{ok=$true;provider='glm';model='zai-coding-plan/glm-5.3'}
        Assert-DispatcherAuthorizedReviewRoute -State $pinned -Reviewer 'glm' -Profile 'REASONING' -Route $okRoute
        foreach($bad in @(
            @{reviewer='deepseek';profile='REASONING';route=$okRoute},
            @{reviewer='glm';profile='CRITICAL';route=$okRoute},
            @{reviewer='glm';profile='REASONING';route=[ordered]@{ok=$true;provider='glm';model='glm-other-model'}},
            @{reviewer='glm';profile='REASONING';route=[ordered]@{ok=$false;provider='glm';model=''}}
        )){
            $failed=$false
            try{Assert-DispatcherAuthorizedReviewRoute -State $pinned -Reviewer $bad.reviewer -Profile $bad.profile -Route $bad.route}catch{$failed=$_.Exception.Message -match 'authorized review route binding drift'}
            Assert-True ($failed) 'route pin accepted a wrong reviewer, profile, model, or unavailable route'
        }
        Assert-DispatcherAuthorizedReviewRoute -State ([ordered]@{}) -Reviewer 'codex' -Profile 'CRITICAL' -Route ([ordered]@{ok=$false}) # no pin -> no-op
        Assert-True (-not (Resolve-Provider -Profile CRITICAL -Provider 'glm').ok) 'generic CRITICAL implementation route was relaxed for GLM'
        Assert-True ((Resolve-Provider -Profile REASONING -Provider 'glm').model -eq 'zai-coding-plan/glm-5.3') 'pinned REASONING review route lost the exact model'
    }
    Check 'GL-14' {
        # The closed succession may never be reachable from a well-formed but
        # DIFFERENT lineage: any state that misses one exact binding fails the
        # pure predicate, so the hold/resume wiring can only ever fire for the
        # single authorized candidate.
        $foreign=[ordered]@{taskId='PB1-P09-other';taskVersionId='4'*64;runId='run-foreign';status='WAITING_PROVIDER';stage='REVIEW';provider='deepseek';model='deepseek-v4-pro';profile='REASONING';reviewerProvider='codex';lastErrorClass='QUOTA_EXHAUSTED';candidateHead='5'*40;diffHash='sha256:'+('6'*64);providerHistory=@([ordered]@{provider='codex';providerClass='QUOTA_EXHAUSTED'})}
        Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionState -State $foreign)) 'a foreign WAITING_PROVIDER/REVIEW lineage matched the closed succession'
        Assert-True (-not (Test-DispatcherAuthorizedReviewSuccessionEligible -State $foreign -Task ([ordered]@{taskId='PB1-P09-other';candidateConstraints=@{}}) -Contract ([ordered]@{taskVersionId='7'*64}) -TaskSource ([ordered]@{hash='sha256:x'}))) 'a foreign lineage passed full eligibility'
    }
    Check 'GL-15' {
        # Real GLM shape: explanatory prose followed by a fenced ```json block
        # carrying the structured decision fields.
        $prose="All checks pass. Implementation complete:`n`n- state machine added`n- service validation`n`n``````json`n{`n  `"resultClass`": `"SUCCESS`",`n  `"taskVersion`": `"a8b65877877bcb7bc6c2ac75442219b2543358f8d6060aeb586ee181058b9a62`",`n  `"summary`": `"work-order state machine implemented`",`n  `"acceptanceCoverage`": { `"AC1`": `"covered`" },`n  `"filesChanged`": { `"backendAdded`": [`"work-order-state.machine.ts`"] },`n  `"verification`": { `"typecheck`": `"exit 0`" },`n  `"caveats`": []`n}`n``````"
        $lines=@(
            '{"type":"step_start","part":{"type":"step-start"}}',
            ('{"type":"text","part":{"type":"text","text":'+($prose|ConvertTo-Json -Compress)+'}}'),
            '{"type":"step_finish","part":{"type":"step-finish","reason":"stop","tokens":{"total":163727,"input":327,"output":1271,"reasoning":785,"cache":{"write":0,"read":161344}},"cost":0}}'
        )
        $parsed=ConvertFrom-RealGlmOutput (($lines -join "`n")+"`n")
        Assert-True ($parsed.structured -and $parsed.structured.resultClass -eq 'SUCCESS') 'prose plus fenced structured JSON did not parse as a structured result'
        $schemaPath=Join-Path (Get-RepoRoot) '.orchestration\v2\schemas\agent-result.schema.json'
        $schema=Get-Content -Raw -LiteralPath $schemaPath|ConvertFrom-Json
        $errors=Test-JsonSchema (ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $parsed.structured)) $schema
        Assert-True ($errors.Count -eq 0) "normalized envelope failed the frozen agent-result schema: $($errors -join '; ')"
        Assert-True ($parsed.structured.summary -eq 'work-order state machine implemented') 'normalized envelope lost the provider summary'
        Assert-True (Test-GlmFinalStructuredEvent @($parsed.events)) 'terminal step_finish was not recognized beside prose'
        $multi="First block (ignored).`n`n``````json`n{`"resultClass`": `"TEST_FAILURE`",`"summary`": `"stale earlier block`"}`n```````n`nMore prose.`n`n``````json`n{`"resultClass`": `"SUCCESS`",`"summary`": `"latest block`"}`n``````"
        $last=ConvertFrom-GlmStructuredText $multi
        Assert-True ($last -and $last.resultClass -eq 'SUCCESS' -and $last.summary -eq 'latest block') 'the LAST valid fenced json block was not selected'
        $generic="Prose only.`n`n``````{`"resultClass`": `"SUCCESS`",`"summary`": `"generic fence`"}`n``````"
        $fromGeneric=ConvertFrom-GlmStructuredText $generic
        Assert-True ($fromGeneric -and $fromGeneric.resultClass -eq 'SUCCESS') 'a generic fenced block with the expected fields was not accepted'
        $unmarked="Prose with an unrelated fence.`n`n``````{`"notes`": `"no decision fields`"}`n``````"
        Assert-True (-not (ConvertFrom-GlmStructuredText $unmarked)) 'a generic fence without expected structured fields was accepted'
        Assert-True (-not (ConvertFrom-GlmStructuredText "plain prose without any fence")) 'plain prose produced a structured result'
    }
    Check 'GL-16' {
        $whole=ConvertFrom-GlmStructuredText '{"schemaVersion":"orcivo.orchestration.v2.agent-result/1","role":"IMPLEMENTER","resultClass":"BLOCK","summary":"blocked","decisions":[],"tests":[],"nextAction":"none","importantArtifacts":[]}'
        Assert-True ($whole -and $whole.resultClass -eq 'BLOCK' -and $whole.role -eq 'IMPLEMENTER') 'a full whole-text envelope was altered by normalization'
        $invalid=ConvertFrom-GlmStructuredText ("``````json`n{`"resultClass`": `"NOT_A_CLASS`"}`n``````")
        Assert-True (-not $invalid) 'an out-of-enum resultClass was accepted'
        $truncated="``````json`n{`"resultClass`": `"SUCCESS`""
        Assert-True (-not (ConvertFrom-GlmStructuredText $truncated)) 'an unterminated/malformed fence produced a structured result'
        $blocks=@(Get-GlmFencedBlocks -Text ("before`n``````js`ncode()`n```````nmiddle`n``````json`n{}`n```````nafter"))
        Assert-True ($blocks.Count -eq 2 -and "$($blocks[0].tag)" -eq 'js' -and "$($blocks[1].tag)" -eq 'json') 'bounded fence scanner mis-parsed tags or blocks'
    }
}finally{
    $results|ForEach-Object{Write-Output $_}
    $fails=@($results|Where-Object{$_ -match ' FAIL:'});Write-Output ("GLM_TESTS: "+$(if($fails.Count){'FAIL'}else{'PASS'})+" ($($results.Count-$fails.Count)/$($results.Count) PASS)")
    if(Test-Path -LiteralPath $root){Remove-Item -LiteralPath $root -Recurse -Force}
}
if(@($results|Where-Object{$_ -match ' FAIL:'}).Count){exit 1}
