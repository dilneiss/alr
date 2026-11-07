Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$condWin = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Window
)
$windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
    [System.Windows.Automation.TreeScope]::Children,
    $condWin
)

Write-Host "Janelas abertas:"
foreach ($w in $windows) {
    $n = $w.Current.Name
    if ($n) {
        Write-Host " - '$n' | ProcessId: $($w.Current.ProcessId)"
    }
}
