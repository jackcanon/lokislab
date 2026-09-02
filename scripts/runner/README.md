# Loki's Lab — v0 Reproducible Benchmark Runner (LL-009 scaffold)

Packaged, cross-platform runner for producing a schema-valid
`benchmark-submission.v1` JSON. Supports **macOS, Linux, native Windows
PowerShell, and WSL**.

## What it does today (real, verifiable)
1. **Dependency preflight** — checks `python3` + `ollama` reachability at
   `localhost:11434`; *explains* any missing dependency and requires the
   operator to install (no silent system changes).
2. **System auto-detection** — OS/version/arch/CPU/memory → fills the
   `system` block of the submission.
3. **Three runs per applicable test** — median-of-three is captured as 3 run
   objects (reduction happens server-side on the leaderboard).
4. **Standard JSON output** — conforms to
   `schemas/benchmark-submission.v1.schema.json`, then validated with the repo
   validator (`scripts/validate-benchmark-submission.mjs`).
5. **Privacy warning** — flags that `raw_output` may contain model responses
   and must be reviewed before publishing.

## Why "scaffold"
The Fleet Skill Matrix v2 test definitions (`run_matrix.py` / `TEST-SUITE.md`)
are not yet bundled — they live on Midgaard and are tracked by **LL-022**.
Until they land, the runner ships a built-in **HARNESS SELF-TEST** that
genuinely probes Ollama and emits real, validator-passing JSON. **No benchmark
scores are fabricated.**

## Usage
```bash
# Default demo (self-test, emits valid JSON):
python3 run_benchmark.py --selftest-only --out submission.json

# With a real model + suite once LL-022 lands:
python3 run_benchmark.py --model ollama:gemma4:12b-it-qat \
    --suite suite.example.json --submission-id LL-RUN-ABCDE1 --out submission.json

# Windows (native PowerShell):
.\Run-Benchmark.ps1 -Model ollama:gemma4:12b-it-qat -Out submission.json
```

## Wiring real tests (LL-022)
Add entries to a suite JSON whose `module` resolves to a callable returning a
`RunResult`, and register the module in `run_benchmark.py:resolve_runner`.
The leaderboard consumes the emitted JSON.
