<#
memory-eval-adapter.ps1 - reference ai-memory adapter for the optional dispatcher seam.

Wired to memory-adapter.ps1 (memoryBootstrap / memoryCheckpoint / memoryFinalize /
memoryHandoff). Memory is AUXILIARY: this script never returns authority, never
blocks dispatch, and fails soft (always exit 0). It only ever:

  - READS a bounded set of relevant pages for logicalProjectId and writes them to
    a local context artifact the dispatcher may inject as untrusted background;
  - WRITES concise structured completion / handoff pages (whitelisted fields),
    to a stable path per taskId so a newer write supersedes the older version.

It does NOT persist secrets, env, transcripts, or hidden reasoning - the caller
already strips those (ConvertTo-MemorySafePayload) and the bounds below cap size.
Project identity is ALWAYS logicalProjectId from the payload / authority config,
never the working-directory basename.

Config (authority .orchestration/v2/config.v2.json -> memoryAdapter):
  enabled        bool    master switch (dispatcher no-ops the whole seam when false)
  script         string  "scripts/orchestration/v2/memory-eval-adapter.ps1"
  baseUrl        string  live ai-memory MCP, e.g. "http://127.0.0.1:49374"
  project        string  logical project scope (default "orcivo")
  workspace      string  ai-memory workspace (default "default")
  maxMemories    int     max pages injected                      (default 4)
  maxInjectChars int     hard cap on injected characters          (default 1500)
  timeoutSec     int     per HTTP call                            (default 6)
  injectKinds    array   path prefixes eligible for injection (default decisions/, notes/, handoffs/, dispatcher/)
