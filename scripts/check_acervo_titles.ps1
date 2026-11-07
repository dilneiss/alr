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

$acervoTitles = @()
for ($i = 0; $i -lt $all.Count; $i++) {
    $el = $all[$i]
    if ($el.Current.Name -eq "O agente j  sabe" -or $el.Current.Name -like "*O agente j*") {
        # O elemento anterior ou o título do card
        if ($i -gt 0) {
            $prev = $all[$i - 1].Current.Name
            $acervoTitles += $prev
        }
    }
}

Write-Host "Total de materiais encontrados no acervo na tela: $($acervoTitles.Count)"
foreach ($t in $acervoTitles) {
    Write-Host " - '$t'"
}

# Salva lista em JSON
$json = $acervoTitles | ConvertTo-Json
$json | Set-Content -Path "logs/zapmax_current_acervo_titles.json" -Encoding UTF8
