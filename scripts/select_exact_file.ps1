Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinClicker {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;

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

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]
$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

# 1. Clica no botao de arquivo
$btnFile = $null
foreach ($el in $allInDoc) {
    if ($el.Current.Name -like "Arquivo (opcional):*") {
        $btnFile = $el
        break
    }
}

if ($btnFile -ne $null) {
    Write-Host "Abrindo dialogo de arquivo..."
    $inv = [System.Windows.Automation.InvokePattern]$btnFile.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
    $inv.Invoke()
    
    Start-Sleep -Milliseconds 600
    
    $condAbrir = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ClassNameProperty,
        "#32770"
    )
    $abrirDialog = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condAbrir)
    
    if ($abrirDialog -ne $null) {
        Write-Host "Dialogo Abrir aberto!"
        
        $condItem = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::NameProperty,
            "comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md"
        )
        $item = $abrirDialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condItem)
        
        if ($item -ne $null) {
            Write-Host "Item correto encontrado!"
            $rect = $item.Current.BoundingRectangle
            $cx = [int]($rect.X + 50)
            $cy = [int]($rect.Y + ($rect.Height / 2))
            
            Write-Host ("Duplo clique em (" + $cx + ", " + $cy + ")...")
            [WinClicker]::DoubleClick($cx, $cy)
            Start-Sleep -Milliseconds 500
            Write-Host "OK: Duplo clique executado no arquivo correto!"
        }
    }
}
