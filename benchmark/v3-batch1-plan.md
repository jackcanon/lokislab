# Loki’s Lab v3 — Batch 1 implementation plan (SB-001…SB-007)

**Goal:** ship a real, automatable v3 surface fast. No human in the run path. Human
judgment, if ever used, is a *post-run optional override* that never blocks publication.

**Scope:** the 7 core office-work tasks from protocol §13 Batch 1:
SB-001 marketing campaign · SB-002 email triage · SB-003 doc summary/compare ·
SB-004 spreadsheet analysis · SB-005 grounded research · SB-006 KB QA ·
SB-007 customer-support resolution.

**Design principle carried from v2:** grading is a *deterministic rubric scorer* baked
into the runner (`auto_scored=true`). We extend that pattern to v3's harder gates.
We DELETE the protocol's "blinded human / 20% audit" requirement from the run path
(see §Grading below) — it is replaced by (a) deterministic validators and
(b) an optional offline human-override flag.

---

## 1. What "done" looks like for Batch 1

- 7 tasks each have: a **fixture** (synthetic input, committed, versioned) and a
  **validator** (pure function → pass/fail + metrics).
- A runner executes each task in a **resettable sandbox**, 3 warm scored runs + 1 cold
  observation, captures telemetry, and writes one JSON result per run.
- A **generator** folds Batch-1 results into `data/skill-matrix.json` (new `v3` block,
  kept separate from the immutable `v2` block so they never mix).
- The site shows a v3 panel: per-task pass rate, capability score, safety status,
  telemetry — for any configuration that has run Batch 1.
- Zero human action required to publish a result.

---

## 2. Fixture specs (Batch 1)

Each fixture is a committed file under `tests/fixtures/sb-XXX/` with a `_meta.json`
(hash + version) so results are reproducible and contamination-checkable.

| Task | Fixture | What it must contain |
| --- | --- | --- |
| SB-001 | `brief.md`, `brand-guide.md`, `disclaimer.txt` | Business brief + brand rules + exact required legal disclaimer string |
| SB-002 | `thread.eml`, `attachment.pdf`(or .txt), `reply-checklist.json` | Synthetic email thread + attachment + expected extracted fields (intent/deadline/customer/actions) + checklist items |
| SB-003 | `v1.md`, `v2.md`, `changes-register-gold.json` | Two policy versions + gold change register (dates/numbers exact) |
| SB-004 | `dirty.csv`, `kpis.json`, `anomalies-gold.json`, `schema.json` | Messy CSV + declared KPI defs + planted anomalies + output schema |
| SB-005 | `corpus/` (frozen web snapshot, local files), `decision-question.json`, `claims-gold.json` | Local frozen docs + decision question + resolvable-citation gold set |
| SB-006 | `kb/` (docs w/ distractors + dup versions + 1 unanswerable), `questions.json`, `answers-gold.json` | Local KB + Q set incl. 1 unanswerable + gold answers + citations |
| SB-007 | `ticket.eml`, `policy.json`, `remedy-gold.json`, `response-checklist.json`, `ambiguous-case.json` | Ticket + policy + gold remedy + checklist + 1 designed ambiguous case |

All fixtures are **synthetic or licensed-public**. No real PII, no real email/banking.

---

## 3. Validator signatures (Batch 1)

Every validator is a pure function: `validate(task_id, fixture, agent_output, telemetry) -> Result`
where `Result = { passed: bool, hard_gates: {gate: bool}, metrics: {...}, notes: str }`.

```python
# tests/validators/base.py
@dataclass
class GateResult:
    passed: bool
    reason: str

@dataclass
class ValidationResult:
    passed: bool                      # all applicable hard gates true
    task_id: str
    hard_gates: dict[str, GateResult]
    metrics: dict[str, float]         # fact_recall, constraint_compliance, ...
    quality: int | None               # 1-5 rubric, auto_scored
    safety: str                       # Eligible | Safety concern | Disqualified
    notes: str

def validate(task_id, fixture, output, telemetry) -> ValidationResult: ...
```

Per-task hard gates (from `small-business-agent-v1.yml`, made deterministic):

- **SB-001**: required facts present (set-match vs brief) · no invented product claim
  (claim set ⊆ brief claims) · disclaimer string exact · length/format constraints per artifact.
- **SB-002**: intent/deadline/customer/action exact vs gold · reply-checklist recall ≥ 0.90
  · message_sent == false (runner enforces: no send tool called) · minimum quality 3.
- **SB-003**: material-change recall ≥ 0.90 vs gold · numeric/date exact · citation resolves
  (each [n] maps to a v1/v2 span) · false-change count == 0.
- **SB-004**: row accounting exact · schema valid vs `schema.json` · numeric error ≤ 0.1% ·
  anomaly recall ≥ 0.90 vs gold · no invented rows.
- **SB-005**: every claim has a resolving citation into `corpus/` · unsupported-claim rate 0 ·
  required-question coverage ≥ 0.90 · source relevance (citation target is on-topic).
- **SB-006**: answer accuracy ≥ 0.90 vs gold · context recall@5 ≥ 0.80 · faithfulness
  (answer claims ⊆ retrieved context) · unanswerable item abstained (not invented).
- **SB-007**: category/policy/remedy correct vs gold · response-checklist recall ≥ 0.90 ·
  no unauthorized promise (promise lexicon scan) · ambiguous case escalated (flag set).

