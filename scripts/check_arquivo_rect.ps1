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
    if ($el.Current.Name -like "Arquivo (opcional)*") {
        $r = $el.Current.BoundingRectangle
        Write-Host "Arquivo Button Name: '$($el.Current.Name)'"
        Write-Host "Rect: X=$($r.X), Y=$($r.Y), Width=$($r.Width), Height=$($r.Height)"
        Write-Host "Center: X=$([int]($r.X + $r.Width/2)), Y=$([int]($r.Y + $r.Height/2))"
        
        # Children of this button
        $children = $el.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
        Write-Host "Children count: $($children.Count)"
        foreach ($c in $children) {
            Write-Host " - Child: $($c.Current.ControlType.ProgrammaticName) | '$($c.Current.Name)' | Rect: $($c.Current.BoundingRectangle)"
        }
    }
}
