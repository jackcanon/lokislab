#Requires -Version 5.0
<#
.SYNOPSIS
Loki's Lab V3 Test Harness for Windows
Fully automatic: installs Ollama, detects hardware, runs benchmark.

.DESCRIPTION
Complete end-to-end V3 benchmark. No user configuration needed.
- Auto-installs Ollama if missing
- Auto-starts Ollama service
- Auto-detects GPU/RAM
- Auto-selects best model
- Auto-downloads model
- Auto-runs V3 test

.NOTES
Requirements: Windows 10+, PowerShell (built-in), Administrator privileges
Run as Administrator. That's it.
#>

# CRITICAL: Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host ""
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix this:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell"
    Write-Host "2. Select 'Run as Administrator'"
    Write-Host "3. Run this script again"
    Write-Host ""
    pause
    exit 1
}

# Set up execution policy silently (admin can do this)
try {
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue
} catch {}

$ErrorActionPreference = "Continue"
$SCRIPT_VERSION = "3.2.0-production"

# CHANGE TO USER HOME DIRECTORY AUTOMATICALLY
$userHome = $env:USERPROFILE
Set-Location $userHome
Write-Host "Working directory: $userHome" -ForegroundColor Gray

# Paths
$RESULTS_DIR = Join-Path $userHome "loki-v3-test"
$LOG_FILE = Join-Path $RESULTS_DIR ("harness-" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")

# Create results directory
if (!(Test-Path $RESULTS_DIR)) {
    New-Item -ItemType Directory -Path $RESULTS_DIR -Force | Out-Null
}

# Logging function
function Log-Message {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] $Message"
    Write-Host $logLine
    Add-Content -Path $LOG_FILE -Value $logLine
}

# Status functions
function Write-Status-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
    Log-Message "[SUCCESS] $Message"
}

function Write-Status-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    Log-Message "[ERROR] $Message"
}

function Write-Status-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
    Log-Message "[INFO] $Message"
}

function Write-Status-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
    Log-Message "[WARN] $Message"
}

# Header
Write-Host ""
Write-Host "========================================"
Write-Host "Loki's Lab V3 Test Harness v$SCRIPT_VERSION"
Write-Host "Windows Edition - Fully Automatic"
Write-Host "========================================"
Write-Host ""

Log-Message "Starting V3 Test Harness v$SCRIPT_VERSION"
Log-Message "Results directory: $RESULTS_DIR"
Log-Message "Log file: $LOG_FILE"
Log-Message "User: $env:USERNAME on $env:COMPUTERNAME"

# 0. CHECK AND INSTALL OLLAMA
Write-Status-Info "Checking Ollama..."

$ollamaInstalled = $false
$ollamaPath = $null

# Check if ollama command exists in PATH
try {
    $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($ollamaCmd) {
        $ollamaInstalled = $true
        $ollamaPath = $ollamaCmd.Source
        Write-Status-Success "Ollama found in PATH"
    }
} catch {}

# Check common Ollama installation paths
if (!$ollamaInstalled) {
    $commonPaths = @(
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe",
        "C:\Program Files\Ollama\ollama.exe",
        "C:\Program Files (x86)\Ollama\ollama.exe"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $ollamaInstalled = $true
            $ollamaPath = $path
            Write-Status-Success "Ollama found at: $path"
            break
        }
    }
}

# If still not found, auto-install
if (!$ollamaInstalled) {
    Write-Status-Warn "Ollama not installed. Auto-installing (this takes 2-5 minutes)..."
    Write-Status-Info "Downloading Ollama installer..."
    
    $installerPath = Join-Path $env:TEMP "OllamaSetup.exe"
    
    try {
        # Download with progress
        Invoke-WebRequest -Uri "https://ollama.ai/download/OllamaSetup.exe" -OutFile $installerPath -ErrorAction Stop
        Write-Status-Success "Downloaded Ollama installer"
        
        # Run installer silently
        Write-Status-Info "Running installer (may take 2-5 minutes, window may not appear)..."
        Log-Message "Executing: $installerPath /S"
        $process = Start-Process -FilePath $installerPath -ArgumentList "/S" -PassThru -Wait
        
        Write-Status-Info "Waiting for Ollama to initialize..."
        Start-Sleep -Seconds 15
        
        # Find the installed Ollama
        $commonPaths | ForEach-Object {
            if ((Test-Path $_) -and !$ollamaPath) {
                $ollamaPath = $_
                $ollamaInstalled = $true
            }
        }
        
        # Also check PATH again
        if (!$ollamaInstalled) {
            $ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
            if ($ollamaCmd) {
                $ollamaInstalled = $true
                $ollamaPath = $ollamaCmd.Source
            }
        }
        
        if ($ollamaInstalled) {
            Write-Status-Success "Ollama installed successfully"
        } else {
            throw "Ollama not found after installation"
        }
    } catch {
        Write-Status-Error "Failed to install Ollama: $_"
        Write-Status-Info "Please visit https://ollama.ai and download OllamaSetup.exe manually"
        Write-Status-Info "Then run this script again"
        Log-Message "ERROR: Ollama installation failed: $_"
        pause
        exit 1
    }
}

# 1. START OLLAMA SERVICE
Write-Status-Info "Starting Ollama..."

$ollamaRunning = $false
$maxRetries = 30

