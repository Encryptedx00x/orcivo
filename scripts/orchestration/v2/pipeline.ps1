<#
pipeline.ps1 - composes the V2 spine primitives into one synthetic run.

HARD RULE: V2 does NOT execute real GSD tasks yet (remediation brief constraint 2).
Invoke-SpineRun calls Assert-NotRealRepo and refuses to run unless
$env:ORCH_V2_TESTING=1 on a throwaway repo. The only executor is the deterministic
fake agent (tests/fake-agent-v2.ps1). Real CLI wiring, OS isolation (C-06) and
process-tree kill (C-05) are explicitly deferred to the next session.

Flow (ledger states in parens):
  preflight -> lease(taskversion,workspace) -> (READY->DISPATCHED->RUNNING)
   -> fake execute -> classify(control channel) -> commit
   -> (RUNNING->CHECKING) contract compliance + deterministic checks + check attestation
   -> (CHECKING->REVIEWING) fenced review envelope + fail-closed parse + review attestation
   -> (REVIEWING->APPROVED) -> integrate.ps1 (H-04/C-03) -> (PUBLISHED)
   -> artifact secret scan (H-11)
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'ledger.ps1')
. (Join-Path $PSScriptRoot 'contract.ps1')
. (Join-Path $PSScriptRoot 'attest.ps1')
. (Join-Path $PSScriptRoot 'lease.ps1')
. (Join-Path $PSScriptRoot 'classify.ps1')
. (Join-Path $PSScriptRoot 'review-envelope.ps1')
. (Join-Path $PSScriptRoot 'preflight.ps1')
. (Join-Path $PSScriptRoot 'integrate.ps1')

$script:FakeAgentV2 = Join-Path $PSScriptRoot 'tests\fake-agent-v2.ps1'

function Get-RunDirV2 { param([string]$RunId) return (Join-Path (Get-V2Dir) "runs\$RunId") }

function _invokeFake {
    param([string]$Mode, [string]$Worktree, [string]$PromptFile, [string]$RunDir, [string]$Stamp)
    $ps = Resolve-Executable 'powershell'
    $out = Join-Path $RunDir "logs\$Stamp.stdout.log"
    $err = Join-Path $RunDir "logs\$Stamp.stderr.log"
    $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File', $script:FakeAgentV2, '-Mode', $Mode, '-Worktree', $Worktree)
    $r = Invoke-NativeCaptured -Exe $ps -Arguments $args -WorkingDirectory $Worktree -StdinFile $PromptFile -StdoutLog $out -StderrLog $err -TimeoutSec 120
    return $r
}

