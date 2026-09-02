<#
_probe.ps1 - runs ONE named spine scenario inside a fixture repo (cwd = fixture).
Invoked as a child process by run-spine-tests.ps1 so each scenario sees the
fixture as its git root. Emits `PROBE_OK` / `PROBE_FAIL: <msg>` and data lines.
Never touches the real repo. Structurally isolated: it only ever runs against a
disposable fixture that carries the .orch-v2-fixture marker.
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
. (Join-Path $V2 'verification.ps1')
. (Join-Path $V2 'preflight.ps1')
. (Join-Path $V2 'integrate.ps1')
. (Join-Path $PSScriptRoot 'pipeline-harness.ps1')

$ErrorActionPreference = 'Continue'

function OK   { Write-Output 'PROBE_OK'; exit 0 }
function FAIL { param([string]$m) Write-Output "PROBE_FAIL: $m"; exit 1 }
function Expect { param([bool]$c, [string]$m) if (-not $c) { FAIL $m } }
function ExpectThrow { param([scriptblock]$b, [string]$m) $t=$false; try { & $b } catch { $t=$true }; if (-not $t) { FAIL $m } }

$Repo = (Get-RepoRoot)

function Freeze-Fx {
    param([string]$TaskId = 'T-SPINE-1', [string[]]$Scope = @('work/'), [string[]]$Grants = @(), [string]$Risk = 'B', [string]$Spec = $null, [string]$Acc = $null)
    $head = (Get-GitHeadV2 $Repo)
    if (-not $Spec) { $Spec = "Create work/artifact.md with ## Intro, ## Body, ## Conclusion. Do not touch anything else." }
    if (-not $Acc)  { $Acc  = "AC1: work/artifact.md exists and contains the three headings." }
    return (Freeze-Contract -TaskId $TaskId -PlanningHead $head -SpecText $Spec -AcceptanceText $Acc -DeclaredScope $Scope -ProtectedPathGrants $Grants -Risk $Risk -VerificationProfile 'B')
}
function Seed-IndexAndLedger {
    param($Contract, [string[]]$Deps = @(), [string]$Gate = 'none')
    $tvid = $Contract.taskVersionId
    Initialize-LedgerTask $tvid @{ taskId = $Contract.taskId } | Out-Null
    Write-V2Json (Join-Path (Get-V2Dir) 'state\index.v2.json') ([ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.index/1'
        planningHead  = $Contract.planningHead
        reconciled    = $true
        tasks = @(@{ taskId = $Contract.taskId; taskVersionId = $tvid; deps = @($Deps); gate = $Gate })
    })
    Invoke-PreflightFetch -RepoDir $Repo | Out-Null
    return $tvid
}
function Drive-ToApproved {
    param([string]$Tvid, [string]$RunId)
    $base = (Get-GitHeadV2 $Repo)
    $wt = Join-Path (Get-V2Dir) "worktrees\$RunId"
    Add-LedgerEvent -TaskVersionId $Tvid -Event 'ready' -ToState 'READY' | Out-Null
    Add-LedgerEvent -TaskVersionId $Tvid -Event 'dispatch' -ToState 'DISPATCHED' -RunId $RunId | Out-Null
    Add-LedgerEvent -TaskVersionId $Tvid -Event 'running' -ToState 'RUNNING' -RunId $RunId | Out-Null
    & git -C $Repo worktree add -b "orch-v2/$RunId" $wt $base --quiet 2>&1 | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $wt 'work') | Out-Null
    Set-Content (Join-Path $wt 'work/artifact.md') "## Intro`n## Body`n## Conclusion"
    & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null
    $head = (Get-GitHeadV2 $wt)
    $cand = New-IntegrationCandidate -RepoDir $Repo -WorktreeDir $wt -Branch "orch-v2/$RunId"
    $b = Get-AttestationBindings -TaskVersionId $Tvid -WorktreeDir $wt -BaseSha $cand.expectedTargetSha -HeadSha $cand.candidateSha
    New-Attestation -Kind check  -TaskVersionId $Tvid -RunId $RunId -Bindings $b -Result 'PASS' | Out-Null
    New-Attestation -Kind review -TaskVersionId $Tvid -RunId $RunId -Bindings $b -Result 'APPROVE' | Out-Null
    Add-LedgerEvent -TaskVersionId $Tvid -Event 'checking' -ToState 'CHECKING' -RunId $RunId | Out-Null
    Add-LedgerEvent -TaskVersionId $Tvid -Event 'reviewing' -ToState 'REVIEWING' -RunId $RunId | Out-Null
    Add-LedgerEvent -TaskVersionId $Tvid -Event 'approved' -ToState 'APPROVED' -RunId $RunId | Out-Null
    return @{ wt = $wt; base = $cand.expectedTargetSha; head = $cand.candidateSha; branch = "orch-v2/$RunId"; bindings = $b }
}

