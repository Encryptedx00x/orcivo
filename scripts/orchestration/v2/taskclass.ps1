<#
taskclass.ps1 - SEMANTIC task classification.  (PRAGMATIC V2.1, PARTE 11)

Difficulty is NOT decided by file count, LOC, folder name, extension or a fixed
number of functions. The classifier evaluates the task's MEANING: blast radius,
reversibility, domain, ambiguity, acceptance criteria, security, multi-tenant,
data, migrations, money, concurrency, external integrations, architecture,
production impact and validation complexity.

A classifier agent with structured output is the preferred implementation; this
deterministic scorer is the always-available fallback and the Wave 0 authority
(no model call). The hardcoded rules act ONLY as safety floors / caps:

  security-sensitive          -> never below REASONING / STRONG review
  fundamental tenant isolation -> CRITICAL or LEVEL_C, cross-provider review
  fundamental money architecture -> CRITICAL, cross-provider review
  persistent DB migration      -> LEVEL_C
  production impact            -> LEVEL_C
  force push                   -> PROHIBITED

Structured result:
  taskComplexity   TRIVIAL | STANDARD | COMPLEX | CRITICAL | LEVEL_C
  risk             LOW | MEDIUM | HIGH | CRITICAL
  recommendedProfile FAST | BALANCED | REASONING | CRITICAL
  confidence       0..1
  reasonCodes      [ ... ]
  suggestedProvider CLAUDE | CODEX | EITHER
  reviewStrength   NORMAL | STRONG | CROSS_PROVIDER_REQUIRED
  classifier       'deterministic-v1' | 'agent:<provider>' | 'agent+floors'
  floorsApplied    [ ... ]
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:ComplexityRank = @('TRIVIAL', 'STANDARD', 'COMPLEX', 'CRITICAL', 'LEVEL_C')
$script:RiskRank       = @('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
$script:ReviewRank     = @('NORMAL', 'STRONG', 'CROSS_PROVIDER_REQUIRED')
$script:ProfileRank    = @('FAST', 'BALANCED', 'REASONING', 'CRITICAL')

function _RankMax {
    param([string[]]$Ordered, [string]$A, [string]$B)
    $ia = [array]::IndexOf($Ordered, $A); $ib = [array]::IndexOf($Ordered, $B)
    if ($ia -lt 0) { return $B }
    if ($ib -lt 0) { return $A }
    if ($ib -gt $ia) { return $B } else { return $A }
}

function _CountGroupHits {
    param([string]$Text, [string[]]$Keywords)
    $n = 0
    $t = $Text.ToLowerInvariant()
    foreach ($k in @($Keywords)) { if ($t.Contains(([string]$k).ToLowerInvariant())) { $n++ } }
    return $n
}

# Detect the semantic signals in a task. $Task fields consulted (all optional
# except taskId): title, type, description, acceptance, scope (array or string),
# touchesPaths (array), productImpact ('none'|'internal'|'production'),
# reversibility ('easy'|'hard'|'irreversible'), historyFailures (int).
function Get-TaskSignals {
    param([Parameter(Mandatory)][hashtable]$Task)
    $cfg  = Get-V2Config
    $kw   = $cfg.taskClassifier.signalKeywords
    $text = (@($Task.title, $Task.type, $Task.description, $Task.acceptance) -join "`n")
    $scopeText = ''
    if ($Task.scope) { $scopeText = (@($Task.scope) -join ' ') }
    $paths = @($Task.touchesPaths | Where-Object { $_ })
    $pathText = ($paths -join ' ').ToLowerInvariant()
    $all = ($text + "`n" + $scopeText + "`n" + $pathText)

    $sig = [ordered]@{
        tenant       = (_CountGroupHits $all @($kw.tenant))
        money        = (_CountGroupHits $all @($kw.money))
        security     = (_CountGroupHits $all @($kw.security))
        migration    = (_CountGroupHits $all @($kw.migration))
        concurrency  = (_CountGroupHits $all @($kw.concurrency))
        external     = (_CountGroupHits $all @($kw.external))
        production   = (_CountGroupHits $all @($kw.production))
        forcePush    = (_CountGroupHits $all @($kw.forcePush))
    }

    $fundamentalWords = @('fundamental', 'strategy', 'redesign', 'rework', 'global guard', 'middleware',
                          'architecture', 'every table', 'all endpoints', 'across the', 'baseline')
    $t = $all.ToLowerInvariant()

    $sensitive = @{
        securitySensitive         = ($sig.security -ge 1)
        tenantIsolationFundamental = (($sig.tenant -ge 1) -and ((_CountGroupHits $t $fundamentalWords) -ge 1))
        moneyArchitecture         = (($sig.money -ge 1) -and ((_CountGroupHits $t (@('architecture','refactor','decimal type','rounding','precision','money handling'))) -ge 1))
        persistentDbMigration     = (($sig.migration -ge 1) -and ((_CountGroupHits $t (@('ephemeral','disposable','throwaway','test db','test database'))) -eq 0))
        production                = (($sig.production -ge 1) -or ("$($Task.productImpact)" -eq 'production'))
        forcePush                 = ($sig.forcePush -ge 1)
    }

    # blast radius: distinct top-level areas + shared/high-fan-in paths
    $tops = @($paths | ForEach-Object { ($_ -replace '\\','/').Split('/')[0] } | Where-Object { $_ } | Select-Object -Unique)
    $highFanIn = @($paths | Where-Object { $_ -match '(?i)shared-types|prisma/|schema\.prisma|\.github/workflows|packages/ui|auth|guard|tenant|pnpm-lock|package\.json$' })
    $unrestricted = ("$scopeText" -match '(?i)unrestricted|everything|whole repo|entire')

    $blast = 0
    if ($unrestricted) { $blast += 3 }
    if ($tops.Count -ge 3) { $blast += 2 } elseif ($tops.Count -eq 2) { $blast += 1 }
    if ($highFanIn.Count -ge 1) { $blast += 2 }

    # ambiguity: no acceptance criteria / vague
    $accIds = @()
    if ($Task.acceptance) {
        foreach ($line in ("$($Task.acceptance)" -split "`n")) {
            if ($line -match '^\s*([A-Za-z][A-Za-z0-9_-]{0,31})\s*[:\)]') { $accIds += $matches[1] }
        }
    }
    $ambiguous = ($accIds.Count -eq 0)

    $revHard = ("$($Task.reversibility)" -in @('hard','irreversible')) -or $sensitive.persistentDbMigration -or $sensitive.production -or ($sig.external -ge 1) -or ($sig.money -ge 1)

    return [ordered]@{
        signals   = $sig
        sensitive = $sensitive
        blastRadius = $blast
        topAreas    = @($tops)
        highFanIn   = @($highFanIn)
        unrestrictedScope = $unrestricted
        acceptanceCriteria = @($accIds)
        ambiguous   = $ambiguous
        reversibilityHard = [bool]$revHard
        historyFailures = [int]("$($Task.historyFailures)" -as [int])
    }
}

# Deterministic scorer -> base (pre-floor) classification.
function _ScoreClassification {
    param($S)
    $score = 0
    $reasons = @()

    if ($S.blastRadius -ge 5) { $score += 3; $reasons += 'BLAST_RADIUS_WIDE' }
    elseif ($S.blastRadius -ge 3) { $score += 2; $reasons += 'BLAST_RADIUS_MODERATE' }
    elseif ($S.blastRadius -ge 1) { $score += 1 }

    if ($S.reversibilityHard) { $score += 2; $reasons += 'HARD_TO_REVERSE' }
    if ($S.ambiguous) { $score += 1; $reasons += 'AMBIGUOUS_ACCEPTANCE' }
    if ($S.historyFailures -ge 2) { $score += 2; $reasons += 'REPEAT_FAILURE_HISTORY' }
    elseif ($S.historyFailures -eq 1) { $score += 1 }

    if ($S.signals.security -ge 1) { $score += 2; $reasons += 'SECURITY_DOMAIN' }
    if ($S.signals.tenant -ge 1)   { $score += 2; $reasons += 'MULTI_TENANT_DOMAIN' }
    if ($S.signals.money -ge 1)    { $score += 2; $reasons += 'MONEY_DOMAIN' }
    if ($S.signals.migration -ge 1){ $score += 2; $reasons += 'SCHEMA_MIGRATION' }
    if ($S.signals.concurrency -ge 1) { $score += 1; $reasons += 'CONCURRENCY' }
    if ($S.signals.external -ge 1) { $score += 1; $reasons += 'EXTERNAL_INTEGRATION' }

    $complexity =
        if ($score -le 0) { 'TRIVIAL' }
        elseif ($score -le 2) { 'STANDARD' }
        elseif ($score -le 5) { 'COMPLEX' }
        else { 'CRITICAL' }

    $risk =
        if ($score -le 1) { 'LOW' }
        elseif ($score -le 3) { 'MEDIUM' }
        elseif ($score -le 6) { 'HIGH' }
        else { 'CRITICAL' }

    return [ordered]@{ complexity = $complexity; risk = $risk; score = $score; reasonCodes = @($reasons) }
}

# Apply the config safety floors / caps. Returns the floored classification +
# the list of floors that fired.
function _ApplyFloors {
    param($Base, $S)
    $cfg = Get-V2Config
    $complexity = $Base.complexity
    $risk       = $Base.risk
    $review     = switch ($complexity) { 'STANDARD' { 'NORMAL' } 'TRIVIAL' { 'NORMAL' } 'COMPLEX' { 'STRONG' } default { 'CROSS_PROVIDER_REQUIRED' } }
    $profile    = ($cfg.router.complexityToProfile.$complexity)
    if (-not $profile) { $profile = 'BALANCED' }
    $applied = @()
    $prohibited = $false

    foreach ($floor in @($cfg.taskClassifier.safetyFloors)) {
        if (-not [bool]$S.sensitive.($floor.when)) { continue }
        $applied += $floor.when
        if ($floor.verdict -eq 'PROHIBITED') { $prohibited = $true; continue }
        if ($floor.minComplexity) { $complexity = _RankMax $script:ComplexityRank $complexity $floor.minComplexity }
        if ($floor.minProfile)    { $profile    = _RankMax $script:ProfileRank    $profile    $floor.minProfile }
        if ($floor.minReview)     { $review     = _RankMax $script:ReviewRank     $review     $floor.minReview }
    }

    # keep profile / review coherent with a floored complexity
    $profByComplex = $cfg.router.complexityToProfile.$complexity
    if ($profByComplex) { $profile = _RankMax $script:ProfileRank $profile $profByComplex }
    if ($complexity -in @('CRITICAL','LEVEL_C')) { $review = _RankMax $script:ReviewRank $review 'CROSS_PROVIDER_REQUIRED' }
    if ($risk -eq 'CRITICAL') { $review = _RankMax $script:ReviewRank $review 'STRONG' }

    return [ordered]@{
        complexity = $complexity; risk = $risk; reviewStrength = $review
        recommendedProfile = $profile; floorsApplied = @($applied); prohibited = $prohibited
    }
}

# PUBLIC: full structured classification for a task.
function Get-TaskClassification {
    param(
        [Parameter(Mandatory)][hashtable]$Task,
        [hashtable]$AgentResult = $null   # optional: {complexity;risk;profile;confidence;reasonCodes;suggestedProvider} from a classifier agent
    )
    if (-not $Task.taskId) { throw "v2 taskclass: task has no taskId" }

    $S    = Get-TaskSignals -Task $Task
    $base = _ScoreClassification $S

    $classifier = 'deterministic-v1'
    $confidence = 0.6
    if ($S.ambiguous) { $confidence -= 0.15 }
    if ($S.acceptanceCriteria.Count -ge 3) { $confidence += 0.1 }
    if (($S.signals.Values | Measure-Object -Sum).Sum -ge 3) { $confidence += 0.1 }

    if ($AgentResult -and $AgentResult.complexity) {
        # agent proposes; deterministic scorer is a floor it can only RAISE
        $base.complexity = _RankMax $script:ComplexityRank $base.complexity ([string]$AgentResult.complexity)
        if ($AgentResult.risk) { $base.risk = _RankMax $script:RiskRank $base.risk ([string]$AgentResult.risk) }
        if ($AgentResult.reasonCodes) { $base.reasonCodes = @($base.reasonCodes) + @($AgentResult.reasonCodes) | Select-Object -Unique }
        if ($null -ne $AgentResult.confidence) { $confidence = [Math]::Max([double]$AgentResult.confidence, $confidence) }
        $classifier = 'agent+floors'
    }

    $floored = _ApplyFloors $base $S
    $confidence = [Math]::Max(0.05, [Math]::Min(0.99, $confidence))

    $suggested = 'EITHER'
    if ($AgentResult -and $AgentResult.suggestedProvider) { $suggested = [string]$AgentResult.suggestedProvider }

    $verdict = 'CLASSIFIED'
    if ($floored.prohibited) { $verdict = 'PROHIBITED' }

    return [ordered]@{
        schemaVersion    = 'orcivo.orchestration.v2.taskclass/1'
        taskId           = "$($Task.taskId)"
        verdict          = $verdict
        taskComplexity   = $floored.complexity
        risk             = $floored.risk
        recommendedProfile = $floored.recommendedProfile
        reviewStrength   = $floored.reviewStrength
        suggestedProvider = $suggested
        confidence       = [Math]::Round($confidence, 2)
        reasonCodes      = @($base.reasonCodes)
        floorsApplied    = @($floored.floorsApplied)
        signals          = $S.signals
        blastRadius      = $S.blastRadius
        classifier       = $classifier
        classifiedAt     = (Get-Date).ToUniversalTime().ToString('o')
    }
}

# ---- Wave 0 determinism corpus -------------------------------------------------
function Get-ClassifierCorpus {
    return @(
        @{ task = @{ taskId = 'T-doc';   title = 'Fix a typo in the README';  type = 'DOC';
                     description = 'change one word'; acceptance = 'AC1: word corrected';
                     touchesPaths = @('README.md') };
           expect = @{ taskComplexity = 'TRIVIAL'; reviewStrength = 'NORMAL' } },
        @{ task = @{ taskId = 'T-std';   title = 'Add a shared loading + empty state component to the customers list';  type = 'UX';
                     description = 'new reusable component in the ui package, wired into the customers page';
                     acceptance = "AC1: spinner visible during fetch`nAC2: empty state shown`nAC3: error state shown";
                     touchesPaths = @('apps/web/app/customers/page.tsx', 'packages/ui/src/DataState.tsx') };
           expect = @{ taskComplexity = 'STANDARD'; reviewStrength = 'NORMAL' } },
        @{ task = @{ taskId = 'T-tenant'; title = 'Rework the global tenant isolation guard strategy';  type = 'BUSINESS_RULE';
                     description = 'every table must carry company_id; add a global guard and middleware across all endpoints';
                     acceptance = "AC1: cross-tenant read blocked";
                     touchesPaths = @('apps/backend/src/common/tenant.guard.ts','prisma/schema.prisma') };
           expect = @{ taskComplexity = 'LEVEL_C'; reviewStrength = 'CROSS_PROVIDER_REQUIRED'; risk = 'CRITICAL' } },
        @{ task = @{ taskId = 'T-money'; title = 'Refactor money handling to Prisma.Decimal architecture';  type = 'TECH_DEBT';
                     description = 'replace number with decimal type everywhere, rounding + precision rules';
                     acceptance = "AC1: no float money";
                     touchesPaths = @('packages/shared-types/src/money.ts','apps/backend/src') };
           expect = @{ taskComplexity = 'CRITICAL'; reviewStrength = 'CROSS_PROVIDER_REQUIRED' } },
        @{ task = @{ taskId = 'T-mig';   title = 'Apply pending Prisma migration to the database';  type = 'TECH_DEBT';
                     description = 'prisma migrate deploy, alter table, backfill company_id';
                     acceptance = "AC1: migration applied";
                     touchesPaths = @('prisma/migrations') };
           expect = @{ taskComplexity = 'LEVEL_C' } },
        @{ task = @{ taskId = 'T-force'; title = 'force push the rebased branch';  type = 'TECH_DEBT';
                     description = 'git push --force after rewrite history';
                     acceptance = 'AC1: branch updated' };
           expect = @{ verdict = 'PROHIBITED' } }
    )
}

function Test-ClassifierSelftest {
    $fail = @()
    foreach ($case in (Get-ClassifierCorpus)) {
        $r = Get-TaskClassification -Task $case.task
        foreach ($k in $case.expect.Keys) {
            if ("$($r.$k)" -ne "$($case.expect.$k)") {
                $fail += "$($case.task.taskId): $k expected '$($case.expect.$k)' got '$($r.$k)'"
            }
        }
        # determinism: same input -> same output
        $r2 = Get-TaskClassification -Task $case.task
        if ((ConvertTo-CanonicalJson (Remove-HashKeys $r @('classifiedAt'))) -ne (ConvertTo-CanonicalJson (Remove-HashKeys $r2 @('classifiedAt')))) {
            $fail += "$($case.task.taskId): non-deterministic classification"
        }
    }
    return [ordered]@{ ok = ($fail.Count -eq 0); failures = @($fail) }
}
