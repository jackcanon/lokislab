#!/bin/bash

################################################################################
# v3_test_harness.sh - Production-Grade Linux Benchmark Harness
# GPU Auto-Detection | Resource Validation | Graceful Error Recovery
#
# Purpose: Run Loki V3 long-context reasoning benchmark with comprehensive
#          GPU/CPU detection, progress feedback, and idempotent execution.
#
# Usage: ./v3_test_harness.sh [--model qwen3.5:4b|qwen3.6:latest|qwen3.8:27b]
#        ./v3_test_harness.sh --help
#
# Tested on: Ubuntu 20.04+, Debian 11+
# Requirements: bash 4+, curl, jq, ollama
################################################################################

set -o pipefail

# Script metadata
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$HOME/loki-v3-test"
CACHE_DIR="$HOME/.ollama"
LOG_FILE="$RESULTS_DIR/harness.log"

# Default model
DEFAULT_MODEL="qwen3.5:4b"
SELECTED_MODEL="${DEFAULT_MODEL}"

# GPU detection state
GPU_TYPE="none"  # none, nvidia, amd, intel
GPU_DRIVER=""
CUDA_VERSION=""
ROCM_VERSION=""
DETECTED_MEMORY_GB=0
DETECTED_DISK_GB=0

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timeout values (seconds)
OLLAMA_CONNECT_TIMEOUT=5
OLLAMA_RESPONSE_TIMEOUT=300
MODEL_PULL_TIMEOUT=3600
TEST_TIMEOUT=600

# Error codes
ERR_GPU_UNAVAILABLE=10
ERR_CUDA_INCOMPATIBLE=11
ERR_ROCM_INCOMPATIBLE=12
ERR_OLLAMA_NOT_INSTALLED=20
ERR_OLLAMA_UNREACHABLE=21
ERR_INSUFFICIENT_RAM=30
ERR_INSUFFICIENT_DISK=31
ERR_MODEL_PULL_FAILED=40
ERR_MODEL_PULL_TIMEOUT=41
ERR_NETWORK_TIMEOUT=50
ERR_TEST_FAILED=60

################################################################################
# UTILITY FUNCTIONS
################################################################################

# Log message with timestamp
log() {
    local level="$1"
    shift
    local msg="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${msg}" | tee -a "$LOG_FILE"
}

# Print status with color
status_info() {
    echo -e "${BLUE}ℹ${NC} $@"
    log "INFO" "$@"
}

status_success() {
    echo -e "${GREEN}✓${NC} $@"
    log "SUCCESS" "$@"
}

status_warning() {
    echo -e "${YELLOW}⚠${NC} $@"
    log "WARNING" "$@"
}

status_error() {
    echo -e "${RED}✗${NC} $@"
    log "ERROR" "$@"
}

# Print header
print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $@"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Print footer
print_footer() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Verbose debug output (only if DEBUG=1)
debug() {
    if [[ "${DEBUG:-0}" == "1" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $@" >&2
        log "DEBUG" "$@"
    fi
}

# Exit with error message and code
die() {
    local exit_code="$1"
    shift
    status_error "$@"
    exit "$exit_code"
}

# Command exists check
command_exists() {
    command -v "$1" &> /dev/null
}

# Check if command succeeded with timeout
run_with_timeout() {
    local timeout="$1"
    local description="$2"
    shift 2
    
    debug "Running with timeout ${timeout}s: $@"
    timeout "$timeout" "$@"
    local exit_code=$?
    
    if [[ $exit_code -eq 124 ]]; then
        status_error "Timeout after ${timeout}s: ${description}"
        return "$ERR_NETWORK_TIMEOUT"
    fi
    
    return $exit_code
}

# Cleanup function for SIGINT/SIGTERM
cleanup() {
    local exit_code=$?
    echo ""
    status_warning "Caught signal, cleaning up..."
    # Kill any background ollama processes
    pkill -P $$ 2>/dev/null || true
    exit $exit_code
}

trap cleanup SIGINT SIGTERM

################################################################################
# GPU DETECTION FUNCTIONS
################################################################################

# Detect NVIDIA GPU and CUDA
detect_nvidia() {
    debug "Checking for NVIDIA GPU..."
    
    if ! command_exists nvidia-smi; then
        debug "nvidia-smi not found"
        return 1
    fi
    
    local gpu_count
    gpu_count=$(nvidia-smi --query-gpu=count --format=csv,noheader,nounits 2>/dev/null | head -1)
    
    if [[ -z "$gpu_count" || "$gpu_count" -eq 0 ]]; then
        debug "No NVIDIA GPUs detected"
        return 1
    fi
    
    GPU_TYPE="nvidia"
    GPU_DRIVER=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1)
    
    # Extract CUDA version
    if command_exists nvcc; then
        CUDA_VERSION=$(nvcc --version 2>/dev/null | grep -oP 'release \K[0-9.]+' | head -1)
    else
        CUDA_VERSION=$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader 2>/dev/null | head -1)
    fi
    
    status_success "NVIDIA GPU detected"
    status_info "  GPU Driver: ${GPU_DRIVER:-unknown}"
    status_info "  CUDA Version: ${CUDA_VERSION:-unknown}"
    status_info "  GPU Count: ${gpu_count}"
    
    return 0
}

