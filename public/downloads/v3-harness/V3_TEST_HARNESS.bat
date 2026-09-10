@echo off
REM V3 Test Harness Bootstrap - Windows
REM This batch file downloads and runs the harness with zero PowerShell issues

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Loki's Lab V3 Test Harness
echo Bootstrap Loader
echo ========================================
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges
    echo.
    echo Right-click on Command Prompt and select "Run as Administrator"
    echo Then run this batch file again.
    echo.
    pause
    exit /b 1
)

echo Downloading V3 Test Harness...
cd /d %USERPROFILE%

REM Use PowerShell to download (more reliable than bitsadmin)
powershell -NoProfile -Command "try { (New-Object Net.WebClient).DownloadFile('https://lokislab.org/downloads/v3-harness/v3_test_harness_windows.ps1', 'v3_harness.ps1'); Write-Host 'Downloaded successfully' -ForegroundColor Green } catch { Write-Host 'Download failed: ' $_.Exception.Message -ForegroundColor Red; exit 1 }"

if %errorLevel% neq 0 (
    echo.
    echo ERROR: Failed to download script
    echo Try visiting https://lokislab.org/downloads/v3-harness/ manually
    pause
    exit /b 1
)

echo.
echo Running V3 Test Harness...
powershell -NoProfile -ExecutionPolicy Bypass -File "v3_harness.ps1"

pause
