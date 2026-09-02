# Loki's Lab — v0 benchmark runner (native Windows PowerShell wrapper)
# Calls the cross-platform Python core (run_benchmark.py) under Windows or WSL.
# Requires: Python 3.9+, Ollama (https://ollama.com/download), network to localhost:11434.
param(
    [string]$Model = "ollama:gemma4:12b-it-qat",
    [string]$Suite = "",
    [string]$SubmissionId = "",
    [string]$Out = "submission.json",
    [string]$ConfigType = "publisher_recommended",
    [switch]$AutoInstall,
    [switch]$SelftestOnly
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = Get-Command python3 -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python -ErrorAction SilentlyContinue }
if (-not $py) {
    Write-Host "[preflight] Python 3 not found. Install Python 3.9+ then re-run." -ForegroundColor Red
    exit 2
}
$argsList = @("$ScriptDir/run_benchmark.py", "--model", $Model, "--out", $Out, "--config-type", $ConfigType)
if ($Suite)        { $argsList += "--suite"; $argsList += $Suite }
if ($SubmissionId) { $argsList += "--submission-id"; $argsList += $SubmissionId }
if ($AutoInstall)  { $argsList += "--auto-install" }
if ($SelftestOnly) { $argsList += "--selftest-only" }

Write-Host "[windows] Launching Loki's Lab runner via $($py.Source) ..."
& $py.Source @argsList
exit $LASTEXITCODE
