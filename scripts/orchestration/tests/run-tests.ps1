<#
run-tests.ps1 - V1 PRIMITIVE regression suite (LEGACY_REJECTED_REFERENCE_ONLY).

The V1 supervisor's run/loop/cleanup/merge pipeline was rejected by two
independent reviews and is permanently disabled - there is no env-var override
(NC-01). This suite therefore keeps ONLY the primitive/reconciliation checks that
still guard shared logic and only exercises the inspection verbs that remain
available (index / next / recover / status): redaction, failure classification,
scope-conflict, index reconciliation, reconcile validation, dependency gating,
crash-recovery reporting, status. The behavioural run/loop/merge cases were
removed because the code path they tested no longer exists.

  powershell -NoProfile -File scripts\orchestration\tests\run-tests.ps1
#>
param([switch]$KeepFixtures)

$ErrorActionPreference = 'Stop'
$Here       = $PSScriptRoot
$ScriptsDir    = Split-Path -Parent $Here
$RepoRoot   = ((& git -C $Here rev-parse --show-toplevel) -replace '/', '\').Trim()
$RealConfig = Join-Path $RepoRoot '.orchestration\config.json'
$Lib        = Join-Path $ScriptsDir 'lib.ps1'
$Reconcile  = Join-Path $ScriptsDir 'reconcile.ps1'
$Supervisor = Join-Path $ScriptsDir 'supervisor.ps1'
$FakeAgent  = Join-Path $Here 'fake-agent.ps1'
$PS         = (Get-Command powershell).Source

$script:pass = 0; $script:fail = 0; $script:results = @()
function Check([string]$Name, [scriptblock]$Body) {
    try {
        & $Body
        $script:pass++; $script:results += "PASS  $Name"; Write-Host "PASS  $Name" -ForegroundColor Green
    } catch {
        $script:fail++; $script:results += "FAIL  $Name :: $($_.Exception.Message)"
        Write-Host "FAIL  $Name" -ForegroundColor Red
        Write-Host "      $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}
function Assert([bool]$Cond, [string]$Msg) { if (-not $Cond) { throw $Msg } }
function AssertMatch([string]$Text, [string]$Rx, [string]$Msg) { if ($Text -notmatch $Rx) { throw "$Msg (no match /$Rx/)" } }

# --- fixture repo --------------------------------------------------------
$script:fixtures = @()
function New-Fixture {
    param([int]$MaxParallel = 1, [bool]$ReviewEnabled = $true, [bool]$MergeEnabled = $true, [bool]$WithPlanning = $false)
    $dir = Join-Path $env:TEMP ("orch-fx-" + [guid]::NewGuid().ToString('N').Substring(0, 10))
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $script:fixtures += $dir
    Push-Location $dir
    try {
        git init -q --initial-branch=main 2>$null; if ($LASTEXITCODE -ne 0) { git init -q; git checkout -q -b main }
        git config user.email t@t; git config user.name t; git config commit.gpgsign false
        New-Item -ItemType Directory -Force -Path (Join-Path $dir 'poc') | Out-Null
        New-Item -ItemType Directory -Force -Path (Join-Path $dir '.orchestration\queue') | Out-Null
        Set-Content -LiteralPath (Join-Path $dir '.gitignore') -Value ".orchestration/*`n!.orchestration/config.json`nsv-out-*`n" -Encoding ascii

        $check = @'
import { existsSync, readFileSync } from 'node:fs';
const f = 'poc/poc-artifact.md';
if (!existsSync(f)) { console.error('FAIL missing ' + f); process.exit(1); }
const b = readFileSync(f, 'utf8');
const req = ['## Intro', '## Body', '## Conclusion'];
const miss = req.filter((h) => !b.includes(h));
if (miss.length) { console.error('FAIL missing ' + miss.join(',')); process.exit(1); }
console.log('PASS'); process.exit(0);
'@
        Set-Content -LiteralPath (Join-Path $dir 'poc\check.mjs') -Value $check -Encoding ascii

        $cfg = Get-Content -Raw -LiteralPath $RealConfig | ConvertFrom-Json
        $cfg.scheduler.maxParallel = $MaxParallel
        $cfg.scheduler.idleSleepSec = 1; $cfg.scheduler.blockedSleepSec = 1; $cfg.scheduler.humanGateSleepSec = 1
        $cfg.review.enabled = $ReviewEnabled
        $cfg.merge.enabled = $MergeEnabled
        $cfg.merge.pushAfterMerge = $false
        $cfg.checks = [pscustomobject]@{ 'poc-artifact' = [pscustomobject]@{ cmd = 'node'; args = @('poc/check.mjs'); cwd = '.'; failureClass = 'CHECK_FAILURE' } }
        $cfg.checkProfiles = [pscustomobject]@{ poc = @('poc-artifact') }
        ($cfg | ConvertTo-Json -Depth 30) | Set-Content -LiteralPath (Join-Path $dir '.orchestration\config.json') -Encoding utf8

        if ($WithPlanning) { New-Item -ItemType Directory -Force -Path (Join-Path $dir '.planning\phases') | Out-Null }
        git add -A; git commit -q -m init
    } finally { Pop-Location }
    return $dir
}

function Add-QueueTask {
    param([string]$Fix, [string]$TaskId, [hashtable]$Props)
    $t = @{ taskId = $TaskId; scope = @('poc'); scopes = @("poc/$TaskId"); objective = "Create poc/poc-artifact.md with ## Intro, ## Body and ## Conclusion."; checkProfile = 'poc'; status = 'READY'; primaryProvider = 'claude'; dependencies = @(); planDependencies = @(); priority = 50 }
    if ($Props) { foreach ($k in $Props.Keys) { $t[$k] = $Props[$k] } }
    ($t | ConvertTo-Json -Depth 10) | Set-Content -LiteralPath (Join-Path $Fix ".orchestration\queue\$TaskId.json") -Encoding utf8
}

function Invoke-Child {
    # run a script in a REAL child powershell with cwd = $Fix (true process cwd, so
    # git rev-parse --show-toplevel resolves to the fixture, never the real repo)
    param([string]$Fix, [string]$Script, [string[]]$ScriptArgs, [hashtable]$EnvVars)
    $saved = @{}
    # this suite is the frozen regression baseline for the REJECTED V1 supervisor;
    # it drives run/loop/cleanup against throwaway fixtures only.
    $base = @{ ORCH_FAKE_AGENT = $FakeAgent; ORCH_V1_REGRESSION_HARNESS = '1' }
    if ($EnvVars) { foreach ($k in $EnvVars.Keys) { $base[$k] = $EnvVars[$k] } }
    foreach ($k in @($base.Keys)) { $saved[$k] = [Environment]::GetEnvironmentVariable($k); [Environment]::SetEnvironmentVariable($k, $base[$k]) }
    $o = Join-Path $env:TEMP ("sv-out-" + [guid]::NewGuid().ToString('N').Substring(0,8) + ".txt")
    try {
        $al = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Script) + $ScriptArgs
        $p = Start-Process -FilePath $PS -ArgumentList $al -WorkingDirectory $Fix -NoNewWindow -PassThru -Wait `
             -RedirectStandardOutput $o -RedirectStandardError "$o.err"
        $out = ''
        foreach ($f in @($o, "$o.err")) { if (Test-Path $f) { $out += (Get-Content -Raw -LiteralPath $f) } }
        return [pscustomobject]@{ out = $out; code = $p.ExitCode }
    } finally {
        Remove-Item -LiteralPath $o, "$o.err" -Force -ErrorAction SilentlyContinue
        foreach ($k in @($saved.Keys)) { [Environment]::SetEnvironmentVariable($k, $saved[$k]) }
    }
}
function RunSup    { param([string]$Fix, [string[]]$SvArgs, [hashtable]$EnvVars) Invoke-Child $Fix $Supervisor $SvArgs $EnvVars }
function MergePs { param([string]$Fix, [string]$RunId, [hashtable]$EnvVars) Invoke-Child $Fix (Join-Path $ScriptsDir 'merge.ps1') @('-RunId', $RunId) $EnvVars }

function Get-Index { param([string]$Fix) Get-Content -Raw -LiteralPath (Join-Path $Fix '.orchestration\execution-index.json') | ConvertFrom-Json }
function Get-Run   { param([string]$Fix, [string]$RunId) Get-Content -Raw -LiteralPath (Join-Path $Fix ".orchestration\runs\$RunId\run.json") | ConvertFrom-Json }
function Get-Runs  { param([string]$Fix) Get-ChildItem (Join-Path $Fix '.orchestration\runs') -Directory -ErrorAction SilentlyContinue | ForEach-Object { Get-Run $Fix $_.Name } }

Write-Host "`n=== Orcivo orchestration test suite ===`n" -ForegroundColor Cyan

# ======================================================================
# UNIT - pure library functions (real lib, real config)
# ======================================================================
. $Lib

Check 'redaction: secrets, headers, env dump, prose preserved' {
    $blob = @"
Normal log line describing the run.
Authorization: Bearer abc123def456ghi789jkl
ANTHROPIC_API_KEY=sk-ant-0123456789abcdef0123456789
DATABASE_URL=postgres://user:s3cr3t@db.host:5432/orcivo
token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123
Set-Cookie: session=deadbeefdeadbeef; HttpOnly
A_SECRET=hunter2hunter2
FOO=1
BAR=2
BAZ=3
QUX=4
ZIP=5
ZAP=6
ZOP=7
done successfully
"@
    $r = Protect-Secrets $blob
    Assert ($r -match 'Normal log line')         'prose dropped'
    Assert ($r -match 'done successfully')        'trailing prose dropped'
    Assert ($r -notmatch 'abc123def456ghi789')   'bearer not redacted'
    Assert ($r -notmatch 'sk-ant-0123456789')    'api key not redacted'
    Assert ($r -notmatch 's3cr3t')               'db password not redacted'
    Assert ($r -notmatch 'eyJhbGciOiJIUzI1NiJ9\.eyJ') 'jwt not redacted'
    Assert ($r -notmatch 'hunter2hunter2')       '_SECRET value not redacted'
    Assert ($r -match 'env-style lines withheld') 'env dump not collapsed'
}

Check 'failure classification: provider vs local vs unknown' {
    Assert ((Get-FailureClass claude 1 '' 'Your credit balance is too low. insufficient_quota') -eq 'PROVIDER_QUOTA') 'quota'
    Assert ((Get-FailureClass claude 1 '' 'API error 429 rate_limit_error retry after 30s') -eq 'PROVIDER_RATE_LIMIT') 'rate'
    Assert ((Get-FailureClass claude 1 '' 'authentication_error: invalid api key, please run /login') -eq 'PROVIDER_AUTH_EXPIRED') 'auth'
    Assert ((Get-FailureClass claude 1 '' 'Anthropic API error 503 overloaded_error') -eq 'PROVIDER_TEMP_UNAVAILABLE') 'temp'
    Assert ((Get-FailureClass claude 1 '' 'panic: runtime error: index out of range') -eq 'UNKNOWN') 'unknown != agent_error'
    Assert ((Get-FailureClass claude 0 'HUMAN_GATE: needs DB' '') -eq 'HUMAN_GATE') 'human gate from stdout'
    Assert ((Get-FailureClass claude 0 'all good' '') -eq 'OK') 'ok'
    Assert (-not (Test-IsProviderFailure 'UNKNOWN')) 'UNKNOWN must not fail over'
    Assert (Test-IsProviderFailure 'PROVIDER_QUOTA') 'quota must fail over'
}

Check 'scope conflict: prove independence or serialize' {
    $a = @{ task_id = 'A'; risk = 'B'; humanGate = $false; scopes = @('apps/web/customers'); dependencies = @() }
    $b = @{ task_id = 'B'; risk = 'B'; humanGate = $false; scopes = @('apps/web/quotes');    dependencies = @() }
    $c = @{ task_id = 'C'; risk = 'B'; humanGate = $false; scopes = @('apps/web/customers/detail'); dependencies = @() }
    $d = @{ task_id = 'D'; risk = 'B'; humanGate = $false; scopes = @('prisma/schema.prisma'); dependencies = @() }
    $e = @{ task_id = 'E'; risk = 'C'; humanGate = $false; scopes = @('apps/mobile/x'); dependencies = @() }
    $f = @{ task_id = 'F'; risk = 'B'; humanGate = $false; scopes = @(); dependencies = @() }
    Assert (Test-CanRunTogether $a $b)       'disjoint non-shared scopes should run together'
    Assert (-not (Test-CanRunTogether $a $c))'overlapping scopes must serialize'
    Assert (-not (Test-CanRunTogether $a $d))'shared schema surface must serialize'
    Assert (-not (Test-CanRunTogether $a $e))'Level C must serialize'
    Assert (-not (Test-CanRunTogether $a $f))'unknown scope cannot be proven independent'
}

# ======================================================================
# RECONCILE - fixture .planning trees
# ======================================================================
function Write-Plan {
    param([string]$Fix, [string]$Phase, [string]$Plan, [string]$Wave, [string]$DependsOn, [string]$SecCrit, [string[]]$Tasks, [string]$FrontStatus = 'pending')
    $dir = Join-Path $Fix ".planning\phases\$Phase-x"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $rows = ($Tasks | ForEach-Object { "| $_ |" }) -join "`n"
    $body = @"
---
phase: "$Phase"
plan: "$Plan"
wave: $Wave
status: $FrontStatus
depends_on: [$DependsOn]
security_critical: $SecCrit
---

# $Phase-$Plan

## Arquivos provveis
- ``apps/web/$Plan`` e ``apps/backend/src/$Plan``

## Tarefas

| ID | Classe | Tarefa | Entregvel |
|---|---|---|---|
$rows

## Testes automticos
- suite $Plan

## Testes humanos
- passo manual
"@
    Set-Content -LiteralPath (Join-Path $dir "$Phase-$Plan-PLAN.md") -Value $body -Encoding utf8
}
function Write-Summary {
    param([string]$Fix, [string]$Phase, [string]$Plan, [string[]]$Rows, [string]$FrontStatus = 'in_progress')
    $dir = Join-Path $Fix ".planning\phases\$Phase-x"
    $r = ($Rows | ForEach-Object { "| $_ |" }) -join "`n"
    $body = @"
---
phase: "$Phase"
plan: "$Plan"
status: $FrontStatus
---
# $Phase-$Plan Summary

| ID | Estado | Nota |
|---|---|---|
$r
"@
    Set-Content -LiteralPath (Join-Path $dir "$Phase-$Plan-SUMMARY.md") -Value $body -Encoding utf8
}

Check 'index reconciliation: status from SUMMARY, deps, human gate, evidence' {
    $fx = New-Fixture -WithPlanning $true
    Write-Plan $fx '10' 'P01' 1 '' 'false' @(
        'T01 | SAFE_AUTO | inventariar rotas | matriz',
        'T02 | SAFE_AUTO | aplicar guard | guard testado')
    Write-Summary $fx '10' 'P01' @(
        'T01 | done | ``docs/matrix.md`` criado',
        'T02 | done | ``guard.ts`` + spec verde') 'complete'
    Write-Plan $fx '10' 'P02' 2 '"P01"' 'true' @(
        'T01 | SAFE_AUTO | tenant guard global | guard',
        'T02 | HUMAN_APPROVAL | aplicar migration em DB persistente | plano aprovado')
    Write-Summary $fx '10' 'P02' @(
        'T01 | done | ``tenant.guard.ts`` + isolation spec verde',
        'T02 | HUMAN_APPROVAL | aguardando gate')
    $null = RunSup $fx @('index')
    $idx = Get-Index $fx
    Assert ($idx.reconciled -eq $true) "not reconciled: $($idx.errors -join '; ')"
    $t = @{}; $idx.tasks | ForEach-Object { $t[$_.task_id] = $_ }
    Assert ($t['10-P01-T01'].status -eq 'DONE')          'P01-T01 should be DONE'
    Assert ($t['10-P02-T01'].status -eq 'DONE')          'P02-T01 should be DONE'
    Assert ($t['10-P02-T02'].status -eq 'WAITING_HUMAN') 'P02-T02 should be WAITING_HUMAN'
    Assert ($t['10-P02-T02'].humanGate -eq $true)        'P02-T02 humanGate flag'
    Assert ((@($t['10-P02-T01'].planDependencies)) -contains '10-P01') 'P02 planDependencies -> 10-P01'
    Assert ((@($t['10-P02-T02'].dependencies)) -contains '10-P02-T01') 'in-plan predecessor dep'
}

Check 'reconcile validation: cycle / missing dep / task-missing / status-impossible / no-evidence' {
    $fx = New-Fixture -WithPlanning $true
    # missing dependency + DONE-without-evidence + summary references unknown task
    Write-Plan $fx '20' 'P01' 1 '"P99"' 'false' @('T01 | SAFE_AUTO | do a thing | thing')
    Write-Summary $fx '20' 'P01' @('T01 | done | (no evidence)', 'T09 | done | ghost task')
    # status-impossible: plan frontmatter says complete but a task has no summary row -> PENDING
    Write-Plan $fx '20' 'P02' 2 '"P01"' 'false' @('T01 | SAFE_AUTO | shipped work | x', 'T02 | SAFE_AUTO | never done | y') 'complete'
    Write-Summary $fx '20' 'P02' @('T01 | done | ``a.ts`` shipped') 'in_progress'
    # ran-ahead warning: P05-T01 DONE while its plan-dep P01 is not resolved
    Write-Plan $fx '20' 'P05' 3 '"P01"' 'false' @('T01 | SAFE_AUTO | dependent work | z')
    Write-Summary $fx '20' 'P05' @('T01 | done | ``b.ts`` shipped and tested')
    # cycle
    Write-Plan $fx '20' 'P03' 3 '"P04"' 'false' @('T01 | SAFE_AUTO | c | c')
    Write-Plan $fx '20' 'P04' 3 '"P03"' 'false' @('T01 | SAFE_AUTO | d | d')
    $r = RunSup $fx @('index')
    $idx = Get-Index $fx
    Assert ($idx.reconciled -eq $false) 'should not reconcile'
    $errs = ($idx.errors -join ' | ')
    AssertMatch $errs 'dependency-missing.*P99'      'missing dependency not flagged'
    AssertMatch $errs 'task-missing.*T09'            'ghost summary task not flagged'
    AssertMatch $errs 'cycle'                        'cycle not detected'
    AssertMatch $errs 'status-impossible.*20-P02'    'status-impossible (complete plan, PENDING task) not detected'
    $warns = ($idx.warnings -join ' | ')
    AssertMatch $warns 'needs-reconcile.*20-P01-T01' 'no-evidence task not marked NEEDS_RECONCILE'
    AssertMatch $warns 'ran-ahead.*20-P05'          'ran-ahead cross-check not emitted'
    AssertMatch $r.out 'not reconciled'              'index command should announce non-reconciled'
}

Check 'dependency gating: task blocked until its dependency is DONE' {
    $fx = New-Fixture
    Add-QueueTask $fx 'DEP-A' @{ status = 'READY' }
    Add-QueueTask $fx 'DEP-B' @{ status = 'READY'; dependencies = @('DEP-A') }
    $r = RunSup $fx @('next')
    AssertMatch $r.out 'DEP-A' 'should pick the unblocked task'
    Assert ($r.out -notmatch 'DEP-B') 'must not pick the blocked task'
    # complete A, then B becomes selectable
    (Get-Content -Raw (Join-Path $fx '.orchestration\queue\DEP-A.json') | ConvertFrom-Json) |
        ForEach-Object { $_.status = 'DONE'; ($_ | ConvertTo-Json) | Set-Content (Join-Path $fx '.orchestration\queue\DEP-A.json') }
    $r2 = RunSup $fx @('next')
    AssertMatch $r2.out 'DEP-B' 'B should be selectable once A is DONE'
}

Check 'crash recovery: orphan lock + interrupted run detected, dirty work preserved' {
    $fx = New-Fixture
    # fabricate an interrupted run: worktree with a dead pid, a lock, an uncommitted file
    $rid = 'CR-1-20260101000000'; $br = "orch/$rid"; $wt = ".orchestration/worktrees/$rid"
    $base = (git -C $fx rev-parse HEAD).Trim()
    git -C $fx worktree add -q -b $br $wt $base
    Set-Content -LiteralPath (Join-Path $fx "$wt/poc/wip.txt") -Value 'unsaved work' -Encoding ascii
    New-Item -ItemType Directory -Force -Path (Join-Path $fx ".orchestration\runs\$rid") | Out-Null
    @{ runId = $rid; taskId = 'CR-1'; status = 'RUNNING'; provider = 'claude'; pid = 999999; baseSha = $base; branch = $br; worktreePath = (Join-Path $fx $wt); scopes = @() } |
        ConvertTo-Json | Set-Content (Join-Path $fx ".orchestration\runs\$rid\run.json")
    New-Item -ItemType Directory -Force -Path (Join-Path $fx '.orchestration\locks') | Out-Null
    @{ owner = 'claude/execute'; acquired = '2026-01-01T00:00:00'; pid = 999999 } |
        ConvertTo-Json | Set-Content (Join-Path $fx ".orchestration\locks\$rid.lock")

    $r = RunSup $fx @('recover')
    AssertMatch $r.out 'orphan-lock'      'orphan lock not reported'
    AssertMatch $r.out 'interrupted-run'  'interrupted run not reported'
    AssertMatch $r.out 'never auto-clean' 'dirty-work protection not stated'

    $r2 = RunSup $fx @('recover', '-Apply')
    Assert (-not (Test-Path (Join-Path $fx ".orchestration\locks\$rid.lock"))) 'orphan lock should be cleared'
    $runNow = Get-Run $fx $rid
    Assert ($runNow.status -in @('RECOVERABLE','NEEDS_REVIEW')) "interrupted run should be RECOVERABLE or NEEDS_REVIEW, was $($runNow.status)"
    Assert (Test-Path (Join-Path $fx "$wt/poc/wip.txt")) 'dirty work MUST be preserved'
}

Check 'status: shows tasks, workers, providers, main sync' {
    $fx = New-Fixture
    Add-QueueTask $fx 'ST-1' @{}
    $r = RunSup $fx @('status')
    AssertMatch $r.out 'Orcivo orchestration' 'header'
    AssertMatch $r.out 'Providers:'           'providers section'
    AssertMatch $r.out 'Claude (AVAILABLE|MISSING)' 'claude probe'
    AssertMatch $r.out 'origin sync'          'main sync line'
}

# ======================================================================
# summary
# ======================================================================
Write-Host ""
Write-Host ("=== {0} passed, {1} failed ===" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail) { 'Red' } else { 'Green' })

if (-not $KeepFixtures) {
    foreach ($d in $script:fixtures) {
        Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue
    }
}

exit $script:fail
