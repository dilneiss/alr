Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;

public class WinDirect {
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    public const uint WM_LBUTTONDOWN = 0x0201;
    public const uint WM_LBUTTONUP = 0x0202;
    public const uint WM_MOUSEMOVE = 0x0200;
    public const uint MK_LBUTTON = 0x0001;

    public static void ClickHwnd(IntPtr hWnd, int x, int y) {
        IntPtr lParam = (IntPtr)((y << 16) | (x & 0xFFFF));
        PostMessage(hWnd, WM_MOUSEMOVE, IntPtr.Zero, lParam);
        System.Threading.Thread.Sleep(50);
        PostMessage(hWnd, WM_LBUTTONDOWN, (IntPtr)MK_LBUTTON, lParam);
        System.Threading.Thread.Sleep(80);
        PostMessage(hWnd, WM_LBUTTONUP, IntPtr.Zero, lParam);
    }
}
'@

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

$filePath = "D:\herd\lojacelulares\docs\whatsapp-agent\15-comissoes-vendedores-tecnicos\comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md"
$cleanTitle = "Comissão sobre faturamento bruto vs comissão sobre lucro líquido no CELIT"

$proc = Get-Process -Id 66444
[WinDirect]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 200

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
    if ($el.Current.Name -like "*Nome do material*") {
        $editNome = $el
        break
    }
}

if ($editNome -ne $null) {
    Write-Host "Preenchendo Nome do material..."
    try {
        $vp = [System.Windows.Automation.ValuePattern]$editNome.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        $vp.SetValue($cleanTitle)
        Write-Host "OK: Nome preenchido via ValuePattern!"
    } catch {
        Write-Host "Falha no ValuePattern"
    }
}

# 2. Clica no botao de arquivo
$btnFile = $null
foreach ($el in $allInDoc) {
    if ($el.Current.Name -like "Arquivo (opcional):*") {
        $btnFile = $el
        break
    }
}

if ($btnFile -ne $null) {
    $rect = $btnFile.Current.BoundingRectangle
    # Clica dentro da área 'Escolher arquivo' (esquerda do botão)
    $clickX = [int]($rect.X + 80)
    $clickY = [int]($rect.Y + ($rect.Height / 2))
    
    # Coordenadas relativas ao RenderWidgetHostHWND (Left=5, Top=126)
    $clientX = $clickX - 5
    $clientY = $clickY - 126
    
    Write-Host "Clicando no botao de arquivo em tela ($clickX, $clickY) / cliente ($clientX, $clientY)..."
    
    # Encontra HWND do RenderWidgetHost
    $hwnd = [IntPtr]0x1190E20
    [WinDirect]::ClickHwnd($hwnd, $clientX, $clientY)
    
    # Aguarda a janela Abrir aparecer
    Write-Host "Aguardando janela 'Abrir'..."
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
        Write-Host "OK: Janela de dialogo Abrir detectada!"
        [WinDirect]::SetForegroundWindow([IntPtr]$dialog.Current.NativeWindowHandle)
        Start-Sleep -Milliseconds 300
        
        # Encontra o campo de texto do nome do arquivo
        $condEdit = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Edit
        )
        $editFile = $dialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condEdit)
        if ($editFile -ne $null) {
            $vpFile = [System.Windows.Automation.ValuePattern]$editFile.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            $vpFile.SetValue($filePath)
            Write-Host "OK: Caminho inserido no campo de texto!"
            Start-Sleep -Milliseconds 300
            
            # Clica no botao Abrir do dialogo
            $condBtn = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::NameProperty,
                "Abrir"
            )
            $btnAbrir = $dialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condBtn)
            if ($btnAbrir -ne $null) {
                $inv = [System.Windows.Automation.InvokePattern]$btnAbrir.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                $inv.Invoke()
                Write-Host "OK: Botao Abrir clicado!"
            } else {
                [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
            }
        }
    } else {
        Write-Host "Janela Abrir nao apareceu pelo PostMessage."
    }
}

Start-Sleep -Milliseconds 600

# Verifica estado do botao de arquivo
$allInDoc2 = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
foreach ($el in $allInDoc2) {
    if ($el.Current.Name -like "Arquivo (opcional)*") {
        Write-Host "Novo nome do botao Arquivo: $($el.Current.Name)"
    }
}
