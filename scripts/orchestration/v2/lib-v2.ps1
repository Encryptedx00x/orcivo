<#
lib-v2.ps1 - safe low-level helpers for the Orcivo orchestration SECURITY SPINE (V2).

V2 is a clean-room rebuild after the independent Codex review REJECTED V1
(.planning/reviews/ORCHESTRATION-SUPERVISOR-INDEPENDENT-REVIEW.md). This file
deliberately does NOT dot-source scripts/orchestration/lib.ps1. Every helper here
was written or re-audited against that review:

  - Protect-SecretsStreaming   replaces V1 Protect-Secrets (H-11: streaming, fail-safe)
  - New-ContentHash / canonical replaces nothing in V1 (C-03: content addressing)
  - Test-SafeId / Resolve-SafePath / ConvertTo-Win32Arg / Invoke-NativeCaptured
                                replaces V1 Start-Process arg building (H-12)
  - New-ExclusiveFile          replaces V1 Test-Path+write lock (H-05: atomic)

V2 state lives under .orchestration/v2/ ONLY. V1 runtime state is never read here.
#>

$ErrorActionPreference = 'Stop'

# ----------------------------------------------------------------------------
# repo / namespace
# ----------------------------------------------------------------------------

function Get-RepoRootV2 {
    $p = (& git rev-parse --show-toplevel 2>$null)
    if (-not $p) { throw "v2: not inside a git repository" }
    return ($p -replace '/', '\').Trim()
}

$script:RepoRootV2 = Get-RepoRootV2
$script:V2Dir      = Join-Path $script:RepoRootV2 '.orchestration\v2'
$script:V2Config   = Join-Path $script:RepoRootV2 '.orchestration\v2\config.v2.json'

function Get-V2Dir { return $script:V2Dir }
function Get-RepoRoot { return $script:RepoRootV2 }

# Hard guard: the spine must never run against the real Orcivo application repo
# unless a test harness explicitly opts in. V1 and V2 both stay wired away from
# real GSD tasks (constraints 1 & 2 of the remediation brief).
function Assert-NotRealRepo {
    param([string]$Why = 'operation')
    $stateMd = Join-Path $script:RepoRootV2 '.planning\STATE.md'
    $backend = Join-Path $script:RepoRootV2 'apps\backend'
    $isReal  = (Test-Path $stateMd) -and (Test-Path $backend)
    if ($isReal -and $env:ORCH_V2_TESTING -ne '1') {
        throw "v2 SAFETY: refusing to $Why against the real Orcivo repo. " +
              "V2 is a security spine under review and must not execute real tasks. " +
              "(set ORCH_V2_TESTING=1 only inside the deterministic test harness on a throwaway repo)"
    }
}

function Get-V2Config {
    if (-not (Test-Path $script:V2Config)) { throw "v2: missing $script:V2Config" }
    return (Get-Content -Raw -LiteralPath $script:V2Config | ConvertFrom-Json)
}

# ----------------------------------------------------------------------------
# canonical JSON + content hashing  (C-03, L-01)
# ----------------------------------------------------------------------------

function New-Utf8NoBom { return (New-Object System.Text.UTF8Encoding($false)) }

# Deterministic serialization: object keys sorted, no insignificant whitespace,
# arrays kept in order. Two structurally-equal objects always hash identically.
function ConvertTo-CanonicalJson {
    param($InputObject)
    $sb = New-Object System.Text.StringBuilder
    _WriteCanonical $InputObject $sb
    return $sb.ToString()
}

function _WriteCanonical {
    param($o, $sb)
    if ($null -eq $o) { [void]$sb.Append('null'); return }
    if ($o -is [bool]) { [void]$sb.Append($(if ($o) { 'true' } else { 'false' })); return }
    if ($o -is [int] -or $o -is [long] -or $o -is [double] -or $o -is [decimal]) {
        [void]$sb.Append(([string]$o)); return
    }
    if ($o -is [string]) { [void]$sb.Append((_JsonString $o)); return }
    if ($o -is [System.Collections.IDictionary]) {
        [void]$sb.Append('{')
        $first = $true
        foreach ($k in ($o.Keys | Sort-Object { [string]$_ } -CaseSensitive)) {
            if (-not $first) { [void]$sb.Append(',') }
            $first = $false
            [void]$sb.Append((_JsonString ([string]$k))); [void]$sb.Append(':')
            _WriteCanonical $o[$k] $sb
        }
        [void]$sb.Append('}'); return
    }
    if ($o -is [System.Management.Automation.PSCustomObject]) {
        $h = [ordered]@{}
        foreach ($p in $o.PSObject.Properties) { $h[$p.Name] = $p.Value }
        _WriteCanonical $h $sb; return
    }
    if ($o -is [System.Collections.IEnumerable]) {
        [void]$sb.Append('[')
        $first = $true
        foreach ($item in $o) {
            if (-not $first) { [void]$sb.Append(',') }
            $first = $false
            _WriteCanonical $item $sb
        }
        [void]$sb.Append(']'); return
    }
    [void]$sb.Append((_JsonString ([string]$o)))
}

function _JsonString {
    param([string]$s)
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('"')
    foreach ($ch in $s.ToCharArray()) {
        switch ($ch) {
            '"'  { [void]$sb.Append('\"') }
            '\'  { [void]$sb.Append('\\') }
            "`b" { [void]$sb.Append('\b') }
            "`f" { [void]$sb.Append('\f') }
            "`n" { [void]$sb.Append('\n') }
            "`r" { [void]$sb.Append('\r') }
            "`t" { [void]$sb.Append('\t') }
            default {
                if ([int]$ch -lt 0x20) { [void]$sb.Append(('\u{0:x4}' -f [int]$ch)) }
                else { [void]$sb.Append($ch) }
            }
        }
    }
    [void]$sb.Append('"')
    return $sb.ToString()
}

# return a NEW ordered hashtable with $Keys removed. (Piping [ordered]@{} to
# Select-Object -ExcludeProperty enumerates DictionaryEntries instead - do not do that.)
function Remove-HashKeys {
    param($Hash, [string[]]$Keys)
    $h = [ordered]@{}
    $src = $Hash
    if ($src -is [System.Management.Automation.PSCustomObject]) {
        $tmp = [ordered]@{}; foreach ($p in $src.PSObject.Properties) { $tmp[$p.Name] = $p.Value }; $src = $tmp
    }
    foreach ($k in $src.Keys) { if ($Keys -notcontains $k) { $h[$k] = $src[$k] } }
    return $h
}

function New-StringHash {
    param([string]$Text)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = (New-Utf8NoBom).GetBytes([string]$Text)
        return ('sha256:' + [System.BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant())
    } finally { $sha.Dispose() }
}

# Content hash of an arbitrary structure via canonical JSON.
function New-ContentHash {
    param($InputObject)
    return (New-StringHash (ConvertTo-CanonicalJson $InputObject))
}

function New-FileHash {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return 'sha256:absent' }
    return ('sha256:' + (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant())
}

# ----------------------------------------------------------------------------
# JSON state files  (V2 namespace only)
# ----------------------------------------------------------------------------

$script:V2ListFields = @('deps','declaredScope','protectedPathGrants','tasks','criteria','findings',
    'filesReviewed','failures','problems','violations','changedFiles','drift','history','reasons','hits')

function Write-V2Json {
    param([string]$Path, $Object)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    # pretty for humans, but the AUTHORITATIVE form for hashing is ConvertTo-CanonicalJson
    $json = $Object | ConvertTo-Json -Depth 40
    # PS 5.1 serializes an empty array as "{}" - repair known list fields so they
    # round-trip as [] and never become a phantom empty object.
    foreach ($f in $script:V2ListFields) {
        $json = [regex]::Replace($json, ('"{0}":\s*\{{\s*\}}' -f [regex]::Escape($f)), ('"{0}": []' -f $f))
    }
    [System.IO.File]::WriteAllText($Path, $json, (New-Utf8NoBom))
}

function Read-V2Json {
    param([string]$Path)
    return (_ToHashtable (Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json))
}

function _ToHashtable {
    param($o)
    if ($null -eq $o) { return $null }
    if ($o -is [System.Management.Automation.PSCustomObject]) {
        $h = [ordered]@{}
        foreach ($p in $o.PSObject.Properties) { $h[$p.Name] = _ToHashtable $p.Value }
        return $h
    }
    if ($o -is [object[]]) { return @($o | ForEach-Object { _ToHashtable $_ }) }
    return $o
}

# Append one JSON line atomically (shared-read, exclusive-append). Used by the ledger.
function Add-JsonLine {
    param([string]$Path, $Object)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $line = (ConvertTo-CanonicalJson $Object) + "`n"
    $bytes = (New-Utf8NoBom).GetBytes($line)
    for ($try = 0; $try -lt 50; $try++) {
        try {
            $fs = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
            try { $fs.Write($bytes, 0, $bytes.Length); $fs.Flush($true) } finally { $fs.Dispose() }
            return
        } catch [System.IO.IOException] {
            Start-Sleep -Milliseconds (10 + (Get-Random -Maximum 25))
        }
    }
    throw "v2: could not append to ledger $Path (contention)"
}

function Read-JsonLines {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return @() }
    $out = @()
    foreach ($l in [System.IO.File]::ReadAllLines($Path)) {
        if ($l.Trim()) { $out += ,(_ToHashtable ($l | ConvertFrom-Json)) }
    }
    return @($out)
}

