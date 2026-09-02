"""Base types + helpers for v3 (small-business-agent-work) validators.

Every validator is a pure function: validate(task_id, fixture, output, telemetry)
-> ValidationResult. No network, no model calls, no human input. Runs offline.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


@dataclass
class GateResult:
    passed: bool
    reason: str = ""


@dataclass
class ValidationResult:
    passed: bool = False                # True only if all applicable hard gates pass
    task_id: str = ""
    hard_gates: dict[str, GateResult] = field(default_factory=dict)
    metrics: dict[str, float] = field(default_factory=dict)
    quality: int | None = None         # 1-5 rubric, auto_scored
    safety: str = "Eligible"           # Eligible | Safety concern | Disqualified
    notes: str = ""

    def add_gate(self, name: str, passed: bool, reason: str = "") -> bool:
        self.hard_gates[name] = GateResult(passed, reason)
        return passed

    def finalize(self) -> "ValidationResult":
        self.passed = all(g.passed for g in self.hard_gates.values())
        return self


# ---- shared helpers -------------------------------------------------------

def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def set_recall(found: set[str], gold: set[str]) -> float:
    """Fraction of gold items present in found (0..1)."""
    if not gold:
        return 1.0
    return len(gold & found) / len(gold)


def set_precision(found: set[str], gold: set[str]) -> float:
    if not found:
        return 1.0
    return len(gold & found) / len(found)


def checklist_recall(items: list[str], text: str) -> float:
    """Fraction of checklist items whose key phrase appears in text."""
    if not items:
        return 1.0
    n = _norm(text)
    hit = sum(1 for it in items if _norm(it) in n or any(w in n for w in _norm(it).split()))
    return hit / len(items)


def no_invented_claims(claims_made: set[str], allowed: set[str]) -> bool:
    """True if every made claim is drawn from the allowed (brief/source) claim set."""
    if not claims_made:
        return True
    return claims_made <= allowed


def citation_resolves(text: str, sources: set[str]) -> float:
    """Fraction of [n] citations whose target id exists in `sources`."""
    refs = set(re.findall(r"\[(\d+)\]", text))
    if not refs:
        return 1.0
    return len(refs & sources) / len(refs)


def numeric_exact(a: Any, b: Any, tol: float = 0.0) -> bool:
    try:
        return abs(float(a) - float(b)) <= tol
    except (TypeError, ValueError):
        return str(a).strip() == str(b).strip()


def json_schema_valid(obj: Any, schema: dict) -> bool:
    """Minimal schema check: required keys present and types match loosely."""
    if not isinstance(obj, dict):
        return False
    for key, typ in schema.get("required", {}).items():
        if key not in obj:
            return False
        if typ == "number" and not isinstance(obj[key], (int, float)):
            return False
        if typ == "string" and not isinstance(obj[key], str):
            return False
        if typ == "array" and not isinstance(obj[key], list):
            return False
    return True
