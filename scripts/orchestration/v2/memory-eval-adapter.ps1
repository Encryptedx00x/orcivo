<#
memory-eval-adapter.ps1 - reference ai-memory adapter for the optional dispatcher seam.

Wired to memory-adapter.ps1 (memoryBootstrap / memoryCheckpoint / memoryFinalize /
memoryHandoff). Memory is AUXILIARY: this script never returns authority, never
blocks dispatch, and fails soft (always exit 0). It only ever:

  - READS a bounded set of durable pages relevant to the task and writes them to
    a local context artifact the dispatcher may inject as untrusted background;
  - WRITES concise structured completion / handoff pages (whitelisted fields).

It does NOT persist secrets, env, transcripts, or hidden reasoning - the caller
already strips those (ConvertTo-MemorySafePayload) and the bounds below cap size.

Config (.orchestration/v2/config.v2.json -> memoryAdapter):
  enabled        bool    master switch (dispatcher no-ops the whole seam when false)
  script         string  "scripts/orchestration/v2/memory-eval-adapter.ps1"
  baseUrl        string  e.g. "http://127.0.0.1:49375"
  project        string  ai-memory project scope (e.g. "orcivo")
  workspace      string  ai-memory workspace (default "default")
  maxMemories    int     max pages injected                     (default 5)
  maxInjectChars int     hard cap on injected characters         (default 2000)
  relevanceFloor number  drop hits weaker than this rank         (default 0 = keep all returned)
  timeoutSec     int     per HTTP call                           (default 6)
#>
param(
    [Parameter(Mandatory)][ValidateSet('memoryBootstrap','memoryCheckpoint','memoryFinalize','memoryHandoff')][string]$Hook,
    [Parameter(Mandatory)][string]$PayloadJson
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib-v2.ps1')

function Get-MemCfg {
    $m = (Get-V2Config).memoryAdapter
    # Env overrides let a disposable A/B harness or test point the adapter without
    # rewriting per-repo config. They never widen scope beyond a single project.
    [pscustomobject]@{
        baseUrl        = $(if ($env:ORCIVO_MEMORY_BASEURL) { $env:ORCIVO_MEMORY_BASEURL } elseif ($m.baseUrl) { [string]$m.baseUrl } else { 'http://127.0.0.1:49375' })
        project        = $(if ($env:ORCIVO_MEMORY_PROJECT) { $env:ORCIVO_MEMORY_PROJECT } elseif ($m.project) { [string]$m.project } else { '' })
        workspace      = $(if ($m.workspace) { [string]$m.workspace } else { 'default' })
        maxMemories    = $(if ($m.maxMemories) { [int]$m.maxMemories } else { 5 })
        maxInjectChars = $(if ($m.maxInjectChars) { [int]$m.maxInjectChars } else { 2000 })
        relevanceFloor = $(if ($null -ne $m.relevanceFloor) { [double]$m.relevanceFloor } else { [double]::NegativeInfinity })
        timeoutSec     = $(if ($m.timeoutSec) { [int]$m.timeoutSec } else { 6 })
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

function Get-TaskFromPayload {
    $p = $PayloadJson | ConvertFrom-Json
    if ($p.task) { return $p.task }
    return $p
}

function Write-MemoryContext {
    param($Cfg, [string]$Reason)
    $task = Get-TaskFromPayload
    # Query from the human-meaningful fields only. taskId / type are noise for FTS.
    $words = (("$($task.title) $($task.description)") -split '[^A-Za-z0-9]+' |
        Where-Object { $_.Length -ge 4 } | Select-Object -First 12)
    $q = ($words -join ' OR ')
    $args = @{ query = $q; limit = $Cfg.maxMemories; workspace = $Cfg.workspace }
    if ($Cfg.project) { $args.project = $Cfg.project }
    $hits = @()
    try {
        $res = Invoke-Mcp -Cfg $Cfg -Tool 'memory_query' -Arguments $args
        $hits = @($res.hits | Where-Object { [double]$_.rank -ge $Cfg.relevanceFloor } | Select-Object -First $Cfg.maxMemories)
        if ($hits.Count -eq 0) {
            # recency fallback: the most recently updated pages for this scope
            $recArgs = @{ limit = $Cfg.maxMemories; workspace = $Cfg.workspace }
            if ($Cfg.project) { $recArgs.project = $Cfg.project }
            $rec = Invoke-Mcp -Cfg $Cfg -Tool 'memory_recent' -Arguments $recArgs
            $hits = @($rec.hits | Select-Object -First $Cfg.maxMemories)
        }
    } catch {
        [Console]::Error.WriteLine("memory-eval-adapter: query failed, no context injected: $($_.Exception.Message)")
        return
    }
    $lines = @()
    $used = 0
    foreach ($h in $hits) {
        $snippet = ([string]$h.snippet) -replace '<[^>]+>', '' -replace '\s+', ' '
        $entry = "- [$($h.path)] $($h.title): $snippet".Trim()
        if (($used + $entry.Length) -gt $Cfg.maxInjectChars) { break }
        $lines += $entry
        $used += $entry.Length
    }
    $ctx = [ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.memory-context/1'
        writtenAt     = (Get-Date).ToUniversalTime().ToString('o')
        reason        = $Reason
        hook          = $Hook
        taskId        = [string]$task.taskId
        source        = "$($Cfg.baseUrl) project=$($Cfg.project)"
        retrievedCount = $lines.Count
        injectedChars  = $used
        memories      = $lines
    }
    $dir = Split-Path -Parent (Get-MemoryContextPath)
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText((Get-MemoryContextPath), ($ctx | ConvertTo-Json -Depth 8), (New-Utf8NoBom))
}

function Write-CompletionPage {
    param($Cfg, [string]$Kind)
    $p = $PayloadJson | ConvertFrom-Json
    $task = Get-TaskFromPayload
    if (-not $task.taskId) { return }
    $body = @(
        "---"
        "type: $Kind"
        "taskId: $($task.taskId)"
        "provider: $([string]$p.toProvider)$([string]$p.fromProvider)"
        "at: $((Get-Date).ToUniversalTime().ToString('o'))"
        "---"
        ""
        "**$Kind** for $($task.taskId) - $($task.title)."
        ""
        "Type: $($task.type). Acceptance (verbatim from manifest, not authority here): $($task.acceptance)"
    ) -join "`n"
    $args = @{ path = "dispatcher/$($task.taskId).md"; title = "Dispatcher $Kind - $($task.taskId)"; body = $body; tier = 'episodic'; workspace = $Cfg.workspace }
    if ($Cfg.project) { $args.project = $Cfg.project }
    try { Invoke-Mcp -Cfg $Cfg -Tool 'memory_write_page' -Arguments $args | Out-Null }
    catch { [Console]::Error.WriteLine("memory-eval-adapter: write-page failed (ignored): $($_.Exception.Message)") }
}

try {
    $cfg = Get-MemCfg
    switch ($Hook) {
        'memoryBootstrap'  { Write-MemoryContext -Cfg $cfg -Reason 'task start' }
        'memoryHandoff'    { Write-MemoryContext -Cfg $cfg -Reason 'provider handoff' ; Write-CompletionPage -Cfg $cfg -Kind 'handoff' }
        'memoryCheckpoint' { }   # lifecycle hooks already capture bounded observations; no manual note
        'memoryFinalize'   { Write-CompletionPage -Cfg $cfg -Kind 'completion' }
    }
} catch {
    [Console]::Error.WriteLine("memory-eval-adapter: $Hook failed soft: $($_.Exception.Message)")
}
exit 0
