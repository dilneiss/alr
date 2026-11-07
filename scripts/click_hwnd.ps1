Add-Type @'
using System;
using System.Runtime.InteropServices;

public class WinDirectClick {
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    public const uint WM_LBUTTONDOWN = 0x0201;
    public const uint WM_LBUTTONUP = 0x0202;
    public const uint WM_MOUSEMOVE = 0x0200;
    public const uint MK_LBUTTON = 0x0001;

    public static void ClickHwnd(IntPtr hWnd, int x, int y) {
        IntPtr lParam = (IntPtr)((y << 16) | (x & 0xFFFF));
        SendMessage(hWnd, WM_MOUSEMOVE, IntPtr.Zero, lParam);
        System.Threading.Thread.Sleep(50);
        SendMessage(hWnd, WM_LBUTTONDOWN, (IntPtr)MK_LBUTTON, lParam);
        System.Threading.Thread.Sleep(80);
        SendMessage(hWnd, WM_LBUTTONUP, IntPtr.Zero, lParam);
    }
}
'@

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]
$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

# 1. Encontra e clica em Documento
$btnDoc = $null
foreach ($el in $allInDoc) {
    if ($el.Current.Name -like "Documento*") {
        $btnDoc = $el
        break
    }
}

if ($btnDoc -ne $null) {
    Write-Host "Invocando Documento via InvokePattern..."
    try {
        $inv = [System.Windows.Automation.InvokePattern]$btnDoc.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
        $inv.Invoke()
        Write-Host "OK: InvokePattern executado no botao Documento!"
    } catch {
        Write-Host "Erro no invoke"
    }
}

Start-Sleep -Milliseconds 600

# 2. Encontra o campo de Arquivo e tenta acionar
$allInDoc2 = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
$btnArq = $null
foreach ($el in $allInDoc2) {
    if ($el.Current.Name -like "Arquivo (opcional)*") {
        $btnArq = $el
        break
    }
}

if ($btnArq -ne $null) {
    Write-Host "OK: Botao Arquivo encontrado: $($btnArq.Current.Name)"
    $r = $btnArq.Current.BoundingRectangle
    Write-Host "Coordenadas do botao Arquivo: X=$($r.X), Y=$($r.Y), W=$($r.Width), H=$($r.Height)"
}
