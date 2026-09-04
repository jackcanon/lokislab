# V3 Test Quick Reference Card

**Print this, bookmark it, or screenshot it before running the test**

---

## 🎯 The Three Steps

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: PRE-FLIGHT CHECK (5-10 min)                         │
├─────────────────────────────────────────────────────────────┤
│ Run this FIRST to catch problems early:                      │
│                                                              │
│ macOS/Linux:                                                │
│   curl -fsSL https://lokislab.org/eval/setup-check.sh \   │
│     -o ~/setup-check.sh && bash ~/setup-check.sh           │
│                                                              │
│ Windows:                                                     │
│   Download setup-check.ps1, then:                          │
│   powershell -ExecutionPolicy Bypass -File setup-check.ps1 │
│                                                              │
│ If this fails ❌ → FIX THE ISSUE BEFORE MOVING ON          │
│ If this passes ✅ → PROCEED TO STEP 2                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: RUN THE V3 TEST (60-120 min)                        │
├─────────────────────────────────────────────────────────────┤
│ macOS/Linux:                                                │
│   curl -fsSL https://lokislab.org/eval/v3_test_harness.sh \│
│     -o ~/v3_test_harness.sh && bash ~/v3_test_harness.sh   │
│                                                              │
│ Windows:                                                     │
│   Download v3_test_harness.ps1, then:                      │
│   powershell -ExecutionPolicy Bypass \                      │
│     -File v3_test_harness.ps1                              │
│                                                              │
│ ⏱️  EXPECTED TIME: 60-120 minutes depending on hardware      │
│ 📊 OUTPUT: JSON file in ~/loki-v3-test/                     │
│ ✅ SUCCESS: "Test complete! Results saved to..."            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: SUBMIT RESULTS (2 min)                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Find your JSON file:                                     │
│    macOS/Linux: ~/loki-v3-test/                            │
│    Windows: %USERPROFILE%\loki-v3-test\                    │
│                                                              │
│ 2. Go to: https://lokislab.org/submit                      │
│                                                              │
│ 3. Upload your JSON file                                    │
│                                                              │
│ 4. Click "Submit"                                          │
│                                                              │
│ ✅ DONE! See your result on the leaderboard                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 What to Check If Something Goes Wrong

| Problem | Check | Fix |
|---------|-------|-----|
| "Ollama not found" | `ollama --version` | Install Ollama (ollama.ai/download) |
| "Not enough RAM" | `free -h` (Linux) or Activity Monitor (Mac) | Use qwen3.5:4b instead |
| "Not enough disk" | `df -h` | Free up 30-50GB |
| "Model pull timeout" | Check internet: `ping 8.8.8.8` | Restart Ollama, try smaller model |
| "Test hangs for 30+ min" | This is NORMAL for large models | Let it finish |
| "Connection refused" | `curl http://localhost:11434` | Restart Ollama service |
| "Can't find results" | `ls ~/loki-v3-test/` | Check your home directory |

---

## ⏱️ Expected Timelines

| Stage | Time | What's Happening |
|-------|------|------------------|
| Pre-flight check | 5-10 min | Validating your system |
| Model download (first time) | 10-30 min | Pulling 4-27GB model file |
| Test execution | 5-30 min | Processing long-context task |
| Result file generation | <1 min | Writing JSON output |
| **TOTAL** | **60-120 min** | Depends on model size + hardware |

**Note:** Model download happens ONLY on first run. Subsequent runs skip this step.

---

## 💾 Hardware Recommendations

| Model | Min RAM | Recommended | CPU/GPU | Speed |
|-------|---------|-------------|---------|-------|
| qwen3.5:4b | 8GB | 16GB | Any | 🟢 Fast (1-2 min/test) |
| qwen3.6:latest | 24GB | 32GB+ | ARM/GPU | 🟡 Medium (3-5 min/test) |
| qwen3.8:27b | 32GB | 48GB+ | GPU | 🔴 Slow (5-15 min/test) |

**Recommendation:** Start with `qwen3.5:4b`. It's comprehensive and fast.

---

## 🚨 Emergency Stops

**If test is stuck or you need to stop it:**

**macOS/Linux:**
```bash
# Kill the test process
killall ollama

# Wait 5 seconds, then restart
sleep 5
ollama serve &
```

**Windows:**
```powershell
# Stop Ollama service
Stop-Service -Name Ollama

# Wait 5 seconds, then restart
Start-Service -Name Ollama
```

---

## 📞 Get Help

**If you're stuck:**
1. Read: https://lokislab.org/docs/V3-TROUBLESHOOTING-FAQ.md
2. Post in: [Community forum] (link coming soon)
3. Include: OS version, RAM, GPU (if any), and the error message

---

## ✅ Success Checklist

- [ ] Pre-flight check passed ✅
- [ ] Ollama is installed and running
- [ ] Have 16GB+ RAM (or using qwen3.5:4b)
- [ ] Have 30-50GB free disk space
- [ ] Internet connection is stable
- [ ] Test completed without errors
- [ ] JSON result file exists in ~/loki-v3-test/
- [ ] Ready to submit results

---

**Launched:** September 3, 2026  
**Version:** 1.0  
**Support:** https://lokislab.org  
