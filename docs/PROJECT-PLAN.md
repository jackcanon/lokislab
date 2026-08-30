# Loki’s Lab project plan

## Outcome

Build Loki’s Lab into the trusted starting point for people choosing, running, and improving local AI agents: a publication, benchmark knowledge base, free learning library, and evidence-sharing community.

The initial operator budget is 5–10 hours per week and no more than $150 per year in website infrastructure. Content and operations may be AI-assisted, but benchmark interpretation, editorial judgment, sponsorship disclosure, trust decisions, and final publication remain human-controlled.

## Repository location

The canonical working checkout is `/Volumes/10TB JBOD/Agents/Claude/Projects/Websites/lokislab/`. The GitHub remote is `https://github.com/jackcanon/lokislab.git`; see [`WORKSPACE.md`](WORKSPACE.md) for agent handoff and verification commands.

## Release 0: barebones launch

Target: morning of August 29, 2026.

### Included

- Branded, responsive public homepage
- Trusted-source news links
- Read-only Agent Leaderboard using the current verified Fleet Skill Matrix v2 results
- Score/speed sorting and explicit coverage
- Plain-language methodology and independence statement
- Community submission explanation
- Free 101 course previews
- Open Net and Lab Notes placeholders
- Placeholders for Discord, newsletter, donations, and submission form until real URLs are supplied
- ADR, brand guide, and project plan in the project repository

### Definition of done

- Production build passes
- Home page loads without console-breaking errors
- All published numerical results match the current source JSON
- External news links resolve to the cited primary source
- No future feature is represented as active
- Mobile and desktop layouts remain readable
- Preview is available for owner review

## First 48 hours

1. Review and approve the visual direction, naming, and launch copy.
2. ~~Create the Google Form and linked private Sheet for verified-email + JSON submissions.~~ Completed August 29, 2026.
3. Create Discord server and permanent invite.
4. Choose newsletter and donation providers within the annual budget.
5. Replace placeholder controls with real destinations.
6. Publish a short launch note explaining the current benchmark and what comes next.
7. Connect `lokislab.org` after the preview is approved.

## Week 1: credible publishing loop

- Configure the trusted-source allowlist and RSS/Atom ingestion.
- Add an editor-controlled hide toggle and keep a private ingestion log.
- Create Lab Notes content types for reactions, field reports, reviews, and tutorials.
- Publish the full v2 methodology, test list, scoring formula, and known limitations.
- Commit the exact Fleet Skill Matrix v2 manifest, then review the proposed [`agent-work-v1`](../tests/agent-work-v1.yml) tasks without changing historical v2 results.
- Run the first article-specific Gemma comparison using the reproducible [`Gemma story battery`](GEMMA-STORY-BATTERY.md) and publish screenshots plus data, not only narrative reaction.
- Publish privacy, terms, affiliate disclosure, sponsorship policy, correction policy, and benchmark disclaimer pages.
- Package the existing Fleet Eval process as the starting runner with a README and license.
- ~~Define the canonical submission JSON schema and validation fixtures.~~ Completed August 29, 2026; Google Apps Script installation remains.
- Draft the first three Loki’s Lab 101 lessons.

## Weeks 2–4: target platform and submissions

### Publishing platform

- Configure Cloudflare DNS while retaining Vercel as registrar.
- Stand up EmDash/Astro on Cloudflare Workers.
- Model trusted news, Open Net items, Lab Notes, courses, benchmark suites, configurations, and disclosures.
- Migrate the approved launch design and initial content.

### Benchmark data

- Create immutable tables for suite, suite version, task, run, configuration, result, artifact, and status event.
- Import current Fleet Skill Matrix v2 JSON and reconcile generated scores against the launch display.
- Implement filters for suite, OS, hardware/computer, GPU, model/version, configuration, task/category, budget tier, and verification status.
- Add result-detail pages with three-run statistics, failure notes, score coverage, raw JSON, and reproducibility metadata.

### Submission beta

- Validate Google Form submissions against the canonical schema.
- Assign a unique submission ID at runner time and reject collisions.
- Verify email before publication.
- Publish schema-valid results as `unverified` unless a trusted-tester rule applies.
- Give moderators a review queue with visible public status history.
- Define evidence requests and appeals without exposing contributor email.

