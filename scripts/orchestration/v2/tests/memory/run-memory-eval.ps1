<#
run-memory-eval.ps1 - adapter + ai-memory selftest. NO model calls.

Talks to the live ai-memory instance (default the migrated 2.0.2 on :49374) and
drives memory-eval-adapter.ps1 / memory-adapter.ps1 directly. Covers the owner
brief's M-01..M-12 that don't need real providers, plus logical project identity,
secret exclusion, bounded retrieval, supersession, and fail-soft.

  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/orchestration/v2/tests/memory/run-memory-eval.ps1

  -BaseUrl   ai-memory MCP base (default http://127.0.0.1:49374)
#>
param(
    [string]$BaseUrl = 'http://127.0.0.1:49374',
    [string]$Workspace = 'default'
)
$ErrorActionPreference = 'Stop'
$V2 = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
. (Join-Path $V2 'lib-v2.ps1')
. (Join-Path $V2 'memory-adapter.ps1')
$adapterScript = Join-Path $V2 'memory-eval-adapter.ps1'
$Project = 'ai-memory-eval-suite'

$pass = 0; $fail = 0
function Check([string]$Id, [bool]$Ok, [string]$Msg) {
    if ($Ok) { $script:pass++; Write-Host "$Id : PASS - $Msg" -ForegroundColor Green }
    else     { $script:fail++; Write-Host "$Id : FAIL - $Msg" -ForegroundColor Red }
}
function Mcp([string]$Url, [string]$Tool, [hashtable]$Arguments) {
    $body = @{ jsonrpc='2.0'; id=1; method='tools/call'; params=@{ name=$Tool; arguments=$Arguments } } | ConvertTo-Json -Depth 12 -Compress
    $r = Invoke-WebRequest -Uri "$Url/mcp" -Method Post -ContentType 'application/json' -Headers @{ Accept='application/json, text/event-stream' } -Body $body -TimeoutSec 10 -UseBasicParsing
    $t = ($r.Content -split "`n" | Where-Object { $_ -and $_ -notmatch '^event:' } | ForEach-Object { $_ -replace '^data: ','' }) -join "`n"
    $j = $t | ConvertFrom-Json
    if ($j.error) { throw $j.error.message }
    $inner = $j.result.content[0].text
    if ($inner) { return ($inner | ConvertFrom-Json) }
    return $j.result
}
function WritePage($proj, $path, $title, $body) { Mcp $BaseUrl 'memory_write_page' @{ path=$path; title=$title; body=$body; workspace=$Workspace; project=$proj } | Out-Null }
function Query($proj, $q, $limit=5) { return (Mcp $BaseUrl 'memory_query' @{ query=$q; limit=$limit; workspace=$Workspace; project=$proj }) }
function RunAdapter([string]$Hook, [string]$PayloadJson) {
    & $adapterScript -Hook $Hook -PayloadJson $PayloadJson *> $null
    return $LASTEXITCODE
}
function CtxFile { return (Join-Path (Get-V2Dir) 'dispatcher\memory-context.json') }

# --- reachability + version ---
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/mcp" -Method Post -ContentType 'application/json' -Headers @{ Accept='application/json, text/event-stream' } -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' -TimeoutSec 8 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }
} catch { Write-Host "ai-memory $BaseUrl unreachable: $($_.Exception.Message)" -ForegroundColor Red; exit 2 }

$tag = 'MEVAL-' + [guid]::NewGuid().ToString('N').Substring(0,8)
$env:ORCIVO_MEMORY_PROJECT = $Project
$env:ORCIVO_MEMORY_BASEURL = $BaseUrl

# M-01 supersession
WritePage $Project "decisions/timeout-$tag.md" "Timeout $tag" "OLD ($tag): HTTP client timeout = 10 seconds."
Start-Sleep -Milliseconds 1100
WritePage $Project "decisions/timeout-$tag.md" "Timeout $tag" "CURRENT ($tag): HTTP client timeout = 30 seconds. Supersedes the 10s value."
$top1 = ((Query $Project "$tag HTTP client timeout" 5).hits | Select-Object -First 1).snippet
Check 'M-01' ([bool]($top1 -match '30 seconds|CURRENT') -and -not ($top1 -match 'OLD \(')) "newer decision wins; upsert kept one page"

