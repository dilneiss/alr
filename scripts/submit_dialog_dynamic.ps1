Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public class WinFindEdit {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", EntryPoint = "SendMessage", CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessageText(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam);

    [DllImport("user32.dll", EntryPoint = "SendMessage")]
    public static extern IntPtr SendMessagePtr(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    public const uint WM_SETTEXT = 0x000C;
    public const uint WM_COMMAND = 0x0111;
    public const uint WM_KEYDOWN = 0x0100;
    public const uint WM_KEYUP = 0x0101;
    public const uint VK_RETURN = 0x0D;
    public const uint BM_CLICK = 0x00F5;

    public static void SetFileAndSubmit(IntPtr hDialog, string path) {
        IntPtr hEdit = IntPtr.Zero;
        IntPtr hBtn = IntPtr.Zero;

        EnumChildWindows(hDialog, (hWnd, lParam) => {
            StringBuilder sb = new StringBuilder(256);
            GetClassName(hWnd, sb, 256);
            string cls = sb.ToString();

            StringBuilder sbT = new StringBuilder(256);
            GetWindowText(hWnd, sbT, 256);
            string txt = sbT.ToString();

            if (cls.Equals("Edit", StringComparison.OrdinalIgnoreCase)) {
                hEdit = hWnd;
            }
            if (cls.Equals("Button", StringComparison.OrdinalIgnoreCase) && txt.Contains("Abrir")) {
                hBtn = hWnd;
            }
            return true;
        }, IntPtr.Zero);

        Console.WriteLine("Found hEdit: 0x" + hEdit.ToString("X") + " | hBtn: 0x" + hBtn.ToString("X"));
        if (hEdit != IntPtr.Zero) {
            SendMessageText(hEdit, WM_SETTEXT, IntPtr.Zero, path);
            System.Threading.Thread.Sleep(200);

            SetForegroundWindow(hDialog);
            System.Threading.Thread.Sleep(100);

            if (hBtn != IntPtr.Zero) {
                SendMessagePtr(hBtn, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
                PostMessage(hBtn, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
            }
            PostMessage(hDialog, WM_COMMAND, (IntPtr)1, hBtn);
            PostMessage(hEdit, WM_KEYDOWN, (IntPtr)VK_RETURN, IntPtr.Zero);
            PostMessage(hEdit, WM_KEYUP, (IntPtr)VK_RETURN, IntPtr.Zero);
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
    $hDialog = [IntPtr]$abrirDialog.Current.NativeWindowHandle
    Write-Host "Chamando SetFileAndSubmit..."
    [WinFindEdit]::SetFileAndSubmit($hDialog, $filePath)
} else {
    Write-Host "Dialogo Abrir nao encontrado!"
}
