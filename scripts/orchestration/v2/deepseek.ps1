<#
DeepSeek is an external Responses-compatible provider, deliberately isolated
from the owner's ChatGPT Plus Codex home.  This module contains no credential
writer: DEEPSEEK_API_KEY is inherited only by the launched child process.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:DeepSeekRuntimePath = Join-Path (Get-V2Dir) 'provider-runtime.v1.json'
$script:DeepSeekBudgetDir = Join-Path (Get-V2Dir) 'provider-budgets'
$script:DeepSeekPriceRegistryPath = Join-Path $PSScriptRoot 'deepseek-price-registry.v1.json'

function Get-DeepSeekPriceManifest {
    param([datetime]$At=(Get-Date).ToUniversalTime(),[string]$RegistryPath=$script:DeepSeekPriceRegistryPath,[switch]$SkipRuntimeBinding)
    $deny={param([string]$Reason)[ordered]@{ok=$false;reason=$Reason}}
    if(-not $RegistryPath -or -not(Test-Path -LiteralPath $RegistryPath)){return (&$deny 'DeepSeek price registry is missing')}
    try{$m=Read-V2Json $RegistryPath}catch{return (&$deny 'DeepSeek price registry is unreadable')}
    if([string]$m.schemaVersion -ne 'orcivo.orchestration.v2.deepseek-price-registry/1'){return (&$deny 'DeepSeek price registry schema is invalid')}
    $signed=[ordered]@{};foreach($k in $m.Keys){if($k -ne 'manifestHash'){$signed[$k]=$m[$k]}}
    if([string]$m.manifestHash -notmatch '^sha256:[0-9a-f]{64}$' -or [string]$m.manifestHash -ne (New-ContentHash $signed)){return (&$deny 'DeepSeek price registry hash is invalid')}
    if([string]$m.sourceUrl -ne 'https://api-docs.deepseek.com/quick_start/pricing' -or [string]$m.currency -ne 'USD' -or [string]$m.unit -ne 'USD_PER_1M_TOKENS' -or [string]$m.timezone -ne 'UTC'){return (&$deny 'DeepSeek price registry metadata is invalid')}
    try{$expires=([datetime]$m.expiresAt).ToUniversalTime()}catch{return (&$deny 'DeepSeek price registry expiry is invalid')}
    if($At.ToUniversalTime() -ge $expires){return (&$deny 'DeepSeek price registry is expired')}
    if((@($m.peak.weekdays) -join ',') -ne 'Monday,Tuesday,Wednesday,Thursday,Friday' -or @($m.peak.windows).Count -ne 2 -or [string]$m.peak.windows[0].start -ne '01:00' -or [string]$m.peak.windows[0].end -ne '04:00' -or [string]$m.peak.windows[1].start -ne '06:00' -or [string]$m.peak.windows[1].end -ne '10:00'){return (&$deny 'DeepSeek price registry peak schedule is invalid')}
    foreach($model in @('deepseek-v4-pro','deepseek-v4-flash')){
        $row=$m.models.$model
        $resolved=$(if($model -eq 'deepseek-v4-pro'){'DeepSeek-V4-Pro-0813'}else{'DeepSeek-V4-Flash-0731'})
        if(-not $row -or [string]$row.resolvedModel -ne $resolved){return (&$deny "DeepSeek price registry model binding is invalid for $model")}
        foreach($period in @('OFF_PEAK','PEAK')){foreach($field in @('cachedInput','uncachedInput','output')){try{$v=[decimal]$row.$period.$field}catch{return (&$deny "DeepSeek price registry price is invalid for $model/$period/$field")};if($v -lt 0){return (&$deny "DeepSeek price registry price is negative for $model/$period/$field")}}}
    }
    if(-not $SkipRuntimeBinding){
        $cfg=Get-DeepSeekRuntimeConfig -SkipPricingBinding
        if(-not $cfg.enabled){return (&$deny ([string]$cfg.reason))}
        if([string]$cfg.deepseek.pricing.status -ne 'VERIFIED' -or [string]$cfg.deepseek.pricing.manifestHash -ne [string]$m.manifestHash){return (&$deny 'DeepSeek runtime is not bound to the verified price registry')}
    }
    return [ordered]@{ok=$true;manifest=$m;manifestHash=[string]$m.manifestHash;expiresAt=$expires}
}

