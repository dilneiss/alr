Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$condProc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ProcessIdProperty,
    85604
)
$elements = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
    [System.Windows.Automation.TreeScope]::Children,
    $condProc
)

Write-Host "Janelas do PID 85604: $($elements.Count)"
foreach ($el in $elements) {
    Write-Host "Janela: '$($el.Current.Name)' | Class: $($el.Current.ClassName) | Rect: $($el.Current.BoundingRectangle)"
    
    $all = $el.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    for ($i = 0; $i -lt [Math]::Min(15, $all.Count); $i++) {
        $c = $all[$i]
        Write-Host " - [$($c.Current.ControlType.ProgrammaticName)] '$($c.Current.Name)'"
    }
}
