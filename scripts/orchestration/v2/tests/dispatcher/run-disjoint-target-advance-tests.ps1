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

function New-DtaFixture([string]$Id,[string[]]$Scope=@('apps/backend/src/work-order'),[switch]$SkipTargetAdvance,[string]$AdvancePath='.orchestration/v2/schemas/dta-advance.json',[switch]$SecretFalsePositiveHold,[switch]$RemoteDivergedHold,[switch]$CandidateDeletesFile,[switch]$DivergentTargetAdvance,[switch]$LevelC) {
    $script:DtaSeq++
    $task=Task ("DTA-"+$Id) $Scope
    if($LevelC){$task.risk='C';$task.ownerGate='level-c-external-service-arch'}
    $sourcePath=Join-Path $Root ("dta-"+$Id+"-"+$script:DtaSeq+".tasks.json");Write-Utf8 $sourcePath ((Source @($task))|ConvertTo-Json -Depth 20)
    $source=Read-DispatcherTaskSource $sourcePath;$task=[hashtable]$source.tasks[0]
    $contract=New-DispatcherContract -Task $task -TaskSource $source
    if($LevelC){New-OwnerGateApproval -TaskId $task.taskId -TaskVersionId $contract.taskVersionId -GateId $task.ownerGate -ApprovalScope 'fixture exact candidate scope' -ApprovedBy fixture -ApprovalSource 'isolated target-refresh test'|Out-Null}

    $base=(& git -C $Fixture rev-parse HEAD).Trim()
    $divergenceCommon=''
    if($DivergentTargetAdvance){
        $divergenceCommon=$base
        Write-Utf8 (Join-Path $Fixture '.orchestration\v2\schemas\dta-old-line.json') "{`"oldLine`":`"$Id-$script:DtaSeq`"}`n"
        & git -C $Fixture add .
        & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'old target line (disjoint)' --quiet
        $base=(& git -C $Fixture rev-parse HEAD).Trim()
        & git -C $Fixture push --quiet origin main
    }
    $runId='run-dta-'+(New-StringHash ($script:DtaSalt+'|'+$Id+'|'+$script:DtaSeq+'|run')).Substring(7,16)
    $workspaceId='run-'+(New-StringHash ($script:DtaSalt+'|'+$Id+'|'+$script:DtaSeq+'|workspace')).Substring(7,16)
    $ws=New-DispatcherWorkspace -RunId $runId -WorkspaceId $workspaceId -BaseSha $base -SourceRepo $Fixture

    $failureState='INTEGRATION_FAILED';$failureReason='authority tree dirty'
    if($SecretFalsePositiveHold){
        $nativeLog=Join-Path (Join-Path (Join-Path (Get-V2Dir) 'logs') 'native') 'dta-false-positive.stdout.log'
        Write-Utf8 $nativeLog "diff --git a/actions.ts b/actions.ts`n--- a/actions.ts`n+++ b/actions.ts`n@@ -1 +1,2 @@`n+const headers = { Authorization: ``Bearer `${token}`` }`n"
        $failureState='SECRET_LEAK_BLOCKED';$failureReason='pre-publication secret scan found 1 hit(s): \native\dta-false-positive.stdout.log :: /(?i)\bauthorization\b[ \t]*[:=][ \t]*\S+/'
    }

    if($CandidateDeletesFile){Remove-Item -LiteralPath (Join-Path $ws.workspace 'apps\backend\src\work-order\README.md') -Force}
    else{Write-Utf8 (Join-Path $ws.workspace 'apps\backend\src\work-order\feature.txt') "candidate feature $Id $script:DtaSeq`n"}
    & git -C $ws.workspace add .
    & git -C $ws.workspace -c user.name=rd -c user.email=rd@local commit -m 'candidate' --quiet
    $oldHead=(& git -C $ws.workspace rev-parse HEAD).Trim()

    $oldBindings=Get-AttestationBindings -TaskVersionId $contract.taskVersionId -WorktreeDir $ws.workspace -BaseSha $base -HeadSha $oldHead
    New-Attestation -Kind check -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$oldBindings) -Result PASS|Out-Null
    $review=New-Attestation -Kind review -TaskVersionId $contract.taskVersionId -RunId $runId -Bindings ([hashtable]$oldBindings) -Result APPROVE -ProducerMeta @{provider='glm';invocationId=('att-'+[guid]::NewGuid().ToString('N'))}

    $currentTarget=$base
    if($DivergentTargetAdvance){
        $tempBranch='dta-divergent-'+[guid]::NewGuid().ToString('N')
        & git -C $Fixture switch --quiet -c $tempBranch $divergenceCommon
        Write-Utf8 (Join-Path $Fixture $AdvancePath) "{`"divergent`":`"$Id-$script:DtaSeq`"}`n"
        & git -C $Fixture add .
        & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'divergent target replacement (disjoint)' --quiet
        $currentTarget=(& git -C $Fixture rev-parse HEAD).Trim()
        & git -C $Fixture branch -f main $currentTarget
        & git -C $Fixture switch --quiet main
        & git -C $Fixture branch -D $tempBranch | Out-Null
        $tempRemoteRef='refs/heads/dta-fixture-'+[guid]::NewGuid().ToString('N')
        & git -C $Fixture push --quiet origin "${currentTarget}:$tempRemoteRef"
        & git -C $OriginBare update-ref refs/heads/main $currentTarget
        & git -C $OriginBare update-ref -d $tempRemoteRef
    } elseif(-not $SkipTargetAdvance){
        Write-Utf8 (Join-Path $Fixture $AdvancePath) "{`"marker`":`"$Id-$script:DtaSeq`"}`n"
        & git -C $Fixture add .
        & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'target advance (disjoint)' --quiet
        $currentTarget=(& git -C $Fixture rev-parse HEAD).Trim()
        & git -C $Fixture push --quiet origin main
    }

    if($RemoteDivergedHold){
        $failureState='REMOTE_DIVERGED'
        $failureReason="origin/main ($($currentTarget.Substring(0,10))) has moved off the SHA the reviewed candidate was built on ($($base.Substring(0,10))) - rebuild + re-review required"
    }

    Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event ready -ToState READY|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event running -ToState RUNNING -RunId $runId|Out-Null
    Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase CHECKING
    Enter-DispatcherLedgerPhase -TaskVersionId $contract.taskVersionId -RunId $runId -Phase REVIEWING
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event approved -ToState APPROVED -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event integrate-start -ToState INTEGRATING -RunId $runId|Out-Null
    Add-LedgerEvent -TaskVersionId $contract.taskVersionId -Event integrate-failed -ToState $failureState -RunId $runId -Note $failureReason|Out-Null

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
        integration=[ordered]@{status=$failureState;reason=$failureReason;state='';targetBefore=$(if($RemoteDivergedHold){$currentTarget}elseif($SecretFalsePositiveHold){$base}else{''});targetAfter='';mergeCommit='';pushed=$false}
    }
    Write-DispatcherState $state|Out-Null
    return [ordered]@{state=$state;task=$task;source=$source;contract=$contract;workspace=$ws.workspace;branch=$ws.branch;runId=$runId;oldBase=$base;oldHead=$oldHead;currentTarget=$currentTarget;review=$review}
}

