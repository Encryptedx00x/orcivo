<#
_probe.ps1 - runs ONE named spine scenario inside a fixture repo (cwd = fixture).
Invoked as a child process by run-spine-tests.ps1 so each scenario sees the
fixture as its git root. Emits `PROBE_OK` / `PROBE_FAIL: <msg>` and data lines.
Never touches the real repo; requires ORCH_V2_TESTING=1.
#>
param(
    [Parameter(Mandatory)][string]$Do,
    [string]$Arg1 = '', [string]$Arg2 = '', [string]$Arg3 = ''
)
$ErrorActionPreference = 'Stop'
$V2 = Split-Path -Parent $PSScriptRoot
. (Join-Path $V2 'lib-v2.ps1')
. (Join-Path $V2 'ledger.ps1')
. (Join-Path $V2 'contract.ps1')
. (Join-Path $V2 'attest.ps1')
. (Join-Path $V2 'lease.ps1')
. (Join-Path $V2 'classify.ps1')
. (Join-Path $V2 'review-envelope.ps1')
. (Join-Path $V2 'preflight.ps1')
. (Join-Path $V2 'integrate.ps1')
. (Join-Path $V2 'pipeline.ps1')

# glue layer: git writes progress/warnings to stderr; we check $LASTEXITCODE and
# structured return values explicitly. Explicit `throw` guards are unaffected.
$ErrorActionPreference = 'Continue'

function OK   { Write-Output 'PROBE_OK'; exit 0 }
function FAIL { param([string]$m) Write-Output "PROBE_FAIL: $m"; exit 1 }
function Expect { param([bool]$c, [string]$m) if (-not $c) { FAIL $m } }

$Repo = (Get-RepoRoot)

# ---- shared fixture helpers ------------------------------------------------
function Freeze-Fx {
    param([string]$TaskId = 'T-SPINE-1', [string[]]$Scope = @('work/'), [string[]]$Grants = @(), [string]$Risk = 'B')
    $head = (Get-GitHeadV2 $Repo)
    $spec = "Create work/artifact.md with ## Intro, ## Body, ## Conclusion. Do not touch anything else."
    $acc  = "AC1: work/artifact.md exists and contains the three headings."
    return (Freeze-Contract -TaskId $TaskId -PlanningHead $head -SpecText $spec -AcceptanceText $acc -DeclaredScope $Scope -ProtectedPathGrants $Grants -Risk $Risk -VerificationProfile 'B')
}
function Seed-IndexAndLedger {
    param($Contract, [string[]]$Deps = @(), [string]$Gate = 'none')
    $tvid = $Contract.taskVersionId
    Initialize-LedgerTask $tvid @{ taskId = $Contract.taskId } | Out-Null
    $stateDir = Join-Path (Get-V2Dir) 'state'
    Write-V2Json (Join-Path $stateDir 'index.v2.json') ([ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.index/1'
        planningHead  = $Contract.planningHead
        reconciled    = $true
        tasks = @(@{ taskId = $Contract.taskId; taskVersionId = $tvid; deps = @($Deps); gate = $Gate })
    })
    Register-Fetch
    return $tvid
}

