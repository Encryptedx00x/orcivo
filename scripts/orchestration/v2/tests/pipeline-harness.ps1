<#
pipeline-harness.ps1 - composes the V2 spine primitives into ONE synthetic run.

STRUCTURALLY a test helper (NC-01): it lives under tests/, it requires a
disposable repo root (Assert-DisposableRoot - no env-var override anywhere), and
it is NOT reachable from spine.ps1. There is no `run` verb on any production
entrypoint. The only executor is the deterministic fake agent
(tests/fake-agent-v2.ps1). C-05 (process-tree kill), C-06 (OS isolation), H-08
(crash-resume), H-09 (full budgets) and H-10 (real GSD parser) remain deferred.

Flow (ledger states in parens):
  Assert-DisposableRoot -> preflight -> lease(taskversion,workspace)
   -> (READY->DISPATCHED->RUNNING) -> fake execute -> classify(control channel)
   -> commit -> build integration candidate (merge target into branch) BEFORE review (#7)
   -> (RUNNING->CHECKING) contract compliance + declarative verification profile + check attestation
   -> (CHECKING->REVIEWING) fenced schema-validated review envelope + review attestation
   -> (REVIEWING->APPROVED | NO_CHANGE_ACCEPTED) -> integrate.ps1 (H-04/C-03/#6/#7)
   -> artifact secret scan on EVERY exit path (H-11 / #15)
#>

. (Join-Path $PSScriptRoot '..\lib-v2.ps1')
. (Join-Path $PSScriptRoot '..\ledger.ps1')
. (Join-Path $PSScriptRoot '..\contract.ps1')
. (Join-Path $PSScriptRoot '..\attest.ps1')
. (Join-Path $PSScriptRoot '..\lease.ps1')
. (Join-Path $PSScriptRoot '..\classify.ps1')
. (Join-Path $PSScriptRoot '..\review-envelope.ps1')
. (Join-Path $PSScriptRoot '..\preflight.ps1')
. (Join-Path $PSScriptRoot '..\verification.ps1')
. (Join-Path $PSScriptRoot '..\integrate.ps1')

$script:FakeAgentV2 = Join-Path $PSScriptRoot 'fake-agent-v2.ps1'

function Get-RunDirV2 { param([string]$RunId) return (Join-Path (Get-V2Dir) "runs\$RunId") }

function _invokeFake {
    param([string]$Mode, [string]$Worktree, [string]$PromptFile, [string]$RunDir, [string]$Stamp, [hashtable]$Meta)
    $ps = Resolve-Executable 'powershell'
    $out = Join-Path $RunDir "logs\$Stamp.stdout.log"
    $err = Join-Path $RunDir "logs\$Stamp.stderr.log"
    $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File', $script:FakeAgentV2, '-Mode', $Mode, '-Worktree', $Worktree)
    $r = Invoke-NativeCaptured -Exe $ps -Arguments $args -WorkingDirectory $Worktree -StdinFile $PromptFile -StdoutLog $out -StderrLog $err -TimeoutSec 120
    return $r
}

function _scanAll {
    param([string]$RunDir, [string]$Worktree)
    $roots = @($RunDir, $Worktree, (Join-Path (Get-V2Dir) 'logs'), (Join-Path (Get-V2Dir) 'contracts'),
               (Join-Path (Get-V2Dir) 'attestations'), (Join-Path (Get-V2Dir) 'runs'))
    $hits = @()
    foreach ($r in ($roots | Select-Object -Unique)) {
        if (-not (Test-Path $r)) { continue }
        $s = Test-ArtifactsClean -Root $r
        if (-not $s.clean) { $hits += $s.hits }
    }
    return @($hits)
}

function Invoke-SpineRun {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$RepoDir,
        [string]$NoChangeEvidenceFile = ''
    )
    # H3-01: the authoritative pipeline accepts NO caller scriptblock. Verification
    # is exclusively the declarative frozen profile.
    Assert-DisposableRoot -RepoDir $RepoDir -Why 'run the spine pipeline'

    $cfg = Get-V2Config
    $res = [ordered]@{ taskVersionId = $TaskVersionId; status = 'ABORTED'; stage = 'preflight'; reason = ''; runId = $null; ledgerState = $null; details = @{} }
    $runDir = $null; $wt = $null

    try {
        # 1. preflight (H-07)
        $pf = Test-Preflight -TaskVersionId $TaskVersionId -RepoDir $RepoDir
        if (-not $pf.ok) { $res.reason = "preflight: $($pf.failures -join ' | ')"; return $res }

        $contract = Get-Contract $TaskVersionId
        $runId = New-RunId
        $res.runId = $runId
        $runDir = Get-RunDirV2 $runId
        New-Item -ItemType Directory -Force -Path (Join-Path $runDir 'logs') | Out-Null

        $tvLease = New-Lease -Namespace 'taskversion' -Key $TaskVersionId -TaskVersionId $TaskVersionId -RunId $runId
        if (-not $tvLease.ok) { $res.reason = "taskversion lease held ($($tvLease.heldBy.leaseId))"; return $res }
        $tvBeat = Start-LeaseHeartbeat -Namespace 'taskversion' -Key $TaskVersionId -LeaseId $tvLease.leaseId

        try {
            $wsLease = New-Lease -Namespace 'workspace' -Key $runId -TaskVersionId $TaskVersionId -RunId $runId
            if (-not $wsLease.ok) { $res.reason = 'workspace lease held'; return $res }

            try {
                $st = Get-LedgerState $TaskVersionId
                if ($st.state -eq 'DISCOVERED') { Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'ready' -ToState 'READY' | Out-Null }
                elseif ($st.state -eq 'WAITING_HUMAN') { Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'gate-approved' -ToState 'DISPATCHED' -RunId $runId | Out-Null }
                $attemptId = New-AttemptId
                if ((Get-LedgerState $TaskVersionId).state -ne 'DISPATCHED') {
                    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'dispatch' -ToState 'DISPATCHED' -RunId $runId -AttemptId $attemptId | Out-Null
                }

                $base = (Get-GitHeadV2 $RepoDir)
                $branch = "orch-v2/$runId"
                $wt = Join-Path (Get-V2Dir) "worktrees\$runId"
                Assert-SafeGitV2 @('worktree','add','-b',$branch,$wt,$base)
                & git -C $RepoDir worktree add -b $branch $wt $base --quiet 2>&1 | Out-Null

                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'running' -ToState 'RUNNING' -RunId $runId | Out-Null
                $res.stage = 'execute'

                # 4. fake execute (prompt is sanitized before it touches disk - #15)
                $promptFile = Join-Path $runDir 'prompt.execute.txt'
                [System.IO.File]::WriteAllText($promptFile, (Protect-ArtifactText ("EXECUTE`n" + $contract.specText)), (New-Utf8NoBom))
                $stamp = 'exec-' + (Get-Date -Format 'HHmmssfff')
                $ex = _invokeFake -Mode 'execute' -Worktree $wt -PromptFile $promptFile -RunDir $runDir -Stamp $stamp

                # 5. classify from the control channel (H-01)
                $control = _readControlChannel $wt
                $class = Get-FailureClassV2 -Provider 'claude' -ExitCode $ex.exitCode -Control $control -AppStdout $ex.stdout
                $res.details.executeClass = $class
                if ($class -eq 'HUMAN_GATE') {
                    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'agent-human-gate' -ToState 'WAITING_HUMAN' -RunId $runId | Out-Null
                    $res.status = 'WAITING_HUMAN'; $res.reason = 'agent emitted HUMAN_GATE'; $res.ledgerState = 'WAITING_HUMAN'; return $res
                }
                if ($class -ne 'OK') {
                    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'execute-failed' -ToState 'FAILED' -RunId $runId -Note $class | Out-Null
                    $res.status = 'FAILED'; $res.reason = "execute class $class"; $res.ledgerState = 'FAILED'; return $res
                }

                Beat-Lease $tvBeat   # freshness checkpoint (H-05 telemetry)

                # 6. immutable commit of exactly what the agent produced
                & git -C $wt add -A 2>&1 | Out-Null
                $execHead = $base
                if (@(& git -C $wt status --porcelain=v1).Count -gt 0) {
                    & git -C $wt -c user.name='orch-v2-executor' -c user.email='executor@v2.local' commit -m "$($TaskVersionId.Substring(0,12)): run $runId" --quiet 2>&1 | Out-Null
                    $execHead = (Get-GitHeadV2 $wt)
                }

                # 7. contract compliance on the executor's raw diff (H-06 / M-01 / M-03)
                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'checking' -ToState 'CHECKING' -RunId $runId | Out-Null
                $res.stage = 'contract'
                $cc = Test-ContractCompliance -TaskVersionId $TaskVersionId -WorktreeDir $wt -BaseSha $base -HeadSha $execHead -NoChangeEvidenceFile $NoChangeEvidenceFile
                $res.details.contract = $cc
                if (-not $cc.compliant) {
                    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'policy-block' -ToState 'FAILED' -RunId $runId -Note ($cc.violations -join '; ') | Out-Null
                    $res.status = 'POLICY_BLOCK'; $res.reason = ($cc.violations -join '; '); $res.ledgerState = 'FAILED'; return $res
                }

                if ($cc.verdict -eq 'NO_CHANGE_JUSTIFIED') {
                    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'reviewing' -ToState 'REVIEWING' -RunId $runId | Out-Null
                    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'no-change-accepted' -ToState 'NO_CHANGE_ACCEPTED' -RunId $runId -Note 'justified no-op' | Out-Null
                    $res.status = 'NO_CHANGE_ACCEPTED'; $res.reason = 'justified no-op; nothing to integrate'; $res.ledgerState = 'NO_CHANGE_ACCEPTED'; return $res
                }

                # 8. build the integration candidate NOW (#7): merge current target into the
                #    branch, and freeze/check/review THAT exact commit.
                $cand = New-IntegrationCandidate -RepoDir $RepoDir -WorktreeDir $wt -Branch $branch
                if (-not $cand.ok) {
                    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'candidate-failed' -ToState 'FAILED' -RunId $runId -Note $cand.reason | Out-Null
                    $res.status = 'NEEDS_REVIEW'; $res.reason = $cand.reason; $res.ledgerState = 'FAILED'; return $res
                }
                $candBase = $cand.expectedTargetSha
                $candHead = $cand.candidateSha
                $res.details.candidate = @{ base = $candBase; head = $candHead }

                # 9. declarative verification profile (NH-02) + check attestation (C-03)
                $res.stage = 'check'
                $vp = Invoke-VerificationProfile -ProfileId $contract.verificationProfile -WorktreeDir $wt -BaseSha $candBase -HeadSha $candHead
                $checkPass = $vp.pass
                $bindings = Get-AttestationBindings -TaskVersionId $TaskVersionId -WorktreeDir $wt -BaseSha $candBase -HeadSha $candHead
                New-Attestation -Kind check -TaskVersionId $TaskVersionId -RunId $runId -Bindings $bindings `
                    -Result $(if ($checkPass) { 'PASS' } else { 'FAIL' }) `
                    -Payload @{ profileId = $vp.profileId; effectiveInvocationHash = $vp.effectiveInvocationHash; checks = @($vp.checks) } `
                    -ProducerMeta @{ verifier = 'v2-deterministic'; profileId = $vp.profileId; verificationDefinitionHash = $vp.verificationDefinitionHash } | Out-Null
                if (-not $checkPass) {
                    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'check-failed' -ToState 'FAILED' -RunId $runId | Out-Null
                    $res.status = 'CHECK_FAILED'; $res.reason = 'verification profile failed'; $res.ledgerState = 'FAILED'; return $res
                }

                # 10. review (C-02 / H-03)
                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'reviewing' -ToState 'REVIEWING' -RunId $runId | Out-Null
                $res.stage = 'review'
                $diff = (& git -C $wt diff --no-color "$candBase..$candHead") -join "`n"
                $changed = @(Get-GitChangedFiles -Dir $wt -BaseSha $candBase -HeadSha $candHead)
                $critIds = @($contract.acceptanceCriteriaIds)
                $rDataDir = Join-Path $runDir 'review-data'
                $rprompt = Build-ReviewPrompt -DataDir $rDataDir -TaskVersionId $TaskVersionId -Head $candHead -TreeHash $bindings.treeHash `
                    -DiffHash $bindings.diffHash -SpecHash $contract.specHash -AcceptanceText $contract.acceptanceText `
                    -SpecText $contract.specText -Diff $diff -ChangedFiles $changed -CheckSummary "verdict=PASS profile=$($contract.verificationProfile)" `
                    -CriteriaIds $critIds
                $rpFile = Join-Path $runDir 'prompt.review.txt'
                [System.IO.File]::WriteAllText($rpFile, (Protect-ArtifactText $rprompt), (New-Utf8NoBom))
                $rstamp = 'review-' + (Get-Date -Format 'HHmmssfff')
                $rv = _invokeFake -Mode 'review' -Worktree $wt -PromptFile $rpFile -RunDir $runDir -Stamp $rstamp

                $parsed = Parse-ReviewEnvelope -Stdout $rv.stdout -Expected @{
                    taskVersion = $TaskVersionId; head = $candHead; treeHash = $bindings.treeHash
                    diffHash = $bindings.diffHash; specHash = $contract.specHash
                    changedFiles = $changed; criteriaIds = $critIds
                    processOk = (($rv.exitCode -eq 0) -and (-not $rv.timedOut))
                }
                $res.details.review = @{ verdict = $parsed.verdict; reason = $parsed.reason; problems = $parsed.problems }

                # M-05: reviewer provenance is the LAUNCHER's runtime metadata, not the envelope's
                $reviewerMeta = @{
                    provider = 'codex'; launchedBy = 'v2-harness'
                    model = 'deterministic-fake'; effort = 'n/a'; toolPolicy = 'read-only-fenced'
                    promptTemplateVersion = $cfg.review.promptTemplateVersion; schemaVersion = $cfg.review.schemaVersion
                    durationSec = $rv.durationSec; exitCode = $rv.exitCode
                    envelopeSelfReported = $(if ($parsed.envelope) { "$($parsed.envelope.reviewerMeta.provider)/$($parsed.envelope.reviewerMeta.model)" } else { $null })
                }
                New-Attestation -Kind review -TaskVersionId $TaskVersionId -RunId $runId -Bindings $bindings `
                    -Result $parsed.verdict -Payload @{ problems = @($parsed.problems); reason = $parsed.reason } -ProducerMeta $reviewerMeta | Out-Null

                if ($parsed.verdict -ne 'APPROVE') {
                    $to = $(if ($parsed.verdict -eq 'REQUEST_CHANGES') { 'RUNNING' } else { 'WAITING_HUMAN' })
                    Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'review-not-approved' -ToState $to -RunId $runId -Note "$($parsed.verdict): $($parsed.reason)" | Out-Null
                    $res.status = $parsed.verdict; $res.reason = $parsed.reason; $res.ledgerState = $to
                    return $res
                }

                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'approved' -ToState 'APPROVED' -RunId $runId | Out-Null

                # 11. integration (H-04 / C-03 / #6 / #7)
                $res.stage = 'integrate'
                $ir = Invoke-Integration -TaskVersionId $TaskVersionId -RunId $runId -RepoDir $RepoDir -WorktreeDir $wt `
                    -Branch $branch -BaseSha $candBase -HeadSha $candHead -SecretScanRoots @($runDir, $wt)
                $res.details.integration = $ir
                $res.status = $ir.status
                $res.reason = $ir.reason
                $res.ledgerState = (Get-LedgerState $TaskVersionId).state
                return $res
            }
            finally { [void](Remove-Lease -Namespace 'workspace' -Key $runId -LeaseId $wsLease.leaseId) }
        }
        finally {
            Stop-LeaseHeartbeat $tvBeat
            [void](Remove-Lease -Namespace 'taskversion' -Key $TaskVersionId -LeaseId $tvLease.leaseId)
        }
    }
    finally {
        # #15: secret sweep on EVERY exit path (success / fail / timeout / policy block / exception)
        if ($runDir) {
            $hits = _scanAll -RunDir $runDir -Worktree $wt
            $res.details.secretScan = @{ clean = ($hits.Count -eq 0); hits = @($hits) }
            if ($hits.Count -gt 0) {
                Write-V2Log "pipeline: SECRET LEAK in artifacts: $($hits -join '; ')" 'ERROR'
                if ($res.status -notin @('ABORTED')) { $res.status = 'SECRET_LEAK' }
            }
        }
    }
}

# the fake agent drops a control-channel file; the real CLIs' --json output will
# be normalized here in the deferred real-provider work.
function _readControlChannel {
    param([string]$Worktree)
    $f = Join-Path $Worktree '.orch-v2-control.json'
    if (-not (Test-Path $f)) { return $null }
    try {
        $obj = Get-Content -Raw -LiteralPath $f | ConvertFrom-Json
        Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue
        # normalise the raw claude-shaped result object to the classifier's shape
        # (isError / errorType / httpStatus / message). ConvertFrom-ClaudeResult
        # lives in classify.ps1. A control file that already carries `isError`
        # (pre-normalised) is passed through untouched.
        if ($obj -and $null -eq $obj.isError -and ($null -ne $obj.is_error -or $null -ne $obj.subtype -or $null -ne $obj.error)) {
            return (_ToHashtable (ConvertFrom-ClaudeResult $obj))
        }
        return (_ToHashtable $obj)
    } catch { return $null }
}
