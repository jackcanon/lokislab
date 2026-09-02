#!/usr/bin/env python3
"""
Graceful-quit helper for Loki's Lab fleet evals.

NEVER called automatically. Requires explicit --confirm; without it, only
PREVIEWS what would be quit. This is the "kill OR keep" choice point: a human
decides, then invokes this with --confirm for exactly the apps they approve.

  macOS : osascript 'tell application "<App>" to quit'  (graceful; app can save)
  Linux : kill -TERM <pid>                              (SIGTERM, not -9)

The eval/harness stack (ollama, llama-server, run_matrix, etc.) and server
infra (dockerd, wazuh, java-backend) are PROTECTED and never targeted.

Examples:
  python3 quit_apps.py --apps "Google Chrome,Slack"            # preview
  python3 quit_apps.py --apps "Google Chrome,Slack" --confirm  # quit them
  python3 quit_apps.py --pids 1234,5678 --confirm             # Linux pids
"""
import argparse, subprocess, sys, platform, re

PROTECTED = ("ollama", "llama-server", "run_matrix", "orchestrate_box",
             "preflight_env", "dockerd", "containerd", "wazuh", "java",
             "python", "kernel", "kworker", "arc_", "l2arc", "mds", "node")

def protected(name: str) -> bool:
    return any(p in name.lower() for p in PROTECTED)

def mac_app_name(token: str) -> str:
    """Resolve a macOS target to the app name osascript expects.

    Accepts either a plain name ('Google Chrome') or a full executable path
    ('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'). For a path
    we take the <App>.app bundle component (strip '.app') so the name matches
    what `tell application \"...\" to quit` resolves.
    """
    token = token.strip()
    m = re.search(r"/([^/]+)\.app/Contents/MacOS/", token)
    if m:
        return m.group(1)          # e.g. 'Google Chrome' or 'Xcode-beta'
    # strip any trailing args / path
    base = token.split()[0].rsplit("/", 1)[-1]
    return base.replace(".app", "")

def quit_mac(apps, confirm):
    for a in apps:
        name = mac_app_name(a)
        if protected(name):
            print(f"  SKIP (protected): {a}"); continue
        print(f"  {'QUIT' if confirm else 'would quit'}: {name}  (from {a})")
        if confirm:
            # graceful quit — app gets a chance to save; no SIGKILL
            subprocess.run(["osascript", "-e", f'tell application "{name}" to quit'],
                           capture_output=True)

def quit_linux(targets, by_pid, confirm):
    for t in targets:
        if protected(t):
            print(f"  SKIP (protected): {t}"); continue
        print(f"  {'KILL' if confirm else 'would kill'}: {t}")
        if confirm:
            if by_pid:
                subprocess.run(["kill", "-TERM", t])
            else:
                out = subprocess.run(["pgrep", "-f", t], capture_output=True, text=True).stdout.split()
                for pid in out:
                    subprocess.run(["kill", "-TERM", pid])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apps", help="comma-separated app names (macOS) or process patterns (Linux)")
    ap.add_argument("--pids", help="comma-separated PIDs (Linux)")
    ap.add_argument("--confirm", action="store_true",
                    help="REQUIRED to actually quit; otherwise preview only")
    args = ap.parse_args()
    if not args.confirm:
        print("PREVIEW ONLY (no --confirm). Nothing will be killed.\n")
    apps = [a.strip() for a in (args.apps or "").split(",") if a.strip()]
    pids = [p.strip() for p in (args.pids or "").split(",") if p.strip()]
    if platform.system() == "Darwin":
        quit_mac(apps, args.confirm)
    else:
        if pids:
            quit_linux(pids, by_pid=True, confirm=args.confirm)
        else:
            quit_linux(apps, by_pid=False, confirm=args.confirm)
    if args.confirm:
        print("\nDone. Re-run preflight_env.py to confirm the environment is now sterile.")

if __name__ == "__main__":
    main()
