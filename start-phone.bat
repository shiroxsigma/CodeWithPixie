@echo off
rem CodeWithPixie phone launcher. Keep this file ASCII-only.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" call setup.bat
if errorlevel 1 (
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-phone.ps1" %*
if errorlevel 1 pause
