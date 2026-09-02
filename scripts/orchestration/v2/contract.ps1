<#
contract.ps1 - freeze the task contract, then enforce it against the real diff.
                (H-06, M-01, M-03)

Fixes H-06: V1 had no protected paths and never compared declared scope to the
real diff, so an executor could rewrite .planning, acceptance tests, orchestration
scripts or policy and the merge would still `git add -A` it.

Fixes M-01: scope conflict was a fuzzy planning approximation; here the check runs
on the ACTUAL changed-file list produced by the executor's commit.

Fixes M-03: an empty diff is not "done". A no-op needs an explicit
NO_CHANGE_JUSTIFIED contract with evidence per acceptance criterion.

Contract lifecycle:
  1. Freeze-Contract  (BEFORE dispatch)  -> immutable file outside the worktree,
     keyed by taskVersionId, with specHash / acceptanceHash / configHash /
     verificationProfileHash / planningHead + declared scope + protected-path
     grants + risk. The executor cannot see or edit this file.
  2. executor produces an immutable commit in its worktree.
  3. Test-ContractCompliance  (AFTER the commit, BEFORE check/review) -> compares
     the commit's changed files to the frozen scope + protected paths.
     Out of scope / protected path without an explicit grant  ->  POLICY_BLOCK.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

$script:ContractDir = Join-Path (Get-V2Dir) 'contracts'

function Get-ContractPath {
    param([string]$TaskVersionId)
    if ($TaskVersionId -notmatch '^[0-9a-f]{64}$') { throw "v2 contract: bad taskVersionId" }
    return (Join-Path $script:ContractDir "$TaskVersionId.json")
}

function Freeze-Contract {
    param(
        [Parameter(Mandatory)][string]$TaskId,
        [Parameter(Mandatory)][string]$PlanningHead,
        [Parameter(Mandatory)][string]$SpecText,
        [Parameter(Mandatory)][string]$AcceptanceText,
        [string[]]$DeclaredScope = @(),
        [string[]]$ProtectedPathGrants = @(),
        [ValidateSet('A','B','C')][string]$Risk = 'B',
        [string]$Gate = 'none',
        [string]$VerificationProfile = 'B',
        [hashtable]$ExtraBindings = @{}
    )
    $specHash       = New-StringHash $SpecText
    $acceptanceHash = New-StringHash $AcceptanceText
    $configHash     = New-FileHash (Join-Path (Get-V2Dir) 'config.v2.json')
    $profileHash    = New-StringHash $VerificationProfile

    $tvid = (New-ContentHash ([ordered]@{
        taskId = $TaskId; planningHead = $PlanningHead
        specHash = $specHash; acceptanceHash = $acceptanceHash; v = 'orcivo.taskversion/1'
    })) -replace '^sha256:', ''

    # a protected-path grant is only honoured if the task's risk is elevated
    $cfg = Get-V2Config
    if (@($ProtectedPathGrants).Count -gt 0 -and $Risk -notin @($cfg.contract.protectedPathElevatedRisks)) {
        throw "v2 contract H-06: protected-path grants require an elevated risk ($($cfg.contract.protectedPathElevatedRisks -join '/')); task risk is '$Risk'"
    }

    $contract = [ordered]@{
        schemaVersion       = 'orcivo.orchestration.v2.contract/1'
        taskVersionId       = $tvid
        taskId              = $TaskId
        planningHead        = $PlanningHead
        frozenAt            = (Get-Date).ToUniversalTime().ToString('o')
        specText            = $SpecText
        acceptanceText      = $AcceptanceText
        specHash            = $specHash
        acceptanceHash      = $acceptanceHash
        configHash          = $configHash
        verificationProfile = $VerificationProfile
        verificationProfileHash = $profileHash
        declaredScope       = @($DeclaredScope)
        protectedPathGrants = @($ProtectedPathGrants)
        risk                = $Risk
        gate                = $Gate
        bindings            = ([ordered]@{} + $ExtraBindings)
    }
    $contract.contractHash = New-ContentHash (Remove-HashKeys $contract @('contractHash'))

    $path = Get-ContractPath $tvid
    if (Test-Path $path) {
        $existing = Read-V2Json $path
        if ($existing.contractHash -ne $contract.contractHash) {
            throw "v2 contract H-06: a DIFFERENT contract is already frozen for $tvid. Contracts are immutable; a change of spec/acceptance must produce a new taskVersionId."
        }
        return $existing
    }
    # write exclusively so two dispatchers cannot freeze different contracts
    if (-not (New-ExclusiveFile $path (($contract | ConvertTo-Json -Depth 30)))) {
        $existing = Read-V2Json $path
        if ($existing.contractHash -ne $contract.contractHash) { throw "v2 contract H-06: lost a freeze race with a different contract for $tvid" }
        return $existing
    }
    Write-V2Log "contract: frozen $($tvid.Substring(0,12)) ($TaskId) risk=$Risk scope=$(@($DeclaredScope).Count) grants=$(@($ProtectedPathGrants).Count)"
    return $contract
}

