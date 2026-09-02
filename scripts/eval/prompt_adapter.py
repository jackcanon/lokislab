#!/usr/bin/env python3
"""Prompt adapter for the Loki's Lab sterile-env gate (LL-022 / v2 re-run).

The gate (`preflight_env.check_headroom`) returns ONE structured dict verdict. How
that verdict is presented to the human is chosen by an adapter so the orchestrator
never branches on UI:

  - headless : print a clear report + park for a human decision (remote / community headless)
  - gui      : native OS dialog (single-machine community run with a display)
  - auto     : detect a display; GUI if one exists, else headless

A GUI run still NEVER kills without consent: the dialog offers
[Quit these apps & run] / [Keep & run anyway] / [Keep & skip this model].
Only the first returns quit_targets; the orchestrator then calls the
confirmation-gated quit_apps.py helper. So "choose to kill or keep" stays in
human hands on BOTH headless and GUI paths.
"""
from __future__ import annotations
import os
import sys


def has_display() -> bool:
    """True if a GUI session is available (X11/Wayland on Linux, Aqua on macOS)."""
    if sys.platform == "darwin":
        return (os.environ.get("SECURITYSESSIONID") is not None
                or os.environ.get("AQUA_SESSION_ID") is not None)
    return bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))


def choose_mode(preferred: str = "auto") -> str:
    if preferred == "auto":
        return "gui" if has_display() else "headless"
    return preferred


def _render_report(v: dict) -> str:
    snap = v.get("snapshot", {})
    lines = []
    lines.append("=" * 64)
    lines.append(f"  STERILE-ENV GATE   verdict={v.get('verdict')}   ok={v.get('ok')}")
    lines.append(f"  model needs {v.get('required_gb', 0):.1f}GB | "
                 f"free {snap.get('free_ram_gb', 0):.1f}GB | "
                 f"total {snap.get('total_ram_gb', 0):.1f}GB")
    if snap.get("user_sessions"):
        lines.append(f"  interactive user sessions: {snap['user_sessions']}")
    for a in v.get("foreign_apps", []):
        lines.append(f"    - {a.get('cmd', '?')[:60]}  {a.get('rss_gb', 0):.2f}GB")
    if v.get("reason"):
        lines.append(f"  reason: {v['reason']}")
    lines.append("=" * 64)
    return "\n".join(lines)


def _quit_command(v: dict) -> str:
    apps = " ".join(f'"{a.get("cmd", "")}"' for a in v.get("foreign_apps", []))
    return f'python3 quit_apps.py --apps {apps} --confirm'


def prompt_headless(v: dict) -> dict:
    """Headless: print report; return decision. Never acts on its own."""
    print(_render_report(v))
    verdict = v.get("verdict")
    if verdict in ("sterile", "loaded_ok"):
        if v.get("foreign_apps"):
            print("  INFO: some load present but model fits. To free RAM first, run:")
            print(f"    {_quit_command(v)}")
        return {"action": "run", "quit_targets": []}
    if verdict == "ask_user":
        print("  PARKED: needs RAM freed. Human choice required. To quit the apps above and run:")
        print(f"    {_quit_command(v)}")
        print("  Or keep them and skip this model (no-op).")
        return {"action": "park", "quit_targets": [a.get("cmd") for a in v.get("foreign_apps", [])]}
    # cannot_run
    print("  CANNOT RUN: closing apps won't free enough RAM on this box. Skipped (no-op).")
    return {"action": "skip", "quit_targets": []}


def prompt_gui(v: dict) -> dict:
    """GUI: native dialog offering quit/keep/skip. Falls back to headless if no tkinter."""
    try:
        import tkinter as tk
        from tkinter import messagebox
    except Exception as e:  # no tkinter -> headless fallback
        print(f"  (gui unavailable: {e}; falling back to headless)")
        return prompt_headless(v)

    verdict = v.get("verdict")
    if verdict in ("sterile", "loaded_ok"):
        if not v.get("foreign_apps"):
            return {"action": "run", "quit_targets": []}
        msg = (_render_report(v) +
               "\n\nFree up RAM by quitting the listed apps before running?\n"
               "(Run anyway leaves them open.)")
        root = tk.Tk()
        root.withdraw()
        choice = messagebox.askyesnocancel(
            "Loki's Lab eval — some apps open",
            msg,
            detail="Yes = quit apps then run | No = run anyway | Cancel = skip model",
        )
        root.destroy()
        if choice is True:
            return {"action": "run", "quit_targets": [a.get("cmd") for a in v.get("foreign_apps", [])]}
        if choice is False:
            return {"action": "run", "quit_targets": []}
        return {"action": "skip", "quit_targets": []}

    if verdict == "ask_user":
        msg = (_render_report(v) +
               "\n\nNot enough free RAM. Quit the listed apps to make room and run?\n"
               "(Cancel = skip this model.)")
        root = tk.Tk()
        root.withdraw()
        choice = messagebox.askyesnocancel(
            "Loki's Lab eval — free up RAM?",
            msg,
            detail="Yes = quit apps then run | No = run anyway | Cancel = skip",
        )
        root.destroy()
        if choice is True:
            return {"action": "run", "quit_targets": [a.get("cmd") for a in v.get("foreign_apps", [])]}
        if choice is False:
            return {"action": "run", "quit_targets": []}
        return {"action": "skip", "quit_targets": []}

    # cannot_run
    root = tk.Tk()
    root.withdraw()
    messagebox.showerror("Loki's Lab eval — cannot run", _render_report(v))
    root.destroy()
    return {"action": "skip", "quit_targets": []}


def prompt(v: dict, mode: str = "auto") -> dict:
    mode = choose_mode(mode)
    if mode == "gui":
        return prompt_gui(v)
    return prompt_headless(v)
