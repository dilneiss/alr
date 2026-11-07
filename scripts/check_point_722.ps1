Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$pt = New-Object System.Windows.Point(722, 660)
$el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
Write-Host "Element at (722, 660): '$($el.Current.Name)' | Type: $($el.Current.ControlType.ProgrammaticName)"