switch ($Do) {

'hash-determinism' {
    $a = New-ContentHash ([ordered]@{ x = 1; y = @('a','b'); z = @{ q = 2 } })
    $b = New-ContentHash ([ordered]@{ z = @{ q = 2 }; y = @('a','b'); x = 1 })
    Expect ($a -eq $b) "hash not order-independent"
    $c = New-ContentHash ([ordered]@{ x = 1; y = @('b','a'); z = @{ q = 2 } })
    Expect ($a -ne $c) "array order must matter"
    OK
}

'fsm-monotonic' {
    Expect (Test-LedgerTransition 'APPROVED' 'INTEGRATING') "APPROVED->INTEGRATING should be legal"
    Expect (-not (Test-LedgerTransition 'PUBLISHED' 'READY')) "PUBLISHED->READY must be illegal (C-01)"
    Expect (-not (Test-LedgerTransition 'PUBLISHED' 'RUNNING')) "PUBLISHED is terminal"
    Expect (-not (Test-LedgerTransition 'QUARANTINED' 'READY')) "QUARANTINED is terminal"
    Expect (-not (Test-LedgerTransition 'DISCOVERED' 'RUNNING')) "cannot skip states"
    OK
}

'ledger-exactly-once' {
    $c = Freeze-Fx
    $tvid = $c.taskVersionId
    Initialize-LedgerTask $tvid @{ taskId = $c.taskId } | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'ready' -ToState 'READY' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'dispatch' -ToState 'DISPATCHED' -RunId (New-RunId) | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'running' -ToState 'RUNNING' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'checking' -ToState 'CHECKING' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'reviewing' -ToState 'REVIEWING' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'approved' -ToState 'APPROVED' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'integrating' -ToState 'INTEGRATING' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'published' -ToState 'PUBLISHED' -Evidence @{ headSHA = 'deadbeef' } | Out-Null

    # reconcile again N times: still not dispatchable
    for ($i = 0; $i -lt 5; $i++) {
        Initialize-LedgerTask $tvid @{ taskId = $c.taskId } | Out-Null
        $d = Test-CanDispatch $tvid
        Expect (-not $d.ok) "iteration $i : PUBLISHED task became dispatchable again: $($d.reasons -join ';')"
    }
    # any attempt to move it back throws
    $threw = $false
    try { Add-LedgerEvent -TaskVersionId $tvid -Event 'ready' -ToState 'READY' | Out-Null } catch { $threw = $true }
    Expect $threw "ledger allowed PUBLISHED -> READY"
    OK
}

'ledger-newversion-newid' {
    $h = (Get-GitHeadV2 $Repo)
    $v1 = New-TaskVersionId -TaskId 'T1' -PlanningHead $h -SpecHash (New-StringHash 'spec A') -AcceptanceHash (New-StringHash 'acc')
    $v2 = New-TaskVersionId -TaskId 'T1' -PlanningHead $h -SpecHash (New-StringHash 'spec B') -AcceptanceHash (New-StringHash 'acc')
    Expect ($v1 -ne $v2) "changed spec must yield a new taskVersionId"
    OK
}

'argquote-roundtrip' {
    $ps = Resolve-Executable 'powershell'
    $echo = Join-Path $PSScriptRoot 'echo-argv.ps1'
    $corpus = @(
        'plain', 'with space', 'quote"inside', 'back\slash', 'trailing\', 'a\\b',
        'amp & pipe | gt > lt <', 'semi ; colon', 'paren ( ) brace { }',
        ("unicode-caf" + [char]0xE9 + "-" + [char]0x65E5 + [char]0x672C),
        'caret ^ ok', 'dollar $x percent %PATH%', '"; rm -rf / #',
        ('back' + [char]96 + 'tick'), 'quote"and space'
    )
    foreach ($s in $corpus) {
        $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$echo,'S0',$s,'END')
        $out = Join-Path $env:TEMP ("argv-" + [guid]::NewGuid().ToString('N').Substring(0,8) + ".txt")
        $r = Invoke-NativeCaptured -Exe $ps -Arguments $args -WorkingDirectory $env:TEMP -StdinFile '' -StdoutLog $out -StderrLog "$out.err" -TimeoutSec 30
        $lines = @(Get-Content -LiteralPath $out -Encoding UTF8)
        Remove-Item -LiteralPath $out, "$out.err" -Force -ErrorAction SilentlyContinue
        # echo-argv prints one arg per line between markers
        $got = @()
        $inBlock = $false
        foreach ($l in $lines) {
            if ($l -eq 'ARGV_BEGIN') { $inBlock = $true; continue }
            if ($l -eq 'ARGV_END')   { $inBlock = $false; continue }
            if ($inBlock) { $got += $l }
        }
        Expect ($got.Count -eq 3) "arg '$s' -> $($got.Count) args (expected 3): $($got -join ' | ')"
        Expect ($got[0] -eq 'S0') "arg0 mangled for '$s': '$($got[0])'"
        Expect ($got[1] -eq $s) "arg '$s' round-tripped as '$($got[1])'"
        Expect ($got[2] -eq 'END') "arg2 mangled for '$s'"
    }
    OK
}

