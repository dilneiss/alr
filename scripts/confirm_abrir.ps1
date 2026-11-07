Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

$filePath = "D:\herd\lojacelulares\docs\whatsapp-agent\15-comissoes-vendedores-tecnicos\comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md"

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

# Procura janela Abrir dentro dos descendentes de Comet
$condAbrir = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ClassNameProperty,
    "#32770"
)
$abrirDialog = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condAbrir)

if ($abrirDialog -ne $null) {
    Write-Host ("Janela Abrir encontrada: " + $abrirDialog.Current.Name)
    
    # Procura campo Edit
    $condEdit = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit
    )
    $editBox = $abrirDialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condEdit)
    
    if ($editBox -ne $null) {
        Write-Host "Campo de arquivo encontrado!"
        try {
            $vp = $editBox.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            $vp.SetValue($filePath)
            Write-Host ("Caminho preenchido via ValuePattern: " + $filePath)
        } catch {
            Write-Host "Tentando via SendKeys..."
            $editBox.SetFocus()
            [System.Windows.Forms.Clipboard]::SetText($filePath)
            [System.Windows.Forms.SendKeys]::SendWait("^a^v")
        }
        
        Start-Sleep -Milliseconds 300
        
        # Procura botao Abrir
        $condBtn = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Button
        )
        $buttons = $abrirDialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condBtn)
        $btnConfirm = $null
        foreach ($b in $buttons) {
            $n = $b.Current.Name
            if ($n -like "*Abrir*" -or $n -like "*Open*") {
                $btnConfirm = $b
                break
            }
        }
        
        if ($btnConfirm -ne $null) {
            Write-Host ("Clicando no botao: " + $btnConfirm.Current.Name)
            $inv = $btnConfirm.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
            $inv.Invoke()
            Write-Host "OK: Botao Abrir acionado com sucesso!"
        } else {
            Write-Host "Enviando ENTER..."
            $editBox.SetFocus()
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        }
    }
} else {
    Write-Host "Janela Abrir nao encontrada como descendente direto!"
}
