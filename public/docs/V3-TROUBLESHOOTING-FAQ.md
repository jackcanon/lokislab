# Loki's Lab V3 Test — Comprehensive FAQ & Troubleshooting

**Updated:** 2026-09-03  
**Target Audience:** Community members running V3 tests (all skill levels)

---

## Quick Diagnosis: "Something Went Wrong"

**If your test failed, use this flowchart to find the fix:**

```
Did you see a setup-check error? → YES → Look for your error below
                              ↓ NO
Does your system have 16GB+ RAM? → NO → Use qwen3.5:4b (smaller model)
                              ↓ YES
Is Ollama installed and running? → NO → Install Ollama (see below)
                              ↓ YES
Does Ollama say "model not found"? → YES → Wait for model pull (5-30 min)
                              ↓ NO
Did the model pull timeout? → YES → Restart Ollama and retry
                              ↓ NO
Does the test output show "Connection refused"? → YES → Restart Ollama
                              ↓ NO
[Email support or post in community forum]
```

---

## Platform-Specific Setup

### macOS Setup

#### "Ollama is not installed"
**Solution:**
```bash
# Option 1: Download installer from ollama.ai
open https://ollama.ai/download/Ollama-darwin.zip

# Option 2: Use Homebrew
brew install ollama

# Verify installation
ollama --version
```

**If still not found after install:**
- Restart your Terminal
- Check if Ollama is in `/Applications`:
  ```bash
  ls -la /Applications/Ollama.app
  ```

#### "Ollama is installed but not running"
**Solution:**
```bash
# Auto-start Ollama
ollama serve &

# OR manually open it from Applications
open -a Ollama
```

#### "I have an Intel Mac but it's slow"
**Reason:** Intel Macs don't have GPU acceleration for most models
**Solution:**
- Use `qwen3.5:4b` (4GB, much faster)
- Or upgrade to an Apple Silicon Mac eventually

#### "I have Apple Silicon but the test is slow"
**Solution:**
1. Check if Ollama is using the GPU:
   ```bash
   ps aux | grep ollama
   ```
2. Make sure you're not running heavy background tasks
3. Try `qwen3.5:4b` instead of `qwen3.6:latest`

---

### Linux Setup

#### "NVIDIA GPU not detected"
**Reason:** CUDA drivers might not be installed or not in PATH

**Solution:**
1. Check NVIDIA driver:
   ```bash
   nvidia-smi
   ```
   - **Command not found?** Install NVIDIA drivers (see below)
   - **Command works?** Go to step 2

2. Install CUDA (if needed):
   ```bash
   # Ubuntu 22.04
   sudo apt install nvidia-cuda-toolkit
   # Verify
   nvcc --version
   ```

3. Make sure Ollama can see CUDA:
   ```bash
   export CUDA_VISIBLE_DEVICES=0
   ollama serve
   ```

#### "AMD GPU (ROCm) not working"
**Solution:**
```bash
# Install ROCm drivers
sudo apt install rocm-dkms

# Set environment for Ollama
export OLLAMA_LLM_LIBRARY=librocm_runner.so
ollama serve
```

#### "I have a GPU but Ollama uses CPU"
**Debug:**
```bash
# Check if Ollama detects GPU
ollama serve 2>&1 | grep -i gpu

# Force GPU mode
export CUDA_VISIBLE_DEVICES=0
ollama serve
```

#### "Out of memory during model pull"
**Reason:** Model is larger than available GPU/system RAM

**Solution:**
```bash
# Check available VRAM
nvidia-smi

# Use smaller model
qwen3.5:4b  # 4GB
qwen3.6:latest  # 22GB (default)
qwen3.8:27b  # 27GB (largest)

# Download smaller model
ollama pull qwen3.5:4b
```

---

### Windows Setup

#### "Ollama command not found"
**Reason:** Ollama not installed or not in PATH

**Solution:**
1. Download installer: https://ollama.ai/download/windows
2. Run the installer (takes 2-3 minutes)
3. **IMPORTANT:** Check "Add Ollama to PATH" during installation
4. Restart PowerShell
5. Verify:
   ```powershell
   ollama --version
   ```

#### "PowerShell script blocked by execution policy"
**Error message:**
```
File cannot be loaded because running scripts is disabled on this system.
```

**Solution:**
```powershell
# Set execution policy for current user (temporary)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run the script
powershell -ExecutionPolicy Bypass -File v3_test_harness.ps1

# OR use the bypass flag directly (recommended)
powershell -ExecutionPolicy Bypass -File v3_test_harness.ps1
```

#### "Ollama is running but harness can't connect"
**Solution:**
1. Check if Ollama service is actually running:
   ```powershell
   Get-Process ollama
   ```
2. If not found, start it:
   ```powershell
   # Restart Ollama service
   Restart-Service -Name Ollama
   
   # OR manually run
   ollama serve
   ```
3. Check if firewall is blocking localhost:
   ```powershell
   # This should work
   Invoke-WebRequest http://localhost:11434/api/tags
   ```

#### "Windows Defender firewall is blocking Ollama"
**Solution:**
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Click "Change settings"
4. Click "Allow another app..."
5. Find `ollama.exe` and click "Add"
6. Make sure both "Private" and "Public" are checked
7. Click OK and restart Ollama

---

## Model Pull & Download Issues

