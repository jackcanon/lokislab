# V3 Test Harness Downloads

## Windows - EASIEST METHOD

**Download this file and double-click it:**

👉 **[V3_TEST_HARNESS.bat](V3_TEST_HARNESS.bat)**

Right-click it, select Run as Administrator, and it handles everything automatically.

### Manual PowerShell Method (if batch doesn't work)

Open PowerShell as Administrator and run:

```powershell
cd :USERPROFILE
Invoke-WebRequest -Uri https://raw.githubusercontent.com/jackcanon/lokislab/main/public/downloads/v3-harness/v3_test_harness_windows.ps1 -OutFile v3_test_harness_windows.ps1
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\v3_test_harness_windows.ps1
```

## Linux

Open Terminal and run:

```bash
curl -O https://lokislab.org/downloads/v3-harness/v3_test_harness_linux.sh
chmod +x v3_test_harness_linux.sh
./v3_test_harness_linux.sh
```

## macOS

Open Terminal and run:

```bash
curl -O https://lokislab.org/downloads/v3-harness/v3_test_harness_macos.sh
chmod +x v3_test_harness_macos.sh
./v3_test_harness_macos.sh
```

## What Happens

The script will automatically:
1. Check/install Ollama
2. Start Ollama service
3. Detect your GPU and RAM
4. Select the best model for your hardware
5. Download the model (5-30 minutes)
6. Show your system configuration

## Troubleshooting

**Windows: Still getting execution policy errors?**
- Make sure you ran all 4 PowerShell commands in order
- Make sure PowerShell is running as Administrator

**The script appears frozen**
- This is normal during model download (5-30 minutes)
- Do NOT close the window
- Wait for it to complete

## Support

- Issues: https://github.com/jackcanon/lokislab/issues
- Docs: https://lokislab.org/docs/v3-testing

---

*v3.4.0 — Loki's Lab V3 Harness*
