Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinMouse {
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
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }
}
'@

$proc = Get-Process -Id 66444
[WinMouse]::ShowWindow($proc.MainWindowHandle, 9)
[WinMouse]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 300

$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]
$allInDoc = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

$docBtn = $null
foreach ($el in $allInDoc) {
    if ($el.Current.Name -like "Documento*") {
        $docBtn = $el
        break
    }
}

if ($docBtn -ne $null) {
    $rect = $docBtn.Current.BoundingRectangle
    $cx = [int]($rect.X + ($rect.Width / 2))
    $cy = [int]($rect.Y + ($rect.Height / 2))
    Write-Host "Clicando no botao Documento em ($cx, $cy)..."

    [WinMouse]::Click($cx, $cy)
    Write-Host "OK: Clique executado em ($cx, $cy)!"
} else {
    Write-Host "Botao Documento nao encontrado!"
}

Start-Sleep -Milliseconds 800

$allInDoc2 = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
Write-Host "`nElementos apos clique em Documento:"
for ($i = 0; $i -lt $allInDoc2.Count; $i++) {
    $el = $allInDoc2[$i]
    $r = $el.Current.BoundingRectangle
    Write-Host "$i | [$($el.Current.ControlType.ProgrammaticName)] Name: '$($el.Current.Name)' | Rect: $($r.X),$($r.Y),$($r.Width),$($r.Height)"
}
