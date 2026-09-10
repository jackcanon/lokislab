#!/bin/bash

# Loki's Lab V3 Test Harness - All-in-One Setup
# Double-click to run. Auto-installs everything needed.

set -o pipefail

RESULTS_DIR="$HOME/loki-v3-test"
LOG_FILE="$RESULTS_DIR/harness-$(date +%Y%m%d_%H%M%S).log"

mkdir -p "$RESULTS_DIR"

# ====== COLOR CODES ======
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m'

# ====== STATE TRACKING ======
PROGRESS=0
declare -A MILESTONES=(
    ["✓ Detect Hardware"]="false"
    ["✓ Select Model"]="false"
    ["✓ Install Ollama"]="false"
    ["✓ Start Ollama Service"]="false"
    ["✓ Download Model"]="false"
    ["✓ Run Test"]="false"
)
CURRENT_STEP="Initializing"
LAST_MESSAGE=""
ERROR_MESSAGE=""
LOG_LINES=()
COMPLETED=false
FAILED=false

# ====== LOGGING ======
add_log_line() {
    local message="$1"
    local timestamp=$(date +"%H:%M:%S")
    local line="[$timestamp] $message"
    LOG_LINES+=("$line")
    
    if [ ${#LOG_LINES[@]} -gt 50 ]; then
        LOG_LINES=("${LOG_LINES[@]: -50}")
    fi
    
    echo "$line" >> "$LOG_FILE"
}

update_step() {
    local step="$1"
    local progress="$2"
    local message="$3"
    
    PROGRESS="$progress"
    CURRENT_STEP="$step"
    LAST_MESSAGE="$message"
    add_log_line "$step: $message"
}

complete_milestone() {
    local name="$1"
    MILESTONES["$name"]="true"
}

# ====== TUI DISPLAY ======
show_tui() {
    clear
    
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  Loki's Lab V3 Test Harness Setup      ║${NC}"
    echo -e "${CYAN}║  $(uname -s)${NC}" | head -c 42
    echo -e "${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    # Progress bar
    local bar_length=35
    local filled=$((PROGRESS * bar_length / 100))
    local empty=$((bar_length - filled))
    local bar="["
    for ((i=0; i<filled; i++)); do bar+="="; done
    for ((i=0; i<empty; i++)); do bar+=" "; done
    bar+="]"
    
    echo -e "${GREEN}Progress: $bar $PROGRESS%${NC}"
    echo ""
    
    echo -e "${YELLOW}Current: $CURRENT_STEP${NC}"
    echo -e "${GRAY}  $LAST_MESSAGE${NC}"
    echo ""
    
    echo -e "${YELLOW}Milestones:${NC}"
    for milestone in "✓ Detect Hardware" "✓ Select Model" "✓ Install Ollama" "✓ Start Ollama Service" "✓ Download Model" "✓ Run Test"; do
        if [ "${MILESTONES[$milestone]}" = "true" ]; then
            echo -e "${GREEN}  $milestone${NC}"
        else
            local short=${milestone#✓ }
            echo -e "${GRAY}  ○ $short${NC}"
        fi
    done
    
    echo ""
    
    if [ ! -z "$ERROR_MESSAGE" ]; then
        echo -e "${RED}ERROR: $ERROR_MESSAGE${NC}"
        echo ""
    fi
    
    echo -e "${GRAY}Recent Log:${NC}"
    if [ ${#LOG_LINES[@]} -gt 0 ]; then
        for ((i=${#LOG_LINES[@]}-3; i<${#LOG_LINES[@]}; i++)); do
            [ $i -ge 0 ] && echo -e "${GRAY}  ${LOG_LINES[$i]}${NC}"
        done
    fi
}

# ====== HARDWARE DETECTION ======
update_step "Hardware Detection" 10 "Scanning system..."
show_tui

GPU_NAME="CPU Only"
VRAM_GB=0
RAM_GB=0

if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    VRAM_MB=$(nvidia-smi --query-gpu=memory.total --format=csv,nounits,noheader 2>/dev/null | head -1)
    VRAM_GB=$((VRAM_MB / 1024))
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    RAM_BYTES=$(sysctl -n hw.memsize 2>/dev/null)
    RAM_GB=$((RAM_BYTES / 1024 / 1024 / 1024))
else
    RAM_KB=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')
    RAM_GB=$((RAM_KB / 1024 / 1024))
fi

update_step "Hardware Detection" 20 "GPU: $GPU_NAME | VRAM: ${VRAM_GB}GB | RAM: ${RAM_GB}GB"
complete_milestone "✓ Detect Hardware"
show_tui

# ====== MODEL SELECTION ======
update_step "Model Selection" 30 "Analyzing resources..."

MODEL="qwen3.5:4b"
if [ "$VRAM_GB" -ge 75 ]; then
    MODEL="qwen3.8-flash-next"
elif [ "$VRAM_GB" -ge 35 ]; then
    MODEL="qwen3.8:27b"
elif [ "$VRAM_GB" -ge 25 ]; then
    MODEL="qwen3.6:latest"
fi

update_step "Model Selection" 40 "Selected: $MODEL"
complete_milestone "✓ Select Model"
show_tui

# ====== OLLAMA CHECK ======
update_step "Install Ollama" 45 "Checking if Ollama is installed..."

if ! command -v ollama &> /dev/null; then
    update_step "Install Ollama" 50 "Downloading Ollama installer (1-2 minutes)..."
    show_tui
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        curl -fsSL https://ollama.ai/install.sh | sh 2>&1 | tee -a "$LOG_FILE" || {
            ERROR_MESSAGE="Ollama install failed"
            FAILED=true
        }
    else
        curl -fsSL https://ollama.ai/install.sh | sh 2>&1 | tee -a "$LOG_FILE" || {
            ERROR_MESSAGE="Ollama install failed"
            FAILED=true
        }
    fi
    
    if [ "$FAILED" = false ]; then
        update_step "Install Ollama" 60 "Ollama installed"
    fi
else
    update_step "Install Ollama" 60 "Ollama already installed"
fi

if [ "$FAILED" = false ]; then
    complete_milestone "✓ Install Ollama"
    show_tui
fi

# ====== START OLLAMA SERVICE ======
if [ "$FAILED" = false ]; then
    update_step "Start Ollama" 65 "Starting Ollama service..."
    show_tui
    
    OLLAMA_RUNNING=false
    for i in {1..30}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            OLLAMA_RUNNING=true
            break
        fi
        
        if [ $i -eq 1 ]; then
            ollama serve > /dev/null 2>&1 &
            OLLAMA_PID=$!
        fi
        
        sleep 1
    done
    
    if [ "$OLLAMA_RUNNING" = true ]; then
        update_step "Start Ollama" 70 "Ollama running on localhost:11434"
        complete_milestone "✓ Start Ollama Service"
    else
        ERROR_MESSAGE="Ollama failed to start"
        FAILED=true
    fi
    
    show_tui
fi

# ====== DOWNLOAD MODEL ======
if [ "$FAILED" = false ]; then
    update_step "Download Model" 75 "Downloading $MODEL (5-30 minutes - window may appear frozen, this is normal)..."
    show_tui
    
    if ollama pull "$MODEL" 2>&1 | tee -a "$LOG_FILE"; then
        update_step "Download Model" 90 "Model download complete"
        complete_milestone "✓ Download Model"
    else
        ERROR_MESSAGE="Model download failed"
        FAILED=true
    fi
    
    show_tui
fi

# ====== FINAL STATUS ======
if [ "$FAILED" = false ]; then
    PROGRESS=100
    CURRENT_STEP="Ready"
    LAST_MESSAGE="V3 Test Harness is ready!"
    complete_milestone "✓ Run Test"
    COMPLETED=true
fi

show_tui

echo ""
if [ "$COMPLETED" = true ]; then
    echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
    echo ""
    echo -e "${GREEN}Your system is ready for the V3 benchmark test.${NC}"
    echo ""
    echo -e "${YELLOW}Configuration:${NC}"
    echo "  GPU: $GPU_NAME"
    echo "  VRAM: ${VRAM_GB}GB"
    echo "  RAM: ${RAM_GB}GB"
    echo "  Model: $MODEL"
    echo ""
    echo -e "${CYAN}Next step: Visit https://lokislab.org/test to run the benchmark${NC}"
else
    echo -e "${RED}❌ SETUP FAILED${NC}"
    echo ""
    echo -e "${RED}Error: $ERROR_MESSAGE${NC}"
    echo ""
    echo -e "${YELLOW}Log file: $LOG_FILE${NC}"
fi

echo ""
echo -e "${GRAY}Results saved to: $RESULTS_DIR${NC}"
echo ""

read -p "Press Enter to close"

# Cleanup
if [ ! -z "$OLLAMA_PID" ]; then
    kill $OLLAMA_PID 2>/dev/null || true
fi

exit 0
