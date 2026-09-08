<#
DeepSeek is an external Responses-compatible provider, deliberately isolated
from the owner's ChatGPT Plus Codex home.  This module contains no credential
writer: DEEPSEEK_API_KEY is inherited only by the launched child process.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:DeepSeekRuntimePath = Join-Path (Get-V2Dir) 'provider-runtime.v1.json'
$script:DeepSeekBudgetDir = Join-Path (Get-V2Dir) 'provider-budgets'

function Get-DeepSeekRuntimeConfig {
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
    $priceReady=[string]$cfg.deepseek.pricing.status -eq 'VERIFIED'
    return [ordered]@{ok=($cfg.enabled -and $priceReady -and $cap -gt 0 -and $spent -le $cap);reason=$(if(-not $cfg.enabled){[string]$cfg.reason}elseif(-not $priceReady){'DeepSeek prices are not verified in offline runtime configuration'}elseif($spent -gt $cap){'DeepSeek monthly budget exhausted'}else{'ok'});month=$At.ToString('yyyy-MM');capUsd=$cap;spentUsd=$spent;remainingUsd=($cap-$spent);pricingStatus=[string]$cfg.deepseek.pricing.status;path=$path}
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
    param([Parameter(Mandatory)]$Usage,[Parameter(Mandatory)][string]$InvocationId,[Parameter(Mandatory)][string]$Model,[Parameter(Mandatory)][string]$ResultClass,[Parameter(Mandatory)][int]$ExitCode)
    $cfg=Get-DeepSeekRuntimeConfig
    if([string]$cfg.deepseek.pricing.status -ne 'VERIFIED'){throw 'DeepSeek telemetry: prices are not verified'}
    $price=$cfg.deepseek.pricing.models.$Model
    if(-not $price -or $null -eq $price.inputPerMillionUsd -or $null -eq $price.outputPerMillionUsd){throw "DeepSeek telemetry: missing tested price for $Model"}
    $cached=$(if($null -eq $Usage.cachedTokens){0}else{[int64]$Usage.cachedTokens})
    if($cached -gt [int64]$Usage.inputTokens){throw 'DeepSeek telemetry: cached token count exceeds input'}
    $cost=(([decimal]$Usage.inputTokens*[decimal]$price.inputPerMillionUsd)+([decimal]$Usage.outputTokens*[decimal]$price.outputPerMillionUsd))/1000000
    if($cached -gt 0 -and $null -ne $price.cachedInputPerMillionUsd){$cost-=(([decimal]$cached*([decimal]$price.inputPerMillionUsd-[decimal]$price.cachedInputPerMillionUsd))/1000000)}
    $path=Get-DeepSeekBudgetPath;New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path)|Out-Null
    $prior=$(if(Test-Path -LiteralPath $path){Read-V2Json $path}else{[ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-budget/1';month=(Get-Date).ToUniversalTime().ToString('yyyy-MM');spentUsd=0;invocations=@()}})
    if(@($prior.invocations|Where-Object{[string]$_.invocationId -eq $InvocationId}).Count){return [ordered]@{costUsd=$cost;reused=$true}}
    $entry=[ordered]@{invocationId=$InvocationId;model=$Model;inputTokens=[int64]$Usage.inputTokens;outputTokens=[int64]$Usage.outputTokens;cachedTokens=$(if($null -eq $Usage.cachedTokens){$null}else{[int64]$Usage.cachedTokens});costUsd=$cost;resultClass=$ResultClass;exitCode=$ExitCode;recordedAt=(Get-Date).ToUniversalTime().ToString('o')}
    $prior.invocations=@($prior.invocations)+@($entry);$prior.spentUsd=([decimal]$prior.spentUsd+$cost);Write-V2JsonCanonical $path $prior
    return $entry
}
