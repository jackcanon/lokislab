# V3 Test Harness Downloads

Download the harness script for your platform and follow the instructions below.

## Linux

Run in your terminal:

```bash
curl -O https://lokislab.org/downloads/v3-harness/v3_test_harness_linux.sh
chmod +x v3_test_harness_linux.sh
./v3_test_harness_linux.sh
```

**Requirements:**
- bash 4+
- curl
- Ollama (auto-installed if missing)
- 16GB+ RAM recommended

## macOS

Run in your terminal:

```bash
curl -O https://lokislab.org/downloads/v3-harness/v3_test_harness_macos.sh
chmod +x v3_test_harness_macos.sh
./v3_test_harness_macos.sh
```

**Requirements:**
- macOS 12.0+ (Monterey or later)
- Apple Silicon (M1+) or Intel Mac
- 16GB+ unified memory recommended
- Ollama (auto-installed if missing)

## Windows

**Step 1:** Open PowerShell as Administrator

**Step 2:** Download the script

```powershell
# Copy and paste this entire command
Invoke-WebRequest -Uri "https://lokislab.org/downloads/v3-harness/v3_test_harness_windows.ps1" -OutFile v3_test_harness_windows.ps1
```

**Step 3:** Allow the script to run

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

**Step 4:** Run it

```powershell
.\v3_test_harness_windows.ps1
```

**If you need to specify a model:**

```powershell
.\v3_test_harness_windows.ps1 -Model "qwen3.6:latest"
```

**Requirements:**
- Windows 10 or later
- 16GB+ RAM recommended
- Ollama (auto-installed if missing)
- PowerShell 5.0+ (comes with Windows 10+)
- Python 3.8+ (optional, but needed for full testing)

### Troubleshooting Windows

- **"File not found" error:** Make sure you're in the same directory where you downloaded the script. Use AGENTS.md
ARTICLE-PIPELINE.md
Articles
DEPLOY.md
FABLE_VIDEO_QUICK_START.md
FABLE_VIDEO_REQUIREMENTS.md
LOG
LOG_FILE
VIDEO_TUTORIAL_READY.md
app
benchmark
components
components.json
content
data
docs
examples
hooks
lib
next-env.d.ts
next.config.mjs
next.config.ts
node_modules
package-lock.json
package.json
postcss.config.mjs
public
schemas
scripts
tailwind.config.ts
test-acceptance-criteria.mjs
test-image-implementation.mjs
test-sample-article.mjs
tests
tsconfig.json
tsconfig.tsbuildinfo
vercel.json
verify-article.mjs
verify-image-implementation.mjs
verify-schema.mjs
verify-urls.mjs
vite.config.ts to check.
- **"Cannot be loaded because running scripts is disabled" error:** Run the  command above first.
- **Ollama not found:** The script will try to auto-install it. If that fails, visit https://ollama.ai and install manually.

## What Happens When You Run

1. **Hardware Detection** - Automatically detects your GPU, CPU, and available memory
2. **Model Selection** - Selects the best model for your hardware
3. **Model Download** - Downloads the model via Ollama (if not already present)
4. **Test Execution** - Runs the V3 benchmark (finds hidden word in 4096 tokens)
5. **Results** - Shows pass/fail, accuracy score (0-5), and wall-clock time
6. **Logging** - Saves full logs to 

## Results & Submission

After the test completes:
- Results are displayed in the terminal
- A results JSON file is saved for submission
- Visit https://lokislab.org/test/results to submit your score

## Support

- **Logs:** Check  if something fails
- **Issues:** Report problems on https://github.com/jackcanon/lokislab/issues
- **Questions:** See the full how-to guide at https://lokislab.org/docs/v3-testing

---

*v3.0.0 — Loki's Lab V3 Harness*
