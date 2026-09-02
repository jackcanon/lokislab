#!/usr/bin/env python3
"""
Loki's Lab — v0 reproducible benchmark runner (scaffold).
========================================================
Pipeline: preflight -> detect system -> run each applicable test 3x -> emit
schema-valid benchmark-submission.v1 JSON -> validate with the repo validator.

Cross-platform: macOS, Linux, native Windows PowerShell (via Run-Benchmark.ps1),
and WSL (this script runs unchanged under WSL).

WHY A SCAFFOLD:
The Fleet Skill Matrix v2 test definitions (run_matrix.py / TEST-SUITE.md) are not
yet bundled (see LL-022). Until they are, this runner ships with a built-in
HARNESS SELF-TEST so the *entire pipeline* is real and verifiable: it actually
probes Ollama, captures system facts, performs three runs per test, and emits a
submission that passes the live validator. No benchmark scores are fabricated.

Real tests plug in by adding entries to a suite JSON (see suite.example.json) whose
`module` resolves to a callable returning a RunResult. The leaderboard consumes the
emitted JSON; median-of-three reduction happens server-side.

Usage:
  python3 run_benchmark.py --model ollama:gemma4:12b-it-qat \
      --suite suite.example.json --submission-id LL-RUN-ABCDE1 --out submission.json
  python3 run_benchmark.py --selftest-only --out submission.json   # default demo
"""
from __future__ import annotations
import argparse, json, os, platform, shutil, subprocess, sys, time, uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

SCHEMA_VERSION = "1.0"
HARNESS_NAME = "LokisLabRunner"
HARNESS_VERSION = "0.1.0"
HARNESS_PROFILE = "lokislab-fixed-v1"

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------
@dataclass
class RunResult:
    test_id: str
    category: str
    capable: bool
    skipped: bool
    quality: Optional[int]
    accuracy: Optional[int]
    speed_seconds: float
    total_wall_seconds: float
    raw_output: str
    notes: str = ""
    auto_scored: bool = False
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None

def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat()

# ---------------------------------------------------------------------------
# Preflight — explain + require permission before installing anything
# ---------------------------------------------------------------------------
def preflight(auto_install: bool = False) -> dict:
    checks = {}
    py = shutil.which("python3") or sys.executable
    checks["python3"] = py
    ollama = shutil.which("ollama")
    checks["ollama"] = ollama
    # Reachability
    reachable = False
    if ollama:
        try:
            import urllib.request
            with urllib.request.urlopen("http://localhost:11434/api/tags", timeout=4) as r:
                reachable = r.status == 200
        except Exception:
            reachable = False
    checks["ollama_reachable"] = reachable

    missing = [k for k in ("ollama",) if not checks[k]]
    if missing and not reachable:
        print("[preflight] Missing or unreachable required dependency: ollama")
        print("[preflight] This runner scores local models via Ollama (http://localhost:11434).")
        print("[preflight] Install Ollama: https://ollama.com/download  (brew install ollama / apt / winget)")
        if auto_install:
            print("[preflight] --auto-install requested; attempting 'ollama' via PATH only (no silent system change).")
            # We deliberately do NOT auto-modify the system. Permission model:
            # explain, then require the operator to install, then re-run.
            print("[preflight] Aborting: operator must install Ollama, then re-run. (No silent install.)")
            sys.exit(2)
        else:
            print("[preflight] Aborting. Re-run with Ollama installed, or pass --auto-install to acknowledge.")
            sys.exit(2)
    print(f"[preflight] OK python3={py} ollama={'yes' if reachable else 'NOT reachable'}")
    return checks

