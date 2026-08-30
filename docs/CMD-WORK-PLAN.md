# Loki's Lab — Cmd Work Build Plan

This document is the agent-ready backlog for building and launching Loki's Lab. Create one Cmd Work item for each numbered task, preserving the ID in the title (for example, `LL-012 — Configure trusted-source RSS ingestion`). Do not create duplicates if an equivalent item already exists.

## Project context

- **Project:** Loki's Lab
- **Public site:** https://lokislab.org
- **GitHub source of truth:** https://github.com/jackcanon/lokislab
- **Local checkout:** `/Volumes/10TB JBOD/Agents/Claude/Projects/Websites/lokislab/`
- **Current repository head:** `432d3d5 — Connect approved benchmark feed to leaderboard`
- **Primary audience:** hands-on homelab builders, developers, hardware enthusiasts, and tech enthusiasts evaluating local AI and autonomous agents.
- **Operating constraints:** one primary operator, roughly 5–10 hours/week, free-first, and a target website infrastructure budget of no more than $150/year.

## Instructions for Cmd Work agents

1. Use the existing Loki's Lab project only.
2. Create one work item per task below and keep the ID in the title.
3. Map `DONE` to Done, `DOING` to Doing, and `TODO` to To do.
4. Use High priority for launch blockers, data integrity, privacy, security, and publishing gates; Medium for core product work; Low for later enhancements.
5. Add the supplied acceptance criteria and links to each item's description.
6. Preserve the separation between trusted news, Open Net discovery, benchmark evidence, and editorial commentary.
7. Never let sponsorship change benchmark scores, ordering, or conclusions.

## Completed

### LL-001 — Barebones public launch shell [DONE]

The branded, responsive launch site is live at https://lokislab.org with trusted-source links, a read-only Agent Leaderboard, methodology copy, and clearly labeled placeholders.

**Acceptance:** production site loads on desktop and mobile; numerical leaderboard data matches the approved source; inactive destinations are not presented as active features.

### LL-002 — Commit ADR-001 platform architecture [DONE]

Source: `docs/ADR-001-platform-architecture.md`.

**Acceptance:** the ADR documents the phased launch shell, target EmDash/Astro + Cloudflare architecture, data flow, invariants, privacy rules, and migration triggers.

### LL-003 — Commit brand guide and project plan [DONE]

Sources: `docs/BRAND-GUIDE.md` and `docs/PROJECT-PLAN.md`.

**Acceptance:** brand voice, double-L mark direction, Viking/Norse-inspired visual rules, editorial tone, roadmap, budget, risks, and operating cadence are documented.

### LL-004 — Establish source of truth and agent handoff [DONE]

Code lives in GitHub at https://github.com/jackcanon/lokislab and in the canonical JBOD checkout. Public deployment is https://lokislab.org. Key folders are `app/`, `components/`, `lib/`, `scripts/`, `schemas/`, `examples/`, `tests/`, and `docs/`.

**Acceptance:** an agent can locate the JBOD checkout, clone the repository if needed, run the documented project commands, identify the current commit, and locate benchmark scripts, schemas, manifests, and plans.

Use the repository's `.nvmrc` (Node 24) before running checks; the package requires Node 22.13 or newer.

### LL-005 — Create Google Form and private benchmark review Sheet [DONE]

The Form and linked private Sheet are the first submission doorway. Form-owned columns must not be renamed or removed.

**Acceptance:** a contributor can submit verified email plus JSON; the response lands in the private review queue; email and internal notes remain private.

### LL-006 — Define and validate benchmark JSON v1 [DONE]

Sources: `schemas/benchmark-submission.v1.schema.json`, `examples/benchmark-submission.v1.example.json`, and `scripts/validate-benchmark-submission.mjs`.

**Acceptance:** valid fixtures pass; malformed, incomplete, duplicate, or privacy-blocked data receives a clear decision; legacy single-result Fleet data is marked under review.

### LL-007 — Connect approved benchmark feed to leaderboard [DONE]

The public leaderboard consumes only an approved, sanitized projection and compares like suite versions only.

**Acceptance:** only explicitly `Unverified` or `Verified` entries appear; private email, internal notes, and private evidence URLs never appear publicly.

