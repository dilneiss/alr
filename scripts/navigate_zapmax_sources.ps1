Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WinNav {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@

$proc = Get-Process -Id 66444
[WinNav]::ShowWindow($proc.MainWindowHandle, 9)
[WinNav]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 400

$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)

# 1. Seleciona aba Zap Max
$condTab = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::TabItem
)
$tabs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condTab)
foreach ($t in $tabs) {
    if ($t.Current.Name -like "*Zap Max*") {
        Write-Host "Aba encontrada: $($t.Current.Name)"
        $sel = [System.Windows.Automation.SelectionItemPattern]$t.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
        $sel.Select()
        Write-Host "OK: Aba selecionada!"
        break
    }
}
Start-Sleep -Milliseconds 500

# 2. Navega para https://crm.zapmax.org/app/ai/knowledge/sources
[System.Windows.Forms.SendKeys]::SendWait("^l")
Start-Sleep -Milliseconds 150
[System.Windows.Forms.Clipboard]::SetText("https://crm.zapmax.org/app/ai/knowledge/sources")
[System.Windows.Forms.SendKeys]::SendWait("^v{ENTER}")
Start-Sleep -Seconds 3

# 3. Verifica se a pagina carregou checando botao Adicionar material
$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]
$condBtn = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Button
)
$allBtns = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condBtn)

$foundBtn = $null
foreach ($b in $allBtns) {
    if ($b.Current.Name -like "*Adicionar material*") {
        $foundBtn = $b
        break
    }
}

if ($foundBtn -ne $null) {
    Write-Host "OK: Pagina Knowledge Sources carregada com sucesso! Botao: $($foundBtn.Current.Name)"
} else {
    Write-Host "Aviso: Botao Adicionar material nao encontrado ainda."
}
