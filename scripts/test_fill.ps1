Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

$filePath = "D:\herd\lojacelulares\docs\whatsapp-agent\15-comissoes-vendedores-tecnicos\comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md"
$cleanTitle = "Comissao sobre faturamento bruto vs comissao sobre lucro liquido no CELIT"

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]
$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

# 1. Preenche Nome do material
$editNome = $null
foreach ($el in $allInDoc) {
    if ($el.Current.ControlType.ProgrammaticName -eq "ControlType.Edit" -and $el.Current.Name -like "*Nome do material*") {
        $editNome = $el
        break
    }
}

if ($editNome -ne $null) {
    Write-Host "Preenchendo Nome do material..."
    $vp = $null
    try {
        $vp = $editNome.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    } catch {
        $vp = $null
    }
    
    if ($vp -ne $null) {
        $vp.SetValue($cleanTitle)
        Write-Host "OK: Nome do material preenchido via ValuePattern!"
    } else {
        Write-Host "ValuePattern nao suportado, tentando Focus e SendKeys..."
        $editNome.SetFocus()
        [System.Windows.Forms.SendKeys]::SendWait("^a")
        [System.Windows.Forms.SendKeys]::SendWait("{BACKSPACE}")
        [System.Windows.Forms.SendKeys]::SendWait($cleanTitle)
        Write-Host "OK: Nome do material preenchido via SendKeys!"
    }
} else {
    Write-Host "Edit Nome do material nao encontrado!"
}

# 2. Localiza botao de Arquivo
$btnArquivo = $null
foreach ($el in $allInDoc) {
    if ($el.Current.ControlType.ProgrammaticName -eq "ControlType.Button" -and $el.Current.Name -like "*Arquivo*") {
        $btnArquivo = $el
        break
    }
}

if ($btnArquivo -ne $null) {
    $n = $btnArquivo.Current.Name
    Write-Host "Botao de Arquivo encontrado: $n"
} else {
    Write-Host "Botao de Arquivo nao encontrado!"
}
