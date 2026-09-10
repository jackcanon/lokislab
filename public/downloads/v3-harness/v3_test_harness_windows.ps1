<#
.SYNOPSIS
Loki's Lab V3 Test Harness - Complete Windows PowerShell Edition
Smart VRAM Detection | Model Download | Test Execution | Progress Tracking

.DESCRIPTION
Run the V3 benchmark with:
- Automatic VRAM detection (NVIDIA/AMD)
- Intelligent model selection based on GPU/System RAM
- Automated model download via Ollama
- Test execution via run_matrix.py
- Progress bars (Write-Progress)
- Graceful fallback to CPU if needed
- Comprehensive log capture

.PARAMETER Model
Manually specify model: qwen3.5:4b, qwen3.6:latest, qwen3.8:27b, qwen3.8-flash-next

.PARAMETER NumPasses
Number of test passes (default: 1)

.PARAMETER PythonScript
Path to run_matrix.py (default: auto-detect from PATH)

.PARAMETER Endpoint
Ollama endpoint (default: http://localhost:11434)

.EXAMPLE
.\\v3_test_harness.ps1
# Auto-detects GPU, selects model, downloads, and runs tests

.\\v3_test_harness.ps1 -Model "qwen3.8:27b" -NumPasses 3
# Uses specific model with 3 test passes

.NOTES
Requirements: Windows 10+, PowerShell 5.0+, Ollama, Python 3.8+
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Model = $null,
    
    [Parameter(Mandatory=$false)]
    [int]$NumPasses = 1,
    
    [Parameter(Mandatory=$false)]
    [string]$PythonScript = $null,
    
    [Parameter(Mandatory=$false)]
    [string]$Endpoint = "http://localhost:11434",
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# Set error action preference (non-terminating for testing)
$ErrorActionPreference = "Continue"

# Script version
$SCRIPT_VERSION = "3.0.0"

# Get script directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# Windows path handling - use %APPDATA% style paths
$RESULTS_DIR = Join-Path $env:USERPROFILE "loki-v3-test"
$CACHE_DIR = Join-Path $env:USERPROFILE ".ollama"
$LOG_DIR = $RESULTS_DIR
$LOG_FILE = Join-Path $LOG_DIR "harness.log"
$RESULTS_FILE = Join-Path $RESULTS_DIR "test_results.json"

# GPU detection state
$GPU_TYPE = "none"
$GPU_NAME = ""
$VRAM_GB = 0
$SYSTEM_RAM_GB = 0
$CUDA_VERSION = ""

# Model variables
$SELECTED_MODEL = $null
$AUTO_SELECTED = $false

# Error codes
$ERR_INSUFFICIENT_VRAM = 30
$ERR_INSUFFICIENT_RAM = 31
$ERR_MODEL_NOT_AVAILABLE = 40
$ERR_OLLAMA_UNAVAILABLE = 50
$ERR_PYTHON_UNAVAILABLE = 51

# ANSI colors for terminal output
$colors = @{
    Green  = "`e[32m"
    Red    = "`e[31m"
    Yellow = "`e[33m"
    Blue   = "`e[34m"
    Cyan   = "`e[36m"
    Reset  = "`e[0m"
}

################################################################################
# UTILITY FUNCTIONS
################################################################################

function Initialize-Logging {
    # Create directories
    if (-not (Test-Path $RESULTS_DIR)) {
        New-Item -ItemType Directory -Path $RESULTS_DIR -Force | Out-Null
        Write-Host "Created results directory: $RESULTS_DIR"
    }
    if (-not (Test-Path $CACHE_DIR)) {
        New-Item -ItemType Directory -Path $CACHE_DIR -Force | Out-Null
        Write-Host "Created cache directory: $CACHE_DIR"
    }
    
    # Clear and initialize log
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$timestamp] ===== V3 Test Harness v$SCRIPT_VERSION Started =====" | Set-Content -Path $LOG_FILE -Force
    "Workspace: $RESULTS_DIR" | Add-Content -Path $LOG_FILE
    "Script: $SCRIPT_DIR" | Add-Content -Path $LOG_FILE
    "Endpoint: $Endpoint" | Add-Content -Path $LOG_FILE
    "" | Add-Content -Path $LOG_FILE
}

