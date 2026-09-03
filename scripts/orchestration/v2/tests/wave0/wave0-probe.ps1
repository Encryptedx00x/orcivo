<#
wave0-probe.ps1 - one PRAGMATIC V2.1 Wave 0 scenario per child process.

Runs with -WorkingDirectory <disposable fixture> so lib-v2 resolves the V2
namespace inside the throwaway repo (NC-01). Prints 'PROBE_OK' on success.
No real model calls.
#>
param(
    [Parameter(Mandatory)][string]$Do,
    [string]$Arg1 = '', [string]$Arg2 = ''
)
$ErrorActionPreference = 'Stop'
$V2 = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

. (Join-Path $V2 'lib-v2.ps1')
. (Join-Path $V2 'ledger.ps1')
. (Join-Path $V2 'contract.ps1')
. (Join-Path $V2 'taskclass.ps1')
. (Join-Path $V2 'router.ps1')
. (Join-Path $V2 'providers.ps1')
. (Join-Path $V2 'continuation.ps1')
. (Join-Path $V2 'taskgraph.ps1')
. (Join-Path $V2 'fence.ps1')
. (Join-Path $V2 'intent.ps1')
. (Join-Path $V2 'correction.ps1')

function Ok  { param([string]$m = '') Write-Output ("PROBE_OK " + $m) }
function Die { param([string]$m) throw $m }
function Assert { param($c, [string]$m) if (-not $c) { Die $m } }

function Selftest { param([string]$Name, [scriptblock]$Fn)
    $r = & $Fn
    Assert $r.ok "$Name failed: $($r.failures -join ' | ')"
    Ok "$Name ($(@($r.failures).Count) failures)"
}

