---
title: "Harden Submission Validation & Unique IDs"
short_title: "Harden Submission Validation & Unique IDs"
date: "2026-08-30"
---


-

# LL-025 — Harden submission validation & unique IDs (heimdall analysis)

## Current validator (scripts/validate-benchmark-submission.mjs)
- Validates against schemas/benchmark-submission.v1.schema.json
- Returns decision: valid | invalid with errors[] (path + message)
- No uniqueness check on submission_id across the review queue
- No Form-ID <-> JSON submission_id cross-check
- No privacy re-scan before retaining raw output

## Proposed hardening (per plan acceptance)
1. **Unique ID collision**: maintain a seen-submission_ids set (D1 store / queue state); reject duplicate submission_id with actionable reason.
2. **Form-ID match**: require submission_id present in JSON; if a Form response ID is supplied, match it to JSON submission_id; mismatch => fail closed.
3. **Fail-closed**: malformed / unsafe / duplicate / mismatched => decision invalid + reason; never partial-accept.
4. **Privacy gating**: only retain raw output after a privacy review pass (privacy_flags empty or cleared).

## Feasibility on fleet
- Validator runs under Node 22 (confirmed). Extending it is pure JS; no native deps.
- LL-026 (status workflow) + LL-024 (result-detail pages) build on this data model.

## Next step
- Implement uniqueness + Form-ID match inside validate-benchmark-submission.mjs and add a queue-state stub.
