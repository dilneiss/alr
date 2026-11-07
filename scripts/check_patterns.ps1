Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing

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

if ($btnDoc) {
    $rect = $btnDoc.Current.BoundingRectangle
    Write-Host "Button Documento Rect: $($rect.X), $($rect.Y), $($rect.Width), $($rect.Height)"
    
    # Check patterns
    $patterns = $btnDoc.GetSupportedPatterns()
    Write-Host "Supported patterns: $($patterns.Count)"
    foreach ($p in $patterns) {
        Write-Host " - Pattern: $($p.ProgrammaticName)"
    }
    
    # Check point under center
    $pt = New-Object System.Windows.Point(($rect.X + 50), ($rect.Y + 20))
    $elAtPoint = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
    Write-Host "Element at point ($($pt.X), $($pt.Y)): $($elAtPoint.Current.Name) | ControlType: $($elAtPoint.Current.ControlType.ProgrammaticName)"
}