function Get-DeepSeekPricingPeriod {
    param([datetime]$At=(Get-Date).ToUniversalTime())
    try{$utc=$At.ToUniversalTime()}catch{throw 'DeepSeek pricing period cannot be determined'}
    if($utc.Kind -ne [DateTimeKind]::Utc){throw 'DeepSeek pricing period cannot be determined'}
    if($utc.DayOfWeek -in @([DayOfWeek]::Saturday,[DayOfWeek]::Sunday)){return 'OFF_PEAK'}
    $minute=$utc.Hour*60+$utc.Minute
    if(($minute -ge 60 -and $minute -lt 240) -or ($minute -ge 360 -and $minute -lt 600)){return 'PEAK'}
    return 'OFF_PEAK'
}

function Get-DeepSeekReturnedModel {
    param([object[]]$Events)
    $models=@()
    foreach($event in @($Events)){
        foreach($candidate in @($event.model,$event.response.model,$event.item.model)){
            if($candidate){$models+=,[string]$candidate}
        }
    }
    return @($models|Select-Object -Unique)
}

function Test-DeepSeekReturnedModel {
    param([Parameter(Mandatory)][string]$RequestedModel,[Parameter(Mandatory)][string[]]$ReturnedModels)
    $p=Get-DeepSeekPriceManifest
    if(-not $p.ok){return $false}
    $expected=[string]$p.manifest.models.$RequestedModel.resolvedModel
    return (@($ReturnedModels).Count -eq 1 -and [string]$ReturnedModels[0] -eq $expected)
}

function Enable-DeepSeekVerifiedPricing {
    $p=Get-DeepSeekPriceManifest -SkipRuntimeBinding
    if(-not $p.ok){throw "DeepSeek pricing: $($p.reason)"}
    $cfg=Get-DeepSeekRuntimeConfig -SkipPricingBinding
    if(-not $cfg.enabled){throw "DeepSeek pricing: $($cfg.reason)"}
    $cfg.deepseek.pricing=[ordered]@{status='VERIFIED';registry='scripts/orchestration/v2/deepseek-price-registry.v1.json';manifestHash=$p.manifestHash;sourceUrl=[string]$p.manifest.sourceUrl;verifiedAt=[string]$p.manifest.verifiedAt;expiresAt=[string]$p.manifest.expiresAt}
    Write-V2JsonCanonical $script:DeepSeekRuntimePath $cfg
    return (Get-DeepSeekPriceManifest)
}

function Get-DeepSeekRuntimeConfig {
    param([switch]$SkipPricingBinding)
    if(-not(Test-Path -LiteralPath $script:DeepSeekRuntimePath)){
        return [ordered]@{enabled=$false;reason='missing provider runtime configuration';pricingStatus='UNCONFIGURED'}
    }
    try{$cfg=Read-V2Json $script:DeepSeekRuntimePath}catch{return [ordered]@{enabled=$false;reason='invalid provider runtime configuration';pricingStatus='UNCONFIGURED'}}
    if([string]$cfg.schemaVersion -ne 'orcivo.orchestration.v2.provider-runtime/1' -or -not $cfg.deepseek){return [ordered]@{enabled=$false;reason='invalid provider runtime schema';pricingStatus='UNCONFIGURED'}}
    $d=$cfg.deepseek
    if([string]$d.baseUrl -ne 'https://api.deepseek.com/' -or [string]$d.wireApi -ne 'responses' -or [string]$d.envKey -ne 'DEEPSEEK_API_KEY'){return [ordered]@{enabled=$false;reason='DeepSeek endpoint or credential mechanism is not the approved Responses env-key configuration';pricingStatus='UNCONFIGURED'}}
    if([string]$d.codexHomeRoot -ne 'orcivo-dispatcher/providers/deepseek-codex'){return [ordered]@{enabled=$false;reason='DeepSeek CODEX_HOME root is not isolated';pricingStatus='UNCONFIGURED'}}
    return $cfg
}