switch ($Do) {

'hash-determinism' {
    $a = New-ContentHash ([ordered]@{ x = 1; y = @('a','b'); z = @{ q = 2 } })
    $b = New-ContentHash ([ordered]@{ z = @{ q = 2 }; y = @('a','b'); x = 1 })
    Expect ($a -eq $b) "hash not order-independent"
    Expect ($a -ne (New-ContentHash ([ordered]@{ x = 1; y = @('b','a'); z = @{ q = 2 } }))) "array order must matter"
    OK
}

'fsm-monotonic' {
    Expect (Test-LedgerTransition 'APPROVED' 'INTEGRATING') "APPROVED->INTEGRATING legal"
    Expect (-not (Test-LedgerTransition 'PUBLISHED' 'READY')) "PUBLISHED->READY illegal"
    Expect (-not (Test-LedgerTransition 'QUARANTINED' 'READY')) "QUARANTINED terminal"
    Expect (-not (Test-LedgerTransition 'NO_CHANGE_ACCEPTED' 'READY')) "NO_CHANGE_ACCEPTED terminal (M-03)"
    Expect (-not (Test-LedgerTransition 'DISCOVERED' 'RUNNING')) "cannot skip states"
    Expect ((Get-V2Config).ledger.dispatchableStates -notcontains 'WAITING_HUMAN') "WAITING_HUMAN must NOT be dispatchable"
    OK
}

'ledger-newversion-newid' {
    $h = (Get-GitHeadV2 $Repo)
    $v1 = New-TaskVersionId -TaskId 'T1' -PlanningHead $h -SpecHash (New-StringHash 'spec A') -AcceptanceHash (New-StringHash 'acc')
    $v2 = New-TaskVersionId -TaskId 'T1' -PlanningHead $h -SpecHash (New-StringHash 'spec B') -AcceptanceHash (New-StringHash 'acc')
    Expect ($v1 -ne $v2) "changed spec must yield a new taskVersionId"
    OK
}

'ledger-concurrency' {
    # $Arg1 = number of writers
    $n = [int]$Arg1; if ($n -le 0) { $n = 8 }
    $c = Freeze-Fx
    $tvid = $c.taskVersionId
    Initialize-LedgerTask $tvid @{ taskId = $c.taskId } | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'ready' -ToState 'READY' | Out-Null
    $child = Join-Path $PSScriptRoot 'ledger-append-child.ps1'
    $barrier = Join-Path $env:TEMP ("lb-" + [guid]::NewGuid().ToString('N').Substring(0,8))
    $ps = (Get-Command powershell).Source
    $outs = @(); $procs = @()
    for ($i = 0; $i -lt $n; $i++) {
        $o = Join-Path $env:TEMP ("lac-$i-" + [guid]::NewGuid().ToString('N').Substring(0,6) + ".txt")
        $outs += $o
        $procs += Start-Process -FilePath $ps -WorkingDirectory $Repo -NoNewWindow -PassThru `
            -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$child,'-Tvid',$tvid,'-Barrier',$barrier) `
            -RedirectStandardOutput $o -RedirectStandardError "$o.err"
    }
    Start-Sleep -Milliseconds 500
    Set-Content -LiteralPath $barrier -Value 'go' -Encoding ascii
    $procs | ForEach-Object { $_.WaitForExit(40000) | Out-Null }
    $lines = @($outs | ForEach-Object { if (Test-Path $_) { Get-Content $_ } })
    $outs | ForEach-Object { Remove-Item -LiteralPath $_,"$_.err" -Force -ErrorAction SilentlyContinue }
    $errs = @($lines | Where-Object { $_ -match '^ERR' })
    $st = Get-LedgerState $tvid
    Expect (-not $st.corrupt) "ledger CORRUPT after $n concurrent writers: $($st.corruption)"
    $seqs = @($st.history | ForEach-Object { $_.seq })
    Expect ((($seqs | Sort-Object -Unique).Count) -eq $seqs.Count) "duplicate sequence numbers in history"
    $applied = @($lines | Where-Object { $_ -match '^OK' }).Count
    Expect ($st.seq -eq (2 + $applied)) "ledger seq $($st.seq) != seed+ready+applied ($applied)"
    Write-Output "WRITERS=$n APPLIED=$applied SEQ=$($st.seq) ERRS=$($errs.Count)"
    OK
}

'ledger-tamper' {
    # $Arg1 = truncate | rewrite | dupseq | stalehead
    $c = Freeze-Fx; $tvid = $c.taskVersionId
    Initialize-LedgerTask $tvid @{ taskId = $c.taskId } | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'ready' -ToState 'READY' | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'dispatch' -ToState 'DISPATCHED' -RunId (New-RunId) | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'running' -ToState 'RUNNING' | Out-Null
    $lp = Get-LedgerPath $tvid
    $lines = [System.IO.File]::ReadAllLines($lp)
    switch ($Arg1) {
        'truncate' { [System.IO.File]::WriteAllLines($lp, $lines[0..($lines.Count-2)]) }
        'rewrite'  { $j = $lines[2] -replace '"event":"dispatch"','"event":"tampered"'; $lines[2] = $j; [System.IO.File]::WriteAllLines($lp, $lines) }
        'dupseq'   { $dup = $lines[$lines.Count-1]; [System.IO.File]::WriteAllLines($lp, (@($lines) + @($dup))) }
        'stalehead' { $hp = Get-LedgerHeadPath $tvid; $h = Read-V2Json $hp; $h.seq = 99; Write-V2Json $hp $h }
    }
    $st = Get-LedgerState $tvid
    Expect ($st.corrupt -and $st.state -eq 'QUARANTINED') "tamper '$Arg1' not detected: state=$($st.state) corrupt=$($st.corrupt)"
    Expect (-not (Test-CanDispatch $tvid).ok) "corrupt ledger still dispatchable"
    ExpectThrow { Add-LedgerEvent -TaskVersionId $tvid -Event 'x' -ToState 'READY' } "append to corrupt ledger allowed"
    OK
}

'ledger-resurrection' {
    # $Arg1 = published | quarantined
    $c = Freeze-Fx; $tvid = $c.taskVersionId
    Initialize-LedgerTask $tvid @{ taskId = $c.taskId } | Out-Null
    Add-LedgerEvent -TaskVersionId $tvid -Event 'ready' -ToState 'READY' | Out-Null
    if ($Arg1 -eq 'published') {
        Add-LedgerEvent -TaskVersionId $tvid -Event 'dispatch' -ToState 'DISPATCHED' -RunId (New-RunId) | Out-Null
        Add-LedgerEvent -TaskVersionId $tvid -Event 'running' -ToState 'RUNNING' | Out-Null
        Add-LedgerEvent -TaskVersionId $tvid -Event 'checking' -ToState 'CHECKING' | Out-Null
        Add-LedgerEvent -TaskVersionId $tvid -Event 'reviewing' -ToState 'REVIEWING' | Out-Null
        Add-LedgerEvent -TaskVersionId $tvid -Event 'approved' -ToState 'APPROVED' | Out-Null
        Add-LedgerEvent -TaskVersionId $tvid -Event 'integrating' -ToState 'INTEGRATING' | Out-Null
        Add-LedgerEvent -TaskVersionId $tvid -Event 'published' -ToState 'PUBLISHED' -Evidence @{ headSHA = 'deadbeef' } | Out-Null
    } else {
        Add-LedgerEvent -TaskVersionId $tvid -Event 'quarantine' -ToState 'QUARANTINED' | Out-Null
    }
    for ($i = 0; $i -lt 4; $i++) {
        Initialize-LedgerTask $tvid @{ taskId = $c.taskId } | Out-Null
        Expect (-not (Test-CanDispatch $tvid).ok) "iter $i : terminal task became dispatchable"
    }
    ExpectThrow { Add-LedgerEvent -TaskVersionId $tvid -Event 'ready' -ToState 'READY' } "terminal -> READY allowed"
    OK
}

'argquote-roundtrip' {
    $ps = Resolve-Executable 'powershell'
    $echo = Join-Path $PSScriptRoot 'echo-argv.ps1'
    $corpus = @('plain','with space','quote"inside','back\slash','trailing\','a\\b',
        'amp & pipe | gt > lt <','semi ; colon','paren ( ) brace { }',
        ("unicode-caf" + [char]0xE9 + "-" + [char]0x65E5 + [char]0x672C),
        'caret ^ ok','dollar $x percent %PATH%','"; rm -rf / #',('back' + [char]96 + 'tick'),'quote"and space')
    foreach ($s in $corpus) {
        $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$echo,'S0',$s,'END')
        $out = Join-Path $env:TEMP ("argv-" + [guid]::NewGuid().ToString('N').Substring(0,8) + ".txt")
        Invoke-NativeCaptured -Exe $ps -Arguments $args -WorkingDirectory $env:TEMP -StdinFile '' -StdoutLog $out -StderrLog "$out.err" -TimeoutSec 30 | Out-Null
        $lines = @(Get-Content -LiteralPath $out -Encoding UTF8)
        Remove-Item -LiteralPath $out,"$out.err" -Force -ErrorAction SilentlyContinue
        $got = @(); $inB = $false
        foreach ($l in $lines) { if ($l -eq 'ARGV_BEGIN'){$inB=$true;continue}; if ($l -eq 'ARGV_END'){$inB=$false;continue}; if ($inB){$got+=$l} }
        Expect ($got.Count -eq 3 -and $got[0] -eq 'S0' -and $got[1] -eq $s -and $got[2] -eq 'END') "arg '$s' -> $($got -join ' | ')"
    }
    OK
}