#>
param(
    [Parameter(Mandatory)][ValidateSet('memoryBootstrap','memoryCheckpoint','memoryFinalize','memoryHandoff')][string]$Hook,
    [Parameter(Mandatory)][string]$PayloadJson
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:Payload = $PayloadJson | ConvertFrom-Json

function Get-PayloadTask { if ($script:Payload.task) { return $script:Payload.task } return $script:Payload }
function Get-PayloadProject {
    if ($env:ORCIVO_MEMORY_PROJECT) { return [string]$env:ORCIVO_MEMORY_PROJECT }
    if ($script:Payload.logicalProjectId) { return [string]$script:Payload.logicalProjectId }
    try { $p = (Get-AuthorityV2Config).memoryAdapter.project } catch { $p = $null }
    if ($p) { return [string]$p }
    return 'orcivo'
}

function Get-MemCfg {
    $m = $null
    try { $m = (Get-AuthorityV2Config).memoryAdapter } catch { $m = $null }
    $defaultKinds = @('decisions/','notes/','handoffs/','dispatcher/','_rules/')
    [pscustomobject]@{
        baseUrl        = $(if ($env:ORCIVO_MEMORY_BASEURL) { $env:ORCIVO_MEMORY_BASEURL } elseif ($m.baseUrl) { [string]$m.baseUrl } else { 'http://127.0.0.1:49374' })
        project        = (Get-PayloadProject)
        workspace      = $(if ($m.workspace) { [string]$m.workspace } else { 'default' })
        maxMemories    = $(if ($m.maxMemories) { [int]$m.maxMemories } else { 4 })
        maxInjectChars = $(if ($m.maxInjectChars) { [int]$m.maxInjectChars } else { 1500 })
        timeoutSec     = $(if ($m.timeoutSec) { [int]$m.timeoutSec } else { 6 })
        injectKinds    = $(if ($m.injectKinds) { @($m.injectKinds | ForEach-Object { [string]$_ }) } else { $defaultKinds })
    }
}

function Get-MemoryContextPath { return (Join-Path (Get-V2Dir) 'dispatcher\memory-context.json') }

function Invoke-Mcp {
    param([Parameter(Mandatory)]$Cfg, [Parameter(Mandatory)][string]$Tool, [hashtable]$Arguments = @{})
    $body = @{ jsonrpc = '2.0'; id = 1; method = 'tools/call'; params = @{ name = $Tool; arguments = $Arguments } } | ConvertTo-Json -Depth 12 -Compress
    $resp = Invoke-WebRequest -Uri "$($Cfg.baseUrl)/mcp" -Method Post -ContentType 'application/json' `
        -Headers @{ Accept = 'application/json, text/event-stream' } -Body $body -TimeoutSec $Cfg.timeoutSec -UseBasicParsing
    $text = ($resp.Content -split "`n" | Where-Object { $_ -and $_ -notmatch '^event:' } | ForEach-Object { $_ -replace '^data: ', '' }) -join "`n"
    $j = $text | ConvertFrom-Json
    if ($j.error) { throw ("mcp {0}: {1}" -f $Tool, $j.error.message) }
    $inner = $j.result.content[0].text
    if ($inner) { return ($inner | ConvertFrom-Json) }
    return $j.result
}

function Test-Injectable {
    param($Cfg, [string]$Path)
    foreach ($k in $Cfg.injectKinds) { if ($Path -like "$k*") { return $true } }
    return $false
}

function Write-MemoryContext {
    param($Cfg, [string]$Reason)
    $task = Get-PayloadTask
    $t0 = Get-Date
    $words = (("$($task.title) $($task.description)") -split '[^A-Za-z0-9]+' |
        Where-Object { $_.Length -ge 4 } | Select-Object -First 12)
    $q = ($words -join ' OR ')
    $qArgs = @{ query = $q; limit = ([int]$Cfg.maxMemories * 3); workspace = $Cfg.workspace; project = $Cfg.project }
    $fallbackUsed = $false
    $hits = @()
    try {
        $res = Invoke-Mcp -Cfg $Cfg -Tool 'memory_query' -Arguments $qArgs
        # memory_query already returns latest versions only; keep injectable kinds.
        $hits = @($res.hits | Where-Object { Test-Injectable $Cfg $_.path } | Select-Object -First $Cfg.maxMemories)
        if ($hits.Count -eq 0) {
            $fallbackUsed = $true
            $rec = Invoke-Mcp -Cfg $Cfg -Tool 'memory_recent' -Arguments @{ limit = ([int]$Cfg.maxMemories * 4); workspace = $Cfg.workspace; project = $Cfg.project }
            $hits = @($rec.hits | Where-Object { Test-Injectable $Cfg $_.path } | Select-Object -First $Cfg.maxMemories)
        }
    } catch {
        [Console]::Error.WriteLine("memory-eval-adapter: query failed, no context injected: $($_.Exception.Message)")
        Write-MemoryContextFile -Cfg $Cfg -Reason $Reason -Task $task -Lines @() -Used 0 -Fallback $false -LatencyMs ([int]((Get-Date) - $t0).TotalMilliseconds) -Available $false
        return
    }
    $lines = @(); $used = 0
    foreach ($h in $hits) {
        $snippet = ([string]$h.snippet) -replace '<[^>]+>', '' -replace '\s+', ' '
        $entry = "- [$($h.path)] $($h.title): $snippet".Trim()
        if (($used + $entry.Length) -gt $Cfg.maxInjectChars) { break }
        $lines += $entry; $used += $entry.Length
    }
    Write-MemoryContextFile -Cfg $Cfg -Reason $Reason -Task $task -Lines $lines -Used $used -Fallback $fallbackUsed -LatencyMs ([int]((Get-Date) - $t0).TotalMilliseconds) -Available $true
}

function Write-MemoryContextFile {
    param($Cfg, [string]$Reason, $Task, [string[]]$Lines, [int]$Used, [bool]$Fallback, [int]$LatencyMs, [bool]$Available)
    $ctx = [ordered]@{
        schemaVersion  = 'orcivo.orchestration.v2.memory-context/2'
        writtenAt      = (Get-Date).ToUniversalTime().ToString('o')
        reason         = $Reason
        hook           = $Hook
        taskId         = [string]$Task.taskId
        logicalProjectId = $Cfg.project
        source         = "$($Cfg.baseUrl) project=$($Cfg.project) workspace=$($Cfg.workspace)"
        memoryAvailable = $Available
        memoryFallbackUsed = $Fallback
        memoryLatencyMs = $LatencyMs
        retrievedCount = @($Lines).Count
        injectedChars  = $Used
        memories       = @($Lines)
    }
    $dir = Split-Path -Parent (Get-MemoryContextPath)
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText((Get-MemoryContextPath), ($ctx | ConvertTo-Json -Depth 8), (New-Utf8NoBom))
}

function Write-DurablePage {
    param($Cfg, [string]$Kind)
    $p = $script:Payload
    $task = Get-PayloadTask
    if (-not $task.taskId) { return }
    $provider = "$([string]$p.toProvider)$([string]$p.fromProvider)"
    $path = "dispatcher/$($task.taskId).md"
    # Stable path per task => a newer write is a new version that supersedes the
    # older one; memory_query only ever returns the latest version.
    $body = @(
        '---'
        "type: $Kind"
        'status: current'
        "kind: dispatcher-$Kind"
        "taskId: $($task.taskId)"
        "taskType: $($task.type)"
        "provider: $provider"
        "at: $((Get-Date).ToUniversalTime().ToString('o'))"
        'supersedes: previous version of this page (same path)'
        '---'
        ''
        "**Dispatcher $Kind** for $($task.taskId) - $($task.title)."
        ''
        "Type: $($task.type)."
        "Acceptance (verbatim from the task manifest; recorded for continuity, NOT authoritative here): $($task.acceptance)"
        $(if ($p.fromProvider -or $p.toProvider) { "Handoff: $($p.fromProvider) -> $($p.toProvider)." } else { '' })
    ) -join "`n"
    $args = @{ path = $path; title = "Dispatcher $Kind - $($task.taskId)"; body = $body; tier = 'episodic'; workspace = $Cfg.workspace; project = $Cfg.project }
    try {
        Invoke-Mcp -Cfg $Cfg -Tool 'memory_write_page' -Arguments $args | Out-Null
        $mp = Join-Path (Split-Path -Parent (Get-MemoryContextPath)) 'memory-writes.json'
        $n = 0; if (Test-Path $mp) { try { $n = [int]((Get-Content -Raw $mp | ConvertFrom-Json).count) } catch { $n = 0 } }
        [System.IO.File]::WriteAllText($mp, (@{ count = $n + 1; lastAt = (Get-Date).ToUniversalTime().ToString('o'); lastPath = $path } | ConvertTo-Json), (New-Utf8NoBom))
    } catch { [Console]::Error.WriteLine("memory-eval-adapter: write-page failed (ignored): $($_.Exception.Message)") }
}

try {
    $cfg = Get-MemCfg
    switch ($Hook) {
        'memoryBootstrap'  { Write-MemoryContext -Cfg $cfg -Reason 'task start' }
        'memoryHandoff'    { Write-DurablePage -Cfg $cfg -Kind 'handoff'; Write-MemoryContext -Cfg $cfg -Reason 'provider handoff' }
        'memoryCheckpoint' { }   # lifecycle hooks already capture bounded observations; no manual note
        'memoryFinalize'   { Write-DurablePage -Cfg $cfg -Kind 'completion' }
    }
} catch {
    [Console]::Error.WriteLine("memory-eval-adapter: $Hook failed soft: $($_.Exception.Message)")
}
exit 0
