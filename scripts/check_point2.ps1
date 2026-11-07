Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$pt = New-Object System.Windows.Point(742, 660)
$el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
Write-Host "Element at (742, 660): $($el.Current.Name) | ControlType: $($el.Current.ControlType.ProgrammaticName) | ProcessId: $($el.Current.ProcessId)"
