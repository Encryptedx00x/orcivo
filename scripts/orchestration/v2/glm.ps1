<#
glm.ps1 - GLM provider via the OpenCode CLI.

Owner decision (2026-09-14): GLM joins the governed provider set as the
implementer, with DeepSeek as its opposite reviewer, while Codex quota is
blocked and Claude stays excluded.  The invocation contract is FIXED:

  * provider id      glm
  * executable       OpenCode CLI (config.v2.json providers.glm.bin), launched
                     through its native binary - never a .cmd/.ps1 shim
  * model            nvidia/z-ai/glm-5.3   (constant - never a knob)
  * transport        `opencode run --model <id> --format json --pure`,
                     prompt on stdin, fresh session per invocation
  * control channel  the JSONL event stream (step_start / text / step_finish);
                     an exit-zero stream without a terminal step_finish is
                     INCOMPLETE_PROVIDER_RESULT (fail closed, same contract as
                     DeepSeek)
  * telemetry        step_finish part.tokens {input, output, reasoning,
                     cache.read} + part.cost are best-effort; GLM is served
                     through the NVIDIA NIM endpoint configured in the owner's
                     OpenCode profile, so there is NO per-token budget ledger
                     and a missing/zero usage block is not an integrity
                     failure

Backend migration (2026-09-17): the governed glm provider moved from the
retired zai-coding-plan/glm-5.3 route to nvidia/z-ai/glm-5.3 through the same
OpenCode transport.  Historical providerHistory entries, receipts, and
invocation snapshots bound to the retired model id remain valid immutable
evidence and are never rewritten.

This module contains no credential writer: OpenCode inherits its own stored
authentication (including NVIDIA_API_KEY) from the owner environment; no key
is copied into config, artifacts, arguments, state, or environment maps.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'deepseek.ps1')

# FIXED MODEL CONTRACT - the autopilot must call GLM with exactly this id.
$script:GlmModelId = 'nvidia/z-ai/glm-5.3'

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

# Extract fenced code blocks from a final assistant message with a bounded
# line scanner (no unbounded greedy regex over arbitrary output).  Each block
# is @{ tag = <info-string or ''>; body = <raw inner text> }.  GLM sometimes
# glues the payload to the opening fence (```{...} on one line, no newline):
# an opener remainder that begins with `{` is not a plausible info string,
# so it is kept as the first body line and the block stays generic.
function Get-GlmFencedBlocks {
    param([string]$Text)
    $blocks = @()
    $lines = @($Text -split "`r?`n")
    $open = $false; $tag = ''; $body = New-Object System.Text.StringBuilder
    foreach ($line in $lines) {
        if ($line -match '^\s*```') {
            if (-not $open) {
                $open = $true
                $tag = ($line -replace '^\s*```', '').Trim()
                $body = New-Object System.Text.StringBuilder
                if ($tag -and $tag.StartsWith('{')) { [void]$body.AppendLine($tag); $tag = '' }
                continue
            }
            $blocks += [ordered]@{ tag = $tag; body = $body.ToString() }; $open = $false; $tag = ''; continue
        }
        if ($open) { [void]$body.AppendLine($line) }
    }
    return @($blocks)
}

# GLM regularly answers with explanatory prose followed by the required
# structured envelope inside a fenced ```json block.  The whole final message
# is therefore NOT required to be raw JSON: extract the structured result, in
# order, from (1) whole-text JSON, (2) the last parseable ```json fenced
# block, (3) the last parseable generic fenced block - accepted only when it
# contains the expected structured-result field marker.
function ConvertFrom-GlmStructuredText {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return $null }
    $parsed = $null
    try { $parsed = ([string]$Text.Trim() | ConvertFrom-Json) } catch { $parsed = $null }
    if (-not $parsed) {
        $blocks = @(Get-GlmFencedBlocks -Text $Text)
        $tagged = @($blocks | Where-Object { "$($_.tag)" -match '^(?i)jsonc?$' })
        for ($i = $tagged.Count - 1; $i -ge 0; $i--) {
            try { $parsed = ([string]$tagged[$i].body.Trim() | ConvertFrom-Json) } catch { $parsed = $null }
            if ($parsed) { break }
        }
    }
    if (-not $parsed) {
        $generic = @($blocks | Where-Object { -not "$($_.tag)" })
        for ($i = $generic.Count - 1; $i -ge 0; $i--) {
            $candidate = $null
            try { $candidate = ([string]$generic[$i].body.Trim() | ConvertFrom-Json) } catch { $candidate = $null }
            if ($candidate -and ($candidate.PSObject.Properties.Name -contains 'resultClass' -or $candidate.PSObject.Properties.Name -contains 'verdict')) { $parsed = $candidate; break }
        }
    }
    if (-not $parsed) { return $null }
    return (ConvertTo-GlmAgentEnvelope $parsed)
}

# Normalize a parsed GLM structured payload to the frozen agent-result schema.
# A payload that already carries the envelope identity is returned unchanged;
# a payload with only the decision fields (resultClass/summary) is completed
# with inert defaults and non-schema properties are dropped, so the envelope
# that reaches dispatcher classification is always schema-valid or absent.
function ConvertTo-GlmAgentEnvelope {
    param($Parsed)
    $h = _ToHashtable $Parsed
    if (-not $h) { return $null }
    if ("$($h['schemaVersion'])" -eq 'orcivo.orchestration.v2.agent-result/1' -and "$($h['role'])") { return $h }
    if ("$($h['schemaVersion'])" -eq 'orcivo.orchestration.v2.review-envelope/1' -and "$($h['verdict'])") { return $h }
    if (-not $h.Contains('resultClass')) { return $null }
    $class = [string]$h['resultClass']
    if ($class -notin @('SUCCESS','BLOCK','CONTEXT_ROLLOVER','AGENT_FAILURE','TEST_FAILURE')) { return $null }
    $summary = [string]$h['summary']
    if ([string]::IsNullOrWhiteSpace($summary)) { $summary = 'GLM structured result (normalized envelope)' }
    if ($summary.Length -gt 4000) { $summary = $summary.Substring(0, 4000) }
    return [ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.agent-result/1'
        role          = 'IMPLEMENTER'
        resultClass   = $class
        summary       = $summary
        decisions     = @()
        tests         = @()
        nextAction    = 'none'
        importantArtifacts = @()
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
        $structured = (ConvertFrom-GlmStructuredText -Text ([string]$texts[-1]))
    }
    return @{ control = $control; structured = $(if ($structured) { _ToHashtable $structured } else { $null }); events = @($events); texts = @($texts) }
}