## In progress

### LL-008 — Verify Google Apps Script review queue end to end [DOING]

Source: `scripts/google-apps-script/Code.gs` and its README.

**Acceptance:** a sample JSON submission is fetched, validated, privacy-checked, assigned a unique status, and exposed only through the read-only sanitized projection; the script cannot grant Verified or Leaderboard Ready.

### LL-009 — Package the v0 reproducible benchmark runner [DOING]

Support macOS, Linux, native Windows PowerShell, and WSL. Include dependency preflight, explanation and permission before installation, fixed Ollama-through-Hermes profile, publisher-recommended settings, three runs per applicable test, privacy warnings, and standard JSON output.

**Acceptance:** a non-agent user can follow the README, run the suite as an administrator, understand each dependency request, and reproduce a result without private data in the output. The runner must identify its suite manifest and refuse to claim a complete score when a task definition is missing.

### LL-010 — Publish Fleet Skill Matrix v2 methodology [DOING]

Document the 19 starting tests, task definitions, suite/version identifiers, median-of-three scoring, coverage, N/A handling, known limitations, hardware fields, model/version fields, and budget tiers: entry $1,500 or less, midrange $1,501–$3,000, high-end $3,001+. Import the exact v2 manifest from Fleet Eval and keep the proposed end-to-end tasks in `tests/agent-work-v1.yml` as a separate suite.

**Acceptance:** a reader can understand exactly what is compared and can reproduce or challenge a published score.

### LL-011 — Publish the launch note [DOING]

Explain Loki's Lab's purpose, local-agent focus, current benchmark status, free-first model, how to read the leaderboard, and how contributors can participate.

**Acceptance:** the note links to the methodology, submission instructions, GitHub runner, and current public site.

## Week 1 publishing loop

### LL-012 — Configure trusted-source RSS/Atom ingestion [TODO]

Create an editorial allowlist of primary AI, model, hardware, and tooling sources. Store provenance and preserve links to the source article.

**Acceptance:** trusted stories appear in a clearly labeled feed with source, date, title, and external link.

### LL-013 — Add separate Open Net discovery feed [TODO]

Keep open-web discovery visually and editorially separate from trusted sources. Treat automated discovery as leads, not original reporting.

**Acceptance:** users can filter trusted sources versus Open Net; every item shows its source and publication time.

### LL-014 — Add editor hide/remove toggle and ingestion log [TODO]

Allow the editor to remove an irrelevant or unsafe story without erasing provenance from the private log.

**Acceptance:** hide actions are reversible internally, timestamped, and do not alter original source attribution.

### LL-015 — Create Lab Notes content types [TODO]

Support reactions, field reports, reviews, tutorials, hardware notes, and test write-ups.

**Acceptance:** original commentary is clearly distinct from aggregated links and supports author, date, tags, and disclosure metadata.

### LL-016 — Publish the first three free Loki's Lab 101 lessons [TODO]

Start the permanently free learning path for installing, configuring, and using local models and autonomous agents.

**Acceptance:** each lesson has prerequisites, steps, expected output, troubleshooting, and links to relevant benchmark or tool pages.

### LL-017 — Publish policy and disclosure pages [TODO]

Publish privacy, terms, affiliate disclosure, sponsorship independence policy, correction policy, and benchmark disclaimer.

**Acceptance:** policies are linked from the site footer and explain that sponsors may provide hardware/VPS but cannot buy results.

## Platform migration

### LL-018 — Configure Cloudflare DNS [TODO]

Keep Vercel as registrar while moving authoritative DNS and delivery controls to Cloudflare.

**Acceptance:** DNS changes are documented, reversible, and do not interrupt `lokislab.org`.

### LL-019 — Plan EmDash/Astro migration on Cloudflare Workers [TODO]

Define the migration from the launch shell to the editorial platform without losing URLs, metadata, or leaderboard history.

**Acceptance:** migration plan names content models, redirects, deployment steps, rollback, and free-tier cost guardrails.

### LL-020 — Model editorial and benchmark content [TODO]

Model trusted news, Open Net items, Lab Notes, courses, benchmark suites, suite versions, configurations, disclosures, and corrections.