'id-and-path-grammar' {
    foreach ($g in @('run-abc','A.1_2-3','x')) { Expect (Test-SafeId $g) "good id rejected: $g" }
    foreach ($b in @('','../x','a/b','a b','a;b','a|b','.hidden','a`b',('x'*130))) { Expect (-not (Test-SafeId $b)) "bad id accepted: $b" }
    $root = (Get-V2Dir)
    Expect ((Resolve-SafePath $root 'runs/abc/file.json').StartsWith($root)) "in-root path rejected"
    ExpectThrow { Resolve-SafePath $root '..\..\..\Windows\System32\x' } "path traversal not blocked"
    # native-only executable resolution rejects a .cmd/.bat wrapper
    $bat = Join-Path $env:TEMP ("wrap-" + [guid]::NewGuid().ToString('N').Substring(0,6) + ".cmd")
    Set-Content -LiteralPath $bat -Value '@echo hi' -Encoding ascii
    $env:PATH = (Split-Path $bat) + ';' + $env:PATH
    ExpectThrow { Resolve-Executable ([IO.Path]::GetFileNameWithoutExtension($bat)) -NativeOnly } "wrapper .cmd accepted as native exe"
    Remove-Item $bat -Force -ErrorAction SilentlyContinue
    OK
}

'canonical-dot-path' {
    $prot = @('.planning/', '.orchestration/', 'scripts/orchestration/', 'CLAUDE.md')
    foreach ($p in @('.planning/x.md', '.PLANNING/x.md', './.planning/y', '.\.planning\z', 'work/../.planning/a', '.orchestration/v2/e', 'scripts/orchestration/s.ps1', 'CLAUDE.md')) {
        Expect (Test-RelPathUnder $p $prot) "canonical protected match missed: $p"
    }
    foreach ($p in @('work/artifact.md', 'planning/x', 'docs/readme.md', 'myplanning/x')) {
        Expect (-not (Test-RelPathUnder $p $prot)) "false protected match: $p"
    }
    OK
}

'contract-compliance' {
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
    if (@(& git -C $wt status --porcelain=v1).Count -gt 0) { & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null }
    $head = (Get-GitHeadV2 $wt)
    $r = Test-ContractCompliance -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    & git -C $Repo worktree remove --force $wt 2>&1 | Out-Null
    Write-Output "VERDICT=$($r.verdict) VIOL=$($r.violations -join '|')"
    Expect ($r.verdict -eq $Arg2) "scenario '$Arg1' -> $($r.verdict) (expected $Arg2)"
    if ($Arg1 -eq 'protected') { Expect (($r.violations -join ' ') -match 'PROTECTED path') "protected block must cite PROTECTED path specifically" }
    OK
}

'protected-dot-broadscope' {
    # broad scope that WOULD allow .planning by prefix; protected-path rule must still block it
    $c = Freeze-Fx -Scope @('') -Grants @('unrestrictedScope') -Risk 'C'
    $tvid = $c.taskVersionId
    $base = (Get-GitHeadV2 $Repo)
    $wt = Join-Path (Get-V2Dir) 'wt-pd'
    & git -C $Repo worktree add -b pd-branch $wt $base --quiet 2>&1 | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $wt '.planning') | Out-Null
    Set-Content (Join-Path $wt '.planning/GRAB.md') "broad scope authority grab"
    & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null
    $head = (Get-GitHeadV2 $wt)
    $r = Test-ContractCompliance -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    & git -C $Repo worktree remove --force $wt 2>&1 | Out-Null
    Write-Output "VERDICT=$($r.verdict) VIOL=$($r.violations -join '|')"
    Expect ($r.verdict -eq 'POLICY_BLOCK' -and (($r.violations -join ' ') -match 'PROTECTED path')) "broad scope did not block .planning as PROTECTED: $($r.violations -join '|')"
    OK
}

'empty-scope-fail-closed' {
    $c = Freeze-Fx -Scope @() -Grants @() -Risk 'B'
    $tvid = $c.taskVersionId
    $base = (Get-GitHeadV2 $Repo)
    $wt = Join-Path (Get-V2Dir) 'wt-es'
    & git -C $Repo worktree add -b es-branch $wt $base --quiet 2>&1 | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $wt 'work') | Out-Null
    Set-Content (Join-Path $wt 'work/artifact.md') "## Intro`n## Body`n## Conclusion"
    & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null
    $head = (Get-GitHeadV2 $wt)
    $r = Test-ContractCompliance -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    & git -C $Repo worktree remove --force $wt 2>&1 | Out-Null
    Expect ($r.verdict -eq 'POLICY_BLOCK' -and (($r.violations -join ' ') -match 'empty')) "empty scope did not fail closed: $($r.verdict) $($r.violations -join '|')"
    OK
}

