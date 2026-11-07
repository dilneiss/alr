Add-Type @'
using System;
using System.Runtime.InteropServices;

public class TestClick {
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
[TestClick]::ShowWindow($proc.MainWindowHandle, 9)
[TestClick]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 400

$pt = New-Object System.Windows.Point(174, 660)
$el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
Write-Host "Element under point (174, 660): $($el.Current.Name) | Type: $($el.Current.ControlType.ProgrammaticName)"

Write-Host "Clicando em (174, 660)..."
[TestClick]::Click(174, 660)

Start-Sleep -Milliseconds 500

# Procura janela Abrir
$dialog = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
    [System.Windows.Automation.TreeScope]::Children,
    (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Abrir"))
)

if ($dialog -ne $null) {
    Write-Host "OK: Janela Abrir apareceu!"
} else {
    Write-Host "Janela Abrir nao apareceu no clique simples. Tentando com duplo clique..."
    [TestClick]::Click(174, 660)
    Start-Sleep -Milliseconds 500
    $dialog = [System.Windows.Automation.AutomationElement]::RootElement.FindFirst(
        [System.Windows.Automation.TreeScope]::Children,
        (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Abrir"))
    )
    if ($dialog -ne $null) {
        Write-Host "OK: Janela Abrir apareceu no duplo clique!"
    } else {
        Write-Host "Ainda nao apareceu."
    }
}
