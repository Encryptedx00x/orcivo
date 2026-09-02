<#
attest.ps1 - content-addressed attestations for check / review / approval / integration.
              (C-03, L-01)

Fixes C-03: V1 check/review artifacts recorded nothing about the tree they
covered, and merge.ps1 accepted "the newest PASS/APPROVE by filename timestamp",
then ran `git add -A` to create *new* content after the review.

V2 rule: every attestation is bound to the EXACT content it covers -

    taskVersionId, baseSHA, headSHA, treeHash, diffHash,
    specHash, acceptanceHash, configHash, verificationProfileHash, contractHash

The integrator re-computes ALL of these immediately before integrating. If ANY
value differs from what the check/review attested, the attestation is STALE and
integration is refused. There is no "latest by timestamp" path.
#>

. (Join-Path $PSScriptRoot 'lib-v2.ps1')
. (Join-Path $PSScriptRoot 'contract.ps1')

$script:AttestDir = Join-Path (Get-V2Dir) 'attestations'

function _AttestationCore {
    param($Att)
    $b = [ordered]@{}
    foreach ($k in ($Att.bindings.Keys | Sort-Object)) { $b[$k] = [string]$Att.bindings.$k }
    return (New-ContentHash ([ordered]@{
        kind = [string]$Att.kind; taskVersionId = [string]$Att.taskVersionId
        runId = [string]$Att.runId; result = [string]$Att.result; bindings = $b
    }))
}

$script:BindingKeys = @(
    'taskVersionId','baseSHA','headSHA','treeHash','diffHash',
    'specHash','acceptanceHash','configHash','verificationProfileHash','contractHash'
)

# compute the binding set for a run's current committed state
function Get-AttestationBindings {
    param(
        [Parameter(Mandatory)][string]$TaskVersionId,
        [Parameter(Mandatory)][string]$WorktreeDir,
        [Parameter(Mandatory)][string]$BaseSha,
        [Parameter(Mandatory)][string]$HeadSha
    )
    $c = Get-Contract $TaskVersionId
    return [ordered]@{
        taskVersionId           = $TaskVersionId
        baseSHA                 = $BaseSha
        headSHA                 = $HeadSha
        treeHash                = (Get-GitTreeHash -Dir $WorktreeDir -Ref $HeadSha)
        diffHash                = (Get-GitDiffHash -Dir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha)
        specHash                = $c.specHash
        acceptanceHash          = $c.acceptanceHash
        configHash              = (New-FileHash (Join-Path (Get-V2Dir) 'config.v2.json'))
        verificationProfileHash = $c.verificationProfileHash
        contractHash            = $c.contractHash
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
        schemaVersion = 'orcivo.orchestration.v2.attestation/1'
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
    # the integrity hash covers ONLY the security-relevant immutable fields, all of
    # which round-trip through JSON without ambiguity. payload/producer are advisory.
    $att.attestationHash = _AttestationCore $att

    $dir = Join-Path $script:AttestDir $TaskVersionId
    $path = Join-Path $dir "$Kind-$($att.attestationId).json"
    Write-V2Json $path $att
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

# C-03: recompute the bindings NOW and compare to what the attestation claims.
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
    # also verify the attestation itself was not tampered with
    $recomputed = _AttestationCore (_ToHashtable $Attestation)
    if ($recomputed -ne $Attestation.attestationHash) { $drift += "attestationHash mismatch (tampered)" }

    return [ordered]@{ fresh = ($drift.Count -eq 0); drift = @($drift) }
}

# C-03: the integrator's gate. Every required kind must have a fresh, positive
# attestation bound to the exact commit about to be integrated.
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
        $atts = @(Get-Attestations -TaskVersionId $TaskVersionId -Kind $kind |
                  Where-Object { $_.runId -eq $RunId })
        if ($atts.Count -eq 0) { $problems += "no $kind attestation for run $RunId"; continue }
        $positive = @($atts | Where-Object { $_.result -in @('PASS','APPROVE') })
        if ($positive.Count -eq 0) { $problems += "no positive $kind attestation (results: $(@($atts | ForEach-Object { $_.result }) -join ','))"; continue }
        $anyFresh = $false
        foreach ($a in $positive) {
            $f = Test-AttestationFresh -Attestation $a -WorktreeDir $WorktreeDir -BaseSha $BaseSha -HeadSha $HeadSha
            if ($f.fresh) { $anyFresh = $true; break }
        }
        if (-not $anyFresh) { $problems += "$kind attestation is STALE - content changed after $kind (C-03)" }
    }
    return [ordered]@{ ok = ($problems.Count -eq 0); problems = @($problems) }
}
