<#
pilot.ps1 - the GUARDED pilot supervisor.  (PRAGMATIC V2.1, PARTE 10 / 34)

THREAT_MODEL = LOCAL_TRUSTED_HOST. This is the composed autonomous lifecycle:

  fence -> classify (semantic) -> route (adaptive) -> [Level C approval?]
        -> [no provider? -> WAITING_PROVIDER] -> implement -> deterministic verify
        -> secret scan -> independent opposite-provider review
        -> bounded correction loop -> integrate (remote-truth confirmed)
        -> durable checkpoint -> next READY task

Guards (config.pilot): maxParallel=1, forcePush=false, levelCStop=true,
bounded retries + review cycles, durable checkpoints, automatic provider
failover + resume + restart-resume, opposite-provider review, exact candidate,
secret gate, remote-truth reconciliation.

RUNNER MODES (config.pilot.runnerMode):
  inproc-fake  (default) - SYNTHETIC disposable validation, no model calls
  docker       - real agent / candidate code in a disposable Linux container
  host-trusted - real agent on the trusted host (AR-02); candidate build/test
                 still never runs in the supervisor process

REAL EXECUTION of a PB1-* task ALSO requires: (a) the auth token file
(config.pilot.realExecutionAuthFile) present in .orchestration/v2/,
(b) that task's P02/P03 gates satisfied, (c) for Level C, an owner gate. The
pilot never lifts those on its own. The `run` and `run-once` verbs dispatch real
agents, but a blocked P03/P04 graph remains WAITING_HUMAN and starts no task.

Commands:
  status           print pilot config, guards, runner mode, last checkpoint
  approve-gate     durably approve one exact WAITING_HUMAN Level C task version
  selftest         run the synthetic pilot validation suite
  docker-preflight report whether the Docker composition can run right now
  run              dispatch READY tasks until idle / wait / stop / budget failure
  run-once         execute at most one READY task
  start            deprecated alias for run
  stop             ask a running pilot loop to stop
#>
param(
    [Parameter(Position = 0)][ValidateSet('status', 'approve-gate', 'reconcile-owner-gate', 'configure-deepseek-pricing', 'smoke-deepseek', 'recover-provider-failure', 'recover-agent-infrastructure-failure', 'recover-stopped-implementation', 'recover-incomplete-provider-result', 'recover-incomplete-provider-result-with-mutation', 'quarantine-incomplete-provider-result', 'selftest', 'docker-preflight', 'run', 'run-once', 'start', 'stop')][string]$Command = 'status',
    [string]$TaskFile = '',
    [ValidateSet('','claude','codex')][string]$ProviderOverride = '',
    [string]$TaskId = '',
    [string]$TaskVersionId = '',
    [string]$RunId = '',
    [string]$InvocationId = '',
    [string]$EvidenceHash = '',
    [string]$PartialDiffHash = '',
    [string]$PartialFilesHash = '',
    [string]$WorkspaceMutationSnapshotHash = '',
    [string]$WorkspaceMutationResultHash = '',
    [string]$PromptHash = '',
    [string]$StopHash = '',
    [string]$ApprovalScope = '',
    [string]$ApprovedBy = 'owner',
    [string]$ApprovalSource = 'pilot.ps1 approve-gate'
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'ledger.ps1')
. (Join-Path $PSScriptRoot 'contract.ps1')
. (Join-Path $PSScriptRoot 'attest.ps1')
. (Join-Path $PSScriptRoot 'lease.ps1')
. (Join-Path $PSScriptRoot 'classify.ps1')
. (Join-Path $PSScriptRoot 'review-envelope.ps1')
. (Join-Path $PSScriptRoot 'verification.ps1')
. (Join-Path $PSScriptRoot 'preflight.ps1')
. (Join-Path $PSScriptRoot 'integrate.ps1')
. (Join-Path $PSScriptRoot 'taskclass.ps1')
. (Join-Path $PSScriptRoot 'router.ps1')
. (Join-Path $PSScriptRoot 'providers.ps1')
. (Join-Path $PSScriptRoot 'continuation.ps1')
. (Join-Path $PSScriptRoot 'fence.ps1')
. (Join-Path $PSScriptRoot 'intent.ps1')
. (Join-Path $PSScriptRoot 'correction.ps1')
. (Join-Path $PSScriptRoot 'runner-docker.ps1')
. (Join-Path $PSScriptRoot 'dispatcher.ps1')

function Get-PilotConfig { return (Get-V2Config).pilot }
function Get-PilotCheckpointDir { return (Join-Path (Get-V2Dir) 'pilot') }

function Test-RealExecutionAuthorized {
    $cfg = Get-PilotConfig
    return (Test-Path -LiteralPath (Join-Path (Get-V2Dir) "$($cfg.realExecutionAuthFile)"))
}

