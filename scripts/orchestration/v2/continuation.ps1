<#
continuation.ps1 - context-window rollover.  (PRAGMATIC V2.1, PARTE 15 / 16)

Context-window exhaustion is NOT quota and NEVER fails over. When an invocation
hits a context limit the run creates a STRUCTURED continuation checkpoint that
carries ONLY:

  taskIdentity, acceptance, decisions, candidate, diffSummary,
  verificationResults, openFindings, nextAction, importantArtifacts

and a fresh invocation is opened on the SAME task lineage and SAME provider. No
hidden chain-of-thought / transcript is transported. The checkpoint schema is a
closed whitelist and any extra key fails closed.

The same primitive is the independent-review lineage carrier: a reviewer never
receives the implementer's hidden reasoning, only the bound task/candidate/diff.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:ContinuationDir = Join-Path (Get-V2Dir) 'continuations'
$script:AllowedCheckpointKeys = @(
    'taskIdentity', 'acceptance', 'decisions', 'candidate', 'diffSummary',
    'verificationResults', 'openFindings', 'nextAction', 'importantArtifacts'
)
# things that must NEVER appear in a continuation checkpoint
$script:ForbiddenCheckpointKeys = @(
    'chainOfThought', 'reasoning', 'thinking', 'scratchpad', 'transcript',
    'rawOutput', 'conversation', 'messages', 'history', 'internalMonologue'
)

# Detect context exhaustion from the provider control channel. Returns $true only
# for an unambiguous context/length signal - never a quota / rate / auth signal.
function Test-IsContextExhaustion {
    param($Control, [string]$AppStdout = '')
    $hay = ''
    if ($Control) { $hay = ("$($Control.errorType) $($Control.message)").ToLowerInvariant() }
    if ($hay -match 'quota|rate.?limit|insufficient|unauthorized|auth|429|billing') { return $false }
    if ($hay -match 'context.?length|context.?window|max_tokens|maximum context|prompt is too long|token limit|too many tokens|input length') { return $true }
    if ($AppStdout -match '(?im)^\s*CONTEXT_ROLLOVER\s*:') { return $true }
    return $false
}

function Get-ContinuationPath {
    param([string]$TaskVersionId, [int]$Seq)
    if ($TaskVersionId -notmatch '^[0-9a-f]{64}$') { throw "v2 continuation: bad taskVersionId" }
    return (Join-Path $script:ContinuationDir "$TaskVersionId\cont-$('{0:000}' -f $Seq).json")
}

function Get-ContinuationSeq {
    param([string]$TaskVersionId)
    $dir = Join-Path $script:ContinuationDir $TaskVersionId
    if (-not (Test-Path $dir)) { return 0 }
    return @(Get-ChildItem $dir -Filter 'cont-*.json' -ErrorAction SilentlyContinue).Count
}

function _CheckpointHash {
    param($C)
    $core = [ordered]@{}
    foreach ($k in $script:AllowedCheckpointKeys) { $core[$k] = (ConvertTo-DeepString $C.$k) }
    $core.v = 'orcivo.orchestration.v2.continuation-core/1'
    $core.taskVersionId = [string]$C.taskVersionId
    $core.seq = [int]$C.seq
    return (New-ContentHash $core)
}

# Enforce the closed whitelist. Throws (fail closed) on any forbidden / unknown key.
function Assert-CheckpointClean {
    param([hashtable]$Payload)
    foreach ($k in $Payload.Keys) {
        if ($script:ForbiddenCheckpointKeys -contains $k) {
            throw "v2 continuation: forbidden key '$k' in checkpoint (no hidden reasoning / transcript is carried - PARTE 15)"
        }
        if ($script:AllowedCheckpointKeys -notcontains $k) {
            throw "v2 continuation: unknown key '$k' - the checkpoint schema is a closed whitelist ($($script:AllowedCheckpointKeys -join ', '))"
        }
    }
}

function New-ContinuationCheckpoint {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][hashtable]$Payload,
        [string]$Provider = ''
    )
    Assert-CheckpointClean -Payload $Payload
    $seq = (Get-ContinuationSeq $TaskVersionId) + 1
    $c = [ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.continuation/1'
        taskVersionId = $TaskVersionId
        runId         = $RunId
        provider      = $Provider
        seq           = $seq
        reason        = 'context-window-exhaustion'
        isFailover    = $false
        createdAt     = (Get-Date).ToUniversalTime().ToString('o')
    }
    foreach ($k in $script:AllowedCheckpointKeys) {
        $c[$k] = $(if ($Payload.ContainsKey($k)) { $Payload[$k] } else { $null })
    }
    $c.checkpointHash = _CheckpointHash $c
    Write-V2JsonCanonical (Get-ContinuationPath $TaskVersionId $seq) $c
    Write-V2Log "continuation: $($TaskVersionId.Substring(0,12)) checkpoint #$seq (fresh invocation, same lineage, provider $Provider)"
    return $c
}

function Get-ContinuationCheckpoint {
    param([string]$TaskVersionId, [int]$Seq = 0)
    if ($Seq -le 0) { $Seq = (Get-ContinuationSeq $TaskVersionId) }
    if ($Seq -le 0) { return $null }
    $p = Get-ContinuationPath $TaskVersionId $Seq
    if (-not (Test-Path $p)) { return $null }
    $c = Read-V2Json $p
    if ((_CheckpointHash $c) -ne $c.checkpointHash) { throw "v2 continuation: checkpoint #$Seq hash mismatch (tampered)" }
    return $c
}

# ---- Wave 0 selftest ------------------------------------------------------
function Test-ContinuationSelftest {
    $fail = @()

    # context exhaustion detection
    if (-not (Test-IsContextExhaustion @{ errorType = 'invalid_request_error'; message = 'prompt is too long: 250000 tokens > 200000 maximum context length' })) {
        $fail += "context-length control message not detected"
    }
    if (Test-IsContextExhaustion @{ errorType = 'error_quota'; message = 'insufficient_quota' }) {
        $fail += "quota misclassified as context exhaustion"
    }
    if (Test-IsContextExhaustion @{ errorType = 'rate_limit_error'; message = 'context is fine but 429 too many requests' }) {
        $fail += "rate limit misclassified as context exhaustion"
    }
    if (-not (Test-IsContextExhaustion $null 'CONTEXT_ROLLOVER: hit the window')) {
        $fail += "explicit CONTEXT_ROLLOVER sentinel not detected"
    }

    # forbidden key rejected
    try {
        Assert-CheckpointClean -Payload @{ nextAction = 'x'; chainOfThought = 'secret reasoning' }
        $fail += "forbidden key 'chainOfThought' was accepted"
    } catch { }
    # unknown key rejected
    try {
        Assert-CheckpointClean -Payload @{ nextAction = 'x'; randomField = 'y' }
        $fail += "unknown key 'randomField' was accepted"
    } catch { }
    # clean payload accepted
    try { Assert-CheckpointClean -Payload @{ taskIdentity = 't'; acceptance = 'a'; nextAction = 'n' } }
    catch { $fail += "clean payload rejected: $($_.Exception.Message)" }

    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail) }
}
