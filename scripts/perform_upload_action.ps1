Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;

public class NativeInput {
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

$filePath = "D:\herd\lojacelulares\docs\whatsapp-agent\15-comissoes-vendedores-tecnicos\comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md"
$cleanTitle = "Comissao sobre faturamento bruto vs comissao sobre lucro liquido no CELIT"

Write-Host "========================================================================"
Write-Host "  AUTOMACAO ALR: ENVIO DO MATERIAL PARA O ZAP MAX (COMET)               "
Write-Host "========================================================================"
Write-Host ("Arquivo: " + $filePath)
Write-Host ("Titulo:  " + $cleanTitle)

# 1. Traz janela do Comet para primeiro plano
$proc = Get-Process -Id 66444
[NativeInput]::ShowWindow($proc.MainWindowHandle, 9)
[NativeInput]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 400

$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]

$condModal = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::NameProperty,
    "Ensinar algo novo ao agente"
)
$modal = $doc.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condModal)

if ($modal -eq $null) {
    Write-Host "Erro: Modal nao encontrada!"
    exit 1
}

# 2. Localiza elementos dentro da modal
$allModal = $modal.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

$btnDocumento = $null
$editNome = $null
$btnArquivo = $null

foreach ($el in $allModal) {
    $n = $el.Current.Name
    $t = $el.Current.ControlType.ProgrammaticName
    if ($t -eq "ControlType.Button" -and $n -like "Documento*") {
        $btnDocumento = $el
    }
    if ($t -eq "ControlType.Edit" -and $n -like "*Nome do material*") {
        $editNome = $el
    }
    if ($t -eq "ControlType.Button" -and $n -like "Arquivo (opcional)*") {
        $btnArquivo = $el
    }
}

# PASSO 1: CLICAR EM DOCUMENTO
Write-Host "`n[1/3] Clicando no cartao 'Documento'..."
if ($btnDocumento -ne $null) {
    $rectDoc = $btnDocumento.Current.BoundingRectangle
    $cxDoc = [int]($rectDoc.X + ($rectDoc.Width / 2))
    $cyDoc = [int]($rectDoc.Y + ($rectDoc.Height / 2))

    # Tenta InvokePattern
    try {
        $invDoc = [System.Windows.Automation.InvokePattern]$btnDocumento.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $invDoc.Invoke()
    } catch {}

    # Clique fisico no centro do cartao Documento
    [NativeInput]::Click($cxDoc, $cyDoc)
    Write-Host ("OK: Botao 'Documento' clicado em (" + $cxDoc + ", " + $cyDoc + ")!")
} else {
    Write-Host "Erro: Botao Documento nao encontrado!"
}
Start-Sleep -Milliseconds 600

# PASSO 2: PREENCHER NOME DO MATERIAL
Write-Host "`n[2/3] Preenchendo 'Nome do material'..."
if ($editNome -ne $null) {
    $rectNome = $editNome.Current.BoundingRectangle
    $cxNome = [int]($rectNome.X + 50)
    $cyNome = [int]($rectNome.Y + ($rectNome.Height / 2))

    [NativeInput]::Click($cxNome, $cyNome)
    Start-Sleep -Milliseconds 150

    try {
        $vpNome = [System.Windows.Automation.ValuePattern]$editNome.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        $vpNome.SetValue($cleanTitle)
    } catch {}

    [System.Windows.Forms.Clipboard]::SetText($cleanTitle)
    Start-Sleep -Milliseconds 50
    [System.Windows.Forms.SendKeys]::SendWait("^a")
    Start-Sleep -Milliseconds 50
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 150
    Write-Host ("OK: Titulo preenchido: '" + $cleanTitle + "'")
} else {
    Write-Host "Erro: Campo Nome do material nao encontrado!"
}
Start-Sleep -Milliseconds 500

# PASSO 3: ANEXAR ARQUIVO
Write-Host "`n[3/3] Anexando o arquivo no campo 'Arquivo (opcional)'..."
if ($btnArquivo -ne $null) {
    $rectArq = $btnArquivo.Current.BoundingRectangle
    $cxArq = [int]($rectArq.X + 80)
    $cyArq = [int]($rectArq.Y + ($rectArq.Height / 2))

    Write-Host ("Clicando no botao Escolher arquivo em (" + $cxArq + ", " + $cyArq + ")...")
    [NativeInput]::Click($cxArq, $cyArq)

    Write-Host "Aguardando janela nativa de selecao 'Abrir'..."
    $dialog = $null
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 300
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
        Write-Host "OK: Dialogo 'Abrir' aberto!"
        [NativeInput]::SetForegroundWindow([IntPtr]$dialog.Current.NativeWindowHandle)
        Start-Sleep -Milliseconds 200

        [System.Windows.Forms.Clipboard]::SetText($filePath)
        Start-Sleep -Milliseconds 100

        [System.Windows.Forms.SendKeys]::SendWait("^v")
        Start-Sleep -Milliseconds 200
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        Start-Sleep -Milliseconds 600
        Write-Host "OK: Arquivo anexado com sucesso na modal!"
    } else {
        Write-Host "Tentando segundo clique com duplo clique..."
        [NativeInput]::Click($cxArq, $cyArq)
        Start-Sleep -Milliseconds 100
        [NativeInput]::Click($cxArq, $cyArq)
    }
} else {
    Write-Host "Erro: Botao de Arquivo nao encontrado!"
}

Start-Sleep -Milliseconds 800

# RELATORIO FINAL
Write-Host "`n========================================================================"
Write-Host "RELATORIO FINAL DO ESTADO NA TELA:"
Write-Host "========================================================================"
$allModalFinal = $modal.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
foreach ($el in $allModalFinal) {
    $n = $el.Current.Name
    $t = $el.Current.ControlType.ProgrammaticName
    if ($n -and ($n -like "*Documento*" -or $n -like "*Nome do material*" -or $n -like "*Arquivo*" -or $n -like "*Acervo*")) {
        Write-Host ("  [" + $t + "] " + $n)
    }
}

Write-Host "`nConcluido! Modal preenchida e disponivel na sua tela para conferencia."
