<#
lib-v2.ps1 - safe low-level helpers for the Orcivo orchestration SECURITY SPINE (V2).

V2 is a clean-room rebuild after the independent Codex review REJECTED V1, and a
SECOND independent review then REJECTED the first V2 spine
(.planning/reviews/ORCHESTRATION-V2-SPINE-SECURITY-REVIEW.md). This file is part
of the second remediation. It deliberately does NOT dot-source
scripts/orchestration/lib.ps1.

  - Protect-SecretsStreaming / Copy-StreamRedacted   H-11 (streaming + multiline PEM buffer)
  - New-ContentHash / canonical                      C-03 / NH-01 (content addressing, no volatile fields)
  - Test-SafeId / Resolve-SafePath / ConvertTo-Win32Arg / Resolve-Executable   H-12
  - New-ExclusiveFile / Invoke-FileCas               H-05 (atomic create + compare-and-write/delete)
  - ConvertTo-RelPathKey / Test-RelPathUnder         H-06 / M-01 (canonical Windows-aware path match)
  - Assert-DisposableRoot                            NC-01 (structural, NO env-var bypass)
  - Invoke-GitFetchProven                            H-07 / #12 (a real fetch, not a timestamp)

V2 state lives under .orchestration/v2/ ONLY. V1 runtime state is never read here.
#>

$ErrorActionPreference = 'Stop'

# M3-01: a JSON parser that PRESERVES raw JSON type information. PS 5.1
# ConvertFrom-Json unrolls single-element arrays and collapses [] to $null, so it
# cannot tell `"findings": []` from `"findings": null` from `"findings": {}`.
# JavaScriptSerializer keeps object[] / Dictionary / $null distinct.
try { Add-Type -AssemblyName System.Web.Extensions -ErrorAction Stop } catch { }

