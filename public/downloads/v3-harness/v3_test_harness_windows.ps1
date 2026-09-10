powershell -NoProfile -ExecutionPolicy Bypass -Command "& {
$SCRIPT_VERSION = '3.3.0-bulletproof'

# Check admin
`$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not `$isAdmin) {
    Write-Host ''
    Write-Host '==========================================' -ForegroundColor Red
    Write-Host 'ERROR: Administrator Required' -ForegroundColor Red
    Write-Host '==========================================' -ForegroundColor Red
    Write-Host ''
    Write-Host 'This script needs Administrator privileges.' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'How to fix:' -ForegroundColor Yellow
    Write-Host '1. Right-click on PowerShell'
    Write-Host '2. Click \"Run as Administrator\"'
    Write-Host '3. Paste this command and press Enter:'
    Write-Host ''
    Write-Host 'powershell -NoProfile -ExecutionPolicy Bypass -Command \"& { iex (New-Object Net.WebClient).DownloadString(''https://raw.githubusercontent.com/jackcanon/lokislab/main/public/downloads/v3-harness/v3_test_harness_windows.ps1'') }\"'
    Write-Host ''
    Write-Host 'Press Enter to close...'
    Read-Host
    exit 1
}

# Auto CD to home
`$userHome = `$env:USERPROFILE
Set-Location `$userHome
Write-Host 'Working directory: '$userHome -ForegroundColor Gray

`$ErrorActionPreference = 'Continue'

