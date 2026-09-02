# lease-race-child.ps1 - one racer for the H-05 concurrency stress test.
# On WIN it HOLDS the lease for HoldMs (a real holder stays alive during the
# contention window); on LOSE it exits immediately.
param(
    [Parameter(Mandatory)][string]$Barrier,
    [Parameter(Mandatory)][string]$Key,
    [string]$Namespace = 'scheduler',
    [int]$HoldMs = 2500
)
$ErrorActionPreference = 'Stop'
$V2 = Split-Path -Parent $PSScriptRoot
. (Join-Path $V2 'lib-v2.ps1')
. (Join-Path $V2 'lease.ps1')
$deadline = (Get-Date).AddSeconds(20)
while (-not (Test-Path $Barrier) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 3 }
try {
    $l = New-Lease -Namespace $Namespace -Key $Key
    if ($l.ok) {
        Write-Output "WON $($l.leaseId) broke=$($l.broke)"
        Start-Sleep -Milliseconds $HoldMs
        [void](Remove-Lease -Namespace $Namespace -Key $Key -LeaseId $l.leaseId)
    } else {
        Write-Output 'LOST'
    }
} catch { Write-Output "ERR $($_.Exception.Message)" }
