Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinUtil2 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;

    public static void Click(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(80);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
'@

Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
[WinUtil2]::ShowWindow($proc.MainWindowHandle, 3) # SW_MAXIMIZE
[WinUtil2]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 500

$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]
$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

# Procura o botao de Arquivo
$btnArq = $null
foreach ($el in $allInDoc) {
    if ($el.Current.Name -like "Arquivo (opcional):*") {
        $btnArq = $el
        break
    }
}

if ($btnArq) {
    $r = $btnArq.Current.BoundingRectangle
    Write-Host "Botao de Arquivo na tela: X=$($r.X), Y=$($r.Y), W=$($r.Width), H=$($r.Height)"
    
    # Ponto de clique dentro de Escolher arquivo
    $cx = [int]($r.X + 70)
    $cy = [int]($r.Y + ($r.Height / 2))
    Write-Host "Clicando em ($cx, $cy)..."
    [WinUtil2]::Click($cx, $cy)
}
