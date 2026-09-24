<# DTA-01.. disjoint-target-advance recovery regression suite.
Covers: Get-DispatcherDisjointTargetAdvanceRecoveryProof / Recover-DispatcherDisjointTargetAdvance
(scripts/orchestration/v2/dispatcher.ps1) against a disposable fixture repo. Never touches the
real authority repo or the real PB1 lineage. #>
param([string[]]$Only=@())
$ErrorActionPreference='Stop'
$V2=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$Repo=[System.IO.Path]::GetFullPath((Join-Path $V2 '..\..\..'))
$Root=Join-Path ([System.IO.Path]::GetTempPath()) ("orcivo-dta-suite-"+[guid]::NewGuid().ToString('N'))
$Fixture=Join-Path $Root 'repo'
$results=New-Object System.Collections.Generic.List[object]

function Ok([string]$Id,[string]$Detail){$results.Add([ordered]@{id=$Id;status='PASS';detail=$Detail})}
function Fail([string]$Id,[string]$Detail){$results.Add([ordered]@{id=$Id;status='FAIL';detail=$Detail})}
function Check([string]$Id,[scriptblock]$Body){
    if($Only.Count -and $Id -notin $Only){return}
    $hadRunnerProbe=Test-Path variable:script:DispatcherRecoveryRunnerProbe
    $priorRunnerProbe=$(if($hadRunnerProbe){$script:DispatcherRecoveryRunnerProbe}else{$null})
    $script:DispatcherRecoveryRunnerProbe=$false
    try{& $Body;Ok $Id 'ok'}catch{Fail $Id $_.Exception.Message}
    finally{
        if($hadRunnerProbe){$script:DispatcherRecoveryRunnerProbe=$priorRunnerProbe}
        else{Remove-Variable -Scope Script -Name DispatcherRecoveryRunnerProbe -ErrorAction SilentlyContinue}
    }
}
function Assert-True($Value,[string]$Message){if(-not $Value){throw $Message}}
function Assert-Throws([scriptblock]$Body,[string]$Message){
    try{& $Body;throw $Message}catch{if($_.Exception.Message -eq $Message){throw $Message};return}
}
function Write-Utf8([string]$Path,[string]$Text){$d=Split-Path -Parent $Path;if($d){New-Item -ItemType Directory -Force -Path $d|Out-Null};[IO.File]::WriteAllText($Path,$Text,(New-Object Text.UTF8Encoding($false)))}
function Task([string]$Id,[string[]]$Scope){return [ordered]@{taskId=$Id;title="task $Id";type='TEST';description="implement $Id";acceptance="AC1: $Id complete";dependencies=@();scope=@($Scope);risk='B';ownerGate='none';blockedByGates=@('G1');candidateConstraints=[ordered]@{};verificationProfile='B';phaseGate='P1';status='SCHEDULED'}}
function Source([object[]]$Tasks){return [ordered]@{schemaVersion='orcivo.dispatcher-test/1';batch='DTA';state='OWNER_APPROVED';approvedBy='test';approvedAt='2026-09-23';gates=[ordered]@{G1=[ordered]@{kind='TEST';state='PASS'}};phaseOrder=@('P1');tasks=@($Tasks)}}