# Paths
`$RESULTS_DIR = Join-Path `$userHome 'loki-v3-test'
`$LOG_FILE = Join-Path `$RESULTS_DIR ('harness-' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.log')

# Create results directory
if (!(Test-Path `$RESULTS_DIR)) {
    New-Item -ItemType Directory -Path `$RESULTS_DIR -Force | Out-Null
}

# Logging
function Log-Message {
    param([string]`$Message)
    `$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    `$logLine = \"[`$timestamp] `$Message\"
    Write-Host `$logLine
    Add-Content -Path `$LOG_FILE -Value `$logLine
}

function Write-Status-Success {
    param([string]`$Message)
    Write-Host '[OK] '$Message -ForegroundColor Green
    Log-Message '[SUCCESS] '$Message
}

function Write-Status-Error {
    param([string]`$Message)
    Write-Host '[ERROR] '$Message -ForegroundColor Red
    Log-Message '[ERROR] '$Message
}

function Write-Status-Info {
    param([string]`$Message)
    Write-Host '[INFO] '$Message -ForegroundColor Cyan
    Log-Message '[INFO] '$Message
}

function Write-Status-Warn {
    param([string]`$Message)
    Write-Host '[WARN] '$Message -ForegroundColor Yellow
    Log-Message '[WARN] '$Message
}

# Header
Write-Host ''
Write-Host '========================================'
Write-Host 'Loki'''s Lab V3 Test Harness v'`$SCRIPT_VERSION
Write-Host 'Windows Edition - Fully Automatic'
Write-Host '========================================'
Write-Host ''

Log-Message 'Starting V3 Test Harness v'`$SCRIPT_VERSION
Log-Message 'Results directory: '`$RESULTS_DIR
Log-Message 'Log file: '`$LOG_FILE
Log-Message 'User: '`$env:USERNAME' on '`$env:COMPUTERNAME

# 0. CHECK AND INSTALL OLLAMA
Write-Status-Info 'Checking Ollama...'

`$ollamaInstalled = `$false
`$ollamaPath = `$null

try {
    `$ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
    if (`$ollamaCmd) {
        `$ollamaInstalled = `$true
        `$ollamaPath = `$ollamaCmd.Source
        Write-Status-Success 'Ollama found in PATH'
    }
} catch {}

if (!`$ollamaInstalled) {
    `$commonPaths = @(
        'C:\Users\'`$env:USERNAME'\AppData\Local\Programs\Ollama\ollama.exe',
        'C:\Program Files\Ollama\ollama.exe',
        'C:\Program Files (x86)\Ollama\ollama.exe'
    )
    
    foreach (`$path in `$commonPaths) {
        if (Test-Path `$path) {
            `$ollamaInstalled = `$true
            `$ollamaPath = `$path
            Write-Status-Success 'Ollama found at: '`$path
            break
        }
    }
}

if (!`$ollamaInstalled) {
    Write-Status-Warn 'Ollama not installed. Auto-installing...'
    Write-Status-Info 'Downloading Ollama installer (this takes 2-5 minutes)...'
    
    `$installerPath = Join-Path `$env:TEMP 'OllamaSetup.exe'
    
    try {
        Invoke-WebRequest -Uri 'https://ollama.ai/download/OllamaSetup.exe' -OutFile `$installerPath -ErrorAction Stop
        Write-Status-Success 'Downloaded Ollama installer'
        
        Write-Status-Info 'Running installer (window may not appear)...'
        Log-Message 'Executing Ollama installer'
        `$process = Start-Process -FilePath `$installerPath -ArgumentList '/S' -PassThru -Wait
        
        Write-Status-Info 'Waiting for Ollama to initialize...'
        Start-Sleep -Seconds 15
        
        `$commonPaths | ForEach-Object {
            if ((Test-Path `$_) -and !`$ollamaPath) {
                `$ollamaPath = `$_
                `$ollamaInstalled = `$true
            }
        }
        
        if (!`$ollamaInstalled) {
            `$ollamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
            if (`$ollamaCmd) {
                `$ollamaInstalled = `$true
                `$ollamaPath = `$ollamaCmd.Source
            }
        }
        
        if (`$ollamaInstalled) {
            Write-Status-Success 'Ollama installed successfully'
        } else {
            throw 'Ollama not found after installation'
        }
    } catch {
        Write-Status-Error 'Failed to install Ollama: '`$_
        Write-Status-Info 'Please visit https://ollama.ai and download manually'
        Log-Message 'ERROR: Ollama installation failed: '`$_
        Write-Host ''
        Write-Host 'Press Enter to close...'
        Read-Host
        exit 1
    }
}

# 1. START OLLAMA SERVICE
Write-Status-Info 'Starting Ollama...'

`$ollamaRunning = `$false
`$maxRetries = 30

for (`$i = 0; `$i -lt `$maxRetries; `$i++) {
    try {
        `$test = Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if (`$test.StatusCode -eq 200) {
            `$ollamaRunning = `$true
            Write-Status-Success 'Ollama is running'
            break
        }
    } catch {}
    
    if (`$i -eq 0) {
        Write-Status-Info 'Launching Ollama service...'
        try {
            if (`$ollamaPath) {
                Start-Process -FilePath `$ollamaPath -WindowStyle Hidden -ErrorAction SilentlyContinue
            } else {
                & ollama serve 2>&1 | Out-Null &
            }
        } catch {}
    }
    
    if (!`$ollamaRunning) {
        Write-Host '[WAIT] Ollama starting... ('`$i'/'`$maxRetries')' -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}

if (!`$ollamaRunning) {
    Write-Status-Error 'Ollama failed to start'
    Write-Status-Info 'Try restarting your computer and running this script again'
    Log-Message 'ERROR: Ollama startup timeout'
    Write-Host ''
    Write-Host 'Press Enter to close...'
    Read-Host
    exit 1
}

# 2. DETECT HARDWARE
Write-Status-Info 'Detecting hardware...'

`$GPU_NAME = 'None'
`$VRAM_GB = 0
`$SYSTEM_RAM_GB = 0

try {
    `$nvidia = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue | Where-Object { `$_.Name -match 'NVIDIA' } | Select-Object -First 1
    if (`$nvidia) {
        `$GPU_NAME = `$nvidia.Name
        Write-Status-Success 'GPU: '`$GPU_NAME
        
        try {
            `$nvidiaSmi = & nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader 2>null | Select-Object -First 1
            if (`$nvidiaSmi) {
                `$VRAM_GB = [int](`$nvidiaSmi / 1024)
                Write-Status-Success 'VRAM: '`$VRAM_GB'GB'
            }
        } catch {
            Write-Status-Warn 'Could not query exact VRAM'
        }
    } else {
        Write-Status-Info 'No NVIDIA GPU - will use CPU'
    }
} catch {
    Write-Status-Warn 'GPU detection: '`$_
}

try {
    `$osInfo = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue
    if (`$osInfo) {
        `$SYSTEM_RAM_GB = [int](`$osInfo.TotalVisibleMemorySize / 1MB)
        Write-Status-Success 'System RAM: '`$SYSTEM_RAM_GB'GB'
    }
} catch {
    `$SYSTEM_RAM_GB = 8
}

# 3. SELECT MODEL
Write-Status-Info 'Selecting model...'

`$SELECTED_MODEL = 'qwen3.5:4b'

if (`$VRAM_GB -ge 75) {
    `$SELECTED_MODEL = 'qwen3.8-flash-next'
    Write-Status-Success 'Model: '`$SELECTED_MODEL' (125B)'
} elseif (`$VRAM_GB -ge 35) {
    `$SELECTED_MODEL = 'qwen3.8:27b'
    Write-Status-Success 'Model: '`$SELECTED_MODEL' (27B)'
} elseif (`$VRAM_GB -ge 25) {
    `$SELECTED_MODEL = 'qwen3.6:latest'
    Write-Status-Success 'Model: '`$SELECTED_MODEL' (12B)'
} elseif (`$SYSTEM_RAM_GB -ge 16) {
    Write-Status-Success 'Model: '`$SELECTED_MODEL' (4B)'
} else {
    Write-Status-Warn 'Low memory - will attempt with 4B model'
}

# 4. DOWNLOAD MODEL
Write-Status-Info 'Downloading model: '`$SELECTED_MODEL
Write-Status-Info 'This may take 5-30 minutes (computer may appear unresponsive - normal)'
Write-Host ''

Log-Message 'Downloading model: '`$SELECTED_MODEL

try {
    & ollama pull `$SELECTED_MODEL 2>&1 | ForEach-Object {
        Write-Host `$_
        Log-Message `$_
    }
    Write-Status-Success 'Model download complete'
} catch {
    Write-Status-Error 'Model download failed: '`$_
    Log-Message 'ERROR: Model download failed: '`$_
    Write-Host ''
    Write-Host 'Press Enter to close...'
    Read-Host
    exit 1
}

# 5. SUMMARY
Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host 'Ready for V3 Testing!' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host 'GPU: '`$GPU_NAME
Write-Host 'VRAM: '`$VRAM_GB'GB'
Write-Host 'System RAM: '`$SYSTEM_RAM_GB'GB'
Write-Host 'Model: '`$SELECTED_MODEL
Write-Host 'Ollama: Running'
Write-Host 'Results: '`$RESULTS_DIR
Write-Host '========================================' -ForegroundColor Green
Write-Host ''

Write-Status-Success 'All systems ready!'
Write-Status-Info 'Visit https://lokislab.org/test to run the benchmark'

Write-Host ''
Write-Host 'Press Enter to close...'
Read-Host
}"