function ConvertFrom-JsonTyped {
    param([Parameter(Mandatory)][AllowEmptyString()][string]$Json, [int]$MaxLen = 8000000, [int]$RecursionLimit = 64)
    $ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
    $ser.MaxJsonLength = $MaxLen
    $ser.RecursionLimit = $RecursionLimit
    return $ser.DeserializeObject($Json)   # Dictionary<string,object> / object[] / primitive / $null
}

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
# the authority repo is the one that physically contains THIS script file.
$script:AuthorityRoot = ([System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))).TrimEnd('\')

function Get-V2Dir { return $script:V2Dir }
function Get-RepoRoot { return $script:RepoRootV2 }
function Get-AuthorityRoot { return $script:AuthorityRoot }

# ----------------------------------------------------------------------------
# NC-01: structural real-task disablement. NO environment variable can flip this.
# A "disposable root" is a throwaway repo that is provably NOT the authority repo
# and carries a marker file the test harness drops. Production-capable code paths
# never call the pipeline; only tests/ do, and only against a disposable root.
# ----------------------------------------------------------------------------

function Test-PathIsAncestorOrSelf {
    param([string]$Ancestor, [string]$Candidate)
    $a = ([System.IO.Path]::GetFullPath($Ancestor)).TrimEnd('\').ToLowerInvariant()
    $c = ([System.IO.Path]::GetFullPath($Candidate)).TrimEnd('\').ToLowerInvariant()
    return ($c -eq $a -or $c.StartsWith($a + '\'))
}

function Assert-DisposableRoot {
    param([Parameter(Mandatory)][string]$RepoDir, [string]$Why = 'operation')
    if (-not (Test-Path -LiteralPath $RepoDir)) { throw "v2 NC-01: disposable root '$RepoDir' does not exist" }
    $full = ([System.IO.Path]::GetFullPath($RepoDir)).TrimEnd('\')

    # 1. must not be, contain, or live inside the authority repo
    if ((Test-PathIsAncestorOrSelf $script:AuthorityRoot $full) -or (Test-PathIsAncestorOrSelf $full $script:AuthorityRoot)) {
        throw "v2 NC-01: refusing to $Why - '$full' overlaps the authority repo '$script:AuthorityRoot'. The pipeline only runs on a throwaway repo."
    }
    # 2. must carry the harness marker (dropped by New-V2Fixture, never committed)
    $marker = Join-Path $full '.orch-v2-fixture'
    if (-not (Test-Path -LiteralPath $marker)) {
        throw "v2 NC-01: refusing to $Why - '$full' is missing the disposable-fixture marker (.orch-v2-fixture). Only the isolated test harness may create it."
    }
    # 3. defence in depth: the real Orcivo app tree must not be present
    if ((Test-Path (Join-Path $full '.planning\STATE.md')) -and (Test-Path (Join-Path $full 'apps\backend'))) {
        throw "v2 NC-01: refusing to $Why - '$full' looks like the real Orcivo application repo."
    }
    return $true
}

function Get-V2Config {
    if (-not (Test-Path $script:V2Config)) { throw "v2: missing $script:V2Config" }
    return ([System.IO.File]::ReadAllText($script:V2Config, [System.Text.Encoding]::UTF8) | ConvertFrom-Json)
}

# Authority-scoped config: always the config that ships with THESE scripts,
# never a task clone / worktree / fixture. Used by the memory seam so logical
# project identity can never be silently redefined by an agent's working dir.
function Get-AuthorityV2Config {
    $p = Join-Path $script:AuthorityRoot '.orchestration\v2\config.v2.json'
    if (-not (Test-Path $p)) { throw "v2: missing authority config $p" }
    return ([System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) | ConvertFrom-Json)
}

# ----------------------------------------------------------------------------
# canonical JSON + content hashing  (C-03, NH-01, L-01)
# ----------------------------------------------------------------------------

function New-Utf8NoBom { return (New-Object System.Text.UTF8Encoding($false)) }

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

# return a NEW ordered hashtable with $Keys removed.
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

function New-ContentHash {
    param($InputObject)
    return (New-StringHash (ConvertTo-CanonicalJson $InputObject))
}

# Deep-convert every scalar leaf to a string, keeping dict / array structure.
# Used so a value hashed in memory and the same value after a JSON round-trip
# (which may retype numbers/booleans) canonicalise identically.
function ConvertTo-DeepString {
    param($o)
    if ($null -eq $o) { return $null }
    if ($o -is [string]) { return $o }
    if ($o -is [bool] -or $o -is [int] -or $o -is [long] -or $o -is [double] -or $o -is [decimal]) { return ([string]$o) }
    if ($o -is [System.Collections.IDictionary]) {
        $h = [ordered]@{}
        foreach ($k in $o.Keys) { $h[[string]$k] = ConvertTo-DeepString $o[$k] }
        return $h
    }
    if ($o -is [System.Management.Automation.PSCustomObject]) {
        $h = [ordered]@{}
        foreach ($p in $o.PSObject.Properties) { $h[$p.Name] = ConvertTo-DeepString $p.Value }
        return $h
    }
    if ($o -is [System.Collections.IEnumerable]) { return @($o | ForEach-Object { ConvertTo-DeepString $_ }) }
    return ([string]$o)
}

function New-FileHash {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return 'sha256:absent' }
    return ('sha256:' + (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant())
}

# ----------------------------------------------------------------------------
# canonical Windows-aware relative path matching  (H-06, M-01)
# ----------------------------------------------------------------------------
#
# The V1 spine used `.TrimStart('./')`, which strips the leading dot from
# `.planning` / `.orchestration` and defeated protected-path matching. Here a path
# is reduced to a canonical segment list: `\`->`/`, a single leading `./` removed,
# `.` and `..` segments collapsed lexically, empty segments dropped. Comparison is
# OrdinalIgnoreCase (NTFS is case-insensitive).

function ConvertTo-RelPathKey {
    param([string]$Path)
    $p = ([string]$Path -replace '\\', '/').Trim()
    while ($p.StartsWith('./')) { $p = $p.Substring(2) }
    $segs = New-Object System.Collections.Generic.List[string]
    foreach ($s in ($p -split '/')) {
        if ($s -eq '' -or $s -eq '.') { continue }
        if ($s -eq '..') { if ($segs.Count -gt 0) { $segs.RemoveAt($segs.Count - 1) } ; continue }
        [void]$segs.Add($s)
    }
    return ($segs.ToArray() -join '/')
}

# is the (canonicalized) $File equal to, or under, any of $Prefixes?
# a trailing '/' on a prefix means "directory prefix"; a '*'/'?' means glob.
function Test-RelPathUnder {
    param([string]$File, [string[]]$Prefixes)
    $f = ConvertTo-RelPathKey $File
    if (-not $f) { return $false }
    foreach ($p in @($Prefixes)) {
        if ([string]::IsNullOrWhiteSpace($p)) { continue }
        $pn = ([string]$p -replace '\\', '/')
        if ($pn -match '[*?]') {
            $glob = ($pn -replace '\*\*/', '*')
            if ($f -like $glob) { return $true }
            if ($f -like ($glob.TrimStart('*'))) { return $true }
            continue
        }
        $pk = ConvertTo-RelPathKey $pn
        if (-not $pk) { continue }
        if ($f.Equals($pk, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
        if ($f.StartsWith($pk + '/', [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
    return $false
}

# ----------------------------------------------------------------------------
# JSON state files  (V2 namespace only)
# ----------------------------------------------------------------------------

$script:V2ListFields = @('deps','declaredScope','protectedPathGrants','tasks','criteria','findings',
    'filesReviewed','failures','problems','violations','changedFiles','drift','history','reasons','hits','checks','events',
    'acceptanceCriteriaIds','checksExecuted','required','order_by')

function ConvertTo-V2JsonString {
    param($Object)
    $json = $Object | ConvertTo-Json -Depth 40
    foreach ($f in $script:V2ListFields) {
        $json = [regex]::Replace($json, ('"{0}":\s*(\{{\s*\}}|"")' -f [regex]::Escape($f)), ('"{0}": []' -f $f))
    }
    return $json
}

function Write-V2Json {
    param([string]$Path, $Object)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($Path, (ConvertTo-V2JsonString $Object), (New-Utf8NoBom))
}

# hash-critical artifacts (contract, attestation, gate) are written in canonical
# form so a JSON round-trip is lossless (PS 5.1 pretty-print turns [] into null,
# which would break every recompute-on-read tamper check).
function Write-V2JsonCanonical {
    param([string]$Path, $Object)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($Path, (ConvertTo-CanonicalJson $Object), (New-Utf8NoBom))
}

function Read-V2Json {
    param([string]$Path)
    return (_ToHashtable ([System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8) | ConvertFrom-Json))
}

function _ToHashtable {
    param($o)
    if ($null -eq $o) { return $null }
    # PS 5.1 ConvertFrom-Json coerces ISO-8601-looking strings to [datetime].
    # Normalise back to a canonical UTC ISO string so hashes recomputed on read
    # match hashes computed at write time (NH-01 / C-03 / #13).
    if ($o -is [datetime]) { return ($o.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffffffK')) }
    if ($o -is [System.Management.Automation.PSCustomObject]) {
        $h = [ordered]@{}
        foreach ($p in $o.PSObject.Properties) { $h[$p.Name] = _ToHashtable $p.Value }
        return $h
    }
    # A zero-length array emits no pipeline objects in PowerShell and would be
    # silently converted to $null inside a parent object.  Return it as one
    # non-enumerated value so JSON schema arrays stay arrays after parsing.
    if ($o -is [object[]]) {
        return ,@($o | ForEach-Object { _ToHashtable $_ })
    }
    return $o
}

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

# raw bytes of a jsonl file (for tamper/truncation detection)
function Read-RawText {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return '' }
    return [System.IO.File]::ReadAllText($Path)
}

# ----------------------------------------------------------------------------
# atomic exclusive file creation + compare-and-swap  (H-05)
# ----------------------------------------------------------------------------

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

# Compare-and-write: rewrite $Path only if its current content hash matches
# $ExpectedHash. Uses an exclusive open so no other writer can interleave.
# Returns $true on success, $false if the precondition failed.
function Invoke-FileCas {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$ExpectedHash,   # 'sha256:...' of current content, or 'sha256:absent'
        [AllowEmptyString()][string]$NewContent = '',
        [switch]$Delete
    )
    for ($try = 0; $try -lt 60; $try++) {
        try {
            if (-not (Test-Path -LiteralPath $Path)) {
                if ($ExpectedHash -ne 'sha256:absent') { return $false }
                if ($Delete) { return $true }
                return (New-ExclusiveFile $Path $NewContent)
            }
            $fs = New-Object System.IO.FileStream($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
            try {
                $sr = New-Object System.IO.StreamReader($fs, (New-Utf8NoBom))
                $cur = $sr.ReadToEnd()
                if ((New-StringHash $cur) -ne $ExpectedHash) { return $false }
                if ($Delete) {
                    $fs.Dispose(); Remove-Item -LiteralPath $Path -Force
                    return $true
                }
                $fs.SetLength(0); $fs.Position = 0
                $sw = New-Object System.IO.StreamWriter($fs, (New-Utf8NoBom))
                $sw.Write($NewContent); $sw.Flush()
                return $true
            } finally { $fs.Dispose() }
        } catch [System.IO.IOException] {
            Start-Sleep -Milliseconds (8 + (Get-Random -Maximum 20))
        }
    }
    throw "v2: Invoke-FileCas could not obtain exclusive access to $Path"
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

# Is the recorded holder still the SAME live process?
#   $true  = alive and identity matches (or on another host: cannot disprove -> live)
#   $false = provably dead OR provably a different process (PID reuse)
function Test-HolderLive {
    param($Holder)
    if (-not $Holder) { return $false }
    if ($Holder.host -and $env:COMPUTERNAME -and $Holder.host -ne $env:COMPUTERNAME) { return $true }
    $now = Get-ProcessIdentity -ProcessId ([int]$Holder.pid)
    if (-not $now.alive) { return $false }
    if ($Holder.startTime -and $now.startTime -and $Holder.startTime -ne $now.startTime) { return $false }
    if ($Holder.startTime -and -not $now.startTime) { return $false }
    return $true
}

# ----------------------------------------------------------------------------
# streaming + multiline secret redaction  (H-11)
# ----------------------------------------------------------------------------

# H3-02: ONE canonical secret library. Redactor, sanitize-before-write, the
# pre-publication scan gate and the final sweep all call Get-SecretPatterns.
function Get-SecretPatterns       { return @((Get-V2Config).redaction.secretPatterns) }
function Get-MultilinePatterns    { return @((Get-V2Config).redaction.multilinePatterns) }
function Get-MultilineScanPatterns { return @((Get-V2Config).redaction.multilineScanPatterns) }
# back-compat shims - every caller now resolves to the single library
function Get-RedactionPatterns    { return (Get-SecretPatterns) }
function Get-AllRedactionPatterns { return (Get-SecretPatterns) }

# Source code needs a narrower form of the canonical library: log-oriented
# environment/header patterns otherwise erase ordinary declarations such as
# `const { token } = params` and `objectKey: string`. Keep all high-confidence
# signatures and add a quoted semantic assignment pattern for source literals.
function Get-SourceSecretPatterns {
    $patterns=Get-SecretPatterns
    $quotedAssignment='(?i)\b[A-Za-z0-9_$]*(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|credential|database[_-]?url|connection[_-]?string|authorization)[A-Za-z0-9_$]*[ \t]*[:=][ \t]*([''"`])[^''"`\r\n]+\2'
    return @($patterns[0],$quotedAssignment)+@($patterns|Select-Object -Skip 7)
}

function Get-SourceFixtureSecretPatterns {
    $patterns=Get-SecretPatterns
    # Test fixtures routinely contain visibly synthetic token/password literals.
    # Retain JSON credential detection and every format-specific signature, but
    # do not fail publication on a generic quoted fixture assignment alone.
    return @($patterns[0])+@($patterns|Select-Object -Skip 7)
}

$script:MaxRedactLine = 16384   # lines longer than this are refused, not regex'd

function Protect-Line {
    param([string]$Line, [string[]]$Patterns=@())
    # an over-long line is a redaction-DoS vector (catastrophic backtracking) and
    # is never legitimate agent output - drop it wholesale, fail closed.
    if ($Line.Length -gt $script:MaxRedactLine) {
        return "[REDACTED: over-long line withheld ($($Line.Length) chars > $script:MaxRedactLine)]"
    }
    $cfg = Get-V2Config
    $repl = $cfg.redaction.replacement
    $out = $Line
    $activePatterns=$(if($Patterns.Count){$Patterns}else{Get-AllRedactionPatterns})
    foreach ($pat in $activePatterns) {
        try { $out = [regex]::Replace($out, $pat, $repl) }
        catch { return '[REDACTED: line withheld - redaction pattern error, failing closed]' }
    }
    return $out
}

# Whole-blob redaction: single-line patterns per line, THEN multiline patterns
# (PEM blocks etc.) across the whole text. Used for anything about to be persisted.
function Protect-SecretsStreaming {
    param([string]$Text, [switch]$SourceText)
    if ([string]::IsNullOrEmpty($Text)) { return $Text }
    $cfg = Get-V2Config
    $repl = $cfg.redaction.replacement
    $maxEnv = [int]$cfg.redaction.maxEnvLikeLines
    $envRx  = '^\s*(export\s+)?[A-Z][A-Z0-9_]{2,}\s*=\s*\S'
    $lines  = $Text -split "`n"
    $envLike = @($lines | Where-Object { $_ -match $envRx }).Count
    $dropEnv = (-not $SourceText -and $envLike -gt $maxEnv)
    # Review diffs are created only after the immutable candidate scan passes.
    # Preserve generic fixture literals needed to assess behavior while retaining
    # JSON credential detection and every format-specific signature as defense in depth.
    $activePatterns=$(if($SourceText){Get-SourceFixtureSecretPatterns}else{Get-AllRedactionPatterns})
    $result = New-Object System.Text.StringBuilder
    foreach ($l in $lines) {
        if ($dropEnv -and $l -match $envRx) { continue }
        [void]$result.AppendLine((Protect-Line $l -Patterns $activePatterns))
    }
    $s = $result.ToString()
    foreach ($pat in (Get-MultilinePatterns)) {
        try { $s = [regex]::Replace($s, $pat, $repl, [System.Text.RegularExpressions.RegexOptions]::Singleline) } catch { }
    }
    $s = $s.TrimEnd("`r", "`n")
    if ($dropEnv) { $s += "`n[REDACTED: $envLike env-style lines withheld - no environment dumps persisted]" }
    return $s
}

# Consume a StreamReader line-by-line. Single-line secrets are redacted before the
# line is written. When a multiline trigger (e.g. "-----BEGIN ") appears, lines are
# BUFFERED (not written) until the block closes or the buffer cap is hit, then the
# buffered block is redacted with the multiline patterns and flushed. The raw text
# never reaches disk.
function Copy-StreamRedacted {
    param(
        [System.IO.StreamReader]$Reader,
        [string]$LogPath,
        [int]$MaxChars = 200000,
        [string[]]$Patterns=@()
    )
    $cfg = Get-V2Config
    $repl = $cfg.redaction.replacement
    $triggers = @($cfg.redaction.multilineTriggers)
    $bufCap   = [int]$cfg.redaction.multilineBufferLines
    $mlPats   = Get-MultilinePatterns

    $dir = Split-Path -Parent $LogPath
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $sw = New-Object System.IO.StreamWriter($LogPath, $true, (New-Utf8NoBom))
    $collected = New-Object System.Text.StringBuilder
    $buffer = $null   # $null = not buffering; otherwise a StringBuilder

    $flushBlock = {
        param($blockText)
        $red = $blockText
        foreach ($p in $mlPats) {
            try { $red = [regex]::Replace($red, $p, $repl, [System.Text.RegularExpressions.RegexOptions]::Singleline) } catch { }
        }
        # if a BEGIN marker survived (block never closed / cap hit), scrub from it on
        foreach ($t in $triggers) {
            $idx = $red.IndexOf($t)
            if ($idx -ge 0) { $red = $red.Substring(0, $idx) + '[REDACTED: multiline secret block]' ; break }
        }
        $sw.Write($red); $sw.Flush()
        if ($collected.Length -lt $MaxChars) { [void]$collected.Append($red) }
    }

    try {
        while ($null -ne ($line = $Reader.ReadLine())) {
            $isTrigger = $false
            foreach ($t in $triggers) { if ($line.Contains($t)) { $isTrigger = $true; break } }

            if ($null -eq $buffer -and -not $isTrigger) {
                $red = Protect-Line $line -Patterns $Patterns
                $sw.WriteLine($red); $sw.Flush()
                if ($collected.Length -lt $MaxChars) { [void]$collected.AppendLine($red) }
                continue
            }
            if ($null -eq $buffer -and $isTrigger) {
                $buffer = New-Object System.Text.StringBuilder
                [void]$buffer.AppendLine($line)
                continue
            }
            # currently buffering
            [void]$buffer.AppendLine($line)
            $closed = ($line -match 'END [A-Z0-9 ]*PRIVATE KEY-----')
            if ($closed -or $buffer.Length -gt ($bufCap * 200)) {
                & $flushBlock $buffer.ToString()
                $buffer = $null
            }
        }
        if ($null -ne $buffer) { & $flushBlock $buffer.ToString() }
    } finally { $sw.Dispose() }
    return $collected.ToString()
}

# Sweep of a finished artifact tree with the CANONICAL secret library (H3-02).
# One hit fails the run closed (H-11). Also the pre-publication gate primitive.
function Test-ArtifactsClean {
    param([string]$Root, [switch]$SourceTree)
    $hits = @()
    if (-not (Test-Path $Root)) { return [ordered]@{ clean = $true; hits = @() } }
    $linePats = Get-SecretPatterns
    $mlPats   = Get-MultilineScanPatterns
    foreach ($f in (Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue)) {
        $txt = ''
        try { $txt = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8) } catch { continue }
        if ($null -eq $txt) { continue }
        $activeLinePats=$linePats
        if($SourceTree -and $f.Extension -in @('.ts','.tsx','.js','.jsx','.mjs','.cjs','.ps1','.psm1','.cs','.java','.go','.rs','.py')){
            # The environment/header assignment patterns intentionally overmatch
            # arbitrary logs. In source they match ordinary identifiers such as
            # `token`, `objectKey`, and uppercase constants. Keep JSON literal
            # assignments plus every high-confidence credential signature.
            $activeLinePats=$(if($f.Name -match '\.(spec|test)\.[^.]+$'){Get-SourceFixtureSecretPatterns}else{Get-SourceSecretPatterns})
        }
        foreach ($pat in $activeLinePats) {
            try { if ([regex]::IsMatch($txt, $pat, [System.Text.RegularExpressions.RegexOptions]::Multiline)) {
                $hits += ("{0} :: /{1}/" -f $f.FullName.Substring($Root.Length), $pat)
            } } catch { }
        }
        foreach ($pat in $mlPats) {
            try { if ([regex]::IsMatch($txt, $pat, [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
                $hits += ("{0} :: /{1}/" -f $f.FullName.Substring($Root.Length), $pat)
            } } catch { }
        }
    }
    return [ordered]@{ clean = ($hits.Count -eq 0); hits = @($hits) }
}

# H3-02: recursive pre-publication scan over EVERY candidate/runtime/artifact
# root. CLEAN is required before integration/push. Uses the same canonical
# library as the redactor - not a smaller list.
function Test-TreeSecretsClean {
    param([string[]]$Roots)
    $hits = @()
    foreach ($r in (@($Roots) | Where-Object { $_ } | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $r)) { continue }
        $s = Test-ArtifactsClean -Root $r
        if (-not $s.clean) { $hits += $s.hits }
    }
    return [ordered]@{ clean = ($hits.Count -eq 0); hits = @($hits) }
}

# Redact a value about to be written to a state/JSON artifact (contract, prompt).
function Protect-ArtifactText {
    param([string]$Text)
    return (Protect-SecretsStreaming $Text)
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

# Resolve an executable explicitly. -NativeOnly rejects script/wrapper shims
# (.cmd/.bat/.ps1/.vbs/.js/.wsf/.msi). -Root proves containment and refuses to
# follow a symlink/junction that points outside the root.
$script:WrapperExts = @('.cmd', '.bat', '.ps1', '.psm1', '.vbs', '.js', '.wsf', '.msi', '.lnk')

function Resolve-Executable {
    param([string]$Name, [switch]$NativeOnly, [string]$Root)
    $c = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $c) { throw "v2 H-12: executable '$Name' not found on PATH" }
    $src = $c.Source
    if (-not $src) { throw "v2 H-12: '$Name' resolved to a non-file command" }
    $full = [System.IO.Path]::GetFullPath($src)
    if (-not (Test-Path -LiteralPath $full)) { throw "v2 H-12: resolved path '$full' does not exist" }

    $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
    if ($NativeOnly -and $script:WrapperExts -contains $ext) {
        throw "v2 H-12: '$Name' resolves to a wrapper/script ('$full'); a native executable is required"
    }

    if ($Root) {
        # reparse point / junction check only matters when containment is required
        $item = Get-Item -LiteralPath $full -Force -ErrorAction Stop
        if (($item.Attributes.ToString() -match 'ReparsePoint') -or $item.LinkType) {
            $target = @($item.Target) | Select-Object -First 1
            if (-not $target) { throw "v2 H-12: '$full' is a reparse point with no resolvable target - cannot prove containment" }
            if ([System.IO.Path]::IsPathRooted($target)) { $tfull = [System.IO.Path]::GetFullPath($target) }
            else { $tfull = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $full) $target)) }
            if (-not (Test-PathIsAncestorOrSelf $Root $tfull)) {
                throw "v2 H-12: '$full' links outside the allowed root ('$tfull')"
            }
            $full = $tfull
        }
        if (-not (Test-PathIsAncestorOrSelf $Root $full)) {
            throw "v2 H-12: executable '$full' is outside the allowed root '$Root'"
        }
    }
    return $full
}

# ----------------------------------------------------------------------------
# native process launch with redacted capture + timeout
# ----------------------------------------------------------------------------

function Invoke-NativeCaptured {
    param(
        [string]$Exe,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [string]$StdinFile,
        [string]$StdoutLog,
        [string]$StderrLog,
        [int]$TimeoutSec = 900,
        [hashtable]$EnvironmentOverrides = @{},
        [ValidateSet('Full','ReviewedSource')][string]$StdoutRedactionMode='Full'
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
    foreach ($key in @($EnvironmentOverrides.Keys)) {
        if ($null -eq $EnvironmentOverrides[$key]) { [void]$psi.EnvironmentVariables.Remove([string]$key) }
        else { $psi.EnvironmentVariables[[string]$key] = [string]$EnvironmentOverrides[$key] }
    }

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    $started = Get-Date
    [void]$proc.Start()

    if ($StdinFile -and (Test-Path $StdinFile)) {
        $in = [System.IO.File]::ReadAllText($StdinFile)
        $proc.StandardInput.Write($in)
    }
    $proc.StandardInput.Close()

    $errJob = [System.Management.Automation.PowerShell]::Create()
    [void]$errJob.AddScript({
        param($reader, $logPath, $patterns, $mlPatterns, $repl, $max)
        $sw = New-Object System.IO.StreamWriter($logPath, $true, (New-Object System.Text.UTF8Encoding($false)))
        $sb = New-Object System.Text.StringBuilder
        $buf = $null
        try {
            while ($null -ne ($l = $reader.ReadLine())) {
                if ($null -eq $buf -and $l.Contains('-----BEGIN ')) { $buf = New-Object System.Text.StringBuilder; [void]$buf.AppendLine($l); continue }
                if ($null -ne $buf) {
                    [void]$buf.AppendLine($l)
                    if ($l -match 'END [A-Z0-9 ]*PRIVATE KEY-----' -or $buf.Length -gt 40000) {
                        $blk = $buf.ToString()
                        foreach ($p in $mlPatterns) { try { $blk = [regex]::Replace($blk, $p, $repl, [System.Text.RegularExpressions.RegexOptions]::Singleline) } catch {} }
                        $i = $blk.IndexOf('-----BEGIN '); if ($i -ge 0) { $blk = $blk.Substring(0,$i) + '[REDACTED]' }
                        $sw.Write($blk); $sw.Flush(); if ($sb.Length -lt $max) { [void]$sb.Append($blk) }
                        $buf = $null
                    }
                    continue
                }
                if ($l.Length -gt 16384) { $r = "[REDACTED: over-long line withheld ($($l.Length) chars)]" }
                else { $r = $l; foreach ($p in $patterns) { try { $r = [regex]::Replace($r, $p, $repl) } catch { $r = '[REDACTED]' } } }
                $sw.WriteLine($r); $sw.Flush()
                if ($sb.Length -lt $max) { [void]$sb.AppendLine($r) }
            }
            if ($null -ne $buf) {
                $blk = $buf.ToString()
                foreach ($p in $mlPatterns) { try { $blk = [regex]::Replace($blk, $p, $repl, [System.Text.RegularExpressions.RegexOptions]::Singleline) } catch {} }
                $i = $blk.IndexOf('-----BEGIN '); if ($i -ge 0) { $blk = $blk.Substring(0,$i) + '[REDACTED]' }
                $sw.Write($blk); $sw.Flush(); if ($sb.Length -lt $max) { [void]$sb.Append($blk) }
            }
        } finally { $sw.Dispose() }
        return $sb.ToString()
    })
    $cfgR = (Get-V2Config).redaction
    [void]$errJob.AddParameters(@{ reader = $proc.StandardError; logPath = $StderrLog; patterns = (Get-AllRedactionPatterns); mlPatterns = @($cfgR.multilinePatterns); repl = $cfgR.replacement; max = 100000 })
    $errHandle = $errJob.BeginInvoke()

    $stdoutPatterns=$(if($StdoutRedactionMode -eq 'ReviewedSource'){Get-SourceFixtureSecretPatterns}else{Get-AllRedactionPatterns})
    $stdout = Copy-StreamRedacted -Reader $proc.StandardOutput -LogPath $StdoutLog -Patterns $stdoutPatterns
    $timedOut = $false
    if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
        $timedOut = $true
        # C-05 (verified process-tree kill) is deferred; here we kill the direct
        # child and the run is marked non-integratable + the lease quarantined.
        try { $proc.Kill() } catch { }
        $proc.WaitForExit(5000) | Out-Null
    }
    $stderr = ''
    try {
        if ($errHandle.AsyncWaitHandle.WaitOne(15000)) { $stderr = $errJob.EndInvoke($errHandle) }
        else { try { $errJob.Stop() } catch { } }
    } catch { }
    try { $errJob.Dispose() } catch { }

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

$script:ForbiddenGit = @('--force','--force-with-lease','reset --hard','push --force','clean -fd','clean -fdx','filter-branch','reflog delete','update-ref -d','branch -D','branch -d','rebase -i')

function Assert-SafeGitV2 {
    param([string[]]$GitArgs)
    $joined = ($GitArgs -join ' ').ToLowerInvariant()
    foreach ($bad in $script:ForbiddenGit) {
        if ($joined -match [regex]::Escape($bad)) { throw "v2: BLOCKED unsafe git op: git $joined" }
    }
}

# Scan the immutable tracked tree only. Build/test tools may materialize large,
# untracked dependency caches in a candidate workspace; those are neither part
# of the candidate nor publication authority and must not make the gate hang.
function Test-GitTreeSecretsClean {
    param(
        [Parameter(Mandatory)][string]$RepoDir,
        [Parameter(Mandatory)][string]$Ref,
        [string]$BaseRef=''
    )
    $tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    $scanRoot = Join-Path $tempBase ("orcivo-tree-scan-" + [guid]::NewGuid().ToString('N'))
    $archive = Join-Path $scanRoot 'candidate.zip'
    $expanded = Join-Path $scanRoot 'tree'
    try {
        New-Item -ItemType Directory -Force -Path $expanded | Out-Null
        $paths=@()
        if($BaseRef){
            $diff=Invoke-GitV2 -Dir $RepoDir -Arguments @('diff','--name-only','--diff-filter=ACMRTUXB','-z',"$BaseRef..$Ref") -LogLabel 'secret-scan-diff-paths'
            if($diff.exitCode -ne 0){return [ordered]@{clean=$false;hits=@((Get-GitFailureSummaryV2 $diff 'immutable candidate diff paths'))}}
            $paths=@($diff.stdout.Split([char]0)|Where-Object{-not [string]::IsNullOrWhiteSpace($_)})
            if($paths.Count -eq 0){return [ordered]@{clean=$true;hits=@()}}
        }
        $archiveArgs=@('archive','--format=zip',"--output=$archive",$Ref)
        if($paths.Count){$archiveArgs+=@('--')+$paths}
        $result = Invoke-GitV2 -Dir $RepoDir -Arguments $archiveArgs -LogLabel 'secret-scan-archive'
        if($result.exitCode -ne 0){return [ordered]@{clean=$false;hits=@((Get-GitFailureSummaryV2 $result 'immutable candidate archive'))}}
        Expand-Archive -LiteralPath $archive -DestinationPath $expanded -Force
        return (Test-ArtifactsClean -Root $expanded -SourceTree)
    } catch {
        return [ordered]@{clean=$false;hits=@("immutable candidate scan failed: $($_.Exception.Message)")}
    } finally {
        $full = [System.IO.Path]::GetFullPath($scanRoot)
        if($full.StartsWith($tempBase,[System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $full) -like 'orcivo-tree-scan-*'){
            Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# ----------------------------------------------------------------------------
# git helpers - native stderr is diagnostic data, never success authority
# ----------------------------------------------------------------------------

function Invoke-GitV2 {
    param(
        [string]$Dir = $script:RepoRootV2,
        [Parameter(Mandatory)][string[]]$Arguments,
        [int]$TimeoutSec = 300,
        [string]$LogLabel = 'git',
        [switch]$ReviewedSourceOutput
    )
    Assert-SafeGitV2 $Arguments
    $gitExe = Resolve-Executable -Name 'git.exe' -NativeOnly
    $logRoot = Join-Path (Get-V2Dir) 'logs\native'
    New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
    $safeLabel = ([regex]::Replace($LogLabel, '[^A-Za-z0-9._-]', '-')).Trim('-')
    if (-not $safeLabel) { $safeLabel = 'git' }
    $tag = '{0}-{1}-{2}' -f $safeLabel, ([System.Diagnostics.Process]::GetCurrentProcess().Id), ([guid]::NewGuid().ToString('N').Substring(0,12))
    $result = Invoke-NativeCaptured -Exe $gitExe -Arguments (@('-C', $Dir) + @($Arguments)) -WorkingDirectory $Dir `
        -StdoutLog (Join-Path $logRoot "$tag.stdout.log") -StderrLog (Join-Path $logRoot "$tag.stderr.log") -TimeoutSec $TimeoutSec `
        -StdoutRedactionMode $(if($ReviewedSourceOutput){'ReviewedSource'}else{'Full'})
    $result.command = "git $($Arguments -join ' ')"
    return $result
}

function Get-GitFailureSummaryV2 {
    param($Result, [string]$Operation = 'git command')
    $detail = "$($Result.stderr)`n$($Result.stdout)".Trim()
    if ($detail.Length -gt 1200) { $detail = $detail.Substring(0,1200) + '...' }
    if (-not $detail) { $detail = 'no process diagnostics' }
    return "$Operation failed with exit $($Result.exitCode): $detail"
}

function Assert-GitSucceededV2 {
    param($Result, [string]$Operation = 'git command')
    if ([int]$Result.exitCode -ne 0) { throw (Get-GitFailureSummaryV2 -Result $Result -Operation $Operation) }
    return $Result
}

function Get-GitHeadV2 {
    param([string]$Dir = $script:RepoRootV2)
    $r = Invoke-GitV2 -Dir $Dir -Arguments @('rev-parse','HEAD') -LogLabel 'rev-parse-head'
    Assert-GitSucceededV2 $r 'git rev-parse HEAD' | Out-Null
    return $r.stdout.Trim()
}

function Get-GitHeadV2ForRef {
    param([string]$Dir = $script:RepoRootV2, [Parameter(Mandatory)][string]$Ref)
    $r = Invoke-GitV2 -Dir $Dir -Arguments @('rev-parse',$Ref) -LogLabel 'rev-parse-ref'
    Assert-GitSucceededV2 $r "git rev-parse $Ref" | Out-Null
    return $r.stdout.Trim()
}

function Get-GitTreeHash {
    param([string]$Dir = $script:RepoRootV2, [string]$Ref = 'HEAD')
    $r = Invoke-GitV2 -Dir $Dir -Arguments @('rev-parse',"$Ref^{tree}") -LogLabel 'rev-parse-tree'
    Assert-GitSucceededV2 $r "git rev-parse $Ref tree" | Out-Null
    return $r.stdout.Trim()
}

function Get-GitPorcelainV2 {
    param([string]$Dir = $script:RepoRootV2)
    $r = Invoke-GitV2 -Dir $Dir -Arguments @('status','--porcelain=v1') -LogLabel 'status'
    Assert-GitSucceededV2 $r 'git status' | Out-Null
    return @($r.stdout -split '\r?\n' | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ })
}

function Test-GitCleanV2 { param([string]$Dir = $script:RepoRootV2) return (@(Get-GitPorcelainV2 $Dir).Count -eq 0) }

function Get-GitDiffHash {
    param([string]$Dir, [string]$BaseSha, [string]$HeadSha = 'HEAD')
    $r = Invoke-GitV2 -Dir $Dir -Arguments @('diff','--no-color',"$BaseSha..$HeadSha") -LogLabel 'diff-hash'
    Assert-GitSucceededV2 $r 'git diff for hash' | Out-Null
    return (New-StringHash $r.stdout.TrimEnd("`r","`n"))
}

function Get-GitChangedFiles {
    param([string]$Dir, [string]$BaseSha, [string]$HeadSha = 'HEAD')
    $r = Invoke-GitV2 -Dir $Dir -Arguments @('diff','--name-only',"$BaseSha..$HeadSha") -LogLabel 'diff-names'
    Assert-GitSucceededV2 $r 'git diff --name-only' | Out-Null
    return @($r.stdout -split '\r?\n' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

# H-07 / #12: perform a REAL fetch and return a structured observation that
# preflight binds to. Not a timestamp.
function Invoke-GitFetchProven {
    param([string]$Dir, [string]$Remote = 'origin', [string]$Target = 'main', [string]$Nonce = '')
    if (-not $Nonce) { $Nonce = (New-Nonce) }
    $beforeLocal = Get-GitHeadV2 $Dir
    $remoteResult = Invoke-GitV2 -Dir $Dir -Arguments @('remote') -LogLabel 'remote-list'
    $hasRemote = ($remoteResult.exitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($remoteResult.stdout))
    if (-not $hasRemote) {
        return [ordered]@{
            performed = $false; remote = $Remote; target = $Target
            beforeSHA = $beforeLocal; beforeRemoteSHA = $null; observedRemoteSHA = $null
            at = (Get-Date).ToUniversalTime().ToString('o'); nonce = $Nonce
            invocation = 'git -C <dir> remote (none)'; result = 'NO_REMOTE'
        }
    }
    $beforeResult = Invoke-GitV2 -Dir $Dir -Arguments @('rev-parse',"$Remote/$Target") -LogLabel 'fetch-before'
    $fetchResult = Invoke-GitV2 -Dir $Dir -Arguments @('fetch',$Remote,'--prune','--quiet') -LogLabel 'fetch-proven'
    $afterResult = Invoke-GitV2 -Dir $Dir -Arguments @('rev-parse',"$Remote/$Target") -LogLabel 'fetch-after'
    return [ordered]@{
        performed = $true; remote = $Remote; target = $Target; beforeSHA = $beforeLocal
        beforeRemoteSHA = $(if ($beforeResult.exitCode -eq 0) { $beforeResult.stdout.Trim() } else { $null })
        observedRemoteSHA = $(if ($afterResult.exitCode -eq 0) { $afterResult.stdout.Trim() } else { $null })
        at = (Get-Date).ToUniversalTime().ToString('o'); nonce = $Nonce
        invocation = "git -C $Dir fetch $Remote --prune"
        result = $(if ($fetchResult.exitCode -eq 0) { 'OK' } else { "FETCH_EXIT_$($fetchResult.exitCode)" })
        diagnostics = $(if ($fetchResult.stderr) { $fetchResult.stderr.Trim() } else { '' })
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

function New-RunId     { return ('run-' + [guid]::NewGuid().ToString('N')) }
function New-AttemptId  { return ('att-' + [guid]::NewGuid().ToString('N')) }
function New-AttestId   { return ('atn-' + [guid]::NewGuid().ToString('N')) }
function New-LeaseId    { return ('lease-' + [guid]::NewGuid().ToString('N')) }
function New-Nonce      { return [guid]::NewGuid().ToString('N') }
