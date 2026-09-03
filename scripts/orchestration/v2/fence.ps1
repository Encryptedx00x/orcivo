<#
fence.ps1 - run generation / fencing for crash recovery.  (PRAGMATIC V2.1, PARTE 9)

Every execution of a task version receives a monotonic GENERATION. Before a
run may be marked RECOVERED the recovery path must PROVE the previous execution
is no longer active:

  detect stale / failed owner
    -> stop / verify inactive
    -> fence the old generation (bump the counter; a stale executor from gen N
       is rejected by gen N+1)
    -> RECOVERED
    -> new generation

Never RECOVERED first and then check. If liveness cannot be determined the run
goes to QUARANTINED or WAITING_HUMAN (config.generation.undeterminableState).

This complements the taskversion lease (which already refuses a second live
holder); the generation adds a durable counter so a resumed run can detect and
reject output from a superseded execution.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:FenceDir = Join-Path (Get-V2Dir) 'fences'

function Get-FencePath {
    param([string]$TaskVersionId)
    if ($TaskVersionId -notmatch '^[0-9a-f]{64}$') { throw "v2 fence: bad taskVersionId" }
    return (Join-Path $script:FenceDir "$TaskVersionId.json")
}

function Get-Fence {
    param([string]$TaskVersionId)
    $p = Get-FencePath $TaskVersionId
    if (-not (Test-Path $p)) { return $null }
    try { return (Read-V2Json $p) } catch { return @{ __unreadable = $true } }
}

# Claim a fresh generation for a new run. Returns @{ ok; generation; fence } or
# @{ ok=$false; reason } when a live owner still holds the current generation.
function New-GenerationFence {
    param([Parameter(Mandatory)][string]$TaskVersionId, [Parameter(Mandatory)][string]$RunId)
    $p = Get-FencePath $TaskVersionId
    $cur = Get-Fence $TaskVersionId

    if ($cur.__unreadable) {
        return [ordered]@{ ok = $false; reason = 'existing fence record is unreadable - liveness undeterminable'; undeterminable = $true }
    }
    if ($cur -and $cur.state -eq 'ACTIVE' -and $cur.holder -and (Test-HolderLive $cur.holder)) {
        return [ordered]@{ ok = $false; reason = "generation $($cur.generation) still ACTIVE with a LIVE owner (pid $($cur.holder.pid))"; live = $true }
    }

    $gen = 1
    if ($cur -and $null -ne $cur.generation) { $gen = [int]$cur.generation + 1 }
    $fence = [ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.fence/1'
        taskVersionId = $TaskVersionId
        generation    = $gen
        runId         = $RunId
        state         = 'ACTIVE'
        holder        = (Get-ProcessIdentity)
        startedAt     = (Get-Date).ToUniversalTime().ToString('o')
        supersededGeneration = $(if ($cur) { $cur.generation } else { $null })
    }
    Write-V2JsonCanonical $p $fence
    Write-V2Log "fence: $($TaskVersionId.Substring(0,12)) generation $gen ACTIVE (run $($RunId.Substring(0,10)))"
    return [ordered]@{ ok = $true; generation = $gen; fence = $fence }
}

# Is $Generation still the current, non-superseded generation? A stale executor
# calls this before writing anything authoritative.
function Test-GenerationCurrent {
    param([Parameter(Mandatory)][string]$TaskVersionId, [Parameter(Mandatory)][int]$Generation)
    $cur = Get-Fence $TaskVersionId
    if (-not $cur -or $cur.__unreadable) { return $false }
    return ([int]$cur.generation -eq $Generation)
}

function Complete-GenerationFence {
    param([string]$TaskVersionId, [int]$Generation, [string]$FinalState = 'DONE')
    $p = Get-FencePath $TaskVersionId
    $cur = Get-Fence $TaskVersionId
    if (-not $cur -or $cur.__unreadable) { return $false }
    if ([int]$cur.generation -ne $Generation) { return $false }
    $cur.state = $FinalState
    $cur.completedAt = (Get-Date).ToUniversalTime().ToString('o')
    Write-V2JsonCanonical $p $cur
    return $true
}

