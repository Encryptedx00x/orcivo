<#
real-agent.ps1 - real Claude Code / Codex CLI process abstraction.

Every invocation is a new non-interactive process. Implementers receive a
workspace-write profile; reviewers receive only the review-data directory and
a read-only profile with one exact allowlisted reader tool. Model names are never pinned: Resolve-Route maps an
abstract profile to the capabilities of the CLI installed at runtime.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'router.ps1')
. (Join-Path $PSScriptRoot 'classify.ps1')
. (Join-Path $PSScriptRoot 'continuation.ps1')
. (Join-Path $PSScriptRoot 'review-envelope.ps1')
. (Join-Path $PSScriptRoot 'glm.ps1')

function Get-AgentResultSchemaPath { return (Join-Path (Get-V2Dir) 'schemas\agent-result.schema.json') }
function Get-ReviewResultSchemaPath { return (Join-Path (Get-V2Dir) 'schemas\review-agent-result.schema.json') }

function Get-ProviderLaunchPlan {
    param([ValidateSet('claude','codex','deepseek','glm')][string]$Provider, [string[]]$Arguments)
    if ($Provider -eq 'claude') {
        $cmd = Get-Command 'claude' -CommandType Application -ErrorAction Stop | Select-Object -First 1
        return @{ exe=$cmd.Source; arguments=@($Arguments) }
    }
    if ($Provider -eq 'glm') {
        # The installed OpenCode CLI is an npm shim whose payload is a NATIVE
        # binary.  Launch that binary directly so ProcessStartInfo never
        # executes a .cmd/.ps1 wrapper or a shell.
        $shim = Get-Command 'opencode.cmd' -CommandType Application -ErrorAction Stop | Select-Object -First 1
        $exe = Join-Path (Split-Path -Parent $shim.Source) 'node_modules\opencode-ai\bin\opencode.exe'
        if (-not (Test-Path -LiteralPath $exe)) { throw "real-agent: OpenCode native entrypoint not found beside $($shim.Source)" }
        return @{ exe=$exe; arguments=@($Arguments) }
    }
    # The installed Codex CLI is an npm shim. Launch node.exe + the discovered
    # package entrypoint directly so ProcessStartInfo never executes a .cmd/.ps1
    # wrapper or a shell.
    $shim = Get-Command 'codex.cmd' -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $entry = Join-Path (Split-Path -Parent $shim.Source) 'node_modules\@openai\codex\bin\codex.js'
    if (-not (Test-Path -LiteralPath $entry)) { throw "real-agent: Codex package entrypoint not found beside $($shim.Source)" }
    $node = Get-Command 'node.exe' -CommandType Application -ErrorAction Stop | Select-Object -First 1
    return @{ exe=$node.Source; arguments=@($entry)+@($Arguments) }
}

function ConvertTo-CanonicalFailureClass {
    param([string]$LegacyClass, $Control)
    switch ($LegacyClass) {
        'PROVIDER_QUOTA'      { return 'QUOTA_EXHAUSTED' }
        'PROVIDER_RATE_LIMIT' { return 'RATE_LIMIT' }
        'PROVIDER_AUTH'       { return 'TEMPORARY_AUTH_FAILURE' }
        'PROVIDER_UNAVAILABLE'{ return 'PROVIDER_UNAVAILABLE' }
        'PROVIDER_TRANSIENT'  {
            $t = ("$($Control.errorType) $($Control.message)").ToLowerInvariant()
            if(-not $Control){return 'TRANSIENT_PROVIDER_NETWORK'}
            if ($t -match 'network|connection|dns|socket|stream|timeout') { return 'TRANSIENT_PROVIDER_NETWORK' }
            return 'PROVIDER_UNAVAILABLE'
        }
        'CHECK_FAILURE'       { return 'TEST_FAILURE' }
        'APPLICATION_ERROR'   { return 'AGENT_FAILURE' }
        'TOOL_ERROR'          { return 'AGENT_FAILURE' }
        'TIMEOUT'             { return 'AGENT_FAILURE' }
        'UNKNOWN'             { return 'AGENT_FAILURE' }
        'OK'                  { return 'NONE' }
        default               { return $(if ($LegacyClass) { $LegacyClass } else { 'AGENT_FAILURE' }) }
    }
}

function Test-IsCanonicalProviderClass {
    param([string]$Class)
    return ($Class -in @('QUOTA_EXHAUSTED','RATE_LIMIT','PROVIDER_UNAVAILABLE','TEMPORARY_AUTH_FAILURE','TRANSIENT_PROVIDER_NETWORK'))
}

function ConvertFrom-RealClaudeOutput {
    param([string]$Text)
    $obj = $null
    try { $obj = $Text | ConvertFrom-Json } catch { }
    if(-not $obj){
        foreach($line in @($Text -split "`r?`n"|Where-Object{-not [string]::IsNullOrWhiteSpace($_)})){
            try{$candidate=$line|ConvertFrom-Json;if($candidate){$obj=$candidate}}catch{}
        }
    }
    if (-not $obj) { return @{ control = $null; structured = $null } }
    $control = ConvertFrom-ClaudeResult $obj
    $structured = $obj.structured_output
    if (-not $structured -and $obj.result) {
        try { $structured = ([string]$obj.result | ConvertFrom-Json) } catch { }
    }
    return @{ control = $control; structured = $(if ($structured) { _ToHashtable $structured } else { $null }) }
}

