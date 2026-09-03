<#
correction.ps1 - bounded correction loop.  (PRAGMATIC V2.1, PARTE 17)

REQUEST_CHANGES -> structured findings -> implementer -> NEW candidate ->
rerun checks -> new review. Bounded by config.correctionLoop.maxCycles. When the
budget is spent the task goes to WAITING_HUMAN with ledger state
FAILED_REVIEW_BUDGET - never an infinite loop.

This module is deliberately pure: it drives caller-supplied Execute / Verify /
Review callbacks and returns a structured trace. The pipeline maps the trace to
ledger transitions. Each cycle MUST produce a distinct candidate id (proving a
new candidate) and MUST run a fresh review (proving a new review).
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

# $Execute : scriptblock -> @{ candidateId; ok; note }        (cycle index + findings passed in)
# $Verify  : scriptblock -> @{ pass; note }                   (candidateId passed in)
# $Review  : scriptblock -> @{ verdict; findings; note }      (candidateId passed in); verdict in
#            APPROVE | REQUEST_CHANGES | HUMAN_REVIEW_REQUIRED | INCOMPLETE_REVIEW
function Invoke-CorrectionLoop {
    param(
        [Parameter(Mandatory)][scriptblock]$Execute,
        [Parameter(Mandatory)][scriptblock]$Verify,
        [Parameter(Mandatory)][scriptblock]$Review,
        [int]$MaxCycles = -1
    )
    $cfg = Get-V2Config
    if ($MaxCycles -lt 0) { $MaxCycles = [int]$cfg.correctionLoop.maxCycles }

    $trace = New-Object System.Collections.Generic.List[object]
    $seenCandidates = New-Object System.Collections.Generic.List[string]
    $findings = @()
    $cycle = 0
    $final = $null

    while ($true) {
        $ex = & $Execute $cycle $findings
        if (-not $ex.ok) { $final = [ordered]@{ status = 'FAILED'; ledgerState = 'FAILED'; reason = "execute failed on cycle $cycle : $($ex.note)"; cycles = $cycle }; break }
        $cand = [string]$ex.candidateId
        if ($seenCandidates.Contains($cand)) {
            $final = [ordered]@{ status = 'FAILED'; ledgerState = 'FAILED'; reason = "cycle $cycle reused candidate '$cand' - a correction MUST produce a new candidate"; cycles = $cycle }; break
        }
        $seenCandidates.Add($cand)

        $vf = & $Verify $cand
        $rv = $null
        if ($vf.pass) {
            $rv = & $Review $cand
        }

        $trace.Add([ordered]@{ cycle = $cycle; candidateId = $cand; verifyPass = [bool]$vf.pass; verdict = $(if ($rv) { $rv.verdict } else { 'CHECK_FAILED' }) })

        if (-not $vf.pass) {
            if ($cycle -ge $MaxCycles) { $final = [ordered]@{ status = 'CHECK_FAILED'; ledgerState = 'FAILED'; reason = "verification failed and correction budget spent ($cycle/$MaxCycles)"; cycles = $cycle }; break }
            $cycle++; $findings = @("verification failed: $($vf.note)"); continue
        }

        switch ("$($rv.verdict)") {
            'APPROVE' {
                $final = [ordered]@{ status = 'APPROVED'; ledgerState = 'APPROVED'; reason = 'approved'; cycles = $cycle; approvedCandidate = $cand }
            }
            'REQUEST_CHANGES' {
                if ($cycle -ge $MaxCycles) {
                    $final = [ordered]@{ status = 'FAILED_REVIEW_BUDGET'; ledgerState = $cfg.correctionLoop.budgetExceededLedgerState
                        reason = "review still REQUEST_CHANGES after $($cycle + 1) attempts (budget $($MaxCycles + 1)) - WAITING_HUMAN"; cycles = $cycle }
                } else {
                    $cycle++
                    $findings = @($rv.findings)
                }
            }
            default {
                $final = [ordered]@{ status = 'WAITING_HUMAN'; ledgerState = 'WAITING_HUMAN'; reason = "review verdict '$($rv.verdict)' -> human"; cycles = $cycle }
            }
        }
        if ($final) { break }
    }

    $final.trace = @($trace.ToArray())
    $final.distinctCandidates = $seenCandidates.Count
    $final.maxCycles = $MaxCycles
    return $final
}