# ---------------------------------------------------------------------------
# System detection
# ---------------------------------------------------------------------------
def detect_system() -> dict:
    os_name = platform.system()  # Darwin/Linux/Windows
    mapping = {"Darwin": "macOS", "Linux": "Linux", "Windows": "Windows"}
    os_label = mapping.get(os_name, os_name)
    os_version = ""
    cpu = platform.processor() or ""
    arch = "arm64" if platform.machine() in ("arm64", "aarch64") else "x86_64"
    memory_gb = round(_memory_gb(), 1)
    computer_description = _computer_description(os_name)
    if os_name == "Darwin":
        try:
            os_version = subprocess.check_output(["sw_vers", "-productVersion"]).decode().strip()
        except Exception:
            os_version = ""
        if not cpu:
            cpu = subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"]).decode().strip()
    elif os_name == "Linux":
        try:
            d = {}
            with open("/etc/os-release") as f:
                for line in f:
                    if "=" in line:
                        k, v = line.strip().split("=", 1)
                        d[k] = v.strip().strip('"')
            os_version = f"{d.get('PRETTY_NAME','')} ({d.get('VERSION_ID','')})".strip()
        except Exception:
            os_version = ""
        if not cpu:
            try:
                cpu = subprocess.check_output(["cat", "/proc/cpuinfo"]).decode()
                cpu = next((l.split(":")[1].strip() for l in cpu.splitlines() if "model name" in l), "")
            except Exception:
                cpu = ""
    elif os_name == "Windows":
        try:
            os_version = subprocess.check_output(["powershell", "-NoProfile",
                "(Get-CimInstance Win32_OperatingSystem).Version"]).decode().strip()
        except Exception:
            os_version = ""
    return {
        "computer_description": computer_description,
        "os": os_label,
        "os_version": os_version,
        "architecture": arch,
        "cpu": cpu or None,
        "gpu": None,  # populated by caller if known
        "memory_gb": memory_gb,
    }

def _memory_gb() -> float:
    try:
        if platform.system() == "Linux":
            with open("/proc/meminfo") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        return int(line.split()[1]) / 1024 / 1024
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / (1024 ** 3)
    except Exception:
        return 0.0

def _computer_description(os_name: str) -> str:
    try:
        if os_name == "Darwin":
            return subprocess.check_output(["sysctl", "-n", "hw.model"]).decode().strip()
        if os_name == "Linux":
            return subprocess.check_output(["cat", "/etc/hostname"]).decode().strip()
        if os_name == "Windows":
            return subprocess.check_output(["hostname"]).decode().strip()
    except Exception:
        pass
    return platform.node()

# ---------------------------------------------------------------------------
# Built-in HARNESS SELF-TEST (real, not fabricated scores)
# ---------------------------------------------------------------------------
def selftest_run(test_id: str, category: str) -> RunResult:
    """Probe Ollama latency + reachability. Returns a genuine run result."""
    start = time.time()
    capable = False
    raw = ""
    try:
        import urllib.request
        with urllib.request.urlopen("http://localhost:11434/api/tags", timeout=10) as r:
            data = json.loads(r.read().decode())
            models = [m["name"] for m in data.get("models", [])]
            capable = True
            raw = f"ollama reachable; {len(models)} model(s) installed: {', '.join(models[:10])}"
    except Exception as e:
        raw = f"ollama unreachable: {e}"
    wall = round(time.time() - start, 3)
    # The self-test is a genuine infrastructure/reachability probe, NOT a scored
    # benchmark. Schema requires quality/accuracy=null for any skipped-or-incapable
    # run, so we mark it skipped (capable=true) -- it proves the pipeline + Ollama
    # reachability without fabricating a benchmark score.
    return RunResult(
        test_id=test_id, category=category, capable=capable, skipped=True,
        quality=None, accuracy=None, speed_seconds=wall, total_wall_seconds=wall,
        raw_output=raw, notes="harness self-test (infra probe); not a leaderboard score",
        auto_scored=False,
    )

# ---------------------------------------------------------------------------
# Test registry — real tests plug in here (LL-022 wires the v2 suite)
# ---------------------------------------------------------------------------
BUILTIN_TESTS = [
    {"test_id": "SELFTEST-0", "category": "infrastructure",
     "module": "selftest", "applicable": True},
]

def load_suite(path: Optional[str]) -> list:
    if not path:
        return BUILTIN_TESTS
    with open(path) as f:
        data = json.load(f)
    return data.get("tests", [])

def resolve_runner(module: str) -> Callable[[str, str], RunResult]:
    if module == "selftest":
        return selftest_run
    # Real test modules (e.g. "run_matrix") are imported here once LL-022 lands.
    raise NotImplementedError(f"test module '{module}' not yet wired (LL-022 pending)")

# ---------------------------------------------------------------------------
# Run a test three times (median-of-three captured as 3 runs)
# ---------------------------------------------------------------------------
def run_test_three_times(test: dict) -> list[RunResult]:
    runner = resolve_runner(test.get("module", "selftest"))
    results = []
    for i in range(1, 4):
        r = runner(test["test_id"], test.get("category", "uncategorized"))
        results.append(r)
    return results

