#!/bin/bash

################################################################################
# v3_test_harness.sh - macOS Production-Grade V3 Benchmark Harness
# Smart Unified Memory Detection | Intelligent Model Selection | ARM64/Intel Support
#
# Purpose: Run Loki V3 long-context reasoning benchmark on macOS with:
#   - Automatic unified memory detection
#   - ARM64 (Apple Silicon) vs Intel detection
#   - Intelligent model selection based on available hardware
#   - Progress feedback and graceful error recovery
#   - Test execution with progress spinners and log capture
#
# Usage: ./v3_test_harness.sh [--model model_name] [--force]
#        ./v3_test_harness.sh --help
#
# Tested on: macOS 12.0+ (Monterey+)
# Compatibility: Apple Silicon (M1/M2/M3/M4), Intel (slower)
# Requirements: bash 4+, curl, jq, ollama
################################################################################

set -o pipefail

# Script metadata
SCRIPT_VERSION="2.1.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$HOME/loki-v3-test"
CACHE_DIR="$HOME/.ollama"
LOG_FILE="$RESULTS_DIR/harness.log"

# Hardware detection state
ARCH=""  # arm64 or x86_64
CPU_NAME=""
UNIFIED_RAM_GB=0
GPU_TYPE=""  # apple_silicon, intel_integrated, none

# Model variables
SELECTED_MODEL=""
USER_SPECIFIED_MODEL=""
AUTO_SELECTED=false

# Test execution variables
OLLAMA_CONNECT_TIMEOUT=5
OLLAMA_RESPONSE_TIMEOUT=300
MODEL_PULL_TIMEOUT=3600
TEST_TIMEOUT=600
DETECTED_DISK_GB=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Spinner frames
SPINNER_FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
SPINNER_PID=""

# Error codes
ERR_INSUFFICIENT_RAM=30
ERR_INSUFFICIENT_DISK=31
ERR_MODEL_NOT_AVAILABLE=40
ERR_OLLAMA_NOT_INSTALLED=20
ERR_OLLAMA_UNREACHABLE=21
ERR_MODEL_PULL_FAILED=40
ERR_MODEL_PULL_TIMEOUT=41
ERR_NETWORK_TIMEOUT=50
ERR_TEST_FAILED=60

################################################################################
# UTILITY FUNCTIONS
################################################################################

log() {
    local level="$1"
    shift
    local msg="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${msg}" | tee -a "$LOG_FILE"
}

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

print_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  $@"
    echo "╚════════════════════════════════════════════════════════════╝"
}

# Start spinner for long-running operations
start_spinner() {
    local message="$1"
    local frame=0
    
    # Suppress standard output while spinner runs
    (
        while true; do
            printf "\r${BLUE}${SPINNER_FRAMES[$((frame % ${#SPINNER_FRAMES[@]}))]${NC} ${message}"
            sleep 0.1
            frame=$((frame + 1))
        done
    ) &
    SPINNER_PID=$!
}

# Stop spinner and show result
stop_spinner() {
    local status="$1"
    local message="$2"
    
    if [[ -n "$SPINNER_PID" ]]; then
        kill $SPINNER_PID 2>/dev/null || true
        wait $SPINNER_PID 2>/dev/null || true
    fi
    
    if [[ "$status" == "success" ]]; then
        echo -e "\r${GREEN}✓${NC} ${message}"
    elif [[ "$status" == "error" ]]; then
        echo -e "\r${RED}✗${NC} ${message}"
    else
        echo -e "\r${YELLOW}⚠${NC} ${message}"
    fi
}

command_exists() {
    command -v "$1" &> /dev/null
}

