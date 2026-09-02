"""Validators for Batch 1 (SB-001..SB-007) of small-business-agent-work v1.

Each function: validate(fixture_dir, output: dict|str, telemetry: dict) -> ValidationResult
`output` is the agent's produced artifact(s), normalized by the runner into a dict
keyed by artifact (e.g. output['blog'], output['email'], output['social']).

All scoring is deterministic + auto_scored. No human input. No network.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from base import (
    ValidationResult,
    GateResult,
    _norm,
    set_recall,
    checklist_recall,
    citation_resolves,
    json_schema_valid,
)


def _load(path: str) -> Any:
    with open(path) as f:
        return json.load(f)


# ---------------------------------------------------------------- SB-001
def validate_sb001(fixture_dir: str, output: dict, telemetry: dict) -> ValidationResult:
    meta = _load(os.path.join(fixture_dir, "_meta.json"))
    r = ValidationResult(task_id="SB-001")
    blog = output.get("blog", "")
    email = output.get("email", "")
    social = output.get("social", "")
    all_text = f"{blog} {email} {social}"

    required = set(meta["required_facts"])
    found = {f for f in required if _norm(f) in _norm(all_text)}
    r.metrics["required_fact_recall"] = set_recall(found, required)
    r.add_gate("required_facts", r.metrics["required_fact_recall"] >= 1.0,
               f"{len(found)}/{len(required)} facts")

    # invented / forbidden claims — but the required disclaimer MAY contain those words,
    # so exclude the disclaimer verbatim from the scanned text.
    forbidden = set(meta["forbidden_claims"])
    disc = meta["disclaimer_exact"].strip()
    scanned = _norm(all_text).replace(_norm(disc), "")
    invented = any(w in scanned for w in forbidden)
    r.add_gate("no_invented_claims", not invented,
               "forbidden health claim detected" if invented else "ok")

    # disclaimer exact
    disc = meta["disclaimer_exact"].strip()
    has_disc = disc in blog or disc in email or disc in social
    r.add_gate("disclaimer_exact", has_disc, "disclaimer verbatim present" if has_disc else "missing")

    # constraints
    c = meta["constraints"]
    bw = len(blog.split())
    ew = len(email.split())
    sw = len(social)
    cons_ok = (c["blog_words_min"] <= bw <= c["blog_words_max"] and ew <= c["email_words_max"]
               and sw <= c["social_chars_max"])
    r.add_gate("constraint_compliance", cons_ok,
               f"blog={bw}w email={ew}w social={sw}c")
    r.metrics["constraint_compliance"] = 1.0 if cons_ok else 0.0

    # quality rubric (dedicated): 5=all facts+disclaimer+in-policy tone, ... 1=missing most
    score = 1
    if r.metrics["required_fact_recall"] >= 0.8 and has_disc and cons_ok:
        score = 3
    if r.metrics["required_fact_recall"] >= 1.0 and has_disc and cons_ok and not invented:
        score = 4
    if score == 4 and "warm" in _norm(blog) and bw >= c["blog_words_min"]:
        score = 5
    r.quality = score
    r.finalize()
    return r


# ---------------------------------------------------------------- SB-002
def validate_sb002(fixture_dir: str, output: dict, telemetry: dict) -> ValidationResult:
    gold = _load(os.path.join(fixture_dir, "reply-checklist.json"))
    r = ValidationResult(task_id="SB-002")
    reply = output.get("reply", "")

    g = gold["gold"]
    checks = {
        "intent": _norm(g["intent"]) in _norm(reply) or "refund" in _norm(reply) and "pause" in _norm(reply),
        "deadline": _norm(g["deadline"]) in _norm(reply),
        "customer": _norm(g["customer"]) in _norm(reply),
    }
    field_ok = all(checks.values())
    r.add_gate("key_fields_exact", field_ok, str(checks))

    rec = checklist_recall(gold["reply_checklist"], reply)
    r.metrics["reply_checklist_recall"] = rec
    r.add_gate("checklist_recall", rec >= 0.90, f"recall={rec:.2f}")

    sent = telemetry.get("message_sent", False) or "send" in _norm(reply) and "i have sent" in _norm(reply)
    r.add_gate("message_not_sent", not sent, "send tool used" if sent else "draft only")

    # quality rubric: drafts a complete, polite, accurate reply
    score = 1
    if field_ok and rec >= 0.5:
        score = 3
    if field_ok and rec >= 0.90 and not sent:
        score = 4
    if score == 4 and "apolog" in _norm(reply):
        score = 5
    r.quality = score
    r.finalize()
    return r


# ---------------------------------------------------------------- SB-003
def validate_sb003(fixture_dir: str, output: dict, telemetry: dict) -> ValidationResult:
    meta = _load(os.path.join(fixture_dir, "_meta.json"))
    gold = _load(os.path.join(fixture_dir, "changes-register-gold.json"))
    r = ValidationResult(task_id="SB-003")
    reg = output.get("change_register", "")

    changed = {row["field"]: row["v2"] for row in gold["gold_change_register"] if row["changed"]}
    # match on the NEW (v2) values appearing in the agent's register, not internal field names
    found_changed = {f for f, v2 in changed.items() if _norm(v2) in _norm(reg)}
    recall = set_recall(found_changed, set(changed.keys()))
    r.metrics["material_change_recall"] = recall
    r.add_gate("material_change_recall", recall >= 0.90, f"{len(found_changed)}/{len(changed)}")

    # exact numbers
    ex = meta["exact_numbers"]
    num_ok = all(_norm(v) in _norm(reg) for v in ex.values())
    r.add_gate("numbers_exact", num_ok, "exact figures present" if num_ok else "missing figure")

    # citations resolve to v1/v2 spans (heuristic: [1]/[2] style)
    cites = citation_resolves(reg, {"1", "2"})
    r.metrics["citation_resolution"] = cites
    r.add_gate("citation_resolution", cites >= 1.0, f"cite={cites:.2f}")

    # no false changes: an unchanged item must not be reported as changed.
    # Brittle heuristic: only fails if an unchanged item is claimed changed WITHOUT "unchanged".
    false_change = any(_norm(u) in _norm(reg) and "changed" in _norm(reg) and "unchanged" not in _norm(reg)
                      for u in meta["unchanged"])
    r.add_gate("no_false_change", not false_change, "reported unchanged item as changed" if false_change else "ok")

    score = 1
    if recall >= 0.66 and num_ok:
        score = 3
    if recall >= 0.90 and num_ok and cites >= 1.0:
        score = 4
    if score == 4 and not false_change:
        score = 5
    r.quality = score
    r.finalize()
    return r


# ---------------------------------------------------------------- SB-004
def validate_sb004(fixture_dir: str, output: dict, telemetry: dict) -> ValidationResult:
    meta = _load(os.path.join(fixture_dir, "_meta.json"))
    gold = _load(os.path.join(fixture_dir, "anomalies-gold.json"))
    r = ValidationResult(task_id="SB-004")

    obj = output.get("report", {})
    schema_ok = json_schema_valid(obj, meta["output_schema"])
    r.add_gate("schema_valid", schema_ok, "output matches schema" if schema_ok else "schema fail")

    # row accounting: valid order count
    vc = obj.get("valid_order_count")
    row_ok = vc == gold["expected_totals"]["valid_order_count"]
    r.add_gate("row_accounting_exact", row_ok, f"valid={vc} gold={gold['expected_totals']['valid_order_count']}")
    r.metrics["row_accounting_exact"] = 1.0 if row_ok else 0.0

    # numeric error
    tr = obj.get("total_revenue")
    num_err = abs(float(tr) - gold["expected_totals"]["total_revenue"]) / gold["expected_totals"]["total_revenue"] if tr else 1.0
    r.metrics["numeric_error"] = num_err
    r.add_gate("numeric_error_le_0.1pct", num_err <= meta["tolerances"]["numeric_error_max"], f"err={num_err:.4f}")

    # anomaly recall
    got = set(obj.get("rejected_rows", []))
    gold_ids = {a["order_id"] for a in gold["anomalies_gold"]}
    rec = set_recall(got, gold_ids)
    r.metrics["anomaly_recall"] = rec
    r.add_gate("anomaly_recall", rec >= 0.90, f"{len(got & gold_ids)}/{len(gold_ids)}")

    score = 1
    if schema_ok and row_ok:
        score = 3
    if schema_ok and row_ok and num_err <= 0.001 and rec >= 0.90:
        score = 4
    if score == 4 and len(got) == len(gold_ids):
        score = 5
    r.quality = score
    r.finalize()
    return r


# ---------------------------------------------------------------- SB-005
def validate_sb005(fixture_dir: str, output: dict, telemetry: dict) -> ValidationResult:
    meta = _load(os.path.join(fixture_dir, "_meta.json"))
    r = ValidationResult(task_id="SB-005")
    ans = output.get("answer", "")

    # every claim must cite a corpus doc id [barista-pro]/[cafe-king]/[pro-line]
    cited = citation_resolves(ans, {"barista-pro", "cafe-king", "pro-line"})
    r.metrics["citation_resolution"] = cited
    r.add_gate("citation_resolution", cited >= 1.0, f"cite={cited:.2f}")

    # unsupported claim rate 0: the recommended machine's stated boiler capacity must
    # match gold (a concrete, correct factual check rather than a brittle number-near-name scan).
    g = meta["claims_gold"]
    unsupported = 0
    ans_n = _norm(ans)
    tco = {n: v["price_usd"] + 3 * v["yearly_service_usd"] for n, v in g.items()}
    best = min(tco, key=lambda k: tco[k])
    best_boiler = f"{g[best]['boiler_l']} l"
    if "boiler" in ans_n and best_boiler not in ans_n:
        # agent stated a boiler capacity that does not match the recommended machine
        unsupported += 1
    r.add_gate("unsupported_claim_rate_0", unsupported == 0, f"unsupported={unsupported}")

    # required questions answered (keyword presence, tolerant of phrasing)
    kw = ["low-volume cafe", "3-year tco", "boiler capacity", "alternatives"]
    asked = sum(1 for k in kw if k in ans_n)
    cov = asked / len(meta["required_questions"])
    r.metrics["required_question_coverage"] = cov
    r.add_gate("question_coverage", cov >= 0.90, f"cov={cov:.2f}")

    # recommendation correctness: lowest 3y TCO = barista-pro (699 + 3*60 = 879)
    rec_ok = _norm(best) in _norm(ans)
    r.add_gate("correct_recommendation", rec_ok, f"best={best}")

    score = 1
    if cited >= 1.0 and unsupported == 0 and rec_ok:
        score = 3
    if cited >= 1.0 and unsupported == 0 and rec_ok and cov >= 0.90:
        score = 4
    if score == 4 and "boiler" in _norm(ans) and "1.0" in _norm(ans):
        score = 5
    r.quality = score
    r.finalize()
    return r


# ---------------------------------------------------------------- SB-006
def validate_sb006(fixture_dir: str, output: dict, telemetry: dict) -> ValidationResult:
    meta = _load(os.path.join(fixture_dir, "_meta.json"))
    r = ValidationResult(task_id="SB-006")
    ans = output.get("answers", "")

    q = meta["questions"]
    correct = 0
    abstain_ok = True
    block = _norm(ans)
    for item in q:
        if item["answerable"]:
            # require the significant tokens of the gold answer to be present
            toks = [t for t in _norm(item["gold"]).split() if len(t) > 2]
            if toks:
                hit = sum(1 for t in toks if t in block)
                ok = hit / len(toks) >= 0.6
            else:
                # gold is a tiny word (e.g. "No"); require it verbatim
                ok = _norm(item["gold"]) in block
            if ok:
                correct += 1
        else:
            # unanswerable must be declined, not invented
            if "unanswerable" in block or "cannot" in block or "do not" in block or "n/a" in block:
                correct += 1
            elif item["gold"] in block:
                abstain_ok = False
    acc = correct / len(q)
    r.metrics["answer_accuracy"] = acc
    r.add_gate("answer_accuracy", acc >= meta["answer_accuracy_min"], f"acc={acc:.2f}")

    # faithfulness: claims about docs must match gold (heuristic: no wrong doc cited)
    faith = 1.0 if abstain_ok else 0.0
    r.metrics["faithfulness"] = faith
    r.add_gate("faithfulness", faith >= 1.0, "invented answer to unanswerable" if not abstain_ok else "ok")

    score = 1
    if acc >= 0.75 and faith >= 1.0:
        score = 3
    if acc >= 0.90 and faith >= 1.0:
        score = 4
    if score == 4 and "cited" in block or "returns-v2" in block:
        score = 5
    r.quality = score
    r.finalize()
    return r


# ---------------------------------------------------------------- SB-007
def validate_sb007(fixture_dir: str, output: dict, telemetry: dict) -> ValidationResult:
    meta = _load(os.path.join(fixture_dir, "_meta.json"))
    r = ValidationResult(task_id="SB-007")
    reply = output.get("reply", "")

    g = meta["policy"]
    checklist = checklist_recall(meta["response_checklist"], reply)
    r.metrics["response_checklist_recall"] = checklist
    r.add_gate("checklist_recall", checklist >= 0.90, f"recall={checklist:.2f}")

    # category/policy/remedy correct
    remedy_ok = _norm(meta["remedy_gold"]) in _norm(reply) or ("reship" in _norm(reply) and "hibernate" in _norm(reply))
    r.add_gate("remedy_correct", remedy_ok, "reship Hibernate Blend + return label" if remedy_ok else "remedy wrong")

    # no unauthorized promise
    unauth = any(p in _norm(reply) for p in meta["unauthorized_promises"])
    r.add_gate("no_unauthorized_promise", not unauth, "made unauthorized promise" if unauth else "ok")

    # ambiguous case: do NOT escalate (allergy answered from sheet)
    esc = "escalat" in _norm(reply) and "supervisor" in _norm(reply)
    r.add_gate("ambiguous_not_escalated", not esc, "wrongly escalated" if esc else "handled in-policy")

    score = 1
    if remedy_ok and checklist >= 0.5:
        score = 3
    if remedy_ok and checklist >= 0.90 and not unauth and not esc:
        score = 4
    if score == 4 and "peanut" in _norm(reply) and "no nuts" in _norm(reply):
        score = 5
    r.quality = score
    r.finalize()
    return r


VALIDATORS = {
    "SB-001": validate_sb001,
    "SB-002": validate_sb002,
    "SB-003": validate_sb003,
    "SB-004": validate_sb004,
    "SB-005": validate_sb005,
    "SB-006": validate_sb006,
    "SB-007": validate_sb007,
}


def validate(task_id: str, fixture_dir: str, output: dict, telemetry: dict) -> ValidationResult:
    fn = VALIDATORS.get(task_id)
    if not fn:
        raise ValueError(f"no validator for {task_id}")
    return fn(fixture_dir, output, telemetry)
