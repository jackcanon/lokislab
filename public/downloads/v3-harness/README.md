# V3 Test Harness Downloads

Download the harness script for your platform and follow the on-screen instructions.

## Linux

Run in your terminal:

\`\`\`bash
curl -O https://lokislab.org/downloads/v3-harness/v3_test_harness_linux.sh
chmod +x v3_test_harness_linux.sh
./v3_test_harness_linux.sh
\`\`\`

**Requirements:**
- bash 4+
- curl
- Ollama (auto-installed if missing)
- 16GB+ RAM recommended

## macOS

Run in your terminal:

\`\`\`bash
curl -O https://lokislab.org/downloads/v3-harness/v3_test_harness_macos.sh
chmod +x v3_test_harness_macos.sh
./v3_test_harness_macos.sh
\`\`\`

**Requirements:**
- macOS 12.0+ (Monterey or later)
- Apple Silicon (M1+) or Intel Mac
- 16GB+ unified memory recommended
- Ollama (auto-installed if missing)

## Windows

Run in PowerShell (as Administrator):

\`\`\`powershell
Invoke-WebRequest -Uri "https://lokislab.org/downloads/v3-harness/v3_test_harness_windows.ps1" -OutFile v3_test_harness_windows.ps1
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\\v3_test_harness_windows.ps1
\`\`\`

**Requirements:**
- Windows 10 or later
- 16GB+ RAM recommended
- Ollama (auto-installed if missing)
- PowerShell 5.0+

## What Happens When You Run

1. **Hardware Detection** - Automatically detects your GPU, CPU, and available memory
2. **Model Selection** - Selects the best model for your hardware
3. **Test Execution** - Runs the V3 benchmark (4096 input tokens, finds hidden word)
4. **Results** - Shows pass/fail, accuracy score, and timing
5. **Submission** - Opens browser for leaderboard submission

## What Comes Next

- **Logs:** Check \`~/loki-v3-test/harness-TIMESTAMP.log\` if something fails
- **Submit:** Results open in your browser for leaderboard submission
- **Questions:** See the full how-to guide at lokislab.org/docs/v3-testing

---

*v2.0.0 — Loki's Lab V3 Harness*
