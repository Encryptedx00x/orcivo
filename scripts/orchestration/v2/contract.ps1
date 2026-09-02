<#
contract.ps1 - freeze the task contract deterministically, then enforce it.
                (H-06, M-01, M-03, NH-01)

Second-review remediation:
  * NH-01 - the freeze is now IDEMPOTENT. `frozenAt` and other audit metadata are
    NOT part of contractHash; re-freezing the same logical contract returns the
    same object/hash. contractHash covers content only.
  * C-03/H-06 - stored hashes are NEVER trusted on read. Get-Contract recomputes
    specHash from specText, acceptanceHash from acceptanceText,
    verificationProfileHash + verificationDefinitionHash from the real config
    profile, configHash from the file, and contractHash from the canonical object.
    Any mismatch throws (tamper), fail closed.
  * H-06/M-01 - protected-path / scope matching uses ConvertTo-RelPathKey /
    Test-RelPathUnder (canonical, Windows case-insensitive, dot-directory safe).
    An EMPTY declaredScope FAILS CLOSED. "Unrestricted" is an explicit risk-C
    grant (`unrestrictedScope`), a different thing from [].
  * M-03 - NO_CHANGE evidence must match the FROZEN acceptance criteria exactly
    (same id set, every one with a nonempty reason). Terminal state is
    NO_CHANGE_ACCEPTED (monotonic), not a perpetual APPROVED.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'verification.ps1')

$script:ContractDir = Join-Path (Get-V2Dir) 'contracts'
$script:ContractContentKeys = @(
    'schemaVersion','taskVersionId','taskId','planningHead',
    'specText','acceptanceText','specHash','acceptanceHash','configHash',
    'verificationProfile','verificationProfileHash','verificationDefinitionHash',
    'declaredScope','protectedPathGrants','dependencies','risk','gate','acceptanceCriteriaIds','bindings'
)

function Get-ContractPath {
    param([string]$TaskVersionId)
    if ($TaskVersionId -notmatch '^[0-9a-f]{64}$') { throw "v2 contract: bad taskVersionId" }
    return (Join-Path $script:ContractDir "$TaskVersionId.json")
}

# canonical acceptance-criteria ID extraction: lines beginning "AC1:", "AC12 :" ...
function Get-AcceptanceCriteriaIds {
    param([string]$AcceptanceText)
    $ids = New-Object System.Collections.Generic.List[string]
    foreach ($line in ($AcceptanceText -split "`n")) {
        $m = [regex]::Match($line, '^\s*([A-Za-z][A-Za-z0-9_-]{0,31})\s*[:\)]')
        if ($m.Success) {
            $id = $m.Groups[1].Value
            if (-not $ids.Contains($id)) { [void]$ids.Add($id) }
        }
    }
    return @($ids.ToArray())
}

# Canonicalise every field to a fixed shape so the hash is identical whether it
# comes from the freeze-time [ordered] object or from JSON round-trip (PS 5.1
# unrolls single-element arrays and turns [] into "" / {}).
$script:ContractArrayKeys = @('declaredScope','protectedPathGrants','dependencies','acceptanceCriteriaIds')

# H3-05: a protected-path grant must be an EXACT canonical member of the
# orchestrator allowlist. No globs, no root, no parent, no bare drive, no
# "whole .planning". Returns the canonical key on success; throws otherwise.
function Assert-GrantAllowed {
    param([string]$Grant, [string[]]$Allowlist)
    if ($Grant -eq 'unrestrictedScope') { return $Grant }   # cannot reach protected paths anyway
    if ([string]::IsNullOrWhiteSpace($Grant)) { throw "v2 contract H3-05: empty protected-path grant" }
    if ($Grant -match '[*?]') { throw "v2 contract H3-05: glob protected-path grant '$Grant' rejected" }
    if ($Grant -match '(^|[/\\])\.\.([/\\]|$)') { throw "v2 contract H3-05: parent-traversal grant '$Grant' rejected" }
    $gk = ConvertTo-RelPathKey $Grant
    if (-not $gk) { throw "v2 contract H3-05: grant '$Grant' canonicalises to nothing (root/./.. rejected)" }
    $canon = @($Allowlist | ForEach-Object { ConvertTo-RelPathKey $_ })
    if ($canon -cnotcontains $gk) {
        throw "v2 contract H3-05: protected-path grant '$Grant' is not an exact member of the orchestrator allowlist [$($Allowlist -join ', ')]. A task can never invent a protected prefix."
    }
    return $gk
}
function _ComputeContentHash {
    param($Obj)
    $get = { param($k) if ($Obj -is [System.Collections.IDictionary]) { return $Obj[$k] } else { return $Obj.$k } }
    $h = [ordered]@{}
    foreach ($k in $script:ContractContentKeys) {
        $v = & $get $k
        if ($script:ContractArrayKeys -contains $k) {
            $h[$k] = @($v | Where-Object { $null -ne $_ } | ForEach-Object { [string]$_ })
        } elseif ($k -eq 'bindings') {
            $b = [ordered]@{}
            if ($v -is [System.Collections.IDictionary]) { foreach ($bk in ($v.Keys | Sort-Object { [string]$_ })) { $b[[string]$bk] = [string]$v[$bk] } }
            elseif ($v -is [System.Management.Automation.PSCustomObject]) { foreach ($p in ($v.PSObject.Properties | Sort-Object Name)) { $b[$p.Name] = [string]$p.Value } }
            $h[$k] = $b
        } else {
            $h[$k] = [string]$v
        }
    }
    return (New-ContentHash $h)
}

