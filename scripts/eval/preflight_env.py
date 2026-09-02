#!/usr/bin/env python3
"""
Sterile-env preflight + headroom gate for Loki's Lab fleet evals (LL-022 / v2 re-run).

Takes a BASELINE SNAPSHOT before any test and returns a TIERED verdict. It NEVER
kills anything. "Some load" is fine — only block when the model genuinely will
not fit, or park for a human decision when closing apps could free enough room.

Verdicts:
  sterile     : model fits AND no foreign apps                 -> run
  loaded_ok   : model fits BUT foreign apps are open           -> run, REPORT + OFFER quit
  ask_user    : model doesn't fit, but closing foreign apps could free enough -> PARK, ask
  cannot_run  : model doesn't fit even after closing everything -> PARK, cannot proceed

"Foreign apps" = human-use apps (browser / IDE / office / chat) on macOS
workstations. On Linux SERVERS, infrastructure daemons (docker / wazuh /
java-backend) are expected and never block.

The graceful-quit action lives in quit_apps.py and requires explicit --confirm;
it is only ever invoked after a human chooses to kill. This script is read-only.

Usage:  python3 preflight_env.py --model gemma4:12b-it-qat --box m1pro
Library: from preflight_env import check_headroom
"""
from __future__ import annotations
import argparse, json, os, platform, shutil, subprocess, sys, time

OS_OVERHEAD_GB = 3.0      # macOS/Linux base OS + Ollama daemon
BUFFER_GB = 2.0            # safety margin so the box stays responsive
FOOTPRINTS = {
    "gemma3:4b": 3, "qwen3.5:4b": 3,
    "gemma4:12b-it-qat": 7, "llama3.1:8b": 8, "qwen3.5:9b": 10,
    "qwen3:14b": 12, "qwen3.6:latest": 26, "qwen3.8:27b": 28,
    "mistral-small:24b": 26,
}
MAX_USER_SESSIONS = 1      # >1 logged-in human = not sterile

USER_APP_MARKERS = (
    "chrome", "safari", "firefox", "arc", "brave", "edge",        # browsers
    "xcode", "cursor", "vscode", "code ", "idea", "pycharm", "sublime",  # IDEs
    "slack", "zoom", "teams", "discord", "skype",                  # chat/meeting
    "spotify", "music", "photos", "preview", "keynote", "pages", "numbers",
    "word", "excel", "powerpoint", "electron",                    # office/media
)

def _run(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=15).stdout
    except Exception:
        return ""

def free_ram_gb() -> float:
    if platform.system() == "Linux":
        out = _run(["grep", "-E", "MemAvailable|MemFree", "/proc/meminfo"])
        avail = free = 0
        for line in out.splitlines():
            if line.startswith("MemAvailable:"):
                avail = int(line.split()[1]) / 1024 / 1024
            elif line.startswith("MemFree:"):
                free = int(line.split()[1]) / 1024 / 1024
        return max(avail, free)
    out = _run(["vm_stat"])
    pages = {}
    for line in out.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            pages[k.strip()] = int("".join(filter(str.isdigit, v)) or 0)
    return pages.get("Pages free", 0) + pages.get("Pages inactive", 0)
    # (caller multiplies by page size below)

def free_ram_gb_safe() -> float:
    if platform.system() == "Linux":
        return free_ram_gb()
    # macOS: derive the REAL page size (Apple Silicon = 16384 bytes, not 4096).
    # Hardcoding 4096 under-reports free RAM by ~4x on M-series Macs.
    try:
        page_bytes = os.sysconf("SC_PAGE_SIZE")
    except Exception:
        page_bytes = 4096
    out = _run(["vm_stat"])
    pages = {}
    for line in out.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            pages[k.strip()] = int("".join(filter(str.isdigit, v)) or 0)
    # free + inactive + speculative are all reclaimable by the kernel
    free = (pages.get("Pages free", 0) + pages.get("Pages inactive", 0)
            + pages.get("Pages speculative", 0))
    return free * page_bytes / (1024 ** 3)

def total_ram_gb() -> float:
    if platform.system() == "Linux":
        out = _run(["grep", "MemTotal", "/proc/meminfo"])
        for line in out.splitlines():
            if line.startswith("MemTotal:"):
                return int(line.split()[1]) / 1024 / 1024
    try:
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / (1024 ** 3)
    except Exception:
        return 0.0

def user_sessions() -> int:
    out = _run(["who"]).splitlines()
    users = {l.split()[0] for l in out if l.strip()}
    return max(1, len(users))

