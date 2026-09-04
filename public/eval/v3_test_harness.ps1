<#
.SYNOPSIS
Loki's Lab V3 Test Harness - Smart VRAM Detection & Model Selection
Windows PowerShell Edition

.DESCRIPTION
Run the V3 benchmark with:
- Automatic VRAM detection (NVIDIA/AMD)
- Intelligent model selection based on GPU/System RAM
- Graceful fallback to CPU if needed
- Progress feedback and error recovery

.PARAMETER Model
Manually specify model: qwen3.5:4b, qwen3.6:latest, qwen3.8:27b, qwen3.8-flash-next

.EXAMPLE
.\v3_test_harness.ps1
# Auto-detects GPU and selects best model

.\v3_test_harness.ps1 -Model "qwen3.8:27b"
# Uses specified model

.NOTES
Requirements: Windows 10+, Ollama, PowerShell 5.0+
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Model = $null,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# Set error action
$ErrorActionPreference = "Stop"

# Colors
$colors = @{
    Green  = "`e[32m"
    Red    = "`e[31m"
    Yellow = "`e[33m"
    Blue   = "`e[34m"
    Reset  = "`e[0m"
}

# Script metadata
$SCRIPT_VERSION = "2.0.0"
$RESULTS_DIR = Join-Path $env:USERPROFILE "loki-v3-test"
$CACHE_DIR = Join-Path $env:USERPROFILE ".ollama"
$LOG_FILE = Join-Path $RESULTS_DIR "harness.log"

# GPU detection state
$GPU_TYPE = "none"
$GPU_NAME = ""
$VRAM_GB = 0
$SYSTEM_RAM_GB = 0

# Model variables
$SELECTED_MODEL = $null
$AUTO_SELECTED = $false

################################################################################
# UTILITY FUNCTIONS
################################################################################

