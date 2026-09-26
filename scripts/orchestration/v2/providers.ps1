<#
providers.ps1 - CLAUDE <-> CODEX failover, WAITING_PROVIDER, automatic resume.
                (PRAGMATIC V2.1, PARTE 13 / 14 / 15)

Rules:
  * Automatic provider switch is allowed ONLY for a class in
    config.classification.providerClasses AND only when that class came from the
    CLI's own structured control channel (classify.ps1 / H-01). TEST_FAILED /
    BUG / BUILD_FAILED / REVIEW_REQUEST_CHANGES / INVALID_IMPLEMENTATION never
    fail over just because the task failed.
  * <= config.providerFailover.maxCrossProviderFailoversPerLineage switches per
    attempt lineage.
  * When ALL enabled providers are unavailable -> the ledger goes WAITING_PROVIDER, a
    durable wait record persists everything needed to resume, and the supervisor
    keeps polling with backoff. When a provider is healthy again the task resumes
    automatically - no human action, and this survives a supervisor/PC restart.
  * Context-window exhaustion is NOT a provider failure (PARTE 15) - see
    continuation.ps1.

Health-probe fault seam ($script:ProviderHealthFaults) is set ONLY by the
disposable Wave 0 harness. It is never set by any production entrypoint and
there is no environment variable for it.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'ledger.ps1')
. (Join-Path $PSScriptRoot 'classify.ps1')
. (Join-Path $PSScriptRoot 'deepseek.ps1')

$script:ProviderHealthFaults = $null   # $null in every real path
function _phFault { param([string]$Provider) return ($script:ProviderHealthFaults -and $script:ProviderHealthFaults.ContainsKey($Provider)) }

$script:ProviderWaitDir = Join-Path (Get-V2Dir) 'provider-waits'

# ---- health -----------------------------------------------------------------
# A provider is healthy if its CLI is resolvable AND a lightweight probe does not
# report an unrecoverable provider condition. The probe is intentionally cheap;
# the authoritative signal during a run is still the control channel (classify.ps1).
function Get-ProviderHealth {
    param([Parameter(Mandatory)][ValidateSet('claude', 'codex', 'deepseek', 'glm')][string]$Provider)
    $cfg = Get-V2Config
    if($Provider -eq 'deepseek'){
        $budget=Get-DeepSeekBudgetStatus
        if(-not $budget.ok){return [ordered]@{provider='deepseek';healthy=$false;reason=$budget.reason;class='PROVIDER_UNAVAILABLE';probedAt=(Get-Date).ToUniversalTime().ToString('o')}}
        if(-not $env:DEEPSEEK_API_KEY){return [ordered]@{provider='deepseek';healthy=$false;reason='DEEPSEEK_API_KEY is unavailable';class='PROVIDER_AUTH';probedAt=(Get-Date).ToUniversalTime().ToString('o')}}
        $bin='codex'
    }else{$bin = $cfg.providers.$Provider.bin}

    if ($script:ProviderHealthFaults -ne $null) {
        # deterministic harness mode: health is exactly what the harness declares
        $f = $script:ProviderHealthFaults[$Provider]
        if ($null -eq $f) { return [ordered]@{ provider = $Provider; healthy = $true; reason = 'harness: healthy'; probedAt = (Get-Date).ToUniversalTime().ToString('o') } }
        return [ordered]@{ provider = $Provider; healthy = $false; reason = "harness: $f"; class = "$f"; probedAt = (Get-Date).ToUniversalTime().ToString('o') }
    }

    if (-not (Get-Command $bin -ErrorAction SilentlyContinue)) {
        return [ordered]@{ provider = $Provider; healthy = $false; reason = "CLI '$bin' not on PATH"; class = 'PROVIDER_UNAVAILABLE'; probedAt = (Get-Date).ToUniversalTime().ToString('o') }
    }
    # The CLI resolves. A cheap best-effort probe: any explicit "unavailable" text
    # from `<bin> --version` (auth failure / not-logged-in) marks it unhealthy;
    # everything else is healthy enough to resume - the authoritative signal
    # during a run is still the control channel (classify.ps1). We do NOT spend a
    # model call just to probe.
    $probe = ''
    try { $probe = ((& $bin --version 2>&1) -join ' ').ToLowerInvariant() } catch { $probe = '' }
    if ($probe -match 'not logged in|please log in|unauthorized|authentication (failed|required)|no api key|credential') {
        return [ordered]@{ provider = $Provider; healthy = $false; reason = "CLI '$bin' reports an auth/login problem"; class = 'PROVIDER_AUTH'; probedAt = (Get-Date).ToUniversalTime().ToString('o') }
    }
    return [ordered]@{ provider = $Provider; healthy = $true; reason = "cli '$bin' resolves"; probedAt = (Get-Date).ToUniversalTime().ToString('o') }
}

