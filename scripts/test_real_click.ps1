Add-Type @'
using System;
using System.Runtime.InteropServices;

public class WinRealClick {
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

    public static void RealClick(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(100);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(80);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
'@

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

$proc = Get-Process -Id 66444
[WinRealClick]::ShowWindow($proc.MainWindowHandle, 9)
[WinRealClick]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 400

# Clica no campo Escolher arquivo
Write-Host "Clicando com mouse real em (742, 660)..."
[WinRealClick]::RealClick(742, 660)

# Aguarda a janela Abrir
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
    Write-Host "OK: Janela Abrir apareceu com sucesso!"
} else {
    Write-Host "Janela Abrir nao apareceu."
}
