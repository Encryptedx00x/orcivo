<# Optional ai-memory seam. Memory is auxiliary and failures never block dispatch. #>
. (Join-Path $PSScriptRoot 'lib-v2.ps1')

function ConvertTo-MemorySafePayload {
    param($Value)
    if ($null -eq $Value) { return $null }
    if ($Value -is [System.Collections.IDictionary]) {
        $out = [ordered]@{}
        foreach ($key in $Value.Keys) {
            $k = [string]$key
            if ($k -match '(?i)(env|token|secret|password|credential|chain.?of.?thought|reasoning|thinking|transcript|rawoutput|messages|history)') { continue }
            $out[$k] = ConvertTo-MemorySafePayload $Value[$key]
        }
        return $out
    }
    if ($Value -is [System.Management.Automation.PSCustomObject]) { return (ConvertTo-MemorySafePayload (_ToHashtable $Value)) }
    if ($Value -is [System.Collections.IEnumerable] -and $Value -isnot [string]) { return @($Value | ForEach-Object { ConvertTo-MemorySafePayload $_ }) }
    return (Protect-ArtifactText ([string]$Value))
}

# Logical project identity: resolved ONCE from the authority config, never from a
# working-directory basename. Every hook payload carries it explicitly so the
# adapter (and ai-memory) always scope to the same logical project for the repo
# root, a task clone, a worktree, and the implementer/reviewer/continuation
# workspaces alike.
function Get-LogicalProjectId {
    if ($env:ORCIVO_MEMORY_PROJECT) { return [string]$env:ORCIVO_MEMORY_PROJECT }
    try { $p = (Get-AuthorityV2Config).memoryAdapter.project } catch { $p = $null }
    if ($p) { return [string]$p }
    return 'orcivo'
}

function Invoke-MemoryAdapterHook {
    param([string]$Hook, [hashtable]$Payload)
    $mcfg = $null
    try { $mcfg = (Get-AuthorityV2Config).memoryAdapter } catch { $mcfg = $null }
    if (-not $mcfg -or -not [bool]$mcfg.enabled -or -not $mcfg.script) { return @{ ok=$true; enabled=$false; reason='disabled' } }
    try {
        # The adapter is orchestration code: resolve it against the authority repo
        # (where these scripts physically live), never against a task workspace or
        # disposable fixture - a task can never swap the adapter script.
        $scriptPath = Resolve-SafePath -Root (Get-AuthorityRoot) -Relative ([string]$mcfg.script)
        if (-not (Test-Path -LiteralPath $scriptPath)) { return @{ ok=$true; enabled=$true; reason='adapter unavailable; continuing' } }
        if (-not $Payload.ContainsKey('logicalProjectId')) { $Payload['logicalProjectId'] = (Get-LogicalProjectId) }
        $safe = ConvertTo-MemorySafePayload $Payload
        & $scriptPath -Hook $Hook -PayloadJson (ConvertTo-CanonicalJson $safe) | Out-Null
        return @{ ok=$true; enabled=$true; reason='ok'; logicalProjectId=[string]$Payload['logicalProjectId'] }
    } catch {
        Write-V2Log "memory adapter '$Hook' unavailable; dispatcher continues: $($_.Exception.Message)" 'WARN'
        return @{ ok=$true; enabled=$true; reason='adapter failure ignored' }
    }
}

function memoryBootstrap { param([hashtable]$Task,[string]$LogicalProjectId='') return (Invoke-MemoryAdapterHook 'memoryBootstrap' @{ task=$Task; logicalProjectId=$(if($LogicalProjectId){$LogicalProjectId}else{Get-LogicalProjectId}) }) }
function memoryCheckpoint { param([hashtable]$Task,[string]$LogicalProjectId='') return (Invoke-MemoryAdapterHook 'memoryCheckpoint' @{ task=$Task; logicalProjectId=$(if($LogicalProjectId){$LogicalProjectId}else{Get-LogicalProjectId}) }) }
function memoryFinalize { param([hashtable]$Task,[string]$LogicalProjectId='') return (Invoke-MemoryAdapterHook 'memoryFinalize' @{ task=$Task; logicalProjectId=$(if($LogicalProjectId){$LogicalProjectId}else{Get-LogicalProjectId}) }) }
function memoryHandoff { param([hashtable]$Task,[string]$FromProvider,[string]$ToProvider,[string]$LogicalProjectId='') return (Invoke-MemoryAdapterHook 'memoryHandoff' @{ task=$Task; fromProvider=$FromProvider; toProvider=$ToProvider; logicalProjectId=$(if($LogicalProjectId){$LogicalProjectId}else{Get-LogicalProjectId}) }) }
