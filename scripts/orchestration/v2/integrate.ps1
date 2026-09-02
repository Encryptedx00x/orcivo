<#
integrate.ps1 - the ONLY path that touches the target branch.  (H-04, C-03, part of H-10)

Fixes H-04: V1 locks were per-runId; there was no target/main mutex, no fetch/CAS
against origin, and a failed push was a warning while the run was still MERGED.

Fixes C-03 (integration half): the integrator re-verifies every attestation
binding against the exact commit right before integrating, and integrates that
immutable commit - never `git add -A`.

State machine for the target-facing side:
   APPROVED -> INTEGRATING -> (INTEGRATED_LOCAL) -> PUSHING -> PUBLISHED
                           \-> FAILED (branch preserved, target untouched)
   Push failure => PUSH_FAILED / BLOCKED, never PUBLISHED.

This is a DETERMINISTIC process (no LLM). In the full design it runs under a
minimal-credential integrator identity (C-06, deferred).
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'ledger.ps1')
. (Join-Path $PSScriptRoot 'attest.ps1')
. (Join-Path $PSScriptRoot 'lease.ps1')

function Invoke-Integration {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][string]$RepoDir,       # the authority checkout (on target)
        [Parameter(Mandatory)][string]$WorktreeDir,   # the run's worktree
        [Parameter(Mandatory)][string]$Branch,        # the run branch
        [Parameter(Mandatory)][string]$BaseSha,
        [Parameter(Mandatory)][string]$HeadSha,       # the immutable validated commit
        [scriptblock]$PostIntegrationCheck = $null,   # returns $true on PASS
        [switch]$Push
    )
    $cfg = Get-V2Config
    $target = $cfg.target.branch
    $result = [ordered]@{ status = 'FAILED'; reason = ''; state = ''; targetBefore = ''; targetAfter = ''; mergeCommit = ''; pushed = $false }

    # global serial integration lease (H-04)
    $lease = New-Lease -Namespace 'integration' -Key $target -TaskVersionId $TaskVersionId -RunId $RunId
    if (-not $lease.ok) {
        $result.reason = "integration lease for '$target' held by $($lease.heldBy.leaseId) (pid $($lease.heldBy.holder.pid)) - serial only"
        $result.status = 'BLOCKED'
        return $result
    }

    try {
        Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'integrate-start' -ToState 'INTEGRATING' -RunId $RunId | Out-Null

        # 1. authority checkout sane
        $branchNow = (& git -C $RepoDir rev-parse --abbrev-ref HEAD).Trim()
        if ($branchNow -ne $target) { $result.reason = "authority checkout on '$branchNow' not '$target'"; return (_fail $TaskVersionId $RunId $result) }
        if (-not (Test-GitCleanV2 $RepoDir)) { $result.reason = "authority tree dirty"; return (_fail $TaskVersionId $RunId $result) }

        $localTarget = (Get-GitHeadV2 $RepoDir)
        $result.targetBefore = $localTarget

        # 2. fetch + remote CAS (H-04)
        $hasRemote = [bool](& git -C $RepoDir remote)
        $expectedRemote = $null
        if ($hasRemote) {
            & git -C $RepoDir fetch origin --quiet 2>&1 | Out-Null
            $expectedRemote = (& git -C $RepoDir rev-parse "origin/$target" 2>$null)
            if ($expectedRemote) {
                $expectedRemote = $expectedRemote.Trim()
                if ($expectedRemote -ne $localTarget) {
                    $result.reason = "remote origin/$target ($($expectedRemote.Substring(0,10))) is ahead of local ($($localTarget.Substring(0,10))) - re-sync before integrating"
                    return (_fail $TaskVersionId $RunId $result)
                }
            }
        }

        # 3. attestations fresh against the EXACT commit (C-03)
        $att = Assert-IntegrationAttestations -TaskVersionId $TaskVersionId -RunId $RunId -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha
        if (-not $att.ok) { $result.reason = "attestation gate: $($att.problems -join '; ')"; return (_fail $TaskVersionId $RunId $result) }

        # 4. the run branch must actually point at the validated commit
        $branchHead = (& git -C $RepoDir rev-parse $Branch 2>$null)
        if (-not $branchHead -or $branchHead.Trim() -ne $HeadSha) {
            $result.reason = "run branch $Branch ($($branchHead)) != validated commit $HeadSha - branch moved after review"
            return (_fail $TaskVersionId $RunId $result)
        }

        # 5. integrate target INTO the branch first (in the worktree), re-check, then merge --no-ff
        Assert-SafeGitV2 @('merge', $target)
        $mi = (& git -C $WorktreeDir merge $target --no-edit 2>&1) -join "`n"
        if ($LASTEXITCODE -ne 0) {
            & git -C $WorktreeDir merge --abort 2>$null | Out-Null
            $result.reason = "conflict integrating $target into branch"; $result.status = 'NEEDS_REVIEW'
            return (_fail $TaskVersionId $RunId $result 'NEEDS_REVIEW')
        }
        $integratedCommit = (Get-GitHeadV2 $WorktreeDir)

        if ($PostIntegrationCheck) {
            $ok = & $PostIntegrationCheck $WorktreeDir
            if (-not $ok) { $result.reason = "post-integration check failed"; $result.status = 'NEEDS_REVIEW'; return (_fail $TaskVersionId $RunId $result 'NEEDS_REVIEW') }
        }

        # 6. target must not have moved under us
        if ((Get-GitHeadV2 $RepoDir) -ne $localTarget) {
            $result.reason = "$target moved during integration"; $result.status = 'NEEDS_REVIEW'
            return (_fail $TaskVersionId $RunId $result 'NEEDS_REVIEW')
        }

        # 7. merge the branch into target (fast-forward-free, deterministic)
        Assert-SafeGitV2 @('merge', '--no-ff', $Branch)
        $msg = "$($TaskVersionId.Substring(0,12)): integrated run $RunId (V2 spine)"
        & git -C $RepoDir merge --no-ff -m $msg $Branch 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            & git -C $RepoDir merge --abort 2>$null | Out-Null
            $result.reason = "unexpected conflict merging branch into $target"; $result.status = 'NEEDS_REVIEW'
            return (_fail $TaskVersionId $RunId $result 'NEEDS_REVIEW')
        }
        $mergeCommit = (Get-GitHeadV2 $RepoDir)
        $result.mergeCommit = $mergeCommit
        $result.targetAfter = $mergeCommit
        $result.state = 'INTEGRATED_LOCAL'

        # 8. push (normal only) + verify remote ancestry (H-04)
        if ($Push -and $hasRemote) {
            Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'push-start' -ToState 'INTEGRATING' -RunId $RunId -Note 'PUSHING' | Out-Null
            Assert-SafeGitV2 @('push', 'origin', $target)
            & git -C $RepoDir push origin $target 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                $result.status = 'PUSH_FAILED'
                $result.reason = "git push origin $target failed - target advanced locally but NOT published; branch preserved"
                Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'push-failed' -ToState 'FAILED' -RunId $RunId -Note 'PUSH_FAILED' | Out-Null
                return $result
            }
            $remoteAfter = (& git -C $RepoDir rev-parse "origin/$target").Trim()
            & git -C $RepoDir merge-base --is-ancestor $mergeCommit $remoteAfter 2>$null
            if ($LASTEXITCODE -ne 0) {
                $result.status = 'PUSH_FAILED'
                $result.reason = "remote origin/$target does not contain the merge commit after push"
                return $result
            }
            $result.pushed = $true
        }

        Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'published' -ToState 'PUBLISHED' -RunId $RunId -Evidence @{ headSHA = $mergeCommit; pushed = $result.pushed } | Out-Null
        New-Attestation -Kind integration -TaskVersionId $TaskVersionId -RunId $RunId `
            -Bindings (Get-AttestationBindings -TaskVersionId $TaskVersionId -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha) `
            -Result 'PASS' -Payload @{ mergeCommit = $mergeCommit; pushed = $result.pushed } | Out-Null

        $result.status = 'PUBLISHED'
        $result.reason = 'ok'
        return $result
    }
    finally {
        [void](Remove-Lease -Namespace 'integration' -Key $target -LeaseId $lease.leaseId)
    }
}

function _fail {
    param($TaskVersionId, $RunId, $result, [string]$LedgerState = 'FAILED')
    try { Add-LedgerEvent -TaskVersionId $TaskVersionId -Event 'integrate-failed' -ToState $LedgerState -RunId $RunId -Note $result.reason | Out-Null } catch { }
    if (-not $result.status -or $result.status -eq 'FAILED') { $result.status = $(if ($LedgerState -eq 'NEEDS_REVIEW') { 'NEEDS_REVIEW' } else { 'FAILED' }) }
    Write-V2Log "integrate: $($TaskVersionId.Substring(0,12)) -> $($result.status): $($result.reason)" 'WARN'
    return $result
}
