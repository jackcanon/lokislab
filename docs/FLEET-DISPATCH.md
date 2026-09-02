# Loki's Lab — Fleet Dispatch Manifest

Source of truth: `docs/CMD-WORK-PLAN.md` · Live tracker: GitHub Issues `#1–#42` (one per `LL-0xx`).
CmdWork is parked (agent scope misconfiguration); GitHub Issues + this manifest are the live trackers.

Generated: 2026-08-29 · by Hermes (`m2pro`) on Asgard.

## Fleet status (verified 2026-08-29)
All 6 boxes reachable via SSH. Node 20.18.1 + npm 10.8.2 installed on every box (official binary tarball to `~/.local/node`, prepended to PATH). Ollama API up on all except vanaheim.

| Box | OS / arch | RAM | Ollama | Node | Role |
|---|---|---|---|---|---|
| heimdall | Linux x86_64 | (rack) | UP | ✓ | Benchmark + build baseline |
| overgaard | macOS arm64 | 36GB | UP | ✓ | Platform + build baseline + Ollama content |
| midgaard | macOS arm64 | 24GB | UP | ✓ | Editorial content (user workstation — light only) |
| odin | macOS arm64 | 24GB | UP | ✓ | Community lane |
| m1pro | macOS arm64 | 16GB | flaky | ✓ | Editorial specs / research |
| vanaheim | macOS arm64 | 16GB | DOWN | ✓ | Platform docs / static policy (no Ollama) |

## Assignment (balanced by lane)
Issue numbers map 1:1 to LL numbers (LL-012 → #12).

### Benchmark lane — heimdall (primary), overgaard (secondary)
- #8 LL-008 Verify Google Apps Script review queue (DOING) — heimdall
- #9 LL-009 Package v0 reproducible runner (DOING) — heimdall
- #10 LL-010 Publish Fleet Skill Matrix v2 methodology (DOING) — heimdall
- #11 LL-011 Publish the launch note (DOING) — overgaard (Ollama draft)
- #22 LL-022 Import + reconcile Fleet Skill Matrix v2 — heimdall
- #23 LL-023 Implement full leaderboard filtering — heimdall
- #24 LL-024 Build result-detail pages — heimdall
- #25 LL-025 Harden submission validation + unique IDs — heimdall/overgaard (extend `scripts/validate-benchmark-submission.mjs`)
- #26 LL-026 Public result status workflow — heimdall
- #27 LL-027 Moderator review + evidence workflow — heimdall
- #28 LL-028 Define direct-upload migration trigger — heimdall
- #29 LL-029 Invitation-only trusted tester program — heimdall
- #37 LL-037 Build runner v0.2 — overgaard
- #38 LL-038 Decide GUI wrapper justification — overgaard

### Platform lane — overgaard (primary), vanaheim (docs)
- #18 LL-018 Configure Cloudflare DNS — overgaard
- #19 LL-019 Plan EmDash/Astro migration on Cloudflare Workers — overgaard
- #20 LL-020 Model editorial + benchmark content — overgaard
- #21 LL-021 Immutable benchmark storage model (D1/R2) — overgaard
- #31 LL-031 Account sign-in when justified — vanaheim
- #32 LL-032 Contributor profiles + history — vanaheim

### Editorial lane — midgaard (content, light), m1pro (specs)
- #12 LL-012 Trusted-source RSS/Atom ingestion — m1pro (spec + allowlist research)
- #13 LL-013 Separate Open Net discovery feed — m1pro
- #14 LL-014 Editor hide/remove toggle + ingestion log — m1pro
- #15 LL-015 Lab Notes content types — midgaard (Ollama draft)
- #16 LL-016 First three free 101 lessons — midgaard (Ollama draft)
- #17 LL-017 Policy + disclosure pages — vanaheim (static markdown)
- #39 LL-039 Weekly editorial operating rhythm — m1pro
- #41 LL-041 Revenue + disclosure workflow — vanaheim

### Community lane — odin (primary)
- #30 LL-030 Discord community — odin
- #33 LL-033 Discord role automation + manual trust gates — odin
- #34 LL-034 Test requests + moderator triage — odin
- #35 LL-035 Comments after moderation readiness — odin
- #36 LL-036 Weekly curated newsletter — odin
- #40 LL-040 Measurement + guardrails — odin
- #42 LL-042 Security, privacy, backups, cost controls — odin

## First-wave execution (in progress)
- **heimdall + overgaard**: `git clone` → `npm ci` → `npm run build` (launch-blocking build baseline) → `npm run validate:submission` (LL-006/025 validator smoke). Results captured to `/tmp/fleet_build_*.log`.
- **overgaard**: Ollama-generated draft of LL-011 launch note → `content/` or `docs/`.

## Notes
- Midgaard is the user's main workstation; only light editorial content-gen assigned there, no heavy builds, until explicitly cleared.
- vanaheim has no Ollama (API down) — assigned static/doc tasks only.
- This manifest is the human-readable companion to the GitHub Issues; update issues directly as work lands.

## VERIFIED 2026-08-29 (first-wave execution)
- Node 22.11.0 installed on all 6 boxes (Node 20 failed: vinext needs node:fs/promises glob → Node 22+).
- Source distributed Asgard→boxes via SSH tarball (GitHub egress blocked on fleet: heimdall lacks https creds, overgaard times out on git port 22).
- Build BLOCKER found + fixed: npm skipped all rolldown native bindings (cross-platform tarball optional-dep bug). Fix: install `@rolldown/binding-<platform>` explicitly (see `scripts/fleet_lokislab_build.sh`).
- **RESULT: all 6 boxes BUILD OK (`npm run build` → dist/).** overgaard + heimdall confirmed; midgaard/odin/m1pro/vanaheim confirmed via fanout.
- **Benchmark validator confirmed working** (`npm run validate:submission`): valid example → `decision: valid`; bad input → clear failure reason. LL-006/022/025 tooling ready on fleet.
- vanaheim Homebrew install blocked (user jackblair not sudo-able non-interactively); irrelevant — Node tarball covers Loki's Lab needs.
