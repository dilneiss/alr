Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$pt = New-Object System.Windows.Point(722, 660)
$el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)

Write-Host "Element: '$($el.Current.Name)' | Type: $($el.Current.ControlType.ProgrammaticName)"

# Walk up tree
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
$curr = $el
while ($curr -ne $null) {
    Write-Host " -> Parent: '$($curr.Current.Name)' | Type: $($curr.Current.ControlType.ProgrammaticName) | Class: $($curr.Current.ClassName) | Rect: $($curr.Current.BoundingRectangle)"
    $curr = $walker.GetParent($curr)
}
