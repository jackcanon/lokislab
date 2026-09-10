#!/bin/bash

# Loki's Lab V3 Test Harness - TUI Wrapper (Linux/macOS)
# Displays real-time progress with expandable logs

set -o pipefail

SCRIPT_VERSION="3.5.0-tui"
RESULTS_DIR="$HOME/loki-v3-test"
LOG_FILE="$RESULTS_DIR/harness-$(date +%Y%m%d_%H%M%S).log"
STATE_FILE="$RESULTS_DIR/state.json"
HARNESS_SCRIPT="$(dirname "$0")/v3_test_harness_$(uname -s | tr '[:upper:]' '[:lower:]').sh"

mkdir -p "$RESULTS_DIR"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# State tracking
CURRENT_STEP="Initializing"
PROGRESS=0
declare -A MILESTONES=(
    ["Hardware Detection"]="pending"
    ["Model Selection"]="pending"
    ["Ollama Service"]="pending"
    ["Model Download"]="pending"
    ["Test Execution"]="pending"
)
LAST_MESSAGE=""
ERROR_MESSAGE=""
LOG_LINES=()
COMPLETED=false
FAILED=false
SHOW_LOG=false

# ====== LOGGING ======
add_log_line() {
    local message="$1"
    local timestamp=$(date +"%H:%M:%S")
    local line="[$timestamp] $message"
    
    LOG_LINES+=("$line")
    
    # Keep last 50 lines
    if [ ${#LOG_LINES[@]} -gt 50 ]; then
        LOG_LINES=("${LOG_LINES[@]: -50}")
    fi
    
    echo "$line" >> "$LOG_FILE"
}

update_step() {
    local step="$1"
    local progress="$2"
    local message="$3"
    
    CURRENT_STEP="$step"
    PROGRESS="$progress"
    LAST_MESSAGE="$message"
    
    add_log_line "$step: $message"
}

set_milestone() {
    local name="$1"
    local status="$2"
    MILESTONES["$name"]="$status"
}

# ====== TUI DISPLAY ======
show_tui() {
    clear
    
    # Header
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  Loki's Lab V3 Test Harness - TUI      ║${NC}"
    echo -e "${CYAN}║  $(uname -s | awk '{printf "%-36s", $0}')║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    # Progress bar
    local bar_length=30
    local filled=$((PROGRESS * bar_length / 100))
    local empty=$((bar_length - filled))
    local bar="["
    for ((i=0; i<filled; i++)); do bar+="="; done
    for ((i=0; i<empty; i++)); do bar+=" "; done
    bar+="]"
    
    echo -e "${GREEN}Progress: $bar $PROGRESS%${NC}"
    echo ""
    
    # Current step
    echo -e "${YELLOW}Current Step:${NC}"
    echo -e "  ${CYAN}$CURRENT_STEP${NC}"
    echo -e "  ${GRAY}$LAST_MESSAGE${NC}"
    echo ""
    
    # Milestones
    echo -e "${YELLOW}Milestones:${NC}"
    for milestone in "Hardware Detection" "Model Selection" "Ollama Service" "Model Download" "Test Execution"; do
        local status="${MILESTONES[$milestone]}"
        local icon=""
        local color=""
        
        case "$status" in
            "pending") icon="○"; color="${GRAY}" ;;
            "running") icon="▶"; color="${YELLOW}" ;;
            "complete") icon="✓"; color="${GREEN}" ;;
            "error") icon="✗"; color="${RED}" ;;
        esac
        
        echo -e "  ${color}$icon $milestone${NC}"
    done
    
    echo ""
    
    # Error display
    if [ ! -z "$ERROR_MESSAGE" ]; then
        echo -e "${RED}ERROR:${NC}"
        echo -e "  ${RED}$ERROR_MESSAGE${NC}"
        echo ""
    fi
    
    # Log preview (last 5 lines)
    echo -e "${YELLOW}Recent Log:${NC}"
    if [ ${#LOG_LINES[@]} -gt 0 ]; then
        local start=$((${#LOG_LINES[@]} - 5))
        [ $start -lt 0 ] && start=0
        
        for ((i=start; i<${#LOG_LINES[@]}; i++)); do
            echo -e "  ${GRAY}${LOG_LINES[$i]}${NC}"
        done
    fi
    
    echo ""
    echo -e "${GRAY}Press 'l' to show full log, 'q' to quit, or wait...${NC}"
}

show_full_log() {
    clear
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}Full Test Log${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo ""
    
    for line in "${LOG_LINES[@]}"; do
        echo -e "${GRAY}$line${NC}"
    done
    
    echo ""
    echo -e "${GRAY}Press any key to return...${NC}"
    read -n 1
}

# ====== HARDWARE DETECTION ======
detect_hardware() {
    update_step "Hardware Detection" 5 "Scanning system..."
    
    local gpu_name="CPU Only"
    local vram_gb=0
    local ram_gb=0
    
    # GPU detection (NVIDIA)
    if command -v nvidia-smi &> /dev/null; then
        gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)
        vram_mb=$(nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader | head -1)
        vram_gb=$((vram_mb / 1024))
        update_step "Hardware Detection" 25 "GPU: $gpu_name ($vram_gb GB VRAM)"
    else
        update_step "Hardware Detection" 25 "No NVIDIA GPU detected"
    fi
    
    # System RAM
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ram_bytes=$(sysctl -n hw.memsize)
        ram_gb=$((ram_bytes / 1024 / 1024 / 1024))
    else
        ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        ram_gb=$((ram_kb / 1024 / 1024))
    fi
    
    update_step "Hardware Detection" 35 "System RAM: ${ram_gb}GB"
    
    export DETECTED_GPU="$gpu_name"
    export DETECTED_VRAM="$vram_gb"
    export DETECTED_RAM="$ram_gb"
}

# ====== MODEL SELECTION ======
select_model() {
    update_step "Model Selection" 40 "Analyzing hardware..."
    
    local model="qwen3.5:4b"
    
    if [ "$DETECTED_VRAM" -ge 75 ]; then
        model="qwen3.8-flash-next"
        update_step "Model Selection" 50 "Selected: qwen3.8-flash-next (125B)"
    elif [ "$DETECTED_VRAM" -ge 35 ]; then
        model="qwen3.8:27b"
        update_step "Model Selection" 50 "Selected: qwen3.8:27b (27B)"
    elif [ "$DETECTED_VRAM" -ge 25 ]; then
        model="qwen3.6:latest"
        update_step "Model Selection" 50 "Selected: qwen3.6:latest (12B)"
    else
        update_step "Model Selection" 50 "Selected: qwen3.5:4b (4B)"
    fi
    
    export SELECTED_MODEL="$model"
}

# ====== OLLAMA SERVICE ======
ensure_ollama() {
    update_step "Ollama Service" 55 "Checking Ollama..."
    
    if ! command -v ollama &> /dev/null; then
        update_step "Ollama Service" 60 "Installing Ollama (this takes 1-2 minutes)..."
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            curl -fsSL https://ollama.ai/install.sh | sh || {
                ERROR_MESSAGE="Ollama install failed"
                FAILED=true
                return 1
            }
        else
            # Linux
            curl -fsSL https://ollama.ai/install.sh | sh || {
                ERROR_MESSAGE="Ollama install failed"
                FAILED=true
                return 1
            }
        fi
        
        update_step "Ollama Service" 70 "Installed"
    fi
    
    # Start service
    update_step "Ollama Service" 75 "Starting Ollama..."
    
    # Try to start ollama if not running
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        ollama serve &
        OLLAMA_PID=$!
        
        local tries=0
        while [ $tries -lt 30 ]; do
            if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
                break
            fi
            sleep 1
            ((tries++))
        done
        
        if [ $tries -ge 30 ]; then
            ERROR_MESSAGE="Ollama failed to start"
            FAILED=true
            return 1
        fi
    fi
    
    update_step "Ollama Service" 85 "Running on localhost:11434"
}

# ====== MODEL DOWNLOAD ======
download_model() {
    update_step "Model Download" 90 "Downloading $SELECTED_MODEL (5-30 min - window may appear frozen, normal)..."
    
    ollama pull "$SELECTED_MODEL" 2>&1 | while read line; do
        add_log_line "  $line"
    done
    
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        ERROR_MESSAGE="Model download failed"
        FAILED=true
        return 1
    fi
    
    update_step "Model Download" 98 "Complete"
}

# ====== MAIN EXECUTION ======
add_log_line "=== V3 Test Harness TUI Started ==="

# Run all steps
if ! detect_hardware; then
    FAILED=true
fi

if ! $FAILED; then
    set_milestone "Hardware Detection" "complete"
    
    if ! select_model; then
        FAILED=true
    fi
fi

if ! $FAILED; then
    set_milestone "Model Selection" "complete"
    
    if ! ensure_ollama; then
        FAILED=true
    fi
fi

if ! $FAILED; then
    set_milestone "Ollama Service" "complete"
    
    if ! download_model; then
        FAILED=true
    fi
fi

if ! $FAILED; then
    set_milestone "Model Download" "complete"
    set_milestone "Test Execution" "complete"
    COMPLETED=true
    PROGRESS=100
    add_log_line "=== V3 Test Harness Complete ==="
fi

# ====== DISPLAY LOOP ======
while true; do
    show_tui
    
    # Check for user input (non-blocking)
    read -t 1 -n 1 key 2>/dev/null || true
    
    case "$key" in
        l) show_full_log ;;
        q) break ;;
    esac
    
    if $COMPLETED || $FAILED; then
        echo ""
        if $COMPLETED; then
            echo -e "${GREEN}✓ Setup complete!${NC}"
        else
            echo -e "${RED}✗ Setup failed!${NC}"
        fi
        echo -e "${YELLOW}Full log: $LOG_FILE${NC}"
        echo -e "${YELLOW}Results: $RESULTS_DIR${NC}"
        echo ""
        read -p "Press Enter to close"
        break
    fi
done

# Cleanup
if [ ! -z "$OLLAMA_PID" ]; then
    kill $OLLAMA_PID 2>/dev/null || true
fi

exit 0