'contract-idempotent' {
    $h = (Get-GitHeadV2 $Repo)
    $a = Freeze-Contract -TaskId 'T-IDEM' -PlanningHead $h -SpecText 'same spec' -AcceptanceText 'AC1: thing' -DeclaredScope @('work/') -Risk 'B' -VerificationProfile 'B'
    Start-Sleep -Milliseconds 20
    $b = Freeze-Contract -TaskId 'T-IDEM' -PlanningHead $h -SpecText 'same spec' -AcceptanceText 'AC1: thing' -DeclaredScope @('work/') -Risk 'B' -VerificationProfile 'B'
    Expect ($a.contractHash -eq $b.contractHash) "re-freeze not idempotent (NH-01): $($a.contractHash) != $($b.contractHash)"
    Expect ($a.taskVersionId -eq $b.taskVersionId) "taskVersionId changed on re-freeze"
    OK
}

'contract-tamper' {
    # $Arg1 = spec | acceptance | profile | contractField
    $c = Freeze-Fx
    $tvid = $c.taskVersionId
    $p = Get-ContractPath $tvid
    $j = Get-Content -Raw -LiteralPath $p | ConvertFrom-Json
    switch ($Arg1) {
        'spec'          { $j.specText = 'MUTATED SPEC but keeping old specHash' }
        'acceptance'    { $j.acceptanceText = 'AC1: totally different now' }
        'profile'       { $j.verificationProfile = 'A' }
        'contractField' { $j.risk = 'C' }
    }
    ($j | ConvertTo-Json -Depth 30) | Set-Content -LiteralPath $p -Encoding utf8
    ExpectThrow { Get-Contract $tvid } "tamper '$Arg1' not detected on read (stored hash trusted)"
    OK
}

'verification-profile-mutation' {
    $c = Freeze-Fx
    $tvid = $c.taskVersionId
    Expect ($c.verificationDefinitionHash) "no verificationDefinitionHash frozen (NH-02)"
    # mutate the config profile content AFTER freeze
    $cfgPath = Join-Path (Get-V2Dir) 'config.v2.json'
    $cfg = Get-Content -Raw -LiteralPath $cfgPath | ConvertFrom-Json
    $cfg.verification.profiles.B.timeoutSec = 42
    ($cfg | ConvertTo-Json -Depth 40) | Set-Content -LiteralPath $cfgPath -Encoding utf8
    # Get-Contract must now detect the definition drift (and config drift)
    ExpectThrow { Get-Contract $tvid } "verification profile mutation not detected"
    OK
}

'review-parse' {
    $c = Freeze-Fx
    $tvid = $c.taskVersionId
    $head = ('a' * 40); $tree = ('b' * 40); $diff = (New-StringHash 'x'); $spec = $c.specHash
    $prompt = Build-ReviewPrompt -TaskVersionId $tvid -Head $head -TreeHash $tree -DiffHash $diff -SpecHash $spec `
        -AcceptanceText $c.acceptanceText -SpecText $c.specText -Diff "diff --git a/work/artifact.md" -ChangedFiles @('work/artifact.md') -CheckSummary "verdict=PASS" -CriteriaIds @($c.acceptanceCriteriaIds)
    $pf = Join-Path $env:TEMP ("rp-" + [guid]::NewGuid().ToString('N').Substring(0,8) + ".txt")
    [System.IO.File]::WriteAllText($pf, $prompt, (New-Utf8NoBom))
    $ps = Resolve-Executable 'powershell'
    $fa = Join-Path $PSScriptRoot 'fake-agent-v2.ps1'
    $out = "$pf.out"
    $env:ORCH_V2_REVIEW = $Arg1
    $r = Invoke-NativeCaptured -Exe $ps -Arguments @('-NoProfile','-ExecutionPolicy','Bypass','-File',$fa,'-Mode','review','-Worktree',$Repo) -WorkingDirectory $Repo -StdinFile $pf -StdoutLog $out -StderrLog "$out.e" -TimeoutSec 60
    $parsed = Parse-ReviewEnvelope -Stdout $r.stdout -Expected @{
        taskVersion = $tvid; head = $head; treeHash = $tree; diffHash = $diff; specHash = $spec
        changedFiles = @('work/artifact.md'); criteriaIds = @($c.acceptanceCriteriaIds)
        processOk = (($r.exitCode -eq 0) -and (-not $r.timedOut))
    }
    Remove-Item -LiteralPath $pf,"$pf.out","$pf.e" -Force -ErrorAction SilentlyContinue
    Write-Output "VERDICT=$($parsed.verdict) REASON=$($parsed.reason) PROB=$($parsed.problems -join ';')"
    Expect ($parsed.verdict -eq $Arg2) "scenario '$Arg1' -> $($parsed.verdict) (expected $Arg2)"
    OK
}

'attest-stale' {
    # $Arg1 = tree | config
    $c = Freeze-Fx; $tvid = $c.taskVersionId
    $base = (Get-GitHeadV2 $Repo)
    $wt = Join-Path (Get-V2Dir) 'wt-att'
    & git -C $Repo worktree add -b att-branch $wt $base --quiet 2>&1 | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $wt 'work') | Out-Null
    Set-Content (Join-Path $wt 'work/artifact.md') "## Intro`n## Body`n## Conclusion"
    & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null
    $head = (Get-GitHeadV2 $wt)
    $b = Get-AttestationBindings -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    $att = New-Attestation -Kind check -TaskVersionId $tvid -RunId (New-RunId) -Bindings $b -Result 'PASS'
    Expect (Test-AttestationFresh -Attestation $att -WorktreeDir $wt -BaseSha $base -HeadSha $head).fresh "should be fresh immediately"
    $h2 = $head
    if ($Arg1 -eq 'tree') {
        Add-Content (Join-Path $wt 'work/artifact.md') "`nsneaky"
        & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm s 2>&1 | Out-Null
        $h2 = (Get-GitHeadV2 $wt)
    } else {
        Add-Content (Join-Path (Get-V2Dir) 'config.v2.json') "`n"
    }
    $f = Test-AttestationFresh -Attestation $att -WorktreeDir $wt -BaseSha $base -HeadSha $h2
    & git -C $Repo worktree remove --force $wt 2>&1 | Out-Null
    Expect (-not $f.fresh) "attestation stayed fresh after '$Arg1' change: $($f.drift -join ';')"
    OK
}

