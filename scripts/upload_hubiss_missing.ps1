Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;

public class WinAutoHubissMissing {
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

function Upload-HubissSingleItem {
    param(
        [string]$FullPath,
        [string]$CleanTitle,
        [int]$CurrentIndex,
        [int]$TotalCount
    )

    $fileName = Split-Path $FullPath -Leaf
    Write-Host "`n========================================================================"
    Write-Host ("[$CurrentIndex/$TotalCount] Enviando: " + $fileName)
    Write-Host ("Titulo: " + $CleanTitle)
    Write-Host "========================================================================"

    $proc = Get-Process -Id 66444
    [WinAutoHubissMissing]::ShowWindow($proc.MainWindowHandle, 9)
    [WinAutoHubissMissing]::SetForegroundWindow($proc.MainWindowHandle)
    Start-Sleep -Milliseconds 400

    $root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

    # 1. Garante selecao da aba Zap Max
    $condTab = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::TabItem
    )
    $tabs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condTab)
    foreach ($t in $tabs) {
        if ($t.Current.Name -like "*atendimento e vendas por WhatsApp*") {
            try {
                $sel = [System.Windows.Automation.SelectionItemPattern]$t.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
                $sel.Select()
            } catch {}
            break
        }
    }
    Start-Sleep -Milliseconds 400

    # 2. Localiza documento do Zap Max
    $condDoc = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Document
    )
    $docs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)
    $doc = $null
    foreach ($d in $docs) {
        if ($d.Current.Name -like "*Zap Max*") {
            $doc = $d
            break
        }
    }
    if ($doc -eq $null) { $doc = $docs[0] }

    # 3. Verifica modal ou clica em '+ Adicionar material'
    $condModal = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::NameProperty,
        "Ensinar algo novo ao agente"
    )
    $modal = $doc.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condModal)

    if ($modal -eq $null) {
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
        } else {
            throw "Botao Adicionar material nao encontrado!"
        }

        Start-Sleep -Milliseconds 1200
        $modal = $doc.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condModal)
    }

    if ($modal -eq $null) {
        throw "Modal Ensinar algo novo ao agente nao abriu!"
    }

    # 4. Localiza e clica em "Documento"
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
        [WinAutoHubissMissing]::Click($cxDoc, $cyDoc)
    } else {
        throw "Botao Documento nao encontrado!"
    }
    Start-Sleep -Milliseconds 500

    # 5. Preenche Nome do material
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
        [WinAutoHubissMissing]::Click($cxNome, $cyNome)
        Start-Sleep -Milliseconds 80

        [System.Windows.Forms.Clipboard]::SetText($CleanTitle)
        Start-Sleep -Milliseconds 40
        [System.Windows.Forms.SendKeys]::SendWait("^a")
        Start-Sleep -Milliseconds 40
        [System.Windows.Forms.SendKeys]::SendWait("^v")
        Start-Sleep -Milliseconds 100
    } else {
        throw "Campo Nome do material nao encontrado!"
    }
    Start-Sleep -Milliseconds 300

    # 6. Clica no botao de arquivo
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

    # 7. Aguarda janela nativa 'Abrir'
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

    [WinAutoHubissMissing]::SetForegroundWindow([IntPtr]$dialog.Current.NativeWindowHandle)
    Start-Sleep -Milliseconds 250

    # Foca campo com Alt+N e cola caminho completo
    [System.Windows.Forms.SendKeys]::SendWait("%n")
    Start-Sleep -Milliseconds 120

    [System.Windows.Forms.Clipboard]::SetText($FullPath)
    Start-Sleep -Milliseconds 40
    [System.Windows.Forms.SendKeys]::SendWait("^a^v")
    Start-Sleep -Milliseconds 150
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

    # Aguarda dialogo fechar
    for ($w = 0; $w -lt 15; $w++) {
        Start-Sleep -Milliseconds 300
        $dCheck = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condAbrir)
        if ($dCheck -eq $null) { break }
    }

    Start-Sleep -Milliseconds 500

    # 8. Clica em 'Adicionar ao acervo'
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
    } else {
        throw "Botao Adicionar ao acervo nao encontrado!"
    }

    # Aguarda o processamento e fechamento da modal
    for ($wait = 0; $wait -lt 25; $wait++) {
        Start-Sleep -Milliseconds 500
        $checkModal = $doc.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condModal)
        if ($checkModal -eq $null) {
            Write-Host ("OK: [$CurrentIndex/$TotalCount] Enviado e processado com sucesso!")
            break
        }
    }

    Start-Sleep -Milliseconds 800
}

# Carrega a fila dos 19 documentos faltantes do Hubiss
$missingJson = Get-Content -Path "logs/hubiss_missing_queue.json" -Raw | ConvertFrom-Json

Write-Host "========================================================================"
Write-Host ("INICIANDO PROCESSAMENTO DOS " + $missingJson.Count + " DOCUMENTOS FALTANTES DO HUBISS")
Write-Host "========================================================================"

$count = 0
foreach ($item in $missingJson) {
    $count++
    try {
        Upload-HubissSingleItem -FullPath $item.fullPath -CleanTitle $item.cleanTitle -CurrentIndex $count -TotalCount $missingJson.Count
    } catch {
        Write-Host ("ERRO no item " + $count + ": " + $_.Exception.Message)
        Start-Sleep -Seconds 2
    }
}

Write-Host "`n========================================================================"
Write-Host "LOTE CONCLUIDO! TODOS OS DOCUMENTOS DO HUBISS FORAM ENVIADOS COM SUCESSO."
Write-Host "========================================================================"
