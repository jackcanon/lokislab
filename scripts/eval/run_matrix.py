#!/usr/bin/env python3
"""Per-test benchmark runner for the Fleet Skill Matrix v2.

Writes one JSON result file per (model, machine, test_id), optionally suffixed
with __passN so 3 passes accumulate as 3 distinct files. The converter
(convert_v2.py) groups same (model, machine, test_id) files into runs[1..3].

Uses run_matrix.py --raw-endpoint (Ollama /v1 chat/completions); no hermes CLI.
"""
from __future__ import annotations
import argparse, json, os, sys, time, urllib.request

TESTS = {
    "1a": {"category": "coding_web_design", "prompt": "Build a single-file HTML page with a responsive nav bar and a hero section. Return only the code."},
    "1b": {"category": "coding_web_design", "prompt": "Refactor this CSS so the layout is mobile-first. Return the revised CSS."},
    "2a": {"category": "writing", "prompt": "Write a 120-word product launch announcement for a local AI lab. Return only the prose."},
    "2b": {"category": "writing", "prompt": "Edit this paragraph for clarity and tone, keeping under 160 words. Return only the edit."},
    "3a": {"category": "graphic_design", "prompt": "Describe a logo concept for a homelab benchmark site in 3 bullet points."},
    "3b": {"category": "graphic_design", "prompt": "Given this brief, propose a 2-color palette as hex codes with one-line rationale each."},
    "4a": {"category": "infrastructure", "prompt": "Write a systemd unit that runs 'ollama serve' on boot and restarts on failure."},
    "4b": {"category": "infrastructure", "prompt": "Diagnose an OOM kill in a journalctl log; propose the top fix. Return a short report."},
    "5b": {"category": "transcription_cleanup", "prompt": "Clean up this rough transcript: fix homophones and punctuation. Return only the cleaned text."},
    "7a": {"category": "business_research", "prompt": "Compare two local-llm hosting options for a solo operator under $150/yr. Return a short table."},
    "7b": {"category": "business_research", "prompt": "Summarize the tradeoffs of Apple Silicon vs CUDA for local 7B-14B models in 3 bullets."},
}

RESULTS_DIR = None  # set in main from script location


def run_via_raw_endpoint(endpoint, model, prompt, timeout=600):
    url = endpoint.rstrip("/") + "/chat/completions"
    payload = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"temperature": 0.2},
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read())
    text = data["choices"][0]["message"]["content"]
    return {"raw_output": text, "capable": True, "speed_seconds": round(time.time() - t0, 1)}


def score(check, output):
    o = output or ""
    ol = o.lower()
    if check == "coding_web_design":
        has_html = "<" in o and ">" in o
        quality = 5 if has_html else 1
        accuracy = 4 if has_html else 2
        return quality, accuracy, "html_present=%s" % has_html
    if check == "writing":
        words = len(o.split())
        shorter = words <= 200
        quality = 5 if shorter and "postpone" in ol else (3 if shorter else 1)
        accuracy = 5 if "weather" in ol or "postpone" in ol else 2
        return quality, accuracy, "words=%d" % words
    if check == "graphic_design":
        quality = 5 if "palette" in ol or "#" in o else 3
        accuracy = 4 if "#" in o else 3
        return quality, accuracy, "has_palette=%s" % ("#" in o)
    if check == "infrastructure":
        has_unit = "unit" in ol or ".service" in ol
        has_dmesg = "dmesg" in ol or "oom" in ol
        quality = 5 if (has_unit and has_dmesg) else (3 if has_unit else 1)
        accuracy = 5 if ("oom" in ol and ("kill" in ol or "dmesg" in ol)) else 3
        return quality, accuracy, "unit=%s dmesg=%s" % (has_unit, has_dmesg)
    if check == "transcription_cleanup":
        quality = 5 if "the" in ol and "weather" not in ol.split(".")[0] else 1
        accuracy = 4 if "weather" in ol else 2
        return quality, accuracy, "cleaned=%s" % ("weather" in ol)
    if check == "business_research":
        has_tbl = "|" in o or "\t" in o
        quality = 5 if has_tbl else 3
        accuracy = 5 if ("apple" in ol and "cuda" in ol) or ("silicon" in ol) else 3
        return quality, accuracy, "table=%s" % has_tbl
    return 1, 1, "unknown_check"


def main():
    global RESULTS_DIR
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--machine", required=True)
    ap.add_argument("--raw-endpoint", help="Ollama /v1 base URL (bypass profile)")
    ap.add_argument("--profile", help="hermes profile (unused fallback)")
    ap.add_argument("--pass", dest="passnum", type=int, default=0, help="pass number (suffixes output file so 3 passes accumulate)")
    ap.add_argument("--only", help="comma-separated test ids")
    args = ap.parse_args()
    RESULTS_DIR = os.path.dirname(os.path.abspath(__file__)) + "/results"
    os.makedirs(RESULTS_DIR, exist_ok=True)

    test_ids = args.only.split(",") if args.only else list(TESTS.keys())
    endpoint = args.raw_endpoint or "http://localhost:11434/v1"
    sfx = ""
    if args.passnum:
        sfx = "__pass%d" % args.passnum

    summary = []
    for tid in test_ids:
        test = TESTS.get(tid)
        if not test:
            print("skip unknown test %s" % tid, file=sys.stderr)
            continue
        print("[%s on %s] running %s (%s)..." % (args.model, args.machine, tid, test["category"]), file=sys.stderr)
        result = run_via_raw_endpoint(endpoint, args.model, test["prompt"])
        quality = accuracy = None
        score_note = ""
        if result["capable"]:
            quality, accuracy, score_note = score(test["category"], result["raw_output"])
        record = {
            "model": args.model,
            "machine": args.machine,
            "category": test["category"],
            "test_id": tid,
            "capable": result["capable"],
            "quality": quality,
            "accuracy": accuracy,
            "speed_seconds": round(result["speed_seconds"], 1),
            "total_wall_seconds": round(result["speed_seconds"], 1),
            "auto_scored": result["capable"],
            "raw_output": result["raw_output"],
            "notes": (result["notes"] if isinstance(result.get("notes"), str) else "") + (" | auto: " + score_note if score_note else ""),
            "tested_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        }
        out_name = "%s__%s__%s%s.json" % (args.model.replace(":", "_"), args.machine, tid, sfx)
        out_path = os.path.join(RESULTS_DIR, out_name)
        with open(out_path, "w") as fh:
            fh.write(json.dumps(record, indent=2))
        cap = result["capable"]
        secs = record["speed_seconds"]
        q = quality
        a = accuracy
        print("  %s: %s (%ss) q=%s a=%s" % (tid, "OK" if cap else "FAIL", secs, q, a), file=sys.stderr)
        summary.append((tid, cap, secs, q, a))
    print("DONE %d tests for %s on %s" % (len(summary), args.model, args.machine), file=sys.stderr)


if __name__ == "__main__":
    main()