# Deterministic, fail-closed extraction of a review-envelope JSON object from
# the TERMINAL SUFFIX of an agent_message that also carries a prose prefix
# (e.g. "All three artifacts are reconstructed: ...\n\n{...envelope...}").
# Extraction only - never approval authority; the caller still runs the
# extracted object through the provider schema and Parse-ReviewEnvelope.
# Accepted only when ALL hold:
#   - the exact review-envelope schemaVersion marker occurs exactly once
#   - Text.Substring(markerIndex).Trim() parses as EXACTLY one JSON object
#     (no bytes/prose before/after the object survive the trim - a fenced
#     ``` suffix or trailing prose makes the whole-string parse fail)
#   - the root is an object whose schemaVersion is exactly review-envelope/1
function Get-ReviewEnvelopeTerminalMarker { return '{"schemaVersion":"orcivo.orchestration.v2.review-envelope/1"' }

function ConvertFrom-ReviewEnvelopeTerminalSuffix {
    param([Parameter(Mandatory)][AllowEmptyString()][string]$Text)
    if (-not $Text) { return $null }
    $marker = Get-ReviewEnvelopeTerminalMarker
    $count = ([regex]::Matches($Text, [regex]::Escape($marker))).Count
    if ($count -ne 1) { return $null }
    $idx = $Text.IndexOf($marker)
    $suffix = $Text.Substring($idx).Trim()
    if (-not $suffix) { return $null }
    $typed = $null
    try { $typed = ConvertFrom-JsonTyped $suffix } catch { return $null }
    if ($null -eq $typed -or -not ($typed -is [System.Collections.IDictionary])) { return $null }
    if ([string]$typed['schemaVersion'] -ne 'orcivo.orchestration.v2.review-envelope/1') { return $null }
    $obj = $null
    try { $obj = ($suffix | ConvertFrom-Json) } catch { return $null }
    return $obj
}

function ConvertFrom-RealCodexOutput {
    param([string]$Text)
    $events = @()
    foreach ($line in ($Text -split "`r?`n")) {
        if (-not $line.Trim()) { continue }
        try { $events += ,($line | ConvertFrom-Json) } catch { }
    }
    $control = ConvertFrom-CodexEvents $events
    $messages = @($events | Where-Object { $_.type -eq 'item.completed' -and $_.item.type -eq 'agent_message' } | ForEach-Object { $_.item.text })
    if ($messages.Count -eq 0) {
        $messages = @($events | Where-Object { $_.type -match 'result|message' -and $_.message } | ForEach-Object { $_.message })
    }
    $structured = $null
    if ($messages.Count -gt 0) {
        $lastMessage = [string]$messages[-1]
        try { $structured = ($lastMessage | ConvertFrom-Json) } catch { }
        if (-not $structured) { $structured = ConvertFrom-ReviewEnvelopeTerminalSuffix -Text $lastMessage }
    }
    return @{ control = $control; structured = $(if ($structured) { _ToHashtable $structured } else { $null }); events = @($events) }
}

# Durable per-invocation result receipt.  Written canonically immediately
# after the provider process output is parsed and classified, BEFORE control
# returns to the dispatcher, so a crash between provider exit and dispatcher
# result handling can still reconstruct the exact AgentResult from disk.
function Get-RealAgentResultReceiptPath {
    param([Parameter(Mandatory)][string]$ArtifactDir,[Parameter(Mandatory)][string]$InvocationId,[Parameter(Mandatory)][string]$Role,[Parameter(Mandatory)][string]$Provider,[Parameter(Mandatory)][int]$Attempt)
    $stamp = '{0}-{1:000}-{2}-{3}' -f $Role, $Attempt, $Provider, $InvocationId.Substring(4,8)
    return (Join-Path $ArtifactDir "$stamp.agent-result.json")
}

function Write-RealAgentResultReceipt {
    param([Parameter(Mandatory)]$AgentResult)
    $path = [string]$AgentResult.resultReceiptPath
    if (-not $path) { throw 'agent result receipt: receipt path is absent' }
    $receipt = [ordered]@{
        schemaVersion='orcivo.orchestration.v2.agent-result-receipt/1'
        invocationId=[string]$AgentResult.invocationId
        provider=[string]$AgentResult.provider
        model=[string]$AgentResult.model
        profile=[string]$AgentResult.profile
        reasoningIntent=[string]$AgentResult.reasoningIntent
        attempt=[int]$AgentResult.attempt
        exitCode=[int]$AgentResult.exitCode
        providerClass=[string]$AgentResult.providerClass
        failureDiagnostic=$AgentResult.failureDiagnostic
        resultClass=[string]$AgentResult.resultClass
        structuredResult=$AgentResult.structuredResult
        promptArtifact=[string]$AgentResult.promptArtifact
        promptHash=[string]$AgentResult.promptHash
        stdoutArtifact=[string]$AgentResult.stdoutArtifact
        stdoutHash=[string]$AgentResult.stdoutHash
        stderrArtifact=[string]$AgentResult.stderrArtifact
        stderrHash=[string]$AgentResult.stderrHash
        controlRecordHash=[string]$AgentResult.controlRecordHash
        duration=[double]$AgentResult.duration
        contextRolloverRequired=[bool]$AgentResult.contextRolloverRequired
        capabilityVersion=[string]$AgentResult.capabilityVersion
        continuationCheckpoint=[string]$AgentResult.continuationCheckpoint
        usage=$AgentResult.usage
        cachedTokens=$AgentResult.cachedTokens
        returnedModels=@(@($AgentResult.returnedModels)|Where-Object{$_})
        requestManifestPath=[string]$AgentResult.requestManifestPath
        requestManifestHash=[string]$AgentResult.requestManifestHash
        costUsd=$AgentResult.costUsd
        telemetryConsistent=[bool]$AgentResult.telemetryConsistent
        createdAt=(Get-Date).ToUniversalTime().ToString('o')
    }
    $signed=[ordered]@{}; foreach($k in $receipt.Keys){$signed[$k]=$receipt[$k]}
    $receipt.receiptHash=New-ContentHash $signed
    if (Test-Path -LiteralPath $path) {
        try { $existing = Read-V2Json $path } catch { $existing = $null }
        if (-not $existing -or [string]$existing.receiptHash -ne [string]$receipt.receiptHash) {
            throw 'agent result receipt: conflicting duplicate result receipt'
        }
        return $existing
    }
    Write-V2JsonCanonical $path $receipt
    return $receipt
}

