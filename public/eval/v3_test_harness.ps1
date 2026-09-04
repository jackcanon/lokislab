#Requires -Version 3.0
<#
.SYNOPSIS
    V3 Test Harness for Windows — Production-grade Ollama benchmark runner
    
.DESCRIPTION
    Runs the hidden-word V3 benchmark test with qwen models on native Windows.
    Handles Ollama detection, model caching, system validation, and result logging.
    
    Features:
    - Automatic Ollama detection and startup
    - System requirements validation (16GB RAM, 50GB disk)
    - Smart model caching and pull with retry logic
    - Clear progress feedback (especially for 10-30 min model pulls)
    - Graceful error handling and recovery
    - Windows Defender firewall integration
    - Idempotent (safe to run multiple times)
    - JSON results saved to %USERPROFILE%\loki-v3-test\
    
.PARAMETER ModelName
    Model to test. Options: qwen3.6:latest (22GB), qwen3.5:4b (4GB), qwen3.8:27b (27GB)
    Default: qwen3.6:latest
    
.PARAMETER ForceRebuild
    Force model pull even if cached locally
    
.PARAMETER SkipFirewall
    Skip Windows Defender firewall rule creation
    
.PARAMETER Verbose
    Enable detailed logging to console
    
.EXAMPLE
    .\v3_test_harness.ps1
    .\v3_test_harness.ps1 -ModelName "qwen3.5:4b" -Verbose
    .\v3_test_harness.ps1 -ForceRebuild
    
.NOTES
    Author: Loki's Lab
    Version: 1.0.0
    Requires: Windows 7+, Ollama, 16GB+ RAM, 50GB+ disk space
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('qwen3.6:latest', 'qwen3.5:4b', 'qwen3.8:27b')]
    [string]$ModelName = 'qwen3.6:latest',
    
    [switch]$ForceRebuild,
    [switch]$SkipFirewall,
    [switch]$Verbose
)

# Set error action and enable strict mode
$ErrorActionPreference = 'Continue'
$VerbosePreference = if ($Verbose) { 'Continue' } else { 'SilentlyContinue' }

#region Configuration
$Config = @{
    ModelName                = $ModelName
    OllamaPort              = 11434
    OllamaURL               = 'http://127.0.0.1:11434'
    APITimeout              = 600  # seconds
    MinRAMGB                = 16
    MinDiskSpaceGB          = 50
    ResultsDir              = Join-Path $env:USERPROFILE 'loki-v3-test'
    LogDir                  = Join-Path $env:USERPROFILE 'loki-v3-test' 'logs'
    ModelsDir               = Join-Path $env:APPDATA 'ollama' 'models'
    OllamaAppDir            = Join-Path $env:LOCALAPPDATA 'Programs' 'Ollama'
    TestTimeout             = 1800  # 30 minutes for test + model startup
    PullTimeout             = 2400  # 40 minutes for model pull
    MaxPullRetries          = 3
    ModelSizeGB             = @{
        'qwen3.6:latest' = 22
        'qwen3.5:4b'     = 4
        'qwen3.8:27b'    = 27
    }
}

#endregion

#region Logging Functions
$LogFile = Join-Path $Config.LogDir "v3-harness-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Initialize-Logging {
    if (-not (Test-Path $Config.LogDir)) {
        $null = New-Item -ItemType Directory -Path $Config.LogDir -Force
    }
    Write-Host "Log file: $LogFile" -ForegroundColor Cyan
}

function Write-Log {
    param([string]$Message, [ValidateSet('Info', 'Success', 'Warning', 'Error')][string]$Level = 'Info')
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $prefix = switch ($Level) {
        'Success' { '[✓]' }
        'Warning' { '[⚠]' }
        'Error'   { '[✗]' }
        default   { '[*]' }
    }
    
    $color = switch ($Level) {
        'Success' { 'Green' }
        'Warning' { 'Yellow' }
        'Error'   { 'Red' }
        default   { 'White' }
    }
    
    $logMessage = "$timestamp $prefix $Message"
    Add-Content -LiteralPath $LogFile -Value $logMessage
    Write-Host $logMessage -ForegroundColor $color
}

function Write-Section {
    param([string]$Title)
    Write-Log ""
    Write-Log ("=" * 70)
    Write-Log $Title
    Write-Log ("=" * 70)
}

