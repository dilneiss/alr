Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WinDialogHelper {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetDlgCtrlID(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam);

    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    public const uint WM_SETTEXT = 0x000C;
    public const uint BM_CLICK = 0x00F5;

    public static void InspectAndSelect(IntPtr hDialog, string path) {
        IntPtr hEdit = IntPtr.Zero;
        IntPtr hBtnOpen = IntPtr.Zero;

        EnumChildWindows(hDialog, (hWnd, lParam) => {
            StringBuilder sbClass = new StringBuilder(256);
            GetClassName(hWnd, sbClass, 256);
            StringBuilder sbText = new StringBuilder(256);
            GetWindowText(hWnd, sbText, 256);
            int id = GetDlgCtrlID(hWnd);

            string cls = sbClass.ToString();
            string txt = sbText.ToString();

            Console.WriteLine(string.Format("Child HWND: 0x{0:X} | Class: {1} | ID: {2} | Text: '{3}'", hWnd.ToInt64(), cls, id, txt));

            if (cls.Equals("Edit", StringComparison.OrdinalIgnoreCase) && hEdit == IntPtr.Zero) {
                hEdit = hWnd;
            }
            if (cls.Equals("Button", StringComparison.OrdinalIgnoreCase) && (txt.Contains("Abrir") || txt.Contains("Open"))) {
                hBtnOpen = hWnd;
            }

            return true;
        }, IntPtr.Zero);

        if (hEdit != IntPtr.Zero) {
            Console.WriteLine("Setting text on Edit HWND: 0x" + hEdit.ToString("X"));
            SendMessage(hEdit, WM_SETTEXT, IntPtr.Zero, path);
            System.Threading.Thread.Sleep(300);

            if (hBtnOpen != IntPtr.Zero) {
                Console.WriteLine("Clicking Open Button HWND: 0x" + hBtnOpen.ToString("X"));
                SendMessage(hBtnOpen, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
            }
        }
    }
}
'@

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$filePath = "D:\herd\lojacelulares\docs\whatsapp-agent\15-comissoes-vendedores-tecnicos\comissao-sobre-faturamento-bruto-vs-comissao-sobre-lucro-liquido.md"

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

$condAbrir = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ClassNameProperty,
    "#32770"
)
$abrirDialog = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condAbrir)

if ($abrirDialog -ne $null) {
    $hwndDialog = [IntPtr]$abrirDialog.Current.NativeWindowHandle
    Write-Host "Dialog HWND: 0x$($hwndDialog.ToString('X'))"
    [WinDialogHelper]::InspectAndSelect($hwndDialog, $filePath)
} else {
    Write-Host "Dialog #32770 nao encontrado!"
}
