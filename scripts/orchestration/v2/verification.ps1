<#
verification.ps1 - DECLARATIVE verification profiles.  (NH-02, H-09 partial)

Second-review remediation of NH-02: the first V2 spine hashed only a profile NAME
and accepted an arbitrary caller `CheckBlock`, so the actual verification
procedure could change without staling the attestation.

Here a profile is a fixed object in config.v2.json (`verification.profiles.<id>`).
A task names a profileId; it cannot supply commands, executables, args, cwd or
env. The frozen contract binds:

  verificationProfileHash    = sha256(profileId)               (identity)
  verificationDefinitionHash = sha256_canonical(resolved profile object)

and every check run records an effectiveInvocationHash that the check attestation
carries. Changing the profile content after freeze -> definition hash drift ->
stale attestation.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')

function Get-VerificationProfile {
    param([Parameter(Mandatory)][string]$ProfileId)
    $cfg = Get-V2Config
    $p = $cfg.verification.profiles.$ProfileId
    if (-not $p) { throw "v2 NH-02: unknown verification profile '$ProfileId' (known: $(@($cfg.verification.profiles.PSObject.Properties.Name) -join '/'))" }
    return $p
}

function New-VerificationDefinitionHash {
    param([Parameter(Mandatory)][string]$ProfileId)
    return (New-ContentHash (_ToHashtable (Get-VerificationProfile $ProfileId)))
}

# H3-01: the CANONICAL, RESULT-INDEPENDENT invocation representation of a frozen
# profile. Every field that determines what the verification procedure actually
# does is here. There is no caller-supplied scriptblock anywhere in the
# authoritative pipeline, so this hash IS the verification authority: the check
# attestation carries it and the integrator recomputes and compares it.
function Get-VerificationInvocation {
    param([Parameter(Mandatory)][string]$ProfileId)
    $p = Get-VerificationProfile $ProfileId
    $steps = @()
    $ord = 0
    foreach ($chk in @($p.checks)) {
        $ord++
        $steps += [ordered]@{
            ordinal          = $ord
            stepId           = "$($chk.id)"
            kind             = "$($chk.kind)"
            builtin          = "$($chk.builtin)"
            resolvedExecutable = "in-process:orcivo.v2.verification.$($chk.builtin)"
            argv             = @()
            cwdPolicy        = "$($p.workingDirPolicy)"
            expectedExit     = 0
        }
    }
    return [ordered]@{
        v                = 'orcivo.orchestration.v2.verification-invocation/2'
        profileId        = "$ProfileId"
        profileVersion   = [int]$p.profileVersion
        definitionHash   = (New-VerificationDefinitionHash $ProfileId)
        workingDirPolicy = "$($p.workingDirPolicy)"
        environmentPolicy = "$($p.environmentPolicy)"
        environmentAllowlistHash = (New-StringHash "$($p.environmentPolicy)")
        timeoutSec       = [int]$p.timeoutSec
        steps            = @($steps)
    }
}

function New-VerificationInvocationHash {
    param([Parameter(Mandatory)][string]$ProfileId)
    return (New-ContentHash (Get-VerificationInvocation $ProfileId))
}

function _CheckNoMergeMarkers {
    param([string]$Dir, [string[]]$ChangedFiles)
    $bad = @()
    foreach ($f in $ChangedFiles) {
        $full = Join-Path $Dir $f
        if (-not (Test-Path -LiteralPath $full)) { continue }
        $txt = ''
        try { $txt = Get-Content -Raw -LiteralPath $full -ErrorAction Stop } catch { continue }
        if ($null -eq $txt) { continue }
        if ($txt -match '(?m)^(<{7}|={7}|>{7})(\s|$)') { $bad += $f }
    }
    return [ordered]@{ id = 'no-merge-markers'; pass = ($bad.Count -eq 0); detail = $(if ($bad) { "merge markers in: $($bad -join ', ')" } else { 'none' }) }
}

function _CheckNoLargeBinary {
    param([string]$Dir, [string[]]$ChangedFiles)
    $bad = @()
    foreach ($f in $ChangedFiles) {
        $full = Join-Path $Dir $f
        if (-not (Test-Path -LiteralPath $full)) { continue }
        $len = (Get-Item -LiteralPath $full).Length
        if ($len -gt 5MB) { $bad += "$f ($([math]::Round($len/1MB,1))MB)" }
    }
    return [ordered]@{ id = 'no-large-binary'; pass = ($bad.Count -eq 0); detail = $(if ($bad) { "large files: $($bad -join ', ')" } else { 'none' }) }
}

# Run the profile's checks against the run's committed worktree state.
function Invoke-VerificationProfile {
    param(
        [Parameter(Mandatory)][string]$ProfileId,
        [Parameter(Mandatory)][string]$WorktreeDir,
        [Parameter(Mandatory)][string]$BaseSha,
        [Parameter(Mandatory)][string]$HeadSha
    )
    $profile   = Get-VerificationProfile $ProfileId
    $defHash   = New-VerificationDefinitionHash $ProfileId
    $changed   = @(Get-GitChangedFiles -Dir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha)
    $results   = @()
    foreach ($chk in @($profile.checks)) {
        switch ("$($chk.builtin)") {
            'no-merge-markers' { $results += (_CheckNoMergeMarkers -Dir $WorktreeDir -ChangedFiles $changed) }
            'no-large-binary'  { $results += (_CheckNoLargeBinary  -Dir $WorktreeDir -ChangedFiles $changed) }
            default            { $results += [ordered]@{ id = "$($chk.id)"; pass = $false; detail = "unknown builtin '$($chk.builtin)'" } }
        }
    }
    $pass = (@($results | Where-Object { -not $_.pass }).Count -eq 0)
    # H3-01: effectiveInvocationHash is the RESULT-INDEPENDENT canonical invocation
    # of the frozen profile. It cannot vary with what a caller passed in, because
    # nothing is passed in. The integrator recomputes exactly this.
    $effective = New-VerificationInvocationHash $ProfileId
    $executedIds = @($results | ForEach-Object { "$($_.id)" })
    $declaredIds = @($profile.checks | ForEach-Object { "$($_.id)" })
    if (($executedIds -join '|') -ne ($declaredIds -join '|')) {
        # the runtime did not run exactly the frozen step list, in order -> not authoritative
        $pass = $false
        $results += [ordered]@{ id = 'invocation-integrity'; pass = $false; detail = "executed {$($executedIds -join ',')} != frozen definition {$($declaredIds -join ',')}" }
    }
    return [ordered]@{
        profileId                 = "$ProfileId"
        pass                      = $pass
        checks                    = @($results)
        verificationDefinitionHash = $defHash
        effectiveInvocationHash   = $effective
    }
}
