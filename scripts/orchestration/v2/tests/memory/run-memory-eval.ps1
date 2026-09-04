<#
run-memory-eval.ps1 - deterministic adversarial checks for the optional ai-memory
adapter seam. No model calls. Talks to a disposable ai-memory instance (default
the 2.0.2 eval instance on :49375) and to memory-eval-adapter.ps1 directly.

  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/orchestration/v2/tests/memory/run-memory-eval.ps1 -BaseUrl http://127.0.0.1:49375

Covers M-01, M-02, M-03, M-05, M-06, M-07 from the owner brief plus fail-soft and
project isolation. M-04/M-08/M-09/M-10/M-11/M-12 are exercised by the real
cross-provider A/B run and by structural assertions in the evaluation report.
#>
param(
    [string]$BaseUrl = 'http://127.0.0.1:49375',
    [string]$Project = 'ai-memory-eval-suite',
    [string]$Workspace = 'default'
)
$ErrorActionPreference = 'Stop'
$V2 = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
. (Join-Path $V2 'lib-v2.ps1')
$adapter = Join-Path $V2 'memory-eval-adapter.ps1'

$pass = 0; $fail = 0
function Check([string]$Id, [bool]$Ok, [string]$Msg) {
    if ($Ok) { $script:pass++; Write-Host "$Id : PASS - $Msg" -ForegroundColor Green }
    else     { $script:fail++; Write-Host "$Id : FAIL - $Msg" -ForegroundColor Red }
}

function Mcp([string]$Url, [string]$Tool, [hashtable]$Arguments) {
    $body = @{ jsonrpc='2.0'; id=1; method='tools/call'; params=@{ name=$Tool; arguments=$Arguments } } | ConvertTo-Json -Depth 12 -Compress
    $r = Invoke-WebRequest -Uri "$Url/mcp" -Method Post -ContentType 'application/json' -Headers @{ Accept='application/json, text/event-stream' } -Body $body -TimeoutSec 8 -UseBasicParsing
    $t = ($r.Content -split "`n" | Where-Object { $_ -and $_ -notmatch '^event:' } | ForEach-Object { $_ -replace '^data: ','' }) -join "`n"
    $j = $t | ConvertFrom-Json
    if ($j.error) { throw $j.error.message }
    $inner = $j.result.content[0].text
    if ($inner) { return ($inner | ConvertFrom-Json) }
    return $j.result
}
function WritePage($proj, $path, $title, $body) {
    Mcp $BaseUrl 'memory_write_page' @{ path=$path; title=$title; body=$body; workspace=$Workspace; project=$proj } | Out-Null
}
function Query($proj, $q, $limit=5) {
    return (Mcp $BaseUrl 'memory_query' @{ query=$q; limit=$limit; workspace=$Workspace; project=$proj })
}

# --- reachability ---
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/mcp" -Method Post -ContentType 'application/json' -Headers @{ Accept='application/json, text/event-stream' } `
        -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' -TimeoutSec 8 -UseBasicParsing
    if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }
} catch { Write-Host "eval instance $BaseUrl unreachable: $($_.Exception.Message)" -ForegroundColor Red; exit 2 }

$tag = 'MEVAL-' + [guid]::NewGuid().ToString('N').Substring(0,8)

# M-01 supersession: newer decision must win
WritePage $Project "decisions/timeout-$tag.md" "Timeout decision $tag" "OLD DECISION ($tag): HTTP client timeout = 10 seconds. Rationale: initial guess."
Start-Sleep -Milliseconds 1100
WritePage $Project "decisions/timeout-$tag.md" "Timeout decision $tag" "CURRENT DECISION ($tag): HTTP client timeout = 30 seconds. Supersedes the earlier 10s value; downstream p99 measured at 22s."
$q1 = Query $Project "$tag HTTP client timeout decision" 5
$top1 = ($q1.hits | Select-Object -First 1).snippet
Check 'M-01' ([bool]($top1 -match '30 seconds|CURRENT DECISION') -and -not ($top1 -match 'OLD DECISION')) "supersede: top hit is the current 30s decision (upsert kept one page)"