function Get-HealthyProviders {
    $out = @()
    foreach ($p in @(Get-OrcivoEnabledProviders)) {
        if ((Get-ProviderHealth -Provider $p).healthy) { $out += $p }
    }
    return @($out)
}

# ---- failover decision -----------------------------------------------------
# Class MUST come from classify.ps1 (control channel). Returns:
#   @{ action = 'FAILOVER'|'WAITING_PROVIDER'|'NO_FAILOVER'; nextProvider; reason }
function Get-FailoverDecision {
    param(
        [Parameter(Mandatory)][ValidateSet('claude', 'codex', 'deepseek', 'glm')][string]$CurrentProvider,
        [Parameter(Mandatory)][string]$Class,
        [int]$FailoversSoFar = 0,
        [string[]]$UnavailableProviders = @()
    )
    $cfg = Get-V2Config
    if (-not (Test-IsProviderClass $Class)) {
        return [ordered]@{ action = 'NO_FAILOVER'; nextProvider = $null; reason = "class '$Class' is not a provider class - a task failure never fails over" }
    }
    $order = @(Get-OrcivoEnabledProviders)
    $others = @($order | Where-Object { $_ -ne $CurrentProvider -and @($UnavailableProviders) -notcontains $_ })
    $max = [int]$cfg.providerFailover.maxCrossProviderFailoversPerLineage

    if ($FailoversSoFar -ge $max) {
        # already used our switch budget for this lineage
        $healthy = @(Get-HealthyProviders | Where-Object { @($UnavailableProviders) -notcontains $_ })
        if ($healthy.Count -eq 0) {
            return [ordered]@{ action = 'WAITING_PROVIDER'; nextProvider = $null; reason = "provider class '$Class'; failover budget spent ($FailoversSoFar/$max); no healthy provider" }
        }
        return [ordered]@{ action = 'NO_FAILOVER'; nextProvider = $null; reason = "provider class '$Class' but failover budget spent ($FailoversSoFar/$max)" }
    }

    foreach ($cand in $others) {
        if ((Get-ProviderHealth -Provider $cand).healthy) {
            return [ordered]@{ action = 'FAILOVER'; nextProvider = $cand; reason = "provider class '$Class' on '$CurrentProvider' -> '$cand' (healthy)" }
        }
    }
    # no alternate provider is healthy - and the current one just failed with a provider class
    return [ordered]@{ action = 'WAITING_PROVIDER'; nextProvider = $null; reason = "provider class '$Class' on '$CurrentProvider'; no alternate provider is healthy" }
}

# ---- WAITING_PROVIDER: durable wait record + ledger transition ------------
function Get-ProviderWaitPath {
    param([string]$TaskVersionId)
    if ($TaskVersionId -notmatch '^[0-9a-f]{64}$') { throw "v2 providers: bad taskVersionId" }
    return (Join-Path $script:ProviderWaitDir "$TaskVersionId.json")
}

function _NextBackoffSec {
    param([int]$PollCount)
    $cfg = Get-V2Config
    $arr = @($cfg.providerFailover.pollBackoffSec)
    $i = [Math]::Min($PollCount, $arr.Count - 1)
    if ($i -lt 0) { $i = 0 }
    $v = [int]$arr[$i]
    return [Math]::Min($v, [int]$cfg.providerFailover.pollMaxIntervalSec)
}

