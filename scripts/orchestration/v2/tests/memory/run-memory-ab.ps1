<#
run-memory-ab.ps1 - ONE representative cross-provider continuity task, run with
and without the ai-memory adapter, both handoff directions. Real Claude + Codex
CLI calls. Disposable fixtures only; never points at Orcivo.

Scenario: a prior architectural decision ("all HTTP clients use a 30000 ms
request timeout; do not introduce other values") was recorded by provider X into
ai-memory. A fresh provider Y then implements a new HTTP client. WITHOUT memory,
Y has no way to know the standard. WITH memory, memoryBootstrap injects it.

Measured per arm: PUBLISHED, DECISION_RECALL (uses 30000), CONTRADICTION
(introduces a different timeout number), injected chars, wall time, review cycles.

  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/orchestration/v2/tests/memory/run-memory-ab.ps1 -MemoryUrl http://127.0.0.1:49375
#>
param(
    # Defaults to the live ai-memory (2.0.2 on :49374). This is the LARGE A/B from
    # the evaluation; it makes real Claude+Codex calls. Not part of routine
    # regression - run it only for a deliberate re-measurement.
    [string]$MemoryUrl = 'http://127.0.0.1:49374',
    [ValidateSet('both','claude-to-codex','codex-to-claude')][string]$Directions = 'both',
    [switch]$KeepFixtures
)
$ErrorActionPreference = 'Stop'
$V2 = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$Pilot = Join-Path $V2 'pilot.ps1'
$Authority = [System.IO.Path]::GetFullPath((Join-Path $V2 '..\..\..'))
. (Join-Path $V2 'lib-v2.ps1')

$Root = Join-Path ([System.IO.Path]::GetTempPath()) ("orcivo-mem-ab-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $Root | Out-Null
$STD = '30000'

function Write-Utf8([string]$Path,[string]$Text){ $d=Split-Path -Parent $Path; if($d){New-Item -ItemType Directory -Force -Path $d|Out-Null}; [System.IO.File]::WriteAllText($Path,$Text,(New-Object System.Text.UTF8Encoding($false))) }

function Mcp([string]$Tool,[hashtable]$Arguments){
    $body = @{ jsonrpc='2.0'; id=1; method='tools/call'; params=@{ name=$Tool; arguments=$Arguments } } | ConvertTo-Json -Depth 12 -Compress
    $r = Invoke-WebRequest -Uri "$MemoryUrl/mcp" -Method Post -ContentType 'application/json' -Headers @{ Accept='application/json, text/event-stream' } -Body $body -TimeoutSec 10 -UseBasicParsing
    $t = ($r.Content -split "`n" | Where-Object { $_ -and $_ -notmatch '^event:' } | ForEach-Object { $_ -replace '^data: ','' }) -join "`n"
    ($t | ConvertFrom-Json)
}

function Seed-Decision([string]$Project,[string]$ByProvider){
    $body = @"
---
type: decision
tier: durable
by: $ByProvider
at: 2026-09-02
---

**ORCIVO HTTP CLIENT STANDARD.** Every HTTP client in this codebase MUST use a
request timeout of $STD ms ($([int]$STD/1000) seconds). This was measured against the
downstream API p99 (22s) plus margin. Do NOT introduce any other timeout value
(no 5000, no 10000, no 60000, no "no timeout"). New clients reuse $STD.
"@
    $w = Mcp 'memory_write_page' @{ path='decisions/http-client-timeout.md'; title='HTTP client timeout standard'; body=$body; pinned=$true; project=$Project; workspace='default' }
    Start-Sleep -Milliseconds 500
    $check = Mcp 'memory_query' @{ query='HTTP client timeout standard 30000'; project=$Project; workspace='default'; limit=3 }
    if (@($check.hits).Count -eq 0) { throw "seed verification failed: decision page not queryable in project '$Project' (write result: $($w | ConvertTo-Json -Compress))" }
    Write-Host "seeded + verified decision in '$Project' (by $ByProvider), $(@($check.hits).Count) hit(s)"
}

function New-Fixture([string]$Name,[string]$ImplProvider,[bool]$MemoryEnabled,[string]$Project){
    $repo = Join-Path $Root "$Name-repo"; $remote = Join-Path $Root "$Name-remote.git"
    & git init --bare --quiet $remote
    & git init -b main --quiet $repo
    Write-Utf8 (Join-Path $repo '.orch-v2-fixture') "disposable memory A/B fixture`n"
    Write-Utf8 (Join-Path $repo 'README.md') "memory A/B fixture`n"
    Write-Utf8 (Join-Path $repo '.gitignore') ".orchestration/v2/*`n!.orchestration/v2/config.v2.json`n!.orchestration/v2/schemas/`n.orchestration/v2/schemas/*`n!.orchestration/v2/schemas/*.json`n"
    New-Item -ItemType Directory -Force -Path (Join-Path $repo '.orchestration\v2\schemas') | Out-Null
    $cfg = Get-Content -Raw (Join-Path $Authority '.orchestration\v2\config.v2.json') | ConvertFrom-Json
    $cfg.memoryAdapter.enabled = $MemoryEnabled
    $cfg.memoryAdapter.script  = 'scripts/orchestration/v2/memory-eval-adapter.ps1'
    $cfg.memoryAdapter.baseUrl = $MemoryUrl
    $cfg.memoryAdapter.project = $Project
    ($cfg | ConvertTo-Json -Depth 40) | Set-Content -LiteralPath (Join-Path $repo '.orchestration\v2\config.v2.json') -Encoding utf8
    Copy-Item (Join-Path $Authority '.orchestration\v2\schemas\*.json') (Join-Path $repo '.orchestration\v2\schemas')
    $desc = "Create lib/client.js. It must export function makeClient() returning an object with a numeric `timeoutMs` property and a `get(url)` method that performs an HTTP GET honouring that timeout. Use the project's established standard request timeout value. Keep it tiny, no dependencies, Node 18+ builtin fetch is fine."
    $task = [ordered]@{
        schemaVersion='orcivo.dispatcher-smoke/1'; batch="MEMAB-$Name"; state='OWNER_APPROVED'; approvedBy='memory-ab-harness'; approvedAt=(Get-Date).ToString('yyyy-MM-dd')
        gates=[ordered]@{ G1=[ordered]@{ kind='TEST'; state='PASS' } }; phaseOrder=@('P1')
        tasks=@([ordered]@{
            taskId="MEMAB-$Name"; title='New HTTP client using the project standard timeout'; type='FEATURE'
            description=$desc
            acceptance='AC1: lib/client.js exists and exports makeClient(); AC2: makeClient().timeoutMs is a number; AC3: the timeout value matches the project standard already established for HTTP clients'
            dependencies=@(); scope=@('lib/'); risk='B'; ownerGate='none'; blockedByGates=@('G1')
            candidateConstraints=[ordered]@{ onlyDir='lib/'; noNewDependencies=$true }
            verificationProfile='B'; phaseGate='P1'; status='SCHEDULED'
        })
    }
    Write-Utf8 (Join-Path $repo 'tasks.json') ($task | ConvertTo-Json -Depth 20)
    & git -C $repo add .
    & git -C $repo -c user.name='mem-ab' -c user.email='ab@local' commit -m 'test: init memory A/B fixture' --quiet
    & git -C $repo remote add origin $remote
    & git -C $repo push -u origin main --quiet
    return @{ repo=$repo; taskFile=(Join-Path $repo 'tasks.json'); provider=$ImplProvider; memoryEnabled=$MemoryEnabled; project=$Project; name=$Name }
}

function Run-Arm($f){
    $stdout = Join-Path $Root "$($f.name).stdout.log"; $stderr = Join-Path $Root "$($f.name).stderr.log"
    $pwsh = (Get-Command powershell.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $t0 = Get-Date
    $proc = Invoke-NativeCaptured -Exe $pwsh -Arguments @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Pilot,'run-once','-TaskFile',$f.taskFile,'-ProviderOverride',$f.provider) -WorkingDirectory $f.repo -StdoutLog $stdout -StderrLog $stderr -TimeoutSec 1800
    $wall = [Math]::Round(((Get-Date) - $t0).TotalSeconds,1)
    $state = $null
    $sp = Join-Path $f.repo '.orchestration\v2\dispatcher\current.json'
    if (Test-Path $sp) { $state = Get-Content -Raw $sp | ConvertFrom-Json }
    $published = ''
    try { $published = (& git -C $f.repo show 'origin/main:lib/client.js' 2>$null) -join "`n" } catch {}
    $nums = @([regex]::Matches($published, '\b\d{4,6}\b') | ForEach-Object { $_.Value } | Select-Object -Unique)
    [ordered]@{
        arm            = $f.name
        memoryEnabled  = $f.memoryEnabled
        implementer    = $f.provider
        status         = "$($state.status)"
        wallSec        = $wall
        exitCode       = $proc.exitCode
        reviewCycles   = [int]$state.cycle
        memRetrieved   = [int]$state.memoryRetrievedCount
        memInjectedChars = [int]$state.memoryInjectedChars
        publishedBytes = $published.Length
        timeoutNumbers = $nums
        decisionRecall = [bool]($published -match "\b$STD\b")
        contradiction  = [bool](@($nums | Where-Object { $_ -ne $STD }).Count -gt 0)
        clientExcerpt  = ($published -split "`n" | Select-Object -First 12) -join " | "
    }
}

$plan = @()
if ($Directions -in @('both','claude-to-codex')) { $plan += @{ dir='claude-to-codex'; by='claude'; impl='codex' } }
if ($Directions -in @('both','codex-to-claude')) { $plan += @{ dir='codex-to-claude'; by='codex'; impl='claude' } }

$results = @()
try {
    foreach ($p in $plan) {
        $projA = "ab-$($p.dir)-nomem"; $projB = "ab-$($p.dir)-mem"
        # arm B needs the decision seeded; arm A gets its own empty project so nothing can leak in
        Seed-Decision -Project $projB -ByProvider $p.by
        Mcp 'memory_write_page' @{ path='_seed.md'; title='seed'; body='empty control project'; project=$projA; workspace='default' } | Out-Null
        $fa = New-Fixture "$($p.dir)-A-nomem" $p.impl $false $projA
        $fb = New-Fixture "$($p.dir)-B-mem"   $p.impl $true  $projB
        $results += (Run-Arm $fa)
        $results += (Run-Arm $fb)
    }
    $out = [ordered]@{ generatedAt=(Get-Date).ToString('o'); memoryUrl=$MemoryUrl; standard=$STD; arms=$results }
    $out | ConvertTo-Json -Depth 12
    $reportPath = Join-Path $Authority '.orchestration\v2\logs\memory-ab-result.json'
    Write-Utf8 $reportPath ($out | ConvertTo-Json -Depth 12)
    Write-Host "MEMORY_AB_RESULT written to $reportPath" -ForegroundColor Green
} finally {
    if (-not $KeepFixtures) {
        $base=[System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()); $full=[System.IO.Path]::GetFullPath($Root)
        if ($full.StartsWith($base,[System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $full) -like 'orcivo-mem-ab-*') { Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction SilentlyContinue }
    } else { Write-Host "fixtures kept: $Root" }
}
