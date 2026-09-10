#Requires -Version 5.0
<#
.SYNOPSIS
Loki's Lab V3 Test Harness for Windows
Smart GPU detection and model selection, then runs V3 benchmark.

.DESCRIPTION
Automatically detects NVIDIA GPU VRAM, system RAM, selects best model,
downloads via Ollama, and runs the V3 test suite.

.PARAMETER Model
Manually specify model (qwen3.5:4b, qwen3.6:latest, qwen3.8:27b)

.EXAMPLE
.\v3_test_harness_windows.ps1
# Auto-detect and run

.\v3_test_harness_windows.ps1 -Model "qwen3.5:4b"
# Use specific model

.NOTES
Requirements: Windows 10+, PowerShell 5.0+, Ollama, Python 3.8+
#>

param(
    [string]$Model = $null,
    [int]$Passes = 1,
    [string]$Endpoint = "http://localhost:11434"
)

$ErrorActionPreference = "Continue"
$SCRIPT_VERSION = "3.0.0-hotfix"

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

# 1. DETECT GPU AND RAM
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
        # Note: Accurate VRAM detection on Windows is complex; using nvidia-smi if available
        try {
            $nvidiaSmi = & nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader 2>$null
            if ($nvidiaSmi) {
                $VRAM_GB = [int]($nvidiaSmi / 1024)
                Write-Status-Success "VRAM: ${VRAM_GB}GB"
            }
        } catch {
            Write-Status-Error "Could not query VRAM via nvidia-smi"
        }
    } else {
        Write-Status-Info "No NVIDIA GPU detected, using CPU"
    }
} catch {
    Write-Status-Error "GPU detection failed: $_"
}

# Get system RAM
try {
    $osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
    $SYSTEM_RAM_GB = [int]($osInfo.TotalVisibleMemorySize / 1MB)
    Write-Status-Success "System RAM: ${SYSTEM_RAM_GB}GB"
} catch {
    Write-Status-Error "Failed to detect system RAM: $_"
    $SYSTEM_RAM_GB = 8  # Default fallback
}

# 2. SELECT MODEL
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
        Write-Status-Error "Insufficient resources (need 8GB+ RAM)"
        exit 1
    }
    Write-Status-Success "Auto-selected model: $SELECTED_MODEL"
}

# 3. VERIFY OLLAMA
Write-Status-Info "Checking Ollama..."
try {
    $ollamaHealth = Invoke-WebRequest -Uri "$Endpoint/api/tags" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($ollamaHealth.StatusCode -eq 200) {
        Write-Status-Success "Ollama is running"
    } else {
        Write-Status-Error "Ollama not responding"
        exit 1
    }
} catch {
    Write-Status-Error "Could not connect to Ollama at $Endpoint"
    exit 1
}

# 4. DOWNLOAD MODEL
Write-Status-Info "Downloading model: $SELECTED_MODEL..."
Log-Message "Starting model download: $SELECTED_MODEL"

try {
    $pullCmd = "ollama pull $SELECTED_MODEL"
    Log-Message "Running: $pullCmd"
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
Write-Host "Test Passes: $Passes"
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

if (!$pythonScript) {
    Write-Status-Error "Could not find run_matrix.py"
    Write-Status-Info "Expected in current directory or ..\..\scripts\eval\"
    exit 1
}

Write-Status-Success "Found test runner: $pythonScript"

# Run the test
try {
    $testCmd = "python.exe `"$pythonScript`" --model `"$SELECTED_MODEL`" --machine `"$env:COMPUTERNAME`" --raw-endpoint `"$Endpoint/v1`" --pass 1"
    Log-Message "Running: $testCmd"
    Write-Status-Info "This may take 5-30 minutes..."
    
    & python.exe "$pythonScript" --model "$SELECTED_MODEL" --machine "$env:COMPUTERNAME" --raw-endpoint "$Endpoint/v1" --pass 1 2>&1 | ForEach-Object {
        Write-Host $_
        Log-Message $_
    }
    
    Write-Status-Success "Test complete!"
} catch {
    Write-Status-Error "Test execution failed: $_"
    exit 1
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Results Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Log file: $LOG_FILE"
Write-Host "Results directory: $RESULTS_DIR"
Write-Host ""
Write-Status-Success "Test harness complete!"
Write-Host ""
