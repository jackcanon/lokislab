# How to Run the Loki's Lab V3 Test Harness

Welcome! This guide walks you through running the comprehensive V3 test harness on your machine. Whether you have a Mac, Linux box, or Windows (WSL2), we've got you covered.

## What Is the V3 Test?

The **V3 Test Suite** is a comprehensive benchmark that evaluates local AI models across **18 different capability areas**:

- **Web Design** (HTML, Python coding)
- **Writing** (product descriptions, rewrites)
- **Graphics** (SVG design, CSS)
- **Infrastructure** (DevOps, system administration)
- **Transcription** (punctuation, formatting)
- **Business** (market research, requirements)
- **Native Coding** (Python, Swift, C++)
- **Vision** (image understanding)
- **Structured Output** (JSON schema compliance)
- **Long-Context** (finding hidden info in 40K+ token documents)
- **Agentic Chain** (multi-step reasoning)
- **Reasoning** (mathematical problem solving)

Each test takes **30 seconds to 10 minutes** depending on your hardware and model size.

---

## Prerequisites

### What You Need

1. **A local machine** with:
   - **Minimum 16GB RAM** (for qwen3.6:latest, our test model)
   - **macOS (M1+), Linux, or Windows/WSL2**
   - **~50GB free disk space** (for model + test files)

2. **Ollama installed** from https://ollama.ai
   - **macOS:** Download and run the installer
   - **Linux:** `curl https://ollama.ai/install.sh | sh`
   - **Windows/WSL2:** Install Windows Ollama, then run `ollama serve` in WSL2 Ubuntu

3. **Python 3.8+** (for running the test engine)
   - Check: `python3 --version`

### Hardware Requirements by Model

| Model | Min RAM | Recommended | Notes |
|-------|---------|-------------|-------|
| **qwen3.5:4b** | 8GB | 16GB | Fastest (1-2 min per test) |
| **qwen3.6:latest** (22GB) | 24GB | 32GB+ | Medium (2-5 min per test) |
| **qwen3.8:27b** (27GB) | 32GB | 48GB+ | Slowest (5-10 min per test) |

**Not enough RAM?** Use a smaller model like `qwen3.5:4b` — it's still comprehensive and much faster!

---

## Step 1: Install Ollama

### macOS
1. Visit https://ollama.ai/download
2. Download the macOS version
3. Double-click to install
4. Open Terminal and verify: `ollama --version`

### Linux
```bash
curl https://ollama.ai/install.sh | sh
ollama --version
```

### Windows/WSL2
1. Install Ollama for Windows from https://ollama.ai/download
2. Open **WSL2 Ubuntu terminal** and run:
   ```bash
   ollama serve
   ```
   (This connects to your Windows Ollama installation)

---

## Step 2: Download the Test Harness

```bash
# Create a working directory
mkdir -p ~/loki-v3-test
cd ~/loki-v3-test

# Download the test harness
curl -fsSL https://lokislab.org/eval/v3_test_harness.sh -o v3_test_harness.sh

# Make it executable
chmod +x v3_test_harness.sh
```

---

## Step 3: Prepare Your Model

The harness will **automatically pull** the model from Ollama Hub if it's not cached locally. However, you can **pre-cache it** for faster startup:

```bash
# Pre-cache the model (one-time, ~10-30 minutes)
ollama pull qwen3.6:latest
```

