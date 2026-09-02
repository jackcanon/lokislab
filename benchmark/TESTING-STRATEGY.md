# Loki’s Lab benchmark testing strategy

## Purpose

Loki’s Lab measures whether a local model running through a declared agent setup can complete useful work on a real computer. It is not intended to be a leaderboard of chat fluency alone. Results should help a reader choose a model, runtime, and hardware configuration for a job they actually need to do.

## Current baseline

Fleet Skill Matrix v2 is the current baseline: Ollama through the fixed Loki’s Lab Hermes profile, publisher-recommended settings, three runs per applicable test, median timing, explicit `N/A` handling, and public `Unverified`/`Verified` states. The baseline remains immutable once published.

The repository previously documented 19 starting tests, but did not contain the canonical test prompts, fixtures, validators, or rubrics. Those definitions are required for reproducibility. The recommended additions are tracked separately in [`tests/agent-work-v1.yml`](../tests/agent-work-v1.yml) so the existing Fleet Skill Matrix v2 results are not silently reinterpreted.

The first publication experiment is the [`Gemma story battery`](GEMMA-STORY-BATTERY.md), which compares two same-family quantized models through the same Ollama/Hermes setup and requires screenshots, artifacts, and run summaries.

The proposed business-workload standard is the [`Loki’s Lab Local Agent Benchmark Protocol`](LOCAL-AGENT-BENCHMARK-PROTOCOL.md), with its machine-readable [`small-business-agent-work` v1 manifest](../tests/small-business-agent-v1.yml). It defines 20 realistic workloads, task-specific success thresholds, cross-cutting safety variants, capability scoring, performance reporting, and the standards Loki’s Lab adopts from established evaluation projects.

## What the benchmark should answer

- Can the agent complete a multi-step task, not merely describe one?
- Can it change files, run tools, and verify its own work?
- Can it handle coding, data, documents, research, and homelab operations?
- Does it recover from a failed tool call or missing dependency?
- Does it preserve facts, produce valid structured output, and cite evidence?
- Does it respect permissions, protect secrets, and resist prompt injection?
- How much time and memory does the configuration require?

## Tracks

The public leaderboard should report separate tracks rather than conceal every result in one score:

1. **Agent work** — planning, tool use, execution, and verification.
2. **Coding and DevOps** — repository repair, scripts, tests, and diagnostics.
3. **Files and data** — JSON/CSV transformation, file operations, and spreadsheet analysis.
4. **Research and writing** — grounded answers, citations, reports, and constrained rewrites.
5. **Reliability** — recovery, repeatability, long-context retrieval, and offline behavior.
6. **Safety and control** — permissions, secrets, destructive actions, and prompt injection.
7. **System performance** — startup, first action, completion time, memory, and throughput.

Model-only tests, Hermes tool-use tests, and system-performance tests must remain separately comparable. A new harness profile is a new suite or suite version, never a silent substitution.

## Scoring rules

Each task has a deterministic validator wherever possible. Hard gates include required artifacts, schema validity, test/validator success, and safe behavior. Quality and writing judgments may use a published human rubric, but the tested model must not be its own hidden judge.

Report completion rate, quality, accuracy, median and p95 wall time, coverage, and failure reason. Keep the existing three-run median for ordinary tasks; use a dedicated reliability task with more repetitions when flakiness itself is the subject.

## Measurement metadata

Record model and quantization, runtime version, Hermes profile, context length, tool list, relevant settings, runner commit, OS, hardware, memory, background-load notes, and whether the run was cold or warm. Add artifact hashes, tool-call outcomes, peak memory, and token counts when the runner can collect them without exposing private data.

## Privacy and safety

Use synthetic or public fixtures. Do not execute uploaded files. Keep secrets, home-directory paths, private IPs, emails, and private evidence URLs out of public output. Network-enabled and offline tests must be distinct. Every state-changing task must run in a sandbox and require explicit permission before destructive operations.

## Versioning and review

Keep Fleet Skill Matrix v2 immutable. Use v2.1 for additions that preserve existing task semantics; use v3 when prompts, fixtures, scoring, or harness assumptions change materially. Every release needs a manifest, changelog, fixture set, validators, and a migration note explaining comparability.

The canonical repository is `/Volumes/HJMPool1/AI Workspace/Projects/Websites/HJM Websites/lokislab/`. The Git remote remains `https://github.com/jackcanon/lokislab.git`.
