<#
router.ps1 - ADAPTIVE model / reasoning router.  (PRAGMATIC V2.1, PARTE 12)

There is NO permanent hardcoded model version here. The abstract profiles
FAST / BALANCED / REASONING / CRITICAL resolve at RUNTIME:

  PROFILE -> installed providers -> discovered models -> discovered reasoning/effort
          -> policy / budget -> concrete invocation plan

Capabilities are discovered by inspecting the CLI that is actually installed
(`<bin> --version`, `<bin> --help`) and cached in state/cli-capabilities.json.
The cache is refreshed whenever the CLI --version string changes. If a CLI does
not expose an explicit reasoning/effort selector, the best supported mechanism is
used and the limitation is recorded in the route (`limitations`).
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'deepseek.ps1')
. (Join-Path $PSScriptRoot 'glm.ps1')

$script:CapCachePath = Join-Path (Get-V2Dir) 'state\cli-capabilities.json'

# --- pure: parse a CLI --help blob into a capability map --------------------
function ConvertFrom-CliHelp {
    param([Parameter(Mandatory)][AllowEmptyString()][string]$HelpText, [string]$Provider = '')
    $h = $HelpText
    $flag = { param($rx) [bool]([regex]::IsMatch($h, $rx, 'IgnoreCase')) }

    $reasoningFlag = $null
    foreach ($cand in @('--effort', '--reasoning-effort', '--reasoning', '--thinking', '--think')) {
        if (& $flag ([regex]::Escape($cand) + '\b')) { $reasoningFlag = $cand; break }
    }
    # codex exposes reasoning as a `-c model_reasoning_effort=...` config override
    $reasoningConfigKey = $null
    if (-not $reasoningFlag) {
        $m = [regex]::Match($h, '(model_reasoning_effort|reasoning_effort)', 'IgnoreCase')
        if ($m.Success) { $reasoningConfigKey = $m.Groups[1].Value }
    }

    $modelFlag = $null
    foreach ($cand in @('--model', '-m ', '--model-id')) {
        if (& $flag ([regex]::Escape($cand.Trim()) + '\b')) { $modelFlag = $cand.Trim(); break }
    }

    return [ordered]@{
        provider           = $Provider
        modelFlag          = $modelFlag
        reasoningFlag      = $reasoningFlag
        reasoningConfigKey = $reasoningConfigKey
        supportsExplicitReasoning = [bool]($reasoningFlag -or $reasoningConfigKey)
        outputJson         = [bool]((& $flag '--output-format\b') -or (& $flag '--json\b') -or (& $flag '--experimental-json\b'))
        outputSchemaFlag   = $(if (& $flag '--output-schema\b') { '--output-schema' } elseif (& $flag '--output-format\b') { '--output-format' } else { $null })
        # claude -p is fresh by default; --no-continue is the real "don't resume" flag.
        # codex exec is fresh unless `resume` is used. --no-session is NOT a headless flag.
        freshContextFlag   = $(if (& $flag '--no-continue\b') { '--no-continue' } elseif ($Provider -eq 'codex') { '(codex exec is fresh by default)' } elseif ($Provider -eq 'claude') { '(claude -p is fresh by default)' } else { $null })
        sandboxFlag        = $(if (& $flag '--sandbox\b') { '--sandbox' } elseif (& $flag '--dangerously-') { '(sandbox via permission mode)' } else { $null })
        configIsolationFlag = $(if (& $flag '(--config|--profile|-c )\b') { ([regex]::Match($h, '(--config|--profile)', 'IgnoreCase').Value) } else { $null })
        toolsFlag          = $(if (& $flag '(--allowed-tools|--allowedTools|--tools|--permission-mode)\b') { ([regex]::Match($h, '(--allowed-tools|--allowedTools|--tools|--permission-mode)', 'IgnoreCase').Value) } else { $null })
        headlessFlag       = $(if ($Provider -eq 'claude') { '-p' } elseif ($Provider -eq 'codex') { 'exec' } else { $null })
    }
}