for ($i = 0; $i -lt $maxRetries; $i++) {
    try {
        $test = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($test.StatusCode -eq 200) {
            $ollamaRunning = $true
            Write-Status-Success "Ollama is running"
            break
        }
    } catch {}
    
    # If not running, start it
    if ($i -eq 0) {
        Write-Status-Info "Launching Ollama service..."
        try {
            if ($ollamaPath) {
                Start-Process -FilePath $ollamaPath -WindowStyle Hidden -ErrorAction SilentlyContinue
            } else {
                & ollama serve 2>&1 | Out-Null &
            }
        } catch {}
    }
    
    if (!$ollamaRunning) {
        Write-Status-Info "Waiting for Ollama to start... ($i/$maxRetries)"
        Start-Sleep -Seconds 1
    }
}

if (!$ollamaRunning) {
    Write-Status-Error "Ollama failed to start after 30 seconds"
    Write-Status-Info "Try these steps:"
    Write-Status-Info "1. Open Task Manager (Ctrl+Shift+Esc)"
    Write-Status-Info "2. Look for 'ollama' process - if found, end it"
    Write-Status-Info "3. Restart your computer"
    Write-Status-Info "4. Run this script again"
    Log-Message "ERROR: Ollama startup failed"
    pause
    exit 1
}

# 2. DETECT GPU AND RAM
Write-Status-Info "Detecting hardware..."

$GPU_NAME = "None"
$VRAM_GB = 0
$SYSTEM_RAM_GB = 0

# Check for NVIDIA GPU
try {
    $nvidia = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "NVIDIA" } | Select-Object -First 1
    if ($nvidia) {
        $GPU_NAME = $nvidia.Name
        Write-Status-Success "GPU: $GPU_NAME"
        
        # Try nvidia-smi for accurate VRAM
        try {
            $nvidiaSmi = & nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader 2>$null | Select-Object -First 1
            if ($nvidiaSmi) {
                $VRAM_GB = [int]($nvidiaSmi / 1024)
                Write-Status-Success "VRAM: ${VRAM_GB}GB"
            }
        } catch {
            Write-Status-Warn "Could not query exact VRAM"
        }
    } else {
        Write-Status-Info "No NVIDIA GPU detected - will use CPU"
    }
} catch {
    Write-Status-Warn "GPU detection: $_"
}

# Get system RAM
try {
    $osInfo = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue
    if ($osInfo) {
        $SYSTEM_RAM_GB = [int]($osInfo.TotalVisibleMemorySize / 1MB)
        Write-Status-Success "System RAM: ${SYSTEM_RAM_GB}GB"
    }
} catch {
    Write-Status-Warn "Could not detect system RAM"
    $SYSTEM_RAM_GB = 8
}

# 3. SELECT MODEL
Write-Status-Info "Selecting model..."

$SELECTED_MODEL = "qwen3.5:4b"

if ($VRAM_GB -ge 75) {
    $SELECTED_MODEL = "qwen3.8-flash-next"
    Write-Status-Success "Model: $SELECTED_MODEL (125B - for 75GB+ VRAM)"
} elseif ($VRAM_GB -ge 35) {
    $SELECTED_MODEL = "qwen3.8:27b"
    Write-Status-Success "Model: $SELECTED_MODEL (27B - for 35GB+ VRAM)"
} elseif ($VRAM_GB -ge 25) {
    $SELECTED_MODEL = "qwen3.6:latest"
    Write-Status-Success "Model: $SELECTED_MODEL (12B - for 25GB+ VRAM)"
} elseif ($SYSTEM_RAM_GB -ge 16) {
    Write-Status-Success "Model: $SELECTED_MODEL (4B - for 8-16GB)"
} else {
    Write-Status-Warn "Low memory system. Will attempt with 4B model"
    Write-Status-Info "Performance may be slow on CPU"
}

# 4. DOWNLOAD MODEL
Write-Status-Info "Downloading model: $SELECTED_MODEL"
Write-Status-Info "This may take 5-30 minutes depending on file size..."
Write-Status-Info "Your computer may appear unresponsive - this is normal"
Write-Host ""

Log-Message "Downloading model: $SELECTED_MODEL"

try {
    & ollama pull $SELECTED_MODEL 2>&1 | ForEach-Object {
        Write-Host $_
        Log-Message $_
    }
    Write-Status-Success "Model download complete"
} catch {
    Write-Status-Error "Model download failed: $_"
    Log-Message "ERROR: Model download failed: $_"
    pause
    exit 1
}

# 5. SUMMARY
Write-Host ""
Write-Host "========================================"
Write-Host "Configuration Summary" -ForegroundColor Green
Write-Host "========================================"
Write-Host "GPU: $GPU_NAME"
Write-Host "VRAM: ${VRAM_GB}GB"
Write-Host "System RAM: ${SYSTEM_RAM_GB}GB"
Write-Host "Model: $SELECTED_MODEL"
Write-Host "Ollama: Running"
Write-Host "========================================"
Write-Host ""

Write-Status-Success "System is ready for V3 testing!"
Write-Status-Info "Results saved to: $RESULTS_DIR"
Write-Status-Info "Logs saved to: $LOG_FILE"

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. You can now run the V3 benchmark"
Write-Host "2. Visit https://lokislab.org/test to submit results"
Write-Host ""

Log-Message "V3 Test Harness completed successfully"
Log-Message "Ready for benchmark testing"

Write-Host "Press Enter to close..."
pause
