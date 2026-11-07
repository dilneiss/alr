Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Id 66444
$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$condDoc = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Document
)
$doc = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condDoc)[0]

# Procura janela da modal
$condModal = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::NameProperty,
    "Ensinar algo novo ao agente"
)
$modal = $doc.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condModal)

if ($modal -ne $null) {
    Write-Host "Modal Ensinar algo novo ao agente ESTA ABERTA!"
    $allModal = $modal.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    for ($i = 0; $i -lt $allModal.Count; $i++) {
        $el = $allModal[$i]
        $name = $el.Current.Name
        $type = $el.Current.ControlType.ProgrammaticName
        $r = $el.Current.BoundingRectangle
        if ($name) {
            Write-Host ($i.ToString() + " | " + $type + " | '" + $name + "' | Rect: " + $r.X + "," + $r.Y + "," + $r.Width + "," + $r.Height)
        }
    }
} else {
    Write-Host "Modal NAO esta aberta. Procurando botao Adicionar material..."
    $condBtn = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Button
    )
    $allBtns = $doc.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condBtn)
    foreach ($b in $allBtns) {
        if ($b.Current.Name -like "*Adicionar material*") {
            Write-Host ("Botao encontrado: " + $b.Current.Name)
            $inv = [System.Windows.Automation.InvokePattern]$b.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
            $inv.Invoke()
            Write-Host "Clicado no botao Adicionar material!"
            break
        }
    }
}