# ----------------------------------------------------------------------------
# atomic exclusive file creation  (H-05: replaces V1 Test-Path + write)
# ----------------------------------------------------------------------------
#
# CreateNew is atomic on NTFS: exactly one racer wins, the rest get IOException.
# Returns $true if THIS call created the file, $false if it already existed.

function New-ExclusiveFile {
    param([string]$Path, [string]$Content = '')
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    try {
        $fs = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try {
            $bytes = (New-Utf8NoBom).GetBytes($Content)
            $fs.Write($bytes, 0, $bytes.Length); $fs.Flush($true)
        } finally { $fs.Dispose() }
        return $true
    } catch [System.IO.IOException] {
        if (Test-Path -LiteralPath $Path) { return $false }
        throw
    }
}

# ----------------------------------------------------------------------------
# process identity  (H-05: PID alone is not enough - guard PID reuse)
# ----------------------------------------------------------------------------

function Get-ProcessIdentity {
    param([int]$ProcessId = $PID)
    $p = $null
    try { $p = Get-Process -Id $ProcessId -ErrorAction Stop } catch { }
    return [ordered]@{
        pid          = $ProcessId
        host         = $env:COMPUTERNAME
        startTime    = $(if ($p) { $p.StartTime.ToUniversalTime().ToString('o') } else { $null })
        alive        = [bool]$p
    }
}