## Months 2–3: accounts and community

- Add passwordless email, GitHub, Google, and Discord sign-in.
- Support secure provider linking into one account.
- Add optional contributor profiles and contribution history.
- Keep trusted-tester invitation and removal manual.
- Automate Discord Contributor role only after verified email, valid JSON, and completed publication.
- Keep Verified and Trusted Discord roles manual.
- Add reader test requests with voting and moderator triage.
- Publish the weekly curated newsletter from website-first content.
- Add comments only after moderation capacity and abuse controls are documented.

## Benchmark runner roadmap

### v0.1

- Python runner for macOS, Linux, native Windows PowerShell, and WSL
- Dependency preflight with an explanation and explicit permission before installation
- No assumption that test participants use an AI agent to operate the runner
- Synthetic or public fixture data only
- Fixed Hermes harness profile and Ollama model selection
- Publisher-recommended model configuration by default
- Three runs per applicable task
- Privacy scan/warnings and standard JSON output
- Separate model-quality, agent-work, safety, and system-performance tracks; do not combine unlike harnesses in one ranking.
- Permissive open-source license and commercial dataset reuse with attribution

### v0.2

- Resume interrupted runs
- Cryptographic artifact hashes
- Better hardware detection and normalization
- Optional Loki-tuned configurations as separately labeled entries
- Artifact hashes, tool-call outcomes, and optional resource telemetry
- Contributor-friendly packaging and signed releases

### Later

- GUI wrapper if command-line onboarding data demonstrates the need
- Additional harness profiles only as separate comparison categories
- Custom benchmarks by request; new official tests remain moderator-designed and versioned

## Editorial operating rhythm

### Weekly, 5–10 hours

- 90 minutes: review trusted feed, remove irrelevant stories, select weekly themes
- 2 hours: run or validate one test/configuration and publish notes
- 2 hours: edit one original article or 101 lesson
- 60 minutes: submission moderation and contributor replies
- 60 minutes: newsletter and Discord summary
- Remaining time: maintenance, sponsor/affiliate work, and backlog triage

Automation may collect and draft. The editor approves trusted sources, original claims, result status, corrections, and publication.

## Measurement

Primary measures:

- Weekly returning readers
- Leaderboard result-detail views
- Completed valid benchmark submissions
- Percentage of published results with downloadable evidence
- 101 lesson completion or meaningful engagement
- Newsletter click-through to website content
- Correction response time

Guardrails:

- Infrastructure spend stays within the approved annual budget
- No sponsor-driven result changes
- No private data in public artifacts
- Moderation backlog remains manageable for the available weekly hours
- Automated aggregation never appears as original reporting

## Revenue sequence

1. Donations and transparent affiliate links
2. Hardware/VPS sponsorship disclosed at the relevant test or segment
3. Consulting inquiries
4. Limited advertising only when it does not compromise readability or independence
5. YouTube as a supporting distribution channel

Education 101 and core benchmark access remain free. The product avoids paywalls for as long as the operating model permits.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Solo-operator overload | Narrow weekly cadence, automated drafts, explicit backlog, delay comments until moderation is ready |
| Benchmark drift | Immutable versioning; compare like suites only |
| Gaming submissions | Public raw evidence, verification tiers, three runs, hashes, review history |
| Private data exposure | Synthetic fixtures, runner warnings, validation, manual review, removal procedure |
| Copyright/feed issues | Link to sources, use minimal licensed excerpts, store provenance, honor feed terms |
| Sponsor influence | Up-front disclosure and hard separation between funding and scoring |
| Free-tier surprises | Usage alerts, measured migration triggers, no new paid service without budget review |
| Brand/IP confusion | Original double-L mark; historical public-domain sources; no Marvel trade dress in core branding |

## Immediate owner inputs

Only one input should be requested at a time during setup. The current sequence is:

1. Google Form URL
2. Discord invite URL
3. Newsletter signup URL
4. Donation URL
5. Approval to point `lokislab.org` at the public deployment