function Freeze-Contract {
    param(
        [Parameter(Mandatory)][string]$TaskId,
        [Parameter(Mandatory)][string]$PlanningHead,
        [Parameter(Mandatory)][string]$SpecText,
        [Parameter(Mandatory)][string]$AcceptanceText,
        [string[]]$DeclaredScope = @(),
        [string[]]$ProtectedPathGrants = @(),
        [string[]]$Dependencies = @(),
        [ValidateSet('A','B','C')][string]$Risk = 'B',
        [string]$Gate = 'none',
        [ValidateSet('A','B','C')][string]$VerificationProfile = 'B',
        [hashtable]$ExtraBindings = @{}
    )
    $cfg = Get-V2Config

    # secrets never persisted raw (H-11) - redact spec/acceptance before they touch disk
    $SpecText       = Protect-ArtifactText $SpecText
    $AcceptanceText = Protect-ArtifactText $AcceptanceText

    $specHash       = New-StringHash $SpecText
    $acceptanceHash = New-StringHash $AcceptanceText
    $configHash     = New-FileHash (Join-Path (Get-V2Dir) 'config.v2.json')
    $profileHash    = New-StringHash $VerificationProfile
    $defHash        = New-VerificationDefinitionHash $VerificationProfile
    $critIds        = Get-AcceptanceCriteriaIds $AcceptanceText

    $tvid = (New-ContentHash ([ordered]@{
        taskId = $TaskId; planningHead = $PlanningHead
        specHash = $specHash; acceptanceHash = $acceptanceHash; v = 'orcivo.taskversion/1'
    })) -replace '^sha256:', ''

    $grants = @($ProtectedPathGrants)
    if ($grants.Count -gt 0 -and $Risk -notin @($cfg.contract.protectedPathElevatedRisks)) {
        throw "v2 contract H-06: protected-path grants require an elevated risk ($($cfg.contract.protectedPathElevatedRisks -join '/')); task risk is '$Risk'"
    }
    if (($grants -contains 'unrestrictedScope') -and $Risk -notin @($cfg.contract.protectedPathElevatedRisks)) {
        throw "v2 contract H-06: 'unrestrictedScope' is a risk-elevated grant"
    }
    # H3-05: every explicit grant must be an exact allowlist member. Risk C alone
    # is NOT a blank cheque.
    $allow = @($cfg.contract.grantableProtectedPrefixes)
    foreach ($g in $grants) { [void](Assert-GrantAllowed -Grant $g -Allowlist $allow) }

    $deps = @($Dependencies | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { [string]$_ })
    foreach ($d in $deps) { if ($d -notmatch '^[0-9a-f]{64}$') { throw "v2 contract #9: dependency '$d' is not a taskVersionId" } }

    $contract = [ordered]@{
        schemaVersion       = 'orcivo.orchestration.v2.contract/2'
        taskVersionId       = $tvid
        taskId              = $TaskId
        planningHead        = $PlanningHead
        specText            = $SpecText
        acceptanceText      = $AcceptanceText
        specHash            = $specHash
        acceptanceHash      = $acceptanceHash
        configHash          = $configHash
        verificationProfile = $VerificationProfile
        verificationProfileHash    = $profileHash
        verificationDefinitionHash = $defHash
        declaredScope       = @($DeclaredScope)
        protectedPathGrants = $grants
        dependencies        = @($deps)
        risk                = $Risk
        gate                = $Gate
        acceptanceCriteriaIds = @($critIds)
        bindings            = ([ordered]@{} + $ExtraBindings)
    }
    $contract.contractHash = _ComputeContentHash $contract
    # audit metadata is OUTSIDE the hash (NH-01: idempotent freeze)
    $contract.audit = [ordered]@{
        frozenAt   = (Get-Date).ToUniversalTime().ToString('o')
        frozenBy   = (Get-ProcessIdentity)
    }

    $path = Get-ContractPath $tvid
    if (Test-Path $path) {
        # M3-02: an existing contract is put through the FULL recompute-on-read
        # validation (Get-Contract) BEFORE it can be returned. A tampered contract
        # never leaves this function as an authoritative object.
        $existing = Get-Contract $tvid
        if ($existing.contractHash -ne $contract.contractHash) {
            throw "v2 contract NH-01: a DIFFERENT contract is already frozen for $tvid. Contracts are immutable; a content change must produce a new taskVersionId."
        }
        return $existing        # idempotent: same content, fully re-validated
    }
    if (-not (New-ExclusiveFile $path (ConvertTo-CanonicalJson $contract))) {
        $existing = Get-Contract $tvid
        if ($existing.contractHash -ne $contract.contractHash) { throw "v2 contract NH-01: lost a freeze race with a different contract for $tvid" }
        return $existing
    }
    Write-V2Log "contract: frozen $($tvid.Substring(0,12)) ($TaskId) risk=$Risk scope=$(@($DeclaredScope).Count) grants=$($grants.Count) crit=$($critIds.Count)"
    return $contract
}