# A recorded holder is still live only if the pid is alive AND it is the SAME
# process (start time matches). PID reuse -> not the same holder -> stale.
function Test-HolderLive {
    param($Holder)
    if (-not $Holder) { return $false }
    if ($Holder.host -and $env:COMPUTERNAME -and $Holder.host -ne $env:COMPUTERNAME) {
        # cannot prove liveness of a process on another host -> treat as live (conservative)
        return $true
    }
    $now = Get-ProcessIdentity -ProcessId ([int]$Holder.pid)
    if (-not $now.alive) { return $false }
    if ($Holder.startTime -and $now.startTime -and $Holder.startTime -ne $now.startTime) { return $false }
    return $true
}

# ----------------------------------------------------------------------------
# streaming secret redaction  (H-11: replaces V1 Protect-Secrets)
# ----------------------------------------------------------------------------
#
# V1 wrote raw stdout/stderr to disk and redacted afterwards, so a crash left the
# raw file. V2 redacts each line BEFORE it is ever persisted, and the raw stream
# is never written to disk at all.

function Get-RedactionPatterns {
    $cfg = Get-V2Config
    return @($cfg.redaction.patterns)
}

function Get-AllRedactionPatterns {
    $cfg = Get-V2Config
    return (@($cfg.redaction.patterns) + @($cfg.redaction.scanPatterns))
}

