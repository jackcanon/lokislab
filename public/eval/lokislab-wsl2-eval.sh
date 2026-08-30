#!/bin/bash
# ===== Loki's Lab — public local-AI throughput benchmark (WSL2 / Ubuntu) =====
# For a member of the public with ONLY WSL2 installed (no Ollama, no CUDA toolkit).
# Produces a v1 submission envelope JSON you upload to the Loki's Lab benchmark form.
#
# SAFETY / RESILIENCE NOTES (do NOT wrap in `set -e`):
#  - Every step is idempotent and prints progress. A single transient failure
#    will not abort the script or close your terminal.
#  - We do NOT pipe any install script to a shell. Install Ollama from the
#    official Windows installer (see step 2) — that is the supported path.
#  - The JSON emitted contains NO email, user path, or private IP.
#
# WHAT IT MEASURES: pure inference throughput (tokens/sec) of a local model on
# your GPU, using Ollama. This is a system-performance track, not an agent-work
# suite, so it runs on a bare machine with no harness required.

set -u   # treat undefined vars as error, but do NOT exit on command failure

echo "=== Loki's Lab WSL2 throughput benchmark ==="

# ---- 1) Verify the GPU is exposed to WSL2 --------------------------------
if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "✗ nvidia-smi not found — the NVIDIA WSL support driver is missing."
  echo "  Fix on WINDOWS: install the NVIDIA Game Ready or Studio driver"
  echo "  (it bundles the WSL2 CUDA component). Reboot Windows, reopen Ubuntu, re-run."
  exit 1
fi
GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)
GPU_VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader | head -1)
echo "  GPU: $GPU_NAME ($GPU_VRAM)"

# ---- 2) Ensure Ollama is installed ---------------------------------------
# Public path: install from https://ollama.com/download (Windows installer),
# which also sets up the WSL/Linux binary. If `ollama` is already on PATH, skip.
if ! command -v ollama >/dev/null 2>&1; then
  echo "✗ Ollama not found. Install it first (one time):"
  echo "    1. On WINDOWS: download & run https://ollama.com/download (Windows installer)."
  echo "    2. Reopen this Ubuntu terminal — 'ollama' should now be on PATH."
  echo "    (We do not auto-run a remote install script for security.)"
  exit 1
fi

# ---- 3) Start Ollama (WSL2 usually has no systemd) -----------------------
if ! pgrep -f "ollama serve" >/dev/null 2>&1; then
  echo "  Starting Ollama…"
  nohup ollama serve > ~/.ollama/serve.log 2>&1 &
  sleep 5
fi

# ---- 4) Pick a model that fits 8 GB VRAM (RTX 3070 class) ----------------
# qwen2.5:7b-instruct-q4_K_M ≈ 4.5 GB — fully on GPU, fast. Change if you have
# a different GPU; see https://lokislab.org for fit guidance.
MODEL="qwen2.5:7b-instruct-q4_K_M"
ollama pull "$MODEL" || { echo "✗ pull failed — check disk space / internet."; exit 1; }
MODEL_VER=$(ollama show "$MODEL" --parameters 2>/dev/null | head -1 || true)
MODEL_VER="${MODEL_VER:-q4_K_M}"

# ---- 5) Run 3 timed generations (throughput) ------------------------------
PROMPT="Explain the trade-offs between quantization levels for a 7B model on an 8GB GPU, in 3 bullet points."
total_tok=0
runs_json=""
for i in 1 2 3; do
  start=$(date +%s.%N)
  # Ask for a fixed token budget so runs are comparable
  out=$(ollama run "$MODEL" --keepalive 0 "$(printf '%s Reply in roughly 120 tokens.' "$PROMPT")" 2>/dev/null)
  end=$(date +%s.%N)
  elapsed=$(awk "BEGIN{printf \"%.2f\", $end-$start}")
  # crude token estimate: ~4 chars/token
  tok=$(awk -v n=${#out} 'BEGIN{printf "%d", n/4}')
  total_tok=$((total_tok + tok))
  runs_json="${runs_json}
    {
      \"test_id\": \"TPUT-001\",
      \"category\": \"system-performance\",
      \"run_number\": $i,
      \"capable\": true,
      \"skipped\": false,
      \"quality\": 3,
      \"accuracy\": 3,
      \"speed_seconds\": $elapsed,
      \"total_wall_seconds\": $elapsed,
      \"raw_output\": \"Run $i completed in ${elapsed}s (~${tok} tokens).\",
      \"notes\": \"Throughput run $i of 3.\",
      \"tested_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S+00:00)\"
    }"
  echo "  run $i: ${elapsed}s (~${tok} tokens)"
done

# ---- 6) Emit the v1 submission envelope ----------------------------------
SUB_ID="LL-$(hostname -s | tr 'a-z' 'A-Z' | tr -dc 'A-Z0-9' | head -c 6)$(date +%S)"
# ensure it matches ^LL-[A-Z0-9][A-Z0-9-]{5,63}$
OS_VER=$(grep -oE '[0-9]+\.[0-9]+' /proc/version 2>/dev/null | head -1 || echo "WSL2")
MEM_GB=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo 0)
ARCH=$(uname -m); [ "$ARCH" = "x86_64" ] && ARCH="x86_64" || ARCH="arm64"

OUT_FILE="$HOME/lokislab-submission.json"
cat > "$OUT_FILE" <<JSON
{
  "schema_version": "1.0",
  "submission_id": "$SUB_ID",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%S+00:00)",
  "suite": { "id": "lokislab-public-throughput", "version": "1" },
  "harness": { "name": "Ollama", "version": "$(ollama --version 2>/dev/null | head -1 || echo unknown)", "profile": "default" },
  "system": {
    "computer_description": "WSL2 Ubuntu on Windows 11 with $GPU_NAME ($GPU_VRAM)",
    "os": "Linux",
    "os_version": "$OS_VER (WSL2)",
    "architecture": "$ARCH",
    "cpu": "$(grep -m1 'model name' /proc/cpuinfo 2>/dev/null | cut -d: -f2 | xargs || echo unknown)",
    "gpu": "$GPU_NAME",
    "memory_gb": $MEM_GB
  },
  "model": { "runtime": "Ollama", "name": "qwen2.5", "version": "$MODEL_VER" },
  "configuration": { "type": "publisher_recommended", "settings": { "quantization": "$MODEL_VER" }, "notes": "Public throughput benchmark, 3 runs." },
  "runs": [${runs_json}
  ]
}
JSON

echo ""
echo "==================== SUBMISSION READY ===================="
echo "Saved to: $OUT_FILE"
echo "Upload this file at: https://docs.google.com/forms/d/e/1FAIpQLSecRejUJw49OsKEBOmMKkr2ns4TKZwdeY5Jj3rVSKlU0Hq_3Q/viewform"
echo "========================================================="
