<#
integrate.ps1 - the ONLY path that touches the target branch.  (H-04, C-03, NM-02, #6, #7)

Second-review remediation:
  * H-04/#6 - PUBLICATION MEANS REMOTE-CONFIRMED. There is no optional push and no
    local-only PUBLISHED. If there is no reachable remote, integration fails
    closed. PUBLISHED is appended ONLY after: global integration lease, real
    fetch, expected-remote-SHA CAS, exact reviewed candidate, deterministic
    merge, post-integration verification, push, and remote ancestry proof.
  * #7 - the integrator publishes EXACTLY the candidate commit/tree that was
    frozen, checked and reviewed. It does NOT merge a newer target after review.
    If origin/<target> has moved off the expected SHA the candidate was built on,
    integration STOPS with REMOTE_DIVERGED and a rebuild/re-review is required.
  * NM-02 - every remote-CAS / ancestry / push failure appends a durable ledger
    transition (PUSH_FAILED / REMOTE_DIVERGED / INTEGRATION_FAILED). The ledger
    never sits in INTEGRATING because a function returned.

Deterministic process, no LLM.

Merge-local-only tests use Test-MergeCandidateLocally, a separate primitive that
NEVER transitions the ledger to PUBLISHED.

Third-review remediation:
  * H3-01 - there is NO caller scriptblock. Post-integration verification re-runs
    the DECLARATIVE frozen verification profile on the merged tree.
  * H3-02 - a recursive secret scan over the candidate worktree + every runtime
    artifact root runs BEFORE the push. A hit -> SECRET_LEAK_BLOCKED, no push,
    no PUBLISHED. The finally sweep in the pipeline stays as defence in depth.
  * Section 10 - $script:V2IntegrationTestFaults is a seam set ONLY by the
    disposable test harness (tests/integration-faults.ps1). It is never set by
    spine.ps1 or Invoke-SpineRun and there is no env var for it. It forces the
    real failure branches (after-CAS push reject, ancestry failure, tree
    mismatch) so each one has a deterministic regression.
#>

# test-only fault seam - $null in every production/normal path.
$script:V2IntegrationTestFaults = $null
function _fault { param([string]$Name) return ($script:V2IntegrationTestFaults -and $script:V2IntegrationTestFaults[$Name]) }

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'ledger.ps1')
. (Join-Path $PSScriptRoot 'attest.ps1')
. (Join-Path $PSScriptRoot 'lease.ps1')
. (Join-Path $PSScriptRoot 'verification.ps1')

# Build the candidate integration commit: merge the current target into the run
# branch, in the worktree. The candidate tree is what gets frozen/checked/reviewed.
# Returns @{ ok; candidateSha; expectedTargetSha; reason }
function New-IntegrationCandidate {
    param(
        [Parameter(Mandatory)][string]$RepoDir,
        [Parameter(Mandatory)][string]$WorktreeDir,
        [Parameter(Mandatory)][string]$Branch
    )
    $cfg = Get-V2Config
    $target = $cfg.target.branch
    $branchResult = Invoke-GitV2 -Dir $RepoDir -Arguments @('rev-parse','--abbrev-ref','HEAD') -LogLabel 'integrate-authority-branch'
    if ($branchResult.exitCode -ne 0) { return @{ ok = $false; reason = (Get-GitFailureSummaryV2 $branchResult 'inspect authority branch') } }
    $branchNow = $branchResult.stdout.Trim()
    if ($branchNow -ne $target) { return @{ ok = $false; reason = "authority checkout on '$branchNow' not '$target'" } }
    $expectedTargetSha = (Get-GitHeadV2 $RepoDir)

    Assert-SafeGitV2 @('merge', $target)
    $merge = Invoke-GitV2 -Dir $WorktreeDir -Arguments @('merge',$expectedTargetSha,'--no-edit','-m',"candidate: integrate $target@$($expectedTargetSha.Substring(0,10))") -LogLabel 'integrate-build-candidate'
    if ($merge.exitCode -ne 0) {
        [void](Invoke-GitV2 -Dir $WorktreeDir -Arguments @('merge','--abort') -LogLabel 'integrate-build-abort')
        return @{ ok = $false; reason = "conflict merging $target into the run branch: $(Get-GitFailureSummaryV2 $merge 'git merge')" }
    }
    $candidateSha = (Get-GitHeadV2 $WorktreeDir)
    return @{ ok = $true; candidateSha = $candidateSha; expectedTargetSha = $expectedTargetSha; reason = 'ok' }
}

