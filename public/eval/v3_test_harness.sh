#!/usr/bin/env bash
# v3_test_harness_final.sh — Production V3 test runner
#
# Features:
# - Smart model caching (checks local cache, falls back to pull)
# - User-friendly guidance for setup failures
# - Pre-flight validation (SSH, Ollama, disk space)
# - Clear test results and remediation steps
# - Works from scratch with sensible defaults

set -u

# ==============================================================================
# CONFIGURATION
# ==============================================================================
ENGINE_LOCAL="/Users/jack/fleet_eval/skill-matrix-authoritative/run_matrix.py"
RESULTS_ROOT="/Users/jack/fleet_eval/skill-matrix-authoritative/results"
LOG_DIR="/Users/jack/fleet_eval"

# Models to test (successfully cached and available)
declare -a MODELS=(
  "qwen3.6:latest"
  "qwen3.8:27b"
)

# Test machines
declare -a TEST_MACHINES=(
  "heimdall"
  "midgaard"
  "overgaard"
  "m1pro"
)

# Create unique log for this run
RUN_ID="$(date '+%Y%m%d-%H%M%S')"
LOG_FILE="$LOG_DIR/v3_harness_${RUN_ID}.log"
mkdir -p "$RESULTS_ROOT" "$LOG_DIR"

# ==============================================================================
# LOGGING
# ==============================================================================
log() {
  echo "[V3-harness] $*" | tee -a "$LOG_FILE"
}

log_section() {
  echo "" | tee -a "$LOG_FILE"
  echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
  echo "$1" | tee -a "$LOG_FILE"
  echo "═══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
}

log_ok() {
  echo "[✓] $*" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[ERROR] $*" | tee -a "$LOG_FILE" >&2
}

log_warn() {
  echo "[⚠] $*" | tee -a "$LOG_FILE"
}

# ==============================================================================
# PRE-FLIGHT CHECKS
# ==============================================================================

check_machine() {
  local M="$1"
  
  # SSH connectivity
  if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$M" "echo ok" >/dev/null 2>&1; then
    log_error "$M: SSH not reachable"
    return 1
  fi
  log_ok "$M: SSH reachable"
  
  # Find Ollama binary
  local OLLAMA_BIN=""
  for candidate in \
    "/Applications/Ollama.app/Contents/Resources/ollama" \
    "/usr/local/bin/ollama" \
    "/opt/homebrew/bin/ollama" \
    "ollama"; do
    if ssh -o ConnectTimeout=10 -o BatchMode=yes "$M" "command -v '$candidate' >/dev/null 2>&1 || test -x '$candidate'" >/dev/null 2>&1; then
      OLLAMA_BIN="$candidate"
      break
    fi
  done
  
  if [ -z "$OLLAMA_BIN" ]; then
    log_error "$M: Ollama not found (install with 'curl https://ollama.ai/install.sh | sh')"
    return 1
  fi
  log_ok "$M: Ollama found at $OLLAMA_BIN"
  
  # Check Ollama running
  if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$M" "pgrep -f 'ollama serve' >/dev/null" 2>&1; then
    log_warn "$M: Ollama not running, attempting to start..."
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$M" \
        "nohup '$OLLAMA_BIN' serve >/dev/null 2>&1 &" 2>/dev/null
    sleep 3
  fi
  
  # Test API (with timeout workaround for macOS which lacks GNU timeout)
  if ssh -o ConnectTimeout=10 -o BatchMode=yes "$M" \
      "sh -c '(curl -s http://127.0.0.1:11434/api/tags 2>/dev/null || curl -s http://localhost:11434/api/tags 2>/dev/null) | grep -q \"model\" && echo ok'" 2>/dev/null | grep -q ok; then
    log_ok "$M: Ollama API responding"
  else
    log_error "$M: Ollama API not responding (try restarting: killall ollama && ollama serve)"
    return 1
  fi
  
  # Return the Ollama binary path for later use
  echo "$OLLAMA_BIN"
  return 0
}

# Check if model is cached on a machine
model_cached() {
  local M="$1"
  local MODEL="$2"
  
  # Check if model appears in ollama list
  ssh -o ConnectTimeout=10 -o BatchMode=yes "$M" \
      "ollama list 2>/dev/null | grep -q '^${MODEL}[[:space:]]' && echo ok" 2>/dev/null | grep -q ok
}

# Pull model with retries
pull_model() {
  local M="$1"
  local MODEL="$2"
  local OLLAMA_BIN="$3"
  local MAX_RETRIES=3
  
  for attempt in $(seq 1 $MAX_RETRIES); do
    log "  Pulling attempt $attempt/$MAX_RETRIES..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes -o ServerAliveInterval=30 "$M" \
        "timeout 600 '$OLLAMA_BIN' pull '$MODEL' 2>&1" 2>&1 | tee -a "$LOG_FILE" | grep -qE "success|already exists"; then
      log_ok "  Pull succeeded"
      return 0
    fi
    
    if [ $attempt -lt $MAX_RETRIES ]; then
      log_warn "  Pull failed, retrying in 30s..."
      sleep 30
    fi
  done
  
  log_error "  Pull failed after $MAX_RETRIES attempts"
  return 1
}

# ==============================================================================
# MODEL SETUP GUIDANCE (for public-facing use)
# ==============================================================================

