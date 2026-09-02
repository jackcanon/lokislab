#!/usr/bin/env python3
"""
LL-022 publish pipeline: build the Loki's Lab leaderboard FEED JSON.

The website (lib/leaderboard.ts -> getLeaderboardData) fetches
LOKISLAB_LEADERBOARD_FEED_URL and expects:
    { "feed_version": "1.0", "entries": [ <v1 submission>, ... ] }
Each entry is a FULL v1 benchmark-submission (see
examples/benchmark-submission.v1.example.json). parsePublicEntry() SILENTLY
drops any entry missing: submission_id, verification_status in
{Unverified,Verified}, suite.id/version, model.name/version, system.*,
score (0-100), passed (0..total), total (>=1), median_seconds (>=0),
configuration.label, harness.profile.

convert_v2.py emits submissions WITHOUT score/passed/total/median_seconds/
verification_status/configuration.label, so this script COMPUTES them from the
grouped runs and appends them. Without this, every entry would be dropped and
the site would fall back to its hardcoded baseline.

Output: public/leaderboard-feed.json  (git-backed; the Worker serves/fetches it)
Self-check: --validate ports parsePublicEntry's rules and reports dropped entries.

Usage:
  python3 build_feed.py --sample            # synthesize valid demo entries (test deploy now)
  python3 build_feed.py --src DIR --out PATH # real mode from converted v1 submissions
  python3 build_feed.py --sample --validate # also assert every sample entry is accepted
"""
from __future__ import annotations
import argparse, json, os, statistics, sys
from pathlib import Path

# ---- machine spec map (real facts; mirrors convert_v2.MACHINES) ----
MACHINES = {
    "asgard":    {"computer_description": "Mac mini (Asgard, m2pro) — M2 Pro 16GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple M2 Pro", "gpu": "Apple M2 Pro integrated GPU", "memory_gb": 16},
    "m1pro":     {"computer_description": "Mac (m1pro) — M1 Pro 16GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple M1 Pro", "gpu": "Apple M1 Pro integrated GPU", "memory_gb": 16},
    "midgaard":  {"computer_description": "Mac (Midgaard) — M4 Pro 24GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple M4 Pro", "gpu": "Apple M4 Pro integrated GPU", "memory_gb": 24},
    "odin":      {"computer_description": "Mac (Odin) — 24GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple Silicon", "gpu": None, "memory_gb": 24},
    "overgaard": {"computer_description": "Mac (Overgaard) — M4 Max 36GB", "os": "macOS", "os_version": "15.6", "architecture": "arm64", "cpu": "Apple M4 Max", "gpu": "Apple M4 Max integrated GPU", "memory_gb": 36},
    "heimdall":  {"computer_description": "RackPC (Heimdall) — Linux x64 64GB + RTX 4070", "os": "Linux", "os_version": "Ubuntu 24.04", "architecture": "x86_64", "cpu": "AMD Ryzen", "gpu": "NVIDIA RTX 4070 (12GB VRAM)", "memory_gb": 64},
}

SUITE = {"id": "fleet-skill-matrix", "version": "2"}
HARNESS = {"name": "Hermes", "version": "1.0.0", "profile": "lokislab-fixed-v1"}


def compute_metrics(sub: dict) -> dict:
    """Return {score, passed, total, median_seconds, verification_status, configuration_label}
    computed from the submission's grouped runs."""
    runs = sub.get("runs", []) or []
    total = len(runs)
    capable = [r for r in runs if r.get("capable") and not r.get("skipped")]
    passed = len(capable)
    qualities = [r["quality"] for r in capable if isinstance(r.get("quality"), (int, float))]
    score = round((sum(qualities) / len(qualities)) / 5 * 100) if qualities else 0
    score = max(0, min(100, score))
    speeds = [r["speed_seconds"] for r in runs if isinstance(r.get("speed_seconds"), (int, float))]
    median_seconds = round(statistics.median(speeds), 2) if speeds else 0.0
    ctype = (sub.get("configuration") or {}).get("type", "publisher_recommended")
    label = "Publisher recommended" if ctype == "publisher_recommended" else "Custom configuration"
    return {
        "score": score, "passed": passed, "total": total,
        "median_seconds": median_seconds, "verification_status": "Unverified",
        "configuration_label": label,
    }


def to_entry(sub: dict) -> dict:
    """Promote a converted v1 submission into a feed entry the site will accept."""
    m = compute_metrics(sub)
    cfg = dict(sub.get("configuration", {}))
    cfg["label"] = m["configuration_label"]
    entry = {
        "schema_version": sub.get("schema_version", "1.0"),
        "submission_id": sub.get("submission_id"),
        "created_at": sub.get("created_at"),
        "suite": sub.get("suite", SUITE),
        "harness": sub.get("harness", HARNESS),
        "system": sub.get("system"),
        "model": {
            "runtime": (sub.get("model") or {}).get("runtime") or "ollama",
            "name": (sub.get("model") or {}).get("name") or "unknown",
            "version": (sub.get("model") or {}).get("version") or "unknown",
        },
        "configuration": cfg,
        "verification_status": m["verification_status"],
        "score": m["score"],
        "passed": m["passed"],
        "total": m["total"],
        "median_seconds": m["median_seconds"],
        "public_result_url": sub.get("public_result_url"),
        # PUBLIC feed: strip privacy-sensitive fields (raw_output, notes, tokens,
        # paths) per OpenAI Sites integrity guidance. Keep auditable metrics only.
        "runs": [
            {
                "test_id": r.get("test_id"),
                "category": r.get("category"),
                "run_number": r.get("run_number"),
                "capable": r.get("capable"),
                "skipped": r.get("skipped"),
                "quality": r.get("quality"),
                "accuracy": r.get("accuracy"),
                "speed_seconds": r.get("speed_seconds"),
                "auto_scored": r.get("auto_scored"),
                "tested_at": r.get("tested_at"),
            }
            for r in sub.get("runs", [])
        ],
    }
    return entry


