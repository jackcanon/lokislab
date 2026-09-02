# LL-022 — Reconcile Fleet Skill Matrix v2 into Loki's Lab benchmark schema

## Source
Pulled from Midgaard: `/Users/dit1/Claude/Projects/Fleet-Eval-2026-08/skill-matrix/`
(`TEST-SUITE.md`, `run_matrix.py`, 317 result JSON files). Tarball retrieved over
SSH now that the fleet can reach Midgaard (see session: authorized_keys fix).

## What the v2 data actually is
- **317 result files**, legacy flat schema: `model, machine, category, test_id,
  capable, quality, accuracy, speed_seconds, raw_output, notes, tested_at`
  (+ extras `in_tokens`, `out_tokens`, `reasoning_effort`).
- **0** of 317 files use Loki's Lab's v1 envelope.
- 6 models × 6 machines, 10 categories (7 documented + `coding_native`,
  `vision_multimodal`, `structured_output`, `reasoning_speed`).
- **One run per test file** — v2 stores results as `<model>__<machine>__<test_id>.json`,
  not 3-run grouped envelopes.

## Transform (scripts/reconcile/convert_v2.py)
Converts legacy flat → Loki's Lab v1 envelope:
- `submission_id` derived deterministically: `LL-<MODEL>_<MACHINE>_<DATE>`
  sanitized to `^LL-[A-Z0-9][A-Z0-9-]{5,63}$`.
- `model/machine/category/test_id` lifted into `model.*` / `system.*` / `runs[]`.
- `suite{fleet-skill-matrix,2}`, `harness{Hermes,1.0.0,lokislab-fixed-v1}`,
  `configuration{publisher_recommended}` synthesized; `system` from a
  machine→spec map built from the TEST-SUITE.md capability matrix.
- Runs of the same `(model,machine,test_id)` grouped into `runs[]` (run_number 1..n).

## Validation (real, against repo validator)
Every converted file run through `scripts/validate-benchmark-submission.mjs`:
- **315 converted submissions**, **0 invalid**, **315 `under_review`**.
- `under_review` (not `valid`) is expected: each has **1 run**, and the schema
  warns "official comparisons require exactly 3". **This is a real v2 data gap,
  not a transform bug** — we did NOT fabricate runs.
- **3 source records** had `capable:false` but non-null auto-scored
  quality/accuracy (a v2 inconsistency). Normalized to null per schema + TEST-SUITE
  intent; re-validation then passed (0 invalid).

## Honest gaps to close for full LL-022
1. **Run coverage**: v2 has 1 run/test; Loki's Lab wants 3. Need a re-run of
   `run_matrix.py` with 3 passes per test, or accept 1-run "under_review" entries.
2. **System specs** are synthesized from the capability matrix (real RAM/OS facts)
   but not measured per run; fine for launch, refine later.
3. **Converted files (315)** live at `/tmp/lokislab_recon/converted/` on heimdall;
   not committed to the repo (volume + they're derived artifacts). Re-run
   `convert_v2.py` to regenerate. The converter + this report ARE committed.

## This unblocks LL-009
The runner (scripts/runner/) can now consume real v2 results by pointing
`--suite` at the converted submissions; the median-of-three pipeline has real
data to operate on once run coverage reaches 3.
