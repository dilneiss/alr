Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

$condTab = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::TabItem
)
$tabs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condTab)

Write-Host "Abas no Comet:"
for ($i = 0; $i -lt $tabs.Count; $i++) {
    $t = $tabs[$i]
    Write-Host ($i.ToString() + " | " + $t.Current.Name)
}