# Detect AMD GPU and ROCm
detect_amd() {
    debug "Checking for AMD GPU..."
    
    if ! command_exists rocm-smi; then
        debug "rocm-smi not found"
        return 1
    fi
    
    local gpu_count
    gpu_count=$(rocm-smi --showid 2>/dev/null | grep -c "GPU")
    
    if [[ $gpu_count -eq 0 ]]; then
        debug "No AMD GPUs detected"
        return 1
    fi
    
    GPU_TYPE="amd"
    ROCM_VERSION=$(rocm-smi --version 2>/dev/null | grep -oP 'ROCm version: \K[0-9.]+' | head -1)
    
    status_success "AMD GPU (ROCm) detected"
    status_info "  ROCm Version: ${ROCM_VERSION:-unknown}"
    status_info "  GPU Count: ${gpu_count}"
    
    return 0
}

# Detect Intel Arc GPU
detect_intel() {
    debug "Checking for Intel Arc GPU..."
    
    # Check for Intel GPU via lspci
    if ! command_exists lspci; then
        debug "lspci not found, skipping Intel Arc detection"
        return 1
    fi
    
    local intel_gpu
    intel_gpu=$(lspci 2>/dev/null | grep -iE "VGA|3D|Display" | grep -i "Intel" | grep -iE "Arc|Data Center GPU")
    
    if [[ -z "$intel_gpu" ]]; then
        debug "No Intel Arc GPU detected"
        return 1
    fi
    
    GPU_TYPE="intel"
    status_success "Intel Arc GPU detected"
    status_info "  Device: ${intel_gpu}"
    
    return 0
}

# Main GPU detection orchestrator
detect_gpu() {
    print_header "GPU Detection"
    
    status_info "Scanning for GPU availability..."
    
    if detect_nvidia; then
        return 0
    elif detect_amd; then
        return 0
    elif detect_intel; then
        return 0
    fi
    
    status_warning "No GPU detected, will use CPU"
    GPU_TYPE="cpu"
    return 0
}

# Validate GPU driver compatibility
validate_gpu_driver() {
    if [[ "$GPU_TYPE" == "none" || "$GPU_TYPE" == "cpu" ]]; then
        status_info "Running on CPU mode, skipping GPU driver validation"
        return 0
    fi
    
    print_header "GPU Driver Validation"
    
    if [[ "$GPU_TYPE" == "nvidia" ]]; then
        if ! command_exists nvidia-smi; then
            die "$ERR_GPU_UNAVAILABLE" "NVIDIA GPU detected but nvidia-smi not found. Install NVIDIA drivers."
        fi
        
        # Check driver version (minimum 450.0 for modern CUDA)
        local driver_version
        driver_version=$(echo "$GPU_DRIVER" | cut -d. -f1)
        if [[ $driver_version -lt 450 ]]; then
            die "$ERR_CUDA_INCOMPATIBLE" "NVIDIA driver version $GPU_DRIVER is too old. Update to 450.0+ for modern CUDA."
        fi
        
        status_success "NVIDIA driver validation passed"
    
    elif [[ "$GPU_TYPE" == "amd" ]]; then
        if ! command_exists rocm-smi; then
            die "$ERR_ROCM_INCOMPATIBLE" "AMD GPU detected but ROCm not installed. Install ROCm for AMD GPU support."
        fi
        
        status_success "AMD ROCm validation passed"
    
    elif [[ "$GPU_TYPE" == "intel" ]]; then
        status_info "Intel Arc GPU detected. Ensure Intel GPU drivers are installed."
    fi
}

