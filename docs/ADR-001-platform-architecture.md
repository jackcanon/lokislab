# ADR-001: Loki’s Lab platform architecture

- Status: Accepted for phased delivery
- Date: 2026-08-28
- Owners: Loki’s Lab editorial and engineering
- Decision scope: public website, publishing, news aggregation, benchmark data, submissions, identity, and community integration

## Context

Loki’s Lab is an independent publication and testing community for local AI and autonomous agents. Its public experience combines a news publication, a versioned benchmark knowledge base, free educational material, community result submissions, and eventually account-based contributor features.

The project is operated initially by one person for roughly 5–10 hours per week. The infrastructure target is no more than $150 annually, preferably paid up front. The first recognizable site is needed by the morning after this decision. The domain `lokislab.org` is registered through Vercel. Existing Fleet Eval work provides the initial benchmark methodology and result data.

## Decision

We will use a phased architecture.

### Phase 0: launch shell

The barebones launch is a static-first Sites/Vinext application. It provides the branded homepage, trusted-source links, a read-only leaderboard populated with real Fleet Eval results, methodology, and clearly labeled previews for submissions, education, and discovery.

This launch shell is an intentional schedule decision, not the final editorial system. It introduces no database, login, automated ingestion, or paid dependency.

### Target platform

- Vercel remains the domain registrar.
- Cloudflare becomes the authoritative DNS and delivery layer after nameservers are changed.
- EmDash CMS is the target editorial interface, with Astro as the content-oriented site layer.
- Cloudflare Workers hosts application logic.
- Cloudflare D1 stores normalized benchmark, submission, moderation, account-linking, and feed metadata.
- Cloudflare R2 stores privacy-reviewed raw JSON and other larger public artifacts.
- The benchmark runner remains a separate permissively licensed repository and produces a versioned standard JSON envelope.
- Trusted news is ingested from an editorial allowlist of RSS/Atom and official project feeds. Open-net discovery is processed separately and always displayed as a different stream.
- A Google Form is the first public submission doorway. It collects verified email and a JSON file or payload, then feeds a private review queue. Direct site uploads replace it only when justified by volume.
- A bound Google Apps Script web app exposes a sanitized, read-only leaderboard projection from that private queue. Publication requires an explicit `Leaderboard Ready` approval plus status, schema, privacy, and evidence gates; the website repeats the public-status allowlist.
- Discord is the community venue, not the system of record. The website remains authoritative for results, status, audit history, methodology, and editorial content.

## Data flow

1. A tester runs a versioned Loki’s Lab runner against a declared model and fixed Hermes harness profile.
2. The runner performs dependency preflight, explains proposed installations, requests permission, and executes each applicable test three times.
3. It removes or warns about private data and emits a standard JSON result with a unique submission ID.
4. The tester submits the JSON with a verified email address.
5. Automated schema validation either rejects the payload or places it in review.
6. Valid results publish as `unverified`, `under review`, or `verified`. Trusted tester results may auto-verify, while trusted status itself is invitation-only and manual.
7. Raw privacy-safe JSON and later status changes remain visible and downloadable as a public audit trail.

## Benchmark invariants

- Compare only like suite versions.
- Never mutate historical suite definitions or results in place.
- Use a fixed, versioned Hermes profile for comparable entries.
- Treat publisher-recommended model settings as the primary configuration.
- Publish Loki-tuned configurations as separate labeled entries.
- Run each task three times and use the median as the official result; retain best, worst, and failures.
- Mark platform-inapplicable tasks `N/A` and exclude them from score denominators.
- Display normalized score and coverage count together.
- Allow filtering by every meaningful leaderboard column, including suite, OS, hardware, GPU, model/version, configuration, verification status, and budget tier.

Initial budget tiers are entry at $1,500 or less, midrange from $1,501–$3,000, and high-end at $3,001 or more. Tiers are approximate configuration bands; the product will use current affiliate links rather than maintain a precise historical price database.

## Options considered

### Next.js on Vercel

Strong application framework and familiar workflow, but a full dynamic implementation could push the project toward several managed services before usage proves their value. Retained as a viable future option for highly interactive application surfaces, not selected as the target publishing core.

### WordPress in Docker on Heimdall

Low software cost and mature publishing tools, but introduces home-server uptime, patching, backups, security, and public ingress responsibilities for a solo operator. Rejected for the public production site; it can still be used privately for experiments.

### EmDash/Astro on Cloudflare

Best alignment with editorial workflows, static-first delivery, and a low recurring-cost target. It also leaves room for Workers, D1, and R2 as community features grow. Selected as the target platform.

## Security, privacy, and moderation

- Test data must be synthetic, public, or explicitly approved for disclosure.
- The runner and submission flow warn against secrets and personal data.
- Server-side validation treats all uploaded JSON as untrusted input.
- Raw files are size-limited, content-type checked, scanned where practical, and never executed.
- Emails remain private and are used for verification and evidence requests.
- Public profiles use an optional contributor name, never the submitter’s email.
- Flags do not silently remove evidence. A flagged entry displays `under review`; moderation decisions create timestamped public history.
- Sponsorship is disclosed at the segment or equipment level and cannot alter scoring, placement, or conclusions.

## Consequences

The project can launch immediately without recurring application cost, but some launch CTAs are intentionally inactive until external destinations exist. The target architecture avoids premature account and database work, while requiring a later content migration from the launch shell into EmDash/Astro. Data contracts must be defined before D1 ingestion so the migration does not corrupt benchmark comparability.

## Migration triggers

Begin the target-platform migration when the public brand and information architecture are approved and before more than approximately 20 original articles or 100 benchmark submissions exist. Introduce direct uploads only when Google Forms creates material review friction. Introduce paid infrastructure only after free-tier limits are measured, documented, and approved against the annual budget.

## Open implementation inputs

- Final Google Form URL and destination Sheet
- Discord invite URL
- Newsletter provider and signup URL
- Donation provider and URL
- Affiliate disclosure language and initial merchants
- Cloudflare nameserver change and EmDash project connection
