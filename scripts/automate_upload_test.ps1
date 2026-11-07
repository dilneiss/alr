Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinApi {
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

# 1. Localiza processo do Comet e traz para o primeiro plano
$proc = Get-Process -Id 66444
[WinApi]::ShowWindow($proc.MainWindowHandle, 9)
[WinApi]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 400

$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

# 2. Garante que a aba do Zap Max esteja selecionada
$condTab = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::TabItem
)
$tabs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condTab)
for ($i = 0; $i -lt $tabs.Count; $i++) {
    $t = $tabs[$i]
    if ($t.Current.Name -like "*atendimento e vendas por WhatsApp*") {
        $sel = [System.Windows.Automation.SelectionItemPattern]$t.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
        $sel.Select()
        Write-Host "OK: Aba Zap Max selecionada na barra de abas."
        break
    }
}
Start-Sleep -Milliseconds 500

# 3. Localiza documento ativo
$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$docs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)
$doc = $docs[0]
$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

# 4. PASSO 1: CLICAR EM 'DOCUMENTO'
Write-Host "`n[Passo 1/3] Clicando na opcao 'Documento'..."
$btnDoc = $null
foreach ($el in $allInDoc) {
    if ($el.Current.ControlType.ProgrammaticName -eq "ControlType.Button" -and $el.Current.Name -like "Documento*") {
        $btnDoc = $el
        break
    }
}

if ($btnDoc -ne $null) {
    try {
        $inv = [System.Windows.Automation.InvokePattern]$btnDoc.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $inv.Invoke()
    } catch {}

    $rect = $btnDoc.Current.BoundingRectangle
    $cx = [int]($rect.X + ($rect.Width / 2))
    $cy = [int]($rect.Y + ($rect.Height / 2))
    [WinApi]::Click($cx, $cy)
    Write-Host ("OK: Clique realizado no botao 'Documento' em (" + $cx + ", " + $cy + ").")
} else {
    Write-Host "Erro: Botao Documento nao encontrado!"
}
Start-Sleep -Milliseconds 600

# 5. PASSO 2: PREENCHER 'NOME DO MATERIAL'
Write-Host "`n[Passo 2/3] Preenchendo 'Nome do material'..."
$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
$editNome = $null
foreach ($el in $allInDoc) {
    if ($el.Current.ControlType.ProgrammaticName -eq "ControlType.Edit" -and $el.Current.Name -like "*Nome do material*") {
        $editNome = $el
        break
    }
}

if ($editNome -ne $null) {
    try {
        $vp = [System.Windows.Automation.ValuePattern]$editNome.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        $vp.SetValue($cleanTitle)
    } catch {}

    $rectNome = $editNome.Current.BoundingRectangle
    $nx = [int]($rectNome.X + 20)
    $ny = [int]($rectNome.Y + 15)
    [WinApi]::Click($nx, $ny)
    Start-Sleep -Milliseconds 100

    [System.Windows.Forms.Clipboard]::SetText($cleanTitle)
    [System.Windows.Forms.SendKeys]::SendWait("^a")
    Start-Sleep -Milliseconds 50
    [System.Windows.Forms.SendKeys]::SendWait("^v")
    Start-Sleep -Milliseconds 100
    Write-Host ("OK: Nome do material preenchido com: '" + $cleanTitle + "'")
} else {
    Write-Host "Erro: Campo 'Nome do material' nao encontrado!"
}
Start-Sleep -Milliseconds 500

# 6. PASSO 3: ANEXAR ARQUIVO
Write-Host "`n[Passo 3/3] Anexando o arquivo no campo 'Arquivo (opcional)'..."
$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
$btnArquivo = $null
foreach ($el in $allInDoc) {
    if ($el.Current.ControlType.ProgrammaticName -eq "ControlType.Button" -and $el.Current.Name -like "Arquivo (opcional)*") {
        $btnArquivo = $el
        break
    }
}

if ($btnArquivo -ne $null) {
    $rectArq = $btnArquivo.Current.BoundingRectangle
    $ax = [int]($rectArq.X + 80)
    $ay = [int]($rectArq.Y + ($rectArq.Height / 2))
    
    Write-Host ("Clicando no botao de upload de arquivo em (" + $ax + ", " + $ay + ")...")
    [WinApi]::Click($ax, $ay)
    
    Write-Host "Aguardando janela nativa de selecao de arquivo 'Abrir'..."
    $dialog = $null
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
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
        Write-Host "OK: Janela de selecao de arquivo 'Abrir' detectada!"
        [WinApi]::SetForegroundWindow([IntPtr]$dialog.Current.NativeWindowHandle)
        Start-Sleep -Milliseconds 200

        [System.Windows.Forms.Clipboard]::SetText($filePath)
        Start-Sleep -Milliseconds 100
        [System.Windows.Forms.SendKeys]::SendWait("^v")
        Start-Sleep -Milliseconds 200
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        Start-Sleep -Milliseconds 500
        Write-Host "OK: Arquivo anexado com sucesso na modal!"
    } else {
        Write-Host "Aviso: Dialogo de arquivo nao abriu pelo clique inicial."
    }
} else {
    Write-Host "Erro: Botao de Arquivo nao encontrado!"
}

Start-Sleep -Milliseconds 800

# 7. Relatório Final de Verificação da Modal
Write-Host "`n========================================================================"
Write-Host "RELATORIO FINAL DO ESTADO NA TELA DO COMET:"
Write-Host "========================================================================"
$allInDocFinal = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
foreach ($el in $allInDocFinal) {
    $n = $el.Current.Name
    $t = $el.Current.ControlType.ProgrammaticName
    if ($n -and ($n -like "*Documento*" -or $n -like "*Nome do material*" -or $n -like "*Arquivo*" -or $n -like "*Acervo*")) {
        Write-Host ("  [" + $t + "] " + $n)
    }
}

Write-Host "`nConcluido! Modal preenchida e disponivel na sua tela para conferencia."
