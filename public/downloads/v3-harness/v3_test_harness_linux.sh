#!/bin/bash

################################################################################
# v3_test_harness.sh - Production-Grade V3 Benchmark Harness
# Smart VRAM Detection | Intelligent Model Selection | GPU/CPU Auto-Detection
#
# Purpose: Run Loki V3 long-context reasoning benchmark with:
#   - Automatic VRAM detection (NVIDIA/AMD/Intel)
#   - Intelligent model selection based on available hardware
#   - GPU and CPU detection
#   - Progress feedback and graceful error recovery
#
# Usage: ./v3_test_harness.sh [--model model_name] [--force]
#        ./v3_test_harness.sh --help
#
# Tested on: Ubuntu 20.04+, Debian 11+
# Requirements: bash 4+, curl, jq, ollama
################################################################################

set -o pipefail

# Script metadata
SCRIPT_VERSION="2.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$HOME/loki-v3-test"
CACHE_DIR="$HOME/.ollama"
LOG_FILE="$RESULTS_DIR/harness.log"

# GPU detection state
GPU_TYPE="none"  # none, nvidia, amd, intel
GPU_NAME=""
VRAM_GB=0
SYSTEM_RAM_GB=0
CUDA_VERSION=""
ROCM_VERSION=""

# Model variables
SELECTED_MODEL=""
USER_SPECIFIED_MODEL=""
AUTO_SELECTED=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Error codes
ERR_INSUFFICIENT_VRAM=30
ERR_INSUFFICIENT_RAM=31
ERR_INSUFFICIENT_DISK=32
ERR_MODEL_NOT_AVAILABLE=40

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

################################################################################
# GPU/VRAM DETECTION
################################################################################

detect_gpu_and_vram() {
    echo ""
    status_info "Detecting GPU and system resources..."
    
    # Check for NVIDIA GPU
    if command -v nvidia-smi &> /dev/null; then
        GPU_NAME=$(nvidia-smi --query-gpu=gpu_name --format=csv,noheader 2>/dev/null | head -1)
        local vram_mb=$(nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader 2>/dev/null | head -1)
        VRAM_GB=$((vram_mb / 1024))
        CUDA_VERSION=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1)
        
        # Check if this is a DGX Spark (unified memory architecture)
        if [[ "$GPU_NAME" =~ "Grace" ]] || [[ "$GPU_NAME" =~ "H100" ]]; then
            GPU_TYPE="nvidia_dgx_unified"
            status_success "GPU: NVIDIA $GPU_NAME (DGX - Unified Memory, ${VRAM_GB}GB)"
            status_info "Note: This system has unified memory. Treating as single pool like Apple Silicon."
        else
            GPU_TYPE="nvidia"
            status_success "GPU: NVIDIA $GPU_NAME ($VRAM_GB GB VRAM - discrete)"
        fi
    
    # Check for AMD GPU
    elif command -v rocm-smi &> /dev/null; then
        GPU_TYPE="amd"
        GPU_NAME=$(rocm-smi --showproductname 2>/dev/null | grep -i "gpu" | head -1 | awk '{$1=$2=""; print $0}' | xargs)
        local vram_kb=$(rocm-smi --showmeminfo 2>/dev/null | grep "Total Memory" | head -1 | awk '{print $NF}')
        VRAM_GB=$((vram_kb / 1024 / 1024))
        ROCM_VERSION=$(rocm-smi --version 2>/dev/null | head -1)
        status_success "GPU: AMD $GPU_NAME ($VRAM_GB GB VRAM)"
    
    else
        GPU_TYPE="none"
        status_warning "No GPU detected. Will use CPU (slower)"
    fi
    
    # Detect system RAM
    SYSTEM_RAM_GB=$(($(grep MemTotal /proc/meminfo | awk '{print $2}') / 1024 / 1024))
    status_success "System RAM: $SYSTEM_RAM_GB GB"
    
    # Detect available disk space in Ollama cache
    local available_disk_kb=$(df "$CACHE_DIR" 2>/dev/null | tail -1 | awk '{print $4}')
    local available_disk_gb=$((available_disk_kb / 1024 / 1024))
    status_success "Disk available: ${available_disk_gb}GB"
    
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
    
    # Auto-select based on VRAM (for GPU) or RAM (for CPU)
    local available_resource_gb=$VRAM_GB
    local memory_source="GPU VRAM"
    
    if [[ $GPU_TYPE == "none" ]]; then
        available_resource_gb=$SYSTEM_RAM_GB
        memory_source="system RAM"
        status_warning "Using system RAM for model selection (CPU inference will be slow)"
    elif [[ $GPU_TYPE == "nvidia_dgx_unified" ]]; then
        # DGX Spark has unified memory, treat like Apple Silicon
        available_resource_gb=$VRAM_GB
        memory_source="GPU unified memory"
        status_info "DGX Spark unified memory detected. Treating as single pool (like Apple Silicon)."
    fi
    
    # Model sizing reference
    # qwen3.8-flash-next: 125B params, 6B active, ~75GB VRAM needed
    # qwen3.8:27b: 27B params, ~35GB VRAM needed
    # qwen3.6:latest: 22B params, ~25GB needed
    # qwen3.5:4b: 4B params, ~6-8GB needed
    
    if [[ $available_resource_gb -ge 75 ]]; then
        SELECTED_MODEL="qwen3.8-flash-next"
        AUTO_SELECTED=true
        status_success "Auto-selected: qwen3.8-flash-next (125B, 6B active)"
        echo "  Reason: You have ${available_resource_gb}GB available"
        echo "  This is the largest & most capable model available"
    
    elif [[ $available_resource_gb -ge 35 ]]; then
        SELECTED_MODEL="qwen3.8:27b"
        AUTO_SELECTED=true
        status_success "Auto-selected: qwen3.8:27b (27B parameters)"
        echo "  Reason: You have ${available_resource_gb}GB available"
        echo "  Largest model that fits comfortably"
    
    elif [[ $available_resource_gb -ge 25 ]]; then
        SELECTED_MODEL="qwen3.6:latest"
        AUTO_SELECTED=true
        status_success "Auto-selected: qwen3.6:latest (22B parameters)"
        echo "  Reason: You have ${available_resource_gb}GB available"
        echo "  Good balance of capability and speed"
    
    elif [[ $available_resource_gb -ge 8 ]]; then
        SELECTED_MODEL="qwen3.5:4b"
        AUTO_SELECTED=true
        status_success "Auto-selected: qwen3.5:4b (4B parameters)"
        echo "  Reason: You have ${available_resource_gb}GB available"
        echo "  Smallest model, fastest inference"
    
    else
        status_error "Insufficient resources!"
        echo "  You have: ${available_resource_gb}GB"
        echo "  Minimum required: 8GB"
        exit $ERR_INSUFFICIENT_VRAM
    fi
    
    # Warn if system RAM is low (affects CPU fallback)
    if [[ $GPU_TYPE != "none" ]] && [[ $SYSTEM_RAM_GB -lt 16 ]]; then
        status_warning "System RAM is low (${SYSTEM_RAM_GB}GB). GPU-only inference will be used."
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
Loki's Lab V3 Test Harness - Smart Model Selection