'attest-payload-mutation' {
    $c = Freeze-Fx; $tvid = $c.taskVersionId
    $base = (Get-GitHeadV2 $Repo)
    $wt = Join-Path (Get-V2Dir) 'wt-apm'
    & git -C $Repo worktree add -b apm-branch $wt $base --quiet 2>&1 | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $wt 'work') | Out-Null
    Set-Content (Join-Path $wt 'work/artifact.md') "## Intro`n## Body`n## Conclusion"
    & git -C $wt add -A 2>&1 | Out-Null; & git -C $wt -c user.name=x -c user.email=x@x commit -qm t 2>&1 | Out-Null
    $head = (Get-GitHeadV2 $wt)
    $b = Get-AttestationBindings -TaskVersionId $tvid -WorktreeDir $wt -BaseSha $base -HeadSha $head
    $att = New-Attestation -Kind review -TaskVersionId $tvid -RunId (New-RunId) -Bindings $b -Result 'APPROVE' -ProducerMeta @{ provider='codex' } -Payload @{ reason='ok' }
    $dir = Join-Path (Get-V2Dir) "attestations\$tvid"
    $file = (Get-ChildItem $dir -Filter 'review-*.json' | Select-Object -First 1).FullName
    $j = Get-Content -Raw -LiteralPath $file | ConvertFrom-Json
    $j.producer.provider = 'claude-tampered'
    $j.payload.reason = 'silently changed'
    ($j | ConvertTo-Json -Depth 30) | Set-Content -LiteralPath $file -Encoding utf8
    $reloaded = Read-V2Json $file
    $f = Test-AttestationFresh -Attestation $reloaded -WorktreeDir $wt -BaseSha $base -HeadSha $head
    & git -C $Repo worktree remove --force $wt 2>&1 | Out-Null
    Expect (-not $f.fresh -and (($f.drift -join ' ') -match 'attestationHash')) "producer/payload mutation not caught by integrity hash (NM-01): $($f.drift -join ';')"
    OK
}

'attest-latest-authoritative' {
    # $Arg1 = pass-then-fail | approve-then-reqchanges
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $runId = New-RunId
    $d = Drive-ToApproved -Tvid $tvid -RunId $runId
    Start-Sleep -Milliseconds 40
    if ($Arg1 -eq 'pass-then-fail') { New-Attestation -Kind check -TaskVersionId $tvid -RunId $runId -Bindings ([hashtable]$d.bindings) -Result 'FAIL' | Out-Null }
    else { New-Attestation -Kind review -TaskVersionId $tvid -RunId $runId -Bindings ([hashtable]$d.bindings) -Result 'REQUEST_CHANGES' | Out-Null }
    $g = Assert-IntegrationAttestations -TaskVersionId $tvid -RunId $runId -WorktreeDir $d.wt -BaseSha $d.base -HeadSha $d.head -RequiredKinds @('check','review')
    & git -C $Repo worktree remove --force $d.wt 2>&1 | Out-Null
    Expect (-not $g.ok) "later negative result did not invalidate the earlier positive (NM-01): $($g.problems -join ';')"
    OK
}

'preflight-gates' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    Expect (Test-Preflight -TaskVersionId $tvid -RepoDir $Repo).ok "clean preflight should pass: $((Test-Preflight -TaskVersionId $tvid -RepoDir $Repo).failures -join '|')"
    Set-Content (Join-Path $Repo 'dirty.txt') 'x'
    Expect (-not (Test-Preflight -TaskVersionId $tvid -RepoDir $Repo).ok) "dirty tree preflight should fail"
    Remove-Item (Join-Path $Repo 'dirty.txt') -Force
    $idxPath = Join-Path (Get-V2Dir) 'state\index.v2.json'
    $idx = Read-V2Json $idxPath; $idx.planningHead = ('0' * 40); Write-V2Json $idxPath $idx
    Expect (-not (Test-Preflight -TaskVersionId $tvid -RepoDir $Repo).ok) "stale index preflight should fail"
    OK
}

'preflight-absent-version' {
    # $Arg1 = empty-index | missing-task
    $c = Freeze-Fx
    Initialize-LedgerTask $c.taskVersionId @{ taskId = $c.taskId } | Out-Null
    Invoke-PreflightFetch -RepoDir $Repo | Out-Null
    if ($Arg1 -eq 'empty-index') {
        Write-V2Json (Join-Path (Get-V2Dir) 'state\index.v2.json') ([ordered]@{ schemaVersion='orcivo.orchestration.v2.index/1'; planningHead=$c.planningHead; reconciled=$true; tasks=@() })
    } else {
        Write-V2Json (Join-Path (Get-V2Dir) 'state\index.v2.json') ([ordered]@{ schemaVersion='orcivo.orchestration.v2.index/1'; planningHead=$c.planningHead; reconciled=$true; tasks=@(@{ taskId='OTHER'; taskVersionId=('f'*64); deps=@(); gate='none' }) })
    }
    $pf = Test-Preflight -TaskVersionId $c.taskVersionId -RepoDir $Repo
    Expect (-not $pf.ok -and (($pf.failures -join ' ') -match 'NOT in the reconciled index')) "absent version ($Arg1) not rejected: $($pf.failures -join '|')"
    OK
}

'preflight-fetch-forgery' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    # forge a fresh-looking fetch record whose observed remote != local
    Write-V2Json (Join-Path (Get-V2Dir) 'state\last-fetch.json') ([ordered]@{
        performed=$true; remote='origin'; target='main'; beforeSHA=(Get-GitHeadV2 $Repo)
        observedRemoteSHA=('9'*40); at=(Get-Date).ToUniversalTime().ToString('o'); invocation='forged'; result='OK'
    })
    $pf = Test-Preflight -TaskVersionId $tvid -RepoDir $Repo
    Expect (-not $pf.ok -and (($pf.failures -join ' ') -match 'observed remote')) "forged fetch observation accepted: $($pf.failures -join '|')"
    # a real fetch fixes it
    Invoke-PreflightFetch -RepoDir $Repo | Out-Null
    Expect (Test-Preflight -TaskVersionId $tvid -RepoDir $Repo).ok "real fetch did not restore preflight"
    OK
}