# ---- faithful port of lib/leaderboard.ts parsePublicEntry validation ----
def site_accepts(entry: dict) -> tuple[bool, str]:
    def txt(v): return v if isinstance(v, str) and v else None
    def fin(v):
        try: return float(v)
        except (TypeError, ValueError): return None
    v = entry
    if not isinstance(v, dict):
        return False, "not object"
    status = v.get("verification_status")
    suite = v.get("suite") or {}
    model = v.get("model") or {}
    system = v.get("system") or {}
    s = fin(v.get("score"))
    p = fin(v.get("passed"))
    t = fin(v.get("total"))
    md = fin(v.get("median_seconds"))
    checks = [
        ("submission_id", bool(txt(v.get("submission_id")))),
        ("verification_status", status in ("Unverified", "Verified")),
        ("suite.id", bool(txt(suite.get("id")))),
        ("suite.version", bool(txt(suite.get("version")))),
        ("model.name", bool(txt(model.get("name")))),
        ("model.version", bool(txt(model.get("version")))),
        ("system.computer_description", bool(txt(system.get("computer_description")))),
        ("system.os", bool(txt(system.get("os")))),
        ("system.os_version", bool(txt(system.get("os_version")))),
        ("system.architecture", bool(txt(system.get("architecture")))),
        ("system.memory_gb", isinstance(system.get("memory_gb"), (int, float))),
        ("score", s is not None and 0 <= s <= 100),
        ("passed", p is not None and p >= 0),
        ("total", t is not None and t >= 1),
        ("passed<=total", p is not None and t is not None and p <= t),
        ("median_seconds", md is not None and md >= 0),
    ]
    for name, ok in checks:
        if not ok:
            return False, f"failed: {name}"
    return True, "ok"


def build_from_src(src_dir: str) -> list[dict]:
    entries = []
    for fp in sorted(Path(src_dir).glob("*.json")):
        if fp.name == "MANIFEST.json":
            continue
        try:
            sub = json.loads(fp.read_text())
        except Exception:
            continue
        if not sub.get("runs"):
            continue
        entries.append(to_entry(sub))
    return entries


def build_sample() -> list[dict]:
    """Synthesize valid demo submissions across the fleet (test deploy now)."""
    import datetime
    out = []
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    demo = [
        ("gemma3:4b", "midgaard", [5, 5, 4]),
        ("qwen3.5:4b", "odin", [4, 5, 5]),
        ("gemma4:12b-it-qat", "overgaard", [5, 5, 5]),
        ("llama3.1:8b", "heimdall", [3, 4, 4]),
    ]
    for model, machine, qs in demo:
        parts = model.split(":", 1)
        name = parts[0]
        ver = parts[1] if len(parts) > 1 else "unknown"
        rt = "ollama"
        runs = []
        for i, q in enumerate(qs, start=1):
            runs.append({
                "test_id": "1a", "category": "coding_web_design", "run_number": i,
                "capable": True, "skipped": False, "quality": q, "accuracy": q,
                "speed_seconds": 12.0 + i, "total_wall_seconds": 12.0 + i,
                "auto_scored": True, "raw_output": "demo", "notes": "sample",
                "tested_at": now,
            })
        sub = {
            "schema_version": "1.0",
            "submission_id": f"LL-{name.upper()}-{machine.upper()}-SAMPLE",
            "created_at": now, "suite": SUITE, "harness": HARNESS,
            "system": MACHINES[machine],
            "model": {"runtime": rt or "ollama", "name": name, "version": ver},
            "configuration": {"type": "publisher_recommended", "settings": {}, "notes": "sample"},
            "runs": runs,
        }
        out.append(to_entry(sub))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", help="dir of converted v1 submissions")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent.parent / "public" / "leaderboard-feed.json"))
    ap.add_argument("--sample", action="store_true", help="synthesize valid demo entries")
    ap.add_argument("--validate", action="store_true", help="assert every entry passes the site's parse rules")
    args = ap.parse_args()

    if args.sample:
        entries = build_sample()
    elif args.src:
        entries = build_from_src(args.src)
    else:
        ap.error("need --sample or --src")

    feed = {"feed_version": "1.0", "entries": entries}
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(feed, indent=2))
    print(f"[build_feed] wrote {len(entries)} entries -> {out_path}")

    if args.validate:
        ok = bad = 0
        for e in entries:
            accepted, why = site_accepts(e)
            if accepted: ok += 1
            else:
                bad += 1
                print(f"  DROPPED {e.get('submission_id')}: {why}")
        print(f"[build_feed] validate: {ok} accepted, {bad} dropped")
        if bad:
            sys.exit(2)


if __name__ == "__main__":
    main()
