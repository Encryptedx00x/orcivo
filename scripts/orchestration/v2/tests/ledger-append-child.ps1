# ledger-append-child.ps1 - one concurrent ledger writer for the C-01 race test.
# Waits on the barrier, then tries a single legal append. The ledger lease
# serialises select+validate+append+seal, so at most one writer lands each seq.
param(
    [Parameter(Mandatory)][string]$Tvid,
    [Parameter(Mandatory)][string]$Barrier
)
$ErrorActionPreference = 'Stop'
$V2 = Split-Path -Parent $PSScriptRoot
. (Join-Path $V2 'lib-v2.ps1')
. (Join-Path $V2 'lease.ps1')
. (Join-Path $V2 'ledger.ps1')
$deadline = (Get-Date).AddSeconds(25)
while (-not (Test-Path $Barrier) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 3 }
Start-Sleep -Milliseconds (Get-Random -Maximum 40)
try {
    $st = Get-LedgerState $Tvid
    # everyone races to append a dispatch from READY; only one legal transition wins per seq,
    # the rest either advance the state further or get a benign illegal-transition throw.
    $to = switch ($st.state) {
        'READY'      { 'DISPATCHED' }
        'DISPATCHED' { 'RUNNING' }
        'RUNNING'    { 'CHECKING' }
        'CHECKING'   { 'REVIEWING' }
        default      { $null }
    }
    if ($to) {
        Add-LedgerEvent -TaskVersionId $Tvid -Event "race-$to" -ToState $to -RunId (New-RunId) | Out-Null
        Write-Output "OK $to"
    } else {
        Write-Output "SKIP $($st.state)"
    }
} catch {
    if ($_.Exception.Message -match 'illegal transition|terminal state') { Write-Output "SKIP $($_.Exception.Message.Substring(0,40))" }
    else { Write-Output "ERR $($_.Exception.Message)" }
}
