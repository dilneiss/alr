Add-Type @'
using System;
using System.Runtime.InteropServices;

public class WinConfirm {
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    public const uint WM_COMMAND = 0x0111;
    public const uint WM_KEYDOWN = 0x0100;
    public const uint WM_KEYUP = 0x0101;
    public const uint VK_RETURN = 0x0D;

    public static void Confirm(IntPtr hDialog, IntPtr hEdit) {
        SetForegroundWindow(hDialog);
        System.Threading.Thread.Sleep(100);
        // Envia Enter para o Edit box
        PostMessage(hEdit, WM_KEYDOWN, (IntPtr)VK_RETURN, IntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        PostMessage(hEdit, WM_KEYUP, (IntPtr)VK_RETURN, IntPtr.Zero);
        System.Threading.Thread.Sleep(200);
        // Envia WM_COMMAND com ID 1 (IDOK) para o Dialog
        PostMessage(hDialog, WM_COMMAND, (IntPtr)1, IntPtr.Zero);
    }
}
'@

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$condAbrir = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ClassNameProperty,
    "#32770"
)
$abrirDialog = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condAbrir)

if ($abrirDialog -ne $null) {
    $hDialog = [IntPtr]$abrirDialog.Current.NativeWindowHandle
    Write-Host "Enviando confirmacao para o dialogo 0x$($hDialog.ToString('X'))..."
    $hEdit = [IntPtr]0x2700CCA
    [WinConfirm]::Confirm($hDialog, $hEdit)
}
