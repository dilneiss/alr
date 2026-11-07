Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

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
    Write-Host "Focando botao de arquivo e enviando SPACE..."
    $btnFile.SetFocus()
    Start-Sleep -Milliseconds 150
    
    # Inicia tarefa em background para enviar SPACE e aguardar dialogo
    $sb = {
        param($path)
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName UIAutomationClient
        
        # Envia ESPAÇO para acionar o seletor de arquivos
        [System.Windows.Forms.SendKeys]::SendWait(" ")
        
        # Aguarda a janela Abrir
        $dlg = $null
        for ($i = 0; $i -lt 15; $i++) {
            Start-Sleep -Milliseconds 300
            $dlg = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
                [System.Windows.Automation.TreeScope]::Children,
                (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Abrir"))
            )
            if ($dlg -ne $null) { break }
        }
        
        if ($dlg -ne $null) {
            Write-Output "Dialogo detectado: $($dlg.Current.Name)"
            Start-Sleep -Milliseconds 200
            [System.Windows.Forms.Clipboard]::SetText($path)
            [System.Windows.Forms.SendKeys]::SendWait("^v")
            Start-Sleep -Milliseconds 200
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
            Write-Output "Arquivo enviado no dialogo!"
        } else {
            Write-Output "Dialogo nao detectado"
        }
    }
    
    $job = Start-Job -ScriptBlock $sb -ArgumentList @($filePath)
    Wait-Job $job -Timeout 8 | Out-Null
    Receive-Job $job
    Remove-Job $job -Force
}
