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
  reconcile-deepseek-unknown-reservation  reconcile one exact failed invocation at its reservation ceiling
  prove-review-schema-hold  read-only eligibility proof for one exact immutable reviewer receipt
  recover-review-schema-hold  revalidate one exact immutable reviewer receipt under the current schema
  prove-review-terminal-json-hold    read-only eligibility proof for one exact immutable reviewer
                                      result whose terminal JSON was framed by a prose prefix
  recover-review-terminal-json-hold  deterministically re-extract + revalidate that exact immutable
                                      reviewer terminal stdout under the current parser/schema
  prove-glm-terminal-success         read-only proof for an immutable task-bound GLM SUCCESS that
                                      an older loaded adapter recorded as AGENT_FAILURE
  recover-glm-terminal-success       reconcile that exact result without another provider invocation
  prove-review-timeout-retry        read-only proof for a bounded exact no-verdict review fallback
  recover-review-timeout-retry      preserve the candidate and authorize the next pinned review fallback
  prove-disjoint-target-advance    read-only eligibility proof for a pre-publish integration failure
                                   whose target has since advanced only through disjoint commits
  recover-disjoint-target-advance  rebase the approved candidate onto the disjoint target advance and
                                   land it back at REVIEWING for a fresh reviewer invocation
  run              dispatch READY tasks until idle / wait / stop / budget failure
  run-once         execute at most one READY task
  start            deprecated alias for run
  stop             ask a running pilot loop to stop
