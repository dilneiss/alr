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

foreach ($el in $allInDoc) {
    if ($el.Current.Name -like "*Documento*" -or $el.Current.Name -like "*Perguntas*") {
        $r = $el.Current.BoundingRectangle
        Write-Host "Element: '$($el.Current.Name)' | Rect: $($r.X), $($r.Y), $($r.Width), $($r.Height)"
    }
}