# NEVER trust stored hashes - recompute everything from the real inputs.
function Get-Contract {
    param([string]$TaskVersionId, [switch]$AllowConfigDrift)
    $path = Get-ContractPath $TaskVersionId
    if (-not (Test-Path $path)) { throw "v2 contract: not frozen for $TaskVersionId" }
    $c = Read-V2Json $path

    $problems = @()
    $reSpec = New-StringHash ([string]$c.specText)
    $reAcc  = New-StringHash ([string]$c.acceptanceText)
    if ($reSpec -ne $c.specHash) { $problems += "specHash: stored $($c.specHash) != recomputed $reSpec" }
    if ($reAcc  -ne $c.acceptanceHash) { $problems += "acceptanceHash: stored $($c.acceptanceHash) != recomputed $reAcc" }

    $reProfHash = New-StringHash ([string]$c.verificationProfile)
    if ($reProfHash -ne $c.verificationProfileHash) { $problems += "verificationProfileHash mismatch" }
    try {
        $reDef = New-VerificationDefinitionHash ([string]$c.verificationProfile)
        if ($reDef -ne $c.verificationDefinitionHash) { $problems += "verificationDefinitionHash: profile '$($c.verificationProfile)' content changed since freeze" }
    } catch { $problems += "verification profile '$($c.verificationProfile)' no longer resolvable" }

    $reCrit = Get-AcceptanceCriteriaIds ([string]$c.acceptanceText)
    if ((($reCrit -join '|')) -ne ((@($c.acceptanceCriteriaIds) -join '|'))) { $problems += "acceptanceCriteriaIds drift" }

    $reTvid = (New-ContentHash ([ordered]@{
        taskId = [string]$c.taskId; planningHead = [string]$c.planningHead
        specHash = $reSpec; acceptanceHash = $reAcc; v = 'orcivo.taskversion/1'
    })) -replace '^sha256:', ''
    if ($reTvid -ne $TaskVersionId) { $problems += "taskVersionId does not derive from the frozen spec/acceptance" }

    $reContract = _ComputeContentHash $c
    if ($reContract -ne $c.contractHash) { $problems += "contractHash: stored $($c.contractHash) != recomputed $reContract" }

    $reConfig = New-FileHash (Join-Path (Get-V2Dir) 'config.v2.json')
    if (-not $AllowConfigDrift -and $reConfig -ne $c.configHash) {
        $problems += "configHash: config.v2.json changed since freeze (stored $($c.configHash) != now $reConfig)"
    }

    if ($problems.Count -gt 0) {
        throw "v2 contract TAMPERED for $TaskVersionId (fail closed): $($problems -join ' ; ')"
    }
    return $c
}

