Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$condAbrir = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ClassNameProperty,
    "#32770"
)
$abrirDialog = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condAbrir)
if ($abrirDialog -ne $null) {
    Write-Host "Janela Abrir ainda existe!"
} else {
    Write-Host "Janela Abrir fechou!"
}