function Protect-Line {
    param([string]$Line)
    $cfg = Get-V2Config
    $repl = $cfg.redaction.replacement
    $out = $Line
    # apply the denylist AND the secret-shape scan patterns: the scanner that
    # verifies artifacts afterwards uses the same rules, so redaction must too.
    foreach ($pat in (Get-AllRedactionPatterns)) {
        try { $out = [regex]::Replace($out, $pat, $repl) }
        catch { $out = '[REDACTED: line withheld - redaction pattern error, failing closed]' ; break }
    }
    return $out
}

# Redact a whole blob line-by-line with the structural env-dump guard.
function Protect-SecretsStreaming {
    param([string]$Text)
    if ([string]::IsNullOrEmpty($Text)) { return $Text }
    $cfg = Get-V2Config
    $maxEnv = [int]$cfg.redaction.maxEnvLikeLines
    $envRx  = '^\s*(export\s+)?[A-Z][A-Z0-9_]{2,}\s*=\s*\S'
    $lines  = $Text -split "`n"
    $envLike = @($lines | Where-Object { $_ -match $envRx }).Count
    $result = New-Object System.Text.StringBuilder
    $dropEnv = ($envLike -gt $maxEnv)
    foreach ($l in $lines) {
        if ($dropEnv -and $l -match $envRx) { continue }
        [void]$result.AppendLine((Protect-Line $l))
    }
    $s = $result.ToString().TrimEnd("`r","`n")
    if ($dropEnv) { $s += "`n[REDACTED: $envLike env-style lines withheld - no environment dumps persisted]" }
    return $s
}

# Consume a process's stdout/stderr streams line-by-line, redact each line, and
# append it to $LogPath. The undreacted text NEVER touches disk. Returns the
# redacted transcript as a string (bounded).
function Copy-StreamRedacted {
    param(
        [System.IO.StreamReader]$Reader,
        [string]$LogPath,
        [int]$MaxChars = 200000
    )
    $dir = Split-Path -Parent $LogPath
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $sw = New-Object System.IO.StreamWriter($LogPath, $true, (New-Utf8NoBom))
    $collected = New-Object System.Text.StringBuilder
    try {
        while ($null -ne ($line = $Reader.ReadLine())) {
            $red = Protect-Line $line
            $sw.WriteLine($red); $sw.Flush()
            if ($collected.Length -lt $MaxChars) { [void]$collected.AppendLine($red) }
        }
    } finally { $sw.Dispose() }
    return $collected.ToString()
}

# Scan a finished artifact tree for anything that still looks like a live secret.
# A single hit fails the run closed (H-11).
function Test-ArtifactsClean {
    param([string]$Root)
    $cfg = Get-V2Config
    $hits = @()
    if (-not (Test-Path $Root)) { return [ordered]@{ clean = $true; hits = @() } }
    foreach ($f in (Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue)) {
        $txt = ''
        try { $txt = Get-Content -Raw -LiteralPath $f.FullName -ErrorAction Stop } catch { continue }
        foreach ($pat in $cfg.redaction.scanPatterns) {
            if ($txt -match $pat) { $hits += ("{0} :: /{1}/" -f $f.FullName.Substring($Root.Length), $pat) }
        }
    }
    return [ordered]@{ clean = ($hits.Count -eq 0); hits = @($hits) }
}

# ----------------------------------------------------------------------------
# Windows argument safety  (H-12: closed grammar + tested quoting, never a shell)
# ----------------------------------------------------------------------------

function Test-SafeId {
    param([string]$Id)
    if ([string]::IsNullOrEmpty($Id)) { return $false }
    if ($Id.Length -gt 128) { return $false }
    if ($Id -match '\.\.') { return $false }
    return ($Id -match '^[A-Za-z0-9][A-Za-z0-9._-]*$')
}

function Assert-SafeId {
    param([string]$Id, [string]$What = 'id')
    if (-not (Test-SafeId $Id)) { throw "v2 H-12: unsafe $What '$Id' (grammar: ^[A-Za-z0-9][A-Za-z0-9._-]*$, <=128, no '..')" }
}

