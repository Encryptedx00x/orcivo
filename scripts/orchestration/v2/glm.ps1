<#
glm.ps1 - GLM provider via the OpenCode CLI.

Owner decision (2026-09-14): GLM joins the governed provider set as the
implementer, with DeepSeek as its opposite reviewer, while Codex quota is
blocked and Claude stays excluded.  The invocation contract is FIXED:

  * provider id      glm
  * executable       OpenCode CLI (config.v2.json providers.glm.bin), launched
                     through its native binary - never a .cmd/.ps1 shim
  * model            zai-coding-plan/glm-5.3   (constant - never a knob)
  * transport        `opencode run --model <id> --format json --pure`,
                     prompt on stdin, fresh session per invocation
  * control channel  the JSONL event stream (step_start / text / step_finish);
                     an exit-zero stream without a terminal step_finish is
                     INCOMPLETE_PROVIDER_RESULT (fail closed, same contract as
                     DeepSeek)
  * telemetry        step_finish part.tokens {input, output, reasoning,
                     cache.read} + part.cost are best-effort; GLM runs on a
                     subscription coding plan, so there is NO per-token budget
                     ledger and a missing/zero usage block is not an integrity
                     failure

This module contains no credential writer: OpenCode inherits its own stored
authentication from the owner profile; no key is copied into config,
artifacts, arguments, state, or environment maps.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'deepseek.ps1')

# FIXED MODEL CONTRACT - the autopilot must call GLM with exactly this id.
$script:GlmModelId = 'zai-coding-plan/glm-5.3'

function Get-GlmModelId { return $script:GlmModelId }

function Get-GlmRuntimePlan {
    param([Parameter(Mandatory)][ValidateSet('FAST','BALANCED','REASONING','CRITICAL')][string]$Profile)
    $runtime = Get-DeepSeekRuntimeConfig -SkipPricingBinding
    if (-not $runtime.enabled) { return [ordered]@{ ok = $false; reason = [string]$runtime.reason } }
    if ($runtime.glm -and "$($runtime.glm.model)" -and "$($runtime.glm.model)" -ne $script:GlmModelId) {
        return [ordered]@{ ok = $false; reason = "configured GLM model '$($runtime.glm.model)' does not match the required '$($script:GlmModelId)' - refusing to launch a drifted model" }
    }
    if ($Profile -eq 'CRITICAL') { return [ordered]@{ ok = $false; reason = 'CRITICAL work is reserved for Codex Plus Terra' } }
    return [ordered]@{ ok = $true; model = $script:GlmModelId }
}

function Get-GlmInvocationArgs {
    # `run` starts a fresh session every invocation (no --continue/--session);
    # --pure disables external plugins; --format json is the structured
    # control channel; the prompt arrives on stdin.
    return @('run', '--model', (Get-GlmModelId), '--format', 'json', '--pure')
}

function Test-GlmFinalStructuredEvent {
    param([object[]]$Events)
    return (@($Events | Where-Object { "$($_.type)" -match '^(step_finish|finish|completed|done)$' }).Count -gt 0)
}

function Get-GlmUsageFromEvents {
    param([object[]]$Events)
    $tokens = $null
    foreach ($event in @($Events)) {
        $t = $(if ($event.part -and $event.part.tokens) { $event.part.tokens } elseif ($event.tokens) { $event.tokens } else { $null })
        if ($t) { $tokens = $t }
    }
    if (-not $tokens) { return $null }
    $input  = $(if ($null -ne $tokens.input) { [int64]$tokens.input } elseif ($null -ne $tokens.prompt) { [int64]$tokens.prompt } else { $null })
    $output = $(if ($null -ne $tokens.output) { [int64]$tokens.output } elseif ($null -ne $tokens.completion) { [int64]$tokens.completion } else { $null })
    if ($null -eq $input -or $null -eq $output) { return $null }
    $cached = $(if ($tokens.cache -and $null -ne $tokens.cache.read) { [int64]$tokens.cache.read } elseif ($null -ne $tokens.cached_tokens) { [int64]$tokens.cached_tokens } else { $null })
    return [ordered]@{inputTokens=$input;outputTokens=$output;cachedTokens=$cached;reasoningTokens=$(if($null -ne $tokens.reasoning){[int64]$tokens.reasoning}else{$null});costUsd=$(if($null -ne $tokens.cost){[decimal]$tokens.cost}else{$null})}
}

function ConvertFrom-GlmEvents {
    param($Events)
    if (-not $Events) { return $null }
    $err = @($Events | Where-Object {
        "$($_.type)" -match 'error' -or $_.error -or
        ($_.part -and "$($_.part.type)" -match 'error') -or
        ($_.part -and "$($_.part.reason)" -eq 'error')
    } | Select-Object -Last 1)
    if (-not $err) {
        if (Test-GlmFinalStructuredEvent $Events) {
            return [ordered]@{ channel = 'glm'; isError = $false; errorType = ''; httpStatus = 0; message = 'complete' }
        }
        return $null
    }
    $e = $err[0]
    $msg = "$(if ($e.error -is [string]) { $e.error } elseif ($e.error -and $e.error.message) { [string]$e.error.message } else { '' })$(if ($e.message) { [string]$e.message })$(if ($e.part) { "$(if ($e.part.error) { [string]$e.part.error })$(if ($e.part.text) { [string]$e.part.text })" })"
    return [ordered]@{
        channel    = 'glm'
        isError    = $true
        errorType  = "$(if ($e.code) { [string]$e.code })$(if ($e.type) { [string]$e.type })$(if ($e.part) { [string]$e.part.type })"
        httpStatus = $(if ($e.status) { [int]$e.status } elseif ($e.error -and $e.error.status) { [int]$e.error.status } else { 0 })
        message    = $msg
    }
}

function ConvertFrom-RealGlmOutput {
    param([string]$Text)
    $events = @()
    foreach ($line in ($Text -split "`r?`n")) {
        if (-not $line.Trim()) { continue }
        try { $events += ,($line | ConvertFrom-Json) } catch { }
    }
    $control = ConvertFrom-GlmEvents $events
    $texts = @($events | Where-Object { "$($_.type)" -eq 'text' -and $_.part -and "$($_.part.type)" -eq 'text' } | ForEach-Object { [string]$_.part.text })
    if ($texts.Count -eq 0) {
        $texts = @($events | Where-Object { "$($_.type)" -match 'result|message' -and $_.message } | ForEach-Object { [string]$_.message })
    }
    $structured = $null
    if ($texts.Count -gt 0) {
        try { $structured = ($texts[-1] | ConvertFrom-Json) } catch { }
    }
    return @{ control = $control; structured = $(if ($structured) { _ToHashtable $structured } else { $null }); events = @($events); texts = @($texts) }
}
