# lib.ps1 - shared helpers for the Orcivo orchestration layer (Windows PowerShell 5.1)
# No external modules. JSON state. Redaction on every write that can carry agent/CLI output.

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    $p = (& git rev-parse --show-toplevel 2>$null)
    if (-not $p) { throw "not inside a git repository" }
    return ($p -replace '/', '\')
}

$script:RepoRoot   = Get-RepoRoot
$script:OrchDir    = Join-Path $script:RepoRoot '.orchestration'
$script:ConfigPath = Join-Path $script:OrchDir 'config.json'
$script:CfgCache   = $null

function Get-OrchConfig {
    if ($script:CfgCache) { return $script:CfgCache }
    if (-not (Test-Path $script:ConfigPath)) { throw "missing $script:ConfigPath" }
    $script:CfgCache = (Get-Content -Raw -LiteralPath $script:ConfigPath | ConvertFrom-Json)
    return $script:CfgCache
}

function New-Utf8NoBom { return (New-Object System.Text.UTF8Encoding($false)) }

function Write-TextFile {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Content, (New-Utf8NoBom))
}

# PS 5.1 ConvertTo-Json serializes an empty array @() as "{}" - repair the list fields.
$script:ListFields = @('dependencies','planDependencies','scope','scopes','commandsRun','checksRun',
    'dirtyFiles','diffStat','checks','agentResults','tasks','patterns','failoverOn','neverFailoverOn',
    'triggers','policyDocs','findings','reviewCycles','errors','warnings','items','ready','blocked','running','externalGates','gateDependencies','referencedTasks')

function Write-JsonFile {
    param([string]$Path, $Object)
    $json = $Object | ConvertTo-Json -Depth 25
    foreach ($f in $script:ListFields) {
        $json = [regex]::Replace($json, ('"{0}":\s*\{{\s*\}}' -f $f), ('"{0}": []' -f $f))
    }
    Write-TextFile -Path $Path -Content $json
}

# Coerce null / empty-hashtable / scalar / array into a plain array.
function ConvertTo-List {
    param($Value)
    if ($null -eq $Value) { return @() }
    if ($Value -is [System.Collections.IDictionary]) {
        if ($Value.Count -eq 0) { return @() }
        return @($Value.Values)
    }
    return @($Value)
}

function ConvertTo-OrchHashtable {
    param($InputObject)
    if ($null -eq $InputObject) { return $null }
    if ($InputObject -is [System.Collections.IDictionary]) {
        $h = @{}
        foreach ($k in $InputObject.Keys) { $h[$k] = ConvertTo-OrchHashtable $InputObject[$k] }
        return $h
    }
    if ($InputObject -is [System.Management.Automation.PSCustomObject]) {
        $h = @{}
        foreach ($p in $InputObject.PSObject.Properties) { $h[$p.Name] = ConvertTo-OrchHashtable $p.Value }
        return $h
    }
    if ($InputObject -is [object[]]) {
        return @($InputObject | ForEach-Object { ConvertTo-OrchHashtable $_ })
    }
    return $InputObject
}

# Returns a mutable nested hashtable (PS 5.1 has no ConvertFrom-Json -AsHashtable).
function Read-JsonFile {
    param([string]$Path)
    return (ConvertTo-OrchHashtable (Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json))
}

# --- redaction -------------------------------------------------------------
# Denylist regex + a structural guard: never persist more than N env-like
# KEY=VALUE lines in a row (an .env dump), collapse the whole block instead.

function Protect-Secrets {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return $Text }
    $cfg = Get-OrchConfig
    $out = $Text

    # structural guard first: an .env-style dump (many KEY=VALUE lines) is collapsed
    # wholesale before the denylist runs, so we never persist an environment dump.
    $maxEnv = if ($cfg.redaction.maxEnvLikeLines) { [int]$cfg.redaction.maxEnvLikeLines } else { 6 }
    $lines = $out -split "`n"
    $envRx = '^\s*(export\s+)?[A-Z][A-Z0-9_]{2,}\s*=\s*\S'   # .env convention: UPPER_SNAKE=value
    $envLike = @($lines | Where-Object { $_ -match $envRx }).Count
    if ($envLike -gt $maxEnv) {
        $kept = $lines | Where-Object { $_ -notmatch $envRx }
        $out = (@($kept) -join "`n") + "`n[REDACTED: $envLike env-style lines withheld - no environment dumps persisted]"
    }

    foreach ($pat in $cfg.redaction.patterns) {
        try { $out = [regex]::Replace($out, $pat, $cfg.redaction.replacement) } catch { }
    }
    return $out
}

