param()
$ErrorActionPreference='Stop'
$v2=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$root=Join-Path ([IO.Path]::GetTempPath()) ('orcivo-deepseek-tests-'+[guid]::NewGuid().ToString('N'))
$results=New-Object System.Collections.Generic.List[object]
function Check([string]$Id,[scriptblock]$Body){try{& $Body;$results.Add("$Id PASS")}catch{$results.Add("$Id FAIL: $($_.Exception.Message)")}}
function Assert-True($Value,[string]$Message){if(-not $Value){throw $Message}}
function Write-TestJson([string]$Path,$Value){New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path)|Out-Null;[IO.File]::WriteAllText($Path,($Value|ConvertTo-Json -Depth 20),(New-Object Text.UTF8Encoding($false)))}
try{
    . (Join-Path $v2 'lib-v2.ps1');. (Join-Path $v2 'classify.ps1');. (Join-Path $v2 'real-agent.ps1')
    $runtime=Join-Path $root 'provider-runtime.v1.json';$script:DeepSeekRuntimePath=$runtime;$script:DeepSeekBudgetDir=Join-Path $root 'budgets'
    $cfg=[ordered]@{schemaVersion='orcivo.orchestration.v2.provider-runtime/1';enabled=$true;enabledProviders=@('deepseek','codex');excludedProviders=@('claude');budgets=[ordered]@{monthlyDeepSeekBudgetUsd=5};deepseek=[ordered]@{baseUrl='https://api.deepseek.com/';wireApi='responses';envKey='DEEPSEEK_API_KEY';codexHomeRoot='orcivo-dispatcher/providers/deepseek-codex';profiles=[ordered]@{FAST=[ordered]@{model='deepseek-v4-flash';reasoning='low';maxEstimatedUsd=0.03};BALANCED=[ordered]@{model='deepseek-v4-pro';reasoning='high';maxEstimatedUsd=0.20};REASONING=[ordered]@{model='deepseek-v4-pro';reasoning='high';maxEstimatedUsd=0.20}};pricing=[ordered]@{status='VERIFIED';effectiveDate='2026-09-07';source='fixture-only deterministic price table';models=[ordered]@{'deepseek-v4-flash'=[ordered]@{inputPerMillionUsd=1;outputPerMillionUsd=1};'deepseek-v4-pro'=[ordered]@{inputPerMillionUsd=2;outputPerMillionUsd=2}}}};codex=[ordered]@{profiles=[ordered]@{CRITICAL=[ordered]@{model='gpt-5.6-terra';reasoning='high'}}}}
    Write-TestJson $runtime $cfg
    Check 'DS-01' {Assert-True ((Get-DeepSeekModelPlan FAST).model -eq 'deepseek-v4-flash') 'LOW did not select Flash';Assert-True ((Get-DeepSeekModelPlan BALANCED).reasoning -eq 'high') 'NORMAL did not select Pro/high'}
    Check 'DS-02' {foreach($case in @(@(401,'TEMPORARY_AUTH_FAILURE'),@(402,'QUOTA_EXHAUSTED'),@(429,'RATE_LIMIT'),@(500,'PROVIDER_UNAVAILABLE'),@(503,'PROVIDER_UNAVAILABLE'))){$control=[ordered]@{isError=$true;httpStatus=$case[0];errorType='http';message='provider response'};$legacy=Get-FailureClassV2 -Provider deepseek -ExitCode 1 -Control $control;$canonical=ConvertTo-CanonicalFailureClass $legacy $control;Assert-True ($canonical -eq $case[1]) "HTTP $($case[0]) classified $canonical"}}
    Check 'DS-03' {$legacy=Get-FailureClassV2 -Provider deepseek -ExitCode 0 -Control $null;Assert-True ($legacy -eq 'INCOMPLETE_PROVIDER_RESULT') 'exit zero without terminal event became success';$timeout=ConvertTo-CanonicalFailureClass (Get-FailureClassV2 -Provider deepseek -ExitCode 124 -Control $null) $null;Assert-True ($timeout -eq 'TRANSIENT_PROVIDER_NETWORK') 'timeout was not temporary transport'}
    Check 'DS-04' {$homeBefore=$env:CODEX_HOME;$launch=Get-DeepSeekLaunchConfiguration -Model deepseek-v4-flash -Reasoning low;Assert-True ($launch.codexHome -match 'orcivo-dispatcher[\\/]providers[\\/]deepseek-codex$') 'CODEX_HOME is not isolated';Assert-True ($env:CODEX_HOME -eq $homeBefore) 'DeepSeek mutated parent Codex Plus home';Assert-True (($launch.configArgs -join ' ') -match 'wire_api') 'Responses wire API missing'}
    Check 'DS-05' {$entry=Register-DeepSeekUsage -Usage ([ordered]@{inputTokens=1000;outputTokens=1000;cachedTokens=100}) -InvocationId ('att-'+('a'*32)) -Model deepseek-v4-flash -ResultClass SUCCESS -ExitCode 0;Assert-True ([decimal]$entry.costUsd -gt 0) 'usage cost was not recorded';$status=Get-DeepSeekBudgetStatus;Assert-True ($status.spentUsd -gt 0 -and $status.remainingUsd -lt 5) 'durable budget did not decrease'}
    Check 'DS-06' {$cfg.deepseek.pricing.status='UNCONFIGURED';Write-TestJson $runtime $cfg;$status=Get-DeepSeekBudgetStatus;Assert-True (-not $status.ok -and $status.reason -match 'prices') 'unverified price table did not fail closed'}
    Check 'DS-07' {$events=@([pscustomobject]@{type='response.completed';response=[pscustomobject]@{usage=[pscustomobject]@{input_tokens=3;output_tokens=2;cached_tokens=1}}});Assert-True (Test-DeepSeekFinalStructuredEvent $events) 'final Responses event was rejected';$usage=Get-DeepSeekUsageFromEvents $events;Assert-True ($usage.inputTokens -eq 3 -and $usage.cachedTokens -eq 1) 'usage/cache telemetry parse failed'}
    Check 'DS-08' {$plan=Get-OrcivoCodexModelPlan CRITICAL;Assert-True ($plan.ok -and $plan.model -eq 'gpt-5.6-terra' -and $plan.reasoning -eq 'high') 'HIGH did not pin Codex Plus Terra/high'}
}finally{
    $results|ForEach-Object{Write-Output $_}
    $fails=@($results|Where-Object{$_ -match ' FAIL:'});Write-Output ("DEEPSEEK_TESTS: "+$(if($fails.Count){'FAIL'}else{'PASS'})+" ($($results.Count-$fails.Count)/$($results.Count) PASS)")
    if(Test-Path -LiteralPath $root){Remove-Item -LiteralPath $root -Recurse -Force}
}
if(@($results|Where-Object{$_ -match ' FAIL:'}).Count){exit 1}