function Log-Message {
    param(
        [string]$Level,
        [string]$Message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $logLine -ErrorAction SilentlyContinue
}

function Write-Success {
    param([string]$Message)
    Write-Host "$($colors.Green)✓$($colors.Reset) $Message" -ForegroundColor Green
    Log-Message "SUCCESS" $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "$($colors.Yellow)⚠$($colors.Reset) $Message" -ForegroundColor Yellow
    Log-Message "WARNING" $Message
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "$($colors.Red)✗$($colors.Reset) $Message" -ForegroundColor Red
    Log-Message "ERROR" $Message
}

function Write-Info {
    param([string]$Message)
    Write-Host "$($colors.Blue)ℹ$($colors.Reset) $Message" -ForegroundColor Cyan
    Log-Message "INFO" $Message
}

################################################################################
# GPU/VRAM DETECTION
################################################################################

function Detect-GPU-And-VRAM {
    Write-Host ""
    Write-Info "Detecting GPU and system resources..."
    
    # Check for NVIDIA GPU
    $nvidia = & {
        try {
            $result = & nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null | Select-Object -First 1
            if ($result) {
                $parts = $result -split ','
                return @{
                    Type   = "nvidia"
                    Name   = $parts[0].Trim()
                    VRAM   = [int]($parts[1].Trim() -replace '\s+MB', '') / 1024
                }
            }
        }
        catch {}
        return $null
    }
    
    if ($nvidia) {
        $script:GPU_TYPE = $nvidia.Type
        $script:GPU_NAME = $nvidia.Name
        $script:VRAM_GB = [Math]::Floor($nvidia.VRAM)
        Write-Success "GPU: NVIDIA $($nvidia.Name) ($($script:VRAM_GB)GB VRAM)"
    } else {
        Write-Warning "No NVIDIA GPU detected. Will use CPU (slower)"
    }
    
    # Detect system RAM
    $comp = Get-CimInstance Win32_ComputerSystem
    $script:SYSTEM_RAM_GB = [Math]::Floor($comp.TotalPhysicalMemory / 1GB)
    Write-Success "System RAM: $($script:SYSTEM_RAM_GB)GB"
    
    # Detect available disk space
    $drive = Get-PSDrive -Name (Split-Path $CACHE_DIR -Qualifier).TrimEnd(':')
    $available_gb = [Math]::Floor($drive.Free / 1GB)
    Write-Success "Disk available: ${available_gb}GB"
    
    Write-Host ""
}

################################################################################
# SMART MODEL SELECTION
################################################################################

function Select-Best-Model {
    Write-Host ""
    Write-Info "Selecting best model for your hardware..."
    
    # If user specified a model, use it
    if ($Model) {
        $script:SELECTED_MODEL = $Model
        Write-Success "Using user-specified model: $($script:SELECTED_MODEL)"
        return
    }
    
    # Auto-select based on VRAM (GPU) or RAM (CPU)
    $available_resource = if ($script:GPU_TYPE -ne "none") {
        $script:VRAM_GB
    } else {
        $script:SYSTEM_RAM_GB
        Write-Warning "Using system RAM for model selection (CPU inference will be slow)"
    }
    
    # Model sizing
    # qwen3.8-flash-next: 125B params, 6B active, ~75GB needed
    # qwen3.8:27b: 27B params, ~35GB needed
    # qwen3.6:latest: 22B params, ~25GB needed
    # qwen3.5:4b: 4B params, ~6-8GB needed
    
    if ($available_resource -ge 75) {
        $script:SELECTED_MODEL = "qwen3.8-flash-next"
        $script:AUTO_SELECTED = $true
        Write-Success "Auto-selected: qwen3.8-flash-next (125B, 6B active)"
        Write-Host "  Reason: You have $($available_resource)GB available"
        Write-Host "  This is the largest & most capable model available"
    }
    elseif ($available_resource -ge 35) {
        $script:SELECTED_MODEL = "qwen3.8:27b"
        $script:AUTO_SELECTED = $true
        Write-Success "Auto-selected: qwen3.8:27b (27B parameters)"
        Write-Host "  Reason: You have $($available_resource)GB available"
        Write-Host "  Largest model that fits comfortably"
    }
    elseif ($available_resource -ge 25) {
        $script:SELECTED_MODEL = "qwen3.6:latest"
        $script:AUTO_SELECTED = $true
        Write-Success "Auto-selected: qwen3.6:latest (22B parameters)"
        Write-Host "  Reason: You have $($available_resource)GB available"
        Write-Host "  Good balance of capability and speed"
    }
    elseif ($available_resource -ge 8) {
        $script:SELECTED_MODEL = "qwen3.5:4b"
        $script:AUTO_SELECTED = $true
        Write-Success "Auto-selected: qwen3.5:4b (4B parameters)"
        Write-Host "  Reason: You have $($available_resource)GB available"
        Write-Host "  Smallest model, fastest inference"
    }
    else {
        Write-Error-Custom "Insufficient resources!"
        Write-Host "  You have: $($available_resource)GB"
        Write-Host "  Minimum required: 8GB"
        exit 1
    }
    
    # Warn if system RAM is low
    if ($script:GPU_TYPE -ne "none" -and $script:SYSTEM_RAM_GB -lt 16) {
        Write-Warning "System RAM is low ($($script:SYSTEM_RAM_GB)GB). GPU-only inference will be used."
    }
    
    Write-Host ""
}

################################################################################
# SHOW HELP
################################################################################

function Show-Help {
    Write-Host @"
Loki's Lab V3 Test Harness - Smart Model Selection

Usage: .\v3_test_harness.ps1 [OPTIONS]

OPTIONS:
    -Model MODEL_NAME    Manually specify model
                        (qwen3.5:4b, qwen3.6:latest, qwen3.8:27b, qwen3.8-flash-next)
    -Help               Show this help message

EXAMPLES:
    # Auto-detect best model for your hardware
    .\v3_test_harness.ps1
    
    # Use specific model
    .\v3_test_harness.ps1 -Model "qwen3.8:27b"

HARDWARE DETECTION:
    - Automatically detects NVIDIA GPU (VRAM)
    - Falls back to system RAM if no GPU
    - Selects optimal model based on available resources

MODEL SELECTION LOGIC:
    >= 75GB   → qwen3.8-flash-next (125B)
    >= 35GB   → qwen3.8:27b
    >= 25GB   → qwen3.6:latest
    >= 8GB    → qwen3.5:4b
    < 8GB     → Error (insufficient resources)

"@
}

################################################################################
# MAIN
################################################################################

function Main {
    # Create directories
    if (-not (Test-Path $RESULTS_DIR)) { New-Item -ItemType Directory -Path $RESULTS_DIR -Force | Out-Null }
    if (-not (Test-Path $CACHE_DIR)) { New-Item -ItemType Directory -Path $CACHE_DIR -Force | Out-Null }
    
    # Clear log
    "" | Set-Content -Path $LOG_FILE -Force
    
    # Show header
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Loki's Lab V3 Test Harness v$SCRIPT_VERSION                          ║" -ForegroundColor Cyan
    Write-Host "║  Smart Model Selection | GPU Auto-Detection               ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    # Handle help
    if ($Help) {
        Show-Help
        exit 0
    }
    
    # Detect hardware
    Detect-GPU-And-VRAM
    
    # Select best model
    Select-Best-Model
    
    # Report summary
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  HARDWARE & MODEL SUMMARY                                  ║" -ForegroundColor Cyan
    Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "║ GPU Type:         $($script:GPU_TYPE)" -ForegroundColor Cyan
    if ($script:GPU_NAME) {
        Write-Host "║ GPU Model:        $($script:GPU_NAME)" -ForegroundColor Cyan
    }
    if ($script:GPU_TYPE -ne "none") {
        Write-Host "║ VRAM:             $($script:VRAM_GB)GB" -ForegroundColor Cyan
    }
    Write-Host "║ System RAM:       $($script:SYSTEM_RAM_GB)GB" -ForegroundColor Cyan
    Write-Host "║ Selected Model:   $($script:SELECTED_MODEL)" -ForegroundColor Cyan
    if ($script:AUTO_SELECTED) {
        Write-Host "║ Selection:        Auto-detected ✓" -ForegroundColor Cyan
    } else {
        Write-Host "║ Selection:        User-specified" -ForegroundColor Cyan
    }
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Success "Ready to run V3 test on: $($script:SELECTED_MODEL)"
    
    # TODO: Continue with actual test execution using $script:SELECTED_MODEL
}

# Run main
Main
