Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]
$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

$btnDoc = $null
foreach ($el in $allInDoc) {
    if ($el.Current.Name -like "Documento*") {
        $btnDoc = $el
        break
    }
}

if ($btnDoc -ne $null) {
    Write-Host "Invocando InvokePattern no botao Documento..."
    $inv = [System.Windows.Automation.InvokePattern]$btnDoc.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
    $inv.Invoke()
    Write-Host "Invoke executado com sucesso!"
}

Start-Sleep -Milliseconds 800

$allInDoc2 = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
Write-Host "`nElementos no documento apos Invoke:"
for ($i = 0; $i -lt $allInDoc2.Count; $i++) {
    $el = $allInDoc2[$i]
    $name = $el.Current.Name
    $type = $el.Current.ControlType.ProgrammaticName
    $rect = $el.Current.BoundingRectangle
    Write-Host ($i.ToString() + " | " + $type + " | Name: '" + $name + "' | Rect: " + $rect.X + "," + $rect.Y)
}
