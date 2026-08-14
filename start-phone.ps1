param([int]$Port = 8771)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$python = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
  & (Join-Path $PSScriptRoot "setup.bat")
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $python)) {
    throw "Python環境のセットアップに失敗しました。"
  }
}

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
  Write-Host "[start-phone] Port $Port is in use by PID $($listener.OwningProcess). Stopping it..."
  Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
}

$route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
  Sort-Object RouteMetric | Select-Object -First 1
$bindHost = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "169.254.*" } |
  Select-Object -ExpandProperty IPAddress -First 1
if (-not $bindHost) { throw "LANのIPv4が見つかりません。Wi-Fi接続を確認してください。" }

$ruleName = "CodeWithPixie $Port"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
  Write-Host "Windowsファイアウォールを設定します（初回だけUACが表示されます）。"
  $command = "New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port -Profile Private | Out-Null"
  Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", $command
}

$env:CWP_HOST = $bindHost
$env:CWP_PORT = "$Port"
Write-Host "LANで待ち受けます: ${bindHost}:${Port}" -ForegroundColor Cyan
& $python -u run.py