def heavy_processes() -> list[dict]:
    """Detect genuine user apps that signal a human is actively using the box.

    A GUI app's MAIN executable lives at:
        /Applications/<App>.app/Contents/MacOS/<App>
        /Users/<user>/Applications/<App>.app/Contents/MacOS/<App>
    Helper daemons (Frameworks/, XPCServices/, .driver, /System/, /usr/libexec)
    structurally CANNOT match this pattern, so they are never flagged. We match
    the executable name against a known set of user-app basenames.
    """
    import re
    MACOS_APP_RE = re.compile(
        r"/(?:Applications|Users/[^/]+/Applications)/([^/]+)\.app/Contents/MacOS/([^/ ]+)")
    KNOWN_APP_BASENAMES = {
        "xcode", "google chrome", "safari", "firefox", "arc", "code", "cursor",
        "slack", "zoom", "discord", "spotify", "keynote", "pages", "numbers",
        "word", "chrome", "visual studio code", "android studio", "pycharm",
        "intellij", "sublime text", "terminal", "iterm", "telegram", "signal",
    }
    # Linux: infrastructure daemons are expected and NEVER block. Only flag a
    # human-facing app by the same executable-name heuristic if present.
    LINUX_APP_RE = re.compile(r"/(?:usr|opt|home/[^/]+)/([^/]+\.appimage|[^/]+)$")
    LINUX_KNOWN = KNOWN_APP_BASENAMES

    out = _run(["ps", "-axo", "rss,command"] if platform.system() == "Darwin"
                else ["ps", "-eo", "rss,comm,command"])
    procs = []
    for line in out.splitlines()[1:]:
        parts = line.split(None, 1)
        if len(parts) < 2:
            continue
        try:
            rss_gb = int(parts[0]) / 1024 / 1024
        except ValueError:
            continue
        cmd = parts[1]
        cl = cmd.lower()
        # always ignore the eval/harness stack + system daemons by path
        if any(s in cl for s in ("ollama", "llama-server", "run_matrix",
                                  "orchestrate_box", "preflight_env", "node",
                                  "/tmp/v2run", "python3 -m", "dockerd",
                                  "containerd", "wazuh", "kworker", "arc_",
                                  "l2arc", "mds", "kernel")):
            continue
        if platform.system() == "Darwin":
            m = MACOS_APP_RE.search(cmd)
            if not m:
                continue  # not a GUI app main executable -> ignore (system daemon/helper)
            exe = m.group(2).lower()
            if exe not in KNOWN_APP_BASENAMES and m.group(1).lower() not in KNOWN_APP_BASENAMES:
                continue
        else:
            # Linux server: only flag if it clearly looks like a user app binary
            m = LINUX_APP_RE.search(cmd)
            if not m:
                continue
            if m.group(1).lower() not in LINUX_KNOWN:
                continue
        procs.append({"rss_gb": round(rss_gb, 2), "cmd": cmd[:80]})
    return procs

def ollama_loaded() -> list[str]:
    try:
        import urllib.request
        with urllib.request.urlopen("http://localhost:11434/api/ps", timeout=4) as r:
            d = json.loads(r.read())
        return [m["name"] for m in d.get("models", [])]
    except Exception:
        return []

def ollama_loaded_gb() -> float:
    """RAM currently held by resident Ollama models.

    This is RECLAIMABLE headroom for the NEXT model: Ollama keeps only one model
    resident and swaps the prior one out before loading the next, so the RAM a
    loaded model occupies is available the moment we start a different model.
    """
    try:
        import urllib.request
        with urllib.request.urlopen("http://localhost:11434/api/ps", timeout=4) as r:
            d = json.loads(r.read())
        return sum(m.get("size", 0) for m in d.get("models", [])) / 1024 ** 3
    except Exception:
        return 0.0

def snapshot(box: str) -> dict:
    return {
        "box": box,
        "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "platform": platform.system(),
        "total_ram_gb": round(total_ram_gb(), 1),
        "free_ram_gb": round(free_ram_gb_safe(), 1),
        "user_sessions": user_sessions(),
        "ollama_loaded": ollama_loaded(),
        "heavy_processes": heavy_processes(),
        "load_avg": list(os.getloadavg()) if hasattr(os, "getloadavg") else None,
    }