function Write-RedactedFile {
    param([string]$Path, [string]$Content)
    Write-TextFile -Path $Path -Content (Protect-Secrets $Content)
}

# --- logging --------------------------------------------------------------

function Write-OrchLog {
    param([string]$Message, [string]$Level = 'INFO')
    $line = "{0} [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'), $Level, $Message
    Write-Host $line
    $logFile = Join-Path $script:OrchDir 'logs\supervisor.log'
    $dir = Split-Path -Parent $logFile
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Add-Content -LiteralPath $logFile -Value (Protect-Secrets $line) -Encoding utf8
}

# --- process liveness ----------------------------------------------------

function Test-PidAlive {
    param([int]$ProcessId)
    if (-not $ProcessId) { return $false }
    try { $null = Get-Process -Id $ProcessId -ErrorAction Stop; return $true } catch { return $false }
}

# --- worktree writer lock ----------------------------------------------
# A lock is only meaningful while its owning process is alive. A lock whose
# pid is dead is an ORPHAN (crash / closed terminal) - recover clears it.

function Get-LockPath {
    param([string]$RunId)
    return (Join-Path $script:OrchDir ("locks\{0}.lock" -f $RunId))
}

function Enter-WorktreeLock {
    param([string]$RunId, [string]$Owner)
    $lock = Get-LockPath $RunId
    if (Test-Path $lock) {
        $held = Read-JsonFile $lock
        if (Test-PidAlive ([int]$held.pid)) {
            throw "worktree $RunId is locked by $($held.owner) (pid $($held.pid), since $($held.acquired))"
        }
        Write-OrchLog "lock: clearing ORPHAN lock for $RunId (dead pid $($held.pid))" 'WARN'
        Remove-Item -LiteralPath $lock -Force
    }
    Write-JsonFile -Path $lock -Object @{ owner = $Owner; acquired = (Get-Date -Format 'o'); pid = $PID }
    return $lock
}

function Exit-WorktreeLock {
    param([string]$RunId)
    $lock = Get-LockPath $RunId
    if (Test-Path $lock) { Remove-Item -LiteralPath $lock -Force }
}

function Test-WorktreeLock {
    param([string]$RunId)
    $lock = Get-LockPath $RunId
    if (-not (Test-Path $lock)) { return $false }
    $held = Read-JsonFile $lock
    return (Test-PidAlive ([int]$held.pid))
}

function Get-OrphanLocks {
    $dir = Join-Path $script:OrchDir 'locks'
    if (-not (Test-Path $dir)) { return @() }
    Get-ChildItem $dir -Filter '*.lock' | ForEach-Object {
        $held = Read-JsonFile $_.FullName
        if (-not (Test-PidAlive ([int]$held.pid))) {
            [ordered]@{ runId = $_.BaseName; owner = $held.owner; pid = $held.pid; acquired = $held.acquired; path = $_.FullName }
        }
    }
}

# --- run records --------------------------------------------------------

function Get-RunDir {
    param([string]$RunId)
    return (Join-Path $script:OrchDir ("runs\{0}" -f $RunId))
}

function Get-RunRecord {
    param([string]$RunId)
    $p = Join-Path (Get-RunDir $RunId) 'run.json'
    if (-not (Test-Path $p)) { throw "no run record for $RunId" }
    return (Read-JsonFile $p)
}

function Save-RunRecord {
    param($Record)
    Write-JsonFile -Path (Join-Path (Get-RunDir $Record.runId) 'run.json') -Object $Record
}

function Get-AllRunRecords {
    $dir = Join-Path $script:OrchDir 'runs'
    if (-not (Test-Path $dir)) { return @() }
    Get-ChildItem $dir -Directory | ForEach-Object {
        $p = Join-Path $_.FullName 'run.json'
        if (Test-Path $p) { Read-JsonFile $p }
    }
}

# --- failure classification -------------------------------------------
# One vocabulary, used by run-agent (invocation failures) and verify
# (check failures). Failover is allowed ONLY for the four PROVIDER_* classes,
# and only when the evidence is corroborated. Everything uncertain -> UNKNOWN
# (no failover, stop for a human).
#
#   PROVIDER_QUOTA PROVIDER_RATE_LIMIT PROVIDER_AUTH_EXPIRED PROVIDER_TEMP_UNAVAILABLE
#   AGENT_ERROR CHECK_FAILURE BUILD_FAILURE TEST_FAILURE MERGE_CONFLICT
#   INFRA_FAILURE HUMAN_GATE UNKNOWN | OK

