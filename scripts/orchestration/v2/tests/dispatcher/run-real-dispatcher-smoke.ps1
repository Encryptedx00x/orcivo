<# Real paid-CLI smoke. Disposable repositories only; never points at Orcivo. #>
param(
    [ValidateSet('both','claude','codex')][string]$Direction = 'both',
    [switch]$KeepOnFailure
)
$ErrorActionPreference='Stop'
$V2=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$Pilot=Join-Path $V2 'pilot.ps1'
$Authority=[System.IO.Path]::GetFullPath((Join-Path $V2 '..\..\..'))
. (Join-Path $V2 'lib-v2.ps1')
$Root=Join-Path ([System.IO.Path]::GetTempPath()) ("orcivo-rd-real-"+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $Root|Out-Null
$results=@()
$succeeded=$false

function Write-Utf8([string]$Path,[string]$Text){$d=Split-Path -Parent $Path;if($d){New-Item -ItemType Directory -Force -Path $d|Out-Null};[System.IO.File]::WriteAllText($Path,$Text,(New-Object System.Text.UTF8Encoding($false)))}
function New-Fixture([string]$Name,[string]$Provider){
    $repo=Join-Path $Root "$Name-repo";$remote=Join-Path $Root "$Name-remote.git"
    & git init --bare --quiet $remote
    & git init -b main --quiet $repo
    Write-Utf8 (Join-Path $repo '.orch-v2-fixture') "disposable real CLI dispatcher fixture`n"
    Write-Utf8 (Join-Path $repo 'README.md') "dispatcher smoke fixture`n"
    Write-Utf8 (Join-Path $repo '.gitignore') ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n.orchestration/v2/schemas/*`n!.orchestration/v2/schemas/*.json`n"
    New-Item -ItemType Directory -Force -Path (Join-Path $repo '.orchestration\v2\schemas')|Out-Null
    Copy-Item (Join-Path $Authority '.orchestration\v2\config.v2.json') (Join-Path $repo '.orchestration\v2\config.v2.json')
    Copy-Item (Join-Path $Authority '.orchestration\v2\schemas\*.json') (Join-Path $repo '.orchestration\v2\schemas')
    $expected="$Provider-dispatched"
    $task=[ordered]@{schemaVersion='orcivo.dispatcher-smoke/1';batch="RD-$Name";state='OWNER_APPROVED';approvedBy='test-owner';approvedAt=(Get-Date).ToString('yyyy-MM-dd');gates=[ordered]@{G1=[ordered]@{kind='TEST';state='PASS'}};phaseOrder=@('P1');tasks=@([ordered]@{taskId="RD-$Name";title="Create the dispatcher proof file";type='TEST';description="Create work/result.txt containing exactly $expected followed by a newline. Do not change any other file.";acceptance="AC1: work/result.txt exists and contains exactly $expected followed by a newline";dependencies=@();scope=@('work/');risk='B';ownerGate='none';blockedByGates=@('G1');candidateConstraints=[ordered]@{onlyFile='work/result.txt';exactText=$expected};verificationProfile='B';phaseGate='P1';status='SCHEDULED'})}
    Write-Utf8 (Join-Path $repo 'tasks.json') ($task|ConvertTo-Json -Depth 20)
    & git -C $repo add .
    & git -C $repo -c user.name='dispatcher-smoke' -c user.email='smoke@local' commit -m 'test: initialize dispatcher fixture' --quiet
    & git -C $repo remote add origin $remote
    & git -C $repo push -u origin main --quiet
    return @{repo=$repo;taskFile=(Join-Path $repo 'tasks.json');expected=$expected;provider=$Provider}
}
function Invoke-Smoke($f){
    $stdout=Join-Path $Root "$($f.provider)-dispatcher.stdout.log";$stderr=Join-Path $Root "$($f.provider)-dispatcher.stderr.log"
    $pwsh=(Get-Command powershell.exe -CommandType Application -ErrorAction Stop|Select-Object -First 1).Source
    $proc=Invoke-NativeCaptured -Exe $pwsh -Arguments @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Pilot,'run-once','-TaskFile',$f.taskFile,'-ProviderOverride',$f.provider) -WorkingDirectory $f.repo -StdoutLog $stdout -StderrLog $stderr -TimeoutSec 1800
    if($proc.exitCode -ne 0){throw "dispatcher $($f.provider) smoke failed ($($proc.exitCode)):`n$($proc.stdout)`n$($proc.stderr)"}
    $state=Get-Content -Raw (Join-Path $f.repo '.orchestration\v2\dispatcher\current.json')|ConvertFrom-Json
    $expectedReviewer=$(if($f.provider -eq 'claude'){'codex'}else{'claude'})
    $impl=@($state.providerHistory|Where-Object{$_.role -in @('IMPLEMENTER','CORRECTOR')})
    $reviews=@($state.providerHistory|Where-Object{$_.role -eq 'REVIEWER'})
    if($state.status -ne 'PUBLISHED'){throw "status $($state.status), expected PUBLISHED: $($state.reason)"}
    $published=(& git -C $f.repo show "origin/main:work/result.txt" 2>$null)-join "`n"
    if($published.Trim() -ne $f.expected){throw "published content '$published' != '$($f.expected)'"}
    if($impl.Count -lt 1 -or $impl[0].provider -ne $f.provider){throw 'real implementer invocation provenance missing'}
    if($reviews.Count -lt 1 -or $reviews[-1].provider -ne $expectedReviewer){throw 'opposite-provider reviewer provenance missing'}
    if($reviews[-1].invocationId -eq $impl[0].invocationId){throw 'reviewer reused implementer invocation'}
    if($state.integration.pushed -ne $true){throw 'integrator did not prove push'}
    $remoteTree=(& git -C $f.repo rev-parse 'origin/main^{tree}').Trim()
    if($remoteTree -ne $state.candidateTree){throw "published remote tree $remoteTree != reviewed candidate tree $($state.candidateTree)"}
    return [ordered]@{direction="$($f.provider)-to-$expectedReviewer";status=$state.status;implementerInvocation=$impl[0].invocationId;reviewerInvocation=$reviews[-1].invocationId;candidate=$state.candidateHead;published=$state.integration.mergeCommit;remote=$state.integration.targetAfter}
}

try{
    if($Direction -in @('both','claude')){$results+=Invoke-Smoke (New-Fixture 'CLAUDE-IMPL' 'claude')}
    if($Direction -in @('both','codex')){$results+=Invoke-Smoke (New-Fixture 'CODEX-IMPL' 'codex')}
    $results|ConvertTo-Json -Depth 10
    Write-Host "REAL_DISPATCHER_SMOKE: PASS ($($results.Count)/$($results.Count))" -ForegroundColor Green
    $succeeded=$true
}finally{
    $base=[System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath());$full=[System.IO.Path]::GetFullPath($Root)
    if(($succeeded -or -not $KeepOnFailure) -and $full.StartsWith($base,[System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $full) -like 'orcivo-rd-real-*'){Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction SilentlyContinue}
    elseif(-not $succeeded){Write-Warning "preserved failed disposable fixture for diagnosis: $Root"}
}
