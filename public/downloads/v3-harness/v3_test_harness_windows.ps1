#Requires -Version 5.0
param()

$SCRIPT_VERSION = "3.4.0-simple"
$ErrorActionPreference = "Continue"

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host ""
    Write-Host "ERROR: This script requires Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

# Auto CD to home
Set-Location $env:USERPROFILE

# Paths
$RESULTS_DIR = Join-Path $env:USERPROFILE "loki-v3-test"
$LOG_FILE = Join-Path $RESULTS_DIR ("harness-" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")

if (!(Test-Path $RESULTS_DIR)) {
    New-Item -ItemType Directory -Path $RESULTS_DIR -Force | Out-Null
}

function Log-Message {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] $Message"
    Write-Host $logLine
    Add-Content -Path $LOG_FILE -Value $logLine
}

function Write-OK {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
    Log-Message "[OK] $Message"
}

function Write-Error-Msg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    Log-Message "[ERROR] $Message"
}

function Write-Info {
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

# Check Ollama
Write-Info "Checking Ollama..."

$ollamaFound = $false
try {
    $cmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($cmd) {
        $ollamaFound = $true
        Write-OK "Ollama found in PATH"
    }
} catch {}

if (!$ollamaFound) {
    $paths = @(
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe",
        "C:\Program Files\Ollama\ollama.exe"
    )
    foreach ($path in $paths) {
        if (Test-Path $path) {
            $ollamaFound = $true
            Write-OK "Ollama found at $path"
            break
        }
    }
}

if (!$ollamaFound) {
    Write-Info "Ollama not found. Installing..."
    $installerPath = Join-Path $env:TEMP "OllamaSetup.exe"
    
    try {
        Write-Info "Downloading Ollama (this takes 1-2 minutes)..."
        Invoke-WebRequest -Uri "https://ollama.ai/download/OllamaSetup.exe" -OutFile $installerPath -ErrorAction Stop
        Write-OK "Downloaded"
        
        Write-Info "Running installer (window may not appear)..."
        Start-Process -FilePath $installerPath -ArgumentList "/S" -PassThru -Wait
        
        Write-Info "Waiting for Ollama to initialize..."
        Start-Sleep -Seconds 15
        
        Write-OK "Ollama installed"
    } catch {
        Write-Error-Msg "Failed to install Ollama: $_"
        Write-Info "Visit https://ollama.ai to download manually"
        Read-Host "Press Enter to close"
        exit 1
    }
}

# Start Ollama
Write-Info "Starting Ollama service..."
$ollamaRunning = $false

for ($i = 0; $i -lt 30; $i++) {
    try {
        $test = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($test.StatusCode -eq 200) {
            $ollamaRunning = $true
            Write-OK "Ollama is running"
            break
        }
    } catch {}
    
    if ($i -eq 0) {
        Write-Info "Launching Ollama..."
        try {
            Start-Process -FilePath "ollama" -WindowStyle Hidden -ErrorAction SilentlyContinue
        } catch {}
    }
    
    if (!$ollamaRunning) {
        Start-Sleep -Seconds 1
    }
}

if (!$ollamaRunning) {
    Write-Error-Msg "Ollama failed to start"
    Write-Info "Try restarting your computer and running this script again"
    Read-Host "Press Enter to close"
    exit 1
}

# Detect hardware
Write-Info "Detecting hardware..."

$GPU_NAME = "None"
$VRAM_GB = 0
$RAM_GB = 0

try {
    $nvidia = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "NVIDIA" } | Select-Object -First 1
    if ($nvidia) {
        $GPU_NAME = $nvidia.Name
        Write-OK "GPU: $GPU_NAME"
        
        try {
            $vram = & nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader 2>$null | Select-Object -First 1
            if ($vram) {
                $VRAM_GB = [int]($vram / 1024)
                Write-OK "VRAM: ${VRAM_GB}GB"
            }
        } catch {}
    }
} catch {}

try {
    $os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue
    if ($os) {
        $RAM_GB = [int]($os.TotalVisibleMemorySize / 1MB)
        Write-OK "System RAM: ${RAM_GB}GB"
    }
} catch {
    $RAM_GB = 8
}

# Select model
Write-Info "Selecting model..."

$MODEL = "qwen3.5:4b"

if ($VRAM_GB -ge 75) {
    $MODEL = "qwen3.8-flash-next"
    Write-OK "Model: $MODEL (125B)"
} elseif ($VRAM_GB -ge 35) {
    $MODEL = "qwen3.8:27b"
    Write-OK "Model: $MODEL (27B)"
} elseif ($VRAM_GB -ge 25) {
    $MODEL = "qwen3.6:latest"
    Write-OK "Model: $MODEL (12B)"
} else {
    Write-OK "Model: $MODEL (4B)"
}

# Download model
Write-Info "Downloading model: $MODEL"
Write-Info "This may take 5-30 minutes (computer may appear unresponsive - normal)"
Write-Host ""

try {
    & ollama pull $MODEL 2>&1 | ForEach-Object {
        Write-Host $_
        Log-Message $_
    }
    Write-OK "Model downloaded"
} catch {
    Write-Error-Msg "Model download failed: $_"
    Read-Host "Press Enter to close"
    exit 1
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Ready for V3 Testing!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "GPU: $GPU_NAME"
Write-Host "VRAM: ${VRAM_GB}GB"
Write-Host "System RAM: ${RAM_GB}GB"
Write-Host "Model: $MODEL"
Write-Host "Ollama: Running"
Write-Host "Results: $RESULTS_DIR"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-OK "Setup complete! Visit https://lokislab.org/test to run benchmark"
Write-Host ""
Read-Host "Press Enter to close"