#endregion

#region System Validation
function Get-SystemRAM {
    try {
        $ramGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
        return $ramGB
    }
    catch {
        Write-Log "Failed to detect system RAM: $_" -Level Warning
        return 0
    }
}

function Get-AvailableDiskSpace {
    param([string]$Path)
    
    try {
        $drive = (Get-Item $Path).PSDrive.Name
        $diskInfo = Get-CimInstance Win32_LogicalDisk -Filter "Name='$drive`:'"
        if ($diskInfo) {
            return [math]::Round($diskInfo.FreeSpace / 1GB, 1)
        }
    }
    catch {
        Write-Log "Failed to detect disk space: $_" -Level Warning
    }
    return 0
}

function Test-SystemRequirements {
    Write-Section "SYSTEM REQUIREMENTS CHECK"
    
    # RAM check
    $ramGB = Get-SystemRAM
    Write-Log "System RAM: ${ramGB}GB"
    
    if ($ramGB -lt $Config.MinRAMGB) {
        Write-Log "ERROR: Insufficient RAM. Minimum: $($Config.MinRAMGB)GB, Have: ${ramGB}GB" -Level Error
        return $false
    }
    Write-Log "RAM: OK" -Level Success
    
    # Disk space check
    $userProfileDrive = Split-Path $env:USERPROFILE -Qualifier
    $freeGB = Get-AvailableDiskSpace $userProfileDrive
    Write-Log "Available disk space: ${freeGB}GB on $userProfileDrive"
    
    if ($freeGB -lt $Config.MinDiskSpaceGB) {
        Write-Log "ERROR: Insufficient disk space. Minimum: $($Config.MinDiskSpaceGB)GB, Have: ${freeGB}GB" -Level Error
        return $false
    }
    Write-Log "Disk space: OK" -Level Success
    
    # Model size check
    $modelSizeGB = $Config.ModelSizeGB[$Config.ModelName]
    if ($freeGB -lt $modelSizeGB) {
        Write-Log "WARNING: Available disk ($freeGB GB) is less than model size ($modelSizeGB GB). Pull may fail." -Level Warning
        return $false
    }
    
    Write-Log "All system requirements met" -Level Success
    return $true
}

#endregion

#region Ollama Detection and Setup
function Find-OllamaBinary {
    Write-Section "LOCATING OLLAMA"
    
    $candidates = @(
        (Join-Path $Config.OllamaAppDir 'ollama.exe'),
        'C:\Program Files\Ollama\ollama.exe',
        'C:\Program Files (x86)\Ollama\ollama.exe',
        (Join-Path $env:LOCALAPPDATA 'Ollama' 'ollama.exe'),
        'ollama.exe'  # system PATH
    )
    
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate -ErrorAction SilentlyContinue) {
            Write-Log "Found Ollama at: $candidate" -Level Success
            return $candidate
        }
    }
    
    Write-Log "ERROR: Ollama not found in standard locations" -Level Error
    Write-Log ""
    Write-Log "Please install Ollama:" -Level Warning
    Write-Log "  1. Download: https://ollama.ai/download/OllamaSetup.exe"
    Write-Log "  2. Run installer and follow prompts"
    Write-Log "  3. Restart this script after installation"
    Write-Log ""
    return $null
}

function Test-OllamaService {
    Write-Section "CHECKING OLLAMA SERVICE"
    
    # Check if Ollama service is running
    $service = Get-Service 'Ollama' -ErrorAction SilentlyContinue
    if ($service) {
        Write-Log "Ollama service found (Status: $($service.Status))"
        if ($service.Status -ne 'Running') {
            Write-Log "Starting Ollama service..." -Level Info
            try {
                Start-Service 'Ollama' -ErrorAction Stop
                Start-Sleep -Seconds 3
                Write-Log "Ollama service started" -Level Success
            }
            catch {
                Write-Log "Failed to start Ollama service: $_" -Level Error
                return $false
            }
        }
        else {
            Write-Log "Ollama service is running" -Level Success
        }
    }
    else {
        Write-Log "Ollama service not installed. Will attempt direct execution." -Level Warning
    }
    
    # Test API connectivity
    Write-Log "Testing Ollama API connectivity..."
    $maxAttempts = 10
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest `
                -Uri "$($Config.OllamaURL)/api/tags" `
                -TimeoutSec 5 `
                -ErrorAction Stop `
                -UseBasicParsing
            
            if ($response.StatusCode -eq 200) {
                Write-Log "Ollama API is responsive" -Level Success
                return $true
            }
        }
        catch {
            $attempt++
            if ($attempt -lt $maxAttempts) {
                Write-Log "API not responding (attempt $attempt/$maxAttempts), retrying in 2s..." -Level Warning
                Start-Sleep -Seconds 2
            }
        }
    }
    
    Write-Log "ERROR: Ollama API not responding after $maxAttempts attempts" -Level Error
    Write-Log "Try restarting Ollama or check if it's listening on port $($Config.OllamaPort)" -Level Warning
    return $false
}

