Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)

$docs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)
$doc = $docs[0]

$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

for ($i = 0; $i -lt $allInDoc.Count; $i++) {
    $el = $allInDoc[$i]
    $r = $el.Current.BoundingRectangle
    Write-Host "$i | [$($el.Current.ControlType.ProgrammaticName)] Name: '$($el.Current.Name)' | Rect: $($r.X),$($r.Y),$($r.Width),$($r.Height)"
}
