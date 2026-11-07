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
    Write-Host "Elementos dentro do dialogo Abrir:"
    $all = $abrirDialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    for ($i = 0; $i -lt $all.Count; $i++) {
        $el = $all[$i]
        $n = $el.Current.Name
        $t = $el.Current.ControlType.ProgrammaticName
        $id = $el.Current.AutomationId
        if ($n -or $id) {
            Write-Host ($i.ToString() + " | " + $t + " | Name: '" + $n + "' | AutoId: '" + $id + "'")
        }
    }
}
