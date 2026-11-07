Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName WindowsBase

$pt = New-Object System.Windows.Point(460, 348)
$el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
Write-Host "Name: $($el.Current.Name)"
Write-Host "ProcessId: $($el.Current.ProcessId)"

$p = Get-Process -Id $el.Current.ProcessId
Write-Host "ProcessName: $($p.ProcessName)"
Write-Host "Path: $($p.Path)"
