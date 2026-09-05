<#
pilot-probe.ps1 - one synthetic PILOT scenario per child process (cwd = fixture).
Prints PROBE_OK on success. No model calls.
#>
param([Parameter(Mandatory)][string]$Do)
$ErrorActionPreference = 'Stop'
$V2 = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

. (Join-Path $V2 'lib-v2.ps1')
. (Join-Path $V2 'ledger.ps1')
. (Join-Path $V2 'contract.ps1')
. (Join-Path $V2 'attest.ps1')
. (Join-Path $V2 'lease.ps1')
. (Join-Path $V2 'classify.ps1')
. (Join-Path $V2 'review-envelope.ps1')
. (Join-Path $V2 'verification.ps1')
. (Join-Path $V2 'preflight.ps1')
. (Join-Path $V2 'integrate.ps1')
. (Join-Path $V2 'tests\pipeline-harness.ps1')
. (Join-Path $V2 'pilot.ps1')

$ErrorActionPreference = 'Continue'
function Ok  { param([string]$m = '') Write-Output ("PROBE_OK " + $m); exit 0 }
function Die { param([string]$m) Write-Output "PROBE_FAIL: $m"; exit 1 }
function Assert { param($c, [string]$m) if (-not $c) { Die $m } }

$Repo = (Get-RepoRoot)
$Head = (Get-GitHeadV2 $Repo)

function Seed {
    param([string]$TaskId, [string]$Risk = 'B', [string]$Gate = 'none', [string]$Spec = 'Create work/artifact.md with ## Intro, ## Body, ## Conclusion.', [string]$Acc = 'AC1: work/artifact.md exists with the three headings.', [string]$Prof = 'B')
    $c = Freeze-Contract -TaskId $TaskId -PlanningHead $Head -SpecText $Spec -AcceptanceText $Acc -DeclaredScope @('work/') -Risk $Risk -Gate $Gate -VerificationProfile $Prof
    Initialize-LedgerTask $c.taskVersionId @{ taskId = $TaskId } | Out-Null
    Write-V2Json (Join-Path (Get-V2Dir) 'state\index.v2.json') ([ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.index/1'; planningHead = $c.planningHead; reconciled = $true
        tasks = @(@{ taskId = $TaskId; taskVersionId = $c.taskVersionId; deps = @(); gate = "$Gate" })
    })
    Invoke-PreflightFetch -RepoDir $Repo | Out-Null
    return $c
}

function Task {
    param([string]$Id, [string]$Risk = 'B', [string]$Gate = 'none', [string]$Desc = 'add a shared loading state', [string]$Acc = "AC1: done`nAC2: covered")
    return @{ taskId = $Id; title = "task $Id"; type = 'UX'; source = 'pilot-synthetic'; description = $Desc
             acceptance = $Acc; dependencies = @(); scope = @('work/'); risk = $Risk; productBatch = 'SYNTH'
             ownerGate = $Gate; candidateConstraints = @(); verificationProfile = 'B'; status = 'SCHEDULED' }
}

function Runner {
    param([string]$Tvid)
    # returns a scriptblock (exec, review, provider) -> spine result
    return {
        param($ex, $rv, $prov)
        [Environment]::SetEnvironmentVariable('ORCH_V2_EXEC', $ex)
        [Environment]::SetEnvironmentVariable('ORCH_V2_REVIEW', $rv)
        Invoke-SpineRun -TaskVersionId $Tvid -RepoDir $Repo
    }.GetNewClosure()
}