# M-07 duplicate memory: same path written twice -> one page, not two
$statusBefore = Mcp $BaseUrl 'memory_status' @{ project=$Project; workspace=$Workspace }
WritePage $Project "decisions/dup-$tag.md" "Dup $tag" "content $tag body one"
WritePage $Project "decisions/dup-$tag.md" "Dup $tag" "content $tag body one"
$dupHits = @((Query $Project "dup $tag" 10).hits | Where-Object { $_.path -eq "decisions/dup-$tag.md" })
Check 'M-07' ($dupHits.Count -eq 1) "duplicate write on same path yields exactly one page ($($dupHits.Count))"

# M-02 irrelevant memory from another task must not dominate a focused query
WritePage $Project "notes/unrelated-$tag.md" "Unrelated $tag" "This page is about database index tuning and vacuum cadence. $tag unrelated topic."
$q2 = Query $Project "$tag HTTP client timeout decision" 5
$q2top = ($q2.hits | Select-Object -First 1)
Check 'M-02' ([bool]($q2top.path -eq "decisions/timeout-$tag.md")) "focused query ranks the on-topic decision above the unrelated note"

# M-03 project isolation: a page in another project must not leak into an orcivo-scoped query
$other = 'ai-memory-eval-other'
WritePage $other "secrets/leak-probe-$tag.md" "Leak probe $tag" "PROJECT_ISOLATION_PROBE $tag - this string must never appear in a different project's query results."
$leak = Query $Project "PROJECT_ISOLATION_PROBE $tag" 10
Check 'M-03' (@($leak.hits | Where-Object { $_.snippet -match 'PROJECT_ISOLATION_PROBE' }).Count -eq 0) "cross-project page did not leak into project=$Project results"

# M-05 / M-06 fail-soft: the adapter must never fail its hook, whether memory is
# unreachable (dead port) or answers with garbage (non JSON-RPC).
. (Join-Path $V2 'memory-adapter.ps1')
$adapterScript = Join-Path $V2 'memory-eval-adapter.ps1'
$badPayload = '{"task":{"taskId":"MEVAL-BAD","title":"probe","type":"TEST","acceptance":"n/a"}}'

$env:ORCIVO_MEMORY_PROJECT = $Project
$env:ORCIVO_MEMORY_BASEURL = 'http://127.0.0.1:59999'                 # nothing listening
& $adapterScript -Hook 'memoryBootstrap' -PayloadJson $badPayload *> $null ; $deadExit = $LASTEXITCODE
$r5 = Invoke-MemoryAdapterHook 'memoryBootstrap' @{ task = @{ taskId='MEVAL-DEAD'; title='probe'; type='TEST'; acceptance='n/a' } }
Check 'M-05' ($deadExit -eq 0 -and [bool]$r5.ok) "memory unreachable -> adapter script exit 0 and hook ok=true (dispatch continues)"

$env:ORCIVO_MEMORY_BASEURL = "$BaseUrl/web"                            # real host, HTML not JSON-RPC
& $adapterScript -Hook 'memoryFinalize' -PayloadJson $badPayload *> $null ; $garbageExit = $LASTEXITCODE
& $adapterScript -Hook 'memoryBootstrap' -PayloadJson $badPayload *> $null ; $garbageExit2 = $LASTEXITCODE
Check 'M-06' ($garbageExit -eq 0 -and $garbageExit2 -eq 0) "garbage / non JSON-RPC response -> adapter script exit 0 (fail soft, not task failure)"

Remove-Item Env:\ORCIVO_MEMORY_BASEURL, Env:\ORCIVO_MEMORY_PROJECT -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "MEMORY_EVAL_SUITE: $(if($fail -eq 0){'PASS'}else{'FAIL'}) ($pass/$($pass+$fail))" -ForegroundColor $(if($fail -eq 0){'Green'}else{'Red'})
exit $(if ($fail -eq 0) { 0 } else { 1 })