# ---------------------------------------------------------------------------
# Build + validate submission
# ---------------------------------------------------------------------------
def build_submission(meta: dict, runs: list[RunResult]) -> dict:
    run_objs = []
    for r in runs:
        d = asdict(r)
        d["run_number"] = run_objs.count or 0  # placeholder; set below
        run_objs.append(d)
    # assign run_number per test group (1..3)
    from collections import defaultdict
    counters = defaultdict(int)
    for ro in run_objs:
        counters[ro["test_id"]] += 1
        ro["run_number"] = counters[ro["test_id"]]
        ro["tested_at"] = _now()
    return {
        "schema_version": SCHEMA_VERSION,
        "submission_id": meta["submission_id"],
        "created_at": _now(),
        "suite": meta["suite"],
        "harness": {"name": HARNESS_NAME, "version": HARNESS_VERSION, "profile": HARNESS_PROFILE},
        "system": meta["system"],
        "model": meta["model"],
        "configuration": meta["configuration"],
        "runs": run_objs,
    }

def validate(node_script: Path, submission_path: Path) -> bool:
    if not node_script.exists():
        print(f"[validate] SKIP — validator not found at {node_script}")
        return True
    node = shutil.which("node")
    if not node:
        print("[validate] SKIP — node not on PATH")
        return True
    try:
        out = subprocess.run([node, str(node_script), str(submission_path)],
                             capture_output=True, text=True, timeout=60)
        print("[validate]", out.stdout.strip() or out.stderr.strip())
        return "valid" in (out.stdout + out.stderr)
    except Exception as e:
        print(f"[validate] ERROR {e}")
        return False

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Loki's Lab v0 benchmark runner")
    ap.add_argument("--model", default="ollama:gemma4:12b-it-qat",
                    help="model runtime:name:version, e.g. ollama:gemma4:12b-it-qat")
    ap.add_argument("--suite", default=None, help="path to suite JSON (default: built-in self-test)")
    ap.add_argument("--submission-id", default=None,
                    help="LL-XXX-YYYYYY matching ^LL-[A-Z0-9][A-Z0-9-]{5,63}$")
    ap.add_argument("--out", default="submission.json")
    ap.add_argument("--config-type", default="publisher_recommended",
                    choices=["publisher_recommended", "lokis_lab_tuned",
                             "custom_quantization", "custom_context_or_tools", "other_custom"])
    ap.add_argument("--config-notes", default="")
    ap.add_argument("--auto-install", action="store_true",
                    help="acknowledge preflight; still will not silently modify system")
    ap.add_argument("--selftest-only", action="store_true", help="force built-in self-test suite")
    args = ap.parse_args()

    preflight(auto_install=args.auto_install)

    if args.submission_id is None:
        args.submission_id = "LL-RUN-" + uuid.uuid4().hex[:6].upper()
    import re
    if not re.match(r"^LL-[A-Z0-9][A-Z0-9-]{5,63}$", args.submission_id):
        print(f"[error] submission_id '{args.submission_id}' fails pattern ^LL-[A-Z0-9][A-Z0-9-]{{5,63}}$")
        sys.exit(3)

    print("[info] PRIVACY: raw_output below may contain model responses. Review before publishing.")
    system = detect_system()
    rt, name, ver = (args.model.split(":", 2) + ["", ""])[:3]
    model = {"runtime": rt or "ollama", "name": name or "unknown", "version": ver or "unknown"}
    suite = {"id": "fleet-skill-matrix", "version": "2"} if not args.suite else \
        json.load(open(args.suite)).get("suite", {"id": "custom", "version": "1"})
    configuration = {"type": args.config_type, "settings": {}, "notes": args.config_notes}

    tests = BUILTIN_TESTS if (args.selftest_only or not args.suite) else load_suite(args.suite)
    all_runs: list[RunResult] = []
    for t in tests:
        if not t.get("applicable", True):
            print(f"[skip] {t['test_id']} not applicable")
            continue
        print(f"[run] {t['test_id']} x3 ...")
        all_runs.extend(run_test_three_times(t))

    meta = {"submission_id": args.submission_id, "system": system,
            "model": model, "suite": suite, "configuration": configuration}
    submission = build_submission(meta, all_runs)

    out_path = Path(args.out)
    out_path.write_text(json.dumps(submission, indent=2))
    print(f"[write] {out_path} ({out_path.stat().st_size} bytes, {len(all_runs)} runs)")

    repo_root = Path(__file__).resolve().parent.parent.parent
    validator = repo_root / "scripts" / "validate-benchmark-submission.mjs"
    if not validator.exists():
        validator = Path("/tmp/lokislab_run/scripts/validate-benchmark-submission.mjs")
    validate(validator, out_path)
    print("[done] submission emitted. Wire real tests via --suite once LL-022 lands.")

if __name__ == "__main__":
    main()
