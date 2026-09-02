<#
attest.ps1 - content-addressed attestations for check / review / approval / integration.
              (C-03, NM-01, NH-02, L-01)

Second-review remediation:
  * NM-01 - the integrity hash now covers kind, result, taskVersionId, runId,
    bindings AND producer provenance, payload, and findings/evidence hashes.
    Nothing security-relevant is "advisory".
  * NH-02 - check attestations bind verificationDefinitionHash +
    effectiveInvocationHash. Changing the real verification procedure stales them.
  * C-03/#7 - Get-AttestationBindings uses Get-Contract, which recomputes every
    stored hash from the real spec/acceptance/profile and throws on tamper.
  * freshness requires the EXACT (kind,result) pair and "latest authoritative
    result" semantics: a later REQUEST_CHANGES / FAIL for the same lineage
    invalidates an earlier APPROVE / PASS.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'contract.ps1')
. (Join-Path $PSScriptRoot 'verification.ps1')

$script:AttestDir = Join-Path (Get-V2Dir) 'attestations'

$script:BindingKeys = @(
    'taskVersionId','baseSHA','headSHA','treeHash','diffHash',
    'specHash','acceptanceHash','configHash','verificationProfileHash',
    'verificationDefinitionHash','contractHash'
)

$script:PositiveResults = @{ check = @('PASS'); review = @('APPROVE'); approval = @('APPROVE'); integration = @('PASS') }

function _AttestationCore {
    param($Att)
    $b = [ordered]@{}
    $bk = $(if ($Att.bindings -is [System.Collections.IDictionary]) { $Att.bindings.Keys } else { $Att.bindings.PSObject.Properties.Name })
    foreach ($k in ($bk | Sort-Object)) {
        $v = $(if ($Att.bindings -is [System.Collections.IDictionary]) { $Att.bindings[$k] } else { $Att.bindings.$k })
        $b[[string]$k] = [string]$v
    }
    # producer + payload + findings are inside the integrity envelope now (NM-01)
    $producerHash = New-ContentHash (ConvertTo-DeepString $Att.producer)
    $payloadHash  = New-ContentHash (ConvertTo-DeepString $Att.payload)
    return (New-ContentHash ([ordered]@{
        v             = 'orcivo.orchestration.v2.attestation-core/2'
        attestationId = [string]$Att.attestationId
        kind          = [string]$Att.kind
        taskVersionId = [string]$Att.taskVersionId
        runId         = [string]$Att.runId
        result        = [string]$Att.result
        bindings      = $b
        producerHash  = $producerHash
        payloadHash   = $payloadHash
    }))
}

function Get-AttestationBindings {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$WorktreeDir,
        [Parameter(Mandatory)][string]$BaseSha,
        [Parameter(Mandatory)][string]$HeadSha
    )
    $c = Get-Contract $TaskVersionId -AllowConfigDrift   # binding-level configHash catches drift
    return [ordered]@{
        taskVersionId              = $TaskVersionId
        baseSHA                    = $BaseSha
        headSHA                    = $HeadSha
        treeHash                   = (Get-GitTreeHash -Dir $WorktreeDir -Ref $HeadSha)
        diffHash                   = (Get-GitDiffHash -Dir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha)
        specHash                   = $c.specHash
        acceptanceHash             = $c.acceptanceHash
        configHash                 = (New-FileHash (Join-Path (Get-V2Dir) 'config.v2.json'))
        verificationProfileHash    = $c.verificationProfileHash
        verificationDefinitionHash = $c.verificationDefinitionHash
        contractHash               = $c.contractHash
    }
}

function New-Attestation {
    param(
        [Parameter(Mandatory)][ValidateSet('check','review','approval','integration')][string]$Kind,
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][hashtable]$Bindings,
        [Parameter(Mandatory)][ValidateSet('PASS','FAIL','APPROVE','REQUEST_CHANGES','HUMAN_REVIEW_REQUIRED','INCOMPLETE_REVIEW')][string]$Result,
        [hashtable]$Payload = @{},
        [hashtable]$ProducerMeta = @{}
    )
    foreach ($k in $script:BindingKeys) {
        if (-not $Bindings.Contains($k)) { throw "v2 attest C-03: binding '$k' missing" }
    }
    $att = [ordered]@{
        schemaVersion = 'orcivo.orchestration.v2.attestation/2'
        attestationId = (New-AttestId)
        kind          = $Kind
        taskVersionId = $TaskVersionId
        runId         = $RunId
        result        = $Result
        createdAt     = (Get-Date).ToUniversalTime().ToString('o')
        bindings      = ([ordered]@{} + $Bindings)
        producer      = ([ordered]@{} + $ProducerMeta)
        payload       = ([ordered]@{} + $Payload)
        holder        = (Get-ProcessIdentity)
    }
    $att.attestationHash = _AttestationCore $att

    $dir = Join-Path $script:AttestDir $TaskVersionId
    $path = Join-Path $dir "$Kind-$($att.attestationId).json"
    Write-V2JsonCanonical $path $att
    Write-V2Log "attest: $Kind $Result for $($TaskVersionId.Substring(0,12)) run $($RunId.Substring(0,10)) head $($Bindings.headSHA.Substring(0,10))"
    return $att
}

