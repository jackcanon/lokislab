#!/usr/bin/env python3
"""Unit test for the tiered verdict logic in preflight_env._decide (pure, no SSH)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from preflight_env import _decide

def check(fit, foreign_or_extra, required, total, expect_ok, expect_verdict):
    # _decide(fit, foreign_or_extra, required_gb, total_ram_gb)
    ok, verdict = _decide(fit, foreign_or_extra, required, total)
    assert ok == expect_ok, f"fit={fit} extra={foreign_or_extra} req={required} total={total} -> ok={ok} expected {expect_ok}"
    assert verdict == expect_verdict, f"-> verdict={verdict} expected {expect_verdict}"
    print(f"PASS  fit={fit} extra={foreign_or_extra} req={required} total={total} -> ok={ok} verdict={verdict}")

if __name__ == "__main__":
    # sterile: fits, no foreign
    check(True, False, 8, 16, True, "sterile")
    # loaded_ok: fits but foreign apps open
    check(True, True, 8, 16, True, "loaded_ok")
    # ask_user: doesn't fit, but total could free enough (close foreign).
    # Model needs 8GB, box has 16GB total but foreign apps eating free RAM.
    check(False, True, 8, 16, False, "ask_user")
    # cannot_run: model needs 33GB (27B) but box total is only 24GB.
    check(False, True, 33, 24, False, "cannot_run")
    # cannot_run: doesn't fit, no foreign, total too small.
    check(False, False, 33, 24, False, "cannot_run")
    print("\nALL TIERING TESTS PASSED")