function Invoke-DeepSeekSmoke {
    # Public paid smoke: separate from task lineage and from any product
    # workspace.  It leaves only redacted, hash-bound artifacts under the
    # runtime directory; credentials stay inherited by the child process.
    if(-not $env:DEEPSEEK_API_KEY){throw 'DeepSeek smoke: DEEPSEEK_API_KEY is unavailable'}
    [void](Assert-DeepSeekInvocationBudget -EstimatedUsd ([decimal]0.03))
    $root=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) ('orcivo-dispatcher\provider-smokes\deepseek-'+[guid]::NewGuid().ToString('N'))
    $workspace=Join-Path $root 'workspace';$artifacts=Join-Path $root 'artifacts';New-Item -ItemType Directory -Force -Path $workspace,$artifacts|Out-Null
    $init=Invoke-GitV2 -Dir $workspace -Arguments @('init','--quiet') -LogLabel 'deepseek-smoke-init';Assert-GitSucceededV2 $init 'DeepSeek smoke git initialization'|Out-Null
    $prompt=@'
Connectivity smoke only. Do not modify files, run tools, or inspect unrelated data.
Return exactly one JSON object matching this schema:
{"schemaVersion":"orcivo.orchestration.v2.agent-result/1","role":"IMPLEMENTER","resultClass":"SUCCESS","summary":"DeepSeek Responses smoke completed","decisions":[],"tests":[],"nextAction":"stop","importantArtifacts":[]}
'@
    $prePath=Join-Path $artifacts 'pre-launch-manifest.json';$postPath=Join-Path $artifacts 'post-result-manifest.json'
    $before={param($launch)Write-V2JsonCanonical $prePath ([ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-smoke-manifest/1';phase='PRE_LAUNCH';invocationId=[string]$launch.invocationId;provider=[string]$launch.provider;model=[string]$launch.model;reasoning=[string]$launch.reasoningEffort;profile=[string]$launch.profile;promptArtifact=[string]$launch.promptArtifact;promptHash=[string]$launch.promptHash})}
    $result=Invoke-RealAgent -Provider deepseek -Role implementer -TaskVersion ('f'*64) -Profile FAST -Workspace $workspace -StructuredPrompt $prompt -ArtifactDir $artifacts -TimeoutSec 120 -Attempt 1 -BeforeLaunch $before
    Write-V2JsonCanonical $postPath ([ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-smoke-manifest/1';phase='POST_RESULT';invocationId=[string]$result.invocationId;provider=[string]$result.provider;model=[string]$result.model;returnedModels=@($result.returnedModels);exitCode=[int]$result.exitCode;providerClass=[string]$result.providerClass;resultClass=[string]$result.resultClass;promptHash=[string]$result.promptHash;stdoutHash=[string]$result.stdoutHash;controlRecordHash=[string]$result.controlRecordHash;usage=$result.usage;cachedTokens=$result.cachedTokens;costUsd=$result.costUsd;telemetryConsistent=[bool]$result.telemetryConsistent})
    $scan=Test-TreeSecretsClean -Roots @($root)
    $ok=($result.exitCode -eq 0 -and $result.providerClass -eq 'NONE' -and $result.resultClass -eq 'SUCCESS' -and $result.telemetryConsistent -and $null -ne $result.costUsd -and (Test-Path -LiteralPath $prePath) -and (Test-Path -LiteralPath $postPath) -and $scan.clean)
    return [ordered]@{status=$(if($ok){'PASS'}else{'FAIL'});workspace=$workspace;artifacts=$artifacts;invocationId=$result.invocationId;model=$result.model;returnedModels=@($result.returnedModels);usage=$result.usage;costUsd=$result.costUsd;telemetryConsistent=$result.telemetryConsistent;secretScanClean=[bool]$scan.clean}
}

# --- durable pilot checkpoint --------------------------------------------------
function Write-PilotCheckpoint {
    param([Parameter(Mandatory)][string]$RunId, [Parameter(Mandatory)][hashtable]$State)
    $dir = Get-PilotCheckpointDir
    $c = [ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.pilot-checkpoint/1'
        runId         = $RunId
        writtenAt     = (Get-Date).ToUniversalTime().ToString('o')
        holder        = (Get-ProcessIdentity)
    }
    foreach ($k in $State.Keys) { $c[$k] = $State[$k] }
    Write-V2JsonCanonical (Join-Path $dir "$RunId.json") $c
    Write-V2JsonCanonical (Join-Path $dir 'latest.json') $c
    return $c
}
function Get-PilotCheckpoint {
    param([string]$RunId = '')
    $p = $(if ($RunId) { Join-Path (Get-PilotCheckpointDir) "$RunId.json" } else { Join-Path (Get-PilotCheckpointDir) 'latest.json' })
    if (-not (Test-Path $p)) { return $null }
    try { return (Read-V2Json $p) } catch { return $null }
}

function Write-RealDispatcherPilotCheckpoint {
    param([Parameter(Mandatory)]$State)
    if(-not $State.runId -or -not $State.taskId -or -not $State.taskVersionId){return $null}
    $ledgerState=[string](Get-LedgerState ([string]$State.taskVersionId)).state
    return (Write-PilotCheckpoint -RunId ([string]$State.runId) -State @{
        taskId=[string]$State.taskId;taskVersionId=[string]$State.taskVersionId
        status=[string]$State.status;reason=[string]$State.reason;stage=[string]$State.stage
        provider=[string]$State.provider;providerHistory=@($State.providerHistory)
        ledgerState=$ledgerState;candidateHead=[string]$State.candidateHead
        guardsHonored=@('durable-ledger','immutable-candidate','opposite-provider-review','normal-push')
    })
}

# ---------------------------------------------------------------------------
# Invoke-PilotTask - the composed lifecycle for ONE task version.
# $SpineRunner: scriptblock (scenarioExec, scenarioReview) -> the spine result
#   object (Invoke-SpineRun). Injected so the synthetic suite drives the fake
#   agent; a real mode would inject a runner-backed spine call.
# ---------------------------------------------------------------------------
function Invoke-PilotTask {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][hashtable]$Task,          # PARTE 19 task shape (taskId, risk, ownerGate, ...)
        [Parameter(Mandatory)][scriptblock]$SpineRunner, # (execScenario, reviewScenario, provider) -> spine result
        [hashtable]$Scenarios = @{},                     # synthetic: attempt# -> @{ exec; review }
        [switch]$RealMode
    )
    $cfg = Get-V2Config
    $pcfg = $cfg.pilot
    $runId = New-RunId
    $trace = New-Object System.Collections.Generic.List[string]
    $providerHistory = New-Object System.Collections.Generic.List[object]
    $result = [ordered]@{ runId = $runId; taskId = "$($Task.taskId)"; taskVersionId = $TaskVersionId; status = 'ABORTED'; reason = ''; guardsHonored = @(); trace = @() }

    function _t { param($m) $trace.Add($m); Write-V2Log "pilot[$($runId.Substring(0,10))] $m" }

    # kill switch + stop file
    if (Test-Path (Join-Path (Get-V2Dir) $cfg.budgets.killSwitchFile)) { $result.status = 'ABORTED'; $result.reason = 'global kill switch'; return $result }
    if (Test-Path (Join-Path (Get-V2Dir) $pcfg.stopFile)) { $result.status = 'ABORTED'; $result.reason = 'pilot stop file'; return $result }

    # real-execution gate
    if ($RealMode) {
        if (-not (Test-RealExecutionAuthorized)) { $result.status = 'BLOCKED'; $result.reason = "real execution not authorized (missing $($pcfg.realExecutionAuthFile))"; return $result }
        foreach ($g in @($Task.blockedByGates)) { $result.status = 'BLOCKED'; $result.reason = "gate '$g' not satisfied - real PB1 task cannot run"; return $result }
    }
    $result.guardsHonored += 'forcePush=false'; $result.guardsHonored += "maxParallel=$($pcfg.maxParallel)"

    # 1. fence (crash recovery: prove prior run inactive first)
    $rec = Invoke-FenceRecovery -TaskVersionId $TaskVersionId -NewRunId $runId
    if ($rec.decision -eq 'STILL_ACTIVE') { $result.status = 'BLOCKED'; $result.reason = $rec.reason; return $result }
    if ($rec.decision -in @('WAITING_HUMAN', 'QUARANTINED')) { $result.status = $rec.decision; $result.reason = $rec.reason; return $result }
    if ($rec.decision -eq 'NO_PRIOR_RUN') {
        $f = New-GenerationFence -TaskVersionId $TaskVersionId -RunId $runId
        if (-not $f.ok) { $result.status = 'BLOCKED'; $result.reason = $f.reason; return $result }
        $generation = $f.generation
    } else { $generation = $rec.newGeneration }
    _t "generation $generation"
    $result.guardsHonored += 'generationFence'

    # 2. semantic classification
    $cls = Get-TaskClassification -Task $Task
    _t "classify -> $($cls.taskComplexity)/$($cls.risk)/$($cls.recommendedProfile)/$($cls.reviewStrength) (conf $($cls.confidence))"
    $result.classification = $cls
    if ($cls.verdict -eq 'PROHIBITED') { $result.status = 'PROHIBITED'; $result.reason = "classifier PROHIBITED ($($cls.floorsApplied -join ','))"; return $result }

    # 3. Level C -> WAITING_HUMAN (levelCStop guard)
    $isLevelC = ($cls.taskComplexity -eq 'LEVEL_C') -or ("$($Task.ownerGate)" -and "$($Task.ownerGate)" -ne 'none') -or ("$($Task.risk)" -eq 'C')
    $gateStatus=$null
    if($isLevelC -and $Task.ownerGate -and $Task.ownerGate -ne 'none'){$gateStatus=Get-OwnerGateApprovalStatus -TaskId ([string]$Task.taskId) -TaskVersionId $TaskVersionId -GateId ([string]$Task.ownerGate)}
    if ($isLevelC -and $pcfg.levelCStop -and (-not $gateStatus -or -not $gateStatus.satisfied)) {
        $st = Get-LedgerState $TaskVersionId
        if ($st.state -eq 'DISCOVERED') { Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'ready' -ToState 'READY' | Out-Null }
        if ((Get-LedgerState $TaskVersionId).state -eq 'READY') {
            Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'level-c-hold' -ToState 'WAITING_HUMAN' -RunId $runId -Note "$($cls.taskComplexity)/$($Task.ownerGate)" | Out-Null
        }
        _t "LEVEL C -> WAITING_HUMAN"
        $result.status = 'WAITING_HUMAN'; $result.reason = "Level C ($($cls.taskComplexity); gate $($Task.ownerGate)) - owner decision required"
        $result.guardsHonored += 'levelCStop'
        Complete-GenerationFence -TaskVersionId $TaskVersionId -Generation $generation -FinalState 'WAITING_HUMAN' | Out-Null
        return $result
    }
    if($isLevelC -and $gateStatus -and $gateStatus.satisfied){$result.guardsHonored += 'exactOwnerGateApproval'}

    # 4. provider health + route
    $healthy = @(Get-HealthyProviders)
    if ($healthy.Count -eq 0) {
        Enter-WaitingProvider -TaskVersionId $TaskVersionId -RunId $runId -Context @{
            taskId = $Task.taskId; generation = $generation; workspace = ''; candidateCommit = ''; candidateTree = ''
            attemptHistory = @(); providerHistory = @(); verificationState = 'NONE'; reviewState = 'NONE'
            checkpoint = @{ nextAction = 'route + implement' }; lastErrorClass = 'PROVIDER_UNAVAILABLE'
        } | Out-Null
        _t "no healthy provider -> WAITING_PROVIDER"
        Complete-GenerationFence -TaskVersionId $TaskVersionId -Generation $generation -FinalState 'WAITING_PROVIDER' | Out-Null
        $result.status = 'WAITING_PROVIDER'; $result.reason = 'no provider healthy'
        $result.guardsHonored += 'automaticProviderResume'
        return $result
    }
    $route = Resolve-Route -Classification ([hashtable]$cls) -HealthyProviders $healthy
    if (-not $route.ok) { $result.status = 'FAILED'; $result.reason = $route.reason; return $result }
    $provider = $route.provider
    _t "route -> $provider / $($route.profile) (model: $($route.model))"
    $result.route = @{ provider = $provider; profile = $route.profile; model = $route.model; limitations = @($route.limitations) }

    # 5. reviewer selection (opposite provider)
    $rv = Select-Reviewer -ImplementerProvider $provider -ReviewStrength $cls.reviewStrength -HealthyProviders $healthy
    if (-not $rv.ok -and $rv.escalate) {
        _t "reviewer escalate: $($rv.reason)"
        $result.status = 'WAITING_HUMAN'; $result.reason = $rv.reason; return $result
    }
    _t "reviewer -> $($rv.reviewer) (crossProvider=$($rv.crossProvider))"
    $result.reviewer = @{ provider = $rv.reviewer; crossProvider = $rv.crossProvider }
    $result.guardsHonored += 'oppositeProviderReview'

    # 6. attempt loop: implement -> verify -> secret scan -> review, with
    #    failover / context rollover / bounded correction.
    $maxAttempts = [int]$cfg.ledger.maxAttemptsPerVersion
    $maxCycles   = [int]$cfg.correctionLoop.maxCycles
    $rolloverBudget = [int]$pcfg.contextRolloverBudget
    $attempt = 0; $cycle = 0; $rollovers = 0; $failovers = 0
    $lastSpine = $null

    while ($attempt -lt ($maxAttempts + $rolloverBudget + 1)) {
        $attempt++
        $sc = $Scenarios["$attempt"]
        if (-not $sc) { $sc = @{ exec = 'ok'; review = 'approve' } }
        $providerHistory.Add(@{ attempt = $attempt; provider = $provider; execScenario = $sc.exec; reviewScenario = $sc.review })
        _t "attempt $attempt on $provider (exec=$($sc.exec) review=$($sc.review) cycle=$cycle)"

        # ensure the ledger is dispatchable for this attempt
        $st = (Get-LedgerState $TaskVersionId).state
        if ($st -in @('RUNNING', 'REVIEWING', 'CHECKING', 'DISPATCHED')) { Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'attempt-reset' -ToState 'FAILED' -RunId $runId | Out-Null; $st = 'FAILED' }
        if ($st -in @('FAILED', 'WAITING_PROVIDER')) { Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'attempt-ready' -ToState 'READY' -RunId $runId | Out-Null }

        $spine = & $SpineRunner $sc.exec $sc.review $provider
        $lastSpine = $spine
        $execClass = "$($spine.details.executeClass)"
        _t "  spine: status=$($spine.status) ledger=$($spine.ledgerState) execClass=$execClass"

        # --- happy path
        if ($spine.status -eq 'PUBLISHED') {
            $result.status = 'PUBLISHED'; $result.reason = 'ok'
            $result.guardsHonored += @('exactCandidate', 'secretGate', 'remoteTruthReconciliation', 'boundedRetries', 'boundedReviewCycles')
            break
        }
        if ($spine.status -eq 'NO_CHANGE_ACCEPTED') { $result.status = 'NO_CHANGE_ACCEPTED'; $result.reason = 'justified no-op'; break }
        if ($spine.status -in @('POLICY_BLOCK', 'CHECK_FAILED')) { $result.status = $spine.status; $result.reason = $spine.reason; break }
        if ($spine.status -in @('HUMAN_REVIEW_REQUIRED', 'INCOMPLETE_REVIEW', 'WAITING_HUMAN')) { $result.status = 'WAITING_HUMAN'; $result.reason = $spine.reason; break }

        # --- context-window exhaustion: NOT quota, NOT failover
        if ($execClass -eq 'CONTEXT_ROLLOVER' -or ($spine.details.control -and (Test-IsContextExhaustion $spine.details.control))) {
            if ($rollovers -ge $rolloverBudget) { $result.status = 'WAITING_HUMAN'; $result.reason = 'context rollover budget spent'; break }
            $rollovers++
            New-ContinuationCheckpoint -TaskVersionId $TaskVersionId -RunId $runId -Provider $provider -Payload @{
                taskIdentity = $TaskVersionId; acceptance = 'AC1'; decisions = @(); candidate = ''
                diffSummary = 'pending'; verificationResults = 'pending'; openFindings = @(); nextAction = 're-run same provider fresh context'
                importantArtifacts = @()
            } | Out-Null
            _t "  context rollover #$rollovers -> fresh invocation, same provider, same lineage"
            $result.guardsHonored += 'contextRollover'
            continue
        }

        # --- provider-class failure -> failover / WAITING_PROVIDER (NOT on TEST_FAILED etc.)
        if ($execClass -and (Test-IsProviderClass $execClass)) {
            $dec = Get-FailoverDecision -CurrentProvider $provider -Class $execClass -FailoversSoFar $failovers
            _t "  provider class $execClass -> $($dec.action) ($($dec.reason))"
            if ($dec.action -eq 'FAILOVER') {
                $failovers++; $provider = $dec.nextProvider
                $rv = Select-Reviewer -ImplementerProvider $provider -ReviewStrength $cls.reviewStrength -HealthyProviders (Get-HealthyProviders)
                $result.reviewer = @{ provider = $rv.reviewer; crossProvider = $rv.crossProvider }
                $result.guardsHonored += 'automaticProviderFailover'
                continue
            }
            if ($dec.action -eq 'WAITING_PROVIDER') {
                Enter-WaitingProvider -TaskVersionId $TaskVersionId -RunId $runId -Context @{
                    taskId = $Task.taskId; generation = $generation; workspace = ''; candidateCommit = ''; candidateTree = ''
                    attemptHistory = @($providerHistory.ToArray() | ForEach-Object { $_.attempt }); providerHistory = @($providerHistory.ToArray())
                    verificationState = 'NONE'; reviewState = 'NONE'; checkpoint = @{ nextAction = 're-implement' }; lastErrorClass = $execClass
                } | Out-Null
                $result.status = 'WAITING_PROVIDER'; $result.reason = $dec.reason
                $result.guardsHonored += 'automaticProviderResume'
                break
            }
        }

        # --- review REQUEST_CHANGES -> bounded correction
        if ($spine.status -eq 'REQUEST_CHANGES') {
            if ($cycle -ge $maxCycles) {
                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'review-budget-spent' -ToState 'FAILED_REVIEW_BUDGET' -RunId $runId -Note "cycles=$cycle" | Out-Null
                $result.status = 'FAILED_REVIEW_BUDGET'; $result.reason = "REQUEST_CHANGES after $($cycle + 1) attempts (budget $($maxCycles + 1)) -> WAITING_HUMAN"
                $result.guardsHonored += 'boundedReviewCycles'
                break
            }
            $cycle++
            _t "  REQUEST_CHANGES -> correction cycle $cycle (new candidate + new review)"
            # next attempt applies the fix scenario if the caller supplied one
            if (-not $Scenarios["$($attempt + 1)"]) { $Scenarios["$($attempt + 1)"] = @{ exec = 'ok-fixed'; review = 'approve' } }
            continue
        }

        # --- generic FAILED (bug / build / invalid impl) - NOT failover
        if ($spine.status -eq 'FAILED') {
            if ($attempt -lt $maxAttempts) { _t "  FAILED (class $execClass) - retry same provider (no failover)"; continue }
            $result.status = 'FAILED'; $result.reason = $spine.reason; break
        }

        # anything else: stop
        $result.status = "$($spine.status)"; $result.reason = "$($spine.reason)"; break
    }

    if ($result.status -eq 'ABORTED') { $result.status = 'FAILED'; $result.reason = 'attempt budget exhausted' }

    Complete-GenerationFence -TaskVersionId $TaskVersionId -Generation $generation -FinalState $result.status | Out-Null
    $result.attempts = $attempt; $result.correctionCycles = $cycle; $result.failovers = $failovers; $result.contextRollovers = $rollovers
    $result.providerHistory = @($providerHistory.ToArray())
    $result.trace = @($trace.ToArray())
    $result.ledgerState = (Get-LedgerState $TaskVersionId).state
    Write-PilotCheckpoint -RunId $runId -State @{
        taskId = $Task.taskId; taskVersionId = $TaskVersionId; status = $result.status; reason = $result.reason
        generation = $generation; attempts = $attempt; correctionCycles = $cycle; failovers = $failovers
        contextRollovers = $rollovers; providerHistory = @($providerHistory.ToArray()); ledgerState = $result.ledgerState
        guardsHonored = @($result.guardsHonored | Select-Object -Unique)
    } | Out-Null
    return $result
}

# ---------------------------------------------------------------------------
# only run a command when invoked as a script (not when dot-sourced by a test).
if ($MyInvocation.InvocationName -eq '.') { return }

switch ($Command) {
    'status' {
        $p = Get-PilotConfig
        Write-Host ""
        Write-Host "Orcivo orchestration - PILOT MODE" -ForegroundColor Cyan
        Write-Host "  threatModel:   $((Get-V2Config).threatModel.id)"
        Write-Host "  runnerMode:    $($p.runnerMode)   (modes: $($p.runnerModes -join ', '))"
        Write-Host "  guards:        maxParallel=$($p.maxParallel) forcePush=$($p.forcePush) levelCStop=$($p.levelCStop)"
        Write-Host "                 boundedRetries=$($p.boundedRetries) boundedReviewCycles=$($p.boundedReviewCycles) durableCheckpoint=$($p.durableCheckpoint)"
        Write-Host "                 failover=$($p.automaticProviderFailover) resume=$($p.automaticProviderResume) restartResume=$($p.restartResume) oppositeReview=$($p.oppositeProviderReview)"
        Write-Host "  realExec:      $(if (Test-RealExecutionAuthorized) { 'AUTHORIZED (token present)' } else { 'NOT AUTHORIZED - no PB1-* task can run; synthetic only' })"
        Write-Host "  batch plan:    $($p.batchPlanFile)"
        $wp = @(Get-AllProviderWaits | Where-Object { -not $_.resolvedAt })
        Write-Host "  WAITING_PROVIDER: $($wp.Count) task(s)"
        $cp = Get-PilotCheckpoint
        if ($cp) { Write-Host "  last checkpoint: run $($cp.runId.Substring(0,10)) task $($cp.taskId) -> $($cp.status) ($($cp.ledgerState)) at $($cp.writtenAt)" }
        else { Write-Host "  last checkpoint: (none)" }
        $ds = Get-DispatcherState
        if ($ds) { Write-Host "  dispatcher:    task $($ds.taskId) stage=$($ds.stage) status=$($ds.status) provider=$($ds.provider)" }
        else { Write-Host "  dispatcher:    no durable task state" }
        if($ds -and $ds.stage -eq 'GATE' -and $ds.task.ownerGate -and $ds.task.ownerGate -ne 'none'){
            $gs=Get-OwnerGateApprovalStatus -TaskId ([string]$ds.taskId) -TaskVersionId ([string]$ds.taskVersionId) -GateId ([string]$ds.task.ownerGate)
            Write-Host "  gate:          required = true"
            Write-Host "                 approval = $($gs.approval)"
            Write-Host "                 reason = $($ds.task.ownerGate)"
            Write-Host "                 taskVersionId = $($ds.taskVersionId)"
        }
        $mc = $null; try { $mc = (Get-AuthorityV2Config).memoryAdapter } catch { $mc = $null }
        if ($mc -and [bool]$mc.enabled) {
            $mi = "  memory:        ENABLED project=$(Get-DispatcherLogicalProjectId) url=$($mc.baseUrl) bounds=$($mc.maxMemories)pg/$($mc.maxInjectChars)ch"
            if ($ds) { $mi += " | last task: available=$($ds.memoryAvailable) retrieved=$($ds.memoryRetrievedCount) injectedChars=$($ds.memoryInjectedChars) fallback=$($ds.memoryFallbackUsed) latencyMs=$($ds.memoryLatencyMs) writes=$($ds.memoryWriteCount)" }
            Write-Host $mi
        } else { Write-Host "  memory:        DISABLED (adapter seam present, memoryAdapter.enabled=false)" }
        $dpf = Test-DockerPreflight
        Write-Host "  docker composition: ready=$($dpf.ready) daemon=$($dpf.daemonRunning) image=$($dpf.imagePresent)"
        Write-Host ""
    }
    'docker-preflight' {
        $pf = Test-DockerPreflight
        Write-Host ""
        Write-Host "Docker agent composition preflight" -ForegroundColor Cyan
        Write-Host "  docker CLI:      $($pf.dockerCli)"
        Write-Host "  daemon running:  $($pf.daemonRunning)  $(if ($pf.serverVersion) { "(server $($pf.serverVersion))" })"
        Write-Host "  image present:   $($pf.imagePresent)   ($($pf.image), base $($pf.baseImage))"
        Write-Host "  Dockerfile:      $($pf.dockerfilePresent)  ($($pf.dockerfile))"
        Write-Host "  READY:           $($pf.ready)" -ForegroundColor $(if ($pf.ready) { 'Green' } else { 'Yellow' })
        if (@($pf.neededActions).Count) {
            Write-Host "  owner action(s) needed:"
            foreach ($a in $pf.neededActions) { Write-Host "    - $a" }
        }
        Write-Host ""
        $st = Test-DockerCompositionSelftest
        Write-Host "  static invariants: $(if ($st.ok) { 'PASS' } else { 'FAIL - ' + ($st.failures -join '; ') })" -ForegroundColor $(if ($st.ok) { 'Green' } else { 'Red' })
        Write-Host ""
        exit $(if ($st.ok) { 0 } else { 1 })
    }
    'selftest' {
        & (Join-Path $PSScriptRoot 'tests\pilot\run-pilot-selftest.ps1')
        exit $LASTEXITCODE
    }
    'approve-gate' {
        if(-not $TaskId -or -not $TaskVersionId -or -not $ApprovalScope){throw 'approve-gate requires -TaskId, -TaskVersionId, and -ApprovalScope'}
        $result=Approve-DispatcherOwnerGate -TaskId $TaskId -TaskVersionId $TaskVersionId -ApprovalScope $ApprovalScope -ApprovedBy $ApprovedBy -ApprovalSource $ApprovalSource -TaskFile $TaskFile
        $result|ConvertTo-Json -Depth 10
    }
    'reconcile-owner-gate' {
        if(-not $TaskId -or -not $TaskVersionId){throw 'reconcile-owner-gate requires -TaskId and -TaskVersionId'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile
        $task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0]
        if(-not $task){throw "reconcile-owner-gate: task '$TaskId' not found"}
        $result=Reconcile-DispatcherOwnerGateProjection -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId
        $result|ConvertTo-Json -Depth 12
    }
    'configure-deepseek-pricing' {
        $result=Enable-DeepSeekVerifiedPricing
        $result|ConvertTo-Json -Depth 12
    }
    'smoke-deepseek' {
        $result=Invoke-DeepSeekSmoke
        $result|ConvertTo-Json -Depth 12
        exit $(if($result.status -eq 'PASS'){0}else{1})
    }
    'recover-provider-failure' {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId -or -not $EvidenceHash){throw 'recover-provider-failure requires -TaskId, -TaskVersionId, -RunId, -InvocationId, and -EvidenceHash'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile
        $task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0]
        if(-not $task){throw "recover-provider-failure: task '$TaskId' not found"}
        $result=Recover-DispatcherHistoricalProviderFailure -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -EvidenceHash $EvidenceHash
        $result|ConvertTo-Json -Depth 12
    }
    'recover-agent-infrastructure-failure' {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId -or -not $EvidenceHash -or -not $PromptHash){throw 'recover-agent-infrastructure-failure requires -TaskId, -TaskVersionId, -RunId, -InvocationId, -EvidenceHash, and -PromptHash'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile
        $task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0]
        if(-not $task){throw "recover-agent-infrastructure-failure: task '$TaskId' not found"}
        $result=Recover-DispatcherUtf8StdinFailure -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -EvidenceHash $EvidenceHash -PromptHash $PromptHash
        $result|ConvertTo-Json -Depth 12
    }
    'recover-stopped-implementation' {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId -or -not $EvidenceHash -or -not $StopHash){throw 'recover-stopped-implementation requires -TaskId, -TaskVersionId, -RunId, -InvocationId, -EvidenceHash, and -StopHash'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile
        $task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0]
        if(-not $task){throw "recover-stopped-implementation: task '$TaskId' not found"}
        $result=Recover-DispatcherStoppedImplementation -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -EvidenceHash $EvidenceHash -StopHash $StopHash
        $result|ConvertTo-Json -Depth 12
    }
    'recover-incomplete-provider-result' {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId -or -not $EvidenceHash -or -not $PartialDiffHash -or -not $PartialFilesHash){throw 'recover-incomplete-provider-result requires -TaskId, -TaskVersionId, -RunId, -InvocationId, -EvidenceHash, -PartialDiffHash, and -PartialFilesHash'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile
        $task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0]
        if(-not $task){throw "recover-incomplete-provider-result: task '$TaskId' not found"}
        $result=Recover-DispatcherIncompleteProviderResult -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -EvidenceHash $EvidenceHash -PartialDiffHash $PartialDiffHash -PartialFilesHash $PartialFilesHash
        $result|ConvertTo-Json -Depth 12
    }
    'recover-incomplete-provider-result-with-mutation' {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId -or -not $EvidenceHash -or -not $PartialDiffHash -or -not $PartialFilesHash -or -not $WorkspaceMutationSnapshotHash -or -not $WorkspaceMutationResultHash){throw 'recover-incomplete-provider-result-with-mutation requires -TaskId, -TaskVersionId, -RunId, -InvocationId, -EvidenceHash, -PartialDiffHash, -PartialFilesHash, -WorkspaceMutationSnapshotHash, and -WorkspaceMutationResultHash'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\\')}
        $source=Read-DispatcherTaskSource $TaskFile
        $task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0]
        if(-not $task){throw "recover-incomplete-provider-result-with-mutation: task '$TaskId' not found"}
        $result=Recover-DispatcherIncompleteProviderResult -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -EvidenceHash $EvidenceHash -PartialDiffHash $PartialDiffHash -PartialFilesHash $PartialFilesHash -WorkspaceMutationSnapshotHash $WorkspaceMutationSnapshotHash -WorkspaceMutationResultHash $WorkspaceMutationResultHash
        $result|ConvertTo-Json -Depth 12
    }
    'quarantine-incomplete-provider-result' {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId -or -not $EvidenceHash -or -not $PartialDiffHash -or -not $PartialFilesHash){throw 'quarantine-incomplete-provider-result requires -TaskId, -TaskVersionId, -RunId, -InvocationId, -EvidenceHash, -PartialDiffHash, and -PartialFilesHash'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\\')}
        $source=Read-DispatcherTaskSource $TaskFile
        $task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0]
        if(-not $task){throw "quarantine-incomplete-provider-result: task '$TaskId' not found"}
        $result=Quarantine-DispatcherIncompleteProviderResult -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -EvidenceHash $EvidenceHash -PartialDiffHash $PartialDiffHash -PartialFilesHash $PartialFilesHash
        $result|ConvertTo-Json -Depth 12
    }
    { $_ -in @('run','run-once','start') } {
        if ($Command -eq 'start') { Write-Host "pilot start is deprecated; using real 'run'." -ForegroundColor Yellow }
        $r = Invoke-DispatcherLoop -RunOnce:($Command -eq 'run-once') -TaskFile $TaskFile -ProviderOverride $ProviderOverride
        Write-RealDispatcherPilotCheckpoint -State $r | Out-Null
        $r | ConvertTo-Json -Depth 20
        exit $(if ("$($r.status)" -in @('FAILED','BLOCKED','RESUMABLE','TEST_FAILURE','AGENT_FAILURE')) { 1 } else { 0 })
    }
    'stop' {
        $f = Join-Path (Get-V2Dir) (Get-PilotConfig).stopFile
        Set-Content -LiteralPath $f -Value "stop requested $(Get-Date -Format o)" -Encoding ascii
        Write-Host "pilot stop file written: $f"
    }
}
