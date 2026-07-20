@echo off
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"

powershell -NoProfile -Command "$port = 8771; if (Test-Path 'config.json') { try { $cfg = Get-Content -Raw -Encoding UTF8 'config.json' | ConvertFrom-Json; if ($cfg.port) { $port = $cfg.port } } catch {} }; if ($env:CWP_PORT) { $port = $env:CWP_PORT }; $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { Write-Host ('[run.bat] Port ' + $port + ' is in use by PID ' + $c.OwningProcess + '. Stopping it...'); Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }"

".venv\Scripts\python.exe" run.py