'id-and-path-grammar' {
    foreach ($g in @('run-abc','A.1_2-3','x')) { Expect (Test-SafeId $g) "good id rejected: $g" }
    foreach ($b in @('','../x','a/b','a b','a;b','a|b','.hidden','a`b',('x'*130))) { Expect (-not (Test-SafeId $b)) "bad id accepted: $b" }
    $root = (Get-V2Dir)
    $ok = Resolve-SafePath $root 'runs/abc/file.json'
    Expect ($ok.StartsWith($root)) "in-root path rejected"
    $threw = $false
    try { Resolve-SafePath $root '..\..\..\Windows\System32\x' } catch { $threw = $true }
    Expect $threw "path traversal not blocked"
    OK
}

'lease-cas-and-pidreuse' {
    $l = New-Lease -Namespace 'workspace' -Key 'k1'
    Expect $l.ok "first acquire failed"
    Expect (-not (Remove-Lease -Namespace 'workspace' -Key 'k1' -LeaseId 'lease-wrong')) "released with wrong leaseId"
    Expect (Remove-Lease -Namespace 'workspace' -Key 'k1' -LeaseId $l.leaseId) "correct release failed"

    # simulate a lease held by a reused PID (our pid, wrong start time) -> orphan, breakable
    $path = Get-LeasePath 'workspace' 'k2'
    $fake = [ordered]@{ leaseId='lease-old'; namespace='workspace'; key='k2'
        holder = @{ pid = $PID; host = $env:COMPUTERNAME; startTime = '1999-01-01T00:00:00.0000000Z'; alive = $true }
        createdAt='x'; heartbeat = (Get-Date).ToUniversalTime().ToString('o') }
    New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
    [System.IO.File]::WriteAllText($path, ($fake | ConvertTo-Json -Depth 6), (New-Utf8NoBom))
    Expect (Test-LeaseOrphan (Read-Lease $path)) "PID-reuse lease not detected as orphan"
    $l2 = New-Lease -Namespace 'workspace' -Key 'k2'
    Expect ($l2.ok -and $l2.broke) "could not break a PID-reuse orphan lease"
    OK
}

'negative-corpus' {
    $r = Test-NegativeCorpus
    Expect $r.ok "application text classified as provider failure: $($r.failures -join ' | ')"
    # explicit: a provider control channel DOES classify
    $ctrl = @{ isError = $true; errorType = 'insufficient_quota'; message = 'credit balance too low'; httpStatus = 402 }
    $c = Get-FailureClassV2 -Provider 'claude' -ExitCode 1 -Control $ctrl -AppStdout ''
    Expect ($c -eq 'PROVIDER_QUOTA') "control-channel quota not detected (got $c)"
    Expect (Test-ShouldFailover 'PROVIDER_QUOTA' 0) "should fail over on control-channel quota"
    Expect (-not (Test-ShouldFailover 'UNKNOWN' 0)) "UNKNOWN must never fail over"
    Expect (-not (Test-ShouldFailover 'PROVIDER_QUOTA' 1)) "must not exceed 1 failover per lineage"
    OK
}