# ---- change classification against the FROZEN acceptance contract (M-03) ----
function Get-ChangeClass {
    param(
        [string]$TaskVersionId,
        [string]$WorktreeDir, [string]$BaseSha, [string]$HeadSha,
        [string]$NoChangeEvidenceFile = ''
    )
    $changed = Get-GitChangedFiles -Dir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha
    if (@($changed).Count -gt 0) { return [ordered]@{ class = 'CHANGED'; changedFiles = @($changed) } }

    $c = Get-Contract $TaskVersionId
    $expected = @($c.acceptanceCriteriaIds)
    if ($NoChangeEvidenceFile -and (Test-Path $NoChangeEvidenceFile)) {
        $ev = $null
        try { $ev = Read-V2Json $NoChangeEvidenceFile } catch { }
        $entries = @($ev.criteria)
        $gotIds = @($entries | ForEach-Object { "$($_.id)" } | Where-Object { $_ })
        $allHaveReason = (@($entries | Where-Object { -not ([string]$_.reason).Trim() }).Count -eq 0)
        $sameSet = (($gotIds | Sort-Object) -join '|') -eq (($expected | Sort-Object) -join '|')
        $boundToContract = ("$($ev.contractHash)" -eq "$($c.contractHash)")
        if ($expected.Count -gt 0 -and $sameSet -and $allHaveReason -and $boundToContract) {
            return [ordered]@{ class = 'NO_CHANGE_JUSTIFIED'; changedFiles = @(); evidence = $ev }
        }
        return [ordered]@{ class = 'NO_CHANGE_UNJUSTIFIED'; changedFiles = @()
            why = "evidence must cover exactly {$($expected -join ',')} each with a reason and carry contractHash $($c.contractHash)" }
    }
    return [ordered]@{ class = 'NO_CHANGE_UNJUSTIFIED'; changedFiles = @(); why = 'no evidence artifact' }
}

# ---- H-06 / M-01: the real diff must live inside the frozen contract ----
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

    $cc = Get-ChangeClass -TaskVersionId $TaskVersionId -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha -NoChangeEvidenceFile $NoChangeEvidenceFile
    if ($cc.class -eq 'NO_CHANGE_UNJUSTIFIED') {
        return [ordered]@{ compliant = $false; verdict = 'POLICY_BLOCK'; changeClass = $cc.class; changedFiles = @()
            violations = @("NO_CHANGE without justified evidence (M-03): $($cc.why)") }
    }
    if ($cc.class -eq 'NO_CHANGE_JUSTIFIED') {
        return [ordered]@{ compliant = $true; verdict = 'NO_CHANGE_JUSTIFIED'; changeClass = $cc.class; changedFiles = @(); violations = @() }
    }

    $declared = @($c.declaredScope | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $grants   = @($c.protectedPathGrants | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    $unrestricted   = ($grants -contains 'unrestrictedScope')
    # H3-05: re-validate every explicit grant against the allowlist on read too
    # (defence in depth - Get-Contract already rejects a tampered grant via the
    # contractHash recompute). A glob / root / parent grant can never authorise.
    $allow = @($cfg.contract.grantableProtectedPrefixes)
    $explicitGrants = @()
    foreach ($g in @($grants | Where-Object { $_ -ne 'unrestrictedScope' })) {
        try { $explicitGrants += (Assert-GrantAllowed -Grant $g -Allowlist $allow) } catch {
            return [ordered]@{ compliant = $false; verdict = 'POLICY_BLOCK'; changeClass = 'CHANGED'; changedFiles = @()
                violations = @("invalid protected-path grant '$g': $($_.Exception.Message)") }
        }
    }
    $protected = @($cfg.contract.protectedPaths) + @($cfg.contract.authoritativeAcceptanceGlobs)

    # H-06: empty declared scope FAILS CLOSED unless explicitly unrestricted (risk C)
    if ($declared.Count -eq 0 -and -not $unrestricted) {
        return [ordered]@{ compliant = $false; verdict = 'POLICY_BLOCK'; changeClass = 'CHANGED'; changedFiles = @($cc.changedFiles)
            violations = @("declaredScope is empty - fail closed (M-01). Use an explicit 'unrestrictedScope' grant at risk C for a genuinely unrestricted task.") }
    }

    $fkey = { param($x) ConvertTo-RelPathKey $x }
    foreach ($f in $cc.changedFiles) {
        $inScope     = $unrestricted -or (Test-RelPathUnder $f $declared)
        $isProtected = Test-RelPathUnder $f $protected
        # an unrestricted scope does NOT reach protected paths - those always need
        # their own explicit protected-path grant (#10). Grant match is EXACT
        # canonical prefix, never a glob (H3-05).
        $fk = & $fkey $f
        $isGranted = $false
        foreach ($gk in $explicitGrants) {
            if ($fk -eq $gk -or $fk.StartsWith($gk + '/', [System.StringComparison]::OrdinalIgnoreCase)) { $isGranted = $true; break }
        }

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
