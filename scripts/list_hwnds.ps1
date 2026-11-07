Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class WinHwnd {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static List<string> GetChildren(IntPtr parent) {
        List<string> list = new List<string>();
        EnumChildWindows(parent, (hWnd, lParam) => {
            StringBuilder sb = new StringBuilder(256);
            GetClassName(hWnd, sb, 256);
            RECT r;
            GetWindowRect(hWnd, out r);
            list.Add(string.Format("HWND: 0x{0:X} | Class: {1} | Rect: ({2},{3},{4},{5})", hWnd.ToInt64(), sb.ToString(), r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top));
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
'@

$proc = Get-Process -Id 66444
$children = [WinHwnd]::GetChildren($proc.MainWindowHandle)
foreach ($c in $children) {
    Write-Host $c
}