'review-parse' {
    # $Arg1 = review scenario, $Arg2 = expected verdict
    $c = Freeze-Fx
    $tvid = $c.taskVersionId
    # build a realistic review prompt with plausible hashes
    $head = ('a' * 40); $tree = ('b' * 40); $diff = (New-StringHash 'x'); $spec = $c.specHash
    $prompt = Build-ReviewPrompt -TaskVersionId $tvid -Head $head -TreeHash $tree -DiffHash $diff -SpecHash $spec `
        -AcceptanceText $c.acceptanceText -SpecText $c.specText -Diff "diff --git a/work/artifact.md" -ChangedFiles @('work/artifact.md') -CheckSummary "verdict=PASS"
    $pf = Join-Path $env:TEMP ("rp-" + [guid]::NewGuid().ToString('N').Substring(0,8) + ".txt")
    [System.IO.File]::WriteAllText($pf, $prompt, (New-Utf8NoBom))
    $ps = Resolve-Executable 'powershell'
    $fa = Join-Path $PSScriptRoot 'fake-agent-v2.ps1'
    $out = "$pf.out"
    $env:ORCH_V2_REVIEW = $Arg1
    $r = Invoke-NativeCaptured -Exe $ps -Arguments @('-NoProfile','-ExecutionPolicy','Bypass','-File',$fa,'-Mode','review','-Worktree',$Repo) -WorkingDirectory $Repo -StdinFile $pf -StdoutLog $out -StderrLog "$out.e" -TimeoutSec 60
    $parsed = Parse-ReviewEnvelope -Stdout $r.stdout -Expected @{ taskVersion = $tvid; head = $head; treeHash = $tree; diffHash = $diff; changedFiles = @('work/artifact.md') }
    Remove-Item -LiteralPath $pf,"$pf.out","$pf.e" -Force -ErrorAction SilentlyContinue
    Write-Output "VERDICT=$($parsed.verdict) REASON=$($parsed.reason)"
    Expect ($parsed.verdict -eq $Arg2) "scenario '$Arg1' -> $($parsed.verdict) (expected $Arg2); problems: $($parsed.problems -join '; ')"
    OK
}

'contract-compliance' {
    # $Arg1 = execute scenario producing a worktree state; assert verdict $Arg2
    $c = Freeze-Fx -Scope @('work/') -Grants @() -Risk 'B'
    $tvid = $c.taskVersionId
    $base = (Get-GitHeadV2 $Repo)
    $wt = Join-Path (Get-V2Dir) 'wt-cc'
    & git -C $Repo worktree add -b cc-branch $wt $base --quiet 2>&1 | Out-Null
    switch ($Arg1) {
        'in-scope'   { New-Item -ItemType Directory -Force -Path (Join-Path $wt 'work') | Out-Null; Set-Content (Join-Path $wt 'work/artifact.md') "## Intro`n## Body`n## Conclusion" }
        'out-scope'  { New-Item -ItemType Directory -Force -Path (Join-Path $wt 'other') | Out-Null; Set-Content (Join-Path $wt 'other/x.txt') "nope" }
        'protected'  { New-Item -ItemType Directory -Force -Path (Join-Path $wt '.planning') | Out-Null; Set-Content (Join-Path $wt '.planning/x.md') "authority grab" }
        'no-change'  { }
    }
    & git -C $wt add -A 2>&1 | Out-Null
    $hasChg = @(& git -C $wt status --porcelain=v1).Count -gt 0
    if ($hasChg) { & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null }
    $head = (Get-GitHeadV2 $wt)
    $r = Test-ContractCompliance -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    & git -C $Repo worktree remove --force $wt 2>&1 | Out-Null
    Write-Output "VERDICT=$($r.verdict) VIOL=$($r.violations -join '|')"
    Expect ($r.verdict -eq $Arg2) "scenario '$Arg1' -> $($r.verdict) (expected $Arg2)"
    OK
}

'attest-stale' {
    $c = Freeze-Fx
    $tvid = $c.taskVersionId
    $base = (Get-GitHeadV2 $Repo)
    $wt = Join-Path (Get-V2Dir) 'wt-att'
    & git -C $Repo worktree add -b att-branch $wt $base --quiet 2>&1 | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $wt 'work') | Out-Null
    Set-Content (Join-Path $wt 'work/artifact.md') "## Intro`n## Body`n## Conclusion"
    & git -C $wt add -A 2>&1 | Out-Null
    & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null
    $head = (Get-GitHeadV2 $wt)
    $b = Get-AttestationBindings -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    $att = New-Attestation -Kind check -TaskVersionId $tvid -RunId (New-RunId) -Bindings $b -Result 'PASS'
    $fresh1 = Test-AttestationFresh -Attestation $att -WorktreeDir $wt -BaseSha $base -HeadSha $head
    Expect $fresh1.fresh "attestation should be fresh immediately"
    # mutate the tree AFTER the attestation and re-commit -> new head, stale
    Add-Content (Join-Path $wt 'work/artifact.md') "`nsneaky change"
    & git -C $wt add -A 2>&1 | Out-Null
    & git -C $wt -c user.name=x -c user.email=x@x commit -qm sneaky 2>&1 | Out-Null
    $head2 = (Get-GitHeadV2 $wt)
    $fresh2 = Test-AttestationFresh -Attestation $att -WorktreeDir $wt -BaseSha $base -HeadSha $head2
    & git -C $Repo worktree remove --force $wt 2>&1 | Out-Null
    Expect (-not $fresh2.fresh) "attestation stayed 'fresh' after the tree changed (C-03 broken)"
    OK
}

