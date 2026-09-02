#!/usr/bin/env python3
"""
generate_skill_matrix.py -- regenerate data/skill-matrix.json from the fleet eval
skill-matrix results.

Single source of truth for the Loki's Lab website's test data. Both /test/results
and the homepage leaderboard read this JSON (via lib/skillMatrix.ts), so the site
always reflects the latest committed results -- no hardcoded baselines.

Run from anywhere; pass --results to point at the consolidated results dir.
Default results dir: ~/fleet_eval/skill-matrix-authoritative/results

Outputs (repo-root)/data/skill-matrix.json with:
  - summary[] : one row per model x machine (tests, capable, avgQuality,
                avgAccuracy, medianSpeedS, capableRate, lastTested)
  - runs[]    : every individual task result
  - top5[]    : model x machine rows ranked by avgQuality desc, then capableRate
  - meta      : counts, generation timestamp, source path
"""
import argparse
import json
import os
import statistics
import glob
from collections import defaultdict
from datetime import datetime, timezone

DEFAULT_RESULTS = os.path.expanduser(
    "~/fleet_eval/skill-matrix-authoritative/results"
)


def load_results(results_dir):
    rows = []
    bad = 0
    for path in sorted(glob.glob(os.path.join(results_dir, "*.json"))):
        try:
            with open(path) as f:
                data = json.load(f)
        except Exception:
            bad += 1
            continue
        # skip creative/video/rerank suites if present in the same dir
        base = os.path.basename(path).lower()
        if "creative" in base or "video" in base or "rerank" in base:
            continue
        rows.append(data)
    return rows, bad


def s(v):
    return "" if v is None else str(v)


def build_summary(rows):
    agg = defaultdict(
        lambda: {"tests": 0, "capable": 0, "q": [], "a": [], "speed": [], "last": ""}
    )
    for r in rows:
        key = (s(r.get("model")), s(r.get("machine")))
        A = agg[key]
        A["tests"] += 1
        if r.get("capable") is True:
            A["capable"] += 1
        if r.get("quality") is not None:
            A["q"].append(r["quality"])
        if r.get("accuracy") is not None:
            A["a"].append(r["accuracy"])
        if r.get("speed_seconds") is not None:
            A["speed"].append(r["speed_seconds"])
        if r.get("tested_at") and r["tested_at"] > A["last"]:
            A["last"] = r["tested_at"]

    summary = []
    for (model, machine), A in agg.items():
        avgq = round(statistics.mean(A["q"]), 2) if A["q"] else None
        avga = round(statistics.mean(A["a"]), 2) if A["a"] else None
        meds = round(statistics.median(A["speed"]), 1) if A["speed"] else None
        cap_rate = round(A["capable"] / A["tests"], 3) if A["tests"] else 0
        summary.append(
            {
                "model": model,
                "machine": machine,
                "tests": A["tests"],
                "capable": A["capable"],
                "avgQuality": avgq,
                "avgAccuracy": avga,
                "medianSpeedS": meds,
                "capableRate": cap_rate,
                "lastTested": A["last"],
            }
        )
    return summary


def top5(summary):
    ranked = sorted(
        [x for x in summary if x["model"]],
        key=lambda x: (-(x["avgQuality"] or 0), -(x["capableRate"] or 0)),
    )
    return ranked[:5]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--results", default=DEFAULT_RESULTS,
                    help="directory of result JSON files")
    ap.add_argument("--out", default=None,
                    help="output JSON path (default <repo>/data/skill-matrix.json)")
    args = ap.parse_args()

    if not os.path.isdir(args.results):
        raise SystemExit(f"Results dir not found: {args.results}")

    rows, bad = load_results(args.results)
    if not rows:
        raise SystemExit(f"No result files found in {args.results}")

    summary = build_summary(rows)
    ranked = top5(summary)

    runs = [
        {
            "model": s(r.get("model")),
            "machine": s(r.get("machine")),
            "category": s(r.get("category")),
            "testId": s(r.get("test_id")),
            "capable": r.get("capable"),
            "quality": r.get("quality"),
            "accuracy": r.get("accuracy"),
            "speedSeconds": r.get("speed_seconds"),
            "outTokens": r.get("out_tokens"),
            "testedAt": s(r.get("tested_at")),
        }
        for r in rows
    ]

    feed = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": args.results,
        "totalRuns": len(rows),
        "skippedFiles": bad,
        "summary": summary,
        "top5": ranked,
        "runs": runs,
    }

    out = args.out or os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "data",
        "skill-matrix.json",
    )
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(feed, f, indent=1)
    print(
        f"Wrote {out}: {len(rows)} runs, {len(summary)} model x machine rows, "
        f"top5 computed. ({bad} files skipped)"
    )


if __name__ == "__main__":
    main()