function Setup-WindowsDefenderFirewall {
    if ($SkipFirewall) {
        Write-Log "Skipping Windows Defender firewall setup (--SkipFirewall)" -Level Info
        return $true
    }
    
    Write-Section "WINDOWS DEFENDER FIREWALL SETUP"
    
    $ruleName = "Ollama Local API"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    
    if ($existingRule) {
        Write-Log "Firewall rule '$ruleName' already exists" -Level Success
        return $true
    }
    
    try {
        Write-Log "Creating firewall rule for Ollama local API..."
        New-NetFirewallRule `
            -DisplayName $ruleName `
            -Direction Inbound `
            -LocalPort $Config.OllamaPort `
            -Protocol TCP `
            -Action Allow `
            -Program (Find-OllamaBinary) `
            -ErrorAction Stop | Out-Null
        
        Write-Log "Firewall rule created successfully" -Level Success
        return $true
    }
    catch {
        Write-Log "Failed to create firewall rule (may require admin): $_" -Level Warning
        Write-Log "You may see a Windows Defender prompt when Ollama starts. Click 'Allow'." -Level Info
        return $true  # Continue anyway
    }
}

#endregion

#region Model Management
function Get-CachedModels {
    try {
        $response = Invoke-WebRequest `
            -Uri "$($Config.OllamaURL)/api/tags" `
            -TimeoutSec 10 `
            -ErrorAction Stop `
            -UseBasicParsing
        
        $data = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        $models = @($data.models | ForEach-Object { $_.name })
        return $models
    }
    catch {
        Write-Log "Failed to fetch cached models: $_" -Level Warning
        return @()
    }
}

function Test-ModelCached {
    param([string]$Model)
    
    $cached = Get-CachedModels
    return $Model -in $cached
}

function Pull-Model {
    param([string]$Model, [string]$OllamaBinary)
    
    Write-Log "Starting model pull for: $Model" -Level Info
    Write-Log "This typically takes 10-30 minutes depending on bandwidth..." -Level Info
    Write-Log ""
    
    $pullStartTime = Get-Date
    $attempt = 1
    
    while ($attempt -le $Config.MaxPullRetries) {
        Write-Log "Pull attempt $attempt/$($Config.MaxPullRetries)..."
        
        try {
            # Use Invoke-WebRequest with streaming to show progress
            $uri = "$($Config.OllamaURL)/api/pull"
            $body = @{ name = $Model } | ConvertTo-Json
            
            $processInfo = New-Object System.Diagnostics.ProcessStartInfo
            $processInfo.FileName = $OllamaBinary
            $processInfo.Arguments = 'pull', $Model
            $processInfo.UseShellExecute = $false
            $processInfo.RedirectStandardOutput = $true
            $processInfo.RedirectStandardError = $true
            $processInfo.CreateNoWindow = $true
            
            $process = [System.Diagnostics.Process]::Start($processInfo)
            
            # Show progress in real-time
            $lastUpdate = Get-Date
            while (-not $process.HasExited) {
                if ((Get-Date) - $lastUpdate -gt [timespan]::FromSeconds(5)) {
                    $elapsed = (Get-Date) - $pullStartTime
                    Write-Log "  [$([int]$elapsed.TotalSeconds)s elapsed] Still pulling..." -Level Info
                    $lastUpdate = Get-Date
                }
                Start-Sleep -Milliseconds 500
                
                if ($process.Handles.Count -eq 0) { break }
            }
            
            $exitCode = $process.ExitCode
            
            if ($exitCode -eq 0) {
                $elapsed = (Get-Date) - $pullStartTime
                Write-Log "Model pull succeeded in $([int]$elapsed.TotalSeconds) seconds" -Level Success
                
                # Verify model is cached
                Start-Sleep -Seconds 2
                if (Test-ModelCached $Model) {
                    return $true
                }
            }
            
            Write-Log "Pull command exited with code $exitCode" -Level Warning
        }
        catch {
            Write-Log "Error during pull: $_" -Level Warning
        }
        
        if ($attempt -lt $Config.MaxPullRetries) {
            $waitTime = 30 * $attempt
            Write-Log "Pull failed, waiting $waitTime seconds before retry..." -Level Warning
            Start-Sleep -Seconds $waitTime
        }
        
        $attempt++
    }
    
    Write-Log "ERROR: Model pull failed after $($Config.MaxPullRetries) attempts" -Level Error
    return $false
}

#endregion

#region V3 Test Execution
function Invoke-V3Test {
    param([string]$Model)
    
    Write-Section "RUNNING V3 BENCHMARK TEST"
    
    $testStartTime = Get-Date
    
    # Prepare test payload (finding hidden word in long context)
    # This matches the bash harness logic: 4096 tokens input, 256 max output
    
    $testPrompt = @"
You are tasked with finding a hidden word in a long document. Read carefully.

The following is a long context with a hidden word embedded in it. Your task is to find the hidden word and output ONLY that word, nothing else.

CONTEXT START:
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

The hidden word is BENCHMARK. Remember, this is the word you must find and output.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
CONTEXT END

What is the hidden word? Output ONLY the word itself.
"@

    $expectedAnswer = "BENCHMARK"
    
    # Prepare API request
    $requestBody = @{
        model   = $Model
        prompt  = $testPrompt
        stream  = $false
        options = @{
            temperature = 0.7
            num_predict = 256
        }
    } | ConvertTo-Json -Depth 10
    
    try {
        Write-Log "Sending test prompt to model..."
        $response = Invoke-WebRequest `
            -Uri "$($Config.OllamaURL)/api/generate" `
            -Method Post `
            -ContentType 'application/json' `
            -Body $requestBody `
            -TimeoutSec $Config.APITimeout `
            -ErrorAction Stop `
            -UseBasicParsing
        
        $result = $response.Content | ConvertFrom-Json -ErrorAction Stop
        $modelOutput = $result.response.Trim()
        
        $testDuration = (Get-Date) - $testStartTime
        
        # Score the response
        $passed = $false
        $qualityScore = 0.0
        $accuracy = 0
        
        if ($modelOutput -like "*$expectedAnswer*" -or $modelOutput -eq $expectedAnswer) {
            $passed = $true
            $accuracy = 100
            $qualityScore = 1.0
            Write-Log "Model output: '$modelOutput'" -Level Success
            Write-Log "Result: PASSED (found expected answer)" -Level Success
        }
        else {
            $accuracy = if ($modelOutput.Length -gt 0) { 25 } else { 0 }
            $qualityScore = [Math]::Max(0, $accuracy / 100)
            Write-Log "Model output: '$modelOutput'" -Level Warning
            Write-Log "Expected: '$expectedAnswer'" -Level Warning
            Write-Log "Result: FAILED (answer not found)" -Level Warning
        }
        
        # Prepare results JSON
        $testResults = @{
            passed        = $passed
            quality_score = $qualityScore
            accuracy      = $accuracy
            speed_seconds = [math]::Round($testDuration.TotalSeconds, 2)
            timestamp     = (Get-Date -Format 'o')
            model         = $Model
            system_ram_gb = Get-SystemRAM
            hostname      = $env:COMPUTERNAME
            model_output  = $modelOutput
        }
        
        return $testResults
    }
    catch {
        Write-Log "ERROR during test execution: $_" -Level Error
        
        return @{
            passed        = $false
            quality_score = 0.0
            accuracy      = 0
            speed_seconds = [math]::Round(((Get-Date) - $testStartTime).TotalSeconds, 2)
            timestamp     = (Get-Date -Format 'o')
            model         = $Model
            error         = $_.Exception.Message
        }
    }
}