# Persist EVERYTHING needed to resume (PARTE 14) and move the ledger to
# WAITING_PROVIDER. $Context carries: workspace, candidateCommit, candidateTree,
# generation, attemptHistory[], providerHistory[], verificationState, reviewState,
# checkpoint, lastErrorClass.
function Enter-WaitingProvider {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][hashtable]$Context
    )
    $now = (Get-Date).ToUniversalTime()
    $prior = Get-ProviderWait $TaskVersionId
    $sameLineage = [bool]($prior -and [string]$prior.runId -eq $RunId -and [string]$prior.workspace -eq [string]$Context.workspace)
    # A CLI resolving on PATH is only a cheap probe, not proof that its account
    # can execute a turn.  If such a probe resumes and the real invocation fails
    # again, retain the lineage's accumulated backoff instead of recreating a
    # fresh 30-second wait record.
    $pollCount = $(if ($sameLineage) { [int]$prior.pollCount + 1 } else { 0 })
    $backoff = _NextBackoffSec $pollCount
    $st = Get-LedgerState $TaskVersionId
    if ($st.state -eq 'DISCOVERED') { Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'ready' -ToState 'READY' | Out-Null; $st = Get-LedgerState $TaskVersionId }
    if ($st.state -in @('RUNNING', 'DISPATCHED', 'READY')) {
        Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'provider-unavailable' -ToState 'WAITING_PROVIDER' -RunId $RunId -Note ([string]$Context.lastErrorClass) | Out-Null
    }
    $rec = [ordered]@{
        schemaVersion   = 'orcivo.orchestration.v2.provider-wait/1'
        taskVersionId   = $TaskVersionId
        taskId          = "$($Context.taskId)"
        runId           = $RunId
        generation      = "$($Context.generation)"
        workspace       = "$($Context.workspace)"
        candidateCommit = "$($Context.candidateCommit)"
        candidateTree   = "$($Context.candidateTree)"
        attemptHistory  = @($Context.attemptHistory)
        providerHistory = @($Context.providerHistory)
        verificationState = "$($Context.verificationState)"
        reviewState     = "$($Context.reviewState)"
        checkpoint      = ([ordered]@{} + $(if ($Context.checkpoint) { $Context.checkpoint } else { @{} }))
        lastErrorClass  = "$($Context.lastErrorClass)"
        enteredAt       = $(if ($sameLineage -and $prior.enteredAt) { [string]$prior.enteredAt } else { $now.ToString('o') })
        pollCount       = $pollCount
        nextRetryAt     = $now.AddSeconds($backoff).ToString('o')
        nextBackoffSec  = $backoff
        unavailableProviders = @($Context.unavailableProviders)
        resolvedAt      = $null
    }
    Write-V2JsonCanonical (Get-ProviderWaitPath $TaskVersionId) $rec
    Write-V2Log "providers: $($TaskVersionId.Substring(0,12)) -> WAITING_PROVIDER (class $($Context.lastErrorClass); next probe in $($rec.nextBackoffSec)s)" 'WARN'
    return $rec
}

function Get-ProviderWait {
    param([string]$TaskVersionId)
    $p = Get-ProviderWaitPath $TaskVersionId
    if (-not (Test-Path $p)) { return $null }
    try { return (Read-V2Json $p) } catch { return $null }
}

function Get-AllProviderWaits {
    if (-not (Test-Path $script:ProviderWaitDir)) { return @() }
    return @(Get-ChildItem $script:ProviderWaitDir -Filter '*.json' -ErrorAction SilentlyContinue | ForEach-Object {
        try { Read-V2Json $_.FullName } catch { $null }
    } | Where-Object { $_ })
}

# Is it time to probe, and is a provider healthy now?
function Test-ProviderResumeReady {
    param([string]$TaskVersionId, [switch]$IgnoreBackoff)
    $w = Get-ProviderWait $TaskVersionId
    if (-not $w) { return [ordered]@{ ready = $false; reason = 'no provider-wait record' } }
    if (-not $IgnoreBackoff) {
        $due = [datetime]::Parse($w.nextRetryAt).ToUniversalTime()
        if ((Get-Date).ToUniversalTime() -lt $due) {
            return [ordered]@{ ready = $false; reason = "backoff: next probe at $($w.nextRetryAt)"; nextRetryAt = $w.nextRetryAt }
        }
    }
    $healthy = @(Get-HealthyProviders)
    if ($healthy.Count -eq 0) { return [ordered]@{ ready = $false; reason = 'still no healthy provider'; healthy = @() } }
    return [ordered]@{ ready = $true; reason = "provider(s) healthy: $($healthy -join ',')"; provider = $healthy[0]; healthy = @($healthy) }
}

# Record a probe that found nothing - advance the backoff (idempotent, CAS-free
# single-writer: only the scheduler polls).
function Update-ProviderWaitBackoff {
    param([string]$TaskVersionId)
    $p = Get-ProviderWaitPath $TaskVersionId
    $w = Get-ProviderWait $TaskVersionId
    if (-not $w) { return }
    $w.pollCount = [int]$w.pollCount + 1
    $b = _NextBackoffSec ([int]$w.pollCount)
    $w.nextBackoffSec = $b
    $w.nextRetryAt = (Get-Date).ToUniversalTime().AddSeconds($b).ToString('o')
    Write-V2JsonCanonical $p $w
}