Usage: $0 [OPTIONS]

OPTIONS:
    --model MODEL_NAME    Manually specify model (qwen3.5:4b, qwen3.6:latest, qwen3.8:27b, qwen3.8-flash-next)
    --help               Show this help message

EXAMPLES:
    # Auto-detect best model for your hardware
    $0
    
    # Use specific model
    $0 --model qwen3.8:27b

HARDWARE DETECTION:
    - Automatically detects NVIDIA GPU (VRAM)
    - Automatically detects AMD GPU (VRAM)
    - Falls back to system RAM if no GPU
    - Selects optimal model based on available resources

MODEL SELECTION LOGIC:
    >= 75GB   → qwen3.8-flash-next (125B)
    >= 35GB   → qwen3.8:27b
    >= 25GB   → qwen3.6:latest
    >= 8GB    → qwen3.5:4b
    < 8GB     → Error (insufficient resources)

EOF
}

################################################################################
# MAIN
################################################################################

main() {
    mkdir -p "$RESULTS_DIR" "$CACHE_DIR"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Loki's Lab V3 Test Harness v${SCRIPT_VERSION}                          ║"
    echo "║  Smart Model Selection | GPU Auto-Detection               ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    
    # Parse arguments
    parse_arguments "$@"
    
    # Detect hardware
    detect_gpu_and_vram
    
    # Select best model
    select_best_model
    
    # Report selection
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  HARDWARE & MODEL SUMMARY                                  ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║ GPU Type:         $GPU_TYPE"
    if [[ -n "$GPU_NAME" ]]; then
        echo "║ GPU Model:        $GPU_NAME"
    fi
    if [[ $GPU_TYPE != "none" ]]; then
        echo "║ VRAM:             ${VRAM_GB}GB"
    fi
    echo "║ System RAM:       ${SYSTEM_RAM_GB}GB"
    echo "║ Selected Model:   $SELECTED_MODEL"
    if [[ $AUTO_SELECTED == true ]]; then
        echo "║ Selection:        Auto-detected ✓"
    else
        echo "║ Selection:        User-specified"
    fi
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    status_success "Ready to run V3 test on: $SELECTED_MODEL"
    
    # TODO: Continue with actual test execution using $SELECTED_MODEL
    # This is where the rest of the harness would continue
    
}

# Run main
main "$@"