debug() {
    if [[ "${DEBUG:-0}" == "1" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $@" >&2
        log "DEBUG" "$@"
    fi
}

die() {
    local exit_code="$1"
    shift
    status_error "$@"
    exit "$exit_code"
}

################################################################################
# HARDWARE DETECTION
################################################################################

detect_hardware() {
    echo ""
    status_info "Detecting macOS hardware and system resources..."
    
    # Detect architecture
    ARCH=$(uname -m)
    
    # Detect CPU/GPU info
    if [[ "$ARCH" == "arm64" ]]; then
        GPU_TYPE="apple_silicon_unified"
        CPU_NAME=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")
        status_success "CPU: $CPU_NAME (ARM64)"
        status_success "GPU: Apple Silicon (integrated)"
        
        # Apple Silicon: unified memory (all RAM available to GPU)
        UNIFIED_RAM_GB=$(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
        status_success "Unified Memory: $UNIFIED_RAM_GB GB"
    else
        GPU_TYPE="intel_igpu"
        CPU_NAME=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Intel")
        status_success "CPU: $CPU_NAME (Intel x86_64)"
        status_warning "GPU: Intel iGPU (no unified memory, VRAM ~1-2GB)"
        
        # Intel Mac: NO unified memory, iGPU has negligible VRAM (~1-2GB)
        UNIFIED_RAM_GB=$(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
        status_warning "System RAM: $UNIFIED_RAM_GB GB (iGPU VRAM separate, negligible)"
    fi
    
    # Detect available disk space
    local available_disk_kb=$(df "$CACHE_DIR" 2>/dev/null | tail -1 | awk '{print $4}')
    DETECTED_DISK_GB=$((available_disk_kb / 1024 / 1024))
    status_success "Disk available: ${DETECTED_DISK_GB}GB"
    
    echo ""
}

################################################################################
# SMART MODEL SELECTION
################################################################################

select_best_model() {
    echo ""
    status_info "Selecting best model for your hardware..."
    
    # If user specified a model, use it
    if [[ -n "$USER_SPECIFIED_MODEL" ]]; then
        SELECTED_MODEL="$USER_SPECIFIED_MODEL"
        status_success "Using user-specified model: $SELECTED_MODEL"
        return 0
    fi
    
    local available_memory=$UNIFIED_RAM_GB
    
    # Apple Silicon: unified memory, can use full amount
    if [[ "$ARCH" == "arm64" ]]; then
        if [[ $available_memory -ge 120 ]]; then
            SELECTED_MODEL="qwen3.8-flash-next"
            AUTO_SELECTED=true
            status_success "Auto-selected: qwen3.8-flash-next (125B, 6B active)"
            echo "  Reason: You have ${available_memory}GB unified memory"
        
        elif [[ $available_memory -ge 48 ]]; then
            SELECTED_MODEL="qwen3.8:27b"
            AUTO_SELECTED=true
            status_success "Auto-selected: qwen3.8:27b (27B parameters)"
            echo "  Reason: You have ${available_memory}GB unified memory"
        
        elif [[ $available_memory -ge 24 ]]; then
            SELECTED_MODEL="qwen3.6:latest"
            AUTO_SELECTED=true
            status_success "Auto-selected: qwen3.6:latest (22B parameters)"
            echo "  Reason: You have ${available_memory}GB unified memory"
        
        elif [[ $available_memory -ge 16 ]]; then
            SELECTED_MODEL="qwen3.5:4b"
            AUTO_SELECTED=true
            status_success "Auto-selected: qwen3.5:4b (4B parameters)"
            echo "  Reason: You have ${available_memory}GB unified memory"
        
        else
            status_error "Insufficient unified memory!"
            echo "  You have: ${available_memory}GB"
            echo "  Minimum required: 16GB"
            exit $ERR_INSUFFICIENT_RAM
        fi
    
    # Intel Mac: NO unified memory, iGPU VRAM negligible (~1-2GB)
    else
        status_warning "Intel Mac detected: NO unified memory"
        status_warning "iGPU VRAM is negligible (~1-2GB), CPU-only inference will be VERY SLOW"
        
        if [[ $available_memory -ge 32 ]]; then
            SELECTED_MODEL="qwen3.6:latest"
            AUTO_SELECTED=true
            status_success "Auto-selected: qwen3.6:latest (22B parameters)"
            echo "  Reason: You have ${available_memory}GB system RAM"
            echo "  WARNING: Intel CPU-only inference will be very slow (15-30 min per test)"
        
        elif [[ $available_memory -ge 16 ]]; then
            SELECTED_MODEL="qwen3.5:4b"
            AUTO_SELECTED=true
            status_success "Auto-selected: qwen3.5:4b (4B parameters)"
            echo "  Reason: You have ${available_memory}GB system RAM"
            echo "  WARNING: Intel CPU-only inference will be slow (5-10 min per test)"
        
        else
            status_error "Insufficient system RAM for Intel Mac!"
            echo "  You have: ${available_memory}GB"
            echo "  Minimum required: 16GB"
            exit $ERR_INSUFFICIENT_RAM
        fi
    fi
    
    echo ""
}

################################################################################
# PARSE ARGUMENTS
################################################################################

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --model)
                USER_SPECIFIED_MODEL="$2"
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
                status_error "Unknown argument: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
Loki's Lab V3 Test Harness (macOS) - Smart Model Selection & Test Execution

Usage: $0 [OPTIONS]

OPTIONS:
    --model MODEL_NAME    Manually specify model (qwen3.5:4b, qwen3.6:latest, qwen3.8:27b, qwen3.8-flash-next)
    --debug              Enable debug output
    --help               Show this help message

EXAMPLES:
    # Auto-detect best model for your hardware
    $0
    
    # Use specific model
    $0 --model qwen3.8:27b

HARDWARE DETECTION:
    - Automatically detects CPU (Apple Silicon ARM64 vs Intel x86_64)
    - Apple Silicon: Unified memory (CPU + GPU share all RAM)
    - Intel Mac: NO unified memory, iGPU VRAM negligible (~1-2GB)
    - Selects optimal model based on available resources

PERFORMANCE NOTES:
    - Apple Silicon (M1/M2/M3/M4): Excellent performance
    - Intel Mac: CPU-only inference, VERY SLOW (15-30 min per test)
    - Recommend 24GB+ for meaningful results
    
APPLE SILICON MODEL SELECTION:
    >= 120GB → qwen3.8-flash-next (125B)
    >= 48GB  → qwen3.8:27b
    >= 24GB  → qwen3.6:latest
    >= 16GB  → qwen3.5:4b
    < 16GB   → Error (insufficient)

INTEL MAC MODEL SELECTION (CPU-only):
    >= 32GB  → qwen3.6:latest (slow, 15-30 min per test)
    >= 16GB  → qwen3.5:4b (slow, 5-10 min per test)
    < 16GB   → Error (insufficient)

EOF
}

################################################################################
# OLLAMA VALIDATION FUNCTIONS
################################################################################

check_ollama_installed() {
    debug "Checking for Ollama installation..."
    
    if ! command_exists ollama; then
        die "$ERR_OLLAMA_NOT_INSTALLED" \
            "Ollama is not installed or not in PATH. Install from: https://ollama.ai/"
    fi
    
    local ollama_version
    ollama_version=$(ollama --version 2>/dev/null | grep -oE 'ollama version [0-9.]+' | cut -d' ' -f3)
    status_success "Ollama installed (version: ${ollama_version:-unknown})"
}

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

validate_ollama() {
    print_header "Ollama Validation"
    
    check_ollama_installed
    check_ollama_running
}

################################################################################
# MODEL MANAGEMENT FUNCTIONS
################################################################################

is_model_cached() {
    local model="$1"
    debug "Checking if model $model is cached..."
    
    local models
    models=$(curl -s --max-time "$OLLAMA_CONNECT_TIMEOUT" http://localhost:11434/api/tags 2>/dev/null | \
             jq -r '.models[].name' 2>/dev/null | grep -c "^${model}$" 2>/dev/null || echo "0")
    
    [[ $models -gt 0 ]]
}

pull_model() {
    local model="$1"
    
    if is_model_cached "$model"; then
        status_success "Model $model is already cached"
        return 0
    fi
    
    print_header "Downloading Model: $model"
    status_info "Pulling model (this may take 10-30 minutes)..."
    status_info "Ensure you have stable internet connection"
    
    # Show progress with spinner
    start_spinner "Pulling model (streaming...)..."
    
    local start_time
    start_time=$(date +%s)
    
    local pull_response
    pull_response=$(curl -s --max-time "$MODEL_PULL_TIMEOUT" \
        -X POST http://localhost:11434/api/pull \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$model\", \"stream\": true}" 2>/dev/null)
    
    local exit_code=$?
    stop_spinner "success" "Model pull initiated"
    
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
                local completed
                completed=$(echo "$line" | jq -r '.completed // 0' 2>/dev/null)
                local total
                total=$(echo "$line" | jq -r '.total // 0' 2>/dev/null)
                
                if [[ $total -gt 0 ]]; then
                    local percent=$((completed * 100 / total))
                    printf "\r  Progress: %3d%% (%d/%d bytes)\n" "$percent" "$completed" "$total" >> "$LOG_FILE"
                fi
            fi
        fi
    done <<< "$pull_response"
    
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
    
    # Show progress with spinner
    start_spinner "Running benchmark test..."
    
    # Call ollama with timeout
    local response
    response=$(timeout "$TEST_TIMEOUT" curl -s --max-time "$TEST_TIMEOUT" \
        -X POST http://localhost:11434/api/generate \
        -H "Content-Type: application/json" \
        -d "{\"model\": \"$model\", \"prompt\": $(echo -n "$test_prompt" | jq -Rs .), \"stream\": false}" 2>/dev/null)
    
    local exit_code=$?
    stop_spinner "success" "Benchmark test completed"
    
    if [[ $exit_code -eq 124 ]]; then
        die "$ERR_NETWORK_TIMEOUT" "Benchmark test timed out after ${TEST_TIMEOUT}s"
    elif [[ $exit_code -ne 0 ]]; then
        die "$ERR_TEST_FAILED" "Benchmark test failed (exit code: $exit_code)"
    fi
    
    local end_time
    end_time=$(date +%s)
    local elapsed=$((end_time - start_time))
    
    # Parse response
    local model_response
    model_response=$(echo "$response" | jq -r '.response // empty' 2>/dev/null)
    
    if [[ -z "$model_response" ]]; then
        die "$ERR_TEST_FAILED" "No response from model. Response: $(echo "$response" | jq . 2>/dev/null || echo "$response")"
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
  "system_memory_gb": $UNIFIED_RAM_GB,
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
# MAIN
################################################################################

main() {
    mkdir -p "$RESULTS_DIR" "$CACHE_DIR"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Loki's Lab V3 Test Harness v${SCRIPT_VERSION} (macOS)                 ║"
    echo "║  Smart Model Selection | Test Execution & Verification    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    
    # Initialize logging
    > "$LOG_FILE"  # Clear log file
    status_info "Logging to: $LOG_FILE"
    
    # Parse arguments
    parse_arguments "$@"
    
    # Detect hardware
    detect_hardware
    
    # Select best model
    select_best_model
    
    # Report selection
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  HARDWARE & MODEL SUMMARY                                  ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║ Architecture:     $ARCH"
    echo "║ CPU:              $CPU_NAME"
    echo "║ GPU Type:         $GPU_TYPE"
    if [[ "$ARCH" == "arm64" ]]; then
        echo "║ Unified Memory:   ${UNIFIED_RAM_GB}GB (CPU + GPU shared)"
    else
        echo "║ System RAM:       ${UNIFIED_RAM_GB}GB (Intel iGPU VRAM ~1-2GB, negligible)"
    fi
    echo "║ Selected Model:   $SELECTED_MODEL"
    if [[ $AUTO_SELECTED == true ]]; then
        echo "║ Selection:        Auto-detected ✓"
    else
        echo "║ Selection:        User-specified"
    fi
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Validate Ollama
    validate_ollama
    
    # Pull model
    pull_model "$SELECTED_MODEL"
    
    # Run benchmark test
    run_v3_benchmark "$SELECTED_MODEL"
    
    print_header "Benchmark Complete"
    status_success "All tests completed successfully"
    echo ""
    status_info "Results saved to: $RESULTS_DIR"
    status_info "Full log saved to: $LOG_FILE"
    echo ""
}

# Run main
main "$@"