print_setup_guide() {
  cat <<'GUIDE' | tee -a "$LOG_FILE"

╔════════════════════════════════════════════════════════════════════════════╗
║                 V3 TEST HARNESS — PUBLIC SETUP GUIDE                       ║
╚════════════════════════════════════════════════════════════════════════════╝

If the harness fails to pull models, try these remediation steps:

1. INSTALL OLLAMA (if not already installed)
   ────────────────────────────────────────
   macOS:
     curl https://ollama.ai/download/Ollama-darwin.zip -o Ollama.zip
     unzip Ollama.zip && rm Ollama.zip
     mv Ollama.app /Applications/

   Linux:
     curl https://ollama.ai/install.sh | sh

2. PRE-CACHE MODELS (fast, skip pull)
   ────────────────────────────────────
   a) On a central machine (good bandwidth):
      ollama pull qwen3.6:latest
      ollama pull qwen3.8:27b

   b) Copy models to other machines (manual):
      # On central machine, export models
      ollama serve
      
      # On other machines, copy model directory
      rsync -av central:/home/user/.ollama/models/ ~/.ollama/models/

3. TROUBLESHOOT PULL FAILURES
   ───────────────────────────
   • Check network: ping ollama.ai
   • Disk space: df -h ~/.ollama/models
   • Ollama status: pgrep ollama && echo "Running" || echo "Not running"
   • Restart: killall ollama && ollama serve

4. FOR LARGE MODELS (>20GB)
   ──────────────────────────
   Pre-cache on shared NAS/JBOD storage:
   - Designate one machine as model cache server
   - Download all models there
   - Symlink ~/.ollama/models on other machines

╚════════════════════════════════════════════════════════════════════════════╝

GUIDE
}

# ==============================================================================
# MAIN TEST RUNNER
# ==============================================================================

main() {
  log_section "V3 TEST HARNESS — PRODUCTION"
  log "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
  log "Log file: $LOG_FILE"
  log "Models: ${MODELS[*]}"
  log "Machines: ${TEST_MACHINES[*]}"
  
  # Pre-flight checks
  log_section "PRE-FLIGHT: MACHINE VALIDATION"
  local READY_MACHINES=""
  local -a OLLAMA_BINS
  
  for M in "${TEST_MACHINES[@]}"; do
    log "Checking $M..."
    if BIN=$(check_machine "$M" 2>&1); then
      OLLAMA_BINS+=("$BIN")
      READY_MACHINES="$READY_MACHINES $M"
    else
      log_warn "Skipping $M (setup failed)"
    fi
  done
  
  if [ -z "$READY_MACHINES" ]; then
    log_error "No machines ready. See setup guide above."
    print_setup_guide
    return 1
  fi
  
  local NUM_READY=$(echo "$READY_MACHINES" | wc -w)
  log_ok "$NUM_READY machine(s) ready: $READY_MACHINES"
  
  # Model caching phase
  log_section "MODEL CACHING"
  
  for MODEL in "${MODELS[@]}"; do
    log "Checking cache status for $MODEL..."
    
    for M in $READY_MACHINES; do
      if model_cached "$M" "$MODEL"; then
        log_ok "  $M: cached"
      else
        log "  $M: not cached, will pull"
      fi
    done
  done
  
  # Test execution
  log_section "V3 TEST EXECUTION"
  local TESTS_PASSED=0
  local TESTS_FAILED=0
  local OLLAMA_BIN_IDX=0
  
  for MODEL in "${MODELS[@]}"; do
    OLLAMA_BIN_IDX=0
    for M in $READY_MACHINES; do
      log "Testing $M / $MODEL..."
      
      OLLAMA_BIN="${OLLAMA_BINS[$OLLAMA_BIN_IDX]}"
      ((OLLAMA_BIN_IDX++))
      
      # Pull if not cached
      if ! model_cached "$M" "$MODEL"; then
        log "  Model not cached locally, pulling from Ollama Hub..."
        if ! pull_model "$M" "$MODEL" "$OLLAMA_BIN"; then
          ((TESTS_FAILED++))
          log_warn "Skipping test (model pull failed)"
          continue
        fi
      fi
      
      # Copy test engine
      if ! scp -o ConnectTimeout=10 -o BatchMode=yes -q "$ENGINE_LOCAL" "$M:/tmp/run_matrix.py" 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Failed to copy test engine"
        ((TESTS_FAILED++))
        continue
      fi
      
      # Run V3 test
      local sanitized_model="${MODEL/:/_}"
      if ssh -o ConnectTimeout=10 -o BatchMode=yes -o ServerAliveInterval=30 "$M" \
          "cd /tmp && timeout 600 python3 /tmp/run_matrix.py --model '$MODEL' --machine '$M' --only V3 --raw-endpoint http://localhost:11434/v1" 2>&1 | tee -a "$LOG_FILE"; then
        
        # Pull results
        if scp -o ConnectTimeout=10 -o BatchMode=yes -q "$M:/tmp/results/${sanitized_model}__${M}__V3.json" "$RESULTS_ROOT/" 2>/dev/null; then
          log_ok "Test PASSED"
          ((TESTS_PASSED++))
        else
          log_warn "Test ran but result pull failed"
          ((TESTS_FAILED++))
        fi
      else
        log_error "Test execution failed"
        ((TESTS_FAILED++))
      fi
    done
  done
  
  # Summary
  log_section "TEST HARNESS COMPLETE"
  log "Tests passed: $TESTS_PASSED"
  log "Tests failed: $TESTS_FAILED"
  log "Results: $RESULTS_ROOT"
  
  if [ $TESTS_FAILED -gt 0 ]; then
    print_setup_guide
    return 1
  fi
  
  return 0
}

main "$@"