function _ProbeCli {
    param([string]$Provider, [string]$Bin)
    $cmd = Get-Command $Bin -ErrorAction SilentlyContinue
    if (-not $cmd) { return [ordered]@{ provider = $Provider; bin = $Bin; installed = $false } }
    $ver = ''
    try { $ver = (& $Bin --version 2>&1 | Select-Object -First 1) -join ' ' } catch { }
    $help = ''
    try { $help = (& $Bin --help 2>&1) -join "`n" } catch { }
    # also pull subcommand help (codex exec --help carries -c / --json / --output-schema)
    $cfg = Get-V2Config
    $sub = $cfg.router.capabilityProbe.$Provider.subHelpArgs
    foreach ($argset in @($sub)) {
        if (-not $argset) { continue }
        try { $help += "`n" + (('' | & $Bin @(@($argset)) 2>&1) -join "`n") } catch { }
    }
    $cap = ConvertFrom-CliHelp -HelpText $help -Provider $Provider
    # PARTE 12: fill probe gaps from a config-declared known-capability fallback,
    # recording the source so limitations stay honest.
    $known = $cfg.router.knownCapabilities.$Provider
    if ($known) {
        $cap.knownFallbackUsed = @()
        foreach ($p in $known.PSObject.Properties) {
            if (-not $cap.$($p.Name)) { $cap.$($p.Name) = $p.Value; $cap.knownFallbackUsed += $p.Name }
        }
        if ($cap.reasoningFlag -or $cap.reasoningConfigKey) { $cap.supportsExplicitReasoning = $true }
    }
    $cap.provider = $Provider
    $cap.bin = $Bin
    $cap.installed = $true
    $cap.version = "$ver".Trim()
    $cap.probedAt = (Get-Date).ToUniversalTime().ToString('o')
    return $cap
}

# PUBLIC: discovered capabilities for a provider, cached, refreshed on version drift.
function Get-CliCapabilities {
    param([ValidateSet('claude', 'codex')][string]$Provider, [switch]$Force)
    $cfg = Get-V2Config
    $bin = $cfg.providers.$Provider.bin
    $cache = @{}
    if ((Test-Path $script:CapCachePath) -and -not $Force) {
        try { $cache = Read-V2Json $script:CapCachePath } catch { $cache = @{} }
    }
    $cur = $null
    if ($cache -and $cache[$Provider]) { $cur = $cache[$Provider] }

    # cheap version check without a full help probe
    $liveVer = ''
    if (Get-Command $bin -ErrorAction SilentlyContinue) {
        try { $liveVer = ((& $bin --version 2>&1 | Select-Object -First 1) -join ' ').Trim() } catch { }
    }
    if ($cur -and -not $Force -and "$($cur.version)" -eq $liveVer -and $liveVer) { return $cur }

    $fresh = _ProbeCli -Provider $Provider -Bin $bin
    $newCache = [ordered]@{}
    if ($cache -is [System.Collections.IDictionary]) { foreach ($k in $cache.Keys) { $newCache[$k] = $cache[$k] } }
    $newCache[$Provider] = $fresh
    $newCache['schemaVersion'] = 'orcivo.orchestration.v2.cli-capabilities/1'
    $newCache['updatedAt'] = (Get-Date).ToUniversalTime().ToString('o')
    try { Write-V2JsonCanonical $script:CapCachePath $newCache } catch { }
    return $fresh
}

