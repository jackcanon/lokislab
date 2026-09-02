#!/usr/bin/env python3
"""
LL-022 reconciliation: convert Fleet Skill Matrix v2 LEGACY flat results
(<model>__<machine>__<test_id>.json) into Loki's Lab v1 benchmark-submission
envelopes, then validate every converted file with the REAL repo validator.

Legacy flat schema (from run_matrix.py):
  model, machine, category, test_id, capable, quality, accuracy,
  speed_seconds, total_wall_seconds, auto_scored, raw_output, notes, tested_at
  (+ extras: in_tokens, out_tokens, reasoning_effort)

Loki's Lab v1 envelope (schemas/benchmark-submission.v1.schema.json):
  schema_version, submission_id (^LL-[A-Z0-9][A-Z0-9-]{5,63}$), created_at,
  suite{id,version}, harness{name,version,profile}, system{...}, model{runtime,name,version},
  configuration{type,settings,notes}, runs[{test_id,category,run_number,capable,skipped,
  quality,accuracy,speed_seconds,total_wall_seconds,raw_output,notes,tested_at,auto_scored,...}]

HONEST SCOPE:
- v2 writes ONE run per test file. Loki's Lab wants 3 runs/test for official
  comparison. We do NOT fabricate runs. A (model,machine,test_id) with <3 files
  yields <3 runs -> the repo validator WARNS (not errors). Reported as a gap.
- submission_id is derived deterministically from model+machine+date.
- system block is synthesized from a machine->spec map (real RAM/OS facts from
  TEST-SUITE.md capability matrix).
"""
from __future__ import annotations
import json, re, sys, glob, os, subprocess, shutil
from pathlib import Path
from datetime import datetime, timezone

RESULTS_GLOB = os.environ.get("RESULTS_GLOB", "/tmp/lokislab_recon/skillmatrix/skill-matrix/results/*.json")
OUT_DIR = Path("/tmp/lokislab_recon/converted")
VALIDATOR = "/tmp/lokislab_run/scripts/validate-benchmark-submission.mjs"
NODE = shutil.which("node")

SUITE = {"id": "fleet-skill-matrix", "version": "2"}
HARNESS = {"name": "Hermes", "version": "1.0.0", "profile": "lokislab-fixed-v1"}
# machine -> system spec (from TEST-SUITE.md capability matrix, real facts)
MACHINES = {
    "asgard":   {"computer_description": "Mac mini (Asgard, m2pro) — M2 Pro 16GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple M2 Pro", "gpu": "Apple M2 Pro integrated GPU", "memory_gb": 16},
    "m1pro":    {"computer_description": "Mac (m1pro) — M1 Pro 16GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple M1 Pro", "gpu": "Apple M1 Pro integrated GPU", "memory_gb": 16},
    "midgaard": {"computer_description": "Mac (Midgaard) — M4 Pro 24GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple M4 Pro", "gpu": "Apple M4 Pro integrated GPU", "memory_gb": 24},
    "odin":     {"computer_description": "Mac (Odin) — 24GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple Silicon", "gpu": None, "memory_gb": 24},
    "overgaard":{"computer_description": "Mac (Overgaard) — M4 Max 36GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple M4 Max", "gpu": "Apple M4 Max integrated GPU", "memory_gb": 36},
    "heimdall": {"computer_description": "RackPC (Heimdall) — Linux x64 64GB + RTX 4070", "os": "Linux", "os_version": "Ubuntu 24.04", "architecture": "x86_64", "cpu": "AMD Ryzen", "gpu": "NVIDIA RTX 4070 (12GB VRAM)", "memory_gb": 64},
}

def derive_submission_id(model: str, machine: str, tested_at: str) -> str:
    # LL-<MODEL>_<MACHINE>_<DATE> -> sanitize to ^LL-[A-Z0-9][A-Z0-9-]{5,63}$
    date = tested_at[:10].replace("-", "") if tested_at else "00000000"
    raw = f"LL-{model.replace(':', '_').upper()}-{machine.upper()}-{date}"
    # keep only A-Z0-9 and -
    cleaned = re.sub(r"[^A-Z0-9-]", "-", raw)
    cleaned = re.sub(r"-+", "-", cleaned).strip("-")
    # total length <= 64 (pattern allows 5..63 after LL-)
    if len(cleaned) > 64:
        cleaned = cleaned[:64]
    return cleaned