**If pull is slow?** See the [Troubleshooting](#troubleshooting) section below.

---

## Step 4: Run the Tests

### Basic Run
```bash
./v3_test_harness.sh
```

### Run with Specific Model
```bash
./v3_test_harness.sh --model qwen3.5:4b
```

### What Happens Next

1. **Pre-flight checks** (30 seconds)
   - Verifies SSH connectivity to your machines
   - Checks Ollama is running and accessible
   - Validates disk space

2. **Model caching** (if needed)
   - Pulls qwen3.6:latest from Ollama Hub (~10-30 minutes on first run)
   - Subsequent runs skip this step

3. **Test execution** (2-4 hours for full suite)
   - Runs all 18 tests sequentially
   - Displays progress for each test
   - Shows quality scores and timing

4. **Results saved**
   - Results appear in `./results/` directory
   - Each test gets its own JSON file
   - Ready for upload to Loki's Lab

---

## Step 5: Monitor Progress

While tests run, you'll see output like:

```
[qwen3.6:latest on mycomputer] running 1a (coding_web_design)...
[✓] Test PASSED (75.6s) q=5 a=4

[qwen3.6:latest on mycomputer] running 1b (coding_web_design)...
[✓] Test PASSED (91.0s) q=5 a=4

...
```

**What these mean:**
- `q=5` = Quality score (5 is perfect)
- `a=4` = Accuracy score (5 is perfect)
- `75.6s` = Time to run this test

---

## Step 6: Review Your Results

After tests complete, check the results:

```bash
# See results directory
ls -la results/

# View a specific result
cat results/qwen3.6_latest__yourmachine__1a.json | jq .
```

Each result file contains:
- **capable:** Did the model pass?
- **quality:** Quality score (1-5)
- **accuracy:** Accuracy score (1-5)
- **speed_seconds:** How long it took
- **raw_output:** Model's actual response

---

## Step 7: Submit Results to Loki's Lab

### Option A: Web Submission (Recommended)

1. Go to https://lokislab.org/test/results
2. Click "Submit a benchmark result"
3. Upload your results JSON files
4. Your results appear on the leaderboard

### Option B: Manual Git Submission

1. Fork https://github.com/jackcanon/lokislab
2. Add your results to `data/results/`
3. Submit a pull request
4. We verify and merge

---

## Troubleshooting

### "Model pull is very slow or timing out"

**Symptom:** Model download stuck or times out after several minutes

**Solutions (try in order):**

1. **Check network:**
   ```bash
   ping ollama.ai
   ```

2. **Try a smaller model first:**
   ```bash
   ollama pull qwen3.5:4b  # Much smaller (1-2 minutes)
   ```

3. **Check disk space:**
   ```bash
   df -h ~/.ollama/models
   ```
   Need at least 50GB free. If low, see [Disk Space Issues](#disk-space-issues).

4. **Restart Ollama:**
   ```bash
   # macOS
   pkill Ollama
   open -a Ollama
   
   # Linux
   sudo systemctl restart ollama
   
   # WSL2 (Windows)
   pkill ollama
   ollama serve
   ```

5. **Try direct download:**
   ```bash
   # Download model manifest directly
   ollama pull qwen3.6:latest --verbose
   ```

### Disk Space Issues

**Symptom:** "Not enough space" error or test hangs

**How to check:**
```bash
# See how much space Ollama is using
du -sh ~/.ollama/models

# See total free space
df -h ~/
```

**Solutions:**

1. **Free up space:**
   ```bash
   # Clean old downloads (safe)
   rm -rf ~/.ollama/models/blobs/unused/*
   
   # Or use a different disk
   mkdir -p /mnt/fast-disk/ollama-models
   export OLLAMA_MODELS=/mnt/fast-disk/ollama-models
   ```

2. **Use smaller model:**
   ```bash
   ollama pull qwen3.5:4b  # Only 4GB
   ```

3. **Use external storage:**
   ```bash
   # Copy models to USB drive or NAS
   cp -r ~/.ollama/models /mnt/external-drive/
   export OLLAMA_MODELS=/mnt/external-drive/ollama-models
   ```

### "Ollama API not responding"

**Symptom:** Tests fail with "HTTP 404" or connection refused

**Solutions:**

1. **Check if Ollama is running:**
   ```bash
   # macOS
   pgrep Ollama
   
   # Linux
   systemctl status ollama
   
   # WSL2
   pgrep ollama
   ```

2. **Restart Ollama:**
   ```bash
   # macOS
   killall Ollama
   open -a Ollama
   sleep 5
   
   # Linux
   sudo systemctl restart ollama
   sleep 5
   
   # WSL2
   pkill ollama
   ollama serve
   ```

3. **Test connectivity manually:**
   ```bash
   curl http://localhost:11434/api/tags
   ```
   Should show your models. If it times out, Ollama isn't responding.

### "Tests are very slow"

**Why it happens:**
- Small RAM (model swapping to disk)
- Older CPU
- Disk is slow (HDD vs SSD)
- Other apps using CPU

**What you can do:**
1. **Close other apps** (browsers, IDEs, video apps)
2. **Use a smaller model** (`qwen3.5:4b` is 4x faster)
3. **Enable Ollama GPU acceleration** (NVIDIA/Apple Metal):
   ```bash
   # macOS: GPU is automatic
   # NVIDIA Linux: Install CUDA drivers
   # Check: ollama --help | grep -i gpu
   ```

### "Some tests are failing or returning empty"

**Symptom:** Tests show `capable=false` or `raw_output=""`

**Common causes:**
- Model not fully loaded (wait 30 seconds, retry)
- Ollama out of memory (restart it)
- Network timeout pulling model (restart Ollama, try again)

**What to do:**
1. **Wait a moment:** Model might still be loading
2. **Restart Ollama:** See above
3. **Check logs:**
   ```bash
   tail -50 /tmp/v3_battery_*.log
   ```
4. **Try smaller model:** Confirm setup works first

---

## Performance Expectations

### Typical Times (qwen3.6:latest)

| Hardware | Per-Test Time | Full Suite |
|----------|---------------|-----------|
| MacBook M1 (16GB) | 2-5 min | 2-4 hours |
| MacBook M4 Max (36GB) | 1-2 min | 1-2 hours |
| Linux + RTX 4070 | 1-2 min | 1-2 hours |
| Laptop w/o GPU | 5-10 min | 4-8 hours |

**Faster option:** Use `qwen3.5:4b` (same comprehensive tests, 3-4x faster)

---

## FAQ

**Q: Can I run multiple machines at once?**
A: Yes! Run the harness on each machine independently. Each produces its own results.

**Q: Do I need internet while tests run?**
A: Only for the initial model download. After that, tests run completely offline.

**Q: Can I stop and resume tests?**
A: Not currently. But you can run tests on different machines in parallel.

**Q: What if I have an older laptop?**
A: Use `qwen3.5:4b` (4B model, much faster and still comprehensive). It runs on 8GB RAM comfortably.

**Q: Can I submit partial results?**
A: Yes! Even if only 5 tests complete, submit what you have. We'll still add it to the leaderboard.

**Q: How do I know if my results are good?**
A: Check the leaderboard at https://lokislab.org/test/results — you can compare your hardware/model combo against others.

---

## Questions or Issues?

- **Results page:** https://lokislab.org/test/results
- **Test page (setup help):** https://lokislab.org/test
- **GitHub issues:** https://github.com/jackcanon/lokislab/issues

---

## What Happens With Your Data?

When you submit results:
- Your model performance is **public** on the leaderboard
- Your machine specs (RAM, CPU) are **public**
- No personal data is collected
- Results are anonymized by default (you can add your name if you want)

---

## Next Steps

1. ✅ Install Ollama
2. ✅ Download the harness
3. ✅ Run tests
4. ✅ Submit results to https://lokislab.org/test/results
5. ✅ See your hardware/model on the leaderboard!

**Good luck! We can't wait to see what your machine can do.** 🚀
