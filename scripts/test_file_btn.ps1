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

$btnFile = $null
foreach ($el in $allInDoc) {
    if ($el.Current.ControlType.ProgrammaticName -eq "ControlType.Button" -and $el.Current.Name -like "Arquivo (opcional)*") {
        $btnFile = $el
        break
    }
}

if ($btnFile -ne $null) {
    Write-Host "Botao de Arquivo encontrado: $($btnFile.Current.Name)"
    $patterns = $btnFile.GetSupportedPatterns()
    foreach ($p in $patterns) {
        Write-Host " - Pattern: $($p.ProgrammaticName)"
    }
} else {
    Write-Host "Botao de Arquivo nao encontrado!"
}
