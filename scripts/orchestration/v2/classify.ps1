<#
classify.ps1 - failure classification from the provider CONTROL CHANNEL only.  (H-01)

Fixes H-01: V1 Classify-AgentFailure grepped raw stdout/stderr for "quota", "429",
"billing", "overloaded"... so a test, a log line, a task spec or the application's
own output could trigger Claude->Codex or Codex->Claude even with a healthy provider.

V2 rules:
  * Provider attribution comes ONLY from the CLI's own structured result channel
    (claude -p --output-format json result object, codex exec --json event stream).
    Application stdout/stderr is UNTRUSTED for classification and is never consulted
    for a PROVIDER_* verdict.
  * If the control channel is absent or unparseable, the class is UNKNOWN and the
    run STOPS for a human. UNKNOWN never fails over.
  * Failover is allowed only for config.classification.providerClasses, and at most
    config.classification.maxCrossProviderFailoversPerLineage times per attempt lineage.
  * A negative corpus (Test-NegativeCorpus) proves application text with provider-
    looking words never yields a PROVIDER_* class.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

# Normalize a claude `--output-format json` result object to the common shape.
function ConvertFrom-ClaudeResult {
    param($ResultObj)   # already parsed
    if (-not $ResultObj) { return $null }
    $isErr = ($ResultObj.is_error -eq $true) -or ("$($ResultObj.subtype)" -match 'error')
    $apiStatus=0
    if($ResultObj.api_error_status){$apiStatus=[int]$ResultObj.api_error_status}
    elseif($ResultObj.error -and $ResultObj.error.status){$apiStatus=[int]$ResultObj.error.status}
    $httpStatus=$(if($ResultObj.status){[int]$ResultObj.status}else{$apiStatus})
    $errorMessage=$(if($ResultObj.error -is [string]){[string]$ResultObj.error}elseif($ResultObj.error -and $ResultObj.error.message){[string]$ResultObj.error.message}else{''})
    $message=Protect-SecretsStreaming ("$errorMessage$($ResultObj.result)")
    return [ordered]@{
        channel   = 'claude'
        isError   = [bool]$isErr
        errorType = "$($ResultObj.error_type)$($ResultObj.subtype)"
        httpStatus = $httpStatus
        apiErrorStatus = $apiStatus
        subtype = [string]$ResultObj.subtype
        terminalReason = [string]$ResultObj.terminal_reason
        permissionDenialCount = $(if($null -eq $ResultObj.permission_denials){0}else{@($ResultObj.permission_denials).Count})
        message   = $message
    }
}

function Test-ClaudeSubscriptionAccessDisabled {
    param($Control)
    if(-not $Control -or [string]$Control.channel -ne 'claude' -or -not [bool]$Control.isError){return $false}
    if([int]$Control.httpStatus -ne 403 -and [int]$Control.apiErrorStatus -ne 403){return $false}
    if([int]$Control.permissionDenialCount -gt 0){return $false}
    if([string]$Control.terminalReason -notmatch '(?i)^api[_ -]?error$'){return $false}
    $text=[string]$Control.message
    return [bool]($text -match '(?i)(?:claude(?: code)?\s+)?subscription access.{0,64}(?:disabled|unavailable)|(?:disabled|unavailable).{0,64}(?:claude(?: code)?\s+)?subscription access')
}

# Normalize a codex `exec --json` event stream (array of parsed events).
function ConvertFrom-CodexEvents {
    param($Events)
    if (-not $Events) { return $null }
    $err = @($Events | Where-Object { "$($_.type)" -match 'error' -or $_.error }) | Select-Object -Last 1
    if (-not $err) {
        $done = @($Events | Where-Object { "$($_.type)" -match 'task_complete|turn_complete|result' }) | Select-Object -Last 1
        if ($done) { return [ordered]@{ channel = 'codex'; isError = $false; errorType = ''; httpStatus = 0; message = 'complete' } }
        return $null
    }
    return [ordered]@{
        channel   = 'codex'
        isError   = $true
        errorType = "$($err.error_type)$($err.type)$($err.code)"
        httpStatus = $(if ($err.status) { [int]$err.status } else { 0 })
        message   = "$($err.message)$($err.error)"
    }
}

