Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

$condTab = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::TabItem
)
$tabs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condTab)

$selectedTab = $null
for ($i = 0; $i -lt $tabs.Count; $i++) {
    $t = $tabs[$i]
    if ($t.Current.Name -like "*Zap Max*") {
        Write-Host ("Encontrada aba Zap Max no indice " + $i + ": " + $t.Current.Name)
        $selectedTab = $t
    }
}

if ($selectedTab -ne $null) {
    Write-Host ("Selecionando aba: " + $selectedTab.Current.Name)
    try {
        $sel = [System.Windows.Automation.SelectionItemPattern]$selectedTab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
        $sel.Select()
        Write-Host "OK: Aba selecionada com sucesso via SelectionItemPattern!"
    } catch {
        Write-Host "Tentando InvokePattern..."
        $inv = [System.Windows.Automation.InvokePattern]$selectedTab.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $inv.Invoke()
    }
}

Start-Sleep -Milliseconds 600

$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$docs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)
foreach ($d in $docs) {
    Write-Host ("Documento ativo: " + $d.Current.Name)
}
