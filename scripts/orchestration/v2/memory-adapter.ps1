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

function Invoke-MemoryAdapterHook {
    param([string]$Hook, [hashtable]$Payload)
    $cfg = Get-V2Config
    $mcfg = $cfg.memoryAdapter
    if (-not $mcfg -or -not [bool]$mcfg.enabled -or -not $mcfg.script) { return @{ ok=$true; enabled=$false; reason='disabled' } }
    try {
        $scriptPath = Resolve-SafePath -Root (Get-RepoRoot) -Relative ([string]$mcfg.script)
        if (-not (Test-Path -LiteralPath $scriptPath)) { return @{ ok=$true; enabled=$true; reason='adapter unavailable; continuing' } }
        $safe = ConvertTo-MemorySafePayload $Payload
        & $scriptPath -Hook $Hook -PayloadJson (ConvertTo-CanonicalJson $safe) | Out-Null
        return @{ ok=$true; enabled=$true; reason='ok' }
    } catch {
        Write-V2Log "memory adapter '$Hook' unavailable; dispatcher continues: $($_.Exception.Message)" 'WARN'
        return @{ ok=$true; enabled=$true; reason='adapter failure ignored' }
    }
}

function memoryBootstrap { param([hashtable]$Task) return (Invoke-MemoryAdapterHook 'memoryBootstrap' @{ task=$Task }) }
function memoryCheckpoint { param([hashtable]$Task) return (Invoke-MemoryAdapterHook 'memoryCheckpoint' @{ task=$Task }) }
function memoryFinalize { param([hashtable]$Task) return (Invoke-MemoryAdapterHook 'memoryFinalize' @{ task=$Task }) }
function memoryHandoff { param([hashtable]$Task,[string]$FromProvider,[string]$ToProvider) return (Invoke-MemoryAdapterHook 'memoryHandoff' @{ task=$Task; fromProvider=$FromProvider; toProvider=$ToProvider }) }