function Invoke-SpineRun {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$RepoDir,
        [scriptblock]$CheckBlock = $null,          # returns $true on PASS; default: always PASS
        [string]$NoChangeEvidenceFile = '',
        [switch]$Push
    )
    Assert-NotRealRepo 'run the spine pipeline'
    if ($env:ORCH_V2_TESTING -ne '1') { throw "v2: Invoke-SpineRun requires ORCH_V2_TESTING=1 (deterministic harness only)" }

    $cfg = Get-V2Config
    $res = [ordered]@{ taskVersionId = $TaskVersionId; status = 'ABORTED'; stage = 'preflight'; reason = ''; runId = $null; ledgerState = $null; details = @{} }

    # 1. preflight (H-07)
    $pf = Test-Preflight -TaskVersionId $TaskVersionId -RepoDir $RepoDir
    if (-not $pf.ok) { $res.reason = "preflight: $($pf.failures -join ' | ')"; return $res }

    $contract = Get-Contract $TaskVersionId
    $runId = New-RunId
    $res.runId = $runId
    $runDir = Get-RunDirV2 $runId
    New-Item -ItemType Directory -Force -Path (Join-Path $runDir 'logs') | Out-Null

    # 2. leases (H-05)
    $tvLease = New-Lease -Namespace 'taskversion' -Key $TaskVersionId -TaskVersionId $TaskVersionId -RunId $runId
    if (-not $tvLease.ok) { $res.reason = "taskversion lease held ($($tvLease.heldBy.leaseId))"; return $res }

    try {
        $wsLease = New-Lease -Namespace 'workspace' -Key $runId -TaskVersionId $TaskVersionId -RunId $runId
        if (-not $wsLease.ok) { $res.reason = 'workspace lease held'; return $res }

        try {
            # 3. dispatch (ledger: READY-ish -> DISPATCHED -> RUNNING)
            $st = Get-LedgerState $TaskVersionId
            if ($st.state -eq 'DISCOVERED') { Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'ready' -ToState 'READY' | Out-Null }
            $attemptId = New-AttemptId
            Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'dispatch' -ToState 'DISPATCHED' -RunId $runId -AttemptId $attemptId | Out-Null

            $base = (Get-GitHeadV2 $RepoDir)
            $branch = "orch-v2/$runId"
            $wt = Join-Path (Get-V2Dir) "worktrees\$runId"
            Assert-SafeGitV2 @('worktree','add','-b',$branch,$wt,$base)
            & git -C $RepoDir worktree add -b $branch $wt $base --quiet 2>&1 | Out-Null

            Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'running' -ToState 'RUNNING' -RunId $runId | Out-Null
            $res.stage = 'execute'

            # 4. fake execute
            $promptFile = Join-Path $runDir 'prompt.execute.txt'
            Write-TextFileV2 $promptFile ("EXECUTE`n" + $contract.specText)
            $stamp = 'exec-' + (Get-Date -Format 'HHmmss')
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
                $to = $(if ($class -in @('PROVIDER_AUTH','PROVIDER_QUOTA','PROVIDER_RATE_LIMIT','PROVIDER_TRANSIENT')) { 'FAILED' } else { 'FAILED' })
                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'execute-failed' -ToState $to -RunId $runId -Note $class | Out-Null
                $res.status = 'FAILED'; $res.reason = "execute class $class"; $res.ledgerState = $to; return $res
            }

            # 6. immutable commit of exactly what the agent produced
            & git -C $wt add -A 2>&1 | Out-Null
            $headSha = $base
            if (@(& git -C $wt status --porcelain=v1).Count -gt 0) {
                & git -C $wt -c user.name='orch-v2-executor' -c user.email='executor@v2.local' commit -m "$($TaskVersionId.Substring(0,12)): run $runId" --quiet 2>&1 | Out-Null
                $headSha = (Get-GitHeadV2 $wt)
            }
            $res.details.headSha = $headSha

            # 7. contract compliance (H-06 / M-01 / M-03)
            Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'checking' -ToState 'CHECKING' -RunId $runId | Out-Null
            $res.stage = 'contract'
            $cc = Test-ContractCompliance -TaskVersionId $TaskVersionId -WorktreeDir $wt -BaseSha $base -HeadSha $headSha -NoChangeEvidenceFile $NoChangeEvidenceFile
            $res.details.contract = $cc
            if (-not $cc.compliant) {
                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'policy-block' -ToState 'FAILED' -RunId $runId -Note ($cc.violations -join '; ') | Out-Null
                $res.status = 'POLICY_BLOCK'; $res.reason = ($cc.violations -join '; '); $res.ledgerState = 'FAILED'; return $res
            }
            if ($cc.verdict -eq 'NO_CHANGE_JUSTIFIED') {
                # a justified no-op still needs review of the justification, but never integrates a change
                $res.details.noChange = $true
            }

            # 8. deterministic checks + check attestation (C-03)
            $res.stage = 'check'
            $checkPass = $true
            if ($CheckBlock) { $checkPass = [bool](& $CheckBlock $wt) }
            $bindings = Get-AttestationBindings -TaskVersionId $TaskVersionId -WorktreeDir $wt -BaseSha $base -HeadSha $headSha
            New-Attestation -Kind check -TaskVersionId $TaskVersionId -RunId $runId -Bindings $bindings `
                -Result $(if ($checkPass) { 'PASS' } else { 'FAIL' }) `
                -ProducerMeta @{ profile = $contract.verificationProfile } | Out-Null
            if (-not $checkPass) {
                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'check-failed' -ToState 'FAILED' -RunId $runId | Out-Null
                $res.status = 'CHECK_FAILED'; $res.reason = 'deterministic check failed'; $res.ledgerState = 'FAILED'; return $res
            }

            # 9. review (C-02 / H-03)
            Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'reviewing' -ToState 'REVIEWING' -RunId $runId | Out-Null
            $res.stage = 'review'
            $diff = (& git -C $wt diff --no-color "$base..$headSha") -join "`n"
            $changed = @(Get-GitChangedFiles -Dir $wt -BaseSha $base -HeadSha $headSha)
            $rprompt = Build-ReviewPrompt -TaskVersionId $TaskVersionId -Head $headSha -TreeHash $bindings.treeHash `
                -DiffHash $bindings.diffHash -SpecHash $contract.specHash -AcceptanceText $contract.acceptanceText `
                -SpecText $contract.specText -Diff $diff -ChangedFiles $changed -CheckSummary "verdict=PASS profile=$($contract.verificationProfile)"
            $rpFile = Join-Path $runDir 'prompt.review.txt'
            Write-TextFileV2 $rpFile $rprompt
            $rstamp = 'review-' + (Get-Date -Format 'HHmmss')
            $rv = _invokeFake -Mode 'review' -Worktree $wt -PromptFile $rpFile -RunDir $runDir -Stamp $rstamp

            $parsed = Parse-ReviewEnvelope -Stdout $rv.stdout -Expected @{
                taskVersion = $TaskVersionId; head = $headSha; treeHash = $bindings.treeHash
                diffHash = $bindings.diffHash; changedFiles = $changed
            }
            $res.details.review = @{ verdict = $parsed.verdict; reason = $parsed.reason; problems = $parsed.problems }
            $reviewerMeta = @{ provider = 'codex'; promptTemplateVersion = $cfg.review.promptTemplateVersion; schemaVersion = $cfg.review.schemaVersion }
            if ($parsed.envelope) { $reviewerMeta.model = "$($parsed.envelope.reviewerMeta.model)"; $reviewerMeta.effort = "$($parsed.envelope.reviewerMeta.effort)"; $reviewerMeta.toolPolicy = "$($parsed.envelope.reviewerMeta.toolPolicy)" }
            New-Attestation -Kind review -TaskVersionId $TaskVersionId -RunId $runId -Bindings $bindings `
                -Result $parsed.verdict -Payload @{ problems = @($parsed.problems); reason = $parsed.reason } -ProducerMeta $reviewerMeta | Out-Null

            if ($parsed.verdict -ne 'APPROVE') {
                $to = $(if ($parsed.verdict -eq 'REQUEST_CHANGES') { 'RUNNING' } else { 'WAITING_HUMAN' })
                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'review-not-approved' -ToState $to -RunId $runId -Note "$($parsed.verdict): $($parsed.reason)" | Out-Null
                $res.status = $parsed.verdict; $res.reason = $parsed.reason; $res.ledgerState = $to
                return $res
            }

            Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'approved' -ToState 'APPROVED' -RunId $runId | Out-Null

            if ($res.details.noChange) {
                $res.status = 'NO_CHANGE_JUSTIFIED'; $res.reason = 'approved no-op; nothing to integrate'; $res.ledgerState = 'APPROVED'
                # a justified no-op is complete but not PUBLISHED - it changed nothing
                return $res
            }

            # 10. integration (H-04 / C-03)
            $res.stage = 'integrate'
            $ir = Invoke-Integration -TaskVersionId $TaskVersionId -RunId $runId -RepoDir $RepoDir -WorktreeDir $wt `
                -Branch $branch -BaseSha $base -HeadSha $headSha -Push:$Push `
                -PostIntegrationCheck $CheckBlock
            $res.details.integration = $ir
            $res.status = $ir.status
            $res.reason = $ir.reason
            $res.ledgerState = (Get-LedgerState $TaskVersionId).state

            # 11. artifact secret scan (H-11)
            $scan = Test-ArtifactsClean -Root $runDir
            $res.details.secretScan = $scan
            if (-not $scan.clean) {
                Write-V2Log "pipeline: SECRET LEAK in run artifacts: $($scan.hits -join '; ')" 'ERROR'
                $res.status = 'SECRET_LEAK'
            }
            return $res
        }
        finally { [void](Remove-Lease -Namespace 'workspace' -Key $runId -LeaseId $wsLease.leaseId) }
    }
    finally { [void](Remove-Lease -Namespace 'taskversion' -Key $TaskVersionId -LeaseId $tvLease.leaseId) }
}

function Write-TextFileV2 {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Content, (New-Utf8NoBom))
}

# the fake agent drops a control-channel file; the real CLIs' --json output will
# be normalized here in the next session.
function _readControlChannel {
    param([string]$Worktree)
    $f = Join-Path $Worktree '.orch-v2-control.json'
    if (-not (Test-Path $f)) { return $null }
    try {
        $obj = Get-Content -Raw -LiteralPath $f | ConvertFrom-Json
        Remove-Item -LiteralPath $f -Force -ErrorAction SilentlyContinue
        return (_ToHashtable $obj)
    } catch { return $null }
}
