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

Write-Host "Estado atual dos elementos na modal:"
for ($i = 0; $i -lt $allInDoc.Count; $i++) {
    $el = $allInDoc[$i]
    $name = $el.Current.Name
    $type = $el.Current.ControlType.ProgrammaticName
    $rect = $el.Current.BoundingRectangle
    if ($name) {
        Write-Host "$i | $type | Name: '$name'"
    }
}
