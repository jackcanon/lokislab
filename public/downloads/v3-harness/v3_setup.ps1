#Requires -Version 5.0
<#
.SYNOPSIS
Loki's Lab V3 Test Harness - Windows
Double-click to run. Auto-installs everything needed.
#>

param([switch]$NoTUI)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# ====== ADMIN CHECK ======
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
        "This script requires Administrator privileges.`n`nPlease right-click on PowerShell and select 'Run as Administrator', then try again.",
        "Administrator Required",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning
    )
    exit 1
}

# ====== SETUP ======
Set-Location $env:USERPROFILE
$RESULTS_DIR = Join-Path $env:USERPROFILE "loki-v3-test"
$LOG_FILE = Join-Path $RESULTS_DIR ("harness-" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")

if (!(Test-Path $RESULTS_DIR)) { New-Item -ItemType Directory -Path $RESULTS_DIR -Force | Out-Null }

# ====== STATE TRACKING ======
$script:State = @{
    CurrentStep = "Initializing"
    Progress = 0
    Milestones = @{
        "✓ Check Administrator" = $false
        "✓ Detect Hardware" = $false
        "✓ Select Model" = $false
        "✓ Install Ollama" = $false
        "✓ Start Ollama Service" = $false
        "✓ Download Model" = $false
        "✓ Run Test" = $false
    }
    LastMessage = ""
    ErrorMessage = $null
    LogLines = @()
    Completed = $false
    Failed = $false
}

function Add-LogLine {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    $line = "[$timestamp] $Message"
    $script:State.LogLines += $line
    if ($script:State.LogLines.Count -gt 50) {
        $script:State.LogLines = $script:State.LogLines[-50..-1]
    }
    Add-Content -Path $LOG_FILE -Value $line
}

function Update-Step {
    param([string]$Step, [int]$Progress, [string]$Message)
    $script:State.CurrentStep = $Step
    $script:State.Progress = $Progress
    $script:State.LastMessage = $Message
    Add-LogLine "$Step: $Message"
}

function Complete-Milestone {
    param([string]$Name)
    $script:State.Milestones[$Name] = $true
}

function Show-TUI {
    Clear-Host
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Loki's Lab V3 Test Harness - Windows  ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # Progress bar
    $barLength = 35
    $filled = [int]($barLength * $script:State.Progress / 100)
    $empty = $barLength - $filled
    $bar = "[" + ("=" * $filled) + (" " * $empty) + "]"
    Write-Host "Progress: $bar $($script:State.Progress)%"
    Write-Host ""
    
    # Current step
    Write-Host "Current: $($script:State.CurrentStep)" -ForegroundColor Yellow
    Write-Host "  $($script:State.LastMessage)" -ForegroundColor Gray
    Write-Host ""
    
    # Milestones
    Write-Host "Progress:" -ForegroundColor Yellow
    foreach ($milestone in $script:State.Milestones.GetEnumerator()) {
        if ($milestone.Value) {
            Write-Host "  $($milestone.Name)" -ForegroundColor Green
        } else {
            Write-Host "  ○ $($milestone.Name.Substring(2))" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    
    if ($script:State.ErrorMessage) {
        Write-Host "ERROR: $($script:State.ErrorMessage)" -ForegroundColor Red
        Write-Host ""
    }
    
    Write-Host "Log:" -ForegroundColor Gray
    $recent = $script:State.LogLines[-3..-1]
    foreach ($line in $recent) {
        Write-Host "  $line" -ForegroundColor DarkGray
    }
}

# ====== HARDWARE DETECTION ======
Complete-Milestone "✓ Check Administrator"
Update-Step "Hardware Detection" 10 "Scanning system..."

$VRAM_GB = 0
$RAM_GB = 0
$GPU_NAME = "CPU Only"

try {
    $nvidia = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | 
              Where-Object { $_.Name -match "NVIDIA" } | Select-Object -First 1
    if ($nvidia) {
        $GPU_NAME = $nvidia.Name
        try {
            $vram = & nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader 2>$null | Select-Object -First 1
            if ($vram) { $VRAM_GB = [int]($vram / 1024) }
        } catch {}
    }
} catch {}

try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    if ($os) { $RAM_GB = [int]($os.TotalVisibleMemorySize / 1MB) }
} catch { $RAM_GB = 8 }

Update-Step "Hardware Detection" 20 "GPU: $GPU_NAME | VRAM: ${VRAM_GB}GB | RAM: ${RAM_GB}GB"
Complete-Milestone "✓ Detect Hardware"
Show-TUI

# ====== MODEL SELECTION ======
Update-Step "Model Selection" 30 "Analyzing resources..."

$MODEL = "qwen3.5:4b"
if ($VRAM_GB -ge 75) {
    $MODEL = "qwen3.8-flash-next"
} elseif ($VRAM_GB -ge 35) {
    $MODEL = "qwen3.8:27b"
} elseif ($VRAM_GB -ge 25) {
    $MODEL = "qwen3.6:latest"
}

Update-Step "Model Selection" 40 "Selected: $MODEL"
Complete-Milestone "✓ Select Model"
Show-TUI

# ====== OLLAMA CHECK ======
Update-Step "Install Ollama" 45 "Checking if Ollama is installed..."

$ollamaFound = $false
try {
    $cmd = Get-Command ollama -ErrorAction SilentlyContinue
    $ollamaFound = $true
} catch {}

if (!$ollamaFound) {
    @(
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama\ollama.exe",
        "C:\Program Files\Ollama\ollama.exe"
    ) | ForEach-Object {
        if (Test-Path $_) { $ollamaFound = $true }
    }
}

if (!$ollamaFound) {
    Update-Step "Install Ollama" 50 "Downloading Ollama installer (1-2 minutes)..."
    Show-TUI
    
    try {
        $installerPath = Join-Path $env:TEMP "OllamaSetup.exe"
        Invoke-WebRequest -Uri "https://ollama.ai/download/OllamaSetup.exe" `
                        -OutFile $installerPath -ErrorAction Stop
        
        Update-Step "Install Ollama" 55 "Running installer (may not show window)..."
        Show-TUI
        
        Start-Process -FilePath $installerPath -ArgumentList "/S" -PassThru -Wait | Out-Null
        Start-Sleep -Seconds 10
        
        Update-Step "Install Ollama" 60 "Ollama installed"
    } catch {
        $script:State.ErrorMessage = "Ollama install failed: $_"
        $script:State.Failed = $true
    }
}

if (!$script:State.Failed) {
    Complete-Milestone "✓ Install Ollama"
    Show-TUI
}

# ====== START OLLAMA SERVICE ======
if (!$script:State.Failed) {
    Update-Step "Start Ollama" 65 "Starting Ollama service..."
    Show-TUI
    
    $ollamaRunning = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $test = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($test.StatusCode -eq 200) {
                $ollamaRunning = $true
                break
            }
        } catch {}
        
        if ($i -eq 0) {
            try {
                Start-Process -FilePath "ollama" -WindowStyle Hidden -ErrorAction SilentlyContinue
            } catch {}
        }
        
        Start-Sleep -Milliseconds 500
    }
    
    if ($ollamaRunning) {
        Update-Step "Start Ollama" 70 "Ollama running on localhost:11434"
        Complete-Milestone "✓ Start Ollama Service"
    } else {
        $script:State.ErrorMessage = "Ollama failed to start"
        $script:State.Failed = $true
    }
    
    Show-TUI
}

# ====== DOWNLOAD MODEL ======
if (!$script:State.Failed) {
    Update-Step "Download Model" 75 "Downloading $MODEL (5-30 minutes - window may appear frozen, this is normal)..."
    Show-TUI
    
    try {
        $output = & ollama pull $MODEL 2>&1
        Add-LogLine "Model download output: $output"
        Update-Step "Download Model" 90 "Model download complete"
        Complete-Milestone "✓ Download Model"
    } catch {
        $script:State.ErrorMessage = "Model download failed: $_"
        $script:State.Failed = $true
    }
    
    Show-TUI
}

# ====== FINAL STATUS ======
if (!$script:State.Failed) {
    $script:State.Progress = 100
    Update-Step "Ready" 100 "V3 Test Harness is ready!"
    Complete-Milestone "✓ Run Test"
    $script:State.Completed = $true
}

Show-TUI

Write-Host ""
if ($script:State.Completed) {
    Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your system is ready for the V3 benchmark test." -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Yellow
    Write-Host "  GPU: $GPU_NAME"
    Write-Host "  VRAM: ${VRAM_GB}GB"
    Write-Host "  RAM: ${RAM_GB}GB"
    Write-Host "  Model: $MODEL"
    Write-Host ""
    Write-Host "Next step: Visit https://lokislab.org/test to run the benchmark" -ForegroundColor Cyan
} else {
    Write-Host "❌ SETUP FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($script:State.ErrorMessage)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Log file: $LOG_FILE" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Results saved to: $RESULTS_DIR" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to close"