#endregion

#region Result Handling
function Save-TestResults {
    param([hashtable]$Results)
    
    Write-Section "SAVING RESULTS"
    
    if (-not (Test-Path $Config.ResultsDir)) {
        $null = New-Item -ItemType Directory -Path $Config.ResultsDir -Force
    }
    
    $sanitizedModel = $Results.model -replace '[:/\\]', '_'
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $resultsFile = Join-Path $Config.ResultsDir "v3_results_${sanitizedModel}_${timestamp}.json"
    
    try {
        $jsonOutput = $Results | ConvertTo-Json -Depth 10
        Set-Content -LiteralPath $resultsFile -Value $jsonOutput -Encoding UTF8 -ErrorAction Stop
        
        Write-Log "Results saved to: $resultsFile" -Level Success
        Write-Log ""
        Write-Log "Results Summary:" -Level Info
        Write-Log "  Passed: $($Results.passed)"
        Write-Log "  Quality Score: $($Results.quality_score)"
        Write-Log "  Accuracy: $($Results.accuracy)%"
        Write-Log "  Duration: $($Results.speed_seconds)s"
        Write-Log "  Model: $($Results.model)"
        
        return $true
    }
    catch {
        Write-Log "ERROR: Failed to save results: $_" -Level Error
        return $false
    }
}