# Canonicalize a path and prove it stays inside $Root. Rejects traversal, ADS,
# and absolute escapes.
function Resolve-SafePath {
    param([string]$Root, [string]$Relative)
    if ($Relative -match ':' -and $Relative -notmatch '^[A-Za-z]:\\') { throw "v2 H-12: suspicious path '$Relative'" }
    $rootFull = [System.IO.Path]::GetFullPath($Root)
    $joined   = [System.IO.Path]::GetFullPath((Join-Path $rootFull $Relative))
    $sep = [System.IO.Path]::DirectorySeparatorChar
    if ($joined -ne $rootFull -and -not $joined.StartsWith($rootFull.TrimEnd($sep) + $sep, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "v2 H-12: path '$Relative' escapes root '$Root' (-> '$joined')"
    }
    return $joined
}

# Microsoft C runtime / CommandLineToArgvW quoting rules. One string -> one argv
# element on the other side, for ANY content. (.NET Framework 4.x has no
# ProcessStartInfo.ArgumentList, so we must build the string ourselves.)
function ConvertTo-Win32Arg {
    param([string]$Arg)
    if ($Arg -eq '') { return '""' }
    if ($Arg -notmatch '[ \t\n\v"]') { return $Arg }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('"')
    $chars = $Arg.ToCharArray()
    for ($i = 0; $i -lt $chars.Length; $i++) {
        $bs = 0
        while ($i -lt $chars.Length -and $chars[$i] -eq '\') { $bs++; $i++ }
        if ($i -eq $chars.Length) {
            [void]$sb.Append('\' * ($bs * 2)); break
        } elseif ($chars[$i] -eq '"') {
            [void]$sb.Append('\' * ($bs * 2 + 1)); [void]$sb.Append('"')
        } else {
            [void]$sb.Append('\' * $bs); [void]$sb.Append($chars[$i])
        }
    }
    [void]$sb.Append('"')
    return $sb.ToString()
}

function ConvertTo-Win32CommandLine {
    param([string[]]$ArgList)
    return (($ArgList | ForEach-Object { ConvertTo-Win32Arg $_ }) -join ' ')
}

# Resolve an executable explicitly (never let the shell guess). Rejects .cmd/.bat
# shims where possible in favour of the real interpreter.
function Resolve-Executable {
    param([string]$Name)
    $c = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $c) { throw "v2 H-12: executable '$Name' not found on PATH" }
    $src = $c.Source
    if (-not $src) { throw "v2 H-12: '$Name' resolved to a non-file command" }
    return $src
}

# Launch a native process with fully-controlled argv, stdin from a file, and
# streaming-redacted stdout/stderr. No shell, no string interpolation. Enforces a
# timeout and returns exit code + redacted transcripts + timing.
function Invoke-NativeCaptured {
    param(
        [string]$Exe,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [string]$StdinFile,
        [string]$StdoutLog,
        [string]$StderrLog,
        [int]$TimeoutSec = 900
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Exe
    $psi.Arguments = (ConvertTo-Win32CommandLine $Arguments)
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.RedirectStandardInput = $true
    $psi.CreateNoWindow = $true
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $psi.StandardOutputEncoding = $utf8
    $psi.StandardErrorEncoding = $utf8

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $started = Get-Date
    [void]$proc.Start()

    # feed stdin
    if ($StdinFile -and (Test-Path $StdinFile)) {
        $in = [System.IO.File]::ReadAllText($StdinFile)
        $proc.StandardInput.Write($in)
    }
    $proc.StandardInput.Close()

    # drain stderr on a runspace so a full pipe can't deadlock us
    $errJob = [System.Management.Automation.PowerShell]::Create()
    [void]$errJob.AddScript({
        param($reader, $logPath, $patterns, $repl, $max)
        $sw = New-Object System.IO.StreamWriter($logPath, $true, (New-Object System.Text.UTF8Encoding($false)))
        $sb = New-Object System.Text.StringBuilder
        try {
            while ($null -ne ($l = $reader.ReadLine())) {
                $r = $l
                foreach ($p in $patterns) { try { $r = [regex]::Replace($r, $p, $repl) } catch { $r = '[REDACTED]' } }
                $sw.WriteLine($r); $sw.Flush()
                if ($sb.Length -lt $max) { [void]$sb.AppendLine($r) }
            }
        } finally { $sw.Dispose() }
        return $sb.ToString()
    })
    [void]$errJob.AddParameters(@{ reader = $proc.StandardError; logPath = $StderrLog; patterns = (Get-AllRedactionPatterns); repl = (Get-V2Config).redaction.replacement; max = 100000 })
    $errHandle = $errJob.BeginInvoke()

    $stdout = Copy-StreamRedacted -Reader $proc.StandardOutput -LogPath $StdoutLog
    $timedOut = $false
    if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
        $timedOut = $true
        # best-effort tree kill lives in V2 process.ps1 (C-05, deferred); here we
        # at least kill the direct child and mark the run non-integratable.
        try { $proc.Kill() } catch { }
        $proc.WaitForExit(5000) | Out-Null
    }
    $stderr = ''
    try { $stderr = $errJob.EndInvoke($errHandle) } catch { }
    $errJob.Dispose()

    $exit = $(if ($timedOut) { 124 } else { $proc.ExitCode })
    $ended = Get-Date
    return [ordered]@{
        exitCode    = $exit
        timedOut    = $timedOut
        stdout      = $stdout
        stderr      = $stderr
        startedAt   = $started.ToString('o')
        endedAt     = $ended.ToString('o')
        durationSec = [math]::Round(($ended - $started).TotalSeconds, 1)
    }
}

# ----------------------------------------------------------------------------
# git helpers (read-only; V2 never force/reset/clean)
# ----------------------------------------------------------------------------

function Get-GitHeadV2       { param([string]$Dir = $script:RepoRootV2) return (& git -C $Dir rev-parse HEAD).Trim() }
function Get-GitTreeHash     { param([string]$Dir = $script:RepoRootV2, [string]$Ref = 'HEAD') return (& git -C $Dir rev-parse "$Ref^{tree}").Trim() }
function Get-GitPorcelainV2  { param([string]$Dir = $script:RepoRootV2) return @(& git -C $Dir status --porcelain=v1) }
function Test-GitCleanV2     { param([string]$Dir = $script:RepoRootV2) return (@(Get-GitPorcelainV2 $Dir).Count -eq 0) }

function Get-GitDiffHash {
    param([string]$Dir, [string]$BaseSha, [string]$HeadSha = 'HEAD')
    $d = (& git -C $Dir diff --no-color "$BaseSha..$HeadSha") -join "`n"
    return (New-StringHash $d)
}

function Get-GitChangedFiles {
    param([string]$Dir, [string]$BaseSha, [string]$HeadSha = 'HEAD')
    return @(& git -C $Dir diff --name-only "$BaseSha..$HeadSha" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

$script:ForbiddenGit = @('--force','--force-with-lease','reset --hard','push --force','clean -fd','clean -fdx','filter-branch','reflog delete','update-ref -d','branch -D','branch -d','rebase -i')

function Assert-SafeGitV2 {
    param([string[]]$GitArgs)
    $joined = ($GitArgs -join ' ').ToLowerInvariant()
    foreach ($bad in $script:ForbiddenGit) {
        if ($joined -match [regex]::Escape($bad)) { throw "v2: BLOCKED unsafe git op: git $joined" }
    }
}

# ----------------------------------------------------------------------------
# logging  (redacted)
# ----------------------------------------------------------------------------

function Write-V2Log {
    param([string]$Message, [string]$Level = 'INFO')
    $line = "{0} [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'), $Level, $Message
    Write-Host $line
    $logFile = Join-Path $script:V2Dir 'logs\spine.log'
    $dir = Split-Path -Parent $logFile
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Add-Content -LiteralPath $logFile -Value (Protect-Line $line) -Encoding utf8
}

function New-RunId    { return ('run-' + [guid]::NewGuid().ToString('N')) }
function New-AttemptId { return ('att-' + [guid]::NewGuid().ToString('N')) }
function New-AttestId  { return ('att-' + [guid]::NewGuid().ToString('N')) }
function New-LeaseId   { return ('lease-' + [guid]::NewGuid().ToString('N')) }
