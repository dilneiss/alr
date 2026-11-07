Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public class WinInspectEdit {
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    public static string GetText(IntPtr hWnd) {
        StringBuilder sb = new StringBuilder(512);
        GetWindowText(hWnd, sb, 512);
        return sb.ToString();
    }
}
'@

$hEdit = [IntPtr]0x19F019C
$txt = [WinInspectEdit]::GetText($hEdit)
Write-Host "Texto atual no hEdit: '$txt'"