# The recovery decision. Proves inactivity BEFORE returning RECOVERED.
function Invoke-FenceRecovery {
    param([Parameter(Mandatory)][string]$TaskVersionId, [Parameter(Mandatory)][string]$NewRunId)
    $cfg = Get-V2Config
    $cur = Get-Fence $TaskVersionId
    if (-not $cur) { return [ordered]@{ decision = 'NO_PRIOR_RUN'; reason = 'no fence record - nothing to recover' } }
    if ($cur.__unreadable) {
        return [ordered]@{ decision = $cfg.generation.undeterminableState; reason = 'fence record unreadable - cannot prove the prior run is inactive' }
    }
    if ($cur.state -ne 'ACTIVE') {
        $r = New-GenerationFence -TaskVersionId $TaskVersionId -RunId $NewRunId
        return [ordered]@{ decision = 'RECOVERED'; reason = "prior generation $($cur.generation) is $($cur.state)"; newGeneration = $r.generation }
    }
    # state ACTIVE - the load-bearing check: is the holder still alive?
    if ($cur.holder -and (Test-HolderLive $cur.holder)) {
        return [ordered]@{ decision = 'STILL_ACTIVE'; reason = "generation $($cur.generation) holder pid $($cur.holder.pid) is LIVE - refuse to recover" }
    }
    # provably dead -> fence the old generation, THEN RECOVERED
    $r = New-GenerationFence -TaskVersionId $TaskVersionId -RunId $NewRunId
    if (-not $r.ok) {
        return [ordered]@{ decision = $cfg.generation.undeterminableState; reason = "could not fence the old generation: $($r.reason)" }
    }
    return [ordered]@{ decision = 'RECOVERED'; reason = "prior generation $($cur.generation) holder is provably dead; fenced to generation $($r.generation)"; newGeneration = $r.generation }
}

# ---- Wave 0 selftest ------------------------------------------------------
function Test-FenceSelftest {
    $fail = @()
    $tv = ('a' * 64)
    $p = Get-FencePath $tv
    if (Test-Path $p) { Remove-Item $p -Force }

    $r1 = New-GenerationFence -TaskVersionId $tv -RunId 'run-aaaaaaaaaa'
    if (-not $r1.ok -or $r1.generation -ne 1) { $fail += "first fence gen != 1 ($($r1.generation))" }

    # a second run while gen 1 is ACTIVE + this very process is the (live) holder -> refused
    $r2 = New-GenerationFence -TaskVersionId $tv -RunId 'run-bbbbbbbbbb'
    if ($r2.ok) { $fail += "second fence granted while gen 1 ACTIVE + live holder" }

    # simulate the prior holder dying: rewrite holder to a dead pid
    $f = Read-V2Json $p
    $f.holder = @{ pid = 999999; host = $env:COMPUTERNAME; startTime = '2000-01-01T00:00:00.0000000Z'; alive = $false }
    Write-V2JsonCanonical $p $f

    $rec = Invoke-FenceRecovery -TaskVersionId $tv -NewRunId 'run-cccccccccc'
    if ($rec.decision -ne 'RECOVERED') { $fail += "recovery of a dead holder -> $($rec.decision), expected RECOVERED" }
    if ($rec.newGeneration -ne 2) { $fail += "recovered generation != 2 ($($rec.newGeneration))" }

    # the stale gen-1 executor must now be rejected
    if (Test-GenerationCurrent -TaskVersionId $tv -Generation 1) { $fail += "stale generation 1 still reports current after fencing" }
    if (-not (Test-GenerationCurrent -TaskVersionId $tv -Generation 2)) { $fail += "generation 2 not current after recovery" }

    # unreadable fence -> undeterminable, not RECOVERED
    Set-Content -LiteralPath $p -Value 'not json at all {{{' -Encoding ascii
    $rec = Invoke-FenceRecovery -TaskVersionId $tv -NewRunId 'run-dddddddddd'
    if ($rec.decision -eq 'RECOVERED') { $fail += "unreadable fence -> RECOVERED (should be WAITING_HUMAN/QUARANTINED)" }

    Remove-Item $p -Force -ErrorAction SilentlyContinue
    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail) }
}
