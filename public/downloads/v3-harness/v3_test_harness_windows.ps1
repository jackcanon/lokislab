#Requires -Version 5.0
<#
.SYNOPSIS
Loki's Lab V3 Test Harness for Windows
Smart GPU detection, auto-install Ollama, model selection, and V3 benchmark.

.DESCRIPTION
Automatically:
1. Installs Ollama if missing
2. Detects NVIDIA GPU VRAM and system RAM
3. Selects best model for your hardware
4. Downloads model via Ollama
5. Runs V3 test suite

.PARAMETER Model
Manually specify model (qwen3.5:4b, qwen3.6:latest, qwen3.8:27b)

.EXAMPLE
.\v3_test_harness_windows.ps1
# Auto-detect, install Ollama, and run

.\v3_test_harness_windows.ps1 -Model "qwen3.5:4b"
# Use specific model

.NOTES
Requirements: Windows 10+, PowerShell 5.0+, Python 3.8+ (optional)
Ollama will be auto-installed if missing.
#>

param(
    [string]$Model = $null,
    [int]$Passes = 1,
    [string]$Endpoint = "http://localhost:11434"
)

$ErrorActionPreference = "Continue"
$SCRIPT_VERSION = "3.1.0-auto-install"

# Paths
$RESULTS_DIR = Join-Path $env:USERPROFILE "loki-v3-test"
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
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Loki's Lab V3 Test Harness v$SCRIPT_VERSION" -ForegroundColor Cyan
Write-Host "Windows Edition" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Log-Message "Starting V3 Test Harness v$SCRIPT_VERSION"
Log-Message "Results directory: $RESULTS_DIR"
Log-Message "Log file: $LOG_FILE"

# 0. CHECK AND INSTALL OLLAMA
Write-Status-Info "Checking Ollama installation..."

$ollamaInstalled = $false
$ollamaPath = $null

# Check if ollama command exists
try {
    $ollamaPath = (Get-Command ollama -ErrorAction SilentlyContinue).Path
    if ($ollamaPath) {
        $ollamaInstalled = $true
        Write-Status-Success "Ollama found: $ollamaPath"
    }
} catch {}

# Check common Ollama installation path
if (!$ollamaInstalled) {
    $commonPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe"
    if (Test-Path $commonPath) {
        $ollamaInstalled = $true
        $ollamaPath = $commonPath
        Write-Status-Success "Ollama found at: $commonPath"
    }
}

# If not installed, auto-install
if (!$ollamaInstalled) {
    Write-Status-Warn "Ollama not found. Auto-installing..."
    Write-Status-Info "Downloading Ollama installer..."
    
    $installerPath = Join-Path $env:TEMP "OllamaInstaller.exe"
    
    try {
        # Download Ollama installer
        Invoke-WebRequest -Uri "https://ollama.ai/download/OllamaSetup.exe" -OutFile $installerPath -ErrorAction Stop
        Write-Status-Success "Downloaded Ollama installer"
        
        # Run installer silently
        Write-Status-Info "Running Ollama installer (this may take 2-5 minutes)..."
        Log-Message "Running: $installerPath /S"
        & $installerPath /S | Out-Null
        
        # Wait for installer to complete
        Start-Sleep -Seconds 10
        
        # Verify installation
        $ollamaPath = (Get-Command ollama -ErrorAction SilentlyContinue).Path
        if ($ollamaPath) {
            Write-Status-Success "Ollama installed successfully!"
            $ollamaInstalled = $true
        } else {
            Write-Status-Error "Ollama installation may have failed"
            Write-Status-Info "Manual install: Visit https://ollama.ai and download OllamaSetup.exe"
            exit 1
        }
    } catch {
        Write-Status-Error "Failed to download/install Ollama: $_"
        Write-Status-Info "Manual install: Visit https://ollama.ai and download OllamaSetup.exe"
        exit 1
    }
}

# 1. START OLLAMA SERVICE
Write-Status-Info "Starting Ollama service..."

$ollamaRunning = $false
try {
    $test = Invoke-WebRequest -Uri "$Endpoint/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($test.StatusCode -eq 200) {
        $ollamaRunning = $true
        Write-Status-Success "Ollama is already running"
    }
} catch {}