function Get-Attestations {
    param([string]$TaskVersionId, [string]$Kind = '')
    $dir = Join-Path $script:AttestDir $TaskVersionId
    if (-not (Test-Path $dir)) { return @() }
    $filter = $(if ($Kind) { "$Kind-*.json" } else { '*.json' })
    return @(Get-ChildItem $dir -Filter $filter | Sort-Object Name | ForEach-Object { Read-V2Json $_.FullName })
}

# recompute bindings NOW and compare to what the attestation claims
function Test-AttestationFresh {
    param(
        [Parameter(Mandatory)]$Attestation,
        [Parameter(Mandatory)][string]$WorktreeDir,
        [Parameter(Mandatory)][string]$BaseSha,
        [Parameter(Mandatory)][string]$HeadSha
    )
    $now = Get-AttestationBindings -TaskVersionId $Attestation.taskVersionId -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha
    $drift = @()
    foreach ($k in $script:BindingKeys) {
        if ([string]$Attestation.bindings.$k -ne [string]$now.$k) {
            $drift += "$k : attested $($Attestation.bindings.$k) != now $($now.$k)"
        }
    }
    $recomputed = _AttestationCore (_ToHashtable $Attestation)
    if ($recomputed -ne $Attestation.attestationHash) { $drift += "attestationHash mismatch (tampered - producer/payload/bindings)" }
    return [ordered]@{ fresh = ($drift.Count -eq 0); drift = @($drift) }
}

# the "latest authoritative result" for a (taskVersionId, kind, headSHA) lineage.
# a later negative attestation invalidates an earlier positive one.
function Get-LatestAuthoritative {
    param([string]$TaskVersionId, [string]$Kind, [string]$RunId, [string]$HeadSha)
    $all = @(Get-Attestations -TaskVersionId $TaskVersionId -Kind $Kind |
             Where-Object { $_.runId -eq $RunId -and [string]$_.bindings.headSHA -eq $HeadSha })
    if ($all.Count -eq 0) { return $null }
    return ($all | Sort-Object { [datetime]::Parse($_.createdAt) } | Select-Object -Last 1)
}

# C-03 / NM-01: the integrator's gate.
function Assert-IntegrationAttestations {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$RunId,
        [Parameter(Mandatory)][string]$WorktreeDir,
        [Parameter(Mandatory)][string]$BaseSha,
        [Parameter(Mandatory)][string]$HeadSha,
        [string[]]$RequiredKinds = @('check','review')
    )
    $problems = @()
    foreach ($kind in $RequiredKinds) {
        $pos = @($script:PositiveResults[$kind])
        $latest = Get-LatestAuthoritative -TaskVersionId $TaskVersionId -Kind $kind -RunId $RunId -HeadSha $HeadSha
        if (-not $latest) { $problems += "no $kind attestation bound to run $RunId head $($HeadSha.Substring(0,10))"; continue }
        if ($latest.result -notin $pos) {
            $problems += "latest authoritative $kind result is '$($latest.result)', not $($pos -join '/') (an earlier positive result is NOT sufficient)"
            continue
        }
        $f = Test-AttestationFresh -Attestation $latest -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha
        if (-not $f.fresh) { $problems += "$kind attestation is STALE: $($f.drift -join '; ')" }

        # H3-01: the check attestation must carry the EXACT canonical invocation of
        # the frozen verification profile. Recompute it here and compare - a
        # substituted / caller-influenced verification procedure cannot match.
        if ($kind -eq 'check') {
            $c = $null
            try { $c = Get-Contract $TaskVersionId } catch { $problems += "cannot load frozen contract to check verification authority: $($_.Exception.Message)"; continue }
            $expectInv = New-VerificationInvocationHash ([string]$c.verificationProfile)
            $gotInv    = [string]$latest.payload.effectiveInvocationHash
            if ($gotInv -ne $expectInv) {
                $problems += "check attestation effectiveInvocationHash '$gotInv' != recomputed frozen verification invocation '$expectInv' (verification procedure is not the frozen authoritative one)"
            }
            if ([string]$latest.bindings.verificationDefinitionHash -ne [string]$c.verificationDefinitionHash) {
                $problems += "check attestation verificationDefinitionHash != frozen contract"
            }
        }
    }
    return [ordered]@{ ok = ($problems.Count -eq 0); problems = @($problems) }
}