function New-DtaSourceSuccessor($FixtureData,[string]$Suffix='ok') {
    $task=ConvertTo-PlainTaskHashtable (_ToHashtable ((ConvertTo-CanonicalJson $FixtureData.task)|ConvertFrom-Json))
    $constraints=_ToHashtable $task.candidateConstraints
    $constraints.resumePolicy='DISJOINT_SOURCE_SUCCESSION'
    $constraints.resumeFromTaskVersionId=[string]$FixtureData.contract.taskVersionId
    $constraints.resumeFromCandidateCommit=[string]$FixtureData.oldHead
    $task.candidateConstraints=$constraints
    $path=Join-Path $Root ("dta-successor-"+$Suffix+"-"+[guid]::NewGuid().ToString('N')+".tasks.json")
    Write-Utf8 $path ((Source @($task))|ConvertTo-Json -Depth 30)
    $source=Read-DispatcherTaskSource $path
    $task=[hashtable]$source.tasks[0]
    $contract=New-DispatcherContract -Task $task -TaskSource $source
    return [ordered]@{task=$task;source=$source;contract=$contract}
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

        Check 'DTA-16: exact source-bound successor is eligible without provider execution' {
            $f=New-DtaFixture 'A16'
            $s=New-DtaSourceSuccessor $f 'a16'
            Assert-True (Test-DispatcherDisjointSourceSuccessionRequest -State $f.state -Task $s.task -TaskSource $s.source) 'exact successor request was not recognized'
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True $p.eligible "expected eligible source succession, got: $($p.reason)"
            Assert-True (-not $p.providerInvocationRequired -and $p.freshReviewRequired) 'source succession must reuse the candidate without implementation and require a fresh review'
            Assert-True ($p.disjointProof.oldHead -eq $f.oldHead -and $p.disjointProof.currentTarget -eq $f.currentTarget) 'source succession proof lost the exact candidate or target binding'
        }

        Check 'DTA-17: successor without exact predecessor version is rejected' {
            $f=New-DtaFixture 'A17'
            $s=New-DtaSourceSuccessor $f 'a17'
            $s.task.candidateConstraints.resumeFromTaskVersionId=('f'*64)
            Assert-True (-not(Test-DispatcherDisjointSourceSuccessionRequest -State $f.state -Task $s.task -TaskSource $s.source)) 'wrong predecessor version was accepted as a request'
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True (-not $p.eligible) 'wrong predecessor version passed full proof'
        }

        Check 'DTA-18: semantic task drift beyond recovery bindings is rejected' {
            $f=New-DtaFixture 'A18'
            $s=New-DtaSourceSuccessor $f 'a18'
            $s.task.description='changed product requirement'
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True (-not $p.eligible -and $p.reason -match 'semantics drift') "semantic drift denial missing, got: $($p.reason)"
        }

        Check 'DTA-19: tampered succession record is rejected before resume' {
            $f=New-DtaFixture 'A19'
            $s=New-DtaSourceSuccessor $f 'a19'
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True $p.eligible "fixture proof failed: $($p.reason)"
            $record=New-DispatcherDisjointSourceSuccessionRecord -State $f.state -Contract $s.contract -TaskSource $s.source -Proof $p
            $f.state.pendingDisjointSourceSuccession=$true;$f.state.disjointSourceSuccession=$record
            $f.state.taskVersionId=$s.contract.taskVersionId;$f.state.taskSourceHash=$s.source.hash;$f.state.taskSource=$s.source.path;$f.state.task=$s.task
            $f.state.disjointSourceSuccession.candidateHead=('a'*40)
            $pending=Get-DispatcherPendingDisjointSourceSuccessionProof -State $f.state -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture
            Assert-True (-not $pending.eligible -and $pending.reason -match 'record hash') "tampered record denial missing, got: $($pending.reason)"
        }

        Check 'DTA-20: pending successor revalidates the exact frozen target' {
            $f=New-DtaFixture 'A20' -LevelC
            $s=New-DtaSourceSuccessor $f 'a20'
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True $p.eligible "fixture proof failed: $($p.reason)"
            $record=New-DispatcherDisjointSourceSuccessionRecord -State $f.state -Contract $s.contract -TaskSource $s.source -Proof $p
            $f.state.pendingDisjointSourceSuccession=$true;$f.state.disjointSourceSuccession=$record
            $f.state.taskVersionId=$s.contract.taskVersionId;$f.state.taskSourceHash=$s.source.hash;$f.state.taskSource=$s.source.path;$f.state.task=$s.task
            $f.state.pendingContractSupersession=$true;$f.state.supersededTaskVersionId=$f.contract.taskVersionId;$f.state.recoveredCandidateCommit=$f.oldHead
            $f.state.status='WAITING_HUMAN';$f.state.stage='GATE';$f.state.reason="Level C: $($s.task.ownerGate)"
            Initialize-LedgerTask -TaskVersionId $s.contract.taskVersionId -Identity @{taskId=$s.task.taskId}|Out-Null
            Add-LedgerEvent -TaskVersionId $s.contract.taskVersionId -Event ready -ToState READY -RunId $f.runId|Out-Null
            Add-LedgerEvent -TaskVersionId $s.contract.taskVersionId -Event level-c-hold -ToState WAITING_HUMAN -RunId $f.runId -Note $s.task.ownerGate|Out-Null
            Write-DispatcherState $f.state|Out-Null
            Approve-DispatcherOwnerGate -TaskId $s.task.taskId -TaskVersionId $s.contract.taskVersionId -ApprovalScope 'fixture exact successor candidate scope' -ApprovedBy fixture -ApprovalSource 'isolated target-refresh test' -TaskFile $s.source.path|Out-Null
            Reconcile-DispatcherOwnerGateProjection -Task $s.task -TaskSource $s.source -TaskVersionId $s.contract.taskVersionId|Out-Null
            $pending=Get-DispatcherPendingDisjointSourceSuccessionProof -State $f.state -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture
            Assert-True $pending.eligible "pending successor did not revalidate: $($pending.reason)"

            Write-Utf8 (Join-Path $Fixture '.orchestration\v2\schemas\dta-after-gate.json') "{`"changed`":true}`n"
            & git -C $Fixture add .
            & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'target moved after successor gate' --quiet
            & git -C $Fixture push --quiet origin main
            $moved=Get-DispatcherPendingDisjointSourceSuccessionProof -State $f.state -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture
            Assert-True (-not $moved.eligible -and $moved.reason -match 'target head drift') "post-gate target drift was not rejected: $($moved.reason)"
            $refresh=Get-DispatcherPendingDisjointSourceSuccessionProof -State (Get-DispatcherState) -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture -AllowTargetRefresh
            Assert-True ($refresh.eligible -and $refresh.targetRefreshRequired) "safe disjoint target advance did not request a fresh exact gate: $($refresh.reason)"
            $oldWorkspace=[string]$f.state.workspace;$oldRun=[string]$f.state.runId;$oldCandidate=[string]$f.state.recoveredCandidateCommit
            $result=Refresh-DispatcherPendingSourceSuccessionGate -State (Get-DispatcherState) -Task $s.task -TaskSource $s.source -Contract $s.contract -RefreshProof $refresh
            $after=Get-DispatcherState;$approval=Get-OwnerGateApprovalStatus -TaskId $s.task.taskId -TaskVersionId $result.contract.taskVersionId -GateId $s.task.ownerGate
            Assert-True ($result.contract.taskVersionId -ne $s.contract.taskVersionId -and $approval.satisfied -and $approval.approval -eq 'APPROVED') 'refreshed target was not bound to a newly approved exact task version'
            Assert-True ($after.workspace -eq $oldWorkspace -and $after.runId -eq $oldRun -and $after.recoveredCandidateCommit -eq $oldCandidate -and $after.pendingContractSupersession) 'target refresh changed the preserved candidate lineage'
            $revalidated=Get-DispatcherPendingDisjointSourceSuccessionProof -State $after -Task $s.task -Contract $result.contract -TaskSource $s.source -RepoDir $Fixture
            Assert-True ($revalidated.eligible -and -not $revalidated.targetRefreshRequired) "newly approved target-bound successor did not revalidate: $($revalidated.reason)"
        }

        Check 'DTA-21: divergent target is allowed only by exact source succession' {
            $f=New-DtaFixture 'A21' -DivergentTargetAdvance
            $generic=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $generic.eligible -and $generic.reason -match 'not a descendant') "generic recovery unexpectedly accepted divergent target: $($generic.reason)"
            $s=New-DtaSourceSuccessor $f 'a21'
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True $p.eligible "source succession rejected disjoint divergent target: $($p.reason)"
            Assert-True ($p.disjointProof.targetRelation -eq 'DIVERGENT_SOURCE_SUCCESSION' -and $p.disjointProof.lineageMergeBase -match '^[0-9a-f]{40}$') 'divergent source proof lacks the exact lineage binding'
        }

        Check 'DTA-22: divergent source transplant preserves only the approved candidate patch' {
            $f=New-DtaFixture 'A22' -DivergentTargetAdvance -LevelC
            $s=New-DtaSourceSuccessor $f 'a22'
            New-OwnerGateApproval -TaskId $s.task.taskId -TaskVersionId $s.contract.taskVersionId -GateId $s.task.ownerGate -ApprovalScope 'fixture exact source succession scope' -ApprovedBy fixture -ApprovalSource 'isolated target-refresh test'|Out-Null
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True $p.eligible "fixture source proof failed: $($p.reason)"
            $record=New-DispatcherDisjointSourceSuccessionRecord -State $f.state -Contract $s.contract -TaskSource $s.source -Proof $p
            $f.state.pendingDisjointSourceSuccession=$true;$f.state.disjointSourceSuccession=$record
            $f.state.taskVersionId=$s.contract.taskVersionId;$f.state.taskSourceHash=$s.source.hash;$f.state.taskSource=$s.source.path;$f.state.task=$s.task
            $moved=Complete-DispatcherDisjointSourceTransplant -State $f.state -RepoDir $Fixture
            Assert-True ($moved.eligible -and $moved.transplanted -and $moved.newCandidateHead -ne $f.oldHead) 'candidate was not transplanted onto the divergent target'
            Assert-True ($moved.currentTarget -eq $f.currentTarget -and $moved.newDiffHash -eq $f.state.diffHash) 'transplant lost target or diff binding'
            Assert-True ($f.state.baseSha -eq $f.currentTarget -and $f.state.candidateBase -eq $f.currentTarget) 'transplant did not advance both durable base bindings to the exact target'
            $oldBranch='orch-v2/run-dta-preserve-'+[guid]::NewGuid().ToString('N').Substring(0,12)
            & git -C $Fixture fetch --quiet $f.workspace "$($f.oldHead):refs/heads/$oldBranch"
            Assert-True ($LASTEXITCODE -eq 0) 'could not establish the old local run ref for the import-preservation test'
            $f.state.branch=$oldBranch;$f.state.candidateHead=$moved.newCandidateHead
            $importBranch=Resolve-DispatcherCandidateImportBranch -State $f.state -RepoDir $Fixture
            Assert-True ($importBranch.branch -ne $oldBranch -and $importBranch.preservedBranch -eq $oldBranch) 'divergent import did not select a distinct candidate branch'
            & git -C $Fixture fetch --quiet $f.workspace "HEAD:refs/heads/$($importBranch.branch)"
            Assert-True ($LASTEXITCODE -eq 0) 'new candidate import ref was not fetchable'
            Assert-True ((Get-GitHeadV2ForRef -Dir $Fixture -Ref $oldBranch) -eq $f.oldHead) 'divergent candidate import overwrote the preserved historical branch'
            Assert-True ((Get-GitHeadV2ForRef -Dir $Fixture -Ref $importBranch.branch) -eq $moved.newCandidateHead) 'new candidate import ref does not point to the approved transplanted head'
            $pending=Get-DispatcherPendingDisjointSourceSuccessionProof -State $f.state -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture
            Assert-True $pending.eligible "signed transplant did not revalidate: $($pending.reason)"
            $reconcileState=_ToHashtable ((ConvertTo-CanonicalJson $f.state)|ConvertFrom-Json)
            $reconcileState.task=$s.task;$reconcileState.taskVersionId=$s.contract.taskVersionId;$reconcileState.taskSource=$s.source.path;$reconcileState.taskSourceHash=$s.source.hash
            $reconcileState.status='RESUMABLE';$reconcileState.stage='IMPLEMENT';$reconcileState.reason='candidate HEAD is not descended from the durable base SHA'
            $reconcileState.baseSha=$f.oldBase;$reconcileState.implementationComplete=$true;$reconcileState.implementationCommit=$moved.newCandidateHead;$reconcileState.candidateHead=''
            Assert-True (Test-DispatcherTransplantBaseReconciliationEligible -State $reconcileState -Task $s.task -TaskSource $s.source) 'exact signed transplant lineage was not eligible for narrow base reconciliation'
            $reconcileState.disjointSourceTransplant.recordHash='sha256:' + ('0' * 64)
            Assert-True (-not (Test-DispatcherTransplantBaseReconciliationEligible -State $reconcileState -Task $s.task -TaskSource $s.source)) 'tampered transplant record was accepted for base reconciliation'
            Write-Utf8 (Join-Path $Fixture '.orchestration\v2\schemas\dta-post-transplant-advance.json') "{`"postTransplant`":`"$($f.runId)`"}`n"
            & git -C $Fixture add .
            & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'post-transplant disjoint target advance' --quiet
            & git -C $Fixture push --quiet origin main
            Assert-True ($LASTEXITCODE -eq 0) 'could not advance the fixture target after candidate transplant'
            $postTransplantTarget=(& git -C $Fixture rev-parse HEAD).Trim()
            & git -C $f.workspace fetch --no-tags --quiet $Fixture main
            & git -C $f.workspace checkout -b ('orch-v2/run-dta-current-'+[guid]::NewGuid().ToString('N').Substring(0,12)) $moved.newCandidateHead --quiet
            Assert-True ($LASTEXITCODE -eq 0) 'could not create the fresh candidate fixture branch'
            & git -C $f.workspace rebase --onto $postTransplantTarget $f.currentTarget | Out-Null
            Assert-True ($LASTEXITCODE -eq 0) 'could not simulate a freshly reviewed candidate on the advanced target'
            $currentHead=(& git -C $f.workspace rev-parse HEAD).Trim()
            $candidateTree=(& git -C $f.workspace rev-parse "$currentHead^{tree}").Trim()
            $mergeHead=(& git -C $f.workspace -c user.name=rd -c user.email=rd@local commit-tree $candidateTree -p $currentHead -p $postTransplantTarget -m 'candidate synchronization merge').Trim()
            Assert-True ($LASTEXITCODE -eq 0 -and $mergeHead -match '^[0-9a-f]{40}$') 'could not create the fixture synchronization merge commit'
            & git -C $f.workspace checkout --detach $mergeHead --quiet
            Assert-True ($LASTEXITCODE -eq 0) 'could not select the fixture synchronization merge commit'
            $currentHead=$mergeHead
            $currentBindings=Get-AttestationBindings -TaskVersionId $s.contract.taskVersionId -WorktreeDir $f.workspace -BaseSha $postTransplantTarget -HeadSha $currentHead
            New-Attestation -Kind check -TaskVersionId $s.contract.taskVersionId -RunId $f.runId -Bindings ([hashtable]$currentBindings) -Result PASS|Out-Null
            New-Attestation -Kind review -TaskVersionId $s.contract.taskVersionId -RunId $f.runId -Bindings ([hashtable]$currentBindings) -Result APPROVE -ProducerMeta @{provider='glm';invocationId=('att-'+[guid]::NewGuid().ToString('N'))}|Out-Null
            $f.state.candidateBase=$postTransplantTarget;$f.state.candidateHead=$currentHead
            $f.state.candidateTree=Get-GitTreeHash -Dir $f.workspace -Ref $currentHead;$f.state.diffHash=Get-GitDiffHash -Dir $f.workspace -BaseSha $postTransplantTarget -HeadSha $currentHead
            $f.state.task=$s.task;$f.state.taskVersionId=$s.contract.taskVersionId;$f.state.taskSource=$s.source.path;$f.state.taskSourceHash=$s.source.hash
            $f.state.status='RUNNING';$f.state.stage='REVIEW';$f.state.reason='';$f.state.pendingContractSupersession=$false;$f.state.pendingDisjointSourceSuccession=$false;$f.state.pendingReviewSuccession=$false
            $oldReviewedBranch=[string]$f.branch
            & git -C $f.workspace branch -f $oldReviewedBranch $currentHead
            Assert-True ($LASTEXITCODE -eq 0) 'could not bind the fixture reviewed branch to its current candidate head'
            $activeRefresh=Refresh-DispatcherActiveSourceCandidateTargetGate -State $f.state -Task $s.task -TaskSource $s.source -RepoDir $Fixture
            Assert-True ($activeRefresh.refreshed -and [string]$activeRefresh.target -eq $postTransplantTarget) "active reviewed candidate did not receive an exact target refresh: $($activeRefresh.reason)"
            Assert-True ([string]$activeRefresh.state.candidateBase -eq $postTransplantTarget -and [string]$activeRefresh.state.branch -ne $oldReviewedBranch) 'active target refresh did not bind a new candidate branch/base'
            Assert-True ((Get-DispatcherOptionalLocalBranchHead -Branch $oldReviewedBranch -RepoDir $f.workspace) -eq $currentHead) 'active target refresh did not preserve the prior reviewed candidate branch'
        }

        Check 'DTA-23: interrupted divergent transplant is recovered from exact content proof' {
            $f=New-DtaFixture 'A23' -DivergentTargetAdvance
            $s=New-DtaSourceSuccessor $f 'a23'
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True $p.eligible "fixture source proof failed: $($p.reason)"
            $record=New-DispatcherDisjointSourceSuccessionRecord -State $f.state -Contract $s.contract -TaskSource $s.source -Proof $p
            $f.state.pendingDisjointSourceSuccession=$true;$f.state.disjointSourceSuccession=$record
            $f.state.taskVersionId=$s.contract.taskVersionId;$f.state.taskSourceHash=$s.source.hash;$f.state.taskSource=$s.source.path;$f.state.task=$s.task
            & git -C $f.workspace fetch --no-tags --quiet $Fixture $f.currentTarget
            & git -C $f.workspace rebase --onto $f.currentTarget $f.oldBase | Out-Null
            Assert-True ($LASTEXITCODE -eq 0) 'fixture could not simulate completed transplant before state write'
            $pending=Get-DispatcherPendingDisjointSourceSuccessionProof -State $f.state -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture
            Assert-True ($pending.eligible -and $pending.transplantRecordPending) "interrupted exact transplant was not recovered: $($pending.reason)"
            $completed=Complete-DispatcherDisjointSourceTransplant -State $f.state -RepoDir $Fixture
            Assert-True ($completed.eligible -and $f.state.disjointSourceTransplant.recordHash -match '^sha256:[0-9a-f]{64}$') 'interrupted transplant did not receive a durable signed record'
        }

        Check 'DTA-24: exact no-mutation remote divergence is eligible for fresh review' {
            $f=New-DtaFixture 'A24' -RemoteDivergedHold
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True $p.eligible "expected remote-diverged hold to be eligible, got: $($p.reason)"
            Assert-True ($p.currentTarget -eq $f.currentTarget -and $p.freshReviewRequired -and -not $p.providerInvocationRequired) 'remote-diverged recovery proof is not bound to the current target and fresh review'
        }

        Check 'DTA-25: remote divergence must bind the exact failed target and candidate base' {
            $f=New-DtaFixture 'A25' -RemoteDivergedHold
            $f.state.integration.targetBefore=('f'*40)
            $p=Get-DispatcherDisjointTargetAdvanceRecoveryProof -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True (-not $p.eligible -and $p.reason -eq 'integration result does not prove an eligible pre-publish, no-mutation failure') "tampered remote-diverged target was not rejected exactly: $($p.reason)"
        }

        Check 'DTA-26: remote-diverged recovery reaches REVIEWING without invoking a provider' {
            $f=New-DtaFixture 'A26' -RemoteDivergedHold
            $r=Recover-DispatcherDisjointTargetAdvance -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True ($r.status -eq 'RECOVERED_TO_REVIEW' -and $f.state.status -eq 'RUNNING' -and $f.state.stage -eq 'REVIEW') "remote-diverged recovery did not reach fresh review: $($r.status) / $($f.state.status) / $($f.state.stage)"
            Assert-True ((Get-LedgerState $f.contract.taskVersionId).state -eq 'REVIEWING') 'remote-diverged recovery ledger did not reach REVIEWING'
            Assert-True (($f.state.providerHistory|Measure-Object).Count -eq 0) 'remote-diverged recovery invoked or recorded a provider'
        }

        Check 'DTA-27: recovery preserves an intentional candidate deletion' {
            $f=New-DtaFixture 'A27' -RemoteDivergedHold -CandidateDeletesFile
            $r=Recover-DispatcherDisjointTargetAdvance -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True ($r.status -eq 'RECOVERED_TO_REVIEW' -and -not (Test-Path -LiteralPath (Join-Path $f.workspace 'apps\backend\src\work-order\README.md'))) 'remote-diverged recovery did not preserve the candidate deletion'
        }

        Check 'DTA-28: interrupted recovery continues after another disjoint target advance' {
            $f=New-DtaFixture 'A28' -RemoteDivergedHold
            & git -C $f.workspace fetch --no-tags --quiet $Fixture $f.currentTarget
            & git -C $f.workspace merge $f.currentTarget --no-edit -m 'interrupted fixture recovery' --quiet
            Assert-True ($LASTEXITCODE -eq 0) 'fixture could not create the interrupted recovery merge'
            Write-Utf8 (Join-Path $Fixture '.orchestration\v2\schemas\dta-second-advance.json') "{`"second`":true}`n"
            & git -C $Fixture add .
            & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'second target advance (disjoint)' --quiet
            & git -C $Fixture push --quiet origin main
            $latestTarget=(& git -C $Fixture rev-parse HEAD).Trim()
            $r=Recover-DispatcherDisjointTargetAdvance -State $f.state -Task $f.task -TaskSource $f.source -Contract $f.contract -TaskVersionId $f.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture
            Assert-True ($r.status -eq 'RECOVERED_TO_REVIEW' -and $f.state.candidateBase -eq $latestTarget) 'interrupted recovery did not continue onto the latest disjoint target'
        }

        Check 'DTA-29: source-transplanted candidate may enter fresh review after target recovery' {
            $f=New-DtaFixture 'A29' -DivergentTargetAdvance -LevelC
            $s=New-DtaSourceSuccessor $f 'a29'
            New-OwnerGateApproval -TaskId $s.task.taskId -TaskVersionId $s.contract.taskVersionId -GateId $s.task.ownerGate -ApprovalScope 'fixture recovered source-transplant scope' -ApprovedBy fixture -ApprovalSource 'isolated target-recovery test'|Out-Null
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True $p.eligible "fixture source proof failed: $($p.reason)"
            $f.state.disjointSourceSuccession=New-DispatcherDisjointSourceSuccessionRecord -State $f.state -Contract $s.contract -TaskSource $s.source -Proof $p
            $f.state.pendingDisjointSourceSuccession=$true;$f.state.taskVersionId=$s.contract.taskVersionId;$f.state.taskSourceHash=$s.source.hash;$f.state.taskSource=$s.source.path;$f.state.task=$s.task
            $moved=Complete-DispatcherDisjointSourceTransplant -State $f.state -RepoDir $Fixture
            Assert-True ($moved.eligible -and $moved.transplanted) 'fixture source transplant failed'
            $bindings=Get-AttestationBindings -TaskVersionId $s.contract.taskVersionId -WorktreeDir $f.workspace -BaseSha $f.state.candidateBase -HeadSha $f.state.candidateHead
            New-Attestation -Kind check -TaskVersionId $s.contract.taskVersionId -RunId $f.runId -Bindings ([hashtable]$bindings) -Result PASS|Out-Null
            New-Attestation -Kind review -TaskVersionId $s.contract.taskVersionId -RunId $f.runId -Bindings ([hashtable]$bindings) -Result APPROVE -ProducerMeta @{provider='glm';invocationId=('att-'+[guid]::NewGuid().ToString('N'))}|Out-Null
            Initialize-LedgerTask -TaskVersionId $s.contract.taskVersionId -Identity @{taskId=$s.task.taskId}|Out-Null
            Add-LedgerEvent -TaskVersionId $s.contract.taskVersionId -Event ready -ToState READY|Out-Null
            Add-LedgerEvent -TaskVersionId $s.contract.taskVersionId -Event dispatch -ToState DISPATCHED -RunId $f.runId|Out-Null
            Add-LedgerEvent -TaskVersionId $s.contract.taskVersionId -Event running -ToState RUNNING -RunId $f.runId|Out-Null
            Enter-DispatcherLedgerPhase -TaskVersionId $s.contract.taskVersionId -RunId $f.runId -Phase CHECKING
            Enter-DispatcherLedgerPhase -TaskVersionId $s.contract.taskVersionId -RunId $f.runId -Phase REVIEWING
            Add-LedgerEvent -TaskVersionId $s.contract.taskVersionId -Event approved -ToState APPROVED -RunId $f.runId|Out-Null
            Write-Utf8 (Join-Path $Fixture '.orchestration\v2\schemas\dta-source-recovery-advance.json') "{`"sourceRecovery`":true}`n"
            & git -C $Fixture add .
            & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'source recovery target advance (disjoint)' --quiet
            & git -C $Fixture push --quiet origin main
            $latestTarget=(& git -C $Fixture rev-parse HEAD).Trim()
            $reason="origin/main ($($latestTarget.Substring(0,10))) has moved off the SHA the reviewed candidate was built on ($(([string]$f.state.candidateBase).Substring(0,10))) - rebuild + re-review required"
            Add-LedgerEvent -TaskVersionId $s.contract.taskVersionId -Event integrate-start -ToState INTEGRATING -RunId $f.runId|Out-Null
            Add-LedgerEvent -TaskVersionId $s.contract.taskVersionId -Event integrate-failed -ToState REMOTE_DIVERGED -RunId $f.runId -Note $reason|Out-Null
            $f.state.status='REMOTE_DIVERGED';$f.state.stage='INTEGRATE';$f.state.reason=$reason;$f.state.reviewVerdict='APPROVE'
            $f.state.integration=[ordered]@{status='REMOTE_DIVERGED';reason=$reason;state='';targetBefore=$latestTarget;targetAfter='';mergeCommit='';pushed=$false}
            Recover-DispatcherDisjointTargetAdvance -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -TaskVersionId $s.contract.taskVersionId -RunId $f.runId -RepoDir $Fixture|Out-Null
            $proposal=_ToHashtable ((ConvertTo-CanonicalJson $f.state)|ConvertFrom-Json);$proposal.pendingDisjointSourceSuccession=$true
            $pending=Get-DispatcherPendingDisjointSourceSuccessionProof -State $proposal -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture -AllowTargetRefresh
            Assert-True ($pending.eligible -and -not $pending.targetRefreshRequired) "recovered source-transplanted candidate could not enter fresh review: $($pending.reason)"
            Write-Utf8 (Join-Path $Fixture '.orchestration\v2\schemas\dta-after-recovered-review.json') "{`"afterRecoveredReview`":true}`n"
            & git -C $Fixture add .
            & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'advance after recovered review (disjoint)' --quiet
            & git -C $Fixture push --quiet origin main
            $refreshedTarget=(& git -C $Fixture rev-parse HEAD).Trim()
            $refresh=Get-DispatcherPendingDisjointSourceSuccessionProof -State $proposal -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture -AllowTargetRefresh
            Assert-True ($refresh.eligible -and $refresh.targetRefreshRequired -and [string]$refresh.proof.currentTarget -eq $refreshedTarget) "recovered source-transplanted candidate did not request an exact target refresh: $($refresh.reason)"
            $later=_ToHashtable ((ConvertTo-CanonicalJson $proposal)|ConvertFrom-Json);$signed=_ToHashtable $later.disjointSourceTransplant
            & git -C $f.workspace checkout --detach ([string]$signed.newCandidateHead) --quiet
            $later.candidateBase=[string]$signed.currentTarget;$later.baseSha=[string]$signed.currentTarget;$later.candidateHead=[string]$signed.newCandidateHead;$later.implementationCommit=[string]$signed.newCandidateHead;$later.candidateTree=[string]$signed.newCandidateTree;$later.diffHash=[string]$signed.newDiffHash
            $laterProof=Get-DispatcherPendingDisjointSourceSuccessionProof -State $later -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture -AllowTargetRefresh
            Assert-True ($laterProof.eligible -and $laterProof.targetRefreshRequired -and [string]$laterProof.proof.currentTarget -eq $refreshedTarget) "a later exact source candidate was incorrectly rebound to the older recovery receipt: $($laterProof.reason)"
            & git -C $f.workspace checkout --detach ([string]$proposal.candidateHead) --quiet
            $receiptPath=Get-DispatcherDisjointTargetAdvanceReceiptPath -RunId $f.runId
            $receipt=Read-V2Json $receiptPath;$receipt.newCandidateHead=('0'*40);Write-V2JsonCanonical $receiptPath $receipt
            $tampered=Get-DispatcherPendingDisjointSourceSuccessionProof -State $proposal -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture -AllowTargetRefresh
            Assert-True (-not $tampered.eligible -and $tampered.reason -match 'receipt is invalid') "tampered recovery receipt was not rejected: $($tampered.reason)"
        }
        Check 'DTA-30: later source refresh is not rebound to an older target-recovery receipt' {
            $f=New-DtaFixture 'A30' -DivergentTargetAdvance -LevelC;$s=New-DtaSourceSuccessor $f 'a30'
            New-OwnerGateApproval -TaskId $s.task.taskId -TaskVersionId $s.contract.taskVersionId -GateId $s.task.ownerGate -ApprovalScope 'fixture later source refresh scope' -ApprovedBy fixture -ApprovalSource 'isolated target-recovery test'|Out-Null
            $p=Get-DispatcherDisjointSourceSuccessionProof -State $f.state -Task $s.task -TaskSource $s.source -Contract $s.contract -RepoDir $Fixture
            Assert-True $p.eligible "fixture source proof failed: $($p.reason)"
            $f.state.disjointSourceSuccession=New-DispatcherDisjointSourceSuccessionRecord -State $f.state -Contract $s.contract -TaskSource $s.source -Proof $p
            $f.state.pendingDisjointSourceSuccession=$true;$f.state.taskVersionId=$s.contract.taskVersionId;$f.state.taskSourceHash=$s.source.hash;$f.state.taskSource=$s.source.path;$f.state.task=$s.task
            $moved=Complete-DispatcherDisjointSourceTransplant -State $f.state -RepoDir $Fixture
            Assert-True ($moved.eligible -and $moved.transplanted) 'fixture source transplant failed'
            $f.state.status='RUNNING';$f.state.stage='REVIEW';$f.state.reviewVerdict=''
            $f.state.disjointTargetAdvanceRecoveryHistory=@([ordered]@{newCandidateHead=('1'*40);newCandidateBase=('2'*40);proofHash=('sha256:'+('3'*64));receiptHash=('sha256:'+('4'*64));checkAttestationId='atn-stale'})
            Write-Utf8 (Join-Path $Fixture '.orchestration\v2\schemas\dta-later-source-refresh.json') "{`"laterSourceRefresh`":true}`n"
            & git -C $Fixture add .
            & git -C $Fixture -c user.name=rd -c user.email=rd@local commit -m 'later source refresh target advance (disjoint)' --quiet
            & git -C $Fixture push --quiet origin main
            $latestTarget=(& git -C $Fixture rev-parse HEAD).Trim()
            $refresh=Get-DispatcherPendingDisjointSourceSuccessionProof -State $f.state -Task $s.task -Contract $s.contract -TaskSource $s.source -RepoDir $Fixture -AllowTargetRefresh
            Assert-True ($refresh.eligible -and $refresh.targetRefreshRequired -and [string]$refresh.proof.currentTarget -eq $latestTarget) "later source refresh was incorrectly rebound to an older recovery receipt: $($refresh.reason)"
        }
        Check 'DTA-31: repeated source refresh branch names stay bounded and stable' {
            $runId='run-'+('a'*120);$target='b'*40
            $first=Get-DispatcherSourceRefreshBranchName -RunId $runId -Target $target
            $second=Get-DispatcherSourceRefreshBranchName -RunId $runId -Target $target
            Assert-True ($first -eq $second -and $first.Length -le 160 -and $first -eq "orch-v2/$runId-target-$($target.Substring(0,12))") 'source refresh branch name accumulated prior target suffixes or exceeded the bound'
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