# M-02 irrelevant memory does not dominate a focused query
WritePage $Project "notes/unrelated-$tag.md" "Unrelated $tag" "Database index tuning and vacuum cadence. $tag."
$q2 = (Query $Project "$tag HTTP client timeout" 5).hits | Select-Object -First 1
Check 'M-02' ([bool]($q2.path -eq "decisions/timeout-$tag.md")) "focused query ranks the on-topic decision first"

# M-03 project isolation
WritePage 'ai-memory-eval-other' "decisions/leak-$tag.md" "Leak $tag" "PROJECT_ISOLATION_PROBE $tag must not cross projects."
$leak = Query $Project "PROJECT_ISOLATION_PROBE $tag" 10
Check 'M-03' (@($leak.hits | Where-Object { $_.snippet -match 'PROJECT_ISOLATION_PROBE' }).Count -eq 0) "cross-project page did not leak into project=$Project"

# M-07 duplicate write -> one page
WritePage $Project "decisions/dup-$tag.md" "Dup $tag" "dup body $tag"
WritePage $Project "decisions/dup-$tag.md" "Dup $tag" "dup body $tag"
$dup = @((Query $Project "dup body $tag" 10).hits | Where-Object { $_.path -eq "decisions/dup-$tag.md" })
Check 'M-07' ($dup.Count -eq 1) "duplicate write on same path -> exactly one page"

# M-05 memory unreachable -> fail soft
$env:ORCIVO_MEMORY_BASEURL = 'http://127.0.0.1:59999'
$e5 = RunAdapter 'memoryBootstrap' '{"task":{"taskId":"MEVAL-DEAD","title":"probe","type":"TEST"},"logicalProjectId":"ai-memory-eval-suite"}'
$h5 = Invoke-MemoryAdapterHook 'memoryBootstrap' @{ task=@{ taskId='MEVAL-DEAD'; title='probe'; type='TEST' } }
Check 'M-05' ($e5 -eq 0 -and [bool]$h5.ok) "memory unreachable -> adapter exit 0, hook ok=true (dispatch continues)"

# M-06 garbage response -> fail soft
$env:ORCIVO_MEMORY_BASEURL = "$BaseUrl/web"
$e6a = RunAdapter 'memoryFinalize'  '{"task":{"taskId":"MEVAL-GARBAGE","title":"probe","type":"TEST"},"logicalProjectId":"ai-memory-eval-suite"}'
$e6b = RunAdapter 'memoryBootstrap' '{"task":{"taskId":"MEVAL-GARBAGE","title":"probe","type":"TEST"},"logicalProjectId":"ai-memory-eval-suite"}'
Check 'M-06' ($e6a -eq 0 -and $e6b -eq 0) "non JSON-RPC / HTML response -> adapter exit 0 (fail soft, not task failure)"
$env:ORCIVO_MEMORY_BASEURL = $BaseUrl