# ---- Wave 0 selftest ------------------------------------------------------
function Test-CorrectionLoopSelftest {
    $fail = @()
    $cfg = Get-V2Config
    $budget = [int]$cfg.correctionLoop.maxCycles

    # 1. REQUEST_CHANGES once, then APPROVE -> 1 correction cycle, 2 candidates, 2 reviews
    $reviews = 0
    $r = Invoke-CorrectionLoop `
        -Execute { param($c, $f) @{ candidateId = "cand-$c"; ok = $true } } `
        -Verify  { param($cand) @{ pass = $true } } `
        -Review  { param($cand) $script:__revN++; if ($script:__revN -eq 1) { @{ verdict = 'REQUEST_CHANGES'; findings = @('thin body') } } else { @{ verdict = 'APPROVE'; findings = @() } } }
    if ($r.status -ne 'APPROVED') { $fail += "1: status $($r.status), expected APPROVED" }
    if ($r.cycles -ne 1) { $fail += "1: cycles $($r.cycles), expected 1" }
    if ($r.distinctCandidates -ne 2) { $fail += "1: distinctCandidates $($r.distinctCandidates), expected 2 (new candidate per cycle)" }
    if (@($r.trace).Count -ne 2) { $fail += "1: trace length $(@($r.trace).Count), expected 2 (fresh review each cycle)" }
    $script:__revN = 0

    # 2. always REQUEST_CHANGES -> FAILED_REVIEW_BUDGET after budget, NOT infinite
    $calls = 0
    $r = Invoke-CorrectionLoop `
        -Execute { param($c, $f) $script:__cc++; @{ candidateId = "c-$($script:__cc)"; ok = $true } } `
        -Verify  { param($cand) @{ pass = $true } } `
        -Review  { param($cand) @{ verdict = 'REQUEST_CHANGES'; findings = @('still bad') } }
    if ($r.status -ne 'FAILED_REVIEW_BUDGET') { $fail += "2: status $($r.status), expected FAILED_REVIEW_BUDGET" }
    if ($r.ledgerState -ne $cfg.correctionLoop.budgetExceededLedgerState) { $fail += "2: ledgerState $($r.ledgerState)" }
    if ($r.cycles -ne $budget) { $fail += "2: cycles $($r.cycles), expected $budget" }
    if ($r.distinctCandidates -ne ($budget + 1)) { $fail += "2: distinctCandidates $($r.distinctCandidates), expected $($budget + 1)" }
    $script:__cc = 0

    # 3. a cycle that reuses a candidate id is rejected
    $r = Invoke-CorrectionLoop `
        -Execute { param($c, $f) @{ candidateId = "same"; ok = $true } } `
        -Verify  { param($cand) @{ pass = $true } } `
        -Review  { param($cand) @{ verdict = 'REQUEST_CHANGES'; findings = @('x') } }
    if ($r.status -ne 'FAILED') { $fail += "3: reused candidate not rejected (status $($r.status))" }

    # 4. HUMAN_REVIEW_REQUIRED -> WAITING_HUMAN, no correction attempts
    $r = Invoke-CorrectionLoop `
        -Execute { param($c, $f) @{ candidateId = "h-$c"; ok = $true } } `
        -Verify  { param($cand) @{ pass = $true } } `
        -Review  { param($cand) @{ verdict = 'HUMAN_REVIEW_REQUIRED'; findings = @() } }
    if ($r.status -ne 'WAITING_HUMAN') { $fail += "4: status $($r.status), expected WAITING_HUMAN" }
    if ($r.cycles -ne 0) { $fail += "4: cycles $($r.cycles), expected 0" }

    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail) }
}