New-Item -ItemType Directory -Force -Path (Join-Path $Fixture '.orchestration\v2\schemas')|Out-Null
Copy-Item (Join-Path $Repo '.orchestration\v2\config.v2.json') (Join-Path $Fixture '.orchestration\v2\config.v2.json')
Copy-Item (Join-Path $Repo '.orchestration\v2\schemas\*.json') (Join-Path $Fixture '.orchestration\v2\schemas')
Write-Utf8 (Join-Path $Fixture '.gitignore') ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n.orchestration/v2/schemas/*`n!.orchestration/v2/schemas/*.json`n"
Write-Utf8 (Join-Path $Fixture 'apps\backend\src\work-order\README.md') "work-order fixture`n"
& git init -b main --quiet $Fixture
& git -C $Fixture add .
& git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m init --quiet
$OriginBare=Join-Path $Root 'origin.git'
& git init --bare -b main --quiet $OriginBare
& git -C $Fixture remote add origin $OriginBare
& git -C $Fixture push --quiet -u origin main

# fixture-local counter so every Check gets an independent taskVersionId/run
$script:DtaSeq=0
$script:DtaSalt=[guid]::NewGuid().ToString('N')

function New-DtaFixture([string]$Id,[string[]]$Scope=@('apps/backend/src/work-order'),[switch]$SkipTargetAdvance,[string]$AdvancePath='.orchestration/v2/schemas/dta-advance.json',[switch]$SecretFalsePositiveHold) {
    $script:DtaSeq++
    $task=Task ("DTA-"+$Id) $Scope
    $sourcePath=Join-Path $Root ("dta-"+$Id+"-"+$script:DtaSeq+".tasks.json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
    $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0]
    $contract=New-DispatcherContract -Task $task -TaskSource $source

    $base=(& git -C $Fixture rev-parse HEAD).Trim()
    $runId='run-dta-'+(New-StringHash ($script:DtaSalt+'|'+$Id+'|'+$script:DtaSeq+'|run')).Substring(7,16)
    $workspaceId='run-'+(New-StringHash ($script:DtaSalt+'|'+$Id+'|'+$script:DtaSeq+'|workspace')).Substring(7,16)
    $ws=New-DispatcherWorkspace -RunId $runId -WorkspaceId $workspaceId -BaseSha $base -SourceRepo $Fixture

    $failureState='INTEGRATION_FAILED';$failureReason='authority tree dirty'
    if($SecretFalsePositiveHold){
        $nativeLog=Join-Path (Join-Path (Join-Path (Get-V2Dir) 'logs') 'native') 'dta-false-positive.stdout.log'
        Write-Utf8 $nativeLog "diff --git a/actions.ts b/actions.ts`n--- a/actions.ts`n+++ b/actions.ts`n@@ -1 +1,2 @@`n+const headers = { Authorization: ``Bearer `${token}`` }`n"
        $failureState='SECRET_LEAK_BLOCKED';$failureReason='pre-publication secret scan found 1 hit(s): \native\dta-false-positive.stdout.log :: /(?i)\bauthorization\b[ \t]*[:=][ \t]*\S+/'
    }

    Write-Utf8 (Join-Path $ws.workspace 'apps\backend\src\work-order\feature.txt') "candidate feature $Id $script:DtaSeq`n"
    & git -C $ws.workspace add .
    & git -C $ws.workspace -c user.name=rd -c user.email=rd@local commit -m 'candidate' --quiet
    $oldHead=(& git -C $ws.workspace rev-parse HEAD).Trim()

    $oldBindings=Get-AttestationBindings -TaskVersionId $contract.taskVersionId -WorktreeDir $ws.workspace -BaseSha $base -HeadSha $oldHead
    New-Attestation -Kind check -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$oldBindings) -Result PASS|Out-Null
    $review=New-Attestation -Kind review -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$oldBindings) -Result APPROVE -ProducerMeta @{provider='glm';invocationId=('att-'+[guid]::NewGuid().ToString('N'))}

    Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null
    Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase CHECKING
    Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase REVIEWING
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event approved -ToState APPROVED -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event integrate-start -ToState INTEGRATING -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event integrate-failed -ToState $failureState -RunId $runId -Note $failureReason|Out-Null

    $currentTarget=$base
    if(-not $SkipTargetAdvance){
        Write-Utf8 (Join-Path $Fixture $AdvancePath) "{`"marker`":`"$Id-$script:DtaSeq`"}`n"
        & git -C $Fixture add .
        & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'target advance (disjoint)' --quiet
        $currentTarget=(& git -C $Fixture rev-parse HEAD).Trim()
        & git -C $Fixture push --quiet origin main
    }

    $state=[ordered]@{
        schemaVersion='orcivo.orchestration.v2.dispatch-state/1';taskId=$task.taskId;taskVersionId=$contract.taskVersionId
        task=$task;taskSource=$source.path;taskSourceHash=$source.hash;runId=$runId
        workspace=$ws.workspace;branch=$ws.branch;baseSha=$base
        status=$failureState;stage='INTEGRATE';reason=$failureReason
        cycle=0;attempt=1;implementationComplete=$true;requiresCorrection=$false
        implementationCommit=$oldHead;candidateBase=$base;candidateHead=$oldHead
        candidateTree=$oldBindings.treeHash;diffHash=$oldBindings.diffHash
        reviewVerdict='APPROVE';reviewInvocationId=$review.producer.invocationId;reviewAttestationId=$review.attestationId
        verification=[ordered]@{pass=$true};secretScan=[ordered]@{clean=$true}
        provider='claude';profile='REASONING';failovers=0;rollovers=0;unavailableProviders=@()
        providerHistory=@();importantArtifacts=@();findings=@();decisions=@()
        logicalProjectId='fixture'
        integration=[ordered]@{status=$failureState;reason=$failureReason;state='';targetBefore=$(if($SecretFalsePositiveHold){$base}else{''});targetAfter='';mergeCommit='';pushed=$false}
    }
    Write-DispatcherState $state|Out-Null
    return [ordered]@{state=$state;task=$task;source=$source;contract=$contract;workspace=$ws.workspace;branch=$ws.branch;runId=$runId;oldBase=$base;oldHead=$oldHead;currentTarget=$currentTarget;review=$review}
}

try{
    Push-Location $Fixture
    try{
        . (Join-Path $V2 'dispatcher.ps1')

        Check 'DTA-01: disjoint orchestration-only advance is eligible' {
            $f=New-DtaFixture 'A01'
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True $p.eligible "expected eligible, got: $($p.reason)"
            Assert-True ($p.oldBase -eq $f.oldBase -and $p.currentTarget -eq $f.currentTarget) 'proof did not bind the exact old base / current target'
            Assert-True (-not $p.overlap.Count) 'disjoint advance should have no overlap'
        }

        Check 'DTA-02: authority tree dirty is rejected' {
            $f=New-DtaFixture 'A02'
            Write-Utf8 (Join-Path $Fixture 'stray-untracked.txt') 'oops'
            try{
                $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
                Assert-True (-not $p.eligible -and $p.reason -match 'dirty') "expected authority-dirty denial, got eligible=$($p.eligible) reason=$($p.reason)"
            }finally{Remove-Item -LiteralPath (Join-Path $Fixture 'stray-untracked.txt') -Force -ErrorAction SilentlyContinue}
        }

        Check 'DTA-03: pushed=true integration result is rejected' {
            $f=New-DtaFixture 'A03'
            $f.state.integration.pushed=$true
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible -and $p.reason -match 'no-mutation') "expected pushed=true denial, got eligible=$($p.eligible) reason=$($p.reason)"
        }

        Check 'DTA-04: nonempty mergeCommit is rejected' {
            $f=New-DtaFixture 'A04'
            $f.state.integration.mergeCommit='deadbeef'
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible) 'nonempty mergeCommit must be rejected'
        }

        Check 'DTA-05: wrong ledger tail (unexpected extra event) is rejected' {
            $f=New-DtaFixture 'A05'
            Add-LedgerEvent -TaskVersionId $f.contract.taskVersionId -Event 'unexpected-retry' -ToState READY -RunId $f.runId|Out-Null
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible -and $p.reason -match 'prefix') "expected ledger-prefix denial, got eligible=$($p.eligible) reason=$($p.reason)"
        }

        Check 'DTA-06: candidate workspace drift is rejected' {
            $f=New-DtaFixture 'A06'
            Write-Utf8 (Join-Path $f.workspace 'apps\backend\src\work-order\drift.txt') 'drift'
            & git -C $f.workspace add .
            & git -C $f.workspace -c user.name=rd -c user.email=rd@local commit -m drift --quiet
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible -and $p.reason -match 'HEAD drift') "expected workspace HEAD drift denial, got eligible=$($p.eligible) reason=$($p.reason)"
        }

        Check 'DTA-07: tampered review attestation is rejected' {
            $f=New-DtaFixture 'A07'
            $reviewPath=@(Get-ChildItem (Join-Path (Get-V2Dir) "attestations\$($f.contract.taskVersionId)") -Filter 'review-*.json')[0].FullName
            $raw=Read-V2Json $reviewPath;$raw.result='REQUEST_CHANGES';Write-V2JsonCanonical $reviewPath $raw
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible) 'tampered review attestation must be rejected'
        }

        Check 'DTA-08: current target not descended from old base is rejected' {
            # simulate on a throwaway "authority" repo of its own so the shared
            # $Fixture (and its .orchestration/v2/config.v2.json, read once for
            # the whole test process) is never touched by the orphan history.
            $f=New-DtaFixture 'A08' -SkipTargetAdvance
            $altBare=Join-Path $Root 'dta-08-origin.git'
            & git init --bare -b main --quiet $altBare
            $altAuthority=Join-Path $Root 'dta-08-authority'
            & git clone --quiet $Fixture $altAuthority
            & git -C $altAuthority remote remove origin
            & git -C $altAuthority remote add origin $altBare
            & git -C $altAuthority checkout --orphan dta-orphan --quiet
            & git -C $altAuthority rm -rf --quiet . | Out-Null
            Write-Utf8 (Join-Path $altAuthority 'orphan.txt') 'unrelated history'
            & git -C $altAuthority add .
            & git -C $altAuthority -c user.name=rd -c user.email=rd@local commit -m orphan --quiet
            & git -C $altAuthority branch -f main --quiet
            & git -C $altAuthority checkout main --quiet
            & git -C $altAuthority push --quiet --force -u origin main
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $altAuthority
            Assert-True (-not $p.eligible -and $p.reason -match 'descendant') "expected non-descendant denial, got eligible=$($p.eligible) reason=$($p.reason)"
        }

        Check 'DTA-09: target advance overlapping the candidate path is rejected' {
            $f=New-DtaFixture 'A09' -AdvancePath 'apps/backend/src/work-order/feature.txt'
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible -and $p.reason -match 'overlap') "expected candidate-path overlap denial, got eligible=$($p.eligible) reason=$($p.reason)"
        }

        Check 'DTA-10: target advance touching the declared task scope is rejected' {
            $f=New-DtaFixture 'A10' -AdvancePath 'apps/backend/src/work-order/unrelated-but-in-scope.txt'
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible -and $p.reason -match 'overlap') "expected scope overlap denial, got eligible=$($p.eligible) reason=$($p.reason)"
        }

        Check 'DTA-11: current target equal to old base is rejected as unnecessary' {
            $f=New-DtaFixture 'A11' -SkipTargetAdvance
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible -and $p.reason -match 'unnecessary') "expected unnecessary-recovery denial, got eligible=$($p.eligible) reason=$($p.reason)"
        }

        Check 'DTA-12: full recovery lands RUNNING/REVIEW with ledger REVIEWING, no provider call, and is idempotent' {
            $f=New-DtaFixture 'A12'
            $before=Get-LedgerState $f.contract.taskVersionId
            $r=Recover-DispatcherDisjointTargetAdvance -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True ($r.status -eq 'RECOVERED_TO_REVIEW') "expected RECOVERED_TO_REVIEW, got $($r.status)"
            Assert-True ($f.state.status -eq 'RUNNING' -and $f.state.stage -eq 'REVIEW' -and $f.state.reviewVerdict -eq '') 'landing state must be RUNNING/REVIEW with a pending review'
            Assert-True ($f.state.candidateBase -eq $f.currentTarget) 'candidateBase must become the current target'
            Assert-True ($before.state -eq 'INTEGRATION_FAILED') 'fixture precondition drifted before recovery'
            $ledger=Get-LedgerState $f.contract.taskVersionId
            Assert-True ($ledger.state -eq 'REVIEWING') "expected ledger REVIEWING, got $($ledger.state)"
            Assert-True (($f.state.providerHistory|Measure-Object).Count -eq 0) 'recovery must not add providerHistory entries'
            $checks=@(Get-Attestations -TaskVersionId $f.contract.taskVersionId -Kind check)
            Assert-True ($checks.Count -eq 2) 'expected exactly one new check attestation in addition to the original'

            # idempotent replay
            $again=Recover-DispatcherDisjointTargetAdvance -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True ($again.status -eq 'ALREADY_RECOVERED') "expected ALREADY_RECOVERED on replay, got $($again.status)"
            $ledgerAfter=Get-LedgerState $f.contract.taskVersionId
            Assert-True ($ledgerAfter.seq -eq $ledger.seq) 'idempotent replay must not append duplicate ledger events'
        }

        Check 'DTA-13: proof rejects when workspace is dirty' {
            $f=New-DtaFixture 'A13'
            Write-Utf8 (Join-Path $f.workspace 'apps\backend\src\work-order\untracked.txt') 'dirty'
            try{
                $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
                Assert-True (-not $p.eligible -and $p.reason -match 'dirty') "expected workspace-dirty denial, got eligible=$($p.eligible) reason=$($p.reason)"
            }finally{Remove-Item -LiteralPath (Join-Path $f.workspace 'apps\backend\src\work-order\untracked.txt') -Force -ErrorAction SilentlyContinue}
        }

        Check 'DTA-14: prior integration attestation for the old candidate is rejected' {
            $f=New-DtaFixture 'A14'
            $oldBindings=Get-AttestationBindings -TaskVersionId $f.contract.taskVersionId -WorktreeDir $f.workspace -BaseSha $f.oldBase -HeadSha $f.oldHead
            New-Attestation -Kind integration -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -Bindings ([hashtable]$oldBindings) -Result PASS -Payload @{mergeCommit='x';remoteSHA='x';pushed=$true}|Out-Null
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible -and $p.reason -match 'not needed or not safe') "expected prior-publish denial, got eligible=$($p.eligible) reason=$($p.reason)"
        }

        Check 'DTA-15: reviewed native-diff false positive is revalidated before re-review' {
            $f=New-DtaFixture 'A15' -SecretFalsePositiveHold
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True $p.eligible "expected evidence-bound false-positive recovery, got: $($p.reason)"
            Assert-True ($p.freshReviewRequired -and -not $p.providerInvocationRequired) 'recovery must require fresh review and must not invoke a provider itself'
            $r=Recover-DispatcherDisjointTargetAdvance -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True ($r.status -eq 'RECOVERED_TO_REVIEW' -and $f.state.stage -eq 'REVIEW') 'recovery did not land the exact candidate at fresh REVIEW'
            $events=Get-DispatcherLedgerEvents $f.contract.taskVersionId
            $fp=@($events|Where-Object{$_.event -eq 'secret-false-positive-reviewed'})
            Assert-True ($fp.Count -eq 1 -and $fp[0].actor -eq 'owner' -and $fp[0].evidence.falsePositiveProven) 'missing exact owner false-positive evidence in the ledger'
            $again=Recover-DispatcherDisjointTargetAdvance -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True ($again.status -eq 'ALREADY_RECOVERED') 'recovery replay was not idempotent'
        }
    } finally { Pop-Location }
} finally {
    try{Remove-Item -LiteralPath $Root -Recurse -Force -ErrorAction SilentlyContinue}catch{}
}

$fails=@($results|Where-Object{$_.status -eq 'FAIL'})
foreach($r in $results){Write-Host "$($r.status)  $($r.id)  $($r.detail)" -ForegroundColor $(if($r.status -eq 'PASS'){'Green'}else{'Red'})}
Write-Host ""
Write-Host "disjoint-target-advance suite: $($results.Count - $fails.Count)/$($results.Count) PASS" -ForegroundColor $(if($fails.Count){'Red'}else{'Green'})
exit $(if($fails.Count){1}else{0})
