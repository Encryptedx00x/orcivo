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

function Get-OrchConfig {
    if (-not (Test-Path $script:ConfigPath)) { throw "missing $script:ConfigPath" }
    return (Get-Content -Raw -LiteralPath $script:ConfigPath | ConvertFrom-Json)
}

function New-Utf8NoBom { return (New-Object System.Text.UTF8Encoding($false)) }

function Write-TextFile {
    param([string]$Path, [string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Content, (New-Utf8NoBom))
}

# PS 5.1 ConvertTo-Json serializes an empty array @() as "{}" - repair the list fields.
$script:ListFields = @('dependencies','scope','commandsRun','checksRun','dirtyFiles','diffStat','checks','agentResults','tasks','patterns','failoverOn','neverFailoverOn','triggers','policyDocs')

function Write-JsonFile {
    param([string]$Path, $Object)
    $json = $Object | ConvertTo-Json -Depth 20
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

function Protect-Secrets {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return $Text }
    $cfg = Get-OrchConfig
    $out = $Text
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

# --- worktree writer lock ------------------------------------------------

function Get-LockPath {
    param([string]$RunId)
    return (Join-Path $script:OrchDir ("locks\{0}.lock" -f $RunId))
}

function Enter-WorktreeLock {
    param([string]$RunId, [string]$Owner)
    $lock = Get-LockPath $RunId
    if (Test-Path $lock) {
        $held = Read-JsonFile $lock
        throw "worktree $RunId is locked by $($held.owner) since $($held.acquired)"
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
    return (Test-Path (Get-LockPath $RunId))
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

# --- failure classification -------------------------------------------

# Classify an agent invocation result from hard evidence, not a single substring.
# Inputs: provider, exitCode, stdout, stderr, plus optional injected signal.
# Returns one of: OK | PROVIDER_QUOTA | PROVIDER_RATE_LIMIT | PROVIDER_AUTH_EXPIRED |
#                 PROVIDER_TEMP_UNAVAILABLE | AGENT_ERROR | TIMEOUT
function Get-FailureClass {
    param(
        [string]$Provider,
        [int]$ExitCode,
        [string]$Stdout,
        [string]$Stderr,
        [string]$InjectedSignal = ''
    )
    if ($InjectedSignal) { return $InjectedSignal }
    if ($ExitCode -eq 0) { return 'OK' }

    $blob = (("{0}`n{1}" -f $Stderr, $Stdout)).ToLowerInvariant()
    function _has($rx) { return ($blob -match $rx) }

    # Provider-level classification needs CORROBORATED evidence, not one loose token.
    # When uncertain -> AGENT_ERROR (no failover). Conservative on purpose.

    if ( (_has 'quota') -or (_has 'insufficient_quota') -or (_has 'credit balance is too low') `
         -or ((_has 'billing') -and (_has 'limit')) ) {
        return 'PROVIDER_QUOTA'
    }
    if ( (_has 'rate limit') -or (_has 'rate_limit') -or (_has 'too many requests') `
         -or ((_has '\b429\b') -and (_has 'request')) ) {
        return 'PROVIDER_RATE_LIMIT'
    }
    if ( (_has 'authentication_error') -or (_has 'oauth') -or (_has 'token (has )?expired') `
         -or (_has 'session (has )?expired') -or (_has 'invalid api key') `
         -or (_has 'please (run|use).{0,20}login') -or (_has 'not (logged|signed) in') `
         -or ((_has '\b401\b') -and (_has 'unauth')) ) {
        return 'PROVIDER_AUTH_EXPIRED'
    }
    if ( (_has 'overloaded') -or (_has 'service unavailable') -or (_has 'upstream connect error') `
         -or ((_has '\b50[234]\b') -and ((_has 'api') -or (_has 'anthropic') -or (_has 'openai'))) `
         -or ((_has 'econnreset|etimedout|enotfound|socket hang up') -and ((_has 'api') -or (_has 'http'))) ) {
        return 'PROVIDER_TEMP_UNAVAILABLE'
    }

    return 'AGENT_ERROR'
}

function Test-IsProviderFailure {
    param([string]$Class)
    $cfg = Get-OrchConfig
    return ((ConvertTo-List $cfg.providers.failoverOn) -contains $Class)
}

# --- git helpers (read-only unless explicit) --------------------------

function Get-GitHead {
    param([string]$Dir = $script:RepoRoot)
    return (& git -C $Dir rev-parse HEAD).Trim()
}

function Get-GitStatusPorcelain {
    param([string]$Dir = $script:RepoRoot)
    return (& git -C $Dir status --porcelain=v1)
}

function Get-GitDiffStat {
    param([string]$Dir, [string]$BaseSha)
    return (& git -C $Dir diff --stat $BaseSha)
}