# Resume: WAITING_PROVIDER -> DISPATCHED, same lineage, WITHOUT counting a new
# attempt (event 'provider-resume', not 'dispatch'). Returns the chosen provider.
function Resume-FromWaitingProvider {
    param([string]$TaskVersionId, [string]$RunId, [switch]$IgnoreBackoff)
    $rr = Test-ProviderResumeReady -TaskVersionId $TaskVersionId -IgnoreBackoff:$IgnoreBackoff
    if (-not $rr.ready) { return [ordered]@{ ok = $false; reason = $rr.reason } }
    $st = Get-LedgerState $TaskVersionId
    if ($st.state -ne 'WAITING_PROVIDER') { return [ordered]@{ ok = $false; reason = "ledger state is $($st.state), not WAITING_PROVIDER" } }

    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'provider-resume' -ToState 'DISPATCHED' -RunId $RunId -Note "resumed on $($rr.provider)" | Out-Null
    $p = Get-ProviderWaitPath $TaskVersionId
    $w = Get-ProviderWait $TaskVersionId
    if ($w) { $w.resolvedAt = (Get-Date).ToUniversalTime().ToString('o'); Write-V2JsonCanonical $p $w }
    Write-V2Log "providers: $($TaskVersionId.Substring(0,12)) RESUMED automatically on '$($rr.provider)'" 'WARN'
    return [ordered]@{ ok = $true; provider = $rr.provider; reason = 'auto-resumed' }
}

# The scheduler's periodic sweep (also called at supervisor startup for
# restart-resume). Returns a summary of what happened.
function Invoke-ProviderPollSweep {
    param([string]$RunId = 'sweep', [switch]$IgnoreBackoff)
    $results = @()
    foreach ($w in (Get-AllProviderWaits)) {
        if ($w.resolvedAt) { continue }
        $st = Get-LedgerState $w.taskVersionId
        if ($st.state -ne 'WAITING_PROVIDER') { continue }
        $r = Resume-FromWaitingProvider -TaskVersionId $w.taskVersionId -RunId $RunId -IgnoreBackoff:$IgnoreBackoff
        if ($r.ok) {
            $results += [ordered]@{ taskVersionId = $w.taskVersionId; action = 'RESUMED'; provider = $r.provider }
        } else {
            Update-ProviderWaitBackoff -TaskVersionId $w.taskVersionId
            $results += [ordered]@{ taskVersionId = $w.taskVersionId; action = 'STILL_WAITING'; reason = $r.reason }
        }
    }
    return @($results)
}