**Acceptance:** the model supports immutable suite versions and clear separation between aggregated links and original reporting.

### LL-021 — Create immutable benchmark storage model [TODO]

Use D1 for normalized suite/task/run/configuration/result/status records and R2 for privacy-reviewed raw JSON and larger public artifacts.

**Acceptance:** historical suites and results cannot be silently mutated; every published result has provenance and status history.

### LL-022 — Import and reconcile Fleet Skill Matrix v2 [TODO]

Import the current source JSON and reconcile generated scores, coverage, N/A tasks, and display values against the launch site.

**Acceptance:** reconciliation produces no unexplained numerical differences and preserves source identifiers.

### LL-023 — Implement full leaderboard filtering [TODO]

Filter by suite/version, OS, computer description, GPU, model name/version, configuration label, task/category, budget tier, score, speed, completion, and verification status.

**Acceptance:** filters operate within like-suite categories and show `N/A` rather than inventing values.

### LL-024 — Build result-detail pages [TODO]

Show three-run statistics, median/best/worst, failures, score coverage, raw privacy-safe JSON, reproducibility metadata, hardware/software, and review history.

**Acceptance:** a reader can audit a result without seeing email, private notes, secrets, or private evidence links.

## Submissions, trust, and moderation

### LL-025 — Harden submission validation and unique IDs [TODO]

Validate Form submissions against the canonical schema, match Form ID to JSON `submission_id`, reject collisions, and retain raw output only after privacy review.

**Acceptance:** malformed, unsafe, duplicate, or mismatched submissions fail closed with an actionable reviewer reason.

### LL-026 — Implement public result status workflow [TODO]

Support `unverified`, `under review`, `verified`, and `rejected`. Verified is always a manual decision; trusted contributors may receive a lighter evidence workflow but never automatic Verified status.

**Acceptance:** status and timestamped history are visible; private reviewer notes and contributor email are not.

### LL-027 — Build moderator review and evidence workflow [TODO]

Create review queues, evidence requests, appeals, correction handling, and removal procedures.

**Acceptance:** moderators can request proof without exposing contributor identity and every decision has a public transparency state.

### LL-028 — Define direct-upload migration trigger [TODO]

Measure when Google Forms creates material review friction and document the volume, cost, security, and moderation thresholds for direct site uploads.

**Acceptance:** no paid upload service is introduced without an explicit budget decision.

### LL-029 — Create invitation-only trusted tester program [TODO]

Define invitation, removal, evidence expectations, contributor status, and manual verification rules.

**Acceptance:** trusted status is auditable and never overrides suite/version, privacy, or evidence gates.

## Community and accounts

### LL-030 — Create Discord community [TODO]

Create the server and channels for discussion, test requests, contributor help, and announcements. Discord is the community venue; the website remains authoritative.

**Acceptance:** the website links to a permanent invite and no benchmark record exists only in Discord.

### LL-031 — Add account sign-in when justified [TODO]

Support passwordless email, GitHub, Google, and Discord sign-in only when volume justifies the added operational cost.

**Acceptance:** provider linking is secure, optional, documented, and remains within the annual budget.

### LL-032 — Add contributor profiles and history [TODO]

Provide optional public contributor names and contribution history without exposing submission email.

**Acceptance:** users can remain pseudonymous and can request correction or removal of profile data.

### LL-033 — Add Discord role automation with manual trust gates [TODO]

Automate only the low-risk Contributor role after verified email, valid JSON, and publication. Keep Verified and Trusted roles manual.

**Acceptance:** no automated role implies benchmark verification.

### LL-034 — Add test requests and moderator triage [TODO]

Let readers request processes, hardware, models, or workflows to test; add voting and moderator-designed official tests.

**Acceptance:** requests have status, rationale, and a path to a versioned suite change.

### LL-035 — Add comments after moderation readiness [TODO]

Document abuse controls, moderation capacity, reporting, rate limits, and removal/correction policies before enabling public comments.

**Acceptance:** comments cannot overwhelm the solo editorial workflow or bypass the site's transparency rules.

### LL-036 — Publish weekly curated newsletter [TODO]