# merge-local-only primitive for tests. NEVER touches the ledger / PUBLISHED.
function Test-MergeCandidateLocally {
    param([string]$RepoDir, [string]$WorktreeDir, [string]$Branch, [string]$CandidateSha)
    $cfg = Get-V2Config; $target = $cfg.target.branch
    $before = (Get-GitHeadV2 $RepoDir)
    Assert-SafeGitV2 @('merge','--no-ff',$Branch)
    $merge = Invoke-GitV2 -Dir $RepoDir -Arguments @('merge','--no-ff','-m',"LOCAL-ONLY test merge $CandidateSha",$Branch) -LogLabel 'local-test-merge'
    $ok = ($merge.exitCode -eq 0)
    if (-not $ok) { [void](Invoke-GitV2 -Dir $RepoDir -Arguments @('merge','--abort') -LogLabel 'local-test-abort') }
    return @{ ok = $ok; before = $before; after = (Get-GitHeadV2 $RepoDir) }
}

function Invoke-Integration {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][string]$RepoDir,
        [Parameter(Mandatory)][string]$WorktreeDir,
        [Parameter(Mandatory)][string]$Branch,
        [Parameter(Mandatory)][string]$BaseSha,           # expectedTargetSha the candidate was built on
        [Parameter(Mandatory)][string]$HeadSha,           # the immutable reviewed candidate commit
        [string[]]$SecretScanRoots = @()                  # extra roots for the pre-publish scan
    )
    $cfg = Get-V2Config
    $target = $cfg.target.branch
    $result = [ordered]@{ status = 'INTEGRATION_FAILED'; reason = ''; state = ''; targetBefore = ''; targetAfter = ''; mergeCommit = ''; pushed = $false }

    $lease = New-Lease -Namespace 'integration' -Key $target -TaskVersionId $TaskVersionId -RunId $RunId
    if (-not $lease.ok) {
        $result.reason = "integration lease for '$target' held by $($lease.heldBy.leaseId) - serial only"
        $result.status = 'BLOCKED'
        return $result
    }
    $beat = Start-LeaseHeartbeat -Namespace 'integration' -Key $target -LeaseId $lease.leaseId
    try {
        Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'integrate-start' -ToState 'INTEGRATING' -RunId $RunId | Out-Null

        # 1. authority checkout sane
        $branchResult = Invoke-GitV2 -Dir $RepoDir -Arguments @('rev-parse','--abbrev-ref','HEAD') -LogLabel 'publish-authority-branch'
        if ($branchResult.exitCode -ne 0) { return (_fail $TaskVersionId $RunId $result (Get-GitFailureSummaryV2 $branchResult 'inspect authority branch') 'INTEGRATION_FAILED') }
        $branchNow = $branchResult.stdout.Trim()
        if ($branchNow -ne $target) { return (_fail $TaskVersionId $RunId $result "authority checkout on '$branchNow' not '$target'" 'INTEGRATION_FAILED') }
        if (-not (Test-GitCleanV2 $RepoDir)) { return (_fail $TaskVersionId $RunId $result "authority tree dirty" 'INTEGRATION_FAILED') }

        $localTarget = (Get-GitHeadV2 $RepoDir)
        $result.targetBefore = $localTarget

        # 2. MUST have a remote. Real fetch + expected-SHA CAS. (#6, #7)
        $remoteList = Invoke-GitV2 -Dir $RepoDir -Arguments @('remote') -LogLabel 'publish-remotes'
        $hasRemote = ($remoteList.exitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($remoteList.stdout))
        if (-not $hasRemote) { return (_fail $TaskVersionId $RunId $result "no remote configured - publication requires a confirmed remote" 'INTEGRATION_FAILED') }
        $fetch = Invoke-GitV2 -Dir $RepoDir -Arguments @('fetch','origin','--prune','--quiet') -LogLabel 'publish-fetch-before'
        if ($fetch.exitCode -ne 0) { return (_fail $TaskVersionId $RunId $result (Get-GitFailureSummaryV2 $fetch 'git fetch origin') 'INTEGRATION_FAILED') }
        $expectedRemoteResult = Invoke-GitV2 -Dir $RepoDir -Arguments @('rev-parse',"origin/$target") -LogLabel 'publish-origin-before'
        if ($expectedRemoteResult.exitCode -ne 0) { return (_fail $TaskVersionId $RunId $result "origin/$target not found after fetch: $(Get-GitFailureSummaryV2 $expectedRemoteResult 'git rev-parse')" 'INTEGRATION_FAILED') }
        $expectedRemote = $expectedRemoteResult.stdout.Trim()
        if ($expectedRemote -ne $BaseSha) {
            return (_fail $TaskVersionId $RunId $result "origin/$target ($($expectedRemote.Substring(0,10))) has moved off the SHA the reviewed candidate was built on ($($BaseSha.Substring(0,10))) - rebuild + re-review required" 'REMOTE_DIVERGED')
        }
        if ($expectedRemote -ne $localTarget) {
            return (_fail $TaskVersionId $RunId $result "local $target ($($localTarget.Substring(0,10))) != origin/$target ($($expectedRemote.Substring(0,10)))" 'REMOTE_DIVERGED')
        }

        # 3. attestations fresh against the EXACT reviewed candidate (C-03)
        $att = Assert-IntegrationAttestations -TaskVersionId $TaskVersionId -RunId $RunId -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha
        if (-not $att.ok) { return (_fail $TaskVersionId $RunId $result "attestation gate: $($att.problems -join '; ')" 'INTEGRATION_FAILED') }

        # 4. the run branch must point EXACTLY at the reviewed candidate
        $branchHeadResult = Invoke-GitV2 -Dir $RepoDir -Arguments @('rev-parse',$Branch) -LogLabel 'publish-candidate-ref'
        $branchHead = $(if($branchHeadResult.exitCode -eq 0){$branchHeadResult.stdout.Trim()}else{''})
        if (-not $branchHead -or $branchHead -ne $HeadSha) {
            return (_fail $TaskVersionId $RunId $result "run branch $Branch ($branchHead) != reviewed candidate $HeadSha - branch moved after review" 'INTEGRATION_FAILED')
        }
        $candTree = (Get-GitTreeHash -Dir $WorktreeDir -Ref $HeadSha)

        # 5. post-integration verification = the DECLARATIVE frozen profile, re-run
        #    on the candidate tree (== future target tree), BEFORE the target
        #    branch is touched. No caller scriptblock (H3-01).
        $c = $null
        try { $c = Get-Contract $TaskVersionId } catch { return (_fail $TaskVersionId $RunId $result "cannot load frozen contract: $($_.Exception.Message)" 'INTEGRATION_FAILED') }
        $piv = Invoke-VerificationProfile -ProfileId $c.verificationProfile -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha
        if (-not $piv.pass) { return (_fail $TaskVersionId $RunId $result "post-integration verification profile failed: $(@($piv.checks | Where-Object { -not $_.pass } | ForEach-Object { $_.id }) -join ', ')" 'INTEGRATION_FAILED') }

        # 5b. H3-02: pre-publication recursive secret scan. CLEAN is mandatory
        #     before anything is pushed.
        $scanRoots = @($SecretScanRoots) + @(
            (Join-Path (Get-V2Dir) 'logs'), (Join-Path (Get-V2Dir) 'contracts'),
            (Join-Path (Get-V2Dir) 'attestations'), (Join-Path (Get-V2Dir) 'runs'))
        $treeScan = Test-GitTreeSecretsClean -RepoDir $WorktreeDir -Ref $HeadSha
        $artifactScan = Test-TreeSecretsClean -Roots $scanRoots
        $scan = [ordered]@{ clean=([bool]$treeScan.clean -and [bool]$artifactScan.clean); hits=@($treeScan.hits)+@($artifactScan.hits) }
        if (-not $scan.clean) {
            return (_fail $TaskVersionId $RunId $result "pre-publication secret scan found $($scan.hits.Count) hit(s): $((@($scan.hits) | Select-Object -First 5) -join ' ; ')" 'SECRET_LEAK_BLOCKED')
        }

        # 6. deterministic merge of the reviewed candidate into target.
        #    the candidate already contains target as a parent -> no new content.
        Assert-SafeGitV2 @('merge', '--no-ff', $Branch)
        $msg = "$($TaskVersionId.Substring(0,12)): integrated run $RunId (V2 spine)"
        $merge = Invoke-GitV2 -Dir $RepoDir -Arguments @('merge','--no-ff','-m',$msg,$HeadSha) -LogLabel 'publish-merge-candidate'
        if ($merge.exitCode -ne 0) {
            [void](Invoke-GitV2 -Dir $RepoDir -Arguments @('merge','--abort') -LogLabel 'publish-merge-abort')
            return (_fail $TaskVersionId $RunId $result "unexpected conflict merging the reviewed candidate into ${target}: $(Get-GitFailureSummaryV2 $merge 'git merge')" 'INTEGRATION_FAILED')
        }
        $mergeCommit = (Get-GitHeadV2 $RepoDir)
        $mergeTree = (Get-GitTreeHash -Dir $RepoDir -Ref $mergeCommit)
        if ($mergeTree -ne $candTree) {
            return (_fail $TaskVersionId $RunId $result "merge tree $mergeTree != reviewed candidate tree $candTree (content drift); local $target advanced but NOT pushed" 'INTEGRATION_FAILED')
        }
        $result.mergeCommit = $mergeCommit
        $result.targetAfter = $mergeCommit
        $result.state = 'INTEGRATED_LOCAL'

        # 7. push (mandatory) + remote ancestry proof (#6)
        Beat-Lease $beat
        Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'push-start' -ToState 'INTEGRATING' -RunId $RunId -Note 'PUSHING' | Out-Null
        Assert-SafeGitV2 @('push', 'origin', $target)
        $publishLogDir=Join-Path (Get-V2Dir) "runs\$RunId\integrator"
        New-Item -ItemType Directory -Force -Path $publishLogDir|Out-Null
        $pushProc=Invoke-GitV2 -Dir $RepoDir -Arguments @('push','origin',"HEAD:$target") -LogLabel "publish-$RunId" -TimeoutSec 300
        if (($pushProc.exitCode -ne 0) -or (_fault 'afterCasPushReject')) {
            return (_fail $TaskVersionId $RunId $result "git push origin $target rejected - target advanced locally but NOT published; branch preserved: $(Get-GitFailureSummaryV2 $pushProc 'git push')" 'PUSH_FAILED')
        }
        $fetchAfter = Invoke-GitV2 -Dir $RepoDir -Arguments @('fetch','origin','--quiet') -LogLabel 'publish-fetch-after'
        if ($fetchAfter.exitCode -ne 0) { return (_fail $TaskVersionId $RunId $result (Get-GitFailureSummaryV2 $fetchAfter 'post-push fetch') 'PUSH_FAILED') }
        $remoteAfterResult = Invoke-GitV2 -Dir $RepoDir -Arguments @('rev-parse',"origin/$target") -LogLabel 'publish-origin-after'
        if ($remoteAfterResult.exitCode -ne 0) { return (_fail $TaskVersionId $RunId $result "cannot read origin/$target after push" 'PUSH_FAILED') }
        $remoteAfter = $remoteAfterResult.stdout.Trim()
        $ancestry = Invoke-GitV2 -Dir $RepoDir -Arguments @('merge-base','--is-ancestor',$mergeCommit,$remoteAfter) -LogLabel 'publish-ancestry'
        if (($ancestry.exitCode -ne 0) -or (_fault 'ancestryFail')) {
            return (_fail $TaskVersionId $RunId $result "remote origin/$target does not contain the merge commit after push" 'PUSH_FAILED')
        }
        $remoteTree = (Get-GitTreeHash -Dir $RepoDir -Ref $remoteAfter)
        if (($remoteTree -ne $candTree) -or (_fault 'treeMismatch')) {
            return (_fail $TaskVersionId $RunId $result "remote tree after push != reviewed candidate tree" 'REMOTE_DIVERGED')
        }
        $result.pushed = $true

        Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'published' -ToState 'PUBLISHED' -RunId $RunId `
            -Evidence @{ headSHA = $mergeCommit; remoteSHA = $remoteAfter; pushed = $true } | Out-Null
        New-Attestation -Kind integration -TaskVersionId $TaskVersionId -RunId $RunId `
            -Bindings (Get-AttestationBindings -TaskVersionId $TaskVersionId -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha) `
            -Result 'PASS' -Payload @{ mergeCommit = $mergeCommit; remoteSHA = $remoteAfter; pushed = $true } `
            -ProducerMeta @{ integrator = 'v2-deterministic'; host = $env:COMPUTERNAME } | Out-Null

        $result.status = 'PUBLISHED'
        $result.reason = 'ok'
        return $result
    }
    finally {
        Stop-LeaseHeartbeat $beat
        [void](Remove-Lease -Namespace 'integration' -Key $target -LeaseId $lease.leaseId)
    }
}

function _fail {
    param($TaskVersionId, $RunId, $result, [string]$Reason, [string]$LedgerState)
    $result.reason = $Reason
    $result.status = $(switch ($LedgerState) {
        'REMOTE_DIVERGED'    { 'REMOTE_DIVERGED' }
        'PUSH_FAILED'        { 'PUSH_FAILED' }
        'SECRET_LEAK_BLOCKED' { 'SECRET_LEAK_BLOCKED' }
        default              { 'INTEGRATION_FAILED' }
    })
    try { Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'integrate-failed' -ToState $LedgerState -RunId $RunId -Note $Reason | Out-Null } catch {
        Write-V2Log "integrate: could not record $LedgerState ledger event: $($_.Exception.Message)" 'ERROR'
    }
    Write-V2Log "integrate: $($TaskVersionId.Substring(0,12)) -> $($result.status): $Reason" 'WARN'
    return $result
}