function Get-OrcivoEnabledProviders {
    $runtime=Get-DeepSeekRuntimeConfig
    if($runtime.enabledProviders){return @($runtime.enabledProviders|Where-Object{$_ -in @('deepseek','codex','claude') -and @($runtime.excludedProviders) -notcontains $_}|Select-Object -Unique)}
    return @((Get-V2Config).providerFailover.order)
}

function Get-DeepSeekCodexHome {
    $cfg=Get-DeepSeekRuntimeConfig
    if(-not $cfg.enabled){throw "DeepSeek runtime is disabled: $($cfg.reason)"}
    $base=[Environment]::GetFolderPath('LocalApplicationData')
    if(-not $base){throw 'DeepSeek runtime: LOCALAPPDATA is unavailable'}
    $target=[IO.Path]::GetFullPath((Join-Path $base ([string]$cfg.deepseek.codexHomeRoot)))
    $allowed=[IO.Path]::GetFullPath((Join-Path $base 'orcivo-dispatcher\providers'))
    $prefix=$allowed.TrimEnd([char[]]@('\','/'))+[IO.Path]::DirectorySeparatorChar
    if(-not $target.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'DeepSeek runtime: isolated CODEX_HOME escapes its runtime root'}
    New-Item -ItemType Directory -Force -Path $target|Out-Null
    return $target
}

function Get-DeepSeekModelPlan {
    param([Parameter(Mandatory)][ValidateSet('FAST','BALANCED','REASONING')][string]$Profile)
    $cfg=Get-DeepSeekRuntimeConfig
    if(-not $cfg.enabled){return [ordered]@{ok=$false;reason=[string]$cfg.reason}}
    $plan=$cfg.deepseek.profiles.$Profile
    if(-not $plan -or [string]$plan.model -notin @('deepseek-v4-pro','deepseek-v4-flash') -or [string]$plan.reasoning -notin @('low','medium','high')){return [ordered]@{ok=$false;reason="DeepSeek profile '$Profile' is invalid"}}
    return [ordered]@{ok=$true;model=[string]$plan.model;reasoning=[string]$plan.reasoning}
}

function Get-OrcivoCodexModelPlan {
    param([Parameter(Mandatory)][ValidateSet('CRITICAL')][string]$Profile)
    $cfg=Get-DeepSeekRuntimeConfig;$plan=$cfg.codex.profiles.$Profile
    if(-not $plan -or [string]$plan.model -ne 'gpt-5.6-terra' -or [string]$plan.reasoning -ne 'high'){return [ordered]@{ok=$false;reason="Codex profile '$Profile' is not an approved Terra/high plan"}}
    return [ordered]@{ok=$true;model=[string]$plan.model;reasoning=[string]$plan.reasoning}
}

function Get-DeepSeekBudgetPath {
    param([datetime]$At=(Get-Date).ToUniversalTime())
    return (Join-Path $script:DeepSeekBudgetDir ('deepseek-'+$At.ToString('yyyy-MM')+'.json'))
}

function Get-DeepSeekBudgetStatus {
    param([datetime]$At=(Get-Date).ToUniversalTime())
    $cfg=Get-DeepSeekRuntimeConfig;$cap=$(if($cfg.budgets){[decimal]$cfg.budgets.monthlyDeepSeekBudgetUsd}else{[decimal]0})
    $record=$null;$path=Get-DeepSeekBudgetPath $At
    if(Test-Path -LiteralPath $path){try{$record=Read-V2Json $path}catch{return [ordered]@{ok=$false;reason='DeepSeek budget telemetry is unreadable';capUsd=$cap;spentUsd=0;remainingUsd=0}}}
    $spent=$(if($record){[decimal]$record.spentUsd}else{[decimal]0})
    $telemetryBad=[bool]($record -and @($record.invocations|Where-Object{$null -eq $_.costUsd -or [string]$_.telemetryStatus -eq 'UNKNOWN'}).Count -gt 0)
    $pricing=Get-DeepSeekPriceManifest -At $At
    return [ordered]@{ok=($cfg.enabled -and $pricing.ok -and -not $telemetryBad -and $cap -gt 0 -and $spent -le $cap);reason=$(if(-not $cfg.enabled){[string]$cfg.reason}elseif(-not $pricing.ok){[string]$pricing.reason}elseif($telemetryBad){'DeepSeek budget telemetry contains an unknown cost'}elseif($spent -gt $cap){'DeepSeek monthly budget exhausted'}else{'ok'});month=$At.ToString('yyyy-MM');capUsd=$cap;spentUsd=$spent;remainingUsd=($cap-$spent);pricingStatus=$(if($pricing.ok){'VERIFIED'}else{'UNCONFIGURED'});pricingManifestHash=$(if($pricing.ok){$pricing.manifestHash}else{$null});path=$path}
}

function Assert-DeepSeekInvocationBudget {
    param([Parameter(Mandatory)][decimal]$EstimatedUsd)
    $status=Get-DeepSeekBudgetStatus
    if($EstimatedUsd -le 0){throw 'DeepSeek budget: a positive preflight estimate is required'}
    if(-not $status.ok -or $EstimatedUsd -gt [decimal]$status.remainingUsd){throw "DeepSeek budget: $($status.reason); estimated=$EstimatedUsd remaining=$($status.remainingUsd)"}
    return $status
}

function Get-DeepSeekLaunchConfiguration {
    param([Parameter(Mandatory)][string]$Model,[Parameter(Mandatory)][ValidateSet('low','medium','high')][string]$Reasoning)
    $cfg=Get-DeepSeekRuntimeConfig
    if(-not $cfg.enabled){throw "DeepSeek runtime is disabled: $($cfg.reason)"}
    [void](Get-DeepSeekCodexHome)
    return [ordered]@{
        codexHome=(Get-DeepSeekCodexHome)
        configArgs=@('-c','model_provider="deepseek"','-c','model_providers.deepseek.base_url="https://api.deepseek.com/"','-c','model_providers.deepseek.wire_api="responses"','-c','model_providers.deepseek.env_key="DEEPSEEK_API_KEY"','-m',$Model,'-c',('model_reasoning_effort="'+$Reasoning+'"'))
        environment=@{CODEX_HOME=(Get-DeepSeekCodexHome)}
    }
}

function Get-DeepSeekUsageFromEvents {
    param([object[]]$Events)
    $usage=$null
    foreach($event in @($Events)){
        if($event.response -and $event.response.usage){$usage=$event.response.usage}
        elseif($event.usage){$usage=$event.usage}
    }
    if(-not $usage){return $null}
    $input=$(if($usage.input_tokens -ne $null){[int64]$usage.input_tokens}elseif($usage.prompt_tokens -ne $null){[int64]$usage.prompt_tokens}else{$null})
    $output=$(if($usage.output_tokens -ne $null){[int64]$usage.output_tokens}elseif($usage.completion_tokens -ne $null){[int64]$usage.completion_tokens}else{$null})
    $cached=$(if($usage.cached_tokens -ne $null){[int64]$usage.cached_tokens}elseif($usage.input_tokens_details -and $usage.input_tokens_details.cached_tokens -ne $null){[int64]$usage.input_tokens_details.cached_tokens}else{$null})
    if($null -eq $input -or $null -eq $output){return $null}
    return [ordered]@{inputTokens=$input;outputTokens=$output;cachedTokens=$(if($null -eq $cached){$null}else{$cached})}
}

function Test-DeepSeekFinalStructuredEvent {
    param([object[]]$Events)
    return (@($Events|Where-Object{[string]$_.type -in @('turn.completed','response.completed')}).Count -gt 0)
}

function Register-DeepSeekUsage {
    param([Parameter(Mandatory)]$Usage,[Parameter(Mandatory)][string]$InvocationId,[Parameter(Mandatory)][string]$Model,[Parameter(Mandatory)][string[]]$ReturnedModels,[Parameter(Mandatory)][string]$ResultClass,[Parameter(Mandatory)][int]$ExitCode,[datetime]$At=(Get-Date).ToUniversalTime())
    if($null -eq $Usage.inputTokens -or $null -eq $Usage.outputTokens){throw 'DeepSeek telemetry: usage is absent'}
    $registry=Get-DeepSeekPriceManifest -At $At
    if(-not $registry.ok){throw "DeepSeek telemetry: $($registry.reason)"}
    if(-not(Test-DeepSeekReturnedModel -RequestedModel $Model -ReturnedModels $ReturnedModels)){throw 'DeepSeek telemetry: returned model does not match the resolved registry model'}
    $period=Get-DeepSeekPricingPeriod -At $At
    $price=$registry.manifest.models.$Model.$period
    if(-not $price){throw "DeepSeek telemetry: missing price period for $Model"}
    $cached=$(if($null -eq $Usage.cachedTokens){0}else{[int64]$Usage.cachedTokens})
    if($cached -gt [int64]$Usage.inputTokens){throw 'DeepSeek telemetry: cached token count exceeds input'}
    $uncached=[int64]$Usage.inputTokens-$cached
    $cost=((([decimal]$cached*[decimal]$price.cachedInput)+([decimal]$uncached*[decimal]$price.uncachedInput)+([decimal]$Usage.outputTokens*[decimal]$price.output))/1000000)
    $path=Get-DeepSeekBudgetPath;New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path)|Out-Null
    $prior=$(if(Test-Path -LiteralPath $path){Read-V2Json $path}else{[ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-budget/1';month=(Get-Date).ToUniversalTime().ToString('yyyy-MM');spentUsd=0;invocations=@()}})
    if(([decimal]$prior.spentUsd+$cost) -gt [decimal](Get-DeepSeekBudgetStatus -At $At).capUsd){throw 'DeepSeek telemetry: actual cost exceeds the monthly budget'}
    if(@($prior.invocations|Where-Object{[string]$_.invocationId -eq $InvocationId}).Count){return [ordered]@{costUsd=$cost;reused=$true}}
    $entry=[ordered]@{invocationId=$InvocationId;model=$Model;returnedModel=[string]$ReturnedModels[0];period=$period;pricingManifestHash=$registry.manifestHash;inputTokens=[int64]$Usage.inputTokens;outputTokens=[int64]$Usage.outputTokens;cachedTokens=$(if($null -eq $Usage.cachedTokens){$null}else{[int64]$Usage.cachedTokens});costUsd=$cost;resultClass=$ResultClass;exitCode=$ExitCode;recordedAt=(Get-Date).ToUniversalTime().ToString('o')}
    $prior.invocations=@($prior.invocations)+@($entry);$prior.spentUsd=([decimal]$prior.spentUsd+$cost);Write-V2JsonCanonical $path $prior
    return $entry
}

function Register-DeepSeekUnknownUsage {
    param([Parameter(Mandatory)][string]$InvocationId,[Parameter(Mandatory)][string]$Model,$Usage,[string[]]$ReturnedModels=@(),[Parameter(Mandatory)][string]$Reason,[Parameter(Mandatory)][string]$ResultClass,[Parameter(Mandatory)][int]$ExitCode)
    $path=Get-DeepSeekBudgetPath;New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path)|Out-Null
    $prior=$(if(Test-Path -LiteralPath $path){Read-V2Json $path}else{[ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-budget/1';month=(Get-Date).ToUniversalTime().ToString('yyyy-MM');spentUsd=0;invocations=@()}})
    if(@($prior.invocations|Where-Object{[string]$_.invocationId -eq $InvocationId}).Count){return [ordered]@{costUsd=$null;reused=$true;telemetryStatus='UNKNOWN'}}
    $entry=[ordered]@{invocationId=$InvocationId;model=$Model;returnedModels=@($ReturnedModels);inputTokens=$(if($Usage){$Usage.inputTokens}else{$null});outputTokens=$(if($Usage){$Usage.outputTokens}else{$null});cachedTokens=$(if($Usage){$Usage.cachedTokens}else{$null});costUsd=$null;telemetryStatus='UNKNOWN';reason=$Reason;resultClass=$ResultClass;exitCode=$ExitCode;recordedAt=(Get-Date).ToUniversalTime().ToString('o')}
    $prior.invocations=@($prior.invocations)+@($entry);Write-V2JsonCanonical $path $prior
    return $entry
}
