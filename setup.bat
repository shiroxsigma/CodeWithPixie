@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [setup] Creating Python virtual environment...
  where py >nul 2>nul
  if not errorlevel 1 (
    py -3 -m venv .venv
  ) else (
    python -m venv .venv
  )
  if errorlevel 1 goto :error
)

echo [setup] Installing required packages...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto :error
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto :error

echo [setup] Complete.
exit /b 0

:error
echo [setup] Failed. Install Python 3.12 or later and try again.
exit /b 1