'human-gate-durable' {
    $c = Freeze-Fx -TaskId 'T-GATED'
    $tvid = Seed-IndexAndLedger $c -Gate 'apply-migration'
    $pf1 = Test-Preflight -TaskVersionId $tvid -RepoDir $Repo
    Expect (-not $pf1.ok -and (($pf1.failures -join ' ') -match "gate 'apply-migration'")) "gated task should fail before approval"
    New-SyntheticGateApproval -TaskVersionId $tvid -GateId 'apply-migration' -RepoDir $Repo | Out-Null
    Expect (Test-Preflight -TaskVersionId $tvid -RepoDir $Repo).ok "gated task should pass after synthetic approval"
    $c2 = Freeze-Contract -TaskId 'T-GATED' -PlanningHead $c.planningHead -SpecText 'DIFFERENT SPEC' -AcceptanceText $c.acceptanceText -DeclaredScope @('work/') -Risk 'B' -VerificationProfile 'B'
    Expect (-not (Get-HumanGateStatus $c2.taskVersionId 'apply-migration').satisfied) "approval carried over to a new spec hash"
    OK
}

'gate-tampering' {
    # $Arg1 = decision | specHash | approvalIdentity | approvalTimestamp | nonce | taskVersionId
    $c = Freeze-Fx -TaskId 'T-GT'
    $tvid = Seed-IndexAndLedger $c -Gate 'g1'
    New-SyntheticGateApproval -TaskVersionId $tvid -GateId 'g1' -RepoDir $Repo | Out-Null
    Expect (Get-HumanGateStatus $tvid 'g1').satisfied "baseline gate should be satisfied"
    $p = Get-HumanGatePath $tvid 'g1'
    $j = Get-Content -Raw -LiteralPath $p | ConvertFrom-Json
    switch ($Arg1) {
        'decision'          { $j.decision = 'APPROVED '; }
        'specHash'          { $j.specHash = 'sha256:' + ('0'*64) }
        'approvalIdentity'  { $j.approvalIdentity = 'attacker' }
        'approvalTimestamp' { $j.approvalTimestamp = '2000-01-01T00:00:00Z' }
        'nonce'             { $j.nonce = 'deadbeef' }
        'taskVersionId'     { $j.taskVersionId = ('a'*64) }
    }
    ($j | ConvertTo-Json -Depth 20) | Set-Content -LiteralPath $p -Encoding utf8
    $g = Get-HumanGateStatus $tvid 'g1'
    Expect (-not $g.satisfied) "gate field tamper '$Arg1' not detected: $($g.reason)"
    OK
}

'lease-cas-and-pidreuse' {
    $l = New-Lease -Namespace 'workspace' -Key 'k1'
    Expect $l.ok "first acquire failed"
    Expect (-not (Remove-Lease -Namespace 'workspace' -Key 'k1' -LeaseId 'lease-wrong')) "released with wrong leaseId"
    Expect (Remove-Lease -Namespace 'workspace' -Key 'k1' -LeaseId $l.leaseId) "correct release failed"
    $path = Get-LeasePath 'workspace' 'k2'
    $fake = [ordered]@{ leaseId='lease-old'; namespace='workspace'; key='k2'
        holder = @{ pid = $PID; host = $env:COMPUTERNAME; startTime = '1999-01-01T00:00:00.0000000Z'; alive = $true }
        createdAt='x'; heartbeat = (Get-Date).ToUniversalTime().ToString('o') }
    New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
    [System.IO.File]::WriteAllText($path, (ConvertTo-CanonicalJson $fake), (New-Utf8NoBom))
    Expect (Test-LeaseOrphan (Read-Lease $path)) "PID-reuse lease not detected as orphan"
    $l2 = New-Lease -Namespace 'workspace' -Key 'k2'
    Expect ($l2.ok -and $l2.broke) "could not break a PID-reuse orphan lease"
    OK
}

'lease-live-owner-stale-heartbeat' {
    # a lease held by THIS (live) process with an ancient heartbeat is NOT an orphan
    $path = Get-LeasePath 'workspace' 'live1'
    $me = Get-ProcessIdentity
    $rec = [ordered]@{ schemaVersion='orcivo.orchestration.v2.lease/2'; leaseId='lease-live'; namespace='workspace'; key='live1'
        taskVersionId=''; runId=''; scope=''; holder = $me; createdAt='2000-01-01T00:00:00Z'; heartbeat='2000-01-01T00:00:00Z' }
    New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
    [System.IO.File]::WriteAllText($path, (ConvertTo-CanonicalJson $rec), (New-Utf8NoBom))
    Expect (-not (Test-LeaseOrphan (Read-Lease $path))) "live owner with stale heartbeat wrongly flagged orphan"
    $l = New-Lease -Namespace 'workspace' -Key 'live1'
    Expect (-not $l.ok -and -not $l.broke) "second process acquired a live owner's lease (H-05)"
    OK
}

'lease-malformed-quarantine' {
    $path = Get-LeasePath 'workspace' 'mal1'
    New-Item -ItemType Directory -Force -Path (Split-Path $path) | Out-Null
    [System.IO.File]::WriteAllText($path, "{ not json at all ", (New-Utf8NoBom))
    $l = New-Lease -Namespace 'workspace' -Key 'mal1'
    Expect (-not $l.ok) "malformed lease was granted to a second writer"
    Expect ($l.quarantined -eq $true) "malformed lease not quarantined"
    OK
}

'lease-heartbeat-renewal' {
    $l = New-Lease -Namespace 'workspace' -Key 'hb1'
    Expect $l.ok "acquire failed"
    $before = (Read-Lease (Get-LeasePath 'workspace' 'hb1')).heartbeat
    Start-Sleep -Milliseconds 30
    Expect (Update-LeaseHeartbeat -Namespace 'workspace' -Key 'hb1' -LeaseId $l.leaseId) "heartbeat renewal failed for the holder"
    $after = (Read-Lease (Get-LeasePath 'workspace' 'hb1')).heartbeat
    Expect ($after -ne $before) "heartbeat timestamp did not advance"
    Expect (-not (Update-LeaseHeartbeat -Namespace 'workspace' -Key 'hb1' -LeaseId 'lease-wrong')) "non-holder renewed the heartbeat"
    [void](Remove-Lease -Namespace 'workspace' -Key 'hb1' -LeaseId $l.leaseId)
    OK
}

'negative-corpus' {
    $r = Test-NegativeCorpus
    Expect $r.ok "application text classified as provider failure: $($r.failures -join ' | ')"
    $ctrl = @{ isError = $true; errorType = 'insufficient_quota'; message = 'credit balance too low'; httpStatus = 402 }
    Expect ((Get-FailureClassV2 -Provider 'claude' -ExitCode 1 -Control $ctrl -AppStdout '') -eq 'PROVIDER_QUOTA') "control-channel quota not detected"
    Expect (Test-ShouldFailover 'PROVIDER_QUOTA' 0) "should fail over on control-channel quota"
    Expect (-not (Test-ShouldFailover 'UNKNOWN' 0)) "UNKNOWN must never fail over"
    Expect (-not (Test-ShouldFailover 'PROVIDER_QUOTA' 1)) "must not exceed 1 failover per lineage"
    OK
}