# LOGICAL PROJECT IDENTITY: the id comes from the payload / authority config, never
# the working-directory basename. (a) adapter honors the payload's logicalProjectId
# for scoping; (b) the dispatcher/adapter resolvers return the authority value, not
# the cwd name, even when cwd is renamed to look like a POC worktree.
. (Join-Path $V2 'dispatcher.ps1')
WritePage $Project "decisions/identity-$tag.md" "Identity $tag" "IDENTITY_PROBE $tag - only in ai-memory-eval-suite."
if (Test-Path (CtxFile)) { Remove-Item (CtxFile) -Force }
Remove-Item Env:\ORCIVO_MEMORY_PROJECT -ErrorAction SilentlyContinue
$eI = RunAdapter 'memoryBootstrap' ('{"task":{"taskId":"MEVAL-ID","title":"identity probe '+$tag+'","type":"TEST","description":"IDENTITY_PROBE decisions"},"logicalProjectId":"ai-memory-eval-suite"}')
$ctx = if (Test-Path (CtxFile)) { Get-Content -Raw (CtxFile) | ConvertFrom-Json } else { $null }
$scoped = $eI -eq 0 -and $ctx -and $ctx.logicalProjectId -eq 'ai-memory-eval-suite' -and (@($ctx.memories) | Where-Object { $_ -match "identity-$tag" })
# resolver must return the authority config value from *inside a foreign git repo*
$foreign = Join-Path ([System.IO.Path]::GetTempPath()) ("POC-D-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $foreign | Out-Null; & git -C $foreign init -q 2>&1 | Out-Null
Push-Location $foreign
$authId = Get-DispatcherLogicalProjectId
Pop-Location; Remove-Item -Recurse -Force $foreign -ErrorAction SilentlyContinue
Check 'IDENTITY' ([bool]$scoped -and $authId -eq [string](Get-AuthorityV2Config).memoryAdapter.project) `
    "payload logicalProjectId honored for scoping; resolver returns authority '$authId' even when cwd is a foreign 'POC-D-*' repo"
$env:ORCIVO_MEMORY_PROJECT = $Project

# BOUNDED RETRIEVAL: context artifact respects maxMemories / maxInjectChars / injectKinds
1..10 | ForEach-Object { WritePage $Project "decisions/bulk-$tag-$_.md" "Bulk $tag $_" ("bounded retrieval probe $tag entry $_ " * 40) }
WritePage $Project "sessions/noise-$tag.md" "Noise $tag" "sessions/ pages must never be injected $tag"
if (Test-Path (CtxFile)) { Remove-Item (CtxFile) -Force }
RunAdapter 'memoryBootstrap' ('{"task":{"taskId":"MEVAL-BND","title":"bounded retrieval probe '+$tag+'","type":"TEST","description":"bounded retrieval probe"},"logicalProjectId":"ai-memory-eval-suite"}') | Out-Null
$bc = Get-Content -Raw (CtxFile) | ConvertFrom-Json
$m = (Get-AuthorityV2Config).memoryAdapter
$noSessions = -not (@($bc.memories) | Where-Object { $_ -match '\[sessions/' })
Check 'BOUNDED' (@($bc.memories).Count -le [int]$m.maxMemories -and [int]$bc.injectedChars -le [int]$m.maxInjectChars -and $noSessions) `
    "context <= $($m.maxMemories) pages / $($m.maxInjectChars) chars, injectKinds enforced (got $(@($bc.memories).Count)pg/$($bc.injectedChars)ch, sessions excluded=$noSessions)"

# M-09/M-10 handoff round-trip (no models): adapter writes a handoff page, a fresh
# bootstrap for the same task retrieves it -> the receiving provider recovers it.
$env:ORCIVO_MEMORY_PROJECT = "$Project-handoff"
$htask = '{"task":{"taskId":"MEVAL-HANDOFF-'+$tag+'","title":"handoff continuity '+$tag+'","type":"FEATURE","acceptance":"n/a"},"fromProvider":"claude","toProvider":"codex","logicalProjectId":"'+$Project+'-handoff"}'
$eH1 = RunAdapter 'memoryHandoff' $htask
Start-Sleep -Milliseconds 400
if (Test-Path (CtxFile)) { Remove-Item (CtxFile) -Force }
$eH2 = RunAdapter 'memoryBootstrap' ('{"task":{"taskId":"MEVAL-HANDOFF-'+$tag+'","title":"handoff continuity '+$tag+'","type":"FEATURE","description":"handoff continuity"},"logicalProjectId":"'+$Project+'-handoff"}')
$hc = if (Test-Path (CtxFile)) { Get-Content -Raw (CtxFile) | ConvertFrom-Json } else { $null }
$recovered = [bool](@($hc.memories) | Where-Object { $_ -match "MEVAL-HANDOFF-$tag" })
Check 'M-09/M-10' ($eH1 -eq 0 -and $eH2 -eq 0 -and $recovered) "Claude->Codex handoff page written and recovered by the fresh bootstrap"
$env:ORCIVO_MEMORY_PROJECT = $Project

# M-08 completion page is episodic + marked current (not an open finding)
$eF = RunAdapter 'memoryFinalize' ('{"task":{"taskId":"MEVAL-DONE-'+$tag+'","title":"done '+$tag+'","type":"TEST","acceptance":"n/a"},"logicalProjectId":"ai-memory-eval-suite"}')
Start-Sleep -Milliseconds 400
$donePage = Mcp $BaseUrl 'memory_read_page' @{ path="dispatcher/MEVAL-DONE-$tag.md"; project=$Project; workspace=$Workspace }
Check 'M-08' ($eF -eq 0 -and $donePage.body -match 'status: current' -and $donePage.body -match 'not authoritative') "completion page written episodic, status:current, explicitly non-authoritative"

# SECRET EXCLUSION: synthetic corpus through the sanitizer + adapter write path
$secret = 'ORCIVO_SYNTHETIC_SECRET_' + ('a'*12)
$awskey = 'AKIA' + ('Z'*16)
$payloadObj = @{ task = @{ taskId="SEC-$tag"; title="deploy $secret"; type='TEST'; acceptance="password=hunter2 $awskey Authorization: Bearer eyJx.y.z"; env=@{ API_KEY=$secret }; candidateConstraints=@{ token=$secret } }; logicalProjectId='ai-memory-eval-suite' }
$safeJson = (ConvertTo-MemorySafePayload $payloadObj) | ConvertTo-Json -Depth 10
$leaked = @($secret,$awskey,'hunter2','eyJx.y.z') | Where-Object { $safeJson -match [regex]::Escape($_) }
Invoke-MemoryAdapterHook 'memoryFinalize' $payloadObj | Out-Null   # no-op unless enabled; still must not throw
Start-Sleep -Milliseconds 300
$storeHit = @((Query $Project "$secret $awskey hunter2" 10).hits | Where-Object { $_.snippet -match [regex]::Escape($secret) -or $_.snippet -match 'hunter2' -or $_.snippet -match 'AKIAZ' })
Check 'SECRET' ($leaked.Count -eq 0 -and $storeHit.Count -eq 0) "all synthetic secret forms stripped by the sanitizer and absent from the store"

# M-04 authority precedence: injected context is labelled non-authority and is a
# separate string from the acceptance/contract in the implementer prompt.
. (Join-Path $V2 'dispatcher.ps1')
$mctx = Get-DispatcherMemoryContext
$prompt = New-ImplementerPrompt -Task @{ taskId='X'; title='t'; description='d'; acceptance='AC-REAL'; scope=@('lib/'); candidateConstraints=@{} } -Contract @{ taskVersionId='v' } -Findings @() -Role 'implementer' -MemoryContext 'some prior memory line'
Check 'M-04' ($prompt -match 'untrusted auxiliary background - NOT authority' -and $prompt -match 'AC-REAL' -and $prompt.IndexOf('AC-REAL') -lt $prompt.IndexOf('PRIOR PROJECT MEMORY')) `
    "memory block explicitly non-authority and rendered after acceptance in the prompt"

# CLEANUP: delete every page this run wrote so the live store is not polluted.
foreach ($proj in @($Project, "$Project-handoff", 'ai-memory-eval-other')) {
    try {
        $rec = Mcp $BaseUrl 'memory_recent' @{ project=$proj; workspace=$Workspace; limit=200 }
        foreach ($h in @($rec.hits)) { try { Mcp $BaseUrl 'memory_delete_page' @{ path=$h.path; project=$proj; workspace=$Workspace } | Out-Null } catch {} }
    } catch {}
}
Remove-Item Env:\ORCIVO_MEMORY_BASEURL, Env:\ORCIVO_MEMORY_PROJECT -ErrorAction SilentlyContinue
if (Test-Path (CtxFile)) { Remove-Item (CtxFile) -Force -ErrorAction SilentlyContinue }
$mw = Join-Path (Get-V2Dir) 'dispatcher\memory-writes.json'; if (Test-Path $mw) { Remove-Item $mw -Force -ErrorAction SilentlyContinue }

Write-Host ""
Write-Host "MEMORY_EVAL_SUITE: $(if($fail -eq 0){'PASS'}else{'FAIL'}) ($pass/$($pass+$fail))" -ForegroundColor $(if($fail -eq 0){'Green'}else{'Red'})
exit $(if ($fail -eq 0) { 0 } else { 1 })
