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

function Get-AgentResultSchemaPath { return (Join-Path (Get-V2Dir) 'schemas\agent-result.schema.json') }
function Get-ReviewResultSchemaPath { return (Join-Path (Get-V2Dir) 'schemas\review-agent-result.schema.json') }

function Get-ProviderLaunchPlan {
    param([ValidateSet('claude','codex','deepseek')][string]$Provider, [string[]]$Arguments)
    if ($Provider -eq 'claude') {
        $cmd = Get-Command 'claude' -CommandType Application -ErrorAction Stop | Select-Object -First 1
        return @{ exe=$cmd.Source; arguments=@($Arguments) }
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
        try { $structured = ([string]$messages[-1] | ConvertFrom-Json) } catch { }
    }
    return @{ control = $control; structured = $(if ($structured) { _ToHashtable $structured } else { $null }); events = @($events) }
}

function Invoke-RealAgent {
    param(
        [Parameter(Mandatory)][ValidateSet('claude','codex','deepseek')][string]$Provider,
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

    $route = Resolve-Provider -Profile $Profile -Provider $Provider
    if (-not $route.ok) {
        return [ordered]@{ invocationId=$invocationId;provider=$Provider; model=''; profile=$Profile; attempt=$Attempt; exitCode=127; providerClass='PROVIDER_UNAVAILABLE'; resultClass='AGENT_FAILURE'; structuredResult=$null; stdoutArtifact=$stdoutLog; stderrArtifact=$stderrLog; stdoutHash='sha256:absent';controlRecordHash='sha256:absent';duration=0; contextRolloverRequired=$false }
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

    $parsed = $(if ($Provider -eq 'claude') { ConvertFrom-RealClaudeOutput $proc.stdout } else { ConvertFrom-RealCodexOutput $proc.stdout })
    $legacy = Get-FailureClassV2 -Provider $Provider -ExitCode $proc.exitCode -Control $parsed.control
    $providerClass = ConvertTo-CanonicalFailureClass -LegacyClass $legacy -Control $parsed.control
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
    if ($proc.exitCode -eq 0 -and $structured -and $providerClass -eq 'NONE' -and $Role -ne 'reviewer') {
        $schemaErrors = Test-JsonSchema (ConvertFrom-JsonTyped (ConvertTo-CanonicalJson $structured)) (Get-Content -Raw -LiteralPath $schemaPath | ConvertFrom-Json)
        if ($schemaErrors.Count -gt 0) { $structured = $null; $resultClass = 'AGENT_FAILURE' }
    }

    $usage=$null;$cost=$null;$telemetryConsistent=$true;$returnedModels=@()
    if($Provider -eq 'deepseek'){
        $usage=Get-DeepSeekUsageFromEvents -Events @($parsed.events)
        $returnedModels=Get-DeepSeekReturnedModel -Events @($parsed.events)
        $resolution=$(if($deepSeekRequestManifest){Resolve-DeepSeekBillableModel -RequestManifest $deepSeekRequestManifest -Events @($parsed.events) -ExitCode $proc.exitCode}else{$null})
        if($resolution -and $resolution.ok){try{$cost=Register-DeepSeekUsage -Usage $usage -InvocationId $invocationId -Model $route.model -ReturnedModels $returnedModels -BillableResolution $resolution -ResultClass $resultClass -ExitCode $proc.exitCode}catch{$telemetryConsistent=$false;$unknownReason=$_.Exception.Message}}
        else{$telemetryConsistent=$false;$unknownReason=$(if($resolution){$resolution.reason}elseif(-not $usage){'usage is absent'}else{'request manifest is absent'})}
        if(-not $telemetryConsistent){try{[void](Register-DeepSeekUnknownUsage -InvocationId $invocationId -Model $route.model -Usage $usage -ReturnedModels $returnedModels -Reason $unknownReason -ResultClass $resultClass -ExitCode $proc.exitCode)}catch{}}
        if($usage -and [int64]$usage.outputTokens -gt [int64]$route.maxOutputTokens){$telemetryConsistent=$false;$providerClass='PROVIDER_UNAVAILABLE';$resultClass='AGENT_FAILURE';try{[void](Register-DeepSeekUnknownUsage -InvocationId $invocationId -Model $route.model -Usage $usage -ReturnedModels $returnedModels -Reason 'output token cap exceeded' -ResultClass $resultClass -ExitCode $proc.exitCode)}catch{}}
        if(-not $telemetryConsistent){$providerClass='PROVIDER_UNAVAILABLE';$resultClass='AGENT_FAILURE'}
    }
    return [ordered]@{
        invocationId=$invocationId
        provider=$Provider; model=$route.model; reasoningIntent=$route.reasoningIntent; profile=$Profile; attempt=$Attempt
        exitCode=$proc.exitCode; providerClass=$providerClass; resultClass=$resultClass
        structuredResult=$structured; promptArtifact=$promptFile;promptHash=(New-FileHash $promptFile);stdoutArtifact=$stdoutLog; stderrArtifact=$stderrLog
        stdoutHash=(New-FileHash $stdoutLog);controlRecordHash=(New-StringHash ([string]$proc.stdout))
        duration=$proc.durationSec; contextRolloverRequired=($resultClass -eq 'CONTEXT_ROLLOVER')
        capabilityVersion=$route.capabilityVersion; continuationCheckpoint=$ContinuationCheckpoint
        usage=$usage;cachedTokens=$(if($usage){$usage.cachedTokens}else{$null});returnedModels=@($returnedModels);requestManifestPath=$deepSeekRequestManifestPath;requestManifestHash=$(if($deepSeekRequestManifest){[string]$deepSeekRequestManifest.manifestHash}else{$null});costUsd=$cost;telemetryConsistent=$telemetryConsistent
    }
}