switch ($Do) {

    'happy' {
        $c = Seed 'PS-happy' 'B'
        $r = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task (Task 'PS-happy' 'B') -SpineRunner (Runner $c.taskVersionId)
        Assert ($r.status -eq 'PUBLISHED') "status=$($r.status) reason=$($r.reason) :: $($r.trace -join ' | ')"
        Assert ($r.classification -and $r.route -and $r.reviewer) "classification/route/reviewer not recorded"
        Assert ($r.reviewer.crossProvider) "reviewer should be the opposite provider"
        Assert (($r.guardsHonored -join ',') -match 'exactCandidate' -and ($r.guardsHonored -join ',') -match 'secretGate' -and ($r.guardsHonored -join ',') -match 'remoteTruthReconciliation') "core guards not honored: $($r.guardsHonored -join ',')"
        Assert ((Get-LedgerState $c.taskVersionId).published) "ledger not PUBLISHED"
        Ok "PUBLISHED via $($r.route.provider), review by $($r.reviewer.provider)"
    }

    'level-c' {
        $c = Seed 'PS-lc' 'C' 'owner-persistent-migration'
        $r = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task (Task 'PS-lc' 'C' 'owner-persistent-migration' 'apply persistent prisma migration and backfill company_id' 'AC1: applied') -SpineRunner (Runner $c.taskVersionId)
        Assert ($r.status -eq 'WAITING_HUMAN') "status=$($r.status)"
        Assert (($r.guardsHonored -join ',') -match 'levelCStop') "levelCStop guard not recorded"
        Assert ((Get-LedgerState $c.taskVersionId).state -eq 'WAITING_HUMAN') "ledger=$((Get-LedgerState $c.taskVersionId).state)"
        Assert (-not (Test-CanDispatch $c.taskVersionId).ok) "Level C task still dispatchable"
        Ok "Level C -> WAITING_HUMAN, not executed"
    }

    'provider-down-resume' {
        $c = Seed 'PS-wp' 'B'
        $script:ProviderHealthFaults = @{ claude = 'PROVIDER_QUOTA'; codex = 'PROVIDER_QUOTA' }
        try {
            $r = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task (Task 'PS-wp' 'B') -SpineRunner (Runner $c.taskVersionId)
            Assert ($r.status -eq 'WAITING_PROVIDER') "status=$($r.status)"
            Assert ((Get-LedgerState $c.taskVersionId).state -eq 'WAITING_PROVIDER') "ledger not WAITING_PROVIDER"
            $w = Get-ProviderWait $c.taskVersionId
            Assert ($w -and $w.checkpoint -and $w.lastErrorClass) "provider-wait record incomplete"
        } finally { $script:ProviderHealthFaults = $null }
        # providers back -> auto resume sweep
        $sw = Invoke-ProviderPollSweep -RunId 'resume' -IgnoreBackoff
        Assert (@($sw | Where-Object { $_.action -eq 'RESUMED' }).Count -eq 1) "sweep did not auto-resume"
        Assert ((Get-LedgerState $c.taskVersionId).state -eq 'DISPATCHED') "not DISPATCHED after resume"
        # pilot re-runs the resumed task to completion
        $r2 = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task (Task 'PS-wp' 'B') -SpineRunner (Runner $c.taskVersionId)
        Assert ($r2.status -eq 'PUBLISHED') "after resume: status=$($r2.status) :: $($r2.trace -join ' | ')"
        Ok "WAITING_PROVIDER -> auto-resume -> PUBLISHED"
    }

    'failover' {
        $c = Seed 'PS-fo' 'B'
        # claude quota (from the fake agent control channel), codex healthy -> failover to codex
        $sc = @{ '1' = @{ exec = 'provider-quota'; review = 'approve' }; '2' = @{ exec = 'ok'; review = 'approve' } }
        $r = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task (Task 'PS-fo' 'B') -SpineRunner (Runner $c.taskVersionId) -Scenarios $sc
        Assert ($r.status -eq 'PUBLISHED') "status=$($r.status) reason=$($r.reason) :: $($r.trace -join ' | ')"
        Assert ($r.failovers -ge 1) "no failover recorded"
        Assert (($r.providerHistory | ForEach-Object { $_.provider }) -contains 'codex') "did not fail over to codex"
        Assert (($r.guardsHonored -join ',') -match 'automaticProviderFailover') "failover guard not recorded"
        Ok "claude quota -> failover to codex -> PUBLISHED (same lineage)"
    }

    'correction' {
        $c = Seed 'PS-corr' 'B'
        $sc = @{ '1' = @{ exec = 'ok'; review = 'request-changes' }; '2' = @{ exec = 'ok-fixed'; review = 'approve' } }
        $r = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task (Task 'PS-corr' 'B') -SpineRunner (Runner $c.taskVersionId) -Scenarios $sc
        Assert ($r.status -eq 'PUBLISHED') "status=$($r.status) reason=$($r.reason) :: $($r.trace -join ' | ')"
        Assert ($r.correctionCycles -eq 1) "correctionCycles=$($r.correctionCycles), expected 1"
        Assert (($r.guardsHonored -join ',') -match 'boundedReviewCycles') "bounded review guard not recorded"
        Ok "REQUEST_CHANGES -> 1 correction cycle -> PUBLISHED"
    }

    'correction-budget' {
        $c = Seed 'PS-cb' 'B'
        $sc = @{ '1' = @{ exec = 'ok'; review = 'request-changes' }; '2' = @{ exec = 'ok-fixed'; review = 'request-changes' }; '3' = @{ exec = 'ok-fixed'; review = 'request-changes' } }
        $r = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task (Task 'PS-cb' 'B') -SpineRunner (Runner $c.taskVersionId) -Scenarios $sc
        Assert ($r.status -eq 'FAILED_REVIEW_BUDGET') "status=$($r.status) :: $($r.trace -join ' | ')"
        Assert ((Get-LedgerState $c.taskVersionId).state -eq 'FAILED_REVIEW_BUDGET') "ledger=$((Get-LedgerState $c.taskVersionId).state)"
        Ok "correction budget spent -> FAILED_REVIEW_BUDGET (no infinite loop)"
    }

    'crash-recover' {
        $c = Seed 'PS-cr' 'B'
        # simulate a prior run that fenced generation 1 ACTIVE then 'crashed' (dead holder)
        $f = New-GenerationFence -TaskVersionId $c.taskVersionId -RunId 'run-crashaaaa'
        Assert ($f.ok -and $f.generation -eq 1) "fence gen1 not created"
        $fp = Get-FencePath $c.taskVersionId
        $fj = Read-V2Json $fp
        $fj.holder = @{ pid = 999999; host = $env:COMPUTERNAME; startTime = '2000-01-01T00:00:00.0000000Z'; alive = $false }
        Write-V2JsonCanonical $fp $fj
        Add-LedgerEvent -TaskVersionId $c.taskVersionId -Event 'ready' -ToState 'READY' | Out-Null
        Add-LedgerEvent -TaskVersionId $c.taskVersionId -Event 'dispatch' -ToState 'DISPATCHED' -RunId 'run-crashaaaa' | Out-Null
        Add-LedgerEvent -TaskVersionId $c.taskVersionId -Event 'running' -ToState 'RUNNING' -RunId 'run-crashaaaa' | Out-Null
        # restart: the pilot recovers (fences the dead gen -> gen 2) and completes
        $r = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task (Task 'PS-cr' 'B') -SpineRunner (Runner $c.taskVersionId)
        Assert ($r.status -eq 'PUBLISHED') "status=$($r.status) :: $($r.trace -join ' | ')"
        Assert (($r.trace -join ' ') -match 'generation 2') "did not fence to generation 2 before recovering"
        Assert (-not (Test-GenerationCurrent -TaskVersionId $c.taskVersionId -Generation 1)) "stale generation 1 still current"
        Ok "crash -> fence dead gen -> RECOVERED gen 2 -> PUBLISHED (lineage preserved)"
    }

    'checkpoint' {
        $c = Seed 'PS-ck' 'B'
        $r = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task (Task 'PS-ck' 'B') -SpineRunner (Runner $c.taskVersionId)
        Assert ($r.status -eq 'PUBLISHED') "status=$($r.status)"
        $cp = Get-PilotCheckpoint
        Assert ($cp -and $cp.runId -eq $r.runId) "latest checkpoint missing / wrong run"
        Assert ($cp.status -eq 'PUBLISHED' -and $cp.providerHistory -and $cp.guardsHonored) "checkpoint content incomplete"
        $cp2 = Get-PilotCheckpoint -RunId $r.runId
        Assert ($cp2 -and $cp2.runId -eq $r.runId) "per-run checkpoint missing"
        $dispatcherState=[ordered]@{runId=$r.runId;taskId='PS-ck';taskVersionId=$c.taskVersionId;status='PUBLISHED';reason='ok';stage='INTEGRATE';provider='claude';providerHistory=@(@{provider='claude';role='IMPLEMENTER'});candidateHead=('a'*40)}
        Write-RealDispatcherPilotCheckpoint -State $dispatcherState | Out-Null
        $cp3=Get-PilotCheckpoint
        Assert ($cp3.status -eq 'PUBLISHED' -and $cp3.ledgerState -eq 'PUBLISHED' -and $cp3.candidateHead -eq ('a'*40)) "real dispatcher checkpoint content incomplete"
        Ok "durable checkpoint written + readable (run $($r.runId.Substring(0,10)))"
    }

    'no-force-push' {
        foreach ($f in @('pilot.ps1', 'integrate.ps1', 'runner-docker.ps1', 'intent.ps1', 'providers.ps1')) {
            $t = Get-Content -Raw -LiteralPath (Join-Path $V2 $f)
            $auth = ($t -split '(?m)^function\s+Test-\w*Selftest')[0]
            Assert ($auth -notmatch '(?i)push\s+.*--force|--force-with-lease|reset\s+--hard|push\s+-f\b') "$f contains a force/destructive git op in the authoritative path"
        }
        # Assert-SafeGitV2 forbid-list still blocks it
        $threw = $false
        try { Assert-SafeGitV2 @('push', 'origin', 'main', '--force') } catch { $threw = $true }
        Assert $threw "Assert-SafeGitV2 no longer blocks --force"
        Assert ((Get-V2Config).pilot.forcePush -eq $false) "pilot.forcePush is not false"
        Ok "no force-push in the pilot/integrator path; forbid-list intact; pilot.forcePush=false"
    }

    'real-refused' {
        $c = Seed 'PB1-fake-real' 'B'
        $t = Task 'PB1-fake-real' 'B'
        $t.blockedByGates = @('P02-T12', 'P02-T13', 'P03')
        $r = Invoke-PilotTask -TaskVersionId $c.taskVersionId -Task $t -SpineRunner (Runner $c.taskVersionId) -RealMode
        Assert ($r.status -eq 'BLOCKED') "real-mode task not BLOCKED: status=$($r.status)"
        Assert ($r.reason -match 'not authorized|gate') "wrong block reason: $($r.reason)"
        Assert (-not (Test-RealExecutionAuthorized)) "a real-execution auth token unexpectedly exists"
        Ok "real PB1 task refused: $($r.reason)"
    }

    'docker-static' {
        . (Join-Path $V2 'runner-docker.ps1')
        $s = Test-DockerCompositionSelftest
        Assert ($s.ok) "docker composition static invariants failed: $($s.failures -join '; ')"
        $ta = Get-DockerRunArgs -Stage 'test' -CandidateDir 'C:\x\cand' -OutDir 'C:\x\out' -Command @('sh', '-lc', 'pnpm test')
        Assert (($ta -join ' ') -match '--network none') "test stage not --network none"
        Assert (($ta -join ' ') -match 'dst=/candidate,ro=true') "candidate not read-only"
        Assert (($ta -join ' ') -notmatch 'docker\.sock|USERPROFILE|\\Users\\') "docker argv leaks sock/HOME"
        Ok "docker composition invariants hold (read-only candidate, --network none test, no sock/HOME/secrets)"
    }

    default { Die "unknown pilot scenario '$Do'" }
}
