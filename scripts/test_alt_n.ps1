Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;

public class WinAuto2 {
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
}
'@

function Upload-SingleDocByFullPath {
    param(
        [string]$FullPath,
        [string]$CleanTitle
    )

    Write-Host "`n========================================================================"
    Write-Host ("Processando arquivo: " + (Split-Path $FullPath -Leaf))
    Write-Host ("Titulo:             " + $CleanTitle)
    Write-Host "========================================================================"

    $proc = Get-Process -Id 66444
    [WinAuto2]::ShowWindow($proc.MainWindowHandle, 9)
    [WinAuto2]::SetForegroundWindow($proc.MainWindowHandle)
    Start-Sleep -Milliseconds 300

    $root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
    $condDoc = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Document
    )
    $docs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)
    $doc = $docs[0]

    # 1. Clica no botao '+ Adicionar material'
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
        [WinAuto2]::Click($cxDoc, $cyDoc)
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
        [WinAuto2]::Click($cxNome, $cyNome)
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
    [WinAuto2]::SetForegroundWindow([IntPtr]$dialog.Current.NativeWindowHandle)
    Start-Sleep -Milliseconds 300

    # Usa Alt+N para focar diretamente o campo 'Nome do arquivo:'
    Write-Host "Focando campo de nome do arquivo com Alt+N..."
    [System.Windows.Forms.SendKeys]::SendWait("%n")
    Start-Sleep -Milliseconds 150

    # Copia o caminho completo absoluto e envia Enter
    Write-Host ("Inserindo caminho absoluto: " + $FullPath)
    [System.Windows.Forms.Clipboard]::SetText($FullPath)
    Start-Sleep -Milliseconds 50
    [System.Windows.Forms.SendKeys]::SendWait("^a^v")
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

    # Aguarda o dialogo fechar
    Write-Host "Aguardando confirmacao do arquivo no dialogo..."
    for ($w = 0; $w -lt 15; $w++) {
        Start-Sleep -Milliseconds 300
        $dCheck = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condAbrir)
        if ($dCheck -eq $null) {
            Write-Host "OK: Dialogo Abrir fechou com sucesso!"
            break
        }
    }

    Start-Sleep -Milliseconds 600

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

# Teste com caminho completo
$testFile = "D:\herd\lojacelulares\docs\whatsapp-agent\15-comissoes-vendedores-tecnicos\como-tirar-o-relatorio-e-fazer-o-fechamento-de-comissoes.md"
$testTitle = "Como tirar o relatorio analitico e fazer o fechamento de comissoes no CELIT?"

Upload-SingleDocByFullPath -FullPath $testFile -CleanTitle $testTitle