# map an abstract reasoning intent to whatever the CLI actually supports
function _ReasoningArgs {
    param($Cap, [string]$Intent)   # min | normal | high | max
    $limitations = @()
    $args = @()
    if ($Cap.reasoningFlag) {
        $val = switch ($Intent) { 'min' { 'low' } 'normal' { 'medium' } 'high' { 'high' } 'max' { 'high' } default { 'medium' } }
        $args += @($Cap.reasoningFlag, $val)
    }
    elseif ($Cap.reasoningConfigKey) {
        $val = switch ($Intent) { 'min' { 'low' } 'normal' { 'medium' } 'high' { 'high' } 'max' { 'high' } default { 'medium' } }
        $args += @('-c', "$($Cap.reasoningConfigKey)=`"$val`"")
    }
    else {
        $limitations += "provider '$($Cap.provider)' exposes no explicit reasoning/effort selector; using its default reasoning for intent '$Intent'"
    }
    return @{ args = @($args); limitations = @($limitations) }
}

# PUBLIC: resolve one profile against one provider -> concrete invocation plan.
function Resolve-Provider {
    param(
        [Parameter(Mandatory)][ValidateSet('FAST', 'BALANCED', 'REASONING', 'CRITICAL')][string]$Profile,
        [Parameter(Mandatory)][ValidateSet('claude', 'codex', 'deepseek', 'glm')][string]$Provider,
        [string]$ModelOverride = ''
    )
    if($Provider -eq 'glm'){
        # GLM runs through the OpenCode CLI with a FIXED model contract; the
        # model id is never a knob and an override is never accepted.
        if($ModelOverride -and $ModelOverride -ne (Get-GlmModelId)){return [ordered]@{ok=$false;provider='glm';reason="GLM model override '$ModelOverride' violates the fixed model contract"}}
        $plan=Get-GlmRuntimePlan -Profile $Profile;if(-not $plan.ok){return [ordered]@{ok=$false;provider='glm';reason=$plan.reason}}
        $cfg=Get-V2Config;$bin=$cfg.providers.glm.bin
        if(-not(Get-Command $bin -ErrorAction SilentlyContinue)){return [ordered]@{ok=$false;provider='glm';reason="OpenCode CLI '$bin' not installed"}}
        $intent=[string]$cfg.router.profileIntent.$Profile.reasoning
        return [ordered]@{ok=$true;provider='glm';bin=$bin;profile=$Profile;reasoningIntent=$intent;model=(Get-GlmModelId);maxInvocationsPerTask=$null;invocationArgs=(Get-GlmInvocationArgs);environment=@{};outputJson=$true;freshContextFlag='(opencode run starts a fresh session per invocation)';sandboxFlag='(--pure external plugins disabled)';supportsExplicitReasoning=$false;limitations=@("glm model is fixed by contract: $(Get-GlmModelId); no variant/reasoning selector is pinned");capabilityVersion='';estimatedUsd=[decimal]0}
    }
    if($Provider -eq 'deepseek'){
        if($Profile -eq 'CRITICAL'){return [ordered]@{ok=$false;provider='deepseek';reason='CRITICAL work is reserved for Codex Plus Terra'}}
        $plan=Get-DeepSeekModelPlan -Profile $Profile;if(-not $plan.ok){return [ordered]@{ok=$false;provider='deepseek';reason=$plan.reason}}
        if(-not $env:DEEPSEEK_API_KEY){return [ordered]@{ok=$false;provider='deepseek';reason='DEEPSEEK_API_KEY is unavailable'}}
        $budget=Get-DeepSeekBudgetStatus;if(-not $budget.ok){return [ordered]@{ok=$false;provider='deepseek';reason="DeepSeek budget preflight: $($budget.reason)"}}
        $cap=Get-CliCapabilities -Provider 'codex';if(-not $cap.installed){return [ordered]@{ok=$false;provider='deepseek';reason="Codex CLI '$($cap.bin)' not installed"}}
        $launch=Get-DeepSeekLaunchConfiguration -Model $(if($ModelOverride){$ModelOverride}else{$plan.model}) -Reasoning $plan.reasoning -MaxOutputTokens $plan.maxOutputTokens
        return [ordered]@{ok=$true;provider='deepseek';bin=$cap.bin;profile=$Profile;reasoningIntent=$plan.reasoning;model=$(if($ModelOverride){$ModelOverride}else{$plan.model});maxOutputTokens=$plan.maxOutputTokens;maxInvocationsPerTask=$plan.maxInvocationsPerTask;invocationArgs=@('exec')+@($launch.configArgs);environment=$launch.environment;outputJson=$true;freshContextFlag='(codex exec is fresh by default)';sandboxFlag=$cap.sandboxFlag;supportsExplicitReasoning=$true;limitations=@();capabilityVersion=$cap.version;estimatedUsd=[decimal]$((Get-DeepSeekRuntimeConfig).deepseek.profiles.$Profile.maxEstimatedUsd)}
    }
    $cfg = Get-V2Config
    $cap = Get-CliCapabilities -Provider $Provider
    if (-not $cap.installed) { return [ordered]@{ ok = $false; provider = $Provider; reason = "CLI '$($cap.bin)' not installed" } }

    $intent = $cfg.router.profileIntent.$Profile
    $codexPlan=$(if($Provider -eq 'codex' -and $Profile -eq 'CRITICAL'){Get-OrcivoCodexModelPlan -Profile CRITICAL}else{$null})
    if($codexPlan -and -not $codexPlan.ok){return [ordered]@{ok=$false;provider='codex';reason=$codexPlan.reason}}
    if($codexPlan){$ModelOverride=$codexPlan.model;$ra=[ordered]@{args=@('-c',('model_reasoning_effort="'+$codexPlan.reasoning+'"'));limitations=@()};$intent=[ordered]@{reasoning=$codexPlan.reasoning}}
    else{$ra = _ReasoningArgs -Cap $cap -Intent ([string]$intent.reasoning)}

    $invocationArgs = @()
    if ($cap.headlessFlag) { $invocationArgs += $cap.headlessFlag }
    if ($ModelOverride -and $cap.modelFlag) { $invocationArgs += @($cap.modelFlag, $ModelOverride) }
    $invocationArgs += @($ra.args)

    $limits = @($ra.limitations)
    if (-not $cap.outputJson) { $limits += "provider '$Provider' has no structured output flag discovered; control-channel classification relies on exit code + stderr shape" }
    if (-not $cap.freshContextFlag) { $limits += "provider '$Provider' exposes no explicit fresh-context flag; context rollover starts a new process invocation instead" }

    return [ordered]@{
        ok             = $true
        provider       = $Provider
        bin            = $cap.bin
        profile        = $Profile
        reasoningIntent = [string]$intent.reasoning
        model          = $(if ($ModelOverride) { $ModelOverride } else { '(provider default - not pinned; PARTE 12)' })
        invocationArgs = @($invocationArgs)
        outputJson     = [bool]$cap.outputJson
        freshContextFlag = $cap.freshContextFlag
        sandboxFlag    = $cap.sandboxFlag
        supportsExplicitReasoning = [bool]$cap.supportsExplicitReasoning
        limitations    = @($limits)
        capabilityVersion = "$($cap.version)"
    }
}

# PUBLIC: pick profile + provider for a classification, honouring provider health.
function Resolve-Route {
    param(
        [Parameter(Mandatory)][hashtable]$Classification,
        [string[]]$HealthyProviders = @(Get-OrcivoEnabledProviders),
        [string]$ForceProvider = ''
    )
    $cfg = Get-V2Config
    $complexity = [string]$Classification.taskComplexity
    $profile = $cfg.router.complexityToProfile.$complexity
    if (-not $profile) { $profile = [string]$Classification.recommendedProfile }
    if (-not $profile) { $profile = 'BALANCED' }
    # never route below the classifier's recommended profile
    $order = @('FAST', 'BALANCED', 'REASONING', 'CRITICAL')
    if ([array]::IndexOf($order, [string]$Classification.recommendedProfile) -gt [array]::IndexOf($order, $profile)) {
        $profile = [string]$Classification.recommendedProfile
    }

    $want = [string]$Classification.suggestedProvider
    $prefOrder = @(Get-OrcivoEnabledProviders)
    if($profile -eq 'CRITICAL'){$prefOrder=@('codex')}
    if ($ForceProvider) { $prefOrder = @($ForceProvider) }
    elseif ($want -in @('CLAUDE', 'CODEX', 'DEEPSEEK')) { $prefOrder = @($want.ToLowerInvariant()) + @($prefOrder | Where-Object { $_ -ne $want.ToLowerInvariant() }) }

    $chosen = $null
    foreach ($p in $prefOrder) {
        if ($HealthyProviders -notcontains $p) { continue }
        $r = Resolve-Provider -Profile $profile -Provider $p
        if ($r.ok) { $chosen = $r; break }
    }
    if (-not $chosen) {
        return [ordered]@{ ok = $false; reason = "no healthy provider can serve profile $profile (healthy: $($HealthyProviders -join ','))"; profile = $profile }
    }
    $chosen.taskComplexity = $complexity
    $chosen.reviewStrength = [string]$Classification.reviewStrength
    $chosen.ok = $true
    return $chosen
}

# PUBLIC: pick the reviewer provider.  (PARTE 16 / 28)
#   preference: the OPPOSITE provider from the implementer.
#   CROSS_PROVIDER_REQUIRED + opposite unavailable -> escalate (no same-provider review).
function Select-Reviewer {
    param(
        [Parameter(Mandatory)][ValidateSet('claude', 'codex', 'deepseek', 'glm')][string]$ImplementerProvider,
        [string]$ReviewStrength = 'NORMAL',
        [string[]]$HealthyProviders = @(Get-OrcivoEnabledProviders)
    )
    $cfg = Get-V2Config
    $opposite = Get-OrcivoOppositeProvider -Provider $ImplementerProvider -Candidates @($HealthyProviders)
    if ($HealthyProviders -contains $opposite) {
        return [ordered]@{ ok = $true; reviewer = $opposite; crossProvider = $true; reason = "opposite-provider review ($opposite reviews $ImplementerProvider)" }
    }
    if ($ReviewStrength -eq 'CROSS_PROVIDER_REQUIRED') {
        return [ordered]@{ ok = $false; reviewer = $null; crossProvider = $false
            reason = "CROSS_PROVIDER_REQUIRED but the opposite provider '$opposite' is unavailable - escalate, do NOT review with the same provider" ; escalate = $true }
    }
    if ($HealthyProviders -contains $ImplementerProvider) {
        return [ordered]@{ ok = $true; reviewer = $ImplementerProvider; crossProvider = $false
            reason = "opposite provider unavailable and review strength is $ReviewStrength - same-provider fresh review permitted" }
    }
    return [ordered]@{ ok = $false; reviewer = $null; reason = 'no provider available to review' }
}

# ---- Wave 0 determinism corpus -------------------------------------------------
$script:CannedHelp = @{
    claude = @"
Usage: claude [options] [command] [prompt]
Options:
  -p, --print                 Print response and exit (headless)
  --model <model>             Model for the session
  --output-format <format>    Output format (text, json, stream-json)
  --allowed-tools <tools...>  Comma or space-separated list of allowed tool names
  --permission-mode <mode>    Permission mode for the session
  --no-continue               Do not continue the most recent conversation
"@
    codex = @"
Usage: codex [OPTIONS] [PROMPT]
       codex exec [OPTIONS] [PROMPT]
Options:
  -m, --model <MODEL>         The model to use
  -c, --config <key=value>    Override a configuration value (e.g. model_reasoning_effort="high")
  --sandbox <SANDBOX_MODE>    Sandbox policy for command execution
  --json                      Print events as JSONL to stdout
"@
}

function Test-RouterSelftest {
    $fail = @()

    $cc = ConvertFrom-CliHelp -HelpText $script:CannedHelp.claude -Provider 'claude'
    if ($cc.modelFlag -ne '--model') { $fail += "claude modelFlag: got '$($cc.modelFlag)'" }
    if (-not $cc.outputJson) { $fail += "claude outputJson: expected true" }
    if ($cc.supportsExplicitReasoning) { $fail += "claude: canned help has no reasoning flag but supportsExplicitReasoning=true" }
    if (-not $cc.freshContextFlag) { $fail += "claude freshContextFlag: expected --no-continue" }

    $xc = ConvertFrom-CliHelp -HelpText $script:CannedHelp.codex -Provider 'codex'
    if ($xc.reasoningConfigKey -ne 'model_reasoning_effort') { $fail += "codex reasoningConfigKey: got '$($xc.reasoningConfigKey)'" }
    if (-not $xc.supportsExplicitReasoning) { $fail += "codex: config reasoning key present but supportsExplicitReasoning=false" }
    if ($xc.sandboxFlag -ne '--sandbox') { $fail += "codex sandboxFlag: got '$($xc.sandboxFlag)'" }

    # reasoning arg mapping
    $ra = _ReasoningArgs -Cap $xc -Intent 'max'
    if (($ra.args -join ' ') -notmatch 'model_reasoning_effort=') { $fail += "codex max reasoning args: $($ra.args -join ' ')" }
    $raC = _ReasoningArgs -Cap $cc -Intent 'high'
    if ($raC.limitations.Count -eq 0) { $fail += "claude canned (no reasoning flag) should record a limitation" }

    # deterministic: same help -> same map
    $cc2 = ConvertFrom-CliHelp -HelpText $script:CannedHelp.claude -Provider 'claude'
    if ((ConvertTo-CanonicalJson $cc) -ne (ConvertTo-CanonicalJson $cc2)) { $fail += "claude parse non-deterministic" }

    # reviewer selection: opposite provider preferred
    $rv = Select-Reviewer -ImplementerProvider 'claude' -ReviewStrength 'NORMAL' -HealthyProviders @('claude', 'codex')
    if ($rv.reviewer -ne 'codex' -or -not $rv.crossProvider) { $fail += "reviewer for claude impl should be codex" }
    $rv = Select-Reviewer -ImplementerProvider 'codex' -ReviewStrength 'NORMAL' -HealthyProviders @('claude', 'codex')
    if ($rv.reviewer -ne 'claude') { $fail += "reviewer for codex impl should be claude" }
    # CROSS_PROVIDER_REQUIRED + opposite down -> escalate, never same-provider
    $rv = Select-Reviewer -ImplementerProvider 'claude' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('claude')
    if ($rv.ok -or -not $rv.escalate) { $fail += "cross-provider-required + opposite down should escalate" }
    # NORMAL + opposite down -> same-provider fresh review allowed
    $rv = Select-Reviewer -ImplementerProvider 'claude' -ReviewStrength 'NORMAL' -HealthyProviders @('claude')
    if (-not $rv.ok -or $rv.crossProvider) { $fail += "NORMAL + opposite down should allow same-provider fresh review" }

    # GLM pairing (owner decision 2026-09-14): deepseek <-> glm.  A temporary
    # runtime declaration inside this disposable fixture is the only way to
    # make the enabled set deterministic here; it is removed again before the
    # selftest returns.
    $runtimePath = $script:DeepSeekRuntimePath
    $hadRuntime = Test-Path -LiteralPath $runtimePath
    $savedRuntime = $(if ($hadRuntime) { [System.IO.File]::ReadAllText($runtimePath, [System.Text.Encoding]::UTF8) } else { $null })
    try {
        $glmRuntime = [ordered]@{
            schemaVersion='orcivo.orchestration.v2.provider-runtime/1'; enabled=$true
            enabledProviders=@('glm','deepseek'); excludedProviders=@('claude','codex')
            deepseek=[ordered]@{baseUrl='https://api.deepseek.com/';wireApi='responses';envKey='DEEPSEEK_API_KEY';codexHomeRoot='orcivo-dispatcher/providers/deepseek-codex'}
            glm=[ordered]@{model=(Get-GlmModelId)}
        }
        Write-V2JsonCanonical $runtimePath $glmRuntime
        $rv = Select-Reviewer -ImplementerProvider 'glm' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('glm', 'deepseek')
        if ($rv.reviewer -ne 'deepseek' -or -not $rv.crossProvider) { $fail += "reviewer for glm impl should be deepseek" }
        $rv = Select-Reviewer -ImplementerProvider 'deepseek' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('glm', 'deepseek')
        if ($rv.reviewer -ne 'glm' -or -not $rv.crossProvider) { $fail += "reviewer for deepseek impl should be glm" }
        $rv = Select-Reviewer -ImplementerProvider 'deepseek' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('deepseek')
        if ($rv.ok -or -not $rv.escalate) { $fail += "deepseek impl + glm down should escalate, never same-provider" }
        if ((Get-GlmModelId) -ne 'zai-coding-plan/glm-5.3') { $fail += "glm model contract drifted" }
        $plan = Get-GlmRuntimePlan -Profile REASONING
        if (-not $plan.ok -or $plan.model -ne 'zai-coding-plan/glm-5.3') { $fail += "glm plan did not pin the exact model id: $(if($plan.ok){$plan.model}else{$plan.reason})" }
        if (@(Get-GlmInvocationArgs) -notcontains 'zai-coding-plan/glm-5.3') { $fail += "glm invocation args do not carry the exact model id" }
        if ((Get-GlmRuntimePlan -Profile CRITICAL).ok) { $fail += "glm CRITICAL should be reserved for Codex Plus Terra" }
        $drift = [ordered]@{} + $glmRuntime; $drift.glm = [ordered]@{ model = 'glm-wrong-model' }
        Write-V2JsonCanonical $runtimePath $drift
        if ((Get-GlmRuntimePlan -Profile REASONING).ok) { $fail += "glm runtime model drift was accepted" }
    } finally {
        if ($hadRuntime) { [System.IO.File]::WriteAllText($runtimePath, $savedRuntime, (New-Utf8NoBom)) }
        elseif (Test-Path -LiteralPath $runtimePath) { Remove-Item -LiteralPath $runtimePath -Force }
    }

    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail) }
}
