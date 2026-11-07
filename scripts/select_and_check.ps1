Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName WindowsBase

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

# Seleciona aba Zap Max
$condTab = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::TabItem
)
$tabs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condTab)
foreach ($t in $tabs) {
    if ($t.Current.Name -like "*atendimento e vendas por WhatsApp*") {
        Write-Host "Aba encontrada: $($t.Current.Name)"
        $sel = [System.Windows.Automation.SelectionItemPattern]$t.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
        $sel.Select()
        Write-Host "OK: Aba Zap Max selecionada!"
        break
    }
}

Start-Sleep -Milliseconds 600

# Verifica elemento em (742, 660)
$pt = New-Object System.Windows.Point(742, 660)
$el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
Write-Host "Element at (742, 660): $($el.Current.Name) | ControlType: $($el.Current.ControlType.ProgrammaticName)"
