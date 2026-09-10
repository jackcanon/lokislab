# V3 Test Harness Downloads

Download the harness script for your platform and follow the instructions below.

## Linux

Open Terminal and run:

```bash
curl -O https://lokislab.org/downloads/v3-harness/v3_test_harness_linux.sh
chmod +x v3_test_harness_linux.sh
./v3_test_harness_linux.sh
```

**That's it!** The script handles everything automatically.

## macOS

Open Terminal and run:

```bash
curl -O https://lokislab.org/downloads/v3-harness/v3_test_harness_macos.sh
chmod +x v3_test_harness_macos.sh
./v3_test_harness_macos.sh
```

**That's it!** The script handles everything automatically.

## Windows

**IMPORTANT: You must run PowerShell as Administrator**

### Step 1: Open PowerShell as Administrator

1. Right-click on **PowerShell**
2. Select **"Run as Administrator"**
3. Click **"Yes"** when prompted

### Step 2: Copy and paste EACH command below into PowerShell

**Command 1:** Copy and paste this:

```powershell
cd $env:USERPROFILE
```

Press Enter.

**Command 2:** Copy and paste this:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/jackcanon/lokislab/main/public/downloads/v3-harness/v3_test_harness_windows.ps1" -OutFile v3_test_harness_windows.ps1
```

Press Enter.

**Command 3:** Copy and paste this:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
```

Press Enter.

**Command 4:** Copy and paste this:

```powershell
.\v3_test_harness_windows.ps1
```

Press Enter and **the script will run automatically!**

### What the Windows Script Does

1. Checks if Ollama is installed (auto-installs if missing)
2. Starts Ollama service
3. Detects your GPU and RAM
4. Selects the best model for your hardware
5. Downloads the model
6. Shows you a summary of what's ready

**The entire process is automatic. No other steps needed!**

## What Happens When You Run

1. **Hardware Detection** - Automatically detects your GPU, CPU, and available memory
2. **Model Selection** - Selects the best model for your hardware
3. **Ollama Setup** - Auto-installs and starts Ollama (Windows only)
4. **Model Download** - Downloads the AI model (5-30 minutes depending on size)
5. **Results** - Shows your system configuration and where results are saved

## Results & Submission

After the script completes:
- Results are saved to `~/loki-v3-test/` (or `C:\Users\YourName\loki-v3-test\` on Windows)
- Visit https://lokislab.org/test/results to submit your score

## Troubleshooting

### Windows: "cannot be loaded because running scripts is disabled"

**Solution:** Make sure you ran ALL 4 commands in order:
1. `cd $env:USERPROFILE`
2. Download command (`Invoke-WebRequest...`)
3. `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force`
4. `.\v3_test_harness_windows.ps1`

### Windows: "Access is denied"

**Solution:** Make sure PowerShell is running as Administrator. Right-click PowerShell and select "Run as Administrator" before pasting commands.

### The script seems frozen

**This is normal!** Model download can take 5-30 minutes depending on model size. Your computer may appear unresponsive. Do NOT close the window. Wait for it to complete.

## Support

- **Logs:** Check the results folder for detailed logs if something fails
- **Issues:** Report problems on https://github.com/jackcanon/lokislab/issues
- **Questions:** See the full how-to guide at https://lokislab.org/docs/v3-testing

---

*v3.3.0 — Loki's Lab V3 Harness*
