#!/usr/bin/env python3
"""Per-box v2 re-run orchestrator: 3 passes per test for locally-available models.

Honors the Fleet Skill Matrix v2 RAM capability matrix: only runs models whose
footprint fits the box. Uses run_matrix.py --raw-endpoint (no hermes CLI needed).
Writes to results_threex/ next to run_matrix.py. Sequential per model to avoid
Ollama RAM contention.
"""
import subprocess, sys, os, json, time, shutil, importlib.util
from pathlib import Path

# Load the preflight/headroom gate (sits next to this script).
_spec = importlib.util.spec_from_file_location("preflight_env", Path(__file__).parent / "preflight_env.py")
_pf = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_pf)

BOX = os.environ.get("BOX", "unknown")
# (model, min_ram_gb) — only run if box RAM >= min. Box RAM passed via env.
MODELS = {
    "gemma3:4b": 4,
    "qwen3.5:4b": 4,
    "gemma4:12b-it-qat": 7,
    "llama3.1:8b": 8,
    "qwen3.5:9b": 10,
    "qwen3.6:latest": 26,   # ~24-36GB footprint
    "qwen3.8:27b": 28,
    "mistral-small:24b": 26,
}
BOX_RAM = float(os.environ.get("BOX_RAM", "0"))
ENDPOINT = os.environ.get("OLLAMA_EP", "http://localhost:11434/v1")
PASSES = int(os.environ.get("PASSES", "3"))

SCRIPT = Path(__file__).parent / "run_matrix.py"
RESULTS = Path(__file__).parent / "results_threex"
RESULTS.mkdir(exist_ok=True)

def local_models():
    try:
        import urllib.request
        with urllib.request.urlopen(f"{ENDPOINT.rsplit('/v1',1)[0]}/api/tags", timeout=5) as r:
            data = json.loads(r.read())
        return {m["name"] for m in data.get("models", [])}
    except Exception as e:
        print(f"[{BOX}] cannot list models: {e}", file=sys.stderr); return set()

def main():
    have = local_models()
    todo = [m for m in MODELS if m in have and MODELS[m] <= BOX_RAM]
    print(f"[{BOX}] RAM={BOX_RAM}GB endpoint={ENDPOINT} models_to_run={todo}")
    if not todo:
        print(f"[{BOX}] nothing to run (no fitting models)."); return
    for model in todo:
        # --- STERILE-ENV GATE: baseline snapshot + tiered verdict before EACH model ---
        res = _pf.check_headroom(model, BOX)
        try:
            Path("baseline_log.json").write_text(json.dumps(res["snapshot"], indent=2))
        except Exception:
            pass
        v = res["verdict"]
        if v in ("sterile", "loaded_ok"):
            if v == "loaded_ok":
                print(f"[{BOX}] baseline: LOADED_OK for {model} — {res['reason']}", file=sys.stderr)
                print(f"[{BOX}]   foreign apps listed; human may quit them via quit_apps.py --confirm", file=sys.stderr)
            else:
                print(f"[{BOX}] baseline: STERILE for {model}", file=sys.stderr)
            for p in range(1, PASSES + 1):
                out = RESULTS / f"{model.replace(':','_')}__{BOX}__pass{p}.log"
                print(f"[{BOX}] {model} pass {p}/{PASSES} ...", file=sys.stderr)
                try:
                    subprocess.run(
                        [sys.executable, str(SCRIPT), "--model", model, "--machine", BOX,
                         "--raw-endpoint", ENDPOINT, "--pass", str(p), "--only",
                         "1a,1b,2a,2b,3a,3b,4a,4b,5b,7a,7b"],
                        check=False,
                        stdout=open(out, "w"), stderr=subprocess.STDOUT,
                        timeout=1200,
                    )
                except subprocess.TimeoutExpired:
                    print(f"[{BOX}] {model} pass {p} TIMED OUT", file=sys.stderr)
        else:
            # PARK (do not silently skip, do not kill): report for human decision.
            print(f"[{BOX}] PARKED {model}: verdict={v} — {res['reason']}", file=sys.stderr)
            if res["foreign_apps"]:
                print(f"[{BOX}]   foreign apps: " +
                      ", ".join(f"{p['cmd']} ({p['rss_gb']}GB)" for p in res["foreign_apps"]), file=sys.stderr)
            print(f"[{BOX}]   -> human may quit apps (quit_apps.py --confirm) then re-run; "
                  f"or choose not to run this model on this box.", file=sys.stderr)
            continue
    print(f"[{BOX}] DONE. results in {RESULTS}")

if __name__ == "__main__":
    main()
