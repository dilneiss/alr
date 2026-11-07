
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

 = Get-Process -Id 66444
 = [System.Windows.Automation.AutomationElement]::FromHandle(.MainWindowHandle)

 = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Button
)

 = .FindAll([System.Windows.Automation.TreeScope]::Descendants, )
Write-Host "Total buttons found in Comet window: " .Count

foreach ( in ) {
    if (.Current.Name) {
        Write-Host ("Button: " + .Current.Name + " | Class: " + .Current.ClassName)
    }
}
