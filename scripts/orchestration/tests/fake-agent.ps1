<#
fake-agent.ps1 - deterministic stand-in for `claude -p` / `codex exec`, for the
orchestration test suite. NEVER calls a real model, never uses quota.

run-agent.ps1 invokes this (cwd = worktree, prompt on stdin) when
$env:ORCH_FAKE_AGENT points here. Behaviour is driven by env vars:

  ORCH_FAKE_<PROVIDER>   execute-mode scenario for that provider (e.g. ORCH_FAKE_CLAUDE)
  ORCH_FAKE_SCENARIO     fallback scenario for both providers
  ORCH_FAKE_REVIEW       review-mode verdict(s), comma-separated, consumed one per call
                         e.g. "REQUEST_CHANGES,APPROVE"

execute scenarios:
  ok | ok-continue | partial | partial-then-quota | quota | rate-limit |
  auth | unavailable | unknown | timeout | human-gate
#>
param(
    [Parameter(Mandatory)] [ValidateSet('claude','codex')] [string]$Provider,
    [ValidateSet('execute','review')] [string]$Mode = 'execute',
    [string]$Worktree = '.'
)

$ErrorActionPreference = 'Stop'
$stdin = [Console]::In.ReadToEnd()
$art = Join-Path $Worktree 'poc\poc-artifact.md'
function Save-Art([string]$c) {
    New-Item -ItemType Directory -Force -Path (Split-Path $art) | Out-Null
    [System.IO.File]::WriteAllText($art, $c, (New-Object System.Text.UTF8Encoding($false)))
}
$full = "## Intro`nThe orchestration layer runs one task per isolated worktree.`n`n## Body`nIt verifies deterministically, then a second provider reviews the diff.`n`n## Conclusion`nOnly reviewed, green branches are merged into main.`n"

if ($Mode -eq 'review') {
    $seq = @('APPROVE')
    if ($env:ORCH_FAKE_REVIEW) { $seq = @([string]($env:ORCH_FAKE_REVIEW) -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }) }
    # counter lives OUTSIDE the worktree so run-agent's read-only revert cannot reset it
    $cntFile = Join-Path (Split-Path $Worktree -Parent) (".rc-" + (Split-Path $Worktree -Leaf))
    $n = 0
    if (Test-Path $cntFile) { $n = [int](Get-Content -Raw -LiteralPath $cntFile) }
    $verdict = if ($n -lt $seq.Count) { $seq[$n] } else { $seq[$seq.Count - 1] }
    Set-Content -LiteralPath $cntFile -Value ($n + 1) -Encoding ascii
    $map = @{ APPROVE = 'APPROVE'; REQUEST_CHANGES = 'REQUEST_CHANGES'; HUMAN = 'HUMAN_REVIEW_REQUIRED'; HUMAN_REVIEW_REQUIRED = 'HUMAN_REVIEW_REQUIRED' }
    Write-Output "Cross-review of the branch."
    Write-Output "- checked requirements, tenant isolation, money handling, tests"
    if ($verdict -eq 'REQUEST_CHANGES') { Write-Output "- the artifact is missing a sentence in ## Body" }
    Write-Output ""
    Write-Output ("VERDICT: {0}" -f $map[$verdict])
    exit 0
}

# execute mode
$scenario = [Environment]::GetEnvironmentVariable("ORCH_FAKE_" + $Provider.ToUpperInvariant())
if (-not $scenario) { $scenario = $env:ORCH_FAKE_SCENARIO }
if (-not $scenario) { $scenario = 'ok' }

if ($stdin -match 'REVIEW FEEDBACK') {
    Save-Art ($full + "`n<!-- review fixes applied -->`n")
    Write-Output '{"type":"result","subtype":"success"}'
    exit 0
}

switch ($scenario) {
    'ok'          { Save-Art $full; Write-Output '{"type":"result","subtype":"success"}'; exit 0 }
    'ok-continue' {
        if (Test-Path $art) {
            $c = Get-Content -Raw -LiteralPath $art
            if ($c -notmatch '## Conclusion') { $c += "`n## Conclusion`nOnly reviewed, green branches are merged into main.`n" }
            if ($c -notmatch '## Body') { $c += "`n## Body`nIt verifies deterministically, then a second provider reviews.`n" }
            Save-Art $c
        } else { Save-Art $full }
        Write-Output '{"type":"result","subtype":"success"}'; exit 0
    }
    'partial'     { Save-Art "## Intro`nStarted.`n`n## Body`nPartial only, no conclusion.`n"; Write-Output 'done'; exit 0 }
    'partial-then-quota' {
        Save-Art "## Intro`nStarted this pass.`n"
        [Console]::Error.WriteLine("Anthropic API error: Your credit balance is too low to access the API.")
        exit 1
    }
    'quota'       { [Console]::Error.WriteLine("Your credit balance is too low to access the Claude API. insufficient_quota"); exit 1 }
    'rate-limit'  { [Console]::Error.WriteLine("Anthropic API error 429: rate_limit_error. Please retry after 30s."); exit 1 }
    'auth'        { [Console]::Error.WriteLine("Authentication error: invalid api key. Please run /login to re-authenticate."); exit 1 }
    'unavailable' { [Console]::Error.WriteLine("Anthropic API error 503: overloaded_error - server is overloaded."); exit 1 }
    'unknown'     { [Console]::Error.WriteLine("panic: runtime error: index out of range"); exit 137 }
    'timeout'     { [Console]::Error.WriteLine("the operation timed out"); exit 1 }
    'human-gate'  { Write-Output "HUMAN_GATE: this task applies a migration to the persistent database and needs approval"; exit 0 }
    default       { Save-Art $full; exit 0 }
}
