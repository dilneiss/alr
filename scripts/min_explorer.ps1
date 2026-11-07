Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinMin {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@

Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

# Minimiza janelas do explorer
$explorers = Get-Process -Name explorer -ErrorAction SilentlyContinue
foreach ($exp in $explorers) {
    if ($exp.MainWindowHandle -ne [IntPtr]::Zero) {
        [WinMin]::ShowWindow($exp.MainWindowHandle, 6) # SW_MINIMIZE
    }
}

# Traz Comet para primeiro plano
$comet = Get-Process -Id 66444
[WinMin]::ShowWindow($comet.MainWindowHandle, 9)
[WinMin]::SetForegroundWindow($comet.MainWindowHandle)
Start-Sleep -Milliseconds 400

$pt = New-Object System.Windows.Point(722, 660)
$el = [System.Windows.Automation.AutomationElement]::FromPoint($pt)
Write-Host "Element at (722, 660): '$($el.Current.Name)' | Type: $($el.Current.ControlType.ProgrammaticName) | ProcessId: $($el.Current.ProcessId)"