'attest-stale-config' {
    $c = Freeze-Fx
    $tvid = $c.taskVersionId
    $base = (Get-GitHeadV2 $Repo)
    $wt = Join-Path (Get-V2Dir) 'wt-cfg'
    & git -C $Repo worktree add -b cfg-branch $wt $base --quiet 2>&1 | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $wt 'work') | Out-Null
    Set-Content (Join-Path $wt 'work/artifact.md') "## Intro`n## Body`n## Conclusion"
    & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null
    $head = (Get-GitHeadV2 $wt)
    $b = Get-AttestationBindings -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    $att = New-Attestation -Kind review -TaskVersionId $tvid -RunId (New-RunId) -Bindings $b -Result 'APPROVE'
    # tamper the config file
    $cfgPath = Join-Path (Get-V2Dir) 'config.v2.json'
    Add-Content $cfgPath "`n"
    $f = Test-AttestationFresh -Attestation $att -WorktreeDir $wt -BaseSha $base -HeadSha $head
    & git -C $Repo worktree remove --force $wt 2>&1 | Out-Null
    Expect (-not $f.fresh) "config change did not stale the attestation"
    Expect (($f.drift -join ' ') -match 'configHash') "drift should name configHash"
    OK
}

'preflight-gates' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $pf1 = Test-Preflight -TaskVersionId $tvid -RepoDir $Repo
    Expect $pf1.ok "clean preflight should pass: $($pf1.failures -join ' | ')"

    # dirty authority tree -> fail
    Set-Content (Join-Path $Repo 'dirty.txt') 'x'
    $pf2 = Test-Preflight -TaskVersionId $tvid -RepoDir $Repo
    Expect (-not $pf2.ok) "dirty tree preflight should fail"
    Remove-Item (Join-Path $Repo 'dirty.txt') -Force

    # stale index head -> fail
    $idxPath = Join-Path (Get-V2Dir) 'state\index.v2.json'
    $idx = Read-V2Json $idxPath; $idx.planningHead = ('0' * 40); Write-V2Json $idxPath $idx
    $pf3 = Test-Preflight -TaskVersionId $tvid -RepoDir $Repo
    Expect (-not $pf3.ok) "stale index preflight should fail"
    OK
}

'human-gate-durable' {
    $c = Freeze-Fx -TaskId 'T-GATED'
    $tvid = Seed-IndexAndLedger $c -Gate 'apply-migration'
    $pf1 = Test-Preflight -TaskVersionId $tvid -RepoDir $Repo
    Expect (-not $pf1.ok) "gated task should fail preflight before approval"
    Expect (($pf1.failures -join ' ') -match "gate 'apply-migration'") "should name the unsatisfied gate"
    New-SyntheticGateApproval -TaskVersionId $tvid -GateId 'apply-migration' | Out-Null
    $pf2 = Test-Preflight -TaskVersionId $tvid -RepoDir $Repo
    Expect $pf2.ok "gated task should pass after synthetic approval: $($pf2.failures -join ' | ')"
    # a spec change invalidates the approval (bound to specHash)
    $c2 = Freeze-Contract -TaskId 'T-GATED' -PlanningHead $c.planningHead -SpecText 'DIFFERENT SPEC' -AcceptanceText $c.acceptanceText -DeclaredScope @('work/') -Risk 'B' -VerificationProfile 'B'
    $g = Get-HumanGateStatus $c2.taskVersionId 'apply-migration'
    Expect (-not $g.satisfied) "approval must not carry over to a new spec hash"
    OK
}

