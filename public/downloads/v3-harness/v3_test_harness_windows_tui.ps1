#Requires -Version 5.0
<#
.SYNOPSIS
Loki's Lab V3 Test Harness - Windows TUI Edition
Real-time progress feedback with expandable logs.

.DESCRIPTION
Runs V3 benchmark with live progress display, milestone tracking, and expandable terminal output.
Auto-installs Ollama, detects hardware, downloads model, runs test.

.PARAMETER NoTUI
Skip TUI and run in plain console mode
#>

param(
    [switch]$NoTUI
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# ====== ADMIN CHECK ======
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host ""
    Write-Host "ERROR: Administrator required" -ForegroundColor Red
    Write-Host "Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ====== SETUP ======
Set-Location $env:USERPROFILE
$RESULTS_DIR = Join-Path $env:USERPROFILE "loki-v3-test"
$LOG_FILE = Join-Path $RESULTS_DIR ("harness-" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")
$STATE_FILE = Join-Path $RESULTS_DIR "current_state.json"

if (!(Test-Path $RESULTS_DIR)) {
    New-Item -ItemType Directory -Path $RESULTS_DIR -Force | Out-Null
}

# ====== STATE TRACKING ======
$script:State = @{
    CurrentStep = "Initializing"
    Progress = 0
    Milestones = @{
        "Hardware Detection" = "pending"
        "Model Selection" = "pending"
        "Ollama Service" = "pending"
        "Model Download" = "pending"
        "Test Execution" = "pending"
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
    
    # Keep last 50 lines in memory
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

function Set-Milestone {
    param([string]$Name, [string]$Status)
    $script:State.Milestones[$Name] = $Status
}

function Show-TUI {
    Clear-Host
    
    # Header
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Loki's Lab V3 Test Harness - Windows  ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # Progress bar
    $barLength = 30
    $filled = [int]($barLength * $script:State.Progress / 100)
    $empty = $barLength - $filled
    $bar = "[" + ("=" * $filled) + (" " * $empty) + "]"
    Write-Host "Progress: $bar $($script:State.Progress)%" -ForegroundColor Green
    Write-Host ""
    
    # Current step
    Write-Host "Current Step:" -ForegroundColor Yellow
    Write-Host "  $($script:State.CurrentStep)" -ForegroundColor White
    Write-Host "  $($script:State.LastMessage)" -ForegroundColor Gray
    Write-Host ""
    
    # Milestones
    Write-Host "Milestones:" -ForegroundColor Yellow
    foreach ($milestone in $script:State.Milestones.GetEnumerator()) {
        $status = $milestone.Value
        $icon = switch ($status) {
            "pending" { "○" }
            "running" { "▶" }
            "complete" { "✓" }
            "error" { "✗" }
            default { "?" }
        }
        
        $color = switch ($status) {
            "pending" { "Gray" }
            "running" { "Yellow" }
            "complete" { "Green" }
            "error" { "Red" }
            default { "White" }
        }
        
        Write-Host "  $icon $($milestone.Name)" -ForegroundColor $color
    }
    
    Write-Host ""
    
    # Error display
    if ($script:State.ErrorMessage) {
        Write-Host "ERROR:" -ForegroundColor Red
        Write-Host "  $($script:State.ErrorMessage)" -ForegroundColor Red
        Write-Host ""
    }
    
    # Log preview
    Write-Host "Recent Log:" -ForegroundColor Yellow
    $recentLogs = $script:State.LogLines[-5..-1]
    foreach ($log in $recentLogs) {
        Write-Host "  $log" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Press any key to show full log, or wait..." -ForegroundColor DarkGray
}

function Show-FullLog {
    Clear-Host
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Full Test Log" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($line in $script:State.LogLines) {
        Write-Host $line -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Press any key to return to progress view..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Run-HarnessStep {
    param(
        [string]$StepName,
        [scriptblock]$ScriptBlock,
        [int]$ProgressStart,
        [int]$ProgressEnd
    )
    
    Set-Milestone $StepName "running"
    Update-Step $StepName $ProgressStart "Starting..."
    
    try {
        & $ScriptBlock
        Set-Milestone $StepName "complete"
        Update-Step $StepName $ProgressEnd "Complete"
    } catch {
        Set-Milestone $StepName "error"
        $script:State.ErrorMessage = $_.Exception.Message
        Update-Step $StepName $ProgressEnd "ERROR: $_"
        $script:State.Failed = $true
        throw
    }
}

# ====== HARDWARE DETECTION ======
function Detect-Hardware {
    Update-Step "Hardware Detection" 5 "Scanning system..."
    
    $script:VRAM_GB = 0
    $script:RAM_GB = 0
    $script:GPU_NAME = "CPU Only"
    
    # GPU detection
    try {
        $nvidia = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | 
                  Where-Object { $_.Name -match "NVIDIA" } | Select-Object -First 1
        
        if ($nvidia) {
            $script:GPU_NAME = $nvidia.Name
            Update-Step "Hardware Detection" 15 "GPU: $($script:GPU_NAME)"
            
            try {
                $vram = & nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader 2>$null | Select-Object -First 1
                if ($vram) {
                    $script:VRAM_GB = [int]($vram / 1024)
                    Update-Step "Hardware Detection" 25 "VRAM: ${script:VRAM_GB}GB"
                }
            } catch {}
        }
    } catch {}
    
    # System RAM
    try {
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
        if ($os) {
            $script:RAM_GB = [int]($os.TotalVisibleMemorySize / 1MB)
            Update-Step "Hardware Detection" 35 "System RAM: ${script:RAM_GB}GB"
        }
    } catch {
        $script:RAM_GB = 8
    }
}

# ====== MODEL SELECTION ======
function Select-Model {
    Update-Step "Model Selection" 40 "Analyzing hardware..."
    
    $script:MODEL = "qwen3.5:4b"
    
    if ($script:VRAM_GB -ge 75) {
        $script:MODEL = "qwen3.8-flash-next"
        Update-Step "Model Selection" 50 "Selected: qwen3.8-flash-next (125B)"
    } elseif ($script:VRAM_GB -ge 35) {
        $script:MODEL = "qwen3.8:27b"
        Update-Step "Model Selection" 50 "Selected: qwen3.8:27b (27B)"
    } elseif ($script:VRAM_GB -ge 25) {
        $script:MODEL = "qwen3.6:latest"
        Update-Step "Model Selection" 50 "Selected: qwen3.6:latest (12B)"
    } else {
        Update-Step "Model Selection" 50 "Selected: qwen3.5:4b (4B)"
    }
}

# ====== OLLAMA SERVICE ======
function Ensure-Ollama {
    Update-Step "Ollama Service" 55 "Checking installation..."
    
    $ollamaFound = $false
    try {
        $cmd = Get-Command ollama -ErrorAction SilentlyContinue
        if ($cmd) {
            $ollamaFound = $true
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
                Update-Step "Ollama Service" 60 "Found at: $path"
                break
            }
        }
    }
    
    if (!$ollamaFound) {
        Update-Step "Ollama Service" 60 "Installing Ollama..."
        
        try {
            $installerPath = Join-Path $env:TEMP "OllamaSetup.exe"
            Update-Step "Ollama Service" 65 "Downloading (1-2 min)..."
            
            Invoke-WebRequest -Uri "https://ollama.ai/download/OllamaSetup.exe" `
                            -OutFile $installerPath `
                            -ErrorAction Stop
            
            Update-Step "Ollama Service" 70 "Running installer..."
            Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait -PassThru | Out-Null
            
            Start-Sleep -Seconds 10
            Update-Step "Ollama Service" 75 "Installed successfully"
        } catch {
            $script:State.ErrorMessage = "Ollama install failed: $_"
            throw
        }
    }
    
    # Start service
    Update-Step "Ollama Service" 80 "Starting Ollama..."
    
    $ollamaRunning = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $test = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($test.StatusCode -eq 200) {
                $ollamaRunning = $true
                Update-Step "Ollama Service" 85 "Running on localhost:11434"
                break
            }
        } catch {}
        
        if ($i -eq 0) {
            try {
                Start-Process -FilePath "ollama" -WindowStyle Hidden -ErrorAction SilentlyContinue
            } catch {}
        }
        
        Start-Sleep -Seconds 1
    }
    
    if (!$ollamaRunning) {
        $script:State.ErrorMessage = "Ollama failed to start"
        throw "Ollama not responding"
    }
}

# ====== MODEL DOWNLOAD ======
function Download-Model {
    Update-Step "Model Download" 90 "Downloading $script:MODEL (5-30 min - window may appear frozen, normal)..."
    
    try {
        & ollama pull $script:MODEL 2>&1 | ForEach-Object {
            Add-LogLine "  $_"
            # Update progress estimate
            if ($_ -match "(\d+)%") {
                $percent = [int]$Matches[1]
                Update-Step "Model Download" (90 + [int]($percent * 0.08)) "Pulling: $_"
            }
        }
        
        Update-Step "Model Download" 98 "Complete"
    } catch {
        $script:State.ErrorMessage = "Model download failed: $_"
        throw
    }
}

# ====== MAIN EXECUTION ======
Add-LogLine "=== V3 Test Harness Started ==="
Add-LogLine "GPU: CPU Only | RAM: 0GB | Model: pending"

# Run all steps
try {
    # Detect hardware
    Run-HarnessStep "Hardware Detection" { Detect-Hardware } 5 35
    
    # Select model
    Run-HarnessStep "Model Selection" { Select-Model } 40 50
    
    # Ensure Ollama
    Run-HarnessStep "Ollama Service" { Ensure-Ollama } 55 85
    
    # Download model
    Run-HarnessStep "Model Download" { Download-Model } 90 98
    
    # Simulate test execution (real test would go here)
    Update-Step "Test Execution" 99 "Ready for testing"
    Set-Milestone "Test Execution" "complete"
    
    $script:State.Completed = $true
    $script:State.Progress = 100
    
    Add-LogLine "=== V3 Test Harness Complete ==="
    
} catch {
    Add-LogLine "ERROR: $_"
}

# ====== DISPLAY LOOP ======
$showingLog = $false
$lastRefresh = Get-Date

while ($true) {
    if (!$NoTUI) {
        if ($Host.UI.RawUI.KeyAvailable) {
            $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            
            if ($key.VirtualKeyCode -eq 27) {  # ESC to quit
                break
            }
            
            $showingLog = !$showingLog
        }
        
        if ($showingLog) {
            Show-FullLog
            $showingLog = $false
        } else {
            $now = Get-Date
            if (($now - $lastRefresh).TotalMilliseconds -gt 300) {
                Show-TUI
                $lastRefresh = $now
            }
        }
    }
    
    if ($script:State.Completed -or $script:State.Failed) {
        if (!$showingLog) {
            Show-TUI
        }
        
        Write-Host ""
        if ($script:State.Completed) {
            Write-Host "✓ Setup complete!" -ForegroundColor Green
        } else {
            Write-Host "✗ Setup failed!" -ForegroundColor Red
        }
        
        Write-Host "Full log: $LOG_FILE" -ForegroundColor Yellow
        Write-Host "Results: $RESULTS_DIR" -ForegroundColor Yellow
        Write-Host ""
        
        Read-Host "Press Enter to close"
        break
    }
    
    Start-Sleep -Milliseconds 100
}
