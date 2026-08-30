# Loki's Lab — Task Board

Source: [`CMD-WORK-PLAN.md`](CMD-WORK-PLAN.md) · Repo: [`jackcanon/lokislab`](https://github.com/jackcanon/lokislab) · Public site: [`lokislab.org`](https://lokislab.org)

The canonical checkout is `/Volumes/10TB JBOD/Agents/Claude/Projects/Websites/lokislab/`. GitHub Issues remain the live tracker; this file is the offline handoff. Cmd Work is parked unless the owner explicitly reactivates it.

## Status snapshot

- **Done:** LL-001–LL-007
- **Doing:** LL-008–LL-011 and LL-043
- **To do:** LL-012–LL-042, LL-044–LL-046

## New benchmark work

- **LL-043** — Commit canonical benchmark manifests. Import the exact Fleet Skill Matrix v2 prompts, fixtures, validators, rubrics, and applicability rules; keep the proposed agent-work suite separate.
- **LL-044** — Add agent-work v1 fixtures and validators. Implement repository, structured-data, grounded-research, recovery, verification, safety, offline, and homelab tasks.
- **LL-045** — Add benchmark telemetry without changing quality scores. Capture first-action latency, tool outcomes, tokens, and memory where available.
- **LL-046** — Run the first Gemma article story battery with side-by-side screenshots, artifacts, validators, and run medians.

## Lanes

- **Editorial:** LL-012–LL-017, LL-039, LL-041
- **Benchmark:** LL-008–LL-011, LL-022–LL-029, LL-037–LL-038, LL-043–LL-046
- **Platform:** LL-018–LL-024, LL-031–LL-032
- **Community/operations:** LL-030, LL-033–LL-036, LL-040–LL-042

See [`TESTING-STRATEGY.md`](TESTING-STRATEGY.md) and [`tests/agent-work-v1.yml`](../tests/agent-work-v1.yml) for the benchmark rationale and proposed task definitions.