def convert(legacy: dict, machine: str) -> dict:
    system = MACHINES.get(machine, MACHINES["asgard"])
    rt, name, ver = (legacy.get("model", "unknown:unknown").split(":", 2) + ["", ""])[:3]
    model = {"runtime": rt or "ollama", "name": name or "unknown", "version": ver or "unknown"}
    # capable=false -> quality/accuracy MUST be null per v1 schema (and per
    # TEST-SUITE.md: "capable=false gets no quality/accuracy score"). The legacy
    # v2 data sometimes left auto-scored values on incapable runs; normalize.
    if not bool(legacy.get("capable", False)):
        quality = None
        accuracy = None
    else:
        quality = legacy.get("quality")
        accuracy = legacy.get("accuracy")
    run = {
        "test_id": legacy.get("test_id"),
        "category": legacy.get("category"),
        "run_number": 1,  # set properly by grouping caller
        "capable": bool(legacy.get("capable", False)),
        "skipped": False,
        "quality": quality,
        "accuracy": accuracy,
        "speed_seconds": float(legacy.get("speed_seconds", 0)),
        "total_wall_seconds": float(legacy.get("total_wall_seconds", legacy.get("speed_seconds", 0))),
        "auto_scored": bool(legacy.get("auto_scored", False)),
        "input_tokens": legacy.get("in_tokens"),
        "output_tokens": legacy.get("out_tokens"),
        "raw_output": str(legacy.get("raw_output", "")),
        "notes": str(legacy.get("notes", "")),
        "tested_at": legacy.get("tested_at"),
    }
    # capable=false -> quality/accuracy should be null (v1 rule). Legacy already null in that case.
    submission = {
        "schema_version": "1.0",
        "submission_id": derive_submission_id(legacy.get("model", "unknown"), machine, legacy.get("tested_at", "")),
        "created_at": legacy.get("tested_at") or datetime.now(timezone.utc).isoformat(),
        "suite": SUITE,
        "harness": HARNESS,
        "system": system,
        "model": model,
        "configuration": {"type": "publisher_recommended", "settings": {}, "notes": "Converted from Fleet Skill Matrix v2 legacy result."},
        "runs": [run],
    }
    return submission

def main():
    files = sorted(glob.glob(RESULTS_GLOB))
    print(f"[reconcile] found {len(files)} legacy result files")
    if not files:
        sys.exit(1)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # group by (model, machine, test_id) across files
    groups: dict = {}
    for fp in files:
        try:
            data = json.loads(Path(fp).read_text())
        except Exception as e:
            print(f"  SKIP (parse error) {fp}: {e}")
            continue
        machine = data.get("machine") or Path(fp).stem.split("__")[1]
        key = (data.get("model"), machine, data.get("test_id"))
        groups.setdefault(key, []).append(data)

    converted = 0
    valid = 0
    warned = 0
    invalid = 0
    run_coverage = {}  # key -> num runs
    for key, items in groups.items():
        model, machine, test_id = key
        # build one submission with grouped runs
        base = convert(items[0], machine)
        runs = []
        for i, it in enumerate(sorted(items, key=lambda x: x.get("tested_at", "")), start=1):
            r = convert(it, machine)["runs"][0]
            r["run_number"] = i
            runs.append(r)
        base["runs"] = runs
        run_coverage[key] = len(runs)
        # submission_id must be stable across grouped items -> recompute from group
        base["submission_id"] = derive_submission_id(model, machine, items[0].get("tested_at", ""))
        out_name = f"{model.replace(':', '_')}__{machine}__{test_id}.v1.json"
        out_path = OUT_DIR / out_name
        out_path.write_text(json.dumps(base, indent=2))
        converted += 1

        # validate with REAL repo validator
        if NODE and Path(VALIDATOR).exists():
            try:
                res = subprocess.run([NODE, VALIDATOR, str(out_path)],
                                     capture_output=True, text=True, timeout=30)
                out = res.stdout + res.stderr
                if '"decision": "valid"' in out:
                    valid += 1
                elif '"decision": "invalid"' in out:
                    invalid += 1
                else:
                    warned += 1
            except Exception:
                warned += 1

    print(f"[reconcile] converted submissions: {converted}")
    print(f"[reconcile] validator: valid={valid} invalid={invalid} errored/undecided={warned}")
    singles = sum(1 for v in run_coverage.values() if v < 3)
    print(f"[reconcile] run-coverage gap: {singles}/{converted} submissions have <3 runs/test (v2 stores 1 run/file)")
    # write a manifest
    manifest = {
        "source": "Fleet Skill Matrix v2 (Midgaard /Users/dit1/Claude/Projects/Fleet-Eval-2026-08/skill-matrix)",
        "converted": converted, "valid": valid, "invalid": invalid,
        "submissions_with_lt_3_runs": singles,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    (OUT_DIR / "MANIFEST.json").write_text(json.dumps(manifest, indent=2))
    print(f"[reconcile] wrote {converted} v1 submissions + MANIFEST.json to {OUT_DIR}")

if __name__ == "__main__":
    main()
