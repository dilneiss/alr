Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$filePath = "D:\herd\lojacelulares\docs\whatsapp-agent\15-comissoes-vendedores-tecnicos\comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md"

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
    Write-Host "Tentando ValuePattern no botao Arquivo..."
    try {
        $vp = $btnFile.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        $vp.SetValue($filePath)
        Write-Host "OK: SetValue executado!"
        Write-Host "Novo Name: $($btnFile.Current.Name)"
        Write-Host "Novo Value: $($vp.Current.Value)"
    } catch {
        Write-Host "Erro no SetValue: $($_.Exception.Message)"
    }
}
