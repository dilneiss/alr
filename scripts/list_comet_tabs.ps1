Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

# Lista todas as abas na barra de abas
$condTab = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::TabItem
)
$tabs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condTab)
Write-Host "Total de abas encontradas na barra: $($tabs.Count)"

for ($i = 0; $i -lt $tabs.Count; $i++) {
    $t = $tabs[$i]
    Write-Host "$i | TabItem: '$($t.Current.Name)'"
}