'pipeline-e2e' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo -Push
    Write-Output "STATUS=$($r.status) STAGE=$($r.stage) REASON=$($r.reason)"
    Expect ($r.status -eq 'PUBLISHED') "e2e did not publish: $($r.status) / $($r.reason)"
    Expect ($r.details.integration.pushed -eq $true) "e2e did not push to origin"
    $ls = Get-LedgerState $tvid
    Expect ($ls.published) "ledger not PUBLISHED"
    # remote actually contains the merge
    $remote = (& git -C $Repo rev-parse origin/main).Trim()
    & git -C $Repo merge-base --is-ancestor $r.details.integration.mergeCommit $remote 2>$null
    Expect ($LASTEXITCODE -eq 0) "origin/main does not contain the merge commit"

    # reconcile + attempt re-dispatch N times -> refused (C-01, exactly-once)
    for ($i = 0; $i -lt 4; $i++) {
        Initialize-LedgerTask $tvid @{ taskId = $c.taskId } | Out-Null
        $pf = Test-Preflight -TaskVersionId $tvid -RepoDir $Repo
        Expect (-not $pf.ok) "iteration $i : preflight allowed re-dispatch of a PUBLISHED task"
        $rr = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
        Expect ($rr.status -eq 'ABORTED' -and $rr.reason -match 'preflight|PUBLISHED|exactly-once') "iteration $i : Invoke-SpineRun did not refuse a PUBLISHED task version ($($rr.status): $($rr.reason))"
    }
    Expect ((Get-LedgerState $tvid).seq -eq $ls.seq) "ledger advanced after refused re-dispatch attempts"
    OK
}

'pipeline-block' {
    # $Arg1 = exec scenario, $Arg2 = expected status
    $grants = @(); $risk = 'B'
    $c = Freeze-Fx -Scope @('work/') -Grants $grants -Risk $risk
    $tvid = Seed-IndexAndLedger $c
    $env:ORCH_V2_EXEC = $Arg1
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
    Write-Output "STATUS=$($r.status) STAGE=$($r.stage) REASON=$($r.reason)"
    Expect ($r.status -eq $Arg2) "exec '$Arg1' -> $($r.status) (expected $Arg2): $($r.reason)"
    $ls = Get-LedgerState $tvid
    Expect (-not $ls.published) "blocked run must not be PUBLISHED"
    OK
}

'pipeline-review-injection' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $env:ORCH_V2_EXEC = 'ok'
    $env:ORCH_V2_REVIEW = $Arg1
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
    Write-Output "STATUS=$($r.status) REVIEW=$($r.details.review.verdict)"
    Expect ($r.status -ne 'PUBLISHED') "review scenario '$Arg1' still PUBLISHED"
    Expect ((Get-LedgerState $tvid).published -eq $false) "ledger PUBLISHED after a bad review"
    OK
}

'pipeline-secret-crash' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $env:ORCH_V2_EXEC = 'secret-crash'
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
    # the fake agent recorded the exact secret it leaked
    $secFile = Join-Path (Get-V2Dir) 'worktrees'
    $leaked = ''
    Get-ChildItem $secFile -Recurse -Filter '.the-secret.txt' -ErrorAction SilentlyContinue | ForEach-Object { $leaked = (Get-Content -Raw $_.FullName) }
    Expect ($leaked -match '^ORCIVO_SYNTHETIC_SECRET_') "test setup: no recorded secret"
    Expect ($r.status -ne 'PUBLISHED') "secret-crash run published"
    # scan EVERY persisted v2 artifact (logs, runs, checkpoints) for the raw secret
    $hits = @()
    foreach ($d in @('logs','runs','checkpoints','attestations')) {
        $p = Join-Path (Get-V2Dir) $d
        if (Test-Path $p) {
            Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
                $t = ''
                try { $t = Get-Content -Raw -LiteralPath $_.FullName } catch {}
                if ($t -match [regex]::Escape($leaked)) { $hits += $_.FullName }
            }
        }
    }
    Expect ($hits.Count -eq 0) "raw secret persisted in: $($hits -join ', ')"
    OK
}

