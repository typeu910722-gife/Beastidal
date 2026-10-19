# 比斯泰德 Beastidal：Windows 環境檢查（唯讀）
#
# 只讀取 CPU、GPU、記憶體、磁碟與已安裝軟體的資訊；不安裝、不修改任何設定或檔案。
# 結果同時顯示在視窗中，並寫入「文件」資料夾的 beastidal-env-report.txt，方便回傳給開發者。
#
# 執行方式（在專案資料夾中開啟 PowerShell）：
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows-env-check.ps1
#
# 注意：此腳本在本專案的雲端開發環境中未執行過（該環境是 Linux），請在實機執行後再以結果為準。

$ErrorActionPreference = 'SilentlyContinue'
$report = New-Object System.Collections.Generic.List[string]

function Add-Line([string]$text) {
  $report.Add($text)
  Write-Host $text
}

function Add-Section([string]$title) {
  Add-Line ''
  Add-Line "== $title =="
}

function Format-Gb($bytes) {
  if ($null -eq $bytes) { return '未知' }
  return ('{0:N1} GB' -f ($bytes / 1GB))
}

Add-Line "比斯泰德 環境檢查報告  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# 1. 作業系統與處理器
Add-Section '作業系統與 CPU'
$os = Get-CimInstance Win32_OperatingSystem
Add-Line ("Windows: {0} (build {1})" -f $os.Caption, $os.BuildNumber)
Get-CimInstance Win32_Processor | ForEach-Object {
  Add-Line ("CPU: {0}｜{1} 核心／{2} 執行緒｜最高 {3} MHz" -f $_.Name.Trim(), $_.NumberOfCores, $_.NumberOfLogicalProcessors, $_.MaxClockSpeed)
}

# 2. 記憶體
Add-Section '記憶體'
$cs = Get-CimInstance Win32_ComputerSystem
Add-Line ("實體記憶體: {0}" -f (Format-Gb $cs.TotalPhysicalMemory))

# 3. 顯示卡（Win32_VideoController 的 AdapterRAM 最多只會顯示 4 GB，所以另外讀登錄檔）
Add-Section '顯示卡'
$gpuClass = 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}'
Get-CimInstance Win32_VideoController | ForEach-Object {
  $vram = $null
  foreach ($sub in Get-ChildItem $gpuClass) {
    $props = Get-ItemProperty $sub.PSPath
    if ($props.DriverDesc -eq $_.Name -and $props.'HardwareInformation.qwMemorySize') {
      $vram = [uint64]$props.'HardwareInformation.qwMemorySize'
    }
  }
  if ($null -eq $vram) { $vram = $_.AdapterRAM }
  Add-Line ("GPU: {0}｜顯示記憶體 {1}｜驅動 {2}" -f $_.Name, (Format-Gb $vram), $_.DriverVersion)
}

# 4. 磁碟
Add-Section '磁碟'
Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
  Add-Line ("{0} 總容量 {1}，可用 {2}" -f $_.DeviceID, (Format-Gb $_.Size), (Format-Gb $_.FreeSpace))
}
Get-PhysicalDisk | ForEach-Object {
  Add-Line ("實體磁碟: {0}｜類型 {1}｜{2}" -f $_.FriendlyName, $_.MediaType, (Format-Gb $_.Size))
}

# 5. 命令列工具
Add-Section '命令列工具'
foreach ($cmd in 'git', 'node', 'npm', 'python', 'blender') {
  $found = Get-Command $cmd
  if ($found) {
    $ver = (& $cmd --version 2>&1 | Select-Object -First 1)
    Add-Line ("{0}: 已安裝（{1}）｜{2}" -f $cmd, $found.Source, $ver)
  } else {
    Add-Line ("{0}: 未找到" -f $cmd)
  }
}

# 6. 已安裝的相關軟體（只列名稱與版本，不列授權碼）
Add-Section '已安裝軟體（登錄檔）'
$uninstallKeys = @(
  'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
  'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$pattern = 'Unreal|Epic Games|Blender|Git|Node\.js|Visual Studio|Windows SDK|Python|Claude|Steam'
$apps = Get-ItemProperty $uninstallKeys | Where-Object { $_.DisplayName -match $pattern } |
  Sort-Object DisplayName -Unique
if ($apps) {
  foreach ($app in $apps) { Add-Line ("{0} {1}" -f $app.DisplayName, $app.DisplayVersion) }
} else {
  Add-Line '未在登錄檔找到符合的軟體。'
}

Add-Section 'Epic Games 與 Unreal Engine 資料夾'
foreach ($p in 'C:\Program Files\Epic Games\Launcher', 'C:\Program Files\Epic Games') {
  if (Test-Path $p) {
    Add-Line ("存在: {0}" -f $p)
    Get-ChildItem $p -Directory | Where-Object { $_.Name -like 'UE_*' } | ForEach-Object {
      Add-Line ("  Unreal Engine 版本資料夾: {0}" -f $_.Name)
    }
  }
}

# 7. Claude Desktop 的本機設定（只列出伺服器名稱，不讀取其中的金鑰或指令參數）
Add-Section 'Claude Desktop（唯讀）'
$claudeConfig = Join-Path $env:APPDATA 'Claude\claude_desktop_config.json'
$claudeMsix = Get-AppxPackage -Name '*Claude*'
if ($claudeMsix) { Add-Line ("Claude Desktop 套件: {0} {1}" -f $claudeMsix.Name, $claudeMsix.Version) }
if (Test-Path $claudeConfig) {
  Add-Line ("設定檔存在: {0}" -f $claudeConfig)
  $cfg = Get-Content $claudeConfig -Raw | ConvertFrom-Json
  $names = @($cfg.mcpServers.PSObject.Properties.Name)
  if ($names.Count -gt 0) { Add-Line ("已設定的 MCP 伺服器: {0}" -f ($names -join ', ')) }
  else { Add-Line '設定檔中沒有 MCP 伺服器。' }
} else {
  Add-Line '未找到 claude_desktop_config.json（可能未安裝或尚未設定 MCP）。'
}

$reportPath = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'beastidal-env-report.txt'
$report | Out-File -FilePath $reportPath -Encoding utf8
Add-Line ''
Add-Line "報告已寫入: $reportPath"
