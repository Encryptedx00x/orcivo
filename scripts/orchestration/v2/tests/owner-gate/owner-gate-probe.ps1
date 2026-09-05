<#
owner-gate-probe.ps1 - one durable owner-gate scenario per disposable repo.
No provider/model calls and no Orcivo product execution.
#>
param([Parameter(Mandatory)][string]$Do)
$ErrorActionPreference = 'Stop'
$V2 = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Pilot = Join-Path $V2 'pilot.ps1'
$PS = (Get-Command powershell.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source

. (Join-Path $V2 'pilot.ps1')

function Assert-OG { param($Condition, [string]$Message) if (-not $Condition) { throw $Message } }
function Complete-OG { param([string]$Message) Write-Output "PROBE_OK $Message"; exit 0 }

function Get-OGTaskSourcePath { return (Join-Path (Get-RepoRoot) '.planning\product\owner-gate.tasks.json') }

function Enter-OGLevelCHold {
    $source = Read-DispatcherTaskSource (Get-OGTaskSourcePath)
    $task = @($source.tasks | Where-Object { $_.taskId -eq 'OG-TASK' })[0]
    $result = Invoke-RealDispatcherTask -Task $task -TaskSource $source
    Assert-OG ($result.status -eq 'WAITING_HUMAN' -and $result.stage -eq 'GATE') "expected Level C hold, got $($result.status)/$($result.stage): $($result.reason)"
    return @{ source=$source; task=$task; state=$result }
}

function Invoke-OGApproval {
    param($Hold,[string]$Scope='fixture-local additive migration only')
    $ErrorActionPreference='Continue'
    $out=& $PS -NoProfile -ExecutionPolicy Bypass -File $Pilot approve-gate -TaskFile (Get-OGTaskSourcePath) -TaskId 'OG-TASK' -TaskVersionId $Hold.state.taskVersionId -ApprovalScope $Scope 2>&1
    $code=$LASTEXITCODE
    $ErrorActionPreference='Stop'
    return @{output=@($out);exitCode=$code}
}

switch ($Do) {
    'missing-approval' {
        $hold=Enter-OGLevelCHold
        $gate=Get-HumanGateStatus $hold.state.taskVersionId 'level-c-persistent-migration'
        Assert-OG (-not $gate.satisfied -and $gate.approval -eq 'MISSING') "missing approval state was $($gate.approval): $($gate.reason)"
        Assert-OG ((Get-LedgerState $hold.state.taskVersionId).state -eq 'WAITING_HUMAN') 'ledger did not remain WAITING_HUMAN'
        Complete-OG 'no approval remains WAITING_HUMAN'
    }
    'exact-approval' {
        $hold = Enter-OGLevelCHold
        $approved=Invoke-OGApproval $hold
        Assert-OG ($approved.exitCode -eq 0) "approve-gate failed: $($approved.output -join ' | ')"
        Assert-OG (($approved.output -join "`n") -match 'RESUMABLE') "approve-gate did not report RESUMABLE: $($approved.output -join ' | ')"
        $gate = Get-HumanGateStatus -TaskVersionId $hold.state.taskVersionId -GateId 'level-c-persistent-migration'
        Assert-OG ($gate.satisfied -and $gate.approval -eq 'APPROVED') "exact approval not recognized: $($gate.reason)"
        $record=Read-OwnerGateRecordStrict $gate.path
        Assert-OG ($record.taskId -eq 'OG-TASK' -and $record.taskVersionId -eq $hold.state.taskVersionId -and $record.reason -eq 'Level C: level-c-persistent-migration') 'record lacks exact task/version/gate reason binding'
        Assert-OG ($record.approvalScope -eq 'fixture-local additive migration only' -and $record.approvalIdentity -and $record.approvalSource -and $record.approvalTimestamp) 'record lacks scope/operator/source/time'
        Assert-OG (@(Get-ChildItem -LiteralPath (Split-Path $gate.path) -Filter '*.tmp').Count -eq 0) 'atomic write left a temp artifact'
        function Get-HealthyProviders { return @('claude','codex') }
        function Resolve-Route { return @{ok=$true;provider='claude';profile='CRITICAL';model='fixture-model'} }
        $stop=Join-Path (Get-V2Dir) (Get-PilotConfig).stopFile
        [System.IO.File]::WriteAllText($stop,'stop before fixture implementation',(New-Object System.Text.UTF8Encoding($false)))
        $resumed=$null
        try{$resumed=Invoke-RealDispatcherTask -Task $hold.task -TaskSource $hold.source}finally{Remove-Item -LiteralPath $stop -Force -ErrorAction SilentlyContinue}
        Assert-OG ($resumed.status -eq 'STOPPED' -and $resumed.stage -eq 'IMPLEMENT') "approved gate did not enter normal dispatch: $($resumed.status)/$($resumed.stage)"
        Assert-OG ($resumed.taskVersionId -eq $hold.state.taskVersionId -and $resumed.runId -eq $hold.state.runId) 'approved dispatch changed taskVersionId or runId'
        Assert-OG ((Get-LedgerState $hold.state.taskVersionId).state -eq 'RUNNING') 'approved ledger did not transition WAITING_HUMAN -> DISPATCHED -> RUNNING'
        Remove-DispatcherWorkspace $resumed.workspace
        Complete-OG 'exact task/version approval is resumable'
    }
    'stale-version' {
        $hold=Enter-OGLevelCHold
        $frozen=Get-Contract $hold.state.taskVersionId
        $stale=Freeze-Contract -TaskId 'OG-TASK' -PlanningHead $frozen.planningHead -SpecText 'different frozen specification' -AcceptanceText $frozen.acceptanceText -DeclaredScope @('work/') -Risk 'C' -Gate 'level-c-persistent-migration' -VerificationProfile 'C'
        New-SyntheticGateApproval -TaskVersionId $stale.taskVersionId -GateId 'level-c-persistent-migration' -RepoDir (Get-RepoRoot)|Out-Null
        $gate=Get-HumanGateStatus $hold.state.taskVersionId 'level-c-persistent-migration'
        Assert-OG (-not $gate.satisfied -and $gate.approval -eq 'STALE') "stale approval was not rejected: $($gate.approval)/$($gate.reason)"
        Assert-OG ((Get-LedgerState $hold.state.taskVersionId).state -eq 'WAITING_HUMAN') 'stale approval changed ledger state'
        Complete-OG 'same task with stale taskVersionId is rejected'
    }
    'another-task' {
        $hold=Enter-OGLevelCHold
        $frozen=Get-Contract $hold.state.taskVersionId
        $other=Freeze-Contract -TaskId 'OG-OTHER' -PlanningHead $frozen.planningHead -SpecText 'other task' -AcceptanceText 'AC1: other' -DeclaredScope @('work/') -Risk 'C' -Gate 'level-c-persistent-migration' -VerificationProfile 'C'
        New-SyntheticGateApproval -TaskVersionId $other.taskVersionId -GateId 'level-c-persistent-migration' -RepoDir (Get-RepoRoot)|Out-Null
        $gate=Get-HumanGateStatus $hold.state.taskVersionId 'level-c-persistent-migration'
        Assert-OG (-not $gate.satisfied -and $gate.approval -eq 'MISSING') "another task approval was not ignored: $($gate.approval)/$($gate.reason)"
        Complete-OG 'approval for another task is ignored'
    }
    'corrupt-approval' {
        $hold=Enter-OGLevelCHold
        $path=Get-HumanGatePath $hold.state.taskVersionId 'level-c-persistent-migration'
        New-Item -ItemType Directory -Force -Path (Split-Path $path)|Out-Null
        [System.IO.File]::WriteAllText($path,'{"taskId":',(New-Object System.Text.UTF8Encoding($false)))
        $gate=Get-HumanGateStatus $hold.state.taskVersionId 'level-c-persistent-migration'
        Assert-OG (-not $gate.satisfied -and $gate.approval -eq 'INVALID') "corrupt approval did not fail closed: $($gate.approval)/$($gate.reason)"
        $again=Invoke-RealDispatcherTask -Task $hold.task -TaskSource $hold.source
        Assert-OG ($again.status -eq 'WAITING_HUMAN' -and $again.gate.approval -eq 'INVALID') "dispatcher did not fail closed: $($again.status)/$($again.gate.approval)"
        Complete-OG 'corrupt approval fails closed'
    }
    'restart-recognition' {
        $hold=Enter-OGLevelCHold
        $approved=Invoke-OGApproval $hold
        Assert-OG ($approved.exitCode -eq 0) "approve failed: $($approved.output -join ' | ')"
        $ErrorActionPreference='Continue'
        $status=& $PS -NoProfile -ExecutionPolicy Bypass -File $Pilot status 2>&1
        $code=$LASTEXITCODE
        $ErrorActionPreference='Stop'
        Assert-OG ($code -eq 0 -and ($status -join "`n") -match 'approval = APPROVED') "fresh process did not recognize approval: $($status -join ' | ')"
        Complete-OG 'approval remains recognized after process restart'
    }
    'unrelated-guard' {
        $hold=Enter-OGLevelCHold
        $approved=Invoke-OGApproval $hold
        Assert-OG ($approved.exitCode -eq 0) "approve failed: $($approved.output -join ' | ')"
        $path=Get-OGTaskSourcePath
        $source=Get-Content -Raw -LiteralPath $path|ConvertFrom-Json
        $source.gates.G1.state='BLOCKED'
        [System.IO.File]::WriteAllText($path,($source|ConvertTo-Json -Depth 30),(New-Object System.Text.UTF8Encoding($false)))
        $result=Invoke-DispatcherLoop -RunOnce -TaskFile $path
        Assert-OG ($result.status -eq 'WAITING_HUMAN' -and $result.reason -match 'planning gate') "owner approval bypassed planning gate: $($result.status)/$($result.reason)"
        Assert-OG ((Get-Contract $hold.state.taskVersionId).declaredScope -contains 'work/') 'approval changed frozen contract scope'
        Complete-OG 'approval does not bypass planning gate or contract scope'
    }
    'lineage-preserved' {
        $hold=Enter-OGLevelCHold
        $before=Get-Contract $hold.state.taskVersionId
        [System.IO.File]::WriteAllText((Join-Path (Get-RepoRoot) 'README.md'),'fixture head advanced',(New-Object System.Text.UTF8Encoding($false)))
        & git add README.md
        & git commit -q -m 'advance authority head'
        $resolved=Resolve-DispatcherContract -Task $hold.task -TaskSource $hold.source -State $hold.state
        Assert-OG ($resolved.taskVersionId -eq $before.taskVersionId -and $resolved.planningHead -eq $before.planningHead) 'WAITING_HUMAN resume derived a new task lineage'
        $again=Invoke-RealDispatcherTask -Task $hold.task -TaskSource $hold.source
        Assert-OG ($again.taskVersionId -eq $hold.state.taskVersionId -and $again.runId -eq $hold.state.runId) 'repeated hold changed taskVersionId or runId'
        Complete-OG 'same frozen contract, taskVersionId, and runId are preserved'
    }
    'refuse-nonwaiting' {
        $source=Read-DispatcherTaskSource (Get-OGTaskSourcePath)
        $task=[hashtable]@($source.tasks)[0]
        $contract=New-DispatcherContract -Task $task -TaskSource $source
        Initialize-LedgerTask -TaskVersionId $contract.taskVersionId -Identity @{taskId=$task.taskId}|Out-Null
        Write-DispatcherState ([ordered]@{schemaVersion='orcivo.orchestration.v2.dispatch-state/1';runId=(New-RunId);taskId=$task.taskId;taskVersionId=$contract.taskVersionId;status='RUNNING';stage='IMPLEMENT';reason='';task=$task;taskSourceHash=$source.hash})|Out-Null
        $fake=@{source=$source;task=$task;state=(Get-DispatcherState)}
        $result=Invoke-OGApproval $fake
        Assert-OG ($result.exitCode -ne 0 -and ($result.output -join ' ') -match 'not WAITING_HUMAN') "command accepted non-waiting task: $($result.output -join ' | ')"
        Assert-OG (-not(Test-Path (Get-HumanGatePath $contract.taskVersionId 'level-c-persistent-migration'))) 'refused command wrote approval'
        Complete-OG 'command refuses non-WAITING_HUMAN task'
    }
    'refuse-version-mismatch' {
        $hold=Enter-OGLevelCHold
        $hold.state.taskVersionId=('f'*64)
        $result=Invoke-OGApproval $hold
        Assert-OG ($result.exitCode -ne 0 -and ($result.output -join ' ') -match 'does not match current frozen taskVersionId') "command accepted mismatched version: $($result.output -join ' | ')"
        $current=Get-DispatcherState
        Assert-OG (-not(Test-Path (Get-HumanGatePath $current.taskVersionId 'level-c-persistent-migration'))) 'version mismatch wrote approval'
        Complete-OG 'command refuses taskVersionId mismatch'
    }
    default { throw "unknown owner-gate probe '$Do'" }
}