# ---- Wave 0 selftest ------------------------------------------------------
function Test-ProvidersSelftest {
    $fail = @()
    # TEST_FAILED must never fail over
    $d = Get-FailoverDecision -CurrentProvider 'claude' -Class 'APPLICATION_ERROR' -FailoversSoFar 0
    if ($d.action -ne 'NO_FAILOVER') { $fail += "APPLICATION_ERROR -> $($d.action), expected NO_FAILOVER" }
    $d = Get-FailoverDecision -CurrentProvider 'claude' -Class 'CHECK_FAILURE' -FailoversSoFar 0
    if ($d.action -ne 'NO_FAILOVER') { $fail += "CHECK_FAILURE -> $($d.action), expected NO_FAILOVER" }
    $d = Get-FailoverDecision -CurrentProvider 'claude' -Class 'UNKNOWN' -FailoversSoFar 0
    if ($d.action -ne 'NO_FAILOVER') { $fail += "UNKNOWN -> $($d.action), expected NO_FAILOVER" }

    $script:ProviderHealthFaults = @{}
    try {
        # both healthy: quota on claude -> failover to codex
        $d = Get-FailoverDecision -CurrentProvider 'claude' -Class 'PROVIDER_QUOTA' -FailoversSoFar 0
        if ($d.action -ne 'FAILOVER' -or $d.nextProvider -ne 'codex') { $fail += "quota(claude) -> $($d.action)/$($d.nextProvider), expected FAILOVER/codex" }
        # codex quota -> failover to claude
        $d = Get-FailoverDecision -CurrentProvider 'codex' -Class 'PROVIDER_QUOTA' -FailoversSoFar 0
        if ($d.action -ne 'FAILOVER' -or $d.nextProvider -ne 'claude') { $fail += "quota(codex) -> $($d.action)/$($d.nextProvider), expected FAILOVER/claude" }
        # budget spent -> no failover
        $d = Get-FailoverDecision -CurrentProvider 'claude' -Class 'PROVIDER_RATE_LIMIT' -FailoversSoFar 1
        if ($d.action -notin @('NO_FAILOVER', 'WAITING_PROVIDER')) { $fail += "rate-limit budget spent -> $($d.action)" }
        # both unavailable -> WAITING_PROVIDER
        $script:ProviderHealthFaults = @{ claude = 'PROVIDER_QUOTA'; codex = 'PROVIDER_QUOTA' }
        $d = Get-FailoverDecision -CurrentProvider 'claude' -Class 'PROVIDER_QUOTA' -FailoversSoFar 0
        if ($d.action -ne 'WAITING_PROVIDER') { $fail += "both down -> $($d.action), expected WAITING_PROVIDER" }
        if ((Get-HealthyProviders).Count -ne 0) { $fail += "both down but Get-HealthyProviders not empty" }
        # one comes back
        $script:ProviderHealthFaults = @{ claude = 'PROVIDER_QUOTA' }
        if ((Get-HealthyProviders) -notcontains 'codex') { $fail += "codex should be healthy again" }
    } finally { $script:ProviderHealthFaults = $null }

    # backoff grows
    if ((_NextBackoffSec 0) -ge (_NextBackoffSec 3)) { $fail += "backoff not monotonic" }

    # GLM failover pairing (owner decision 2026-09-14).  The runtime
    # declaration is scoped to this disposable fixture and removed again; all
    # health outcomes are pinned through the harness fault seam so nothing
    # depends on the host's installed CLIs or credentials.
    $runtimePath = $script:DeepSeekRuntimePath
    $hadRuntime = Test-Path -LiteralPath $runtimePath
    $savedRuntime = $(if ($hadRuntime) { [System.IO.File]::ReadAllText($runtimePath, [System.Text.Encoding]::UTF8) } else { $null })
    $script:ProviderHealthFaults = @{}
    try {
        $glmRuntime = [ordered]@{
            schemaVersion='orcivo.orchestration.v2.provider-runtime/1'; enabled=$true
            enabledProviders=@('glm','deepseek'); excludedProviders=@('claude','codex')
            deepseek=[ordered]@{baseUrl='https://api.deepseek.com/';wireApi='responses';envKey='DEEPSEEK_API_KEY';codexHomeRoot='orcivo-dispatcher/providers/deepseek-codex'}
            glm=[ordered]@{model='nvidia/z-ai/glm-5.3'}
        }
        Write-V2JsonCanonical $runtimePath $glmRuntime
        if ((Get-OrcivoEnabledProviders) -join ',' -ne 'glm,deepseek') { $fail += "enabled set did not become glm,deepseek" }
        $d = Get-FailoverDecision -CurrentProvider 'deepseek' -Class 'PROVIDER_QUOTA' -FailoversSoFar 0
        if ($d.action -ne 'FAILOVER' -or $d.nextProvider -ne 'glm') { $fail += "quota(deepseek) -> $($d.action)/$($d.nextProvider), expected FAILOVER/glm" }
        $d = Get-FailoverDecision -CurrentProvider 'glm' -Class 'TEMPORARY_AUTH_FAILURE' -FailoversSoFar 0
        if ($d.action -notin @('FAILOVER', 'WAITING_PROVIDER')) { $fail += "auth(glm) -> $($d.action), expected FAILOVER or WAITING_PROVIDER" }
        $script:ProviderHealthFaults = @{ glm = 'PROVIDER_QUOTA'; deepseek = 'PROVIDER_QUOTA' }
        $d = Get-FailoverDecision -CurrentProvider 'glm' -Class 'PROVIDER_QUOTA' -FailoversSoFar 0
        if ($d.action -ne 'WAITING_PROVIDER') { $fail += "glm+deepseek down -> $($d.action), expected WAITING_PROVIDER" }
        if ((Get-HealthyProviders).Count -ne 0) { $fail += "glm+deepseek down but Get-HealthyProviders not empty" }
        $script:ProviderHealthFaults = @{ deepseek = 'PROVIDER_QUOTA' }
        if ((Get-HealthyProviders) -notcontains 'glm') { $fail += "glm should be healthy while only deepseek is faulted" }
    } finally {
        $script:ProviderHealthFaults = $null
        if ($hadRuntime) { [System.IO.File]::WriteAllText($runtimePath, $savedRuntime, (New-Utf8NoBom)) }
        elseif (Test-Path -LiteralPath $runtimePath) { Remove-Item -LiteralPath $runtimePath -Force }
    }

    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail) }
}