#>
param(
    [Parameter(Position = 0)][ValidateSet('status', 'approve-gate', 'reconcile-owner-gate', 'reconcile-orphaned-scheduler-lease', 'configure-deepseek-pricing', 'smoke-deepseek', 'reconcile-deepseek-local-prelaunch', 'reconcile-deepseek-request-manifest-upper-bound', 'reconcile-deepseek-run-reservation-ceiling', 'reconcile-deepseek-run-cache-aware', 'reconcile-deepseek-unknown-reservation', 'recover-r5b-glm-review-request-changes', 'prove-review-schema-hold', 'recover-review-schema-hold', 'prove-review-terminal-json-hold', 'recover-review-terminal-json-hold', 'prove-glm-terminal-success', 'recover-glm-terminal-success', 'prove-review-timeout-retry', 'recover-review-timeout-retry', 'prove-disjoint-target-advance', 'recover-disjoint-target-advance', 'recover-completed-implementation', 'recover-provider-failure', 'recover-agent-infrastructure-failure', 'recover-stopped-implementation', 'recover-incomplete-provider-result', 'recover-incomplete-provider-result-with-mutation', 'recover-incomplete-running-invocation', 'recover-quarantined-retry-route', 'quarantine-incomplete-provider-result', 'selftest', 'docker-preflight', 'run', 'run-once', 'start', 'stop')][string]$Command = 'status',
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
    [string]$PreManifestHash = '',
    [string]$PostManifestHash = '',
    [string]$LeaseId = '',
    [string]$LeaseHash = '',
    [string]$LeaseOwnerRunId = '',
    [string]$LeaseHolderHost = '',
    [int]$LeaseHolderPid = 0,
    [string]$LeaseHolderStartTime = '',
    [string]$LeaseNonce = '',
    [string]$LeaseFencingToken = '',
    [string]$ApprovalScope = '',
    [string]$ApprovedBy = 'owner',
    [string]$ApprovalSource = 'pilot.ps1 approve-gate',
    [string]$SmokeRoot = ''
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
    $before={param($launch)Write-V2JsonCanonical $prePath ([ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-smoke-manifest/1';phase='PRE_LAUNCH';invocationId=[string]$launch.invocationId;provider=[string]$launch.provider;model=[string]$launch.model;reasoning=[string]$launch.reasoningEffort;profile=[string]$launch.profile;promptArtifact=[string]$launch.promptArtifact;promptHash=[string]$launch.promptHash;requestManifestPath=[string]$launch.requestManifestPath;requestManifestHash=[string]$launch.requestManifestHash})}
    $result=Invoke-RealAgent -Provider deepseek -Role implementer -TaskVersion ('f'*64) -Profile FAST -Workspace $workspace -StructuredPrompt $prompt -ArtifactDir $artifacts -TimeoutSec 120 -Attempt 1 -BeforeLaunch $before
    Write-V2JsonCanonical $postPath ([ordered]@{schemaVersion='orcivo.orchestration.v2.deepseek-smoke-manifest/1';phase='POST_RESULT';invocationId=[string]$result.invocationId;provider=[string]$result.provider;model=[string]$result.model;returnedModels=@($result.returnedModels);exitCode=[int]$result.exitCode;providerClass=[string]$result.providerClass;resultClass=[string]$result.resultClass;promptHash=[string]$result.promptHash;requestManifestHash=$result.requestManifestHash;stdoutHash=[string]$result.stdoutHash;controlRecordHash=[string]$result.controlRecordHash;usage=$result.usage;cachedTokens=$result.cachedTokens;costUsd=$result.costUsd;telemetryConsistent=[bool]$result.telemetryConsistent})
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
    'reconcile-deepseek-local-prelaunch' {
        if(-not $InvocationId -or -not $SmokeRoot){throw 'reconcile-deepseek-local-prelaunch requires -InvocationId and -SmokeRoot'}
        $result=Resolve-DeepSeekLocalPrelaunchTelemetry -InvocationId $InvocationId -SmokeRoot $SmokeRoot
        $result|ConvertTo-Json -Depth 12
    }
    'reconcile-deepseek-request-manifest-upper-bound' {
        if(-not $InvocationId -or -not $SmokeRoot){throw 'reconcile-deepseek-request-manifest-upper-bound requires -InvocationId and -SmokeRoot'}
        $result=Reconcile-DeepSeekRequestManifestUpperBound -InvocationId $InvocationId -SmokeRoot $SmokeRoot
        $result|ConvertTo-Json -Depth 12
    }
    'reconcile-deepseek-run-reservation-ceiling' {
        if($TaskVersionId -ne '9072101439aa09bbb494e28b3e2c8e985dcb91d0235d68ff7f7164b2ada65798' -or $RunId -ne 'run-31fa07ca662c48b087d32ad0666e9a22' -or $InvocationId -ne 'att-e39d82529f7446cc9e0b556a022e103e'){throw 'reconcile-deepseek-run-reservation-ceiling is closed to the authorized DeepSeek reservation'}
        $state=Get-DispatcherState
        Reconcile-DispatcherDeepSeekUnknownReservation -State $state -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -ExpectedRequestManifestHash 'sha256:044b808b61256f7ddee8695413b2f12ee43aed70f691bc2abb18e71ad3aee200' -ExpectedStdoutHash 'sha256:462a168d91d6b78712f8d8971f469a2295f98513f3e6c669bd1a02a009fc5bf4' | ConvertTo-Json -Depth 12
    }
    'reconcile-deepseek-run-cache-aware' {
        if($TaskVersionId -ne '9072101439aa09bbb494e28b3e2c8e985dcb91d0235d68ff7f7164b2ada65798' -or $RunId -ne 'run-31fa07ca662c48b087d32ad0666e9a22' -or $InvocationId -ne 'att-394e628d81584d06953598bc080bc399'){throw 'reconcile-deepseek-run-cache-aware is closed to attempt 349'}
        $state=Get-DispatcherState
        Reconcile-DispatcherDeepSeekCacheAwareReservation -State $state -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -ExpectedRequestManifestHash 'sha256:dd5c6fc4de437333e9380c5f2146188c8913a57285b682e4e2daa18d4581c385' -ExpectedStdoutHash 'sha256:f2bd5d36ec5dd29f7e6e0716a3b929e93c0e81531be7b2fdb868b61c9915f8d2' -ExpectedAttempt 349 -ExpectedTailSeq 1051 | ConvertTo-Json -Depth 12
    }
    'reconcile-deepseek-unknown-reservation' {
        if($TaskId -ne 'PB1-P01-os-state-machine' -or $TaskVersionId -ne 'a8b65877877bcb7bc6c2ac75442219b2543358f8d6060aeb586ee181058b9a62' -or $RunId -ne 'run-04a4bf671c224608bd871fd46c125281' -or $InvocationId -ne 'att-f0a612c69da848d2ae1d84619346cf72'){throw 'reconcile-deepseek-unknown-reservation is closed to the exact failed PB1 review invocation'}
        $state=Get-DispatcherState
        Reconcile-DispatcherDeepSeekUnknownActiveReservation -State $state -TaskId $TaskId -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -ExpectedRequestManifestHash 'sha256:a94b4223a772f613f6a2565b3713da3f3ee8114819665dd250442bbfe3823c56' -ExpectedResultReceiptHash 'sha256:0e03f9ce3928e656a831dbd3f4c61edec49222eb672df41c257e7cae42e53e73' -ExpectedStdoutHash 'sha256:7d3d2d38aaf7ccfd36b00815883758c9f81898bac6e0515c3b666b8ab1ed6b90' -ExpectedStderrHash 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' -ExpectedTailSeq 21 | ConvertTo-Json -Depth 12
    }
    'recover-r5b-glm-review-request-changes' {
        $expectedTask='R5B-status-extras'
        $expectedVersion='88c324db037220d86a26aa64ca81216e2ea9f7aede71f722e7f7c650376ad4a0'
        $expectedRun='run-209912e7bdfb41989be75bbb51c0558b'
        $expectedInvocation='att-35148426066b4926a07ab5305d7b6055'
        if($TaskId -ne $expectedTask -or $TaskVersionId -ne $expectedVersion -or $RunId -ne $expectedRun -or $InvocationId -ne $expectedInvocation){throw 'recover-r5b-glm-review-request-changes is closed to the exact owner-supervised R5b review hold'}
        if(Test-DispatcherRecoveryExecutionActive){throw 'recover-r5b-glm-review-request-changes: runner or lease is active'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile
        $task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId})
        if($task.Count -ne 1){throw 'recover-r5b-glm-review-request-changes: task source binding is absent or ambiguous'}
        $task=[hashtable]$task[0];$state=_ToHashtable ((ConvertTo-CanonicalJson (Get-DispatcherState))|ConvertFrom-Json);$contract=Get-Contract $TaskVersionId
        $prior=@($state.reviewSchemaRequestChangesRecoveryHistory|Where-Object{[string]$_.invocationId -eq $InvocationId})
        if($prior.Count -eq 1 -and [string]$state.status -eq 'RUNNING' -and [string]$state.stage -eq 'IMPLEMENT' -and [string]$state.reviewVerdict -eq 'REQUEST_CHANGES'){
            [ordered]@{status='ALREADY_RECOVERED';taskId=$TaskId;taskVersionId=$TaskVersionId;runId=$RunId;invocationId=$InvocationId;cycle=[int]$state.cycle;providerInvocationRequired=$false;proofHash=[string]$prior[0].proofHash}|ConvertTo-Json -Depth 8;break
        }
        if(-not $state -or [string]$state.taskId -ne $TaskId -or [string]$state.taskVersionId -ne $TaskVersionId -or [string]$state.runId -ne $RunId -or [string]$state.taskSourceHash -ne [string]$source.hash -or [string]$contract.bindings.taskSourceHash -ne [string]$source.hash){throw 'recover-r5b-glm-review-request-changes: durable task/run/source binding drift'}
        if([string]$state.status -ne 'WAITING_HUMAN' -or [string]$state.stage -ne 'REVIEW' -or [string]$state.reviewVerdict -ne 'HUMAN_REVIEW_REQUIRED' -or [string]$state.reason -ne 'HUMAN_REVIEW_REQUIRED: schema validation failed'){throw 'recover-r5b-glm-review-request-changes: state is not the exact schema-validation hold'}
        if(-not [bool]$state.implementationComplete -or [bool]$state.requiresCorrection -or [int]$state.cycle -ne 0){throw 'recover-r5b-glm-review-request-changes: candidate is not the exact first reviewed implementation'}
        if((Get-GitHeadV2 ([string]$state.workspace)) -ne [string]$state.candidateHead){throw 'recover-r5b-glm-review-request-changes: candidate HEAD drift'}
        $wsStatus=Invoke-GitV2 -Dir ([string]$state.workspace) -Arguments @('status','--porcelain=v1') -LogLabel 'r5b-review-schema-recovery-status'
        if($wsStatus.exitCode -ne 0 -or -not [string]::IsNullOrWhiteSpace([string]$wsStatus.stdout)){throw 'recover-r5b-glm-review-request-changes: candidate workspace is dirty'}
        $reviewArtifactRecord=_ToHashtable ((ConvertTo-CanonicalJson $state.reviewArtifactRecord)|ConvertFrom-Json)
        if(-not(Test-DispatcherReviewArtifactRecord -Record $reviewArtifactRecord -State $state)){throw 'recover-r5b-glm-review-request-changes: frozen review artifacts drifted'}
        $state.reviewArtifactRecord=$reviewArtifactRecord
        $history=@($state.providerHistory|Where-Object{$_});$attempts=@($history|Where-Object{[string]$_.invocationId -eq $InvocationId})
        if($attempts.Count -ne 1 -or [string]$history[-1].invocationId -ne $InvocationId){throw 'recover-r5b-glm-review-request-changes: reviewer invocation is absent or not the history tail'}
        $attempt=$attempts[0]
        if([string]$attempt.role -ne 'REVIEWER' -or [string]$attempt.provider -ne 'glm' -or [int]$attempt.exitCode -ne 0 -or [string]$attempt.providerClass -ne 'NONE' -or [string]$attempt.resultClass -ne 'REQUEST_CHANGES' -or -not [bool]$attempt.telemetryConsistent){throw 'recover-r5b-glm-review-request-changes: immutable invocation is not a successful GLM REQUEST_CHANGES'}
        $logs=[IO.Path]::GetFullPath((Join-Path (Get-V2Dir) "runs\$RunId\logs"));$stem='reviewer-001-glm-35148426'
        $receiptPath=Join-Path $logs "$stem.agent-result.json";$promptPath=Join-Path $logs "$stem.prompt.txt";$stdoutPath=Join-Path $logs "$stem.stdout.log";$stderrPath=Join-Path $logs "$stem.stderr.log"
        foreach($path in @($receiptPath,$promptPath,$stdoutPath,$stderrPath)){if(-not(Test-Path -LiteralPath $path)){throw 'recover-r5b-glm-review-request-changes: immutable reviewer artifact is missing'}}
        $receipt=Read-V2Json $receiptPath;$signed=[ordered]@{};foreach($key in $receipt.Keys){if([string]$key -ne 'receiptHash'){$signed[[string]$key]=$receipt[$key]}}
        if([string]$receipt.receiptHash -ne (New-ContentHash $signed) -or [string]$receipt.receiptHash -ne [string]$attempt.resultReceiptHash -or [string]$receipt.invocationId -ne $InvocationId -or [string]$receipt.resultClass -ne 'REQUEST_CHANGES' -or $null -eq $receipt.structuredResult){throw 'recover-r5b-glm-review-request-changes: immutable result receipt is invalid or unbound'}
        if((New-FileHash $promptPath) -ne [string]$receipt.promptHash -or (New-FileHash $stdoutPath) -ne [string]$receipt.stdoutHash -or (New-FileHash $stderrPath) -ne [string]$receipt.stderrHash){throw 'recover-r5b-glm-review-request-changes: reviewer artifact hash mismatch'}
        $old=@((Get-Attestations -TaskVersionId $TaskVersionId -Kind review)|Where-Object{[string]$_.attestationId -eq [string]$state.reviewAttestationId})
        if($old.Count -ne 1 -or [string]$old[0].result -ne 'HUMAN_REVIEW_REQUIRED' -or [string]$old[0].producer.invocationId -ne $InvocationId -or [string]$old[0].payload.reason -ne 'schema validation failed'){throw 'recover-r5b-glm-review-request-changes: historical schema hold attestation mismatch'}
        $problems=@($old[0].payload.problems|Where-Object{$_})
        if($problems.Count -ne 1 -or [string]$problems[0] -notlike '$.criteria[3].id : does not match *'){throw 'recover-r5b-glm-review-request-changes: schema hold is not limited to the known criterion-id formatting defect'}
        $oldFresh=Test-AttestationFresh -Attestation $old[0] -WorktreeDir ([string]$state.workspace) -BaseSha ([string]$state.candidateBase) -HeadSha ([string]$state.candidateHead)
        if(-not $oldFresh.fresh -or -not [bool]$state.verification.pass){throw 'recover-r5b-glm-review-request-changes: candidate attestations are stale or checks are not PASS'}
        if(@($contract.acceptanceCriteriaIds).Count -ne 0){throw 'recover-r5b-glm-review-request-changes: contract unexpectedly has named acceptance criteria'}
        $normalized=ConvertTo-DispatcherNormalizedReviewResult $receipt.structuredResult;$normalized.criteria=@()
        $cfg=Get-V2Config;$wrapped="$($cfg.review.beginMarker)`n$(ConvertTo-CanonicalJson $normalized)`n$($cfg.review.endMarker)"
        $changed=@(Get-GitChangedFiles -Dir ([string]$state.workspace) -BaseSha ([string]$state.candidateBase) -HeadSha ([string]$state.candidateHead))
        $parsed=Parse-ReviewEnvelope -Stdout $wrapped -Expected @{taskVersion=$TaskVersionId;head=$state.candidateHead;treeHash=$state.candidateTree;diffHash=$state.diffHash;specHash=$contract.specHash;changedFiles=$changed;criteriaIds=@();reviewArtifacts=@($state.reviewArtifactRecord.artifacts);processOk=$true}
        if([string]$parsed.verdict -ne 'REQUEST_CHANGES' -or [string]$parsed.reason -ne 'ok' -or @($parsed.problems).Count -ne 0 -or @($parsed.envelope.findings|Where-Object{[string]$_.severity -in @('critical','high','medium')}).Count -lt 1){throw 'recover-r5b-glm-review-request-changes: normalized immutable result is not an actionable REQUEST_CHANGES'}
        $bindings=Get-AttestationBindings -TaskVersionId $TaskVersionId -WorktreeDir ([string]$state.workspace) -BaseSha ([string]$state.candidateBase) -HeadSha ([string]$state.candidateHead)
        $proof=[ordered]@{schemaVersion='orcivo.orchestration.v2.closed-r5b-review-schema-recovery/1';taskId=$TaskId;taskVersionId=$TaskVersionId;runId=$RunId;invocationId=$InvocationId;candidateHead=[string]$state.candidateHead;candidateTree=[string]$state.candidateTree;diffHash=[string]$state.diffHash;resultReceiptHash=[string]$receipt.receiptHash;priorReviewAttestationId=[string]$old[0].attestationId;priorReviewAttestationHash=[string]$old[0].attestationHash;reviewArtifactRecordHash=[string]$state.reviewArtifactRecord.recordHash;normalizedEnvelopeHash=(New-StringHash (ConvertTo-CanonicalJson $normalized));replayVerdict='REQUEST_CHANGES';ownerDecision='continue flow and resolve problems, 2026-10-08'};$proof.proofHash=New-StringHash (ConvertTo-CanonicalJson $proof)
        $lease=New-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -RunId $RunId -Scope 'closed-r5b-review-request-changes-recovery'
        if(-not $lease.ok){throw 'recover-r5b-glm-review-request-changes: scheduler lease is active'}
        try{
            $ledger=Get-LedgerState $TaskVersionId
            if([string]$ledger.state -eq 'WAITING_HUMAN'){Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'review-schema-request-changes-dispatch' -ToState 'DISPATCHED' -RunId $RunId -AttemptId $InvocationId -Evidence @{proofHash=$proof.proofHash;resultReceiptHash=$receipt.receiptHash} -Note 'owner-supervised exact immutable REQUEST_CHANGES schema recovery'|Out-Null}
            $ledger=Get-LedgerState $TaskVersionId
            if([string]$ledger.state -eq 'DISPATCHED'){Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'review-schema-request-changes-running' -ToState 'RUNNING' -RunId $RunId -AttemptId $InvocationId -Evidence @{proofHash=$proof.proofHash;resultReceiptHash=$receipt.receiptHash} -Note 'bounded correction resumes from the reviewed candidate'|Out-Null}
            if([string](Get-LedgerState $TaskVersionId).state -ne 'RUNNING'){throw 'recover-r5b-glm-review-request-changes: bounded ledger recovery did not reach RUNNING'}
            $review=New-Attestation -Kind review -TaskVersionId $TaskVersionId -RunId $RunId -Bindings ([hashtable]$bindings) -Result REQUEST_CHANGES -Payload @{problems=@();reason='ok';findings=@($parsed.envelope.findings);technicalBlock=$null;reviewArtifactRecordHash=[string]$state.reviewArtifactRecord.recordHash;revalidatedFromAttestationId=[string]$old[0].attestationId;revalidatedFromAttestationHash=[string]$old[0].attestationHash;resultReceiptHash=[string]$receipt.receiptHash;proofHash=[string]$proof.proofHash} -ProducerMeta @{provider='glm';model=[string]$receipt.model;profile='REVALIDATION';invocationId=$InvocationId;fresh=$true;memory='disabled';workspace='review-data-only';exitCode=0;providerExecuted=$false;revalidationSource='IMMUTABLE_RESULT_RECEIPT_REQUEST_CHANGES'}
            $state.reviewOriginalAttestationId=[string]$old[0].attestationId;$state.reviewAttestationId=[string]$review.attestationId;$state.reviewInvocationId=$InvocationId;$state.reviewVerdict='REQUEST_CHANGES';$state.reviewTechnicalBlock=$null
            $state.findings=@($parsed.envelope.findings|Where-Object{[string]$_.severity -ne 'info'}|ForEach-Object{"$($_.severity): $($_.detail)"})
            $state.reviewSchemaRequestChangesRecoveryHistory=@([ordered]@{invocationId=$InvocationId;proofHash=[string]$proof.proofHash;resultReceiptHash=[string]$receipt.receiptHash;priorReviewAttestationId=[string]$old[0].attestationId;reviewAttestationId=[string]$review.attestationId;replayVerdict='REQUEST_CHANGES';providerInvocationRequired=$false})
            $state.cycle=[int]$state.cycle+1;$state.status='RUNNING';$state.stage='IMPLEMENT';$state.implementationComplete=$false;$state.requiresCorrection=$false;$state.reason='review schema hold recovered as immutable REQUEST_CHANGES';$state.decisionNeeded='';$state.resumes='bounded correction from exact reviewed candidate'
            Write-DispatcherState $state|Out-Null;Write-RealDispatcherPilotCheckpoint -State $state|Out-Null
        }finally{[void](Remove-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -LeaseId $lease.leaseId)}
        [ordered]@{status='RECOVERED_TO_CORRECTION';taskId=$TaskId;taskVersionId=$TaskVersionId;runId=$RunId;invocationId=$InvocationId;cycle=[int]$state.cycle;findings=@($state.findings);providerInvocationRequired=$false;proofHash=[string]$proof.proofHash;nextCommand='powershell -NoProfile -ExecutionPolicy Bypass -File scripts/orchestration/v2/pilot.ps1 run'}|ConvertTo-Json -Depth 10
    }
    { $_ -in @('prove-review-schema-hold','recover-review-schema-hold') } {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId){throw "$Command requires -TaskId, -TaskVersionId, -RunId, and -InvocationId"}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile;$matches=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId})
        if($matches.Count -ne 1){throw "${Command}: task '$TaskId' is not uniquely present in the owner-approved task source"}
        $task=[hashtable]$matches[0];$state=Get-DispatcherState
        if(-not $state){throw "${Command}: no durable dispatcher state"}
        $contract=Get-Contract $TaskVersionId
        $safeDirectoryIndex=[int]$(if($env:GIT_CONFIG_COUNT){$env:GIT_CONFIG_COUNT}else{'0'});$safeDirectoryCountBefore=$env:GIT_CONFIG_COUNT
        [Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",'safe.directory','Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",[IO.Path]::GetFullPath([string]$state.workspace),'Process');$env:GIT_CONFIG_COUNT=[string]($safeDirectoryIndex+1)
        $restoreSafeDirectory={if($null -eq $safeDirectoryCountBefore){Remove-Item Env:GIT_CONFIG_COUNT -ErrorAction SilentlyContinue}else{$env:GIT_CONFIG_COUNT=$safeDirectoryCountBefore};[Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",$null,'Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",$null,'Process')}
        if($Command -eq 'prove-review-schema-hold'){
            if(Test-Path -LiteralPath (Get-LeasePath -Namespace scheduler -Key (Get-V2Config).target.branch)){throw 'prove-review-schema-hold: scheduler lease is active'}
            $script:DispatcherRecoveryRunnerProbe=$false
            try{$proof=Get-DispatcherReviewSchemaHoldRecoveryProof -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId}finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;&$restoreSafeDirectory}
            [ordered]@{eligible=[bool]$proof.eligible;reason=[string]$proof.reason;replayVerdict=[string]$proof.replayVerdict;replayReason=[string]$proof.replayReason;problems=@($proof.problems);technicalBlock=$proof.technicalBlock;candidateHead=[string]$proof.candidateHead;invocationId=[string]$proof.invocationId;providerInvocationRequired=[bool]$proof.providerInvocationRequired;proofHash=[string]$proof.proof.proofHash;ledgerProgress=[int]$proof.ledgerProgress;alreadyRecovered=[bool]$proof.alreadyRecovered}|ConvertTo-Json -Depth 8
            exit $(if($proof.eligible){0}else{1})
        }
        $schedulerLease=New-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -RunId $RunId -Scope 'review-schema-hold-recovery'
        if(-not $schedulerLease.ok){throw 'recover-review-schema-hold: scheduler lease is active'}
        $script:DispatcherRecoveryRunnerProbe=$false
        try{$result=Recover-DispatcherReviewSchemaHold -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId}
        finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;[void](Remove-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -LeaseId $schedulerLease.leaseId);&$restoreSafeDirectory}
        Write-RealDispatcherPilotCheckpoint -State (Get-DispatcherState)|Out-Null
        $result|ConvertTo-Json -Depth 12
    }
    { $_ -in @('prove-review-terminal-json-hold','recover-review-terminal-json-hold') } {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId){throw "$Command requires -TaskId, -TaskVersionId, -RunId, and -InvocationId"}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile;$matches=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId})
        if($matches.Count -ne 1){throw "${Command}: task '$TaskId' is not uniquely present in the owner-approved task source"}
        $task=[hashtable]$matches[0];$state=Get-DispatcherState
        if(-not $state){throw "${Command}: no durable dispatcher state"}
        $contract=Get-Contract $TaskVersionId
        $safeDirectoryIndex=[int]$(if($env:GIT_CONFIG_COUNT){$env:GIT_CONFIG_COUNT}else{'0'});$safeDirectoryCountBefore=$env:GIT_CONFIG_COUNT
        [Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",'safe.directory','Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",[IO.Path]::GetFullPath([string]$state.workspace),'Process');$env:GIT_CONFIG_COUNT=[string]($safeDirectoryIndex+1)
        $restoreSafeDirectory={if($null -eq $safeDirectoryCountBefore){Remove-Item Env:GIT_CONFIG_COUNT -ErrorAction SilentlyContinue}else{$env:GIT_CONFIG_COUNT=$safeDirectoryCountBefore};[Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",$null,'Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",$null,'Process')}
        if($Command -eq 'prove-review-terminal-json-hold'){
            if(Test-Path -LiteralPath (Get-LeasePath -Namespace scheduler -Key (Get-V2Config).target.branch)){throw 'prove-review-terminal-json-hold: scheduler lease is active'}
            $script:DispatcherRecoveryRunnerProbe=$false
            try{$proof=Get-DispatcherReviewTerminalJsonHoldRecoveryProof -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId}finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;&$restoreSafeDirectory}
            [ordered]@{eligible=[bool]$proof.eligible;reason=[string]$proof.reason;replayVerdict=[string]$proof.replayVerdict;replayReason=[string]$proof.replayReason;problems=@($proof.problems);technicalBlock=$proof.technicalBlock;candidateHead=[string]$proof.candidateHead;invocationId=[string]$proof.invocationId;providerInvocationRequired=[bool]$proof.providerInvocationRequired;extractedEnvelopeHash=[string]$proof.extractedEnvelopeHash;proofHash=[string]$proof.proof.proofHash;stdoutHash=[string]$proof.proof.stdoutHash;receiptHash=[string]$proof.proof.resultReceiptHash;ledgerProgress=[int]$proof.ledgerProgress;alreadyRecovered=[bool]$proof.alreadyRecovered}|ConvertTo-Json -Depth 8
            exit $(if($proof.eligible){0}else{1})
        }
        $schedulerLease=New-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -RunId $RunId -Scope 'review-terminal-json-hold-recovery'
        if(-not $schedulerLease.ok){throw 'recover-review-terminal-json-hold: scheduler lease is active'}
        $script:DispatcherRecoveryRunnerProbe=$false
        try{$result=Recover-DispatcherReviewTerminalJsonHold -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId}
        finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;[void](Remove-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -LeaseId $schedulerLease.leaseId);&$restoreSafeDirectory}
        Write-RealDispatcherPilotCheckpoint -State (Get-DispatcherState)|Out-Null
        $result|ConvertTo-Json -Depth 12
    }
    { $_ -in @('prove-glm-terminal-success','recover-glm-terminal-success') } {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId){throw "$Command requires -TaskId, -TaskVersionId, -RunId, and -InvocationId"}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile;$matches=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId})
        if($matches.Count -ne 1){throw "${Command}: task '$TaskId' is not uniquely present in the owner-approved task source"}
        $task=[hashtable]$matches[0];$state=Get-DispatcherState
        if(-not $state){throw "${Command}: no durable dispatcher state"}
        $contract=Get-Contract $TaskVersionId
        $safeDirectoryIndex=[int]$(if($env:GIT_CONFIG_COUNT){$env:GIT_CONFIG_COUNT}else{'0'});$safeDirectoryCountBefore=$env:GIT_CONFIG_COUNT
        [Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",'safe.directory','Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",[IO.Path]::GetFullPath([string]$state.workspace),'Process');$env:GIT_CONFIG_COUNT=[string]($safeDirectoryIndex+1)
        $restoreSafeDirectory={if($null -eq $safeDirectoryCountBefore){Remove-Item Env:GIT_CONFIG_COUNT -ErrorAction SilentlyContinue}else{$env:GIT_CONFIG_COUNT=$safeDirectoryCountBefore};[Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",$null,'Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",$null,'Process')}
        if($Command -eq 'prove-glm-terminal-success'){
            if(Test-Path -LiteralPath (Get-LeasePath -Namespace scheduler -Key (Get-V2Config).target.branch)){throw 'prove-glm-terminal-success: scheduler lease is active'}
            $script:DispatcherRecoveryRunnerProbe=$false
            try{$proof=Get-DispatcherGlmTerminalSuccessRecoveryProof -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId}finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;&$restoreSafeDirectory}
            [ordered]@{eligible=[bool]$proof.eligible;reason=[string]$proof.reason;providerInvocationRequired=[bool]$proof.providerInvocationRequired;proofHash=[string]$proof.proof.proofHash;stdoutHash=[string]$proof.proof.stdoutHash;originalReceiptHash=[string]$proof.proof.originalReceiptHash;postSnapshotHash=[string]$proof.proof.postSnapshotHash;payloadHash=[string]$proof.proof.payloadHash}|ConvertTo-Json -Depth 8
            exit $(if($proof.eligible){0}else{1})
        }
        $schedulerLease=New-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -RunId $RunId -Scope 'glm-terminal-success-recovery'
        if(-not $schedulerLease.ok){throw 'recover-glm-terminal-success: scheduler lease is active'}
        $script:DispatcherRecoveryRunnerProbe=$false
        try{$result=Recover-DispatcherGlmTerminalSuccess -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId}
        finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;[void](Remove-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -LeaseId $schedulerLease.leaseId);&$restoreSafeDirectory}
        Write-RealDispatcherPilotCheckpoint -State (Get-DispatcherState)|Out-Null
        $result|ConvertTo-Json -Depth 12
    }
    { $_ -in @('prove-review-timeout-retry','recover-review-timeout-retry') } {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId){throw "$Command requires -TaskId, -TaskVersionId, -RunId, and -InvocationId"}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile;$matches=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId})
        if($matches.Count -ne 1){throw "${Command}: task '$TaskId' is not uniquely present in the owner-approved task source"}
        $task=[hashtable]$matches[0];$state=Get-DispatcherState
        if(-not $state){throw "${Command}: no durable dispatcher state"}
        $contract=Get-Contract $TaskVersionId
        $safeDirectoryIndex=[int]$(if($env:GIT_CONFIG_COUNT){$env:GIT_CONFIG_COUNT}else{'0'});$safeDirectoryCountBefore=$env:GIT_CONFIG_COUNT
        [Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",'safe.directory','Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",[IO.Path]::GetFullPath([string]$state.workspace),'Process');$env:GIT_CONFIG_COUNT=[string]($safeDirectoryIndex+1)
        $restoreSafeDirectory={if($null -eq $safeDirectoryCountBefore){Remove-Item Env:GIT_CONFIG_COUNT -ErrorAction SilentlyContinue}else{$env:GIT_CONFIG_COUNT=$safeDirectoryCountBefore};[Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",$null,'Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",$null,'Process')}
        if($Command -eq 'prove-review-timeout-retry'){
            if(Test-Path -LiteralPath (Get-LeasePath -Namespace scheduler -Key (Get-V2Config).target.branch)){throw 'prove-review-timeout-retry: scheduler lease is active'}
            $script:DispatcherRecoveryRunnerProbe=$false
            try{$proof=Get-DispatcherReviewTimeoutRetryProof -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId}finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;&$restoreSafeDirectory}
            [ordered]@{eligible=[bool]$proof.eligible;reason=[string]$proof.reason;candidateHead=[string]$proof.candidateHead;providerInvocationRequired=[bool]$proof.providerInvocationRequired;retryProvider=[string]$proof.retryProvider;retryModel=[string]$proof.retryModel;retryProfile=[string]$proof.retryProfile;proofHash=[string]$proof.proof.proofHash}|ConvertTo-Json -Depth 8
            exit $(if($proof.eligible){0}else{1})
        }
        $schedulerLease=New-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -RunId $RunId -Scope 'review-timeout-retry-recovery'
        if(-not $schedulerLease.ok){throw 'recover-review-timeout-retry: scheduler lease is active'}
        $script:DispatcherRecoveryRunnerProbe=$false
        try{$result=Resume-DispatcherReviewTimeoutBlock -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId}
        finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;[void](Remove-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -LeaseId $schedulerLease.leaseId);&$restoreSafeDirectory}
        Write-RealDispatcherPilotCheckpoint -State (Get-DispatcherState)|Out-Null
        $result|ConvertTo-Json -Depth 12
    }
    { $_ -in @('prove-disjoint-target-advance','recover-disjoint-target-advance') } {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId){throw "$Command requires -TaskId, -TaskVersionId, and -RunId"}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')}
        $source=Read-DispatcherTaskSource $TaskFile;$matches=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId})
        if($matches.Count -ne 1){throw "${Command}: task '$TaskId' is not uniquely present in the owner-approved task source"}
        $task=[hashtable]$matches[0];$state=Get-DispatcherState
        if(-not $state){throw "${Command}: no durable dispatcher state"}
        $contract=Get-Contract $TaskVersionId
        $safeDirectoryIndex=[int]$(if($env:GIT_CONFIG_COUNT){$env:GIT_CONFIG_COUNT}else{'0'});$safeDirectoryCountBefore=$env:GIT_CONFIG_COUNT
        [Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",'safe.directory','Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",[IO.Path]::GetFullPath([string]$state.workspace),'Process');$env:GIT_CONFIG_COUNT=[string]($safeDirectoryIndex+1)
        $restoreSafeDirectory={if($null -eq $safeDirectoryCountBefore){Remove-Item Env:GIT_CONFIG_COUNT -ErrorAction SilentlyContinue}else{$env:GIT_CONFIG_COUNT=$safeDirectoryCountBefore};[Environment]::SetEnvironmentVariable("GIT_CONFIG_KEY_$safeDirectoryIndex",$null,'Process');[Environment]::SetEnvironmentVariable("GIT_CONFIG_VALUE_$safeDirectoryIndex",$null,'Process')}
        if($Command -eq 'prove-disjoint-target-advance'){
            $script:DispatcherRecoveryRunnerProbe=$false
            try{$proof=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId}finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;&$restoreSafeDirectory}
            [ordered]@{eligible=[bool]$proof.eligible;reason=[string]$proof.reason;oldBase=[string]$proof.oldBase;oldHead=[string]$proof.oldHead;currentTarget=[string]$proof.currentTarget;targetAdvancePaths=@($proof.targetAdvancePaths);candidateChangedPaths=@($proof.candidateChangedPaths);overlap=@($proof.overlap);candidateHead=[string]$proof.candidateHead;providerInvocationRequired=[bool]$proof.providerInvocationRequired;freshReviewRequired=[bool]$proof.freshReviewRequired;proofHash=[string]$proof.proof.proofHash;alreadyRecovered=[bool]$proof.alreadyRecovered}|ConvertTo-Json -Depth 8
            exit $(if($proof.eligible){0}else{1})
        }
        if(Test-Path -LiteralPath (Get-LeasePath -Namespace scheduler -Key (Get-V2Config).target.branch)){throw 'recover-disjoint-target-advance: scheduler lease is active'}
        $schedulerLease=New-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -RunId $RunId -Scope 'disjoint-target-advance-recovery'
        if(-not $schedulerLease.ok){throw 'recover-disjoint-target-advance: scheduler lease is active'}
        $script:DispatcherRecoveryRunnerProbe=$false
        try{$result=Recover-DispatcherDisjointTargetAdvance -State $state -Task $task -TaskSource $source -Contract $contract -TaskVersionId $TaskVersionId -RunId $RunId}
        finally{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue;[void](Remove-Lease -Namespace scheduler -Key (Get-V2Config).target.branch -LeaseId $schedulerLease.leaseId);&$restoreSafeDirectory}
        Write-RealDispatcherPilotCheckpoint -State (Get-DispatcherState)|Out-Null
        $result|ConvertTo-Json -Depth 12
    }
    'recover-completed-implementation' {
        if($TaskId -ne 'PB1-P02-audit-service' -or $TaskVersionId -ne '9072101439aa09bbb494e28b3e2c8e985dcb91d0235d68ff7f7164b2ada65798' -or $RunId -ne 'run-31fa07ca662c48b087d32ad0666e9a22' -or $InvocationId -ne 'att-394e628d81584d06953598bc080bc399'){throw 'recover-completed-implementation is closed to the owner-authorized attempt 349'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\')};$source=Read-DispatcherTaskSource $TaskFile;$task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0];if(-not $task){throw "recover-completed-implementation: task '$TaskId' not found"}
        Recover-DispatcherCompletedImplementation -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -ExpectedRequestManifestHash 'sha256:dd5c6fc4de437333e9380c5f2146188c8913a57285b682e4e2daa18d4581c385' -ExpectedStdoutHash 'sha256:f2bd5d36ec5dd29f7e6e0716a3b929e93c0e81531be7b2fdb868b61c9915f8d2' -ExpectedControlRecordHash 'sha256:fc21b963402339caa9c66cac00c021c18f3559dfe3d31f6fad031d25672c5e93' -ExpectedPreManifestHash 'sha256:7792a5b84e5aeb75a9afa81856fe4606690a883113c1919f92e1f7e0c3ed3960' -ExpectedPostManifestHash 'sha256:ca02dc4d0f1f112d3495adfb9d358ce095b7d5e371129e512b4f25e4c1be72fb' -ExpectedPartialDiffHash 'sha256:9e49c36ef68e45f0ebcf93256ba212910108eda30120ca5b2e313d828ef7de7c' -ExpectedPartialFilesHash 'sha256:ff382c1e62bfe2ba4e9d0f8304a9aa0634ab3e85f469d6a096d1587afad29617' -ExpectedTelemetryReceiptHash 'sha256:5ca2f65873cca126b46a2b8a93408353ff1305e61319def8eceecb772e0f6ee5' -ExpectedGateHash 'sha256:08f03f366d69d53d099e1cb938404ba86b8597e81c87b523879520e6d9392e23' -ExpectedAttempt 349 -ExpectedTailSeq 1052 -ExpectedTailEventHash 'sha256:8632f7c772afd2ad2f4217eb8c99df9566b5f44f9d98767d14252dd9e8b3519c' -TrustedHead '046969b76b5e4d5e046e8e9f62c724daf87a5aa0' -ExpectedCostUsd ([decimal]0.91820872) -ExpectedPaths @('apps/backend/src/quote/quote.service.spec.ts','apps/backend/src/quote/quote.service.ts')|ConvertTo-Json -Depth 12
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
    'recover-incomplete-running-invocation' {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId -or -not $EvidenceHash -or -not $PreManifestHash -or -not $PostManifestHash){throw 'recover-incomplete-running-invocation requires task/run/invocation/evidence and both manifest hashes'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\\')}
        $source=Read-DispatcherTaskSource $TaskFile;$task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0];if(-not $task){throw "recover-incomplete-running-invocation: task '$TaskId' not found"}
        Recover-DispatcherIncompleteRunningInvocation -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -EvidenceHash $EvidenceHash -PreManifestHash $PreManifestHash -PostManifestHash $PostManifestHash|ConvertTo-Json -Depth 12
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
    'recover-quarantined-retry-route' {
        if(-not $TaskId -or -not $TaskVersionId -or -not $RunId -or -not $InvocationId -or -not $EvidenceHash -or -not $PartialDiffHash -or -not $PartialFilesHash){throw 'recover-quarantined-retry-route requires task, run, invocation, evidence, and partial hashes'}
        if(-not $TaskFile){$TaskFile=Join-Path (Get-RepoRoot) ((Get-PilotConfig).taskSourceFile -replace '/','\\')};$source=Read-DispatcherTaskSource $TaskFile;$task=@($source.tasks|Where-Object{[string]$_.taskId -eq $TaskId}|Select-Object -First 1)[0];if(-not $task){throw "recover-quarantined-retry-route: task '$TaskId' not found"}
        Recover-DispatcherQuarantinedRetryRoute -Task ([hashtable]$task) -TaskSource $source -TaskVersionId $TaskVersionId -RunId $RunId -InvocationId $InvocationId -EvidenceHash $EvidenceHash -PartialDiffHash $PartialDiffHash -PartialFilesHash $PartialFilesHash|ConvertTo-Json -Depth 12
    }
    'reconcile-orphaned-scheduler-lease' {
        if(-not $LeaseId -or -not $LeaseHash -or -not $LeaseOwnerRunId -or -not $LeaseHolderHost -or -not $LeaseHolderPid -or -not $LeaseHolderStartTime){throw 'reconcile-orphaned-scheduler-lease requires -LeaseId, -LeaseHash, -LeaseOwnerRunId, -LeaseHolderHost, -LeaseHolderPid, and -LeaseHolderStartTime'}
        $result=Reconcile-OrphanedSchedulerLease -LeaseId $LeaseId -LeaseHash $LeaseHash -OwnerRunId $LeaseOwnerRunId -HolderHost $LeaseHolderHost -HolderPid $LeaseHolderPid -HolderStartTime $LeaseHolderStartTime -ExpectedNonce $LeaseNonce -ExpectedFencingToken $LeaseFencingToken
        $result|ConvertTo-Json -Depth 12
    }
    { $_ -in @('run','run-once','start') } {
        if ($Command -eq 'start') { Write-Host "pilot start is deprecated; using real 'run'." -ForegroundColor Yellow }
        $r = Invoke-DispatcherLoop -RunOnce:($Command -eq 'run-once') -TaskFile $TaskFile -ProviderOverride $ProviderOverride
        Write-RealDispatcherPilotCheckpoint -State $r | Out-Null
        $r | ConvertTo-Json -Depth 20
        exit $(if ("$($r.status)" -in @('FAILED','BLOCKED','BLOCK','RESUMABLE','TEST_FAILURE','AGENT_FAILURE')) { 1 } else { 0 })
    }
    'stop' {
        $f = Join-Path (Get-V2Dir) (Get-PilotConfig).stopFile
        Set-Content -LiteralPath $f -Value "stop requested $(Get-Date -Format o)" -Encoding ascii
        Write-Host "pilot stop file written: $f"
    }
}
