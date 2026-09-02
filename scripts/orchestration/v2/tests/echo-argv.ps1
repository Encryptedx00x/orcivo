# echo-argv.ps1 - prints each received argument on its own line, between markers.
# Used by the H-12 argv round-trip probe. UTF-8 stdout so non-ASCII round-trips.
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false) } catch {}
$sw = New-Object System.IO.StreamWriter([Console]::OpenStandardOutput(), (New-Object System.Text.UTF8Encoding($false)))
$sw.WriteLine('ARGV_BEGIN')
foreach ($a in $args) { $sw.WriteLine($a) }
$sw.WriteLine('ARGV_END')
$sw.Flush()
