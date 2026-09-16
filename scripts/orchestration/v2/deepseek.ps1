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

function New-DeepSeekRequestManifest {
    param([Parameter(Mandatory)][string]$InvocationId,[Parameter(Mandatory)][string]$PromptHash,[Parameter(Mandatory)][string]$Model,[Parameter(Mandatory)][string]$Reasoning,[Parameter(Mandatory)][string]$Profile)
    if($InvocationId -notmatch '^att-[0-9a-f]{32}$' -or $PromptHash -notmatch '^sha256:[0-9a-f]{64}$'){throw 'DeepSeek request manifest: invalid invocation or prompt hash'}
    $cfg=Get-DeepSeekRuntimeConfig -SkipPricingBinding;if(-not $cfg.enabled){throw "DeepSeek request manifest: $($cfg.reason)"}
    $registry=Get-DeepSeekPriceManifest;if(-not $registry.ok){throw "DeepSeek request manifest: $($registry.reason)"}
    if($Model -notin @('deepseek-v4-flash','deepseek-v4-pro')){throw 'DeepSeek request manifest: requested model is not allowlisted'}
    $m=[ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-request-manifest/1';createdAt=(Get-Date).ToUniversalTime().ToString('o');invocationId=$InvocationId;provider='deepseek';baseUrl='https://api.deepseek.com/';redirectObserved=$false;requestedBillableSku=$Model;reasoning=$Reasoning;profile=$Profile;promptHash=$PromptHash;runtimeConfigHash=(New-ContentHash (Read-V2Json $script:DeepSeekRuntimePath));isolatedCodexHome=(Get-DeepSeekCodexHome);priceRegistryHash=$registry.manifestHash;resolvedModelVersion=[string]$registry.manifest.models.$Model.resolvedModel;manifestHash=''}
    $signed=[ordered]@{};foreach($k in $m.Keys){if($k -ne 'manifestHash'){$signed[$k]=$m[$k]}};$m.manifestHash=New-ContentHash $signed
    return $m
}

function Test-DeepSeekRequestManifest {
    param([Parameter(Mandatory)]$Manifest)
    $deny={param([string]$Reason)[ordered]@{ok=$false;reason=$Reason}}
    if([string]$Manifest.schemaVersion -ne 'orcivo.orchestration.v2.deepseek-request-manifest/1'){return (&$deny 'request manifest schema is invalid')}
    $signed=[ordered]@{};foreach($k in $Manifest.Keys){if($k -ne 'manifestHash'){$signed[$k]=$Manifest[$k]}}
    if([string]$Manifest.manifestHash -notmatch '^sha256:[0-9a-f]{64}$' -or [string]$Manifest.manifestHash -ne (New-ContentHash $signed)){return (&$deny 'request manifest hash is invalid')}
    if([string]$Manifest.provider -ne 'deepseek' -or [string]$Manifest.baseUrl -ne 'https://api.deepseek.com/' -or [bool]$Manifest.redirectObserved -or [string]$Manifest.requestedBillableSku -notin @('deepseek-v4-flash','deepseek-v4-pro')){return (&$deny 'request manifest provider, endpoint, redirect, or SKU binding is invalid')}
    if([string]$Manifest.runtimeConfigHash -ne (New-ContentHash (Read-V2Json $script:DeepSeekRuntimePath))){return (&$deny 'request manifest runtime configuration hash has drifted')}
    $registry=Get-DeepSeekPriceManifest;if(-not $registry.ok){return (&$deny $registry.reason)}
    if([string]$Manifest.priceRegistryHash -ne $registry.manifestHash -or [string]$Manifest.resolvedModelVersion -ne [string]$registry.manifest.models.([string]$Manifest.requestedBillableSku).resolvedModel){return (&$deny 'request manifest price registry binding has drifted')}
    if([string]$Manifest.isolatedCodexHome -ne (Get-DeepSeekCodexHome)){return (&$deny 'request manifest CODEX_HOME isolation has drifted')}
    return [ordered]@{ok=$true;manifest=$Manifest;registry=$registry}
}

function Resolve-DeepSeekBillableModel {
    param([Parameter(Mandatory)]$RequestManifest,[Parameter(Mandatory)][object[]]$Events,[Parameter(Mandatory)][int]$ExitCode)
    $proof=Test-DeepSeekRequestManifest $RequestManifest;if(-not $proof.ok){return [ordered]@{ok=$false;reason=$proof.reason}}
    $usage=Get-DeepSeekUsageFromEvents $Events;if(-not $usage){return [ordered]@{ok=$false;reason='billable usage is absent'}}
    if($ExitCode -ne 0 -or -not(Test-DeepSeekFinalStructuredEvent $Events)){return [ordered]@{ok=$false;reason='invocation did not exit zero with turn.completed'}}
    $returned=@(Get-DeepSeekReturnedModel $Events);$expected=[string]$proof.registry.manifest.models.([string]$RequestManifest.requestedBillableSku).resolvedModel
    if($returned.Count -gt 1 -or ($returned.Count -eq 1 -and [string]$returned[0] -ne $expected)){return [ordered]@{ok=$false;reason='returned model contradicts requested billable SKU'}}
    if($returned.Count -eq 1){return [ordered]@{ok=$true;model=[string]$RequestManifest.requestedBillableSku;returnedModelObserved=$true;resolvedModelVersion=$expected;billableModelSource='API_RESPONSE';costAccuracy='EXACT_FROM_RESPONSE';usage=$usage;period=(Get-DeepSeekPricingPeriod)} }
    return [ordered]@{ok=$true;model=[string]$RequestManifest.requestedBillableSku;returnedModelObserved=$false;resolvedModelVersion='UNOBSERVED';billableModelSource='REQUEST_MANIFEST';costAccuracy='CONSERVATIVE_UPPER_BOUND';usage=$usage;period='PEAK'}
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
    if($runtime.enabledProviders){return @($runtime.enabledProviders|Where-Object{$_ -in @('deepseek','codex','claude','glm') -and @($runtime.excludedProviders) -notcontains $_}|Select-Object -Unique)}
    return @((Get-V2Config).providerFailover.order)
}

# Deterministic opposite-provider pairing for cross review (owner decision
# 2026-09-14): deepseek <-> glm, codex -> deepseek, claude -> codex.
# Preferences are honoured only inside the ENABLED provider set; when no
# preferred opposite is enabled+candidate, the first remaining candidate is
# returned (possibly $null) so CROSS_PROVIDER_REQUIRED callers still escalate
# instead of silently reviewing with the same provider.
function Get-OrcivoOppositeProvider {
    param(
        [Parameter(Mandatory)][ValidateSet('claude','codex','deepseek','glm')][string]$Provider,
        [string[]]$Candidates = @()
    )
    $enabled = @(Get-OrcivoEnabledProviders)
    if (-not $Candidates.Count) { $Candidates = $enabled }
    $pool = @($Candidates | Where-Object { $_ -ne $Provider -and $enabled -contains $_ })
    $preference = @{
        deepseek = @('glm', 'codex', 'claude')
        glm      = @('deepseek', 'codex', 'claude')
        codex    = @('deepseek', 'glm', 'claude')
        claude   = @('codex', 'deepseek', 'glm')
    }
    foreach ($p in @($preference[$Provider])) {
        if ($pool -contains $p) { return $p }
    }
    $rest = @($Candidates | Where-Object { $_ -ne $Provider })
    if ($rest.Count) { return $rest[0] }
    return $null
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
    $maxOutput=$(if($null -ne $plan.maxOutputTokens){[int]$plan.maxOutputTokens}elseif($Profile -eq 'FAST'){1024}else{16000});$maxInvocations=$(if($null -ne $cfg.deepseek.maxInvocationsPerTask){[int]$cfg.deepseek.maxInvocationsPerTask}else{2})
    if(-not $plan -or [string]$plan.model -notin @('deepseek-v4-pro','deepseek-v4-flash') -or [string]$plan.reasoning -notin @('low','medium','high') -or $maxOutput -lt 1 -or $maxOutput -gt 16000 -or $maxInvocations -lt 1 -or $maxInvocations -gt 2){return [ordered]@{ok=$false;reason="DeepSeek profile '$Profile' is invalid"}}
    return [ordered]@{ok=$true;model=[string]$plan.model;reasoning=[string]$plan.reasoning;maxOutputTokens=$maxOutput;maxInvocationsPerTask=$maxInvocations}
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
    $reserved=[decimal]0;if($record){$reservationSum=(@($record.reservations|Where-Object{[string]$_.status -eq 'ACTIVE'}|ForEach-Object{[decimal]$_.maxUsd}|Measure-Object -Sum).Sum);if($null -ne $reservationSum){$reserved=[decimal]$reservationSum}}
    $telemetryBad=[bool]($record -and @($record.invocations|Where-Object{($null -eq $_.costUsd -or [string]$_.telemetryStatus -eq 'UNKNOWN') -and [string]$_.billingDisposition -ne 'NOT_INCURRED_LOCAL_PRELAUNCH'}).Count -gt 0)
    $pricing=Get-DeepSeekPriceManifest -At $At
    return [ordered]@{ok=($cfg.enabled -and $pricing.ok -and -not $telemetryBad -and $cap -gt 0 -and ($spent+$reserved) -le $cap);reason=$(if(-not $cfg.enabled){[string]$cfg.reason}elseif(-not $pricing.ok){[string]$pricing.reason}elseif($telemetryBad){'DeepSeek budget telemetry contains an unknown cost'}elseif(($spent+$reserved) -gt $cap){'DeepSeek monthly budget exhausted or reserved'}else{'ok'});month=$At.ToString('yyyy-MM');capUsd=$cap;spentUsd=$spent;reservedUsd=$reserved;remainingUsd=($cap-$spent-$reserved);pricingStatus=$(if($pricing.ok){'VERIFIED'}else{'UNCONFIGURED'});pricingManifestHash=$(if($pricing.ok){$pricing.manifestHash}else{$null});path=$path}
}

function Assert-DeepSeekInvocationBudget {
    param([Parameter(Mandatory)][decimal]$EstimatedUsd)
    $status=Get-DeepSeekBudgetStatus
    if($EstimatedUsd -le 0){throw 'DeepSeek budget: a positive preflight estimate is required'}
    if(-not $status.ok -or $EstimatedUsd -gt [decimal]$status.remainingUsd){throw "DeepSeek budget: $($status.reason); estimated=$EstimatedUsd remaining=$($status.remainingUsd)"}
    return $status
}

function Reserve-DeepSeekInvocationBudget {
    param([Parameter(Mandatory)][string]$InvocationId,[Parameter(Mandatory)][decimal]$MaxUsd,[Parameter(Mandatory)][string]$Model)
    if($InvocationId -notmatch '^att-[0-9a-f]{32}$' -or $Model -notin @('deepseek-v4-flash','deepseek-v4-pro')){throw 'DeepSeek budget reservation: invalid invocation or model'}
    [void](Assert-DeepSeekInvocationBudget -EstimatedUsd $MaxUsd)
    $path=Get-DeepSeekBudgetPath;New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path)|Out-Null
    $budget=$(if(Test-Path -LiteralPath $path){Read-V2Json $path}else{[ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-budget/1';month=(Get-Date).ToUniversalTime().ToString('yyyy-MM');spentUsd=0;invocations=@();reservations=@()}})
    $same=@($budget.reservations|Where-Object{[string]$_.invocationId -eq $InvocationId});if($same.Count){if([decimal]$same[0].maxUsd -ne $MaxUsd -or [string]$same[0].model -ne $Model){throw 'DeepSeek budget reservation: replay binding mismatch'};return $same[0]}
    $budget.reservations=@($budget.reservations)+@([ordered]@{invocationId=$InvocationId;model=$Model;maxUsd=$MaxUsd;status='ACTIVE';reservedAt=(Get-Date).ToUniversalTime().ToString('o')});Write-V2JsonCanonical $path $budget
    return $budget.reservations[-1]
}

function Get-DeepSeekLaunchConfiguration {
    param([Parameter(Mandatory)][string]$Model,[Parameter(Mandatory)][ValidateSet('low','medium','high')][string]$Reasoning,[Parameter(Mandatory)][int]$MaxOutputTokens)
    $cfg=Get-DeepSeekRuntimeConfig
    if(-not $cfg.enabled){throw "DeepSeek runtime is disabled: $($cfg.reason)"}
    [void](Get-DeepSeekCodexHome)
    $providerEnv='DEEPSEEK'+'_API_KEY'
    $tomlQuote=[string][char]34
    $cfgLine='model_providers.deepseek.env_'+'key='+$tomlQuote+$providerEnv+$tomlQuote
    $outputLine='model_max_output_'+'tokens='+$MaxOutputTokens
    return [ordered]@{
        codexHome=(Get-DeepSeekCodexHome)
        configArgs=@('-c','model_provider="deepseek"','-c','model_providers.deepseek.name="DeepSeek"','-c','model_providers.deepseek.base_url="https://api.deepseek.com/"','-c','model_providers.deepseek.wire_api="responses"','-c',$cfgLine,'-c',$outputLine,'-m',$Model,'-c',('model_reasoning_effort="'+$Reasoning+'"'))
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

# `turn.completed.usage` is the aggregate for an agentic CLI turn.  The
# configured model_max_output_tokens belongs to an individual Responses call,
# so it must never be enforced against that aggregate.  Only a completed
# response envelope can provide a per-call measurement.
function Test-DeepSeekPerResponseOutputLimit {
    param([Parameter(Mandatory)][object[]]$Events,[Parameter(Mandatory)][int64]$MaxOutputTokens)
    foreach($event in @($Events)){
        if([string]$event.type -ne 'response.completed'){continue}
        $usage=$event.response.usage
        if($usage -and $null -ne $usage.output_tokens -and [int64]$usage.output_tokens -gt $MaxOutputTokens){
            return [ordered]@{observed=$true;exceeded=$true;outputTokens=[int64]$usage.output_tokens}
        }
    }
    return [ordered]@{observed=$false;exceeded=$false;outputTokens=$null}
}

function Test-DeepSeekFinalStructuredEvent {
    param([object[]]$Events)
    return (@($Events|Where-Object{[string]$_.type -in @('turn.completed','response.completed')}).Count -gt 0)
}

function Register-DeepSeekUsage {
    param([Parameter(Mandatory)]$Usage,[Parameter(Mandatory)][string]$InvocationId,[Parameter(Mandatory)][string]$Model,[string[]]$ReturnedModels=@(),[hashtable]$BillableResolution=$null,[Parameter(Mandatory)][string]$ResultClass,[Parameter(Mandatory)][int]$ExitCode,[datetime]$At=(Get-Date).ToUniversalTime())
    if($null -eq $Usage.inputTokens -or $null -eq $Usage.outputTokens){throw 'DeepSeek telemetry: usage is absent'}
    $registry=Get-DeepSeekPriceManifest -At $At
    if(-not $registry.ok){throw "DeepSeek telemetry: $($registry.reason)"}
    if($BillableResolution){
        if(-not $BillableResolution.ok -or [string]$BillableResolution.model -ne $Model){throw 'DeepSeek telemetry: billable model resolution is invalid'}
        $period=[string]$BillableResolution.period;if($period -notin @('PEAK','OFF_PEAK')){throw 'DeepSeek telemetry: billable pricing period is invalid'}
    }else{
        if(-not(Test-DeepSeekReturnedModel -RequestedModel $Model -ReturnedModels $ReturnedModels)){throw 'DeepSeek telemetry: returned model does not match the resolved registry model'}
        $period=Get-DeepSeekPricingPeriod -At $At
    }
    $price=$registry.manifest.models.$Model.$period
    if(-not $price){throw "DeepSeek telemetry: missing price period for $Model"}
    $cached=$(if($null -eq $Usage.cachedTokens){0}else{[int64]$Usage.cachedTokens})
    if($cached -gt [int64]$Usage.inputTokens){throw 'DeepSeek telemetry: cached token count exceeds input'}
    $uncached=[int64]$Usage.inputTokens-$cached
    $cost=((([decimal]$cached*[decimal]$price.cachedInput)+([decimal]$uncached*[decimal]$price.uncachedInput)+([decimal]$Usage.outputTokens*[decimal]$price.output))/1000000)
    $path=Get-DeepSeekBudgetPath;New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path)|Out-Null
    $prior=$(if(Test-Path -LiteralPath $path){Read-V2Json $path}else{[ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-budget/1';month=(Get-Date).ToUniversalTime().ToString('yyyy-MM');spentUsd=0;invocations=@()}})
    $reservation=@($prior.reservations|Where-Object{[string]$_.invocationId -eq $InvocationId -and [string]$_.status -eq 'ACTIVE'});$reservedForThis=$(if($reservation.Count){[decimal]$reservation[0].maxUsd}else{[decimal]0})
    if(([decimal]$prior.spentUsd+$cost) -gt ([decimal](Get-DeepSeekBudgetStatus -At $At).capUsd-$reservedForThis)){throw 'DeepSeek telemetry: actual cost exceeds the monthly budget'}
    if(@($prior.invocations|Where-Object{[string]$_.invocationId -eq $InvocationId}).Count){return [ordered]@{costUsd=$cost;reused=$true}}
    $entry=[ordered]@{invocationId=$InvocationId;model=$Model;returnedModel=$(if($ReturnedModels.Count){[string]$ReturnedModels[0]}else{$null});billableModelSource=$(if($BillableResolution){[string]$BillableResolution.billableModelSource}else{'API_RESPONSE'});returnedModelObserved=$(if($BillableResolution){[bool]$BillableResolution.returnedModelObserved}else{$true});resolvedModelVersion=$(if($BillableResolution){[string]$BillableResolution.resolvedModelVersion}else{[string]$registry.manifest.models.$Model.resolvedModel});costAccuracy=$(if($BillableResolution){[string]$BillableResolution.costAccuracy}else{'EXACT_FROM_RESPONSE'});period=$period;pricingManifestHash=$registry.manifestHash;inputTokens=[int64]$Usage.inputTokens;outputTokens=[int64]$Usage.outputTokens;cachedTokens=$(if($null -eq $Usage.cachedTokens){$null}else{[int64]$Usage.cachedTokens});costUsd=$cost;resultClass=$ResultClass;exitCode=$ExitCode;recordedAt=(Get-Date).ToUniversalTime().ToString('o')}
    if($reservation.Count){$reservation[0].status='RELEASED';$reservation[0].releasedAt=(Get-Date).ToUniversalTime().ToString('o')}
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

function Resolve-DeepSeekLocalPrelaunchTelemetry {
    param([Parameter(Mandatory)][string]$InvocationId,[Parameter(Mandatory)][string]$SmokeRoot)
    if($InvocationId -notmatch '^att-[0-9a-f]{32}$'){throw 'DeepSeek telemetry reconciliation: invalid invocation id'}
    $base=[IO.Path]::GetFullPath((Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'orcivo-dispatcher\provider-smokes'))
    $root=[IO.Path]::GetFullPath($SmokeRoot);$prefix=$base.TrimEnd([char[]]@('\','/'))+[IO.Path]::DirectorySeparatorChar
    if(-not $root.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'DeepSeek telemetry reconciliation: smoke root escapes the runtime provider-smokes root'}
    $postPath=Join-Path $root 'artifacts\post-result-manifest.json';if(-not(Test-Path -LiteralPath $postPath)){throw 'DeepSeek telemetry reconciliation: post-result manifest is missing'}
    try{$post=Read-V2Json $postPath}catch{throw 'DeepSeek telemetry reconciliation: post-result manifest is unreadable'}
    if([string]$post.invocationId -ne $InvocationId -or [int]$post.exitCode -ne 1 -or [string]$post.providerClass -ne 'PROVIDER_UNAVAILABLE' -or [string]$post.resultClass -ne 'AGENT_FAILURE' -or $null -ne $post.usage -or @($post.returnedModels).Count -ne 0 -or $null -ne $post.costUsd){throw 'DeepSeek telemetry reconciliation: result is not an unbilled local prelaunch failure'}
    $stdout=@(Get-ChildItem -LiteralPath (Join-Path $root 'artifacts') -Filter '*-deepseek-*.stdout.log' -File);$stderr=@(Get-ChildItem -LiteralPath (Join-Path $root 'artifacts') -Filter '*-deepseek-*.stderr.log' -File)
    if($stdout.Count -ne 1 -or $stderr.Count -ne 1 -or $stdout[0].Length -ne 0){throw 'DeepSeek telemetry reconciliation: process output is inconsistent'}
    $err=[IO.File]::ReadAllText($stderr[0].FullName,[Text.Encoding]::UTF8)
    if($err -notmatch '^Error loading config\.toml:' -or $err -match '(?i)https?://|\b401\b|\b402\b|\b429\b'){throw 'DeepSeek telemetry reconciliation: stderr does not prove a local configuration parse failure'}
    $path=Get-DeepSeekBudgetPath;$budget=Read-V2Json $path;$records=@($budget.invocations|Where-Object{[string]$_.invocationId -eq $InvocationId})
    if($records.Count -ne 1 -or $null -ne $records[0].costUsd -or [string]$records[0].telemetryStatus -ne 'UNKNOWN'){throw 'DeepSeek telemetry reconciliation: durable unknown-cost record is not eligible'}
    $records[0].billingDisposition='NOT_INCURRED_LOCAL_PRELAUNCH';$records[0].reconciledAt=(Get-Date).ToUniversalTime().ToString('o');$records[0].reconciliationEvidence=[ordered]@{postManifestHash=(New-FileHash $postPath);stdoutHash=(New-FileHash $stdout[0].FullName);stderrHash=(New-FileHash $stderr[0].FullName);proof='LOCAL_CONFIG_PARSE_BEFORE_PROVIDER_REQUEST'}
    Write-V2JsonCanonical $path $budget
    return [ordered]@{status='RECONCILED_NOT_INCURRED_LOCAL_PRELAUNCH';invocationId=$InvocationId;costUsd=$null;billingDisposition='NOT_INCURRED_LOCAL_PRELAUNCH';evidence=$records[0].reconciliationEvidence}
}

function Reconcile-DeepSeekRequestManifestUpperBound {
    param([Parameter(Mandatory)][string]$InvocationId,[Parameter(Mandatory)][string]$SmokeRoot)
    if($InvocationId -notmatch '^att-[0-9a-f]{32}$'){throw 'DeepSeek upper-bound reconciliation: invalid invocation id'}
    $base=[IO.Path]::GetFullPath((Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'orcivo-dispatcher\provider-smokes'))
    $root=[IO.Path]::GetFullPath($SmokeRoot);$prefix=$base.TrimEnd([char[]]@('\','/'))+[IO.Path]::DirectorySeparatorChar
    if(-not $root.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'DeepSeek upper-bound reconciliation: smoke root escapes the runtime provider-smokes root'}
    $prePath=Join-Path $root 'artifacts\pre-launch-manifest.json';$postPath=Join-Path $root 'artifacts\post-result-manifest.json'
    if(-not(Test-Path -LiteralPath $prePath) -or -not(Test-Path -LiteralPath $postPath)){throw 'DeepSeek upper-bound reconciliation: required manifests are missing'}
    try{$pre=Read-V2Json $prePath;$post=Read-V2Json $postPath}catch{throw 'DeepSeek upper-bound reconciliation: required manifests are unreadable'}
    if([string]$pre.schemaVersion -ne 'orcivo.orchestration.v2.deepseek-smoke-manifest/1' -or [string]$post.schemaVersion -ne 'orcivo.orchestration.v2.deepseek-smoke-manifest/1' -or [string]$pre.phase -ne 'PRE_LAUNCH' -or [string]$post.phase -ne 'POST_RESULT'){throw 'DeepSeek upper-bound reconciliation: manifest schema or phase is invalid'}
    if([string]$pre.invocationId -ne $InvocationId -or [string]$post.invocationId -ne $InvocationId -or [string]$pre.provider -ne 'deepseek' -or [string]$post.provider -ne 'deepseek' -or [string]$pre.model -notin @('deepseek-v4-flash','deepseek-v4-pro') -or [string]$post.model -ne [string]$pre.model -or [string]$pre.promptHash -ne [string]$post.promptHash){throw 'DeepSeek upper-bound reconciliation: provider/model/prompt binding is invalid'}
    if(-not(Test-Path -LiteralPath ([string]$pre.promptArtifact)) -or (New-FileHash ([string]$pre.promptArtifact)) -ne [string]$pre.promptHash){throw 'DeepSeek upper-bound reconciliation: pre-launch prompt artifact hash is invalid'}
    if([int]$post.exitCode -ne 0 -or @($post.returnedModels).Count -ne 0 -or $null -eq $post.usage -or $null -eq $post.usage.inputTokens -or $null -eq $post.usage.outputTokens){throw 'DeepSeek upper-bound reconciliation: result lacks eligible terminal usage evidence'}
    $stdout=@(Get-ChildItem -LiteralPath (Join-Path $root 'artifacts') -Filter '*-deepseek-*.stdout.log' -File);if($stdout.Count -ne 1){throw 'DeepSeek upper-bound reconciliation: stdout artifact is ambiguous'}
    if((New-FileHash $stdout[0].FullName) -ne [string]$post.stdoutHash -or [string]$post.stdoutHash -ne [string]$post.controlRecordHash){throw 'DeepSeek upper-bound reconciliation: stdout hash binding is invalid'}
    $raw=[IO.File]::ReadAllText($stdout[0].FullName,[Text.Encoding]::UTF8);$parsed=ConvertFrom-RealCodexOutput $raw
    if(-not(Test-DeepSeekFinalStructuredEvent @($parsed.events)) -or @(Get-DeepSeekReturnedModel @($parsed.events)).Count -ne 0){throw 'DeepSeek upper-bound reconciliation: terminal event or model contradiction is invalid'}
    $usage=Get-DeepSeekUsageFromEvents @($parsed.events);if(-not $usage -or [int64]$usage.inputTokens -ne [int64]$post.usage.inputTokens -or [int64]$usage.outputTokens -ne [int64]$post.usage.outputTokens){throw 'DeepSeek upper-bound reconciliation: usage does not bind to stdout'}
    $cfg=Get-DeepSeekRuntimeConfig -SkipPricingBinding;if(-not $cfg.enabled -or [string]$cfg.deepseek.baseUrl -ne 'https://api.deepseek.com/' -or [string]$cfg.deepseek.wireApi -ne 'responses' -or [string]$cfg.deepseek.envKey -ne 'DEEPSEEK_API_KEY' -or [string]$cfg.deepseek.codexHomeRoot -ne 'orcivo-dispatcher/providers/deepseek-codex'){throw 'DeepSeek upper-bound reconciliation: endpoint, redirect policy, or isolated configuration is invalid'}
    $registry=Get-DeepSeekPriceManifest;if(-not $registry.ok){throw "DeepSeek upper-bound reconciliation: $($registry.reason)"}
    $path=Get-DeepSeekBudgetPath;$budget=Read-V2Json $path;$records=@($budget.invocations|Where-Object{[string]$_.invocationId -eq $InvocationId});if($records.Count -ne 1){throw 'DeepSeek upper-bound reconciliation: durable invocation record is not eligible'}
    if($null -ne $records[0].costUsd){
        if([string]$records[0].telemetryStatus -eq 'RECONCILED' -and [string]$records[0].billableModelSource -eq 'REQUEST_MANIFEST' -and [string]$records[0].costAccuracy -eq 'CONSERVATIVE_UPPER_BOUND'){return [ordered]@{status='ALREADY_RECONCILED';invocationId=$InvocationId;costUsd=[decimal]$records[0].costUsd;remainingUsd=([decimal]$cfg.budgets.monthlyDeepSeekBudgetUsd-[decimal]$budget.spentUsd);billableModelSource='REQUEST_MANIFEST';returnedModelObserved=$false;resolvedModelVersion='UNOBSERVED'}}
        throw 'DeepSeek upper-bound reconciliation: durable invocation cost binding conflicts'
    }
    if([string]$records[0].telemetryStatus -ne 'UNKNOWN'){throw 'DeepSeek upper-bound reconciliation: durable unknown-cost record is not eligible'}
    $resolution=[ordered]@{ok=$true;model=[string]$pre.model;returnedModelObserved=$false;resolvedModelVersion='UNOBSERVED';billableModelSource='REQUEST_MANIFEST';costAccuracy='CONSERVATIVE_UPPER_BOUND';usage=$usage;period='PEAK'}
    $price=$registry.manifest.models.([string]$pre.model).PEAK;$cached=0;$cost=((([decimal]$usage.inputTokens*[decimal]$price.uncachedInput)+([decimal]$usage.outputTokens*[decimal]$price.output))/1000000)
    $records[0].costUsd=$cost;$records[0].cachedTokens=$null;$records[0].period='PEAK';$records[0].pricingManifestHash=$registry.manifestHash;$records[0].billableModelSource='REQUEST_MANIFEST';$records[0].returnedModelObserved=$false;$records[0].resolvedModelVersion='UNOBSERVED';$records[0].costAccuracy='CONSERVATIVE_UPPER_BOUND';$records[0].telemetryStatus='RECONCILED';$records[0].reconciledAt=(Get-Date).ToUniversalTime().ToString('o');$records[0].reconciliationEvidence=[ordered]@{preManifestHash=(New-FileHash $prePath);postManifestHash=(New-FileHash $postPath);stdoutHash=(New-FileHash $stdout[0].FullName);runtimeConfigHash=(New-ContentHash (Read-V2Json $script:DeepSeekRuntimePath));priceRegistryHash=$registry.manifestHash;endpoint='https://api.deepseek.com/';redirectObserved=$false;cacheDisposition='CACHE_MISS_ASSUMED';periodDisposition='PEAK_ASSUMED_UNOBSERVED_LAUNCH_TIME'}
    $budget.spentUsd=([decimal]$budget.spentUsd+$cost);Write-V2JsonCanonical $path $budget
    return [ordered]@{status='RECONCILED_REQUEST_MANIFEST_UPPER_BOUND';invocationId=$InvocationId;costUsd=$cost;remainingUsd=([decimal]$cfg.budgets.monthlyDeepSeekBudgetUsd-[decimal]$budget.spentUsd);billableModelSource='REQUEST_MANIFEST';returnedModelObserved=$false;resolvedModelVersion='UNOBSERVED';costAccuracy='CONSERVATIVE_UPPER_BOUND';evidence=$records[0].reconciliationEvidence}
}