function Get-FailureClass {
    param(
        [string]$Provider,
        [int]$ExitCode,
        [string]$Stdout,
        [string]$Stderr,
        [string]$InjectedSignal = ''
    )
    if ($InjectedSignal) { return $InjectedSignal }
    if ($ExitCode -eq 0) {
        if (("{0}`n{1}" -f $Stdout, $Stderr) -match '(?im)^\s*HUMAN_GATE\s*:') { return 'HUMAN_GATE' }
        return 'OK'
    }

    $blob = (("{0}`n{1}" -f $Stderr, $Stdout)).ToLowerInvariant()
    function _has($rx) { return ([bool]($blob -match $rx)) }

    if (("{0}`n{1}" -f $Stdout, $Stderr) -match '(?im)^\s*HUMAN_GATE\s*:') { return 'HUMAN_GATE' }

    # --- PROVIDER_* : corroborated evidence only ---
    if ( (_has 'insufficient_quota') -or (_has 'credit balance is too low') `
         -or (_has "you've (hit|reached) your (usage|plan) limit") -or (_has 'usage limit reached') `
         -or ((_has 'quota') -and (_has 'exceed')) -or ((_has 'billing') -and (_has 'limit')) ) {
        return 'PROVIDER_QUOTA'
    }
    if ( (_has 'rate[ _]limit') -or (_has 'too many requests') -or (_has 'retry after') `
         -or ((_has '\b429\b') -and ((_has 'request') -or (_has 'anthropic') -or (_has 'openai'))) ) {
        return 'PROVIDER_RATE_LIMIT'
    }
    if ( (_has 'authentication_error') -or (_has 'invalid api key') -or (_has 'invalid x-api-key') `
         -or (_has 'oauth token (has )?expired') -or (_has 'session (has )?expired') `
         -or (_has 'please run .{0,12}(/login|login)') -or (_has 'not logged in') -or (_has 'run `?codex login') `
         -or ((_has '\b401\b') -and (_has 'unauth')) ) {
        return 'PROVIDER_AUTH_EXPIRED'
    }
    if ( (_has 'overloaded_error') -or (_has 'server is overloaded') -or (_has 'service unavailable') `
         -or (_has 'upstream connect error') -or (_has 'stream (disconnected|error) before completion') `
         -or ((_has '\b50[234]\b') -and ((_has 'api') -or (_has 'anthropic') -or (_has 'openai'))) `
         -or ((_has 'econnreset|etimedout|enotfound|socket hang up|network error') -and ((_has 'api\.') -or (_has 'anthropic') -or (_has 'openai'))) ) {
        return 'PROVIDER_TEMP_UNAVAILABLE'
    }

    # --- local, non-provider failures ---
    if ( (_has 'econnrefused') -and (_has '(5433|5544|6379|6380|9000|9002|postgres|redis|minio|docker)') ) { return 'INFRA_FAILURE' }
    if ( (_has 'merge conflict') -or (_has 'conflict.*(prevent|abort)') -or (_has 'automatic merge failed') ) { return 'MERGE_CONFLICT' }
    if ( (_has 'tsc.*error ts\d') -or (_has 'type error') -or (_has 'cannot find module') -or (_has 'build failed') ) { return 'BUILD_FAILURE' }
    if ( (_has '\bfail(ed)?\b.*\btest') -or (_has 'tests? failed') -or (_has '\d+ failing') ) { return 'TEST_FAILURE' }
    if ( (_has 'timeout') -or ($ExitCode -eq 124) ) { return 'AGENT_ERROR' }

    return 'UNKNOWN'
}

function Test-IsProviderFailure {
    param([string]$Class)
    $cfg = Get-OrchConfig
    return ((ConvertTo-List $cfg.providers.failoverOn) -contains $Class)
}

# --- scope conflict logic -------------------------------------------
# Two tasks may run together ONLY if independence can be PROVEN:
#   deps clear, scopes known and disjoint, neither touches shared/global
#   surface (schema/migrations/shared-types/lockfile/CI/bootstrap),
#   neither is Level C. Anything unprovable -> serialize.

function Test-TouchesShared {
    param([string[]]$Scope)
    $cfg = Get-OrchConfig
    foreach ($s in $Scope) {
        foreach ($g in (ConvertTo-List $cfg.reconcile.sharedScopeGlobs)) {
            if ($s -and $s.ToLowerInvariant().Contains($g.ToLowerInvariant().Trim('*'))) { return $true }
        }
    }
    return $false
}

function Test-ScopeOverlap {
    param([string[]]$A, [string[]]$B)
    foreach ($x in $A) {
        foreach ($y in $B) {
            if (-not $x -or -not $y) { continue }
            $xl = $x.ToLowerInvariant().TrimEnd('/'); $yl = $y.ToLowerInvariant().TrimEnd('/')
            if ($xl -eq $yl -or $xl.StartsWith("$yl/") -or $yl.StartsWith("$xl/")) { return $true }
        }
    }
    return $false
}

function Test-CanRunTogether {
    param($TaskA, $TaskB)
    $sa = @(ConvertTo-List $TaskA.scopes); $sb = @(ConvertTo-List $TaskB.scopes)
    if ($sa.Count -eq 0 -or $sb.Count -eq 0) { return $false }          # unknown scope -> cannot prove
    if ($TaskA.risk -eq 'C' -or $TaskB.risk -eq 'C') { return $false }
    if ($TaskA.humanGate -or $TaskB.humanGate) { return $false }
    if (Test-TouchesShared $sa) { return $false }
    if (Test-TouchesShared $sb) { return $false }
    if (Test-ScopeOverlap $sa $sb) { return $false }
    if ((ConvertTo-List $TaskA.dependencies) -contains $TaskB.task_id) { return $false }
    if ((ConvertTo-List $TaskB.dependencies) -contains $TaskA.task_id) { return $false }
    return $true
}

# --- git helpers (read-only unless explicit) --------------------------

function Get-GitHead {
    param([string]$Dir = $script:RepoRoot)
    return (& git -C $Dir rev-parse HEAD).Trim()
}

function Get-GitHeadShort {
    param([string]$Dir = $script:RepoRoot)
    return (& git -C $Dir rev-parse --short HEAD).Trim()
}

function Get-GitStatusPorcelain {
    param([string]$Dir = $script:RepoRoot)
    return (& git -C $Dir status --porcelain=v1)
}

function Test-GitClean {
    param([string]$Dir = $script:RepoRoot)
    return (@(Get-GitStatusPorcelain $Dir).Count -eq 0)
}

function Get-GitDiffStat {
    param([string]$Dir, [string]$BaseSha)
    return (& git -C $Dir diff --stat $BaseSha)
}

function Get-GitUpstreamStatus {
    param([string]$Dir = $script:RepoRoot)
    $ahead = 0; $behind = 0; $upstream = ''
    try {
        $upstream = (& git -C $Dir rev-parse --abbrev-ref '@{u}' 2>$null).Trim()
        if ($upstream) {
            $counts = (& git -C $Dir rev-list --left-right --count "HEAD...$upstream" 2>$null).Trim() -split '\s+'
            $ahead = [int]$counts[0]; $behind = [int]$counts[1]
        }
    } catch { }
    return [ordered]@{ upstream = $upstream; ahead = $ahead; behind = $behind }
}

# Guard: the orchestration layer must NEVER rewrite history or force anything.
function Assert-SafeGitArgs {
    param([string[]]$GitArgs)
    $joined = ($GitArgs -join ' ').ToLowerInvariant()
    foreach ($bad in @('--force', '-f ', 'reset --hard', 'push --force', '--force-with-lease', 'clean -fd', 'branch -d ', 'branch -d', 'rebase -i', 'filter-branch', 'reflog delete')) {
        if ($joined -match [regex]::Escape($bad)) { throw "BLOCKED unsafe git operation: git $joined" }
    }
}

function Invoke-SafeGit {
    param([Parameter(ValueFromRemainingArguments = $true)] [string[]]$GitArgs)
    Assert-SafeGitArgs $GitArgs
    & git @GitArgs
    return $LASTEXITCODE
}

function Get-OrchWorktrees {
    $wtRoot = (Join-Path $script:OrchDir 'worktrees').ToLowerInvariant()
    $out = @()
    $cur = @{}
    foreach ($line in (& git -C $script:RepoRoot worktree list --porcelain)) {
        if ($line -match '^worktree (.+)$') { if ($cur.path) { $out += ,([pscustomobject]$cur) }; $cur = @{ path = $matches[1] } }
        elseif ($line -match '^branch (.+)$') { $cur.branch = ($matches[1] -replace '^refs/heads/', '') }
        elseif ($line -match '^HEAD (.+)$') { $cur.head = $matches[1] }
    }
    if ($cur.path) { $out += ,([pscustomobject]$cur) }
    return @($out | Where-Object { $_.path -and $_.path.ToLowerInvariant().Replace('/', '\').Contains('\.orchestration\worktrees\') })
}
