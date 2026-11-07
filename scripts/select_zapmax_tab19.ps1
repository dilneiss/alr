Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

$condTab = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::TabItem
)
$tabs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condTab)

$zapTab = $null
for ($i = 0; $i -lt $tabs.Count; $i++) {
    $t = $tabs[$i]
    if ($t.Current.Name -like "*atendimento e vendas por WhatsApp*") {
        Write-Host ("Encontrada aba Zap Max no indice " + $i + ": " + $t.Current.Name)
        $zapTab = $t
    }
}

if ($zapTab -ne $null) {
    Write-Host ("Selecionando aba: " + $zapTab.Current.Name)
    $sel = [System.Windows.Automation.SelectionItemPattern]$zapTab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
    $sel.Select()
    Write-Host "OK: Aba Zap Max selecionada!"
}

Start-Sleep -Milliseconds 800

$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$docs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)
$doc = $docs[0]
Write-Host ("Documento ativo: " + $doc.Current.Name)

$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
Write-Host "`nElementos no documento ativo:"
for ($i = 0; $i -lt $allInDoc.Count; $i++) {
    $el = $allInDoc[$i]
    $n = $el.Current.Name
    if ($n) {
        Write-Host ($i.ToString() + " | " + $el.Current.ControlType.ProgrammaticName + " | Name: '" + $n + "'")
    }
}