function Log-Message {
    param(
        [string]$Level = "INFO",
        [string]$Message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $logLine -ErrorAction SilentlyContinue
}

function Write-Success {
    param(
        [string]$Message,
        [switch]$NoLog
    )
    Write-Host "$($colors.Green)✓$($colors.Reset) $Message" -ForegroundColor Green
    if (-not $NoLog) { Log-Message "SUCCESS" $Message }
}

function Write-Warning-Custom {
    param(
        [string]$Message,
        [switch]$NoLog
    )
    Write-Host "$($colors.Yellow)⚠$($colors.Reset) $Message" -ForegroundColor Yellow
    if (-not $NoLog) { Log-Message "WARNING" $Message }
}

function Write-Error-Custom {
    param(
        [string]$Message,
        [switch]$NoLog
    )
    Write-Host "$($colors.Red)✗$($colors.Reset) $Message" -ForegroundColor Red
    if (-not $NoLog) { Log-Message "ERROR" $Message }
}

function Write-Info {
    param(
        [string]$Message,
        [switch]$NoLog
    )
    Write-Host "$($colors.Blue)ℹ$($colors.Reset) $Message" -ForegroundColor Cyan
    if (-not $NoLog) { Log-Message "INFO" $Message }
}

function Write-Section-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $Title" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

################################################################################
# GPU/VRAM DETECTION
################################################################################

function Detect-GPU-And-VRAM {
    Write-Section-Header "Hardware Detection"
    Write-Info "Scanning for NVIDIA GPU..."
    
    $nvidia = $null
    try {
        $output = & nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null | Select-Object -First 1
        if ($output) {
            $parts = $output -split ','
            if ($parts.Count -ge 2) {
                $nvidia = @{
                    Type   = "nvidia"
                    Name   = $parts[0].Trim()
                    VRAM   = [int]($parts[1].Trim() -replace '\s+MB', '') / 1024
                }
            }
        }
    }
    catch {
        # nvidia-smi not available
    }
    
    if ($nvidia) {
        $script:GPU_TYPE = $nvidia.Type
        $script:GPU_NAME = $nvidia.Name
        $script:VRAM_GB = [Math]::Floor($nvidia.VRAM)
        Write-Success "GPU: NVIDIA $($nvidia.Name) ($($script:VRAM_GB)GB VRAM)"
    } else {
        Write-Warning-Custom "No NVIDIA GPU detected. Will use CPU (slower)"
    }
    
    # Detect system RAM
    try {
        $comp = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
        if ($comp) {
            $script:SYSTEM_RAM_GB = [Math]::Floor($comp.TotalPhysicalMemory / 1GB)
            Write-Success "System RAM: $($script:SYSTEM_RAM_GB)GB"
        }
    }
    catch {
        Write-Warning-Custom "Could not detect system RAM"
    }
    
    # Detect available disk space
    try {
        $driveLetter = (Split-Path $CACHE_DIR -Qualifier).TrimEnd(':')
        if ($driveLetter) {
            $drive = Get-PSDrive -Name $driveLetter -ErrorAction SilentlyContinue
            if ($drive) {
                $available_gb = [Math]::Floor($drive.Free / 1GB)
                Write-Success "Disk available: ${available_gb}GB"
            }
        }
    }
    catch {
        Write-Warning-Custom "Could not detect available disk space"
    }
    
    Write-Host ""
}

################################################################################
# SMART MODEL SELECTION
################################################################################

function Select-Best-Model {
    Write-Section-Header "Model Selection"
    Write-Info "Selecting best model for your hardware..."
    
    # If user specified a model, use it
    if ($Model) {
        $script:SELECTED_MODEL = $Model
        Write-Success "Using user-specified model: $($script:SELECTED_MODEL)"
        Write-Host ""
        return
    }
    
    # Auto-select based on VRAM (GPU) or RAM (CPU)
    $available_resource = if ($script:GPU_TYPE -ne "none") {
        $script:VRAM_GB
    } else {
        $script:SYSTEM_RAM_GB
        Write-Warning-Custom "Using system RAM for model selection (CPU inference will be slow)"
    }
    
    # Model sizing reference
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
        Log-Message "ERROR" "Insufficient resources: only $available_resource GB available"
        exit $ERR_INSUFFICIENT_VRAM
    }
    
    # Warn if system RAM is low
    if ($script:GPU_TYPE -ne "none" -and $script:SYSTEM_RAM_GB -lt 16) {
        Write-Warning-Custom "System RAM is low ($($script:SYSTEM_RAM_GB)GB). GPU-only inference will be used."
    }
    
    Write-Host ""
}

