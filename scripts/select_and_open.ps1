Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

$condAbrir = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ClassNameProperty,
    "#32770"
)
$abrirDialog = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condAbrir)

if ($abrirDialog -ne $null) {
    Write-Host "Dialogo Abrir encontrado!"
    
    # Procura o item do arquivo pelo nome
    $condItem = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty,
        "comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md"
    )
    $item = $abrirDialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condItem)
    
    if ($item -ne $null) {
        Write-Host "Item encontrado: $($item.Current.Name)"
        $sel = [System.Windows.Automation.SelectionItemPattern]$item.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
        $sel.Select()
        Write-Host "OK: Item selecionado!"
        
        Start-Sleep -Milliseconds 200
        
        # Procura o botao Abrir
        $condBtn = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::AutomationIdProperty,
            "1"
        )
        $btnAbrir = $abrirDialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condBtn)
        
        if ($btnAbrir -ne $null) {
            Write-Host "Acionando botao Abrir..."
            try {
                $inv = [System.Windows.Automation.InvokePattern]$btnAbrir.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                $inv.Invoke()
                Write-Host "OK: Botao Abrir acionado com sucesso!"
            } catch {
                Write-Host "Tentando via SendKeys ENTER..."
                $item.SetFocus()
                [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
            }
        } else {
            Write-Host "Enviando ENTER no item..."
            $item.SetFocus()
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        }
    } else {
        Write-Host "Item comissao...md nao encontrado na lista!"
    }
}