Create a once-weekly email that points readers back to website-first reporting, benchmark updates, and 101 lessons.

**Acceptance:** signup, unsubscribe, privacy, and provider costs are documented.

## Later roadmap and operations

### LL-037 — Build runner v0.2 [TODO]

Add resume support, cryptographic artifact hashes, hardware normalization, signed releases, and separately labeled Loki-tuned configurations.

**Acceptance:** v0.2 remains reproducible and comparable only within its declared suite/version.

### LL-038 — Decide whether a GUI wrapper is justified [TODO]

Use command-line onboarding feedback and support volume to decide. Additional harnesses and custom benchmarks remain separate categories.

**Acceptance:** the decision includes maintenance cost, accessibility, security, and budget impact.

### LL-039 — Establish the weekly editorial operating rhythm [TODO]

Reserve time for trusted-feed review, one test/configuration, one article or lesson, submission moderation, newsletter/Discord summary, and maintenance.

**Acceptance:** automation may draft and collect, but a human approves sources, claims, result status, corrections, and publication.

### LL-040 — Add measurement and guardrails [TODO]

Track returning readers, result-detail views, valid submissions, evidence coverage, lesson engagement, newsletter clicks, and correction response time.

**Acceptance:** infrastructure spend, sponsor independence, privacy, moderation backlog, and automated-aggregation boundaries remain visible.

### LL-041 — Maintain revenue and disclosure workflow [TODO]

Support transparent donations, affiliate links, disclosed hardware/VPS sponsorships, consulting, limited advertising, and YouTube as a supporting channel.

**Acceptance:** education and core benchmark access remain free; disclosures appear at the relevant link, segment, equipment, or result.

### LL-042 — Maintain security, privacy, backups, and cost controls [TODO]

Keep uploaded JSON untrusted, never execute uploads, scan for private data, protect emails, back up content and data, and alert before free-tier limits are exceeded.

**Acceptance:** incidents have a documented response, no private data is published, and no new paid dependency is added without owner approval.

### LL-043 — Commit canonical benchmark manifests [DOING]

Import the exact Fleet Skill Matrix v2 task catalog from Fleet Eval, including prompts, fixtures, validators, rubrics, applicability rules, and changelog. Review the proposed [`tests/agent-work-v1.yml`](../tests/agent-work-v1.yml) additions separately.

**Acceptance:** every published suite has an inspectable manifest and no score can be reproduced from undocumented prompts or hidden fixtures.

### LL-044 — Add agent-work v1 fixtures and validators [TODO]

Implement the repository, structured-data, grounded-research, recovery, verification, safety, offline, and homelab tasks listed in the proposed manifest.

**Acceptance:** each task runs in a sandbox, has a deterministic validator or published rubric, records expected artifacts, and is clearly separated from Fleet Skill Matrix v2.

### LL-045 — Add benchmark telemetry without changing quality scores [TODO]

Capture first-action latency, total wall time, tool-call outcomes, token counts, and memory/accelerator usage when available.

**Acceptance:** performance fields are optional, privacy-safe, and displayed separately from capability and quality scores.

### LL-046 — Run the first Gemma article story battery [TODO]

Run [`docs/GEMMA-STORY-BATTERY.md`](GEMMA-STORY-BATTERY.md) for the E4B and 12B Q4_0 QAT checkpoints through the same Ollama/Hermes profile. Capture screenshots, artifacts, validators, run medians, and limitations for the first curated Lab Note.

**Acceptance:** the article includes reproducible configuration details, side-by-side evidence, separate capability/trust/efficiency results, and a clear distinction between Google-reported claims and Loki’s Lab measurements.

## Recommended agent lanes

- **Editorial agent:** LL-012–LL-017, LL-039, LL-041.
- **Benchmark agent:** LL-008–LL-011, LL-022–LL-029, LL-037–LL-038, LL-043–LL-046.
- **Platform/data agent:** LL-018–LL-024, LL-031–LL-032.
- **Community/operations agent:** LL-030, LL-033–LL-036, LL-040–LL-042.

The owner retains final authority over publishing, benchmark status, corrections, sponsorship disclosures, privacy decisions, and any paid infrastructure.