def _is_foreign_user_app(cmd: str, plat: str) -> bool:
    cl = cmd.lower()
    if any(s in cl for s in ("ollama", "llama-server", "run_matrix", "orchestrate_box",
                              "preflight_env", "node", "/tmp/v2run", "dockerd",
                              "containerd", "wazuh", "java", "python", "ssh", "kworker",
                              "arc_", "l2arc", "mds", "kernel")):
        return False
    return any(m in cl for m in USER_APP_MARKERS)

def _decide(fit: bool, foreign_or_extra: bool, required_gb: float, total_ram_gb: float):
    """Pure tiering logic (unit-tested separately)."""
    if not fit:
        if foreign_or_extra and total_ram_gb >= required_gb:
            return False, "ask_user"      # closing foreign could free enough
        return False, "cannot_run"        # won't fit even if everything closed
    if foreign_or_extra:
        return True, "loaded_ok"          # fits, but report + offer quit
    return True, "sterile"

def check_headroom(model: str, box: str, required_extra_gb: float = 0.0) -> dict:
    snap = snapshot(box)
    footprint = FOOTPRINTS.get(model)
    if footprint is None:
        return {"ok": False, "verdict": "cannot_run",
                "reason": f"unknown model footprint for {model!r}; add to FOOTPRINTS",
                "snapshot": snap, "required_gb": 0.0, "foreign_apps": [], "warnings": []}
    required = footprint + OS_OVERHEAD_GB + BUFFER_GB + required_extra_gb
    foreign = [p for p in snap["heavy_processes"] if _is_foreign_user_app(p["cmd"], snap["platform"])]
    foreign_present = bool(foreign)
    extra_sessions = snap["user_sessions"] > MAX_USER_SESSIONS
    # Loaded Ollama models are RECLAIMABLE: Ollama swaps the resident model out
    # before loading the next, so that RAM is available when this model starts.
    loaded_gb = ollama_loaded_gb()
    free_gb = snap["free_ram_gb"]
    available_gb = free_gb + loaded_gb
    fit = available_gb >= required
    ok, verdict = _decide(fit, foreign_present or extra_sessions, required, snap["total_ram_gb"])

    if verdict == "sterile":
        reason = "environment sterile with sufficient headroom"
    elif verdict == "loaded_ok":
        reason = (f"fits ({free_gb}GB free >= {required}GB) but foreign apps open: "
                  + ", ".join(f"{p['cmd']} ({p['rss_gb']}GB)" for p in foreign[:5]))
    elif verdict == "ask_user":
        reason = (f"free RAM {free_gb}GB < required {required}GB; "
                  f"closing foreign apps could free enough (total {snap['total_ram_gb']}GB)")
    else:
        if loaded_gb > 0:
            reason = (f"model needs {required}GB; even with the {loaded_gb:.1f}GB held by the "
                      f"currently-loaded Ollama model freed, only {available_gb:.1f}GB is available "
                      f"on this {snap['total_ram_gb']:.0f}GB box — cannot run here")
        else:
            reason = (f"model needs {required}GB but only {available_gb:.1f}GB available on this "
                      f"{snap['total_ram_gb']:.0f}GB box; cannot run here")

    recommendation = {
        "sterile": "proceed",
        "loaded_ok": "proceed, or quit the listed foreign apps first",
        "ask_user": "ASK USER: close foreign apps / quit them / cannot run",
        "cannot_run": "cannot run on this box",
    }[verdict]

    return {"ok": ok, "verdict": verdict, "fit": fit, "sterile": verdict == "sterile",
            "foreign_apps": foreign, "headroom_gb": round(available_gb - required, 1),
            "required_gb": required, "reason": reason, "recommendation": recommendation,
            "snapshot": snap, "warnings": []}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--box", required=True)
    ap.add_argument("--extra-gb", type=float, default=0.0)
    ap.add_argument("--json", action="store_true", help="emit JSON only")
    args = ap.parse_args()
    res = check_headroom(args.model, args.box, args.extra_gb)
    if args.json:
        print(json.dumps(res, indent=2))
    else:
        print(f"VERDICT={res['verdict']} ok={res['ok']} required={res['required_gb']}GB "
              f"free={res['snapshot']['free_ram_gb']}GB")
        print(f"  {res['reason']}")
        if res["foreign_apps"]:
            print("  FOREIGN APPS OPEN (human choice to quit or keep):")
            for p in res["foreign_apps"]:
                print(f"    - {p['cmd']}  ({p['rss_gb']}GB)")
            print("  To quit gracefully after approval: "
                  "python3 quit_apps.py --apps <names> --confirm")
    sys.exit(0 if res["ok"] else 2)

if __name__ == "__main__":
    main()
