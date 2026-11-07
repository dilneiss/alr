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
    Write-Host "Invocando clique no botao Arquivo..."
    
    # Dispara o Invoke em segundo plano
    $sb = {
        param($hwnd)
        Add-Type -AssemblyName UIAutomationClient
        $root = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$hwnd)
        $cond = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Button
        )
        $btns = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
        foreach ($b in $btns) {
            if ($b.Current.Name -like "Arquivo (opcional)*") {
                $p = $b.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                $p.Invoke()
                break
            }
        }
    }
    
    $job = Start-Job -ScriptBlock $sb -ArgumentList @($proc.MainWindowHandle)
    
    Write-Host "Aguardando janela de dialogo 'Abrir'..."
    $dialog = $null
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 400
        $dialog = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
            [System.Windows.Automation.TreeScope]::Children,
            (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Abrir"))
        )
        if ($dialog -ne $null) { break }
        
        $dialog = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
            [System.Windows.Automation.TreeScope]::Children,
            (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Open"))
        )
        if ($dialog -ne $null) { break }
    }
    
    if ($dialog -ne $null) {
        Write-Host "OK: Janela de dialogo encontrada!"
        
        # Procura o campo Edit
        $condEdit = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Edit
        )
        $editFile = $dialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condEdit)
        
        if ($editFile -ne $null) {
            Write-Host "Preenchendo caminho do arquivo..."
            $vp = $editFile.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            $vp.SetValue($filePath)
            Write-Host "OK: Caminho preenchido!"
            
            Start-Sleep -Milliseconds 300
            
            # Clica no botao Abrir do dialogo
            $condBtn = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::NameProperty,
                "Abrir"
            )
            $btnAbrir = $dialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condBtn)
            if ($btnAbrir -ne $null) {
                Write-Host "Clicando no botao Abrir da caixa de dialogo..."
                $invAbrir = $btnAbrir.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                $invAbrir.Invoke()
                Write-Host "OK: Arquivo selecionado e confirmado!"
            }
        }
    } else {
        Write-Host "Janela de dialogo Abrir nao encontrada!"
    }
    
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
}