################################################################################
# OLLAMA FUNCTIONS
################################################################################

function Check-Ollama-Available {
    Write-Info "Checking Ollama availability at $Endpoint..."
    try {
        $response = Invoke-WebRequest -Uri "$Endpoint/api/tags" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Success "Ollama is running"
            return $true
        }
    }
    catch {
        Write-Error-Custom "Ollama is not responding at $Endpoint"
        Log-Message "ERROR" "Ollama unavailable at $Endpoint : $_"
        return $false
    }
}

function Check-Model-Downloaded {
    param([string]$ModelName)
    
    Write-Info "Checking if $ModelName is already downloaded..."
    try {
        $uri = "$Endpoint/api/tags"
        $response = Invoke-WebRequest -Uri $uri -Method Get -ErrorAction SilentlyContinue
        $tags = $response.Content | ConvertFrom-Json
        
        $exists = $tags.models | Where-Object { $_.name -eq $ModelName }
        if ($exists) {
            Write-Success "$ModelName is already downloaded"
            return $true
        }
    }
    catch {
        Log-Message "WARNING" "Could not check model status: $_"
    }
    
    return $false
}

function Download-Model {
    param([string]$ModelName)
    
    Write-Section-Header "Model Download"
    Write-Info "Downloading $ModelName (this may take 5-30 minutes)..."
    Log-Message "INFO" "Starting model download: $ModelName"
    
    try {
        $uri = "$Endpoint/api/pull"
        $body = @{
            name   = $ModelName
            stream = $true
        } | ConvertTo-Json
        
        # Use streaming pull with progress
        $response = Invoke-WebRequest -Uri $uri -Method Post -Body $body -ContentType "application/json" `
                                      -ErrorAction Stop
        
        Write-Success "Model download initiated for $ModelName"
        
        # Poll for completion
        $completed = $false
        $maxWait = 1800  # 30 minutes
        $elapsed = 0
        
        while (-not $completed -and $elapsed -lt $maxWait) {
            Start-Sleep -Seconds 10
            $elapsed += 10
            
            # Check model status
            if (Check-Model-Downloaded $ModelName) {
                Write-Success "$ModelName download completed"
                $completed = $true
                break
            }
            
            # Show progress
            $percent = [Math]::Min(($elapsed / $maxWait) * 100, 99)
            Write-Progress -Activity "Downloading $ModelName" `
                          -Status "Waiting for model to be ready..." `
                          -PercentComplete $percent
        }
        
        Write-Progress -Activity "Downloading $ModelName" -Completed
        
        if (-not $completed) {
            Write-Warning-Custom "Model download timeout after $maxWait seconds"
            Log-Message "WARNING" "Model download timeout"
        }
        
        return $completed
    }
    catch {
        Write-Error-Custom "Model download failed: $_"
        Log-Message "ERROR" "Model download failed: $_"
        return $false
    }
}

################################################################################
# TEST EXECUTION FUNCTIONS
################################################################################

function Find-Python-Script {
    param([string]$ScriptName)
    
    # If path provided, use it
    if ($PythonScript -and (Test-Path $PythonScript)) {
        return $PythonScript
    }
    
    # Check common locations
    $searchPaths = @(
        ".\run_matrix.py",
        "..\scripts\eval\run_matrix.py",
        (Join-Path $env:USERPROFILE "lokislab-deploy\scripts\eval\run_matrix.py"),
        (Join-Path $env:USERPROFILE "lokislab-publish\scripts\eval\run_matrix.py")
    )
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            return (Resolve-Path $path).Path
        }
    }
    
    return $null
}

function Check-Python-Available {
    try {
        $version = & python --version 2>&1
        Write-Success "Python available: $version"
        return $true
    }
    catch {
        Write-Error-Custom "Python is not available in PATH"
        Log-Message "ERROR" "Python not found in PATH"
        return $false
    }
}

function Run-Tests {
    param(
        [string]$PythonScriptPath,
        [string]$ModelName,
        [int]$NumPasses
    )
    
    Write-Section-Header "Test Execution"
    
    if (-not (Test-Path $PythonScriptPath)) {
        Write-Error-Custom "Python script not found: $PythonScriptPath"
        Log-Message "ERROR" "Python script not found: $PythonScriptPath"
        return $false
    }
    
    Write-Info "Running tests with model: $ModelName"
    Write-Info "Number of passes: $NumPasses"
    Write-Info "Endpoint: $Endpoint"
    Write-Info "Results directory: $RESULTS_DIR"
    Log-Message "INFO" "Starting test execution: Model=$ModelName, Passes=$NumPasses"
    
    try {
        $pythonCmd = "python"
        
        for ($pass = 1; $pass -le $NumPasses; $pass++) {
            Write-Host ""
            Write-Info "Running test pass $pass of $NumPasses"
            Log-Message "INFO" "Starting test pass $pass of $NumPasses"
            
            # Build command
            $arguments = @(
                $PythonScriptPath,
                "--model", $ModelName,
                "--endpoint", $Endpoint,
                "--output-dir", $RESULTS_DIR
            )
            
            # Add pass suffix if multiple passes
            if ($NumPasses -gt 1) {
                $arguments += "--pass", $pass.ToString()
            }
            
            Write-Progress -Activity "Running Tests" `
                          -Status "Pass $pass of $NumPasses" `
                          -PercentComplete (($pass - 1) / $NumPasses * 100)
            
            # Run test
            $startTime = Get-Date
            & $pythonCmd @arguments 2>&1 | Tee-Object -FilePath (Join-Path $RESULTS_DIR "pass_$pass.log") | ForEach-Object {
                Write-Host $_
                Log-Message "TEST" $_
            }
            
            if ($LASTEXITCODE -ne 0) {
                Write-Warning-Custom "Test pass $pass failed with exit code $LASTEXITCODE"
                Log-Message "WARNING" "Test pass $pass failed with exit code $LASTEXITCODE"
            } else {
                $duration = ((Get-Date) - $startTime).TotalSeconds
                Write-Success "Test pass $pass completed in $('{0:F1}' -f $duration) seconds"
                Log-Message "SUCCESS" "Test pass $pass completed successfully in $([Math]::Floor($duration))s"
            }
        }
        
        Write-Progress -Activity "Running Tests" -Completed
        Write-Host ""
        Write-Success "All test passes completed"
        Log-Message "SUCCESS" "All test passes completed successfully"
        return $true
    }
    catch {
        Write-Error-Custom "Test execution failed: $_"
        Log-Message "ERROR" "Test execution failed: $_"
        return $false
    }
}

################################################################################
# HELP & SUMMARY
################################################################################

function Show-Help {
    Write-Host @"
Loki's Lab V3 Test Harness - Windows PowerShell Edition v$SCRIPT_VERSION

USAGE: .\\v3_test_harness.ps1 [OPTIONS]

OPTIONS:
    -Model MODEL_NAME       Manually specify model (qwen3.5:4b, qwen3.6:latest, qwen3.8:27b, qwen3.8-flash-next)
    -NumPasses N           Number of test passes (default: 1)
    -Endpoint URL          Ollama endpoint (default: http://localhost:11434)
    -PythonScript PATH     Path to run_matrix.py (default: auto-detect)
    -Help                  Show this help message

EXAMPLES:
    # Auto-detect GPU, select model, download, and run single test pass
    .\\v3_test_harness.ps1
    
    # Use specific model with 3 test passes
    .\\v3_test_harness.ps1 -Model "qwen3.8:27b" -NumPasses 3
    
    # Custom endpoint and Python script
    .\\v3_test_harness.ps1 -Endpoint "http://192.168.1.100:11434" -PythonScript "C:\\scripts\\run_matrix.py"

HARDWARE DETECTION:
    - Automatically detects NVIDIA GPU (VRAM)
    - Falls back to system RAM if no GPU
    - Selects optimal model based on available resources

MODEL SELECTION LOGIC:
    >= 75GB   → qwen3.8-flash-next (125B parameters, 6B active)
    >= 35GB   → qwen3.8:27b (27B parameters)
    >= 25GB   → qwen3.6:latest (22B parameters)
    >= 8GB    → qwen3.5:4b (4B parameters, fastest)
    < 8GB     → Error (insufficient resources)

FEATURES:
    ✓ Smart VRAM detection for NVIDIA GPUs
    ✓ Automatic model selection based on hardware
    ✓ Model download via Ollama
    ✓ Test execution via run_matrix.py
    ✓ Windows-native path handling (%APPDATA%, backslashes)
    ✓ Progress bars (Write-Progress)
    ✓ Comprehensive logging to $LOG_FILE

REQUIREMENTS:
    Windows 10+, PowerShell 5.0+, Ollama, Python 3.8+

OUTPUT:
    Results: $RESULTS_DIR
    Logs: $LOG_FILE

"@
}

function Show-Summary {
    param([hashtable]$Results)
    
    Write-Section-Header "EXECUTION SUMMARY"
    
    Write-Host "╔════════════════════════════════════════════════════════════╗"
    Write-Host "║ HARDWARE CONFIGURATION" -ForegroundColor Cyan
    Write-Host "╠════════════════════════════════════════════════════════════╣"
    Write-Host "║ GPU Type:         $($script:GPU_TYPE)" -ForegroundColor Cyan
    if ($script:GPU_NAME) {
        Write-Host "║ GPU Model:        $($script:GPU_NAME)" -ForegroundColor Cyan
    }
    if ($script:GPU_TYPE -ne "none") {
        Write-Host "║ VRAM:             $($script:VRAM_GB)GB" -ForegroundColor Cyan
    }
    Write-Host "║ System RAM:       $($script:SYSTEM_RAM_GB)GB" -ForegroundColor Cyan
    Write-Host "║ Endpoint:         $Endpoint" -ForegroundColor Cyan
    Write-Host "║" -ForegroundColor Cyan
    Write-Host "║ EXECUTION DETAILS" -ForegroundColor Cyan
    Write-Host "╠════════════════════════════════════════════════════════════╣"
    Write-Host "║ Selected Model:   $($script:SELECTED_MODEL)" -ForegroundColor Cyan
    if ($script:AUTO_SELECTED) {
        Write-Host "║ Selection:        Auto-detected ✓" -ForegroundColor Cyan
    } else {
        Write-Host "║ Selection:        User-specified" -ForegroundColor Cyan
    }
    Write-Host "║ Test Passes:      $NumPasses" -ForegroundColor Cyan
    Write-Host "║ Start Time:       $($Results.StartTime)" -ForegroundColor Cyan
    Write-Host "║ End Time:         $($Results.EndTime)" -ForegroundColor Cyan
    Write-Host "║ Duration:         $($Results.Duration)" -ForegroundColor Cyan
    Write-Host "║ Status:           $($Results.Status)" -ForegroundColor Cyan
    Write-Host "║" -ForegroundColor Cyan
    Write-Host "║ OUTPUT LOCATIONS" -ForegroundColor Cyan
    Write-Host "╠════════════════════════════════════════════════════════════╣"
    Write-Host "║ Results:          $RESULTS_DIR" -ForegroundColor Cyan
    Write-Host "║ Logs:             $LOG_FILE" -ForegroundColor Cyan
    Write-Host "║ Cache:            $CACHE_DIR" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝"
    Write-Host ""
}

################################################################################
# MAIN
################################################################################

function Main {
    $startTime = Get-Date
    
    # Initialize logging first
    Initialize-Logging
    
    # Show header
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  Loki's Lab V3 Test Harness v$SCRIPT_VERSION" -ForegroundColor Cyan
    Write-Host "║  Windows PowerShell Edition" -ForegroundColor Cyan
    Write-Host "║  Smart Model Selection | GPU Auto-Detection | Full Automation" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    Log-Message "INFO" "Script started with parameters:"
    Log-Message "INFO" "  Model: $(if ($Model) { $Model } else { 'auto-detect' })"
    Log-Message "INFO" "  NumPasses: $NumPasses"
    Log-Message "INFO" "  Endpoint: $Endpoint"
    
    # Handle help
    if ($Help) {
        Show-Help
        exit 0
    }
    
    # Detect hardware
    Detect-GPU-And-VRAM
    
    # Select best model
    Select-Best-Model
    
    if (-not $script:SELECTED_MODEL) {
        Write-Error-Custom "No model selected. Aborting."
        Log-Message "ERROR" "Model selection failed"
        exit 1
    }
    
    # Check Ollama availability
    if (-not (Check-Ollama-Available)) {
        Write-Error-Custom "Cannot proceed without Ollama"
        Log-Message "ERROR" "Ollama not available"
        exit $ERR_OLLAMA_UNAVAILABLE
    }
    
    # Download model if needed
    if (-not (Check-Model-Downloaded $script:SELECTED_MODEL)) {
        if (-not (Download-Model $script:SELECTED_MODEL)) {
            Write-Error-Custom "Failed to download model"
            Log-Message "ERROR" "Model download failed"
            exit $ERR_MODEL_NOT_AVAILABLE
        }
    }
    
    # Check Python availability and find script
    if (-not (Check-Python-Available)) {
        Write-Error-Custom "Cannot proceed without Python"
        Log-Message "ERROR" "Python not available"
        exit $ERR_PYTHON_UNAVAILABLE
    }
    
    $pythonScriptPath = Find-Python-Script "run_matrix.py"
    if (-not $pythonScriptPath) {
        Write-Error-Custom "run_matrix.py not found. Specify with -PythonScript parameter."
        Log-Message "ERROR" "run_matrix.py not found"
        exit $ERR_PYTHON_UNAVAILABLE
    }
    
    Write-Success "Found run_matrix.py at: $pythonScriptPath"
    
    # Run tests
    $testResult = Run-Tests $pythonScriptPath $script:SELECTED_MODEL $NumPasses
    
    # Generate summary
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    $results = @{
        StartTime = $startTime.ToString("yyyy-MM-dd HH:mm:ss")
        EndTime   = $endTime.ToString("yyyy-MM-dd HH:mm:ss")
        Duration  = "{0:hh\:mm\:ss}" -f $duration
        Status    = if ($testResult) { "✓ Completed" } else { "✗ Failed" }
    }
    
    Show-Summary $results
    
    Log-Message "INFO" "Script completed. Status: $($results.Status)"
    Log-Message "INFO" "Total duration: $($results.Duration)"
    
    Write-Success "Full log saved to: $LOG_FILE"
    
    # Exit with appropriate code
    exit (if ($testResult) { 0 } else { 1 })
}

# Run main
Main
