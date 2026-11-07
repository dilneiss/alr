$p = Get-Process -Id 85604
Write-Host "ProcessName: $($p.ProcessName)"
Write-Host "MainWindowTitle: $($p.MainWindowTitle)"
Write-Host "Path: $($p.Path)"
