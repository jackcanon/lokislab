# Loki's Lab V3 Test Harness — Pre-Flight System Check (Windows PowerShell)
# Runs before the main test to catch problems early
# Windows 10+ native (no WSL2 required)

param(
    [switch]$Verbose
)

# Set up styling
$ESC = "$([char]27)"
$Green = "$ESC[32m"
$Red = "$ESC[31m"
$Yellow = "$ESC[33m"
$Blue = "$ESC[34m"
$Reset = "$ESC[0m"

$Passed = 0
$Failed = 0
$Warnings = 0

function Write-Check {
    param(
        [ValidateSet("Pass", "Fail", "Warn")]
        [string]$Status,
        [string]$Message
    )
    
    switch ($Status) {
        "Pass" {
            Write-Host "✅ $Message" -ForegroundColor Green
            $script:Passed++
        }
        "Fail" {
            Write-Host "❌ $Message" -ForegroundColor Red
            $script:Failed++
        }
        "Warn" {
            Write-Host "⚠️  $Message" -ForegroundColor Yellow
            $script:Warnings++
        }
    }
}

# Header
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Loki's Lab V3 Test — System Health Check (Windows)     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Check Windows Version
Write-Host "━━ SYSTEM INFORMATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
$OSInfo = Get-CimInstance -ClassName Win32_OperatingSystem
$OS = $OSInfo.Caption
$Build = $OSInfo.BuildNumber
Write-Host "OS: $OS (Build $Build)"

$ProcInfo = Get-CimInstance -ClassName Win32_Processor
$Arch = if ($ProcInfo.DataWidth -eq 64) { "x86_64 (64-bit)" } else { "x86 (32-bit)" }
Write-Host "Architecture: $Arch"

if ($OSInfo.Version -lt "10.0") {
    Write-Check -Status "Fail" "Windows version too old (need Windows 10+)"
}
Write-Host ""

# 2. Check RAM
Write-Host "━━ SYSTEM RESOURCES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
$MemInfo = Get-CimInstance -ClassName Win32_ComputerSystem
$TotalRamGB = [Math]::Round($MemInfo.TotalPhysicalMemory / 1GB)
Write-Host "Total RAM: ${TotalRamGB}GB"

if ($TotalRamGB -ge 24) {
    Write-Check -Status "Pass" "RAM: ${TotalRamGB}GB (ideal for qwen3.6:latest)"
} elseif ($TotalRamGB -ge 16) {
    Write-Check -Status "Pass" "RAM: ${TotalRamGB}GB (minimum for qwen3.6:latest)"
} elseif ($TotalRamGB -ge 8) {
    Write-Check -Status "Warn" "RAM: ${TotalRamGB}GB (use qwen3.5:4b instead for best performance)"
} else {
    Write-Check -Status "Fail" "RAM: ${TotalRamGB}GB (too low, need 8GB minimum)"
}
Write-Host ""

# 3. Check Disk Space
Write-Host "━━ DISK SPACE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
$HomePath = $env:USERPROFILE
$DriveLetter = $HomePath.Substring(0, 1)
$Drive = Get-PSDrive -Name $DriveLetter
$FreeSpaceGB = [Math]::Round($Drive.Free / 1GB)
Write-Host "Free space on $HomePath`: ${FreeSpaceGB}GB"

if ($FreeSpaceGB -ge 50) {
    Write-Check -Status "Pass" "Disk space: ${FreeSpaceGB}GB (sufficient for qwen3.6:latest)"
} elseif ($FreeSpaceGB -ge 30) {
    Write-Check -Status "Warn" "Disk space: ${FreeSpaceGB}GB (minimum for qwen3.6:latest)"
} else {
    Write-Check -Status "Fail" "Disk space: ${FreeSpaceGB}GB (too low, need 30GB minimum)"
}
Write-Host ""

# 4. Check Ollama Installation
Write-Host "━━ OLLAMA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Check if ollama.exe is on PATH
$OllamaPath = (Get-Command ollama -ErrorAction SilentlyContinue).Source
if ($OllamaPath) {
    $OllamaVersion = & ollama --version 2>$null
    Write-Check -Status "Pass" "Ollama installed: $OllamaVersion"
    
    # Check if Ollama service is running
    $OllamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    if ($OllamaProcess) {
        Write-Check -Status "Pass" "Ollama service is running"
    } else {
        Write-Check -Status "Warn" "Ollama is installed but NOT running."
        Write-Host "  → To start: Run 'ollama serve' in PowerShell or Command Prompt"
        Write-Host "  → OR: Look for 'Ollama' in your Start Menu and click to launch"
    }
} else {
    Write-Check -Status "Fail" "Ollama not found on PATH"
    Write-Host "  → Download from: https://ollama.ai/download/windows"
    Write-Host "  → After install, restart PowerShell and try again"
    Write-Host "  → Make sure 'Add Ollama to PATH' is checked during installation"
}
Write-Host ""

# 5. Check Python (optional, test harness uses Ollama API)
Write-Host "━━ PYTHON (OPTIONAL) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
$PythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
if ($PythonPath) {
    $PythonVersion = & python --version 2>&1
    Write-Check -Status "Pass" "$PythonVersion"
} else {
    Write-Check -Status "Warn" "Python not found (optional, test can use Ollama API directly)"
}
Write-Host ""

# 6. Check Internet Connectivity
Write-Host "━━ NETWORK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Test basic internet
try {
    $null = [System.Net.Http.HttpClient]::new().GetAsync("https://8.8.8.8")
    Write-Check -Status "Pass" "Internet connectivity: OK"
} catch {
    Write-Check -Status "Fail" "Internet connectivity: FAILED"
}

# Test Ollama Hub
try {
    $response = Invoke-WebRequest -Uri "https://ollama.ai" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Check -Status "Pass" "Ollama Hub reachable: OK"
    }
} catch {
    Write-Check -Status "Warn" "Ollama Hub unreachable (may slow down model pull)"
}
Write-Host ""

# 7. Summary
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SUMMARY                                                   ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║ ✅ Passed: $Passed" -ForegroundColor Cyan
Write-Host "║ ❌ Failed: $Failed" -ForegroundColor Cyan
Write-Host "║ ⚠️  Warnings: $Warnings" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($Failed -gt 0) {
    Write-Host "❌ SYSTEM CHECK FAILED" -ForegroundColor Red
    Write-Host "Fix the issues above and try again." -ForegroundColor Red
    exit 1
} elseif ($Warnings -gt 0) {
    Write-Host "⚠️  SYSTEM CHECK PASSED (with warnings)" -ForegroundColor Yellow
    Write-Host "You can proceed, but may experience slower performance." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Continue with test? (y/n): " -NoNewline -ForegroundColor Yellow
    $Continue = Read-Host
    if ($Continue -ne "y" -and $Continue -ne "Y") {
        exit 0
    }
} else {
    Write-Host "✅ SYSTEM CHECK PASSED" -ForegroundColor Green
    Write-Host "Your system is ready for the V3 test!" -ForegroundColor Green
}
Write-Host ""
Write-Host "Next step: Run the V3 test harness" -ForegroundColor Cyan
Write-Host "  → Download: v3_test_harness.ps1" -ForegroundColor Cyan
Write-Host "  → Run: powershell -ExecutionPolicy Bypass -File v3_test_harness.ps1" -ForegroundColor Cyan