# The classifier. $Control is the normalized control-channel shape (or $null).
function Get-FailureClassV2 {
    param(
        [Parameter(Mandatory)][ValidateSet('claude','codex')][string]$Provider,
        [int]$ExitCode = 0,
        $Control = $null,
        [string]$AppStdout = ''          # UNTRUSTED - used ONLY for the explicit HUMAN_GATE sentinel
    )
    # explicit, line-anchored operator sentinel is allowed from app output
    if ($AppStdout -match '(?im)^\s*HUMAN_GATE\s*:') { return 'HUMAN_GATE' }
    if ($AppStdout -match '(?im)^\s*POLICY_BLOCK\s*:') { return 'POLICY_BLOCK' }

    if ($ExitCode -eq 124) { return 'TIMEOUT' }

    if ($null -eq $Control) {
        # no structured signal -> we cannot attribute this to the provider
        if ($ExitCode -eq 0) { return 'OK' }
        return 'UNKNOWN'
    }

    if (-not $Control.isError) {
        if ($ExitCode -eq 0) { return 'OK' }
        return 'UNKNOWN'
    }

    $t = ("$($Control.errorType) $($Control.message)").ToLowerInvariant()
    $s = [int]$Control.httpStatus

    if ([int]$Control.permissionDenialCount -gt 0) { return 'TOOL_ERROR' }
    if ($Provider -eq 'claude' -and (Test-ClaudeSubscriptionAccessDisabled $Control)) { return 'PROVIDER_AUTH' }
    if ($t -match 'auth|unauthorized|invalid[_ ]?api[_ ]?key|login|token[_ ]?expired|401' -or $s -eq 401) { return 'PROVIDER_AUTH' }
    if ($t -match 'insufficient_quota|credit balance|usage limit|quota' -and $t -notmatch 'test|assert') { return 'PROVIDER_QUOTA' }
    if ($t -match 'rate[_ ]?limit|too many requests|429' -or $s -eq 429) { return 'PROVIDER_RATE_LIMIT' }
    if ($t -match 'overloaded|unavailable|upstream|gateway|stream (disconnected|error)|5\d\d' -or $s -in @(500,502,503,504)) { return 'PROVIDER_TRANSIENT' }
    if ($t -match 'tool[_ ]?error|permission denied|sandbox') { return 'TOOL_ERROR' }

    # the model/runtime reported an error that is NOT a provider transport issue
    return 'APPLICATION_ERROR'
}

function Test-IsProviderClass {
    param([string]$Class)
    $cfg = Get-V2Config
    return (@($cfg.classification.providerClasses) -contains $Class)
}

function Test-ShouldFailover {
    param([string]$Class, [int]$FailoversSoFar = 0)
    $cfg = Get-V2Config
    if (-not (Test-IsProviderClass $Class)) { return $false }
    return ($FailoversSoFar -lt [int]$cfg.classification.maxCrossProviderFailoversPerLineage)
}

# ---- negative corpus: application text must never classify a provider --------
function Get-NegativeCorpus {
    return @(
        'HTTP 429 Too Many Requests returned by the app under test',
        'Error: quota exceeded for project bucket in the integration test',
        'billing_test.spec.ts: expect(invoice.status).toBe("rate_limit")',
        'service unavailable: the mocked payment gateway returned 503',
        'authentication failed for user test@example.com in the login e2e',
        'console.log("insufficient_quota") // fixture string',
        'assert response.overloaded_error == true'
    )
}

function Test-NegativeCorpus {
    $bad = @()
    foreach ($line in (Get-NegativeCorpus)) {
        # app text on stdout, no control channel, non-zero exit
        $c = Get-FailureClassV2 -Provider 'claude' -ExitCode 1 -Control $null -AppStdout $line
        if (Test-IsProviderClass $c) { $bad += "app line classified as $c :: $line" }
    }
    return [ordered]@{ ok = ($bad.Count -eq 0); failures = @($bad) }
}