# Single classification path shared by live provider execution and restart
# reconstruction.  Turns a captured provider stdout (plus the launch bindings)
# into the exact AgentResult shape the dispatcher finalizer consumes, and
# persists the durable result receipt.
function ConvertTo-RealAgentInvocationResult {
    param(
        [Parameter(Mandatory)][ValidateSet('claude','codex','deepseek','glm')][string]$Provider,
        [Parameter(Mandatory)][ValidateSet('implementer','reviewer','classifier')][string]$Role,
        [Parameter(Mandatory)][string]$InvocationId,
        [Parameter(Mandatory)][int]$Attempt,
        [Parameter(Mandatory)][ValidateSet('FAST','BALANCED','REASONING','CRITICAL')][string]$Profile,
        [Parameter(Mandatory)]$Route,
        [Parameter(Mandatory)][int]$ExitCode,
        [Parameter(Mandatory)][double]$DurationSec,
        [Parameter(Mandatory)][string]$StdoutText,
        [Parameter(Mandatory)][string]$PromptFile,
        [Parameter(Mandatory)][string]$StdoutLog,
        [Parameter(Mandatory)][string]$StderrLog,
        [string]$ContinuationCheckpoint='',
        $DeepSeekRequestManifest=$null,
        [string]$DeepSeekRequestManifestPath='',
        [switch]$LiveBudgetAccounting
    )
    $parsed = $(if ($Provider -eq 'claude') { ConvertFrom-RealClaudeOutput $StdoutText } elseif ($Provider -eq 'glm') { ConvertFrom-RealGlmOutput $StdoutText } else { ConvertFrom-RealCodexOutput $StdoutText })
    $legacy = Get-FailureClassV2 -Provider $Provider -ExitCode $ExitCode -Control $parsed.control
    $providerClass = ConvertTo-CanonicalFailureClass -LegacyClass $legacy -Control $parsed.control
    $failureDiagnostic=$(if($Provider -eq 'deepseek'){Get-DeepSeekStructuredOutputFailureDiagnostic -Events @($parsed.events)}else{$null})
    $structured = $parsed.structured
    $resultClass = 'AGENT_FAILURE'
    if ($structured) {
        if ($Role -eq 'reviewer') { $resultClass = $(if ($structured.verdict) { [string]$structured.verdict } else { 'AGENT_FAILURE' }) }
        else { $resultClass = [string]$structured.resultClass }
    } elseif (Test-IsCanonicalProviderClass $providerClass) { $resultClass = 'AGENT_FAILURE' }
    if (($structured -and "$($structured.resultClass)" -eq 'CONTEXT_ROLLOVER') -or (Test-IsContextExhaustion $parsed.control)) {
        $providerClass = 'NONE'; $resultClass = 'CONTEXT_ROLLOVER'
    }
    if($Provider -eq 'deepseek' -and -not(Test-DeepSeekFinalStructuredEvent -Events @($parsed.events))){$providerClass='INCOMPLETE_PROVIDER_RESULT';$resultClass='AGENT_FAILURE';$structured=$null}
    if($failureDiagnostic){$providerClass=[string]$failureDiagnostic.classification;$resultClass='AGENT_FAILURE';$structured=$null}
    # Same fail-closed contract as DeepSeek: an exit-zero OpenCode stream
    # without a terminal step_finish never becomes candidate provenance.
    if($Provider -eq 'glm' -and -not(Test-GlmFinalStructuredEvent -Events @($parsed.events))){$providerClass='INCOMPLETE_PROVIDER_RESULT';$resultClass='AGENT_FAILURE';$structured=$null}
    if ($ExitCode -eq 0 -and $structured -and $providerClass -eq 'NONE' -and $Role -ne 'reviewer') {
        $schemaPath = $(if ($Role -eq 'reviewer') { Get-ReviewResultSchemaPath } else { Get-AgentResultSchemaPath })
        $schemaErrors = Test-JsonSchema (ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $structured)) (Get-Content -Raw -LiteralPath $schemaPath | ConvertFrom-Json)
        if ($schemaErrors.Count -gt 0) { $structured = $null; $resultClass = 'AGENT_FAILURE' }
    }

    $usage=$null;$cost=$null;$telemetryConsistent=$true;$returnedModels=@()
    if($Provider -eq 'deepseek'){
        $usage=Get-DeepSeekUsageFromEvents -Events @($parsed.events)
        $returnedModels=Get-DeepSeekReturnedModel -Events @($parsed.events)
        if($LiveBudgetAccounting){
            $resolution=$(if($DeepSeekRequestManifest){Resolve-DeepSeekBillableModel -RequestManifest $DeepSeekRequestManifest -Events @($parsed.events) -ExitCode $ExitCode}else{$null})
            if($resolution -and $resolution.ok){try{$cost=Register-DeepSeekUsage -Usage $usage -InvocationId $InvocationId -Model $Route.model -ReturnedModels $returnedModels -BillableResolution $resolution -ResultClass $resultClass -ExitCode $ExitCode}catch{$telemetryConsistent=$false;$unknownReason=$_.Exception.Message}}
            else{$telemetryConsistent=$false;$unknownReason=$(if($resolution){$resolution.reason}elseif(-not $usage){'usage is absent'}else{'request manifest is absent'})}
            if(-not $telemetryConsistent){try{[void](Register-DeepSeekUnknownUsage -InvocationId $InvocationId -Model $Route.model -Usage $usage -ReturnedModels $returnedModels -Reason $unknownReason -ResultClass $resultClass -ExitCode $ExitCode)}catch{}}
            # The per-response output cap is a property of the live launch
            # configuration; only the live path can enforce it against the
            # requested bound.  Recovery records only what the stream proves.
            $perResponseLimit=Test-DeepSeekPerResponseOutputLimit -Events @($parsed.events) -MaxOutputTokens ([int64]$Route.maxOutputTokens)
            if($perResponseLimit.exceeded){$telemetryConsistent=$false;$providerClass='PROVIDER_UNAVAILABLE';$resultClass='AGENT_FAILURE';try{[void](Register-DeepSeekUnknownUsage -InvocationId $InvocationId -Model $Route.model -Usage $usage -ReturnedModels $returnedModels -Reason 'per-response output token cap exceeded' -ResultClass $resultClass -ExitCode $ExitCode)}catch{}}
            if(-not $telemetryConsistent -and -not $failureDiagnostic){$providerClass='PROVIDER_UNAVAILABLE';$resultClass='AGENT_FAILURE'}
        }
    }
    if($Provider -eq 'glm'){
        # GLM is served through the NVIDIA NIM endpoint behind OpenCode: there
        # is no per-token budget ledger and no billable-model proof obligation.
        # step_finish token telemetry is recorded best-effort; its absence is
        # not an integrity failure, so telemetryConsistent stays true.
        $usage=Get-GlmUsageFromEvents -Events @($parsed.events)
        $cost=$(if($usage){$usage.costUsd}else{$null})
    }
    $result=[ordered]@{
        invocationId=$InvocationId
        provider=$Provider; model=$Route.model; reasoningIntent=$Route.reasoningIntent; profile=$Profile; attempt=$Attempt
        exitCode=$ExitCode; providerClass=$providerClass; resultClass=$resultClass
        failureDiagnostic=$failureDiagnostic
        structuredResult=$structured; promptArtifact=$PromptFile;promptHash=(New-FileHash $PromptFile);stdoutArtifact=$StdoutLog; stderrArtifact=$StderrLog
        stdoutHash=(New-FileHash $StdoutLog);stderrHash=(New-FileHash $StderrLog);controlRecordHash=(New-StringHash ([string]$StdoutText))
        duration=$DurationSec; contextRolloverRequired=($resultClass -eq 'CONTEXT_ROLLOVER')
        capabilityVersion=$Route.capabilityVersion; continuationCheckpoint=$ContinuationCheckpoint
        usage=$usage;cachedTokens=$(if($usage){$usage.cachedTokens}else{$null});returnedModels=@($returnedModels);requestManifestPath=$DeepSeekRequestManifestPath;requestManifestHash=$(if($DeepSeekRequestManifest){[string]$DeepSeekRequestManifest.manifestHash}else{$null});costUsd=$cost;telemetryConsistent=$telemetryConsistent
    }
    $result.resultReceiptPath=Get-RealAgentResultReceiptPath -ArtifactDir (Split-Path -Parent $StdoutLog) -InvocationId $InvocationId -Role $Role -Provider $Provider -Attempt $Attempt
    $receipt=Write-RealAgentResultReceipt -AgentResult $result
    $result.resultReceiptHash=[string]$receipt.receiptHash
    return $result
}