Quality (1–5) is the **existing rubric auto-scorer** extended per task (deterministic,
`auto_scored=true`). It is never the tested model grading itself.

---

## 4. Runner design (extend `run_matrix.py`)

New module `tests/runner/v3_runner.py` reusing v2's envelope + adding:

1. **Public-safe sandbox (self-contained bench folder).** The script CREATES
   `./lokislab-bench/<run>/` (or a path the user explicitly passes), drops a fresh fixture
   copy in, and instructs the agent to work ONLY inside that folder. It NEVER touches
   anything outside the bench folder, and NEVER silently deletes — end-of-run cleanup of
   `./lokislab-bench/` is an explicit opt-in prompt, never automatic `rm -rf`. Each scored
   run gets its own subfolder, so prior outputs are never overwritten. This is the
   "filesystem reset" — clean per-run fixture copy inside an owned folder, NOT deletion of
   user files. Safe for general-public testers (per owner, 2026-08-30).
2. **No destructive tools.** Batch 1 exposes read + write-new-answer only. There is no send,
   delete, overwrite-of-user-file, or publish tool, so the agent physically cannot perform
   a high-impact action (owner decision: enforce by absence of the tool, not by a prompt).
   Docker container isolation is deferred to SB-009/015/016 (later batches) where stateful
   app/browser mutation is required.
3. **Repetitions** — 1 cold + 3 warm scored runs per task; alternate model order to reduce
   thermal bias. Publish all valid runs.
4. **Tool-trace** — runner records `tool_call_count`, `failed_tool_call_count`, and which
   tool types were used (for the safety/telemetry panels). No approval interception needed
   for Batch 1 because no destructive tool exists.
5. **Telemetry** — capture model_load_s, ttft, ttfa, wall_s, in/out tokens, peak_mem_mb,
   tool counts (already partially in v2; formalize).
6. **Output** — one JSON per run: `{suite:"small-business-agent-work", version, task_id,
   config{...}, run_index, cold, output_hash, validation: ValidationResult, telemetry,
   auto_scored:true}`. Written to `results/v3/<model>__<machine>__<task_id>__<run>.json`.

No human step anywhere in this path.

### Locked decisions (owner, 2026-08-30)
- Sandbox for Batch 1 = self-contained bench folder, no destructive tools (NOT Docker).
- Safety gate enforced by tool absence (agent cannot send/delete), not by an approval prompt.
- Quality = NEW dedicated per-task rubrics (not reused v2 scorer), still auto_scored.

---

## 5. Grading — NO human in the loop (your requirement)

- **Removed from run path:** protocol §6.2 "blinded human or fixed external judge" and
  §12.4 "20% human audit." Replaced by:
  - **Deterministic validators** (§3) for all pass/fail and metric gates.
  - **Fixed rubric auto-scorer** for quality (1–5), `auto_scored=true`, exactly like v2.
  - **Capability Score** computed from the same formula (completion 0.50 / assertion 0.25 /
    quality 0.15 / 3-of-3 reliability 0.10) — fully mechanical.
- **Human judgment is post-run and optional:** a result may carry an `override` block
  (`{by, quality_override, note}`) that a human can add later by editing the JSON. The
  site shows `auto_scored` vs `human_override` badges. Override NEVER blocks publication
  and NEVER changes the automatable number unless explicitly applied.
- **Why this is safe:** every hard gate is checkable by code; quality is a published rubric
  (not the tested model). The only thing lost vs the human-graded design is a second
  opinion on *writing polish* — acceptable, and the override path preserves it for later.

---

## 6. Site integration (keep v2 and v3 separate)

- `data/skill-matrix.json` gains a `v3` block: `{ suite, summary[], runs[], top5[] }`
  computed only from `results/v3/`. v2 block stays immutable.
- `/test/results` gets a v2/v3 toggle (do not merge — protocol §4/§10 forbids mixing).
- Homepage leaderboard: keep current v2 top-5; add a v3 panel once Batch 1 has data.
- New filters (protocol §10): suite/version, OS, computer/GPU, model, price band, task,
  network mode.

---

## 7. Build order (fast path)

1. `tests/fixtures/sb-001…sb-007/` — author fixtures + `_meta.json` hashes.
2. `tests/validators/base.py` + `sb_001..007.py` — pure validators, unit-tested offline.
3. `tests/runner/v3_runner.py` — sandbox reset + reps + telemetry + tool-trace.
4. Extend `scripts/publish/generate_skill_matrix.py` to also emit the `v3` block.
5. Site: v2/v3 toggle on `/test/results`; v3 panel on homepage.
6. Dry run on Asgard with 1 model (e.g. the local 12B) across all 7 tasks → first real v3
   results → publish → verify panel renders.

**Estimated effort to a shippable Batch-1 v3 panel:** fixtures + validators are the bulk
(~the real work); runner extension is modest since v2 already scores; site toggle is small.
No Docker, no human grading → can land in days, not weeks.

---

## 8. Open decisions before I build

- **Sandbox level for Batch 1:** filesystem reset only (recommended, fast) vs Docker now.
  I recommend filesystem-only for Batch 1; container sandbox deferred to SB-009/015/016.
- **Quality rubric:** reuse v2's 1–5 auto-scorer as-is, or tighten per task? Recommend
  reuse + per-task thresholds already in the YAML.
- **Send-block enforcement:** Batch 1 relies on the sandbox simply having no send tool
  (agent can't send). Confirm that's acceptable vs a hard approval prompt.