# If not running, start it
if (!$ollamaRunning) {
    Write-Status-Info "Ollama not responding, starting service..."
    try {
        # Try to start Ollama service
        Start-Process -FilePath $ollamaPath -WindowStyle Hidden -ErrorAction SilentlyContinue
        Write-Status-Info "Waiting for Ollama to start (up to 30 seconds)..."
        
        # Wait and check multiple times
        $maxWait = 30
        $waited = 0
        while ($waited -lt $maxWait) {
            Start-Sleep -Seconds 2
            $waited += 2
            try {
                $test = Invoke-WebRequest -Uri "$Endpoint/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($test.StatusCode -eq 200) {
                    Write-Status-Success "Ollama is now running"
                    $ollamaRunning = $true
                    break
                }
            } catch {}
        }
        
        if (!$ollamaRunning) {
            Write-Status-Error "Ollama failed to start after 30 seconds"
            Write-Status-Info "Try manually starting Ollama app or run: ollama serve"
            exit 1
        }
    } catch {
        Write-Status-Error "Could not start Ollama: $_"
        exit 1
    }
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
        try {
            $nvidiaSmi = & nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader 2>$null
            if ($nvidiaSmi) {
                $VRAM_GB = [int]($nvidiaSmi / 1024)
                Write-Status-Success "VRAM: ${VRAM_GB}GB"
            }
        } catch {
            Write-Status-Warn "Could not query VRAM via nvidia-smi"
        }
    } else {
        Write-Status-Info "No NVIDIA GPU detected, using CPU"
    }
} catch {
    Write-Status-Warn "GPU detection failed: $_"
}

# Get system RAM
try {
    $osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
    $SYSTEM_RAM_GB = [int]($osInfo.TotalVisibleMemorySize / 1MB)
    Write-Status-Success "System RAM: ${SYSTEM_RAM_GB}GB"
} catch {
    Write-Status-Warn "Failed to detect system RAM"
    $SYSTEM_RAM_GB = 8
}

# 3. SELECT MODEL
Write-Status-Info "Selecting model..."

if ($Model) {
    $SELECTED_MODEL = $Model
    Write-Status-Success "Using user-specified model: $SELECTED_MODEL"
} else {
    # Auto-select based on available VRAM
    if ($VRAM_GB -ge 75) {
        $SELECTED_MODEL = "qwen3.8-flash-next"
    } elseif ($VRAM_GB -ge 35) {
        $SELECTED_MODEL = "qwen3.8:27b"
    } elseif ($VRAM_GB -ge 25) {
        $SELECTED_MODEL = "qwen3.6:latest"
    } elseif ($SYSTEM_RAM_GB -ge 16) {
        $SELECTED_MODEL = "qwen3.5:4b"
    } else {
        Write-Status-Error "Insufficient resources (need 8GB+ RAM or 8GB+ VRAM)"
        exit 1
    }
    Write-Status-Success "Auto-selected model: $SELECTED_MODEL"
}

# 4. DOWNLOAD MODEL
Write-Status-Info "Downloading model: $SELECTED_MODEL..."
Write-Status-Info "This may take 5-30 minutes depending on model size..."
Log-Message "Starting model download: $SELECTED_MODEL"

try {
    Log-Message "Running: ollama pull $SELECTED_MODEL"
    & ollama pull $SELECTED_MODEL 2>&1 | ForEach-Object { Log-Message $_ }
    Write-Status-Success "Model download complete"
} catch {
    Write-Status-Error "Model download failed: $_"
    exit 1
}

# 5. RUN TEST
Write-Status-Info "Running V3 test suite..."
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Hardware Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GPU: $GPU_NAME"
Write-Host "VRAM: ${VRAM_GB}GB"
Write-Host "System RAM: ${SYSTEM_RAM_GB}GB"
Write-Host "Selected Model: $SELECTED_MODEL"
Write-Host "Ollama Endpoint: $Endpoint"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Look for run_matrix.py
$pythonScript = $null
foreach ($searchPath in @(".\run_matrix.py", "..\run_matrix.py", "..\..\..\scripts\eval\run_matrix.py", "C:\run_matrix.py")) {
    if (Test-Path $searchPath) {
        $pythonScript = Resolve-Path $searchPath
        break
    }
}

if ($pythonScript) {
    Write-Status-Success "Found test runner: $pythonScript"
    
    try {
        Write-Status-Info "Running V3 benchmark (this may take 10-30 minutes)..."
        & python.exe "$pythonScript" --model "$SELECTED_MODEL" --machine "$env:COMPUTERNAME" --raw-endpoint "$Endpoint/v1" --pass 1 2>&1 | ForEach-Object {
            Write-Host $_
            Log-Message $_
        }
        
        Write-Status-Success "Test complete!"
    } catch {
        Write-Status-Error "Test execution failed: $_"
        exit 1
    }
} else {
    Write-Status-Warn "Test runner (run_matrix.py) not found"
    Write-Status-Info "Test harness is ready, but V3 benchmark requires run_matrix.py"
    Write-Status-Success "Model is ready: $SELECTED_MODEL"
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Log file: $LOG_FILE"
Write-Host "Results: $RESULTS_DIR"
Write-Host ""
Write-Status-Success "Test harness finished!"
Write-Host ""
