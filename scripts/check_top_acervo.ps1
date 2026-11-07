Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]
$all = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

for ($i = 80; $i -lt [Math]::Min(115, $all.Count); $i++) {
    $el = $all[$i]
    $n = $el.Current.Name
    if ($n) {
        Write-Host ($i.ToString() + " | " + $el.Current.ControlType.ProgrammaticName + " | '" + $n + "'")
    }
}
