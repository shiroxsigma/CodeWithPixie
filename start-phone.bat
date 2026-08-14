@echo off
rem CodeWithPixie phone launcher. Keep this file ASCII-only.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-phone.ps1" %*
if errorlevel 1 pause