'env-bypass-attempt' {
    # every legacy switch set; no .orch-v2-fixture marker removed check here (fixture has it),
    # instead point Invoke-SpineRun at a NON-disposable path -> must refuse regardless of env.
    $env:ORCH_V2_TESTING = '1'; $env:ORCH_V1_REGRESSION_HARNESS = '1'; $env:ORCH_V2_EXEC = 'ok'
    $nonDisposable = Join-Path $env:TEMP ("nd-" + [guid]::NewGuid().ToString('N').Substring(0,8))
    New-Item -ItemType Directory -Force -Path $nonDisposable | Out-Null   # NO .orch-v2-fixture marker
    ExpectThrow { Invoke-SpineRun -TaskVersionId ('a'*64) -RepoDir $nonDisposable } "env vars bypassed the disposable-root guard (NC-01)"
    # and against the authority root itself
    ExpectThrow { Assert-DisposableRoot -RepoDir (Get-AuthorityRoot) } "authority root accepted as disposable"
    Remove-Item -Recurse -Force $nonDisposable -ErrorAction SilentlyContinue
    OK
}

'pipeline-e2e' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
    Write-Output "STATUS=$($r.status) STAGE=$($r.stage) REASON=$($r.reason)"
    Expect ($r.status -eq 'PUBLISHED') "e2e did not publish: $($r.status) / $($r.reason)"
    Expect ($r.details.integration.pushed -eq $true) "e2e did not push to origin"
    $ls = Get-LedgerState $tvid
    Expect ($ls.published -and -not $ls.corrupt) "ledger not cleanly PUBLISHED"
    $remote = (& git -C $Repo rev-parse origin/main).Trim()
    & git -C $Repo merge-base --is-ancestor $r.details.integration.mergeCommit $remote 2>$null
    Expect ($LASTEXITCODE -eq 0) "origin/main does not contain the merge commit"
    Expect ($r.details.secretScan.clean -eq $true) "secret scan not clean on the happy path"
    for ($i = 0; $i -lt 3; $i++) {
        Initialize-LedgerTask $tvid @{ taskId = $c.taskId } | Out-Null
        $pf = Test-Preflight -TaskVersionId $tvid -RepoDir $Repo
        Expect (-not $pf.ok) "iter $i : preflight allowed re-dispatch of PUBLISHED"
        $rr = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
        Expect ($rr.status -eq 'ABORTED') "iter $i : did not refuse a PUBLISHED task version ($($rr.status))"
    }
    Expect ((Get-LedgerState $tvid).seq -eq $ls.seq) "ledger advanced after refused re-dispatch"
    OK
}

'pipeline-block' {
    $c = Freeze-Fx -Scope @('work/') -Grants @() -Risk 'B'
    $tvid = Seed-IndexAndLedger $c
    $env:ORCH_V2_EXEC = $Arg1
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
    Write-Output "STATUS=$($r.status) STAGE=$($r.stage) REASON=$($r.reason)"
    Expect ($r.status -eq $Arg2) "exec '$Arg1' -> $($r.status) (expected $Arg2): $($r.reason)"
    Expect (-not (Get-LedgerState $tvid).published) "blocked run must not be PUBLISHED"
    Expect ($r.details.secretScan.clean -eq $true) "secret scan not clean after a blocked run"
    OK
}

'pipeline-review-injection' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $env:ORCH_V2_EXEC = 'ok'; $env:ORCH_V2_REVIEW = $Arg1
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
    Write-Output "STATUS=$($r.status) REVIEW=$($r.details.review.verdict)"
    Expect ($r.status -ne 'PUBLISHED') "review scenario '$Arg1' still PUBLISHED"
    Expect ((Get-LedgerState $tvid).published -eq $false) "ledger PUBLISHED after a bad review"
    OK
}

'pipeline-reviewer-provenance' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $env:ORCH_V2_EXEC = 'ok'; $env:ORCH_V2_REVIEW = 'request-changes'
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
    $dir = Join-Path (Get-V2Dir) "attestations\$tvid"
    $rev = Get-ChildItem $dir -Filter 'review-*.json' | Select-Object -First 1
    $j = Read-V2Json $rev.FullName
    # M-05: producer metadata is the launcher's, not the envelope's self-report
    Expect ($j.producer.model -eq 'deterministic-fake') "attestation trusted the reviewer's self-reported model: $($j.producer.model)"
    Expect ($j.producer.launchedBy -eq 'v2-harness') "no launcher provenance recorded"
    OK
}

'pipeline-secret-crash' {
    # $Arg1 = single | pem
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $env:ORCH_V2_EXEC = $(if ($Arg1 -eq 'pem') { 'secret-pem-crash' } else { 'secret-crash' })
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo
    Expect ($r.status -ne 'PUBLISHED') "secret-crash run published"
    Expect ($r.details.secretScan.clean -eq $true) "secret scan reported hits: $($r.details.secretScan.hits -join ', ')"
    # independent recursive sweep of EVERY persisted v2 artifact root
    $hits = @()
    foreach ($d in @('logs','runs','checkpoints','attestations','contracts','ledger','leases')) {
        $p = Join-Path (Get-V2Dir) $d
        if (Test-Path $p) {
            Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
                $t = ''; try { $t = Get-Content -Raw -LiteralPath $_.FullName } catch {}
                if ($t -and ($t -match 'ORCIVO_SYNTHETIC_SECRET_[A-Za-z0-9]{8,}' -or $t -match 'BEGIN RSA PRIVATE KEY-----\r?\nMII')) { $hits += $_.FullName }
            }
        }
    }
    Expect ($hits.Count -eq 0) "raw secret persisted in: $($hits -join ', ')"
    OK
}