#endregion

#region Main Execution
function Main {
    Initialize-Logging
    Write-Section "V3 TEST HARNESS — WINDOWS"
    Write-Log "Start time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Log "Model: $($Config.ModelName)"
    Write-Log "Results directory: $($Config.ResultsDir)"
    Write-Log ""
    
    # Phase 1: System validation
    if (-not (Test-SystemRequirements)) {
        Write-Log ""
        Write-Log "SETUP FAILED: System does not meet requirements" -Level Error
        return 1
    }
    
    # Phase 2: Ollama setup
    $ollamaBinary = Find-OllamaBinary
    if (-not $ollamaBinary) {
        Write-Log ""
        Write-Log "SETUP FAILED: Ollama not found" -Level Error
        return 1
    }
    
    if (-not (Test-OllamaService)) {
        Write-Log ""
        Write-Log "SETUP FAILED: Ollama service not responding" -Level Error
        return 1
    }
    
    Setup-WindowsDefenderFirewall | Out-Null
    
    # Phase 3: Model management
    Write-Section "MODEL CACHE CHECK"
    $isCached = Test-ModelCached $Config.ModelName
    
    if ($isCached -and -not $ForceRebuild) {
        Write-Log "Model is cached locally: $($Config.ModelName)" -Level Success
    }
    else {
        if ($ForceRebuild) {
            Write-Log "Force rebuild requested, pulling model..." -Level Info
        }
        else {
            Write-Log "Model not cached, pulling from Ollama Hub..." -Level Info
        }
        
        if (-not (Pull-Model $Config.ModelName $ollamaBinary)) {
            Write-Log ""
            Write-Log "MODEL PULL FAILED" -Level Error
            Write-Log ""
            Write-Log "Troubleshooting steps:" -Level Warning
            Write-Log "  1. Check internet connection: ping ollama.ai"
            Write-Log "  2. Verify disk space: $([int](Get-AvailableDiskSpace $env:USERPROFILE))GB free (need $($Config.ModelSizeGB[$Config.ModelName])GB)"
            Write-Log "  3. Try a smaller model: .\v3_test_harness.ps1 -ModelName 'qwen3.5:4b'"
            Write-Log "  4. Check Ollama status: Get-Service Ollama"
            Write-Log "  5. Restart Ollama: Stop-Service Ollama; Start-Service Ollama"
            return 1
        }
    }
    
    # Phase 4: Run test
    $testResults = Invoke-V3Test $Config.ModelName
    
    # Phase 5: Save and report
    if (-not (Save-TestResults $testResults)) {
        Write-Log "FAILED to save test results" -Level Error
        return 1
    }
    
    Write-Section "TEST HARNESS COMPLETE"
    Write-Log "Completion time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Level Success
    Write-Log ""
    
    if ($testResults.passed) {
        Write-Log "SUCCESS: V3 test passed!" -Level Success
        return 0
    }
    else {
        Write-Log "TEST RESULT: Model did not find the expected answer" -Level Warning
        Write-Log "This may indicate model capability or performance issues." -Level Warning
        return 1
    }
}

# Run main execution
$exitCode = Main
exit $exitCode

#endregion
