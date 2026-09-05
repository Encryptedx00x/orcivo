<#
run-owner-gate-tests.ps1 - durable owner-gate regression suite.
Every case runs in a disposable repository; no providers/models are invoked.
#>
param([switch]$KeepFixture)
$ErrorActionPreference = 'Stop'
$Here = $PSScriptRoot
$RepoRoot = ((& git -C $Here rev-parse --show-toplevel) -replace '/', '\').Trim()
$Probe = Join-Path $Here 'owner-gate-probe.ps1'
$PS = (Get-Command powershell.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$RealCfg = Join-Path $RepoRoot '.orchestration\v2\config.v2.json'
$RealSchemas = Join-Path $RepoRoot '.orchestration\v2\schemas'
$fixtures = New-Object System.Collections.Generic.List[string]

function New-OGFixture {
    $dir = Join-Path $env:TEMP ("owner-gate-fx-" + [guid]::NewGuid().ToString('N').Substring(0,10))
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $fixtures.Add($dir)
    Push-Location $dir
    try {
        & git init -q --initial-branch=main 2>$null
        if ($LASTEXITCODE -ne 0) { & git init -q; & git checkout -q -b main }
        & git config user.email owner-gate@local
        & git config user.name owner-gate
        & git config commit.gpgsign false
        & git config core.autocrlf false
        & git config core.safecrlf false
        New-Item -ItemType Directory -Force -Path '.orchestration\v2\schemas','.planning\product','work' | Out-Null
        Copy-Item -LiteralPath $RealCfg -Destination '.orchestration\v2\config.v2.json'
        Copy-Item (Join-Path $RealSchemas '*.json') '.orchestration\v2\schemas\'
        [System.IO.File]::WriteAllText((Join-Path $dir '.orch-v2-fixture'), 'disposable owner-gate fixture', (New-Object System.Text.UTF8Encoding($false)))
        [System.IO.File]::WriteAllText((Join-Path $dir '.gitignore'), ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n.orchestration/v2/schemas/*`n!.orchestration/v2/schemas/*.json`n.orch-v2-fixture`n", (New-Object System.Text.UTF8Encoding($false)))
        $source = [ordered]@{
            schemaVersion='orcivo.owner-gate-test/1'; batch='OWNER-GATE-TEST'; state='OWNER_APPROVED'; approvedBy='test-owner'; approvedAt='2026-09-05'
            gates=[ordered]@{G1=[ordered]@{kind='TEST';state='PASS'}}; phaseOrder=@('P1')
            tasks=@([ordered]@{
                taskId='OG-TASK';title='owner gate fixture';type='TEST';description='apply additive fixture migration';acceptance='AC1: gate controls dispatch'
                dependencies=@();scope=@('work/');risk='C';ownerGate='level-c-persistent-migration';blockedByGates=@('G1');candidateConstraints=[ordered]@{additiveOnly=$true}
                verificationProfile='C';phaseGate='P1';status='SCHEDULED'
            })
        }
        [System.IO.File]::WriteAllText((Join-Path $dir '.planning\product\owner-gate.tasks.json'), ($source | ConvertTo-Json -Depth 30), (New-Object System.Text.UTF8Encoding($false)))
        [System.IO.File]::WriteAllText((Join-Path $dir 'README.md'), 'fixture', (New-Object System.Text.UTF8Encoding($false)))
        & git add -A
        & git commit -q -m init
    } finally { Pop-Location }
    return $dir
}

function Invoke-OGCheck([string]$Name,[string]$Scenario) {
    $fixture = New-OGFixture
    $old = Get-Location
    try {
        Set-Location $fixture
        $ErrorActionPreference='Continue'
        $out = & $PS -NoProfile -ExecutionPolicy Bypass -File $Probe -Do $Scenario 2>&1
        $ErrorActionPreference='Stop'
        if ($LASTEXITCODE -eq 0 -and ($out -join "`n") -match 'PROBE_OK') {
            $script:pass++; Write-Host "PASS  $Name" -ForegroundColor Green
        } else {
            $script:fail++; Write-Host "FAIL  $Name" -ForegroundColor Red; Write-Host "      $($out -join ' | ')" -ForegroundColor DarkYellow
        }
    } finally { Set-Location $old }
}

$pass=0; $fail=0
Write-Host "`n=== Orcivo durable owner-gate tests (no models) ===`n" -ForegroundColor Cyan
Invoke-OGCheck 'OG-01 no approval + Level C -> WAITING_HUMAN' 'missing-approval'
Invoke-OGCheck 'OG-02 exact taskId + exact taskVersionId approval -> resumable' 'exact-approval'
Invoke-OGCheck 'OG-03 stale taskVersionId approval -> WAITING_HUMAN' 'stale-version'
Invoke-OGCheck 'OG-04 approval for another task -> ignored' 'another-task'
Invoke-OGCheck 'OG-05 malformed/corrupt approval -> fail closed' 'corrupt-approval'
Invoke-OGCheck 'OG-06 restart after approval -> remains recognized' 'restart-recognition'
Invoke-OGCheck 'OG-07 approval does not bypass unrelated guards' 'unrelated-guard'
Invoke-OGCheck 'OG-08 same task lineage is preserved' 'lineage-preserved'
Invoke-OGCheck 'OG-09 command refuses non-WAITING_HUMAN task' 'refuse-nonwaiting'
Invoke-OGCheck 'OG-10 command refuses taskVersionId mismatch' 'refuse-version-mismatch'
Write-Host "`n=== owner gate: $pass passed, $fail failed ===" -ForegroundColor $(if($fail){'Red'}else{'Green'})

if (-not $KeepFixture) {
    foreach($dir in $fixtures) {
        $full=[System.IO.Path]::GetFullPath($dir);$base=[System.IO.Path]::GetFullPath($env:TEMP)
        if($full.StartsWith($base,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $full) -like 'owner-gate-fx-*') { Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction SilentlyContinue }
    }
}
exit $fail