### "Model pull is slow or timeout"
**Typical speed:** 10-30 minutes (depends on model size and internet speed)

**Debug:**
```bash
# Check internet speed
ping 8.8.8.8
curl -I https://ollama.ai

# Check disk space
df -h ~/.ollama/models

# Monitor download progress
watch -n 1 'du -sh ~/.ollama/models'
```

**Solutions:**
1. **Increase timeout:** Some harnesses have timeout limits
2. **Use pre-cached model:** Ask on the forum if someone can share model files
3. **Try smaller model:** Use `qwen3.5:4b` instead of `qwen3.6:latest`
4. **Retry the pull:**
   ```bash
   # Kill stuck pull
   killall ollama
   # Restart
   ollama serve &
   # Try again
   ollama pull qwen3.6:latest
   ```

### "Model pull succeeded but test says 'model not found'"
**Reason:** Model wasn't fully cached or verification failed

**Solution:**
```bash
# List cached models
ollama list

# If your model is NOT listed, pull it again
ollama pull qwen3.6:latest

# Verify it works
ollama run qwen3.6:latest "Hello, how are you?"
```

---

## Test Execution Issues

### "Test runs but hangs at 'Processing...' for 30+ minutes"
**This is normal.** Large models take a while.

**What's happening:**
- Model is processing 4096 input tokens
- Generating up to 256 output tokens
- On large models: 5-15 minutes per test is typical

**To confirm it's still running:**
```bash
# In another terminal, check Ollama process
ps aux | grep ollama
```

**If truly stuck (>30 min):**
```bash
# Kill and restart
killall ollama
ollama serve &
# Run test again
```

### "Test completes but result file is empty or corrupt"
**Solution:**
```bash
# Check if file exists
ls -lh ~/loki-v3-test/

# Look at file contents
cat ~/loki-v3-test/*.json | python3 -m json.tool
```

If the file is invalid JSON, the test harness had an error. Check the output logs for details.

### "Test says 'Connection refused' or 'Port 11434 not responding'"
**Reason:** Ollama service is not running

**Solution:**
```bash
# Restart Ollama
killall ollama
ollama serve &

# Wait 5 seconds for it to start
sleep 5

# Verify it's running
curl http://localhost:11434/api/tags
```

---

## Result Submission Issues

### "I can't find my result JSON file"
**The file should be at:**
- **macOS/Linux:** `~/loki-v3-test/qwen3.6_latest__HOSTNAME__V3.json`
- **Windows:** `%USERPROFILE%\loki-v3-test\qwen3.6_latest__HOSTNAME__V3.json`

**To find it:**
```bash
# macOS/Linux
find ~ -name "*V3.json" 2>/dev/null

# Windows (PowerShell)
Get-ChildItem -Path $env:USERPROFILE -Filter "*V3.json" -Recurse
```

### "The submission form doesn't accept my JSON"
**Reasons:**
1. **File is corrupt:** Open it and verify it's valid JSON
   ```bash
   python3 -c "import json; json.load(open('your_file.json'))"
   ```
2. **File is too large:** The form might have size limits (usually 5-10MB is fine)
3. **File has wrong format:** Should contain `passed`, `quality`, `accuracy`, `speed_seconds`, etc.

**If unsure,** paste the file contents into the community forum and ask for help.

---

## System Resource Issues

### "I only have 8GB RAM, can I still test?"
**Yes, use a smaller model:**
```bash
ollama pull qwen3.5:4b  # 4GB total
# This model is still comprehensive and well-designed
```

### "I only have 10GB free disk space, is it enough?"
**For `qwen3.5:4b`:** Yes (4GB model)  
**For `qwen3.6:latest`:** Borderline (22GB model + workspace)  
**For `qwen3.8:27b`:** No (need ~40GB)

**Solution:** Free up disk space or use smaller model

### "Can I run the test multiple times?"
**Yes, it's idempotent.** You can run it as many times as you want. Each run will:
1. Check if model is cached (skip download if yes)
2. Run the test with a fresh instance
3. Append results to the results directory

---

## Community Support

**Still stuck?** Post on the forum (link coming soon) with:
1. Your OS (macOS/Linux/Windows) and version
2. Your hardware (CPU, RAM, GPU if applicable)
3. The **full error message** from the harness
4. Output of `ollama --version` and `ollama list`

**Example forum post:**
```
Title: V3 test timeout on Ubuntu 22.04

OS: Ubuntu 22.04, NVIDIA RTX 3090
RAM: 64GB
Error: Model pull timed out after 60 minutes

Output:
$ ollama pull qwen3.6:latest
[Hangs here for 30+ minutes]

Tried: killall ollama, retrying - same issue
Network: 1Gbps connection, can ping ollama.ai

What should I try next?
```

---

## Tips for Success

1. **Run the setup-check first:** It catches 90% of problems before you waste time
2. **Use a wired network:** WiFi can be unreliable for large downloads
3. **Don't stop the test mid-way:** Let it run to completion
4. **Close background apps:** Free up RAM while the test runs
5. **Monitor disk space:** Model pulls can pause if disk fills up
6. **Use smaller model first:** Test with `qwen3.5:4b` before trying larger models

---

**Last updated:** 2026-09-03  
**Tested on:** macOS (M1/M4), Linux (Ubuntu 22.04, Fedora 38), Windows 11  
**Total time from start to result:** 60-120 minutes (depends on hardware)
