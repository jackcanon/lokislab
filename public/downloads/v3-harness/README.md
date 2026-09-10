# V3 Test Harness - Download & Setup

Download the setup script for your operating system, then **double-click to run**. Everything else happens automatically.

---

## 🪟 Windows

**Download:** [`v3_setup.ps1`](v3_setup.ps1)

1. Right-click the file
2. Select "Run with PowerShell"
3. When prompted, click "Run"
4. Watch as each milestone completes:
   - ✓ Check Administrator
   - ✓ Detect Hardware
   - ✓ Select Model
   - ✓ Install Ollama
   - ✓ Start Ollama Service
   - ✓ Download Model
   - ✓ Run Test

When it says "SETUP COMPLETE", visit https://lokislab.org/test to run the benchmark.

---

## 🐧 Linux

**Download:** [`v3_setup.sh`](v3_setup.sh)

```bash
chmod +x v3_setup.sh
./v3_setup.sh
```

Or double-click the file in your file manager.

Watch as each milestone completes automatically. When it says "SETUP COMPLETE", visit https://lokislab.org/test to run the benchmark.

---

## 🍎 macOS

**Download:** [`v3_setup.sh`](v3_setup.sh)

```bash
chmod +x v3_setup.sh
./v3_setup.sh
```

Or double-click the file in Finder.

Watch as each milestone completes automatically. When it says "SETUP COMPLETE", visit https://lokislab.org/test to run the benchmark.

---

## What The Setup Does

Each setup script:
1. **Detects your hardware** (GPU, VRAM, system RAM)
2. **Selects the best model** for your system
   - 75GB+ VRAM → qwen3.8-flash-next (125B)
   - 35GB+ VRAM → qwen3.8:27b (27B)
   - 25GB+ VRAM → qwen3.6:latest (12B)
   - 8GB+ VRAM → qwen3.5:4b (4B)
3. **Installs Ollama** (if not present)
4. **Starts Ollama service**
5. **Downloads your model** (5-30 minutes)
6. **Shows you a summary** and next steps

All progress is displayed with real-time milestones so you know exactly what's happening.

---

## Troubleshooting

**Windows: "Administrator required" error**
- Right-click PowerShell → "Run as Administrator"
- Then run the script again

**Linux/macOS: "command not found" error**
- Open Terminal and run: `chmod +x v3_setup.sh && ./v3_setup.sh`

**Ollama install fails**
- Visit https://ollama.ai manually and install
- Then re-run the setup script

**Model download appears frozen**
- This is normal! Large models take 5-30 minutes to download
- Do NOT close the window
- Watch the log for progress

**Still stuck?**
- Check the log file in `~/loki-v3-test/harness-TIMESTAMP.log`
- Report the error at https://github.com/jackcanon/lokislab/issues

---

## After Setup

Once setup is complete:
1. Visit https://lokislab.org/test
2. Choose your platform (Windows/Linux/macOS)
3. Follow the benchmark instructions
4. Submit your result to the leaderboard

---

**Questions?** Email jack@lokislab.org or open an issue on GitHub.