function Seed-Task {
    param([string]$TaskId, [string]$Spec = 'do the thing', [string]$Acc = "AC1: done", [string]$Risk = 'B', [string]$Gate = 'none')
    $head = (Get-GitHeadV2 (Get-RepoRoot))
    $c = Freeze-Contract -TaskId $TaskId -PlanningHead $head -SpecText $Spec -AcceptanceText $Acc `
        -DeclaredScope @("work/") -Risk $Risk -Gate $Gate -VerificationProfile 'A'
    Initialize-LedgerTask -TaskVersionId $c.taskVersionId -Identity @{ taskId = $TaskId; planningHead = $head } | Out-Null
    return $c
}

switch ($Do) {

    'classifier-structured' { Selftest 'classifier' { Test-ClassifierSelftest } }
    'router-capabilities'   { Selftest 'router'     { Test-RouterSelftest } }
    'taskgraph-deps'        { Selftest 'taskgraph'  { Test-TaskGraphSelftest } }
    'context-rollover'      { Selftest 'continuation'{ Test-ContinuationSelftest } }
    'generation-fence'      { Selftest 'fence'      { Test-FenceSelftest } }
    'providers-failover'    { Selftest 'providers'  { Test-ProvidersSelftest } }
    'correction-bounded'    { Selftest 'correction' { Test-CorrectionLoopSelftest } }
    'intent-reconcile'      { Selftest 'intent'     { Test-IntentSelftest } }

    'classifier-emits-structured-decision' {
        $r = Get-TaskClassification -Task @{ taskId = 'T-x'; title = 'add RBAC permission check to invoices endpoint'; type = 'BUG'
            description = 'enforce permission on GET /invoices'; acceptance = "AC1: 403 without permission"; touchesPaths = @('apps/backend/src/invoices') }
        foreach ($k in @('taskComplexity', 'risk', 'recommendedProfile', 'confidence', 'reasonCodes', 'suggestedProvider', 'reviewStrength')) {
            Assert ($r.Contains($k)) "classification missing structured field '$k'"
        }
        Assert ($r.taskComplexity -in @('COMPLEX', 'CRITICAL', 'LEVEL_C')) "security task complexity too low: $($r.taskComplexity)"
        Assert ($r.recommendedProfile -in @('REASONING', 'CRITICAL')) "security floor did not raise the profile: $($r.recommendedProfile)"
        Assert ($r.reviewStrength -in @('STRONG', 'CROSS_PROVIDER_REQUIRED')) "security floor did not raise review strength"
        Assert ($r.confidence -ge 0 -and $r.confidence -le 1) "confidence out of range"
        Ok "structured decision: $($r.taskComplexity)/$($r.risk)/$($r.recommendedProfile)/$($r.reviewStrength)"
    }

    'router-picks-from-real-capabilities' {
        $cls = Get-TaskClassification -Task @{ taskId = 'T-r'; title = 'trivial doc fix'; type = 'DOC'; description = 'typo'; acceptance = 'AC1: fixed'; touchesPaths = @('README.md') }
        $route = Resolve-Route -Classification ([hashtable]$cls) -HealthyProviders @('claude', 'codex')
        Assert $route.ok "route not resolved: $($route.reason)"
        Assert ($route.provider -in @('claude', 'codex')) "no provider chosen"
        Assert ($route.profile -in @('FAST', 'BALANCED', 'REASONING', 'CRITICAL')) "no profile chosen"
        Assert ($route.model -match 'not pinned|provider default') "model must NOT be a pinned version string (PARTE 12): '$($route.model)'"
        $crit = Get-TaskClassification -Task @{ taskId = 'T-c'; title = 'rework money architecture decimal precision rounding'; type = 'TECH_DEBT'; description = 'refactor money handling'; acceptance = 'AC1: no float'; touchesPaths = @('packages/shared-types/src') }
        $route2 = Resolve-Route -Classification ([hashtable]$crit) -HealthyProviders @('claude', 'codex')
        Assert ($route2.profile -eq 'CRITICAL') "critical task did not route to CRITICAL profile: $($route2.profile)"
        Ok "trivial->$($route.profile)@$($route.provider) ; critical->$($route2.profile)"
    }

    'opposite-reviewer-required' {
        $rv = Select-Reviewer -ImplementerProvider 'claude' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('claude', 'codex')
        Assert ($rv.reviewer -eq 'codex' -and $rv.crossProvider) "claude impl -> codex review expected"
        $rv = Select-Reviewer -ImplementerProvider 'codex' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('claude', 'codex')
        Assert ($rv.reviewer -eq 'claude' -and $rv.crossProvider) "codex impl -> claude review expected"
        $rv = Select-Reviewer -ImplementerProvider 'claude' -ReviewStrength 'CROSS_PROVIDER_REQUIRED' -HealthyProviders @('claude')
        Assert (-not $rv.ok -and $rv.escalate) "cross-provider-required + opposite down must escalate, never same-provider"
        Ok "opposite-provider review enforced"
    }

    'waiting-provider-lifecycle' {
        $c = Seed-Task 'T-wp'
        $tv = $c.taskVersionId
        Add-LedgerEvent -TaskVersionId $tv -Event 'ready' -ToState 'READY' | Out-Null
        Add-LedgerEvent -TaskVersionId $tv -Event 'dispatch' -ToState 'DISPATCHED' -RunId 'run-wpaaaaaaaa' | Out-Null
        Add-LedgerEvent -TaskVersionId $tv -Event 'running' -ToState 'RUNNING' -RunId 'run-wpaaaaaaaa' | Out-Null

        $script:ProviderHealthFaults = @{ claude = 'PROVIDER_QUOTA'; codex = 'PROVIDER_QUOTA' }
        try {
            $dec = Get-FailoverDecision -CurrentProvider 'claude' -Class 'PROVIDER_QUOTA' -FailoversSoFar 0
            Assert ($dec.action -eq 'WAITING_PROVIDER') "both down -> $($dec.action)"
            $rec = Enter-WaitingProvider -TaskVersionId $tv -RunId 'run-wpaaaaaaaa' -Context @{
                taskId = 'T-wp'; generation = 1; workspace = 'work/wt'; candidateCommit = ('a' * 40); candidateTree = ('b' * 40)
                attemptHistory = @('att-1'); providerHistory = @(@{ provider = 'claude'; class = 'PROVIDER_QUOTA' })
                verificationState = 'NONE'; reviewState = 'NONE'; checkpoint = @{ nextAction = 'resume execute' }; lastErrorClass = 'PROVIDER_QUOTA'
            }
            foreach ($f in @('taskVersionId', 'runId', 'generation', 'workspace', 'candidateCommit', 'candidateTree', 'attemptHistory', 'providerHistory', 'verificationState', 'reviewState', 'checkpoint', 'lastErrorClass', 'nextRetryAt')) {
                Assert ($rec.Contains($f)) "provider-wait record missing PARTE-14 field '$f'"
            }
            Assert ((Get-LedgerState $tv).state -eq 'WAITING_PROVIDER') "ledger not WAITING_PROVIDER"
            # sweep while still down -> STILL_WAITING
            $sw = Invoke-ProviderPollSweep -RunId 'sweep' -IgnoreBackoff
            Assert (@($sw | Where-Object { $_.action -eq 'STILL_WAITING' }).Count -ge 1) "sweep should report STILL_WAITING"
        } finally { $script:ProviderHealthFaults = @{ claude = 'PROVIDER_QUOTA' } }
        try {
            # codex recovers -> auto resume, WITHOUT a new attempt
            $before = (Get-LedgerState $tv).attempts
            $sw = Invoke-ProviderPollSweep -RunId 'run-wpaaaaaaaa' -IgnoreBackoff
            Assert (@($sw | Where-Object { $_.action -eq 'RESUMED' }).Count -eq 1) "sweep should RESUME exactly one task"
            $st = Get-LedgerState $tv
            Assert ($st.state -eq 'DISPATCHED') "resumed ledger state $($st.state), expected DISPATCHED"
            Assert ($st.attempts -eq $before) "resume must NOT count a new attempt ($before -> $($st.attempts))"
        } finally { $script:ProviderHealthFaults = $null }
        Ok "WAITING_PROVIDER: persisted, polled, auto-resumed on the healthy provider"
    }

    'restart-provider-resume' {
        # this scenario is invoked in a FRESH child process by the runner AFTER
        # another child left a task in WAITING_PROVIDER. Simulates a supervisor /
        # PC restart: startup reconciliation finds WAITING_PROVIDER and resumes.
        $tv = $Arg1
        Assert ($tv -match '^[0-9a-f]{64}$') "expected a taskVersionId in Arg1"
        $st = Get-LedgerState $tv
        Assert ($st.state -eq 'WAITING_PROVIDER') "precondition: task should be WAITING_PROVIDER, is $($st.state)"
        # providers healthy again (real CLIs are installed) -> startup sweep resumes
        $sw = Invoke-ProviderPollSweep -RunId 'restart-sweep' -IgnoreBackoff
        Assert (@($sw | Where-Object { $_.taskVersionId -eq $tv -and $_.action -eq 'RESUMED' }).Count -eq 1) "restart sweep did not resume the task"
        Assert ((Get-LedgerState $tv).state -eq 'DISPATCHED') "task not DISPATCHED after restart sweep"
        Ok "restart reconciliation resumed WAITING_PROVIDER with no human action"
    }

    'seed-waiting-provider' {
        # helper for the runner: seed a task and park it in WAITING_PROVIDER, print its tvid
        $c = Seed-Task 'T-restart'
        $tv = $c.taskVersionId
        Add-LedgerEvent -TaskVersionId $tv -Event 'ready' -ToState 'READY' | Out-Null
        Add-LedgerEvent -TaskVersionId $tv -Event 'dispatch' -ToState 'DISPATCHED' -RunId 'run-rsaaaaaaaa' | Out-Null
        Add-LedgerEvent -TaskVersionId $tv -Event 'running' -ToState 'RUNNING' -RunId 'run-rsaaaaaaaa' | Out-Null
        Enter-WaitingProvider -TaskVersionId $tv -RunId 'run-rsaaaaaaaa' -Context @{
            taskId = 'T-restart'; generation = 1; workspace = 'work/wt'; candidateCommit = ('a' * 40); candidateTree = ('b' * 40)
            attemptHistory = @('att-1'); providerHistory = @(@{ provider = 'claude'; class = 'PROVIDER_QUOTA' })
            verificationState = 'NONE'; reviewState = 'NONE'; checkpoint = @{ nextAction = 'resume execute' }; lastErrorClass = 'PROVIDER_QUOTA'
        } | Out-Null
        # push the nextRetryAt into the past so the restart sweep is due
        $p = Get-ProviderWaitPath $tv
        $w = Get-ProviderWait $tv
        $w.nextRetryAt = (Get-Date).ToUniversalTime().AddMinutes(-10).ToString('o')
        Write-V2JsonCanonical $p $w
        Ok $tv
    }

    'context-rollover-lineage' {
        $c = Seed-Task 'T-ctx'
        $tv = $c.taskVersionId
        # a context-length control message is NOT quota and NOT failover
        $ctrl = @{ errorType = 'invalid_request_error'; message = 'prompt is too long: 260000 tokens > 200000 maximum context length' }
        Assert (Test-IsContextExhaustion $ctrl) "context-length not detected"
        Assert (-not (Test-IsContextExhaustion @{ errorType = 'error_quota'; message = 'insufficient_quota' })) "quota misclassified as context exhaustion"
        $ck = New-ContinuationCheckpoint -TaskVersionId $tv -RunId 'run-ctxaaaaaa' -Provider 'claude' -Payload @{
            taskIdentity = $tv; acceptance = 'AC1: done'; decisions = @('use approach X'); candidate = ('a' * 40)
            diffSummary = '1 file changed'; verificationResults = 'pending'; openFindings = @(); nextAction = 'finish the artifact'
            importantArtifacts = @('work/artifact.md')
        }
        Assert ($ck.isFailover -eq $false) "continuation marked as failover"
        Assert ($ck.seq -eq 1) "continuation seq"
        $again = Get-ContinuationCheckpoint -TaskVersionId $tv
        Assert ($again.checkpointHash -eq $ck.checkpointHash) "continuation not retrievable / hash mismatch"
        # same task lineage: the ledger taskVersionId is unchanged
        Assert ($again.taskVersionId -eq $tv) "continuation changed the task lineage"
        Ok "context rollover: fresh checkpoint #$($ck.seq), same lineage, no hidden reasoning"
    }

    'level-c-waiting-human' {
        $c = Seed-Task 'T-lc' 'apply a persistent database migration and backfill company_id' "AC1: migration applied" 'C' 'owner-db-migration'
        $tv = $c.taskVersionId
        $cls = Get-TaskClassification -Task @{ taskId = 'T-lc'; title = 'apply persistent prisma migration'; type = 'TECH_DEBT'
            description = 'prisma migrate deploy, alter table, backfill'; acceptance = 'AC1: applied'; touchesPaths = @('prisma/migrations') }
        Assert ($cls.taskComplexity -eq 'LEVEL_C') "migration task not LEVEL_C: $($cls.taskComplexity)"
        # taskgraph agrees
        $g = New-TaskGraph -Tasks @(@{ taskId = 'T-lc'; title = 'x'; type = 'TECH_DEBT'; source = 's'; description = 'd'; acceptance = 'AC1: a'
            dependencies = @(); scope = @('prisma/'); risk = 'C'; productBatch = 'B1'; ownerGate = 'owner-db-migration'; candidateConstraints = @(); verificationProfile = 'C'; status = 'PENDING' })
        Assert ($g.levelCTasks -contains 'T-lc') "taskgraph did not flag T-lc as Level C"
        Assert ($g.readyTasks -notcontains 'T-lc') "Level C task is in the ready set"
        # pipeline entry: READY -> WAITING_HUMAN (no gate satisfied)
        Add-LedgerEvent -TaskVersionId $tv -Event 'ready' -ToState 'READY' | Out-Null
        Add-LedgerEvent -TaskVersionId $tv -Event 'level-c-hold' -ToState 'WAITING_HUMAN' -Note 'owner gate required' | Out-Null
        $disp = Test-CanDispatch $tv
        Assert (-not $disp.ok) "WAITING_HUMAN task is dispatchable"
        Ok "Level C -> WAITING_HUMAN, not auto-dispatchable"
    }

    'duplicate-no-effect' {
        $c = Seed-Task 'T-dup'
        $tv = $c.taskVersionId
        foreach ($s in @(@('ready', 'READY'), @('dispatch', 'DISPATCHED'), @('running', 'RUNNING'), @('checking', 'CHECKING'),
                          @('reviewing', 'REVIEWING'), @('approved', 'APPROVED'), @('integrate-start', 'INTEGRATING'))) {
            Add-LedgerEvent -TaskVersionId $tv -Event $s[0] -ToState $s[1] -RunId 'run-dupaaaaaa' | Out-Null
        }
        Add-LedgerEvent -TaskVersionId $tv -Event 'published' -ToState 'PUBLISHED' -RunId 'run-dupaaaaaa' -Evidence @{ headSHA = ('a' * 40) } | Out-Null
        $disp = Test-CanDispatch $tv
        Assert (-not $disp.ok) "a PUBLISHED task version is still dispatchable"
        Assert (($disp.reasons -join ' ') -match 'PUBLISHED') "dispatch refusal does not cite PUBLISHED"
        $threw = $false
        try { Add-LedgerEvent -TaskVersionId $tv -Event 'dispatch' -ToState 'DISPATCHED' -RunId 'run-dup2222' | Out-Null } catch { $threw = $true }
        Assert $threw "re-entering a PUBLISHED task version did not throw"
        Ok "duplicate dispatch of a PUBLISHED task version produces no effect"
    }

    'implementer-no-publish' {
        # (a) structural: the ONLY authoritative code that runs `git push` is integrate.ps1
        $pushers = @()
        foreach ($f in (Get-ChildItem -LiteralPath $V2 -Filter '*.ps1' -File)) {
            $t = Get-Content -Raw -LiteralPath $f.FullName
            # ignore push lines that live inside a Test-*Selftest helper (test-only integrator simulation)
            $auth = ($t -split '(?m)^function\s+Test-\w*Selftest')[0]
            if ($auth -match "(?m)&\s*git\s+(-C[^\r\n]*)?\bpush\b") { $pushers += $f.Name }
        }
        # Zone D (deterministic integrator) is the ONLY authoritative publisher.
        $allowed = @('integrate.ps1')
        $bad = @($pushers | Where-Object { $allowed -notcontains $_ })
        Assert ($bad.Count -eq 0) "unexpected authoritative files invoke 'git push': $($bad -join ', ')"
        # the executor step (fake agent + _invokeFake) has no push
        $fake = Get-Content -Raw -LiteralPath (Join-Path $V2 'tests\fake-agent-v2.ps1')
        Assert ($fake -notmatch '\bpush\b') "the executor stand-in contains a push path"
        # (b) the executor context carries no push credential env
        foreach ($v in @('GITHUB_TOKEN', 'GH_TOKEN', 'GIT_ASKPASS_TOKEN')) {
            # these are not set for the harness; the real runner scrubs them
            Assert (-not [Environment]::GetEnvironmentVariable($v)) "push credential env '$v' is present in the harness context"
        }
        Ok "only the deterministic integrator publishes; implementer has no push path"
    }

    'candidate-code-not-in-supervisor' {
        . (Join-Path $V2 'verification.ps1')
        $cfg = Get-V2Config
        foreach ($pid2 in @($cfg.verification.profiles.PSObject.Properties.Name)) {
            $inv = Get-VerificationInvocation -ProfileId $pid2
            foreach ($step in @($inv.steps)) {
                Assert ($step.resolvedExecutable -like 'in-process:*') "profile $pid2 step $($step.stepId) resolves to '$($step.resolvedExecutable)' - candidate-adjacent code must not run in the supervisor process"
                Assert (@($step.argv).Count -eq 0) "profile $pid2 step has argv - only declarative builtins are allowed"
            }
            $p = $cfg.verification.profiles.$pid2
            foreach ($chk in @($p.checks)) {
                Assert ("$($chk.kind)" -eq 'builtin') "profile $pid2 check '$($chk.id)' kind '$($chk.kind)' != builtin (no task-supplied command)"
                Assert (-not $chk.executable -and -not $chk.command -and -not $chk.script) "profile $pid2 check carries an executable/command/script"
            }
        }
        # the authoritative pipeline files never invoke a package manager / eval
        foreach ($f in @('contract.ps1', 'verification.ps1', 'integrate.ps1', 'attest.ps1', 'review-envelope.ps1', 'preflight.ps1', 'ledger.ps1')) {
            $t = Get-Content -Raw -LiteralPath (Join-Path $V2 $f)
            Assert ($t -notmatch '(?m)(^|[^\w-])(pnpm|npm run|yarn|npx)\s' ) "$f invokes a package manager"
            Assert ($t -notmatch 'Invoke-Expression|\biex\b') "$f uses Invoke-Expression"
        }
        Ok "verification is declarative in-process only; candidate-controlled code never runs in the supervisor"
    }

    'product-batch-awaits-owner' {
        $repo = Get-RepoRoot
        $batch = Join-Path $repo '.planning\product\MVP-PRODUCT-BATCH-1.md'
        Assert (Test-Path $batch) "MVP-PRODUCT-BATCH-1.md not found at $batch"
        $t = Get-Content -Raw -LiteralPath $batch
        Assert ($t -match '(?i)proposal only|PROPOSAL_ONLY') "batch doc does not declare PROPOSAL ONLY"
        Assert ($t -match 'OWNER_APPROVAL') "batch doc does not stop at OWNER_APPROVAL"
        # no authoritative module auto-approves a product batch
        foreach ($f in (Get-ChildItem -LiteralPath $V2 -Filter '*.ps1' -File)) {
            $c = Get-Content -Raw -LiteralPath $f.FullName
            Assert ($c -notmatch '(?im)^\s*function\s+(Approve-ProductBatch|Set-BatchApproved|Invoke-AutoApprove)') "$($f.Name) defines a product-batch auto-approval function"
        }
        Ok "MVP Product Batch #1 is PROPOSAL ONLY and stops at OWNER_APPROVAL"
    }

    'protected-planning-blocked' {
        . (Join-Path $V2 'verification.ps1')
        $c = Seed-Task 'T-prot'
        $repo = Get-RepoRoot
        $wt = Join-Path $repo 'wt-prot'
        $base = (Get-GitHeadV2 $repo)
        & git -C $repo worktree add -q -b wtprot $wt $base 2>&1 | Out-Null
        try {
            New-Item -ItemType Directory -Force -Path (Join-Path $wt '.planning') | Out-Null
            Set-Content -LiteralPath (Join-Path $wt '.planning\INJECTED.md') -Value 'executor tried to rewrite planning' -Encoding ascii
            Set-Content -LiteralPath (Join-Path $wt 'work\ok.md') -Value 'legit' -Encoding ascii
            & git -C $wt add -A 2>&1 | Out-Null
            & git -C $wt -c user.name=x -c user.email=x@x commit -q -m 'mix' 2>&1 | Out-Null
            $head = (Get-GitHeadV2 $wt)
            $cc = Test-ContractCompliance -TaskVersionId $c.taskVersionId -WorktreeDir $wt -BaseSha $base -HeadSha $head
            Assert (-not $cc.compliant) "protected .planning change was not blocked"
            Assert (($cc.violations -join ' ') -match 'PROTECTED') "violation does not cite PROTECTED"
        } finally {
            & git -C $repo worktree remove --force $wt 2>&1 | Out-Null
            & git -C $repo branch -D wtprot 2>&1 | Out-Null
        }
        Ok "executor edit of .planning -> POLICY_BLOCK"
    }

    default { Die "unknown wave0 scenario '$Do'" }
}