'pipeline-no-change-accepted' {
    # M-03: a justified no-op reaches the NO_CHANGE_ACCEPTED terminal state,
    # not a perpetual APPROVED, and the evidence is bound to the frozen criteria.
    $c = Freeze-Fx -Acc "AC1: nothing to do because the feature already exists."
    $tvid = Seed-IndexAndLedger $c
    $ev = Join-Path (Get-V2Dir) 'nochange-evidence.json'
    Write-V2Json $ev ([ordered]@{
        contractHash = $c.contractHash
        criteria = @(@{ id = 'AC1'; reason = 'verified the behaviour already ships; git diff is empty by design' })
    })
    $env:ORCH_V2_EXEC = 'no-change'
    $r = Invoke-SpineRun -TaskVersionId $tvid -RepoDir $Repo -NoChangeEvidenceFile $ev
    Write-Output "STATUS=$($r.status) LEDGER=$($r.ledgerState)"
    Expect ($r.status -eq 'NO_CHANGE_ACCEPTED') "justified no-op -> $($r.status) (expected NO_CHANGE_ACCEPTED): $($r.reason)"
    $st = Get-LedgerState $tvid
    Expect ($st.state -eq 'NO_CHANGE_ACCEPTED') "ledger state $($st.state), not NO_CHANGE_ACCEPTED"
    ExpectThrow { Add-LedgerEvent -TaskVersionId $tvid -Event 'x' -ToState 'READY' } "NO_CHANGE_ACCEPTED not terminal"
    # a mismatched-criteria evidence file must NOT be accepted
    $ev2 = Join-Path (Get-V2Dir) 'nochange-bad.json'
    Write-V2Json $ev2 ([ordered]@{ contractHash = $c.contractHash; criteria = @(@{ id='ZZ9'; reason='wrong id' }) })
    $c2 = Freeze-Fx -TaskId 'T-NC2' -Acc "AC1: nothing to do."
    $tvid2 = Seed-IndexAndLedger $c2
    $env:ORCH_V2_EXEC = 'no-change'
    $r2 = Invoke-SpineRun -TaskVersionId $tvid2 -RepoDir $Repo -NoChangeEvidenceFile $ev2
    Expect ($r2.status -eq 'POLICY_BLOCK') "mismatched no-change evidence accepted: $($r2.status)"
    OK
}

'integration-no-push-impossible' {
    # remove the remote so publication cannot be confirmed -> INTEGRATION_FAILED, never PUBLISHED
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $runId = New-RunId
    $d = Drive-ToApproved -Tvid $tvid -RunId $runId
    & git -C $Repo remote remove origin 2>&1 | Out-Null
    $ir = Invoke-Integration -TaskVersionId $tvid -RunId $runId -RepoDir $Repo -WorktreeDir $d.wt -Branch $d.branch -BaseSha $d.base -HeadSha $d.head
    & git -C $Repo worktree remove --force $d.wt 2>&1 | Out-Null
    Write-Output "STATUS=$($ir.status) REASON=$($ir.reason)"
    Expect ($ir.status -ne 'PUBLISHED') "integration published with no remote"
    Expect ((Get-LedgerState $tvid).state -in @('INTEGRATION_FAILED','FAILED')) "ledger not closed after no-remote integration: $((Get-LedgerState $tvid).state)"
    OK
}

'integration-stale-after-review' {
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $runId = New-RunId
    $d = Drive-ToApproved -Tvid $tvid -RunId $runId
    Add-Content (Join-Path $d.wt 'work/artifact.md') "`npost-review injection"
    & git -C $d.wt add -A 2>&1 | Out-Null; & git -C $d.wt -c user.name=x -c user.email=x@x commit -qm inject 2>&1 | Out-Null
    $head2 = (Get-GitHeadV2 $d.wt)
    $ir = Invoke-Integration -TaskVersionId $tvid -RunId $runId -RepoDir $Repo -WorktreeDir $d.wt -Branch $d.branch -BaseSha $d.base -HeadSha $head2
    & git -C $Repo worktree remove --force $d.wt 2>&1 | Out-Null
    Write-Output "STATUS=$($ir.status) REASON=$($ir.reason)"
    Expect ($ir.status -ne 'PUBLISHED') "integration published a commit changed after review"
    Expect ((Get-LedgerState $tvid).state -ne 'PUBLISHED') "ledger PUBLISHED despite stale review"
    OK
}

'integration-remote-race' {
    # $Arg1 = sibling clone that advances origin/main after review
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $runId = New-RunId
    $d = Drive-ToApproved -Tvid $tvid -RunId $runId
    & git -C $Arg1 commit --allow-empty -m 'sibling advance' -q 2>&1 | Out-Null
    & git -C $Arg1 push origin main -q 2>&1 | Out-Null
    $ir = Invoke-Integration -TaskVersionId $tvid -RunId $runId -RepoDir $Repo -WorktreeDir $d.wt -Branch $d.branch -BaseSha $d.base -HeadSha $d.head
    & git -C $Repo worktree remove --force $d.wt 2>&1 | Out-Null
    Write-Output "STATUS=$($ir.status) REASON=$($ir.reason)"
    Expect ($ir.status -ne 'PUBLISHED') "integration ignored a remote race (H-04/#7)"
    Expect (($ir.reason) -match 'moved off|diverg|remote') "reason should cite the remote divergence"
    Expect ((Get-LedgerState $tvid).state -in @('REMOTE_DIVERGED','INTEGRATION_FAILED')) "ledger not closed after remote race: $((Get-LedgerState $tvid).state)"
    OK
}

'integration-post-review-target-movement' {
    # full pipeline: run to PUBLISH attempt while a sibling advances origin/main mid-flight.
    # here we drive to approved, advance origin, then integrate -> must STOP, require rebuild.
    $c = Freeze-Fx
    $tvid = Seed-IndexAndLedger $c
    $runId = New-RunId
    $d = Drive-ToApproved -Tvid $tvid -RunId $runId
    # someone else advances origin/main (Arg1 = sibling clone)
    & git -C $Arg1 pull -q 2>&1 | Out-Null
    & git -C $Arg1 commit --allow-empty -m 'concurrent main advance' -q 2>&1 | Out-Null
    & git -C $Arg1 push origin main -q 2>&1 | Out-Null
    $ir = Invoke-Integration -TaskVersionId $tvid -RunId $runId -RepoDir $Repo -WorktreeDir $d.wt -Branch $d.branch -BaseSha $d.base -HeadSha $d.head
    $published = ((Get-LedgerState $tvid).state -eq 'PUBLISHED')
    & git -C $Repo worktree remove --force $d.wt 2>&1 | Out-Null
    Write-Output "STATUS=$($ir.status) REASON=$($ir.reason)"
    Expect (-not $published) "target moved after review but integration still PUBLISHED (#7)"
    Expect ($ir.status -in @('REMOTE_DIVERGED','INTEGRATION_FAILED')) "did not stop for rebuild/re-review"
    OK
}

default { FAIL "unknown probe '$Do'" }
}