# Reconstruct one implementer-family AgentResult from durable evidence.
# Preferred authority is the validated agent-result receipt; the strict legacy
# fallback reconstructs only from the immutable prompt/stdout/stderr artifacts
# when the provider stream itself proves a terminal (or provably incomplete)
# result.  Nothing here ever infers SUCCESS from non-terminal evidence.
function Recover-RealAgentResultFromArtifacts {
    param(
        [Parameter(Mandatory)][ValidateSet('claude','codex','deepseek','glm')][string]$Provider,
        [Parameter(Mandatory)][ValidateSet('IMPLEMENTER','CORRECTOR')][string]$Role,
        [Parameter(Mandatory)][string]$InvocationId,
        [Parameter(Mandatory)][int]$Attempt,
        [Parameter(Mandatory)][string]$Profile,
        [Parameter(Mandatory)][string]$Model,
        [Parameter(Mandatory)][string]$ReasoningEffort,
        [Parameter(Mandatory)][string]$LogsDir,
        [Parameter(Mandatory)][string]$PromptArtifact,
        [Parameter(Mandatory)][string]$PromptHash,
        [string]$ContinuationCheckpoint=''
    )
    $fail={param([string]$Reason)return [ordered]@{outcome='UNRECOVERABLE_OR_AMBIGUOUS';reason=$Reason;source='';agentResult=$null;receiptPath='';receiptHash=''}}
    if($InvocationId -notmatch '^att-[0-9a-f]{32}$'){return &$fail 'invalid invocation id'}
    $logs=[IO.Path]::GetFullPath($LogsDir)
    $roleParam=$Role.ToLowerInvariant()
    $suffix=$InvocationId.Substring(4,8)
    $stamp='{0}-{1:000}-{2}-{3}' -f $roleParam,$Attempt,$Provider,$suffix
    $promptPath=[IO.Path]::GetFullPath((Join-Path $logs "$stamp.prompt.txt"))
    $stdoutPath=[IO.Path]::GetFullPath((Join-Path $logs "$stamp.stdout.log"))
    $stderrPath=[IO.Path]::GetFullPath((Join-Path $logs "$stamp.stderr.log"))
    $receiptPath=Get-RealAgentResultReceiptPath -ArtifactDir $logs -InvocationId $InvocationId -Role $roleParam -Provider $Provider -Attempt $Attempt
    $boundPrompt=[IO.Path]::GetFullPath($PromptArtifact)
    foreach($p in @($promptPath,$stdoutPath,$stderrPath)){
        if(-not $p.StartsWith(($logs.TrimEnd('\')+'\'),[StringComparison]::OrdinalIgnoreCase)){return &$fail "artifact path escapes the run log directory: $p"}
    }
    if($boundPrompt -ne $promptPath){return &$fail 'pre-invocation prompt artifact path does not match the deterministic invocation artifact'}
    if(-not (Test-Path -LiteralPath $promptPath)){return &$fail 'prompt artifact is absent'}
    if((New-FileHash $promptPath) -ne $PromptHash){return &$fail 'prompt artifact hash does not match the pre-invocation snapshot binding'}

    # Preferred authority: the validated durable receipt.
    if (Test-Path -LiteralPath $receiptPath) {
        try { $receipt = Read-V2Json $receiptPath } catch { return &$fail 'agent result receipt is unreadable' }
        $signed=[ordered]@{};foreach($k in $receipt.Keys){if($k -ne 'receiptHash'){$signed[$k]=$receipt[$k]}}
        if([string]$receipt.schemaVersion -ne 'orcivo.orchestration.v2.agent-result-receipt/1'){return &$fail 'agent result receipt schema mismatch'}
        if([string]$receipt.receiptHash -ne (New-ContentHash $signed)){return &$fail 'agent result receipt hash mismatch (tampered receipt)'}
        if([string]$receipt.invocationId -ne $InvocationId -or [string]$receipt.provider -ne $Provider -or [string]$receipt.model -ne $Model -or [int]$receipt.attempt -ne $Attempt){return &$fail 'agent result receipt binding mismatch'}
        if([string]$receipt.promptHash -ne $PromptHash){return &$fail 'agent result receipt prompt binding mismatch'}
        if([IO.Path]::GetFullPath([string]$receipt.promptArtifact) -ne $promptPath -or [IO.Path]::GetFullPath([string]$receipt.stdoutArtifact) -ne $stdoutPath -or [IO.Path]::GetFullPath([string]$receipt.stderrArtifact) -ne $stderrPath){return &$fail 'agent result receipt artifact path mismatch'}
        if(-not (Test-Path -LiteralPath $stdoutPath) -or (New-FileHash $stdoutPath) -ne [string]$receipt.stdoutHash){return &$fail 'stdout artifact does not match the receipt hash'}
        if(-not (Test-Path -LiteralPath $stderrPath) -or (New-FileHash $stderrPath) -ne [string]$receipt.stderrHash){return &$fail 'stderr artifact does not match the receipt hash'}
        $agentResult=[ordered]@{
            invocationId=[string]$receipt.invocationId
            provider=[string]$receipt.provider; model=[string]$receipt.model; reasoningIntent=[string]$receipt.reasoningIntent; profile=[string]$receipt.profile; attempt=[int]$receipt.attempt
            exitCode=[int]$receipt.exitCode; providerClass=[string]$receipt.providerClass; resultClass=[string]$receipt.resultClass
            failureDiagnostic=$receipt.failureDiagnostic
            structuredResult=$receipt.structuredResult; promptArtifact=[string]$receipt.promptArtifact; promptHash=[string]$receipt.promptHash; stdoutArtifact=[string]$receipt.stdoutArtifact; stderrArtifact=[string]$receipt.stderrArtifact
            stdoutHash=[string]$receipt.stdoutHash; stderrHash=[string]$receipt.stderrHash; controlRecordHash=[string]$receipt.controlRecordHash
            duration=[double]$receipt.duration; contextRolloverRequired=[bool]$receipt.contextRolloverRequired
            capabilityVersion=[string]$receipt.capabilityVersion; continuationCheckpoint=[string]$receipt.continuationCheckpoint
            usage=$receipt.usage; cachedTokens=$receipt.cachedTokens; returnedModels=@(@($receipt.returnedModels)|Where-Object{$_}); requestManifestPath=[string]$receipt.requestManifestPath; requestManifestHash=[string]$receipt.requestManifestHash; costUsd=$receipt.costUsd; telemetryConsistent=[bool]$receipt.telemetryConsistent
            resultReceiptPath=$receiptPath; resultReceiptHash=[string]$receipt.receiptHash
        }
        # The `source` field attributes the recovery AUTHORITY: a receipt that
        # existed before the restart.  A receipt written during legacy
        # reconstruction below never rewrites this attribution.
        return [ordered]@{outcome='RECOVERED_TERMINAL_RESULT';reason='validated agent-result receipt';source='AGENT_RESULT_RECEIPT';agentResult=$agentResult;receiptPath=$receiptPath;receiptHash=[string]$receipt.receiptHash}
    }

    # Legacy fallback: no receipt exists.  Reconstruct only when the immutable
    # provider stream itself proves a terminal result.
    if (-not (Test-Path -LiteralPath $stdoutPath)) {
        # The provider either never launched or left no capture; either way no
        # terminal result can be proven.  Route into the normal retry
        # machinery without ever inferring SUCCESS.
        return [ordered]@{outcome='PROVABLY_INCOMPLETE';reason='stdout artifact is absent';source='LEGACY_ARTIFACT_STRICT';agentResult=(New-RealAgentSyntheticIncompleteResult -Provider $Provider -Model $Model -Profile $Profile -ReasoningEffort $ReasoningEffort -InvocationId $InvocationId -Attempt $Attempt -Role $Role -PromptArtifact $promptPath -PromptHash $PromptHash -StdoutArtifact $stdoutPath -StderrArtifact $stderrPath -ContinuationCheckpoint $ContinuationCheckpoint);receiptPath='';receiptHash=''}
    }
    $raw=[IO.File]::ReadAllText($stdoutPath,[Text.Encoding]::UTF8)
    $parsed = $(if ($Provider -eq 'claude') { ConvertFrom-RealClaudeOutput $raw } elseif ($Provider -eq 'glm') { ConvertFrom-RealGlmOutput $raw } else { ConvertFrom-RealCodexOutput $raw })
    $control=$parsed.control
    $terminalProof=$false
    if ($Provider -eq 'glm') { $terminalProof=Test-GlmFinalStructuredEvent -Events @($parsed.events) }
    elseif ($Provider -eq 'deepseek') { $terminalProof=Test-DeepSeekFinalStructuredEvent -Events @($parsed.events) }
    elseif ($Provider -eq 'codex') { $terminalProof=($null -ne $control) }
    else { $terminalProof=($null -ne $control) }
    if ($control -and [bool]$control.isError) {
        # The control channel itself proves an errored terminal result; the
        # unknown process exit code is resolved to a nonzero sentinel, which
        # the shared classifier attributes only from this control channel.
        $result=ConvertTo-RealAgentInvocationResult -Provider $Provider -Role $roleParam -InvocationId $InvocationId -Attempt $Attempt -Profile $Profile -Route ([ordered]@{model=$Model;reasoningIntent=$ReasoningEffort;capabilityVersion=''}) -ExitCode 1 -DurationSec 0 -StdoutText $raw -PromptFile $promptPath -StdoutLog $stdoutPath -StderrLog $stderrPath -ContinuationCheckpoint $ContinuationCheckpoint
        # The receipt written here is a side effect of reconstruction, not the
        # authority the recovery used; the source stays legacy-strict.
        return [ordered]@{outcome='RECOVERED_TERMINAL_RESULT';reason='legacy artifacts prove an errored terminal control channel';source='LEGACY_ARTIFACT_STRICT';agentResult=$result;receiptPath=$result.resultReceiptPath;receiptHash=$result.resultReceiptHash}
    }
    if (-not $terminalProof) {
        return [ordered]@{outcome='PROVABLY_INCOMPLETE';reason='provider stream lacks a terminal event';source='LEGACY_ARTIFACT_STRICT';agentResult=(New-RealAgentSyntheticIncompleteResult -Provider $Provider -Model $Model -Profile $Profile -ReasoningEffort $ReasoningEffort -InvocationId $InvocationId -Attempt $Attempt -Role $Role -PromptArtifact $promptPath -PromptHash $PromptHash -StdoutArtifact $stdoutPath -StderrArtifact $stderrPath -ContinuationCheckpoint $ContinuationCheckpoint);receiptPath='';receiptHash=''}
    }
    # Terminal non-error control channel: the CLI finished writing its result
    # normally, which is the only exit-zero proof the control contract has.
    $result=ConvertTo-RealAgentInvocationResult -Provider $Provider -Role $roleParam -InvocationId $InvocationId -Attempt $Attempt -Profile $Profile -Route ([ordered]@{model=$Model;reasoningIntent=$ReasoningEffort;capabilityVersion=''}) -ExitCode 0 -DurationSec 0 -StdoutText $raw -PromptFile $promptPath -StdoutLog $stdoutPath -StderrLog $stderrPath -ContinuationCheckpoint $ContinuationCheckpoint
    if($result.providerClass -eq 'INCOMPLETE_PROVIDER_RESULT'){
        return [ordered]@{outcome='PROVABLY_INCOMPLETE';reason='provider stream is not a provably terminal result';source='LEGACY_ARTIFACT_STRICT';agentResult=(New-RealAgentSyntheticIncompleteResult -Provider $Provider -Model $Model -Profile $Profile -ReasoningEffort $ReasoningEffort -InvocationId $InvocationId -Attempt $Attempt -Role $Role -PromptArtifact $promptPath -PromptHash $PromptHash -StdoutArtifact $stdoutPath -StderrArtifact $stderrPath -ContinuationCheckpoint $ContinuationCheckpoint);receiptPath='';receiptHash=''}
    }
    # Same side-effect rule as the errored-control branch above: a receipt
    # written by reconstruction does not change the legacy-strict source.
    return [ordered]@{outcome='RECOVERED_TERMINAL_RESULT';reason='legacy artifacts prove a terminal provider result';source='LEGACY_ARTIFACT_STRICT';agentResult=$result;receiptPath=$result.resultReceiptPath;receiptHash=$result.resultReceiptHash}
}

# Deterministic dispatcher-side representation of a provably incomplete
# invocation.  It carries no provider authority and never claims SUCCESS; the
# finalizer routes it through the ordinary retry/failover machinery.
function New-RealAgentSyntheticIncompleteResult {
    param([string]$Provider,[string]$Model,[string]$Profile,[string]$ReasoningEffort,[string]$InvocationId,[int]$Attempt,[string]$Role,[string]$PromptArtifact,[string]$PromptHash,[string]$StdoutArtifact,[string]$StderrArtifact,[string]$ContinuationCheckpoint)
    return [ordered]@{
        invocationId=$InvocationId
        provider=$Provider; model=$Model; reasoningIntent=$ReasoningEffort; profile=$Profile; attempt=$Attempt
        exitCode=-1; providerClass='INCOMPLETE_PROVIDER_RESULT'; resultClass='AGENT_FAILURE'
        structuredResult=$null; promptArtifact=$PromptArtifact; promptHash=$PromptHash; stdoutArtifact=$StdoutArtifact; stderrArtifact=$StderrArtifact
        stdoutHash=$(if(Test-Path -LiteralPath $StdoutArtifact){New-FileHash $StdoutArtifact}else{'sha256:absent'}); stderrHash=$(if(Test-Path -LiteralPath $StderrArtifact){New-FileHash $StderrArtifact}else{'sha256:absent'}); controlRecordHash=$(if(Test-Path -LiteralPath $StdoutArtifact){New-StringHash ([string][IO.File]::ReadAllText($StdoutArtifact))}else{'sha256:absent'})
        duration=0; contextRolloverRequired=$false
        capabilityVersion=''; continuationCheckpoint=$ContinuationCheckpoint
        usage=$null; cachedTokens=$null; returnedModels=@(); requestManifestPath=''; requestManifestHash=$null; costUsd=$null; telemetryConsistent=$true
        syntheticIncomplete=$true
        resultReceiptPath=''; resultReceiptHash=''
    }
}

function Invoke-RealAgent {
    param(
        [Parameter(Mandatory)][ValidateSet('claude','codex','deepseek','glm')][string]$Provider,
        [Parameter(Mandatory)][ValidateSet('implementer','reviewer','classifier')][string]$Role,
        [Parameter(Mandatory)][string]$TaskVersion,
        [Parameter(Mandatory)][ValidateSet('FAST','BALANCED','REASONING','CRITICAL')][string]$Profile,
        [Parameter(Mandatory)][string]$Workspace,
        [Parameter(Mandatory)][string]$StructuredPrompt,
        [Parameter(Mandatory)][string]$ArtifactDir,
        [int]$TimeoutSec = 900,
        [int]$Attempt = 1,
        [string]$ContinuationCheckpoint = '',
        [string]$InvocationId = '',
        [scriptblock]$BeforeLaunch = $null
    )
    if (-not (Test-Path -LiteralPath $Workspace)) { throw "real-agent: workspace does not exist: $Workspace" }
    New-Item -ItemType Directory -Force -Path $ArtifactDir | Out-Null
    $invocationId=$(if($InvocationId){$InvocationId}else{New-AttemptId})
    if($invocationId -notmatch '^att-[0-9a-f]{32}$'){throw 'real-agent: invalid invocation id'}
    $stamp = '{0}-{1:000}-{2}-{3}' -f $Role, $Attempt, $Provider,$invocationId.Substring(4,8)
    $promptFile = Join-Path $ArtifactDir "$stamp.prompt.txt"
    [System.IO.File]::WriteAllText($promptFile, (Protect-ArtifactText $StructuredPrompt), (New-Utf8NoBom))
    $stdoutLog = Join-Path $ArtifactDir "$stamp.stdout.log"
    $stderrLog = Join-Path $ArtifactDir "$stamp.stderr.log"

    $route = Resolve-Provider -Profile $Profile -Provider $Provider -ReviewOnly:($Role -eq 'reviewer')
    if (-not $route.ok) {
        # Route resolution failed before any provider child existed, so there
        # is no provider output to receipt; the dispatcher-side failure class
        # is fully determined by the route result.
        return [ordered]@{ invocationId=$invocationId;provider=$Provider; model=''; profile=$Profile; attempt=$Attempt; exitCode=127; providerClass='PROVIDER_UNAVAILABLE'; resultClass='AGENT_FAILURE'; structuredResult=$null; stdoutArtifact=$stdoutLog; stderrArtifact=$stderrLog; stdoutHash='sha256:absent';stderrHash='sha256:absent';controlRecordHash='sha256:absent';duration=0; contextRolloverRequired=$false;resultReceiptPath='';resultReceiptHash='' }
    }
    if($Provider -eq 'deepseek'){
        # Checked here, non-throwing, for the same reason route resolution is
        # checked above: a paid provider that cannot afford this invocation is
        # a launch that never happened, not a crash. Assert-DeepSeekInvocationBudget
        # (called again just before the reservation, right before the paid
        # child launches) remains the throwing fail-safe for the residual race
        # between this check and that reservation.
        $budgetStatus=Get-DeepSeekBudgetStatus
        if(-not $budgetStatus.ok -or [decimal]$route.estimatedUsd -gt [decimal]$budgetStatus.remainingUsd){
            return [ordered]@{ invocationId=$invocationId;provider=$Provider; model=[string]$route.model; profile=$Profile; attempt=$Attempt; exitCode=127; providerClass='PROVIDER_UNAVAILABLE'; resultClass='AGENT_FAILURE'; structuredResult=$null; stdoutArtifact=$stdoutLog; stderrArtifact=$stderrLog; stdoutHash='sha256:absent';stderrHash='sha256:absent';controlRecordHash='sha256:absent';duration=0; contextRolloverRequired=$false;resultReceiptPath='';resultReceiptHash='' }
        }
    }
    $deepSeekRequestManifest=$null;$deepSeekRequestManifestPath=''
    if($Provider -eq 'deepseek'){
        $deepSeekRequestManifest=New-DeepSeekRequestManifest -InvocationId $invocationId -PromptHash (New-FileHash $promptFile) -Model ([string]$route.model) -Reasoning ([string]$route.reasoningIntent) -Profile $Profile
        $deepSeekRequestManifestPath=Join-Path $ArtifactDir "$stamp.request-manifest.json";Write-V2JsonCanonical $deepSeekRequestManifestPath $deepSeekRequestManifest
    }
    $schemaPath = $(if ($Role -eq 'reviewer') { Get-ReviewResultSchemaPath } else { Get-AgentResultSchemaPath })
    $args = @($route.invocationArgs)
    if ($Provider -eq 'claude') {
        $schemaJson = ConvertTo-CanonicalJson (Get-Content -Raw -LiteralPath $schemaPath | ConvertFrom-Json)
        $args += @('--output-format','json','--json-schema',$schemaJson,'--no-session-persistence','--safe-mode','--no-chrome','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--permission-prompts','none')
        if ($Role -eq 'reviewer' -or $Role -eq 'classifier') {
            $args += @('--restricted','--permission-mode','plan','--tools','Read')
        } else {
            $args += @('--permission-mode','bypassPermissions','--tools','default')
        }
    } elseif ($Provider -eq 'glm') {
        # OpenCode `run` reads the prompt from stdin, starts a fresh session
        # per invocation, and emits the JSONL control channel on stdout.  The
        # implementer works inside the isolated clone under the trusted-host
        # policy (AR-02, same explicit LOCAL_TRUSTED_HOST statement as Codex);
        # reviewers/classifiers get the read-only plan agent over the frozen
        # review-data directory and no shell-driven permission bypass.
        if ($Role -eq 'implementer') {
            $args += @('--dangerously-skip-permissions')
        } else {
            $args += @('--agent','plan')
        }
    } else {
        # sandbox/approval/cwd are root options in the installed 0.152 CLI and
        # must precede `exec`; the remaining switches belong to `exec`.
        $routeTail=@($route.invocationArgs|Select-Object -Skip 1)
        if($Role -eq 'implementer'){
            # This managed Windows build forces nested Codex processes to
            # read-only even when workspace-write is requested.  LOCAL_TRUSTED_HOST
            # mode is therefore explicit here.  The only writable task context
            # is an isolated clone with no remote; Git network operations are
            # independently disabled below and publication stays integrator-only.
            $args=@($routeTail)+@('--dangerously-bypass-approvals-and-sandbox','-C',$Workspace,'exec','--ephemeral','--ignore-user-config','--ignore-rules','--output-schema',$schemaPath,'--json','--color','never')
        } else {
            # Reviewers/classifiers have no shell at all and see only frozen
            # review data.  The dispatcher also hashes the directory before and
            # after the invocation and rejects mutation.
            $nodePath=(Get-Command node.exe -CommandType Application -ErrorAction Stop|Select-Object -First 1).Source.Replace('\','/')
            $readerPath=(Join-Path $PSScriptRoot 'review-reader.mjs').Replace('\','/')
            $reviewPath=([System.IO.Path]::GetFullPath($Workspace)).Replace('\','/')
            $mcpCommand='mcp_servers.review_reader.command="'+$nodePath+'"'
            $mcpArgs='mcp_servers.review_reader.args=["'+$readerPath+'","'+$reviewPath+'"]'
            $mcpAllowlist='mcp_servers.review_reader.enabled_tools=["read_review_artifact"]'
            $mcpPreapproval='mcp_servers.review_reader.tools.read_review_artifact.approval_mode="approve"'
            $args=@($routeTail)+@('-c',$mcpCommand,'-c',$mcpArgs,'-c',$mcpAllowlist,'-c',$mcpPreapproval,'--sandbox','read-only','--ask-for-approval','never','-C',$Workspace,'exec','--ephemeral','--ignore-user-config','--ignore-rules','--output-schema',$schemaPath,'--json','--color','never','--skip-git-repo-check','--disable','shell_tool')
        }
        $args += '-'
    }

    $envBlock = @{
        GIT_CONFIG_COUNT = '2'
        GIT_CONFIG_KEY_0 = 'remote.origin.url'
        GIT_CONFIG_VALUE_0 = 'disabled://dispatcher/no-fetch'
        GIT_CONFIG_KEY_1 = 'remote.origin.pushurl'
        GIT_CONFIG_VALUE_1 = 'disabled://dispatcher/no-push'
    }
    if($Provider -eq 'deepseek'){
        # Budget preflight occurs immediately before the paid child launch.  The
        # key remains inherited from the parent and is never copied into config,
        # artifacts, arguments, state, or this environment map.
        [void](Assert-DeepSeekInvocationBudget -EstimatedUsd ([decimal]$route.estimatedUsd))
        foreach($k in @($route.environment.Keys)){$envBlock[$k]=$route.environment[$k]}
    }
    $launch = Get-ProviderLaunchPlan -Provider $Provider -Arguments $args
    if($BeforeLaunch){
        # The callback is the only lifecycle point after the redacted prompt is
        # immutable and before a provider child can mutate the workspace.
        & $BeforeLaunch ([ordered]@{invocationId=$invocationId;promptArtifact=[IO.Path]::GetFullPath($promptFile);promptHash=(New-FileHash $promptFile);provider=$Provider;model=[string]$route.model;reasoningEffort=[string]$route.reasoningIntent;profile=$Profile;attempt=$Attempt;requestManifestPath=$deepSeekRequestManifestPath;requestManifestHash=$(if($deepSeekRequestManifest){[string]$deepSeekRequestManifest.manifestHash}else{''})})
    }
    if($Provider -eq 'deepseek'){
        # This is a durable upper bound reservation, not a cost estimate
        # recorded as spend. It prevents a retry loop from consuming the
        # monthly balance before the provider returns billable usage.
        [void](Reserve-DeepSeekInvocationBudget -InvocationId $invocationId -MaxUsd ([decimal]$route.estimatedUsd) -Model ([string]$route.model))
    }
    $proc = Invoke-NativeCaptured -Exe $launch.exe -Arguments $launch.arguments -WorkingDirectory $Workspace -StdinFile $promptFile `
        -StdoutLog $stdoutLog -StderrLog $stderrLog -TimeoutSec $TimeoutSec -EnvironmentOverrides $envBlock

    return (ConvertTo-RealAgentInvocationResult -Provider $Provider -Role $Role -InvocationId $invocationId -Attempt $Attempt -Profile $Profile -Route $route `
        -ExitCode ([int]$proc.exitCode) -DurationSec ([double]$proc.durationSec) -StdoutText ([string]$proc.stdout) -PromptFile $promptFile -StdoutLog $stdoutLog -StderrLog $stderrLog `
        -ContinuationCheckpoint $ContinuationCheckpoint -DeepSeekRequestManifest $deepSeekRequestManifest -DeepSeekRequestManifestPath $deepSeekRequestManifestPath -LiveBudgetAccounting)
}