################################################################################
# RESOURCE VALIDATION FUNCTIONS
################################################################################

# Check system RAM
check_memory() {
    debug "Checking system memory..."
    
    local mem_kb
    mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    DETECTED_MEMORY_GB=$((mem_kb / 1024 / 1024))
    
    status_info "Detected RAM: ${DETECTED_MEMORY_GB}GB"
    
    if [[ $DETECTED_MEMORY_GB -lt 16 ]]; then
        status_warning "Less than 16GB RAM detected (${DETECTED_MEMORY_GB}GB)"
        status_warning "Performance may be degraded. Consider using smaller models."
    else
        status_success "RAM check passed"
    fi
}

# Check disk space
check_disk_space() {
    debug "Checking disk space..."
    
    local disk_kb
    disk_kb=$(df "$HOME" | awk 'NR==2 {print $4}')
    DETECTED_DISK_GB=$((disk_kb / 1024 / 1024))
    
    status_info "Available disk space in \$HOME: ${DETECTED_DISK_GB}GB"
    
    if [[ $DETECTED_DISK_GB -lt 50 ]]; then
        die "$ERR_INSUFFICIENT_DISK" "Insufficient disk space. Need 50GB+, have ${DETECTED_DISK_GB}GB."
    fi
    
    status_success "Disk space check passed"
}

# Validate system resources
validate_system_resources() {
    print_header "System Resource Validation"
    
    check_memory
    check_disk_space
    
    # CPU core count
    local cpu_cores
    cpu_cores=$(nproc 2>/dev/null || echo "unknown")
    status_info "CPU Cores: ${cpu_cores}"
}

################################################################################
# OLLAMA VALIDATION FUNCTIONS
################################################################################

# Check if Ollama is installed
check_ollama_installed() {
    debug "Checking for Ollama installation..."
    
    if ! command_exists ollama; then
        die "$ERR_OLLAMA_NOT_INSTALLED" \
            "Ollama is not installed or not in PATH. Install from: https://ollama.ai/"
    fi
    
    local ollama_version
    ollama_version=$(ollama --version 2>/dev/null | grep -oP 'ollama version \K[0-9.]+')
    status_success "Ollama installed (version: ${ollama_version:-unknown})"
}

# Check if Ollama service is running and accessible
check_ollama_running() {
    debug "Checking Ollama service connectivity..."
    
    local max_retries=5
    local retry_count=0
    
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -s --max-time "$OLLAMA_CONNECT_TIMEOUT" http://localhost:11434/api/tags &>/dev/null; then
            status_success "Ollama service is running and accessible"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        if [[ $retry_count -lt $max_retries ]]; then
            status_info "Ollama not responding, attempting to start (attempt $retry_count/$max_retries)..."
            ollama serve &>/dev/null &
            sleep 2
        fi
    done
    
    die "$ERR_OLLAMA_UNREACHABLE" \
        "Cannot connect to Ollama at http://localhost:11434. Check if Ollama is running with: ollama serve"
}

# Validate Ollama configuration
validate_ollama() {
    print_header "Ollama Validation"
    
    check_ollama_installed
    check_ollama_running
}

################################################################################
# MODEL MANAGEMENT FUNCTIONS
################################################################################

# Check if model is already pulled
is_model_cached() {
    local model="$1"
    debug "Checking if model $model is cached..."
    
    local models
    models=$(curl -s --max-time "$OLLAMA_CONNECT_TIMEOUT" http://localhost:11434/api/tags 2>/dev/null | \
             jq -r '.models[].name' 2>/dev/null | grep -c "^${model}$")
    
    [[ $models -gt 0 ]]
}