'integration-stale-after-review' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $base = (Get-GitHeadV2 $Repo)
    $runId = New-RunId
    $wt = Join-Path (Get-V2Dir) "worktrees\$runId"
    Add-LedgerEvent -TaskVersionId $tvid -Event 'ready' -ToState 'READY' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'dispatch' -ToState 'DISPATCHED' -RunId $runId | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'running' -ToState 'RUNNING' -RunId $runId | Out-Null
    & git -C $Repo worktree add -b "orch-v2/$runId" $wt $base --quiet 2>&1 | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $wt 'work') | Out-Null
    Set-Content (Join-Path $wt 'work/artifact.md') "## Intro`n## Body`n## Conclusion"
    & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null
    $head = (Get-GitHeadV2 $wt)
    $b = Get-AttestationBindings -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    New-Attestation -Kind check  -TaskVersionId $tvid -RunId $runId -Bindings $b -Result 'PASS' | Out-Null
    New-Attestation -Kind review -TaskVersionId $tvid -RunId $runId -Bindings $b -Result 'APPROVE' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'checking' -ToState 'CHECKING' -RunId $runId | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'reviewing' -ToState 'REVIEWING' -RunId $runId | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'approved' -ToState 'APPROVED' -RunId $runId | Out-Null
    # tamper: someone edits the branch commit after review
    Add-Content (Join-Path $wt 'work/artifact.md') "`npost-review injection"
    & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm inject 2>&1 | Out-Null
    $head2 = (Get-GitHeadV2 $wt)
    $ir = Invoke-Integration -TaskVersionId $tvid -RunId $runId -RepoDir $Repo -WorktreeDir $wt -Branch "orch-v2/$runId" -BaseSha $base -HeadSha $head2
    Write-Output "STATUS=$($ir.status) REASON=$($ir.reason)"
    Expect ($ir.status -ne 'PUBLISHED') "integration published a commit that was changed after review (C-03)"
    Expect (($ir.reason) -match 'STALE|stale|branch moved') "reason should cite staleness"
    OK
}

'integration-remote-race' {
    # $Arg1 = path to a sibling clone that will push first
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $base = (Get-GitHeadV2 $Repo)
    $runId = New-RunId
    $wt = Join-Path (Get-V2Dir) "worktrees\$runId"
    Add-LedgerEvent -TaskVersionId $tvid -Event 'ready' -ToState 'READY' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'dispatch' -ToState 'DISPATCHED' -RunId $runId | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'running' -ToState 'RUNNING' -RunId $runId | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'checking' -ToState 'CHECKING' -RunId $runId | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'reviewing' -ToState 'REVIEWING' -RunId $runId | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'approved' -ToState 'APPROVED' -RunId $runId | Out-Null
    & git -C $Repo worktree add -b "orch-v2/$runId" $wt $base --quiet 2>&1 | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $wt 'work') | Out-Null
    Set-Content (Join-Path $wt 'work/artifact.md') "## Intro`n## Body`n## Conclusion"
    & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null
    $head = (Get-GitHeadV2 $wt)
    $b = Get-AttestationBindings -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    New-Attestation -Kind check  -TaskVersionId $tvid -RunId $runId -Bindings $b -Result 'PASS' | Out-Null
    New-Attestation -Kind review -TaskVersionId $tvid -RunId $runId -Bindings $b -Result 'APPROVE' | Out-Null
    # sibling clone pushes to origin/main FIRST, so our local main is now behind remote
    & git -C $Arg1 commit --allow-empty -m 'sibling advance' -q 2>&1 | Out-Null
    & git -C $Arg1 push origin main -q 2>&1 | Out-Null
    $ir = Invoke-Integration -TaskVersionId $tvid -RunId $runId -RepoDir $Repo -WorktreeDir $wt -Branch "orch-v2/$runId" -BaseSha $base -HeadSha $head -Push
    Write-Output "STATUS=$($ir.status) REASON=$($ir.reason)"
    Expect ($ir.status -ne 'PUBLISHED') "integration ignored a remote race (H-04)"
    Expect (($ir.reason) -match 'ahead of local|remote') "reason should cite the remote race"
    Expect ((Get-LedgerState $tvid).published -eq $false) "ledger PUBLISHED despite remote race"
    OK
}

default { FAIL "unknown probe '$Do'" }
}
