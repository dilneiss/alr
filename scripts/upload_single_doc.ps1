Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;

public class WinAuto {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;

    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(80);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(80);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }

    public static void DoubleClick(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
'@

function Upload-ZapMaxDocument {
    param(
        [string]$FileName,
        [string]$CleanTitle
    )

    Write-Host "`n========================================================================"
    Write-Host ("Processando: " + $FileName)
    Write-Host ("Titulo:     " + $CleanTitle)
    Write-Host "========================================================================"

    $proc = Get-Process -Id 66444
    [WinAuto]::ShowWindow($proc.MainWindowHandle, 9)
    [WinAuto]::SetForegroundWindow($proc.MainWindowHandle)
    Start-Sleep -Milliseconds 300

    $root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
    $condDoc = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Document
    )
    $docs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)
    $doc = $docs[0]

    # 1. Verifica se a modal ja esta aberta, senao clica em "+ Adicionar material"
    $condModal = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty,
        "Ensinar algo novo ao agente"
    )
    $modal = $doc.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condModal)

    if ($modal -eq $null) {
        Write-Host "1. Clicando no botao '+ Adicionar material'..."
        $condBtn = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Button
        )
        $allBtns = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condBtn)
        $btnAdicionar = $null
        foreach ($b in $allBtns) {
            if ($b.Current.Name -like "*Adicionar material*") {
                $btnAdicionar = $b
                break
            }
        }
        if ($btnAdicionar -ne $null) {
            $inv = [System.Windows.Automation.InvokePattern]$btnAdicionar.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
            $inv.Invoke()
            Write-Host "OK: Botao '+ Adicionar material' acionado!"
        } else {
            throw "Botao Adicionar material nao encontrado!"
        }

        Start-Sleep -Milliseconds 1200
        $modal = $doc.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condModal)
    }

    if ($modal -eq $null) {
        throw "Modal Ensinar algo novo ao agente nao abriu!"
    }

    # 2. Localiza e clica em "Documento"
    Write-Host "2. Selecionando opcao 'Documento'..."
    $condBtn = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Button
    )
    $modalBtns = $modal.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condBtn)
    $btnDoc = $null
    foreach ($b in $modalBtns) {
        if ($b.Current.Name -like "Documento*") {
            $btnDoc = $b
            break
        }
    }

    if ($btnDoc -ne $null) {
        $inv = [System.Windows.Automation.InvokePattern]$btnDoc.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $inv.Invoke()
        
        $rDoc = $btnDoc.Current.BoundingRectangle
        $cxDoc = [int]($rDoc.X + ($rDoc.Width / 2))
        $cyDoc = [int]($rDoc.Y + ($rDoc.Height / 2))
        [WinAuto]::Click($cxDoc, $cyDoc)
        Write-Host "OK: Cartao 'Documento' clicado!"
    } else {
        throw "Botao Documento nao encontrado!"
    }
    Start-Sleep -Milliseconds 600

    # 3. Preenche Nome do material
    Write-Host "3. Preenchendo 'Nome do material'..."
    $condEdit = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit
    )
    $modalEdits = $modal.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condEdit)
    $editNome = $null
    foreach ($e in $modalEdits) {
        if ($e.Current.Name -like "*Nome do material*") {
            $editNome = $e
            break
        }
    }

    if ($editNome -ne $null) {
        $rNome = $editNome.Current.BoundingRectangle
        $cxNome = [int]($rNome.X + 50)
        $cyNome = [int]($rNome.Y + ($rNome.Height / 2))
        [WinAuto]::Click($cxNome, $cyNome)
        Start-Sleep -Milliseconds 100

        [System.Windows.Forms.Clipboard]::SetText($CleanTitle)
        Start-Sleep -Milliseconds 50
        [System.Windows.Forms.SendKeys]::SendWait("^a")
        Start-Sleep -Milliseconds 50
        [System.Windows.Forms.SendKeys]::SendWait("^v")
        Start-Sleep -Milliseconds 150
        Write-Host ("OK: Nome preenchido: '" + $CleanTitle + "'")
    } else {
        throw "Campo Nome do material nao encontrado!"
    }
    Start-Sleep -Milliseconds 400

    # 4. Clica no botao de arquivo
    Write-Host "4. Acionando selecao de arquivo..."
    $modalBtns = $modal.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condBtn)
    $btnArquivo = $null
    foreach ($b in $modalBtns) {
        if ($b.Current.Name -like "Arquivo (opcional)*") {
            $btnArquivo = $b
            break
        }
    }

    if ($btnArquivo -ne $null) {
        $invArq = [System.Windows.Automation.InvokePattern]$btnArquivo.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $invArq.Invoke()
    } else {
        throw "Botao Arquivo nao encontrado!"
    }

    # 5. Aguarda janela nativa 'Abrir'
    Write-Host "5. Aguardando dialogo Abrir..."
    $condAbrir = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ClassNameProperty,
        "#32770"
    )
    $dialog = $null
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 300
        $dialog = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condAbrir)
        if ($dialog -ne $null) { break }
    }

    if ($dialog -eq $null) {
        throw "Janela de selecao Abrir nao apareceu!"
    }

    Write-Host "OK: Dialogo Abrir detectado!"
    Start-Sleep -Milliseconds 400

    # Localiza o arquivo na lista de arquivos do dialogo
    $condItem = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty,
        $FileName
    )
    $itemFile = $dialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condItem)

    if ($itemFile -ne $null) {
        $rItem = $itemFile.Current.BoundingRectangle
        $cxItem = [int]($rItem.X + 40)
        $cyItem = [int]($rItem.Y + ($rItem.Height / 2))
        Write-Host ("Selecionando item '" + $FileName + "' com duplo clique...")
        [WinAuto]::DoubleClick($cxItem, $cyItem)
    } else {
        Write-Host "Item nao visivel na lista direta. Procurando campo de texto..."
        $editFile = $dialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condEdit)
        if ($editFile -ne $null) {
            $vp = $editFile.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            $vp.SetValue($FileName)
            Start-Sleep -Milliseconds 200
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        } else {
            throw ("Nao foi possivel localizar o arquivo " + $FileName + " no dialogo!")
        }
    }

    Start-Sleep -Milliseconds 800

    # 6. Clica em 'Adicionar ao acervo'
    Write-Host "6. Clicando em 'Adicionar ao acervo'..."
    $modalBtns = $modal.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condBtn)
    $btnEnviar = $null
    foreach ($b in $modalBtns) {
        if ($b.Current.Name -like "*Adicionar ao acervo*") {
            $btnEnviar = $b
            break
        }
    }

    if ($btnEnviar -ne $null) {
        $invEnv = [System.Windows.Automation.InvokePattern]$btnEnviar.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $invEnv.Invoke()
        Write-Host "OK: 'Adicionar ao acervo' clicado com sucesso!"
    } else {
        throw "Botao Adicionar ao acervo nao encontrado!"
    }

    # Aguarda o processamento e fechamento da modal
    Write-Host "Aguardando envio e fechamento da modal..."
    for ($wait = 0; $wait -lt 25; $wait++) {
        Start-Sleep -Milliseconds 500
        $checkModal = $doc.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condModal)
        if ($checkModal -eq $null) {
            Write-Host "OK: Modal fechada! Material enviado com sucesso."
            break
        }
    }
}

Upload-ZapMaxDocument -FileName "como-configurar-regras-de-comissao-para-vendedores-e-tecnicos.md" -CleanTitle "Como configurar regras de comissao para vendedores e tecnicos no CELIT?"