# Download model with progress
pull_model() {
    local model="$1"
    
    if is_model_cached "$model"; then
        status_success "Model $model is already cached"
        return 0
    fi
    
    print_header "Downloading Model: $model"
    status_info "Pulling model (this may take 10-30 minutes)..."
    status_info "Ensure you have stable internet connection"
    
    # Show progress with curl
    local start_time
    start_time=$(date +%s)
    
    local pull_response
    pull_response=$(curl -s --max-time "$MODEL_PULL_TIMEOUT" \
        -X POST http://localhost:11434/api/pull \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$model\", \"stream\": true}" 2>/dev/null)
    
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        die "$ERR_MODEL_PULL_TIMEOUT" "Model pull timeout after $MODEL_PULL_TIMEOUT seconds"
    fi
    
    # Parse progress from streaming response
    local last_status=""
    while IFS= read -r line; do
        local status
        status=$(echo "$line" | jq -r '.status // empty' 2>/dev/null)
        
        if [[ -n "$status" && "$status" != "$last_status" ]]; then
            last_status="$status"
            if [[ "$status" =~ "pulling" ]]; then
                local digest
                digest=$(echo "$line" | jq -r '.digest // empty' 2>/dev/null)
                local completed
                completed=$(echo "$line" | jq -r '.completed // 0' 2>/dev/null)
                local total
                total=$(echo "$line" | jq -r '.total // 0' 2>/dev/null)
                
                if [[ $total -gt 0 ]]; then
                    local percent=$((completed * 100 / total))
                    printf "\r  Progress: %3d%% (%d/%d bytes)" "$percent" "$completed" "$total"
                fi
            fi
        fi
    done <<< "$pull_response"
    echo ""
    
    local end_time
    end_time=$(date +%s)
    local elapsed=$((end_time - start_time))
    
    # Verify model is now available
    if is_model_cached "$model"; then
        status_success "Model $model pulled successfully in ${elapsed}s"
        return 0
    else
        die "$ERR_MODEL_PULL_FAILED" "Model $model failed to pull. Check network and disk space."
    fi
}

################################################################################
# BENCHMARK TEST FUNCTIONS
################################################################################

# Run long-context reasoning test
run_v3_benchmark() {
    local model="$1"
    
    print_header "Running V3 Benchmark Test"
    status_info "Test: Long-context reasoning (find hidden word in 4096 tokens)"
    status_info "Model: $model"
    
    # Test prompt with hidden word
    local hidden_word="BENCHMARK"
    local test_prompt="You are analyzing a long document. Read carefully and find the hidden word at the end.\n\n"
    test_prompt+="The quick brown fox jumps over the lazy dog. This is a test document containing various text. "
    test_prompt+="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "
    test_prompt+="Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. "
    test_prompt+="Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. "
    test_prompt+="Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. "
    test_prompt+="More filler text to increase context length. The document continues with various topics. "
    test_prompt+="Machine learning is transforming industries. Natural language processing enables computers to understand human language. "
    test_prompt+="Deep learning models require significant computational resources. GPU acceleration is essential for training large models. "
    test_prompt+="The future of AI depends on efficient algorithms and accessible tools. Innovation drives progress in technology. "
    test_prompt+="Additional context padding to reach desired token count. This helps test long-context reasoning capabilities. "
    test_prompt+="The hidden word you must find is: ${hidden_word}\n\n"
    test_prompt+="What is the hidden word at the end of this document?"
    
    local start_time
    start_time=$(date +%s)
    
    # Call ollama with timeout
    local response
    response=$(run_with_timeout "$TEST_TIMEOUT" "V3 benchmark test" \
        curl -s --max-time "$TEST_TIMEOUT" \
        -X POST http://localhost:11434/api/generate \
        -H "Content-Type: application/json" \
        -d "{\"model\": \"$model\", \"prompt\": $(echo -n "$test_prompt" | jq -R .), \"stream\": false}")
    
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        die "$ERR_TEST_FAILED" "Benchmark test failed or timed out"
    fi
    
    local end_time
    end_time=$(date +%s)
    local elapsed=$((end_time - start_time))
    
    # Parse response
    local model_response
    model_response=$(echo "$response" | jq -r '.response // empty' 2>/dev/null)
    
    if [[ -z "$model_response" ]]; then
        die "$ERR_TEST_FAILED" "No response from model. Response: $(echo "$response" | jq .)"
    fi
    
    # Check if response contains hidden word (case-insensitive)
    local passed=0
    if echo "$model_response" | grep -qi "$hidden_word"; then
        passed=1
        status_success "Test PASSED: Model found hidden word '$hidden_word'"
    else
        status_warning "Test FAILED: Model did not find hidden word"
        debug "Model response: $model_response"
    fi
    
    # Calculate quality metrics
    local response_length
    response_length=$(echo "$model_response" | wc -c)
    local quality="good"
    if [[ $response_length -lt 50 ]]; then
        quality="poor"
    elif [[ $response_length -lt 200 ]]; then
        quality="fair"
    fi
    
    # Save results
    save_benchmark_results "$model" "$passed" "$quality" "$elapsed" "$model_response"
}

# Save results as JSON
save_benchmark_results() {
    local model="$1"
    local passed="$2"
    local quality="$3"
    local speed="$4"
    local response="$5"
    
    mkdir -p "$RESULTS_DIR"
    
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    local results_file="$RESULTS_DIR/v3_benchmark_${timestamp}.json"
    
    cat > "$results_file" << EOF
{
  "test_name": "Loki V3 Long-Context Reasoning",
  "timestamp": "$timestamp",
  "model": "$model",
  "gpu_type": "$GPU_TYPE",
  "gpu_driver": "$GPU_DRIVER",
  "system_memory_gb": $DETECTED_MEMORY_GB,
  "available_disk_gb": $DETECTED_DISK_GB,
  "results": {
    "passed": $passed,
    "quality": "$quality",
    "accuracy": $passed,
    "speed_seconds": $speed,
    "response_length": $(echo "$response" | wc -c)
  },
  "model_response": $(echo "$response" | jq -Rs .)
}
EOF
    
    status_success "Results saved to: $results_file"
    echo ""
    echo "Results JSON:"
    cat "$results_file" | jq .
}

################################################################################
# MAIN EXECUTION FLOW
################################################################################

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --model MODEL       Model to test (default: $DEFAULT_MODEL)
                       Available: qwen3.5:4b, qwen3.6:latest, qwen3.8:27b
    --debug             Enable debug output
    --help              Show this help message

Examples:
    $0
    $0 --model qwen3.8:27b
    $0 --debug --model qwen3.6:latest

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --model)
                SELECTED_MODEL="$2"
                shift 2
                ;;
            --debug)
                DEBUG=1
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                status_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Main function
main() {
    print_header "Loki V3 Benchmark Test Harness v${SCRIPT_VERSION}"
    status_info "GPU Auto-Detection | Resource Validation | Graceful Error Recovery"
    
    # Initialize logging
    mkdir -p "$RESULTS_DIR"
    > "$LOG_FILE"  # Clear log file
    
    status_info "Logging to: $LOG_FILE"
    status_info "Results will be saved to: $RESULTS_DIR"
    
    # Parse arguments
    parse_args "$@"
    status_info "Selected model: $SELECTED_MODEL"
    
    # Run detection and validation pipeline
    detect_gpu
    validate_gpu_driver
    validate_system_resources
    validate_ollama
    
    # Print system summary
    print_header "System Configuration Summary"
    echo -e "${BLUE}GPU Type:${NC}           $GPU_TYPE"
    echo -e "${BLUE}GPU Driver:${NC}         ${GPU_DRIVER:-N/A}"
    echo -e "${BLUE}Memory:${NC}             ${DETECTED_MEMORY_GB}GB"
    echo -e "${BLUE}Available Disk:${NC}     ${DETECTED_DISK_GB}GB"
    echo -e "${BLUE}Test Model:${NC}         $SELECTED_MODEL"
    print_footer
    
    # Pull model and run benchmark
    pull_model "$SELECTED_MODEL"
    run_v3_benchmark "$SELECTED_MODEL"
    
    print_header "Benchmark Complete"
    status_success "All tests completed successfully"
    print_footer
}

# Run main function
main "$@"
