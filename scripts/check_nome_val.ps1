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
    if ($el.Current.ControlType.ProgrammaticName -eq "ControlType.Edit" -and $el.Current.Name -like "*Nome do material*") {
        try {
            $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            Write-Host "ValuePattern Value: '$($vp.Current.Value)'"
        } catch {
            Write-Host "ValuePattern error: $($_.Exception.Message)"
        }
    }
}
