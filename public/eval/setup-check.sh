#!/bin/bash
# Loki's Lab V3 Test Harness — Pre-Flight System Check
# Runs before the main test to catch problems early
# Works on macOS and Linux

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    Loki's Lab V3 Test — System Health Check               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

check_result() {
  local status=$1
  local message=$2
  if [ $status -eq 0 ]; then
    echo "✅ $message"
    ((PASSED++))
  else
    echo "❌ $message"
    ((FAILED++))
  fi
}

warn_result() {
  local message=$1
  echo "⚠️  $message"
  ((WARNINGS++))
}

# 1. Check OS
echo "━━ SYSTEM INFORMATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
OS=$(uname -s)
ARCH=$(uname -m)
echo "OS: $OS"
echo "Architecture: $ARCH"

if [[ "$ARCH" == "arm64" ]] || [[ "$ARCH" == "aarch64" ]]; then
  echo "Type: Apple Silicon / ARM64"
elif [[ "$ARCH" == "x86_64" ]]; then
  echo "Type: Intel / x86_64"
fi
echo ""

# 2. Check RAM
echo "━━ SYSTEM RESOURCES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$OS" == "Darwin" ]]; then
  TOTAL_RAM_GB=$(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
else
  TOTAL_RAM_GB=$(($(grep MemTotal /proc/meminfo | awk '{print $2}') / 1024 / 1024))
fi
echo "Total RAM: ${TOTAL_RAM_GB}GB"

if [ $TOTAL_RAM_GB -ge 24 ]; then
  check_result 0 "RAM: ${TOTAL_RAM_GB}GB (ideal for qwen3.6:latest)"
elif [ $TOTAL_RAM_GB -ge 16 ]; then
  check_result 0 "RAM: ${TOTAL_RAM_GB}GB (minimum for qwen3.6:latest)"
elif [ $TOTAL_RAM_GB -ge 8 ]; then
  warn_result "RAM: ${TOTAL_RAM_GB}GB (use qwen3.5:4b instead for best performance)"
else
  check_result 1 "RAM: ${TOTAL_RAM_GB}GB (too low, need 8GB minimum)"
fi
echo ""

# 3. Check Disk Space
echo "━━ DISK SPACE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HOME_DISK_GB=$(($(df "$HOME" | awk 'NR==2 {print $4}') / 1024 / 1024))
echo "Free space in $HOME: ${HOME_DISK_GB}GB"

if [ $HOME_DISK_GB -ge 50 ]; then
  check_result 0 "Disk space: ${HOME_DISK_GB}GB (sufficient for qwen3.6:latest)"
elif [ $HOME_DISK_GB -ge 30 ]; then
  warn_result "Disk space: ${HOME_DISK_GB}GB (minimum for qwen3.6:latest, consider qwen3.5:4b)"
else
  check_result 1 "Disk space: ${HOME_DISK_GB}GB (too low, need 30GB minimum)"
fi
echo ""

# 4. Check Ollama Installation
echo "━━ OLLAMA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v ollama &> /dev/null; then
  OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "unknown")
  check_result 0 "Ollama installed: $OLLAMA_VERSION"
  
  # Check if Ollama is running
  if pgrep -x "ollama" > /dev/null; then
    check_result 0 "Ollama service is running"
  else
    warn_result "Ollama is installed but NOT running. You can start it manually:"
    if [[ "$OS" == "Darwin" ]]; then
      echo "  → Run: ollama serve"
      echo "  → OR: open -a Ollama"
    else
      echo "  → Run: ollama serve"
    fi
  fi
else
  check_result 1 "Ollama not found. Install it:"
  if [[ "$OS" == "Darwin" ]]; then
    echo "  → Download: https://ollama.ai/download/Ollama-darwin.zip"
    echo "  → OR: brew install ollama"
  else
    echo "  → Run: curl https://ollama.ai/install.sh | sh"
  fi
fi
echo ""

# 5. Check Python
echo "━━ PYTHON & DEPENDENCIES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v python3 &> /dev/null; then
  PYTHON_VERSION=$(python3 --version 2>&1)
  check_result 0 "$PYTHON_VERSION"
else
  check_result 1 "Python 3 not found. Install via:"
  if [[ "$OS" == "Darwin" ]]; then
    echo "  → brew install python3"
  else
    echo "  → apt install python3 python3-pip"
  fi
fi
echo ""

# 6. Check Internet Connectivity
echo "━━ NETWORK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if ping -c 1 -W 2 8.8.8.8 &> /dev/null; then
  check_result 0 "Internet connectivity: OK"
else
  check_result 1 "Internet connectivity: FAILED (cannot reach 8.8.8.8)"
fi

# Test Ollama Hub connectivity
if command -v curl &> /dev/null; then
  if timeout 5 curl -s --head https://ollama.ai > /dev/null 2>&1; then
    check_result 0 "Ollama Hub reachable: OK"
  else
    warn_result "Ollama Hub unreachable (may slow down model pull)"
  fi
fi
echo ""

# 7. Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SUMMARY                                                   ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║ ✅ Passed: $PASSED"
echo "║ ❌ Failed: $FAILED"
echo "║ ⚠️  Warnings: $WARNINGS"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "❌ SYSTEM CHECK FAILED"
  echo "Fix the issues above and try again."
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo "⚠️  SYSTEM CHECK PASSED (with warnings)"
  echo "You can proceed, but may experience slower performance."
  echo ""
  read -p "Continue? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
else
  echo "✅ SYSTEM CHECK PASSED"
  echo "Your system is ready for the V3 test!"
fi
echo ""
echo "Next step: Run the V3 test harness"
echo "  → bash ~/v3_test_harness.sh"
