Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$docs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)
Write-Host "Total docs: $($docs.Count)"

$zapDoc = $null
for ($i = 0; $i -lt $docs.Count; $i++) {
    $d = $docs[$i]
    $n = $d.Current.Name
    if ($n) {
        Write-Host ($i.ToString() + " | Doc Name: '" + $n + "'")
        if ($n -like "*Zap Max*") {
            $zapDoc = $d
        }
    }
}

if ($zapDoc -ne $null) {
    Write-Host ("Zap Max Document encontrado: '" + $zapDoc.Current.Name + "'")
    $all = $zapDoc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    Write-Host ("Elementos dentro do Zap Max Doc: " + $all.Count)
    foreach ($el in $all) {
        $name = $el.Current.Name
        $type = $el.Current.ControlType.ProgrammaticName
        if ($name -and ($name -like "*Documento*" -or $name -like "*Nome*" -or $name -like "*Arquivo*" -or $name -like "*Perguntas*")) {
            Write-Host (" - [" + $type + "] '" + $name + "'")
        }
    }
}