function Get-Contract {
    param([string]$TaskVersionId)
    $path = Get-ContractPath $TaskVersionId
    if (-not (Test-Path $path)) { throw "v2 contract: not frozen for $TaskVersionId" }
    return (Read-V2Json $path)
}

# is $file under one of $prefixes (dir prefix or exact file)?
function _PathUnder {
    param([string]$File, [string[]]$Prefixes)
    $f = ($File -replace '\\','/').TrimStart('./')
    foreach ($p in $Prefixes) {
        $pp = ($p -replace '\\','/')
        if ($pp.EndsWith('/')) { if ($f.StartsWith($pp, [System.StringComparison]::OrdinalIgnoreCase)) { return $true } }
        elseif ($pp -match '[*?]') { if ($f -like $pp) { return $true } }
        else { if ($f -eq $pp -or $f.StartsWith($pp.TrimEnd('/') + '/', [System.StringComparison]::OrdinalIgnoreCase)) { return $true } }
    }
    return $false
}

# M-03: classify the change against the acceptance contract
function Get-ChangeClass {
    param(
        [string]$WorktreeDir, [string]$BaseSha, [string]$HeadSha,
        [string]$NoChangeEvidenceFile = ''
    )
    $changed = Get-GitChangedFiles -Dir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha
    if (@($changed).Count -gt 0) { return [ordered]@{ class = 'CHANGED'; changedFiles = @($changed) } }
    if ($NoChangeEvidenceFile -and (Test-Path $NoChangeEvidenceFile)) {
        $ev = $null
        try { $ev = Read-V2Json $NoChangeEvidenceFile } catch { }
        $crits = @($ev.criteria)
        if ($crits.Count -gt 0 -and (@($crits | Where-Object { -not $_.reason }).Count -eq 0)) {
            return [ordered]@{ class = 'NO_CHANGE_JUSTIFIED'; changedFiles = @(); evidence = $ev }
        }
    }
    return [ordered]@{ class = 'NO_CHANGE_UNJUSTIFIED'; changedFiles = @() }
}

# H-06 / M-01: the real diff must live inside the frozen contract
function Test-ContractCompliance {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$WorktreeDir,
        [Parameter(Mandatory)][string]$BaseSha,
        [Parameter(Mandatory)][string]$HeadSha,
        [string]$NoChangeEvidenceFile = ''
    )
    $c   = Get-Contract $TaskVersionId
    $cfg = Get-V2Config
    $violations = @()

    $cc = Get-ChangeClass -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha -NoChangeEvidenceFile $NoChangeEvidenceFile
    if ($cc.class -eq 'NO_CHANGE_UNJUSTIFIED') {
        $violations += 'NO_CHANGE without a justified evidence artifact (M-03: absence of diff is not completion)'
        return [ordered]@{ compliant = $false; verdict = 'POLICY_BLOCK'; changeClass = $cc.class; changedFiles = @(); violations = @($violations) }
    }
    if ($cc.class -eq 'NO_CHANGE_JUSTIFIED') {
        return [ordered]@{ compliant = $true; verdict = 'NO_CHANGE_JUSTIFIED'; changeClass = $cc.class; changedFiles = @(); violations = @() }
    }

    $declared  = @($c.declaredScope)
    $protected = @($cfg.contract.protectedPaths) + @($cfg.contract.authoritativeAcceptanceGlobs)
    $grants    = @($c.protectedPathGrants)

    foreach ($f in $cc.changedFiles) {
        $inScope     = ($declared.Count -eq 0) -or (_PathUnder $f $declared)
        $isProtected = _PathUnder $f $protected
        $isGranted   = ($grants.Count -gt 0) -and (_PathUnder $f $grants)

        if ($isProtected -and -not $isGranted) {
            $violations += "PROTECTED path modified without a contract grant: $f"
        } elseif ($isProtected -and $isGranted -and $c.risk -notin @($cfg.contract.protectedPathElevatedRisks)) {
            $violations += "protected path $f granted but task risk '$($c.risk)' is not elevated"
        } elseif (-not $inScope -and -not ($isProtected -and $isGranted)) {
            $violations += "OUT OF SCOPE change: $f (declared scope: $($declared -join ', '))"
        }
    }

    $ok = ($violations.Count -eq 0)
    return [ordered]@{
        compliant    = $ok
        verdict      = $(if ($ok) { 'CHANGED' } else { 'POLICY_BLOCK' })
        changeClass  = 'CHANGED'
        changedFiles = @($cc.changedFiles)
        violations   = @($violations)
    }
}
