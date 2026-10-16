# Craigslist — Radar lifecycle matrix

Assessment date: October 16, 2026. This is the project-local Craigslist audit, inspired by Craig MacDev’s [The Vibe-Code Illusion](https://craigmacdev.github.io/vibecode-illusion/). It is not affiliated with the classified-advertising website. Illustrative article percentages are not estimates for this project.

Scope: owner-approved addition of sequico/server-noonien and the AxiomCode team/AxiomCode Graph to the existing public Radar. No external tool installation, account creation, protected sharing, or independent tool-performance validation is included. Jack owns release authority and operational decisions; Codex performs the scoped implementation and checks. The current request authorizes publication of these additions through the established main-branch deployment.

Evidence applies to the candidate data fingerprints below and the application changes in the commit containing this matrix. Full original profile content, generated benchmarks, articles, browser-private notes, and the unrelated package-manager edit are preserved. Post-push production evidence is recorded in the source-linked Library note for this publication; a successful push alone does not close that gate.

| Area | Applicability and measurable acceptance | Owner | Actual evidence and status | Remaining gate |
| --- | --- | --- | --- | --- |
| Users, roles, workspaces, sharing | Public creator and project reading; no new accounts or server-shared private notes | Jack | **verified** — additive catalog entries and optional organization metadata; existing browser-only note code retained | Shared account or collaboration changes require separate design and review |
| Integrations, authorization, retries, duplicates | Exact new repositories monitored; approved discoveries stay out of pending queue; no social follow actions | Jack | **verified** — seven scanner tests including promotion/reappearance regression; both repository baselines present; project boundary check passes | External tool functionality is publisher-attributed; new identity or service credentials are outside scope |
| Operations, backups, rollback, costs | Git retains pre-change content; revert this publication to recover prior catalog/code; existing production pipeline and owner remain | Jack | **partial** — tracked baseline and scoped changed-file review; no hosting or paid service change | Rollback deployment not exercised for this candidate; owner handles host and provider incidents |
| Platforms, mobile, offline | Existing browser-based public site; new routes load without adding platform assumptions | Jack | **partial** — exact locked Next.js 15.5.25 build passes; desktop creator/project pages render with logos and links | Narrow-viewport and offline acceptance not run for this candidate; no claim of full device coverage |
| Support, onboarding, documentation | Creator stories, usage descriptions, source links, licensing and known limits agree with shipped data | Jack | **verified** — four paragraphs per new creator, three per new project; current source/license review and README updates | Upstream changes need later review; source links do not confer support obligations on publishers |
| Performance, bounded resources, recovery | Static pages; 20 creators/projects; feed bounded to 100 signals and 40 candidates | Jack | **verified** — build and bounded/unique data checks; no new live browser model calls or services | Sustained host/network reliability is an existing operational dependency, not retested here |
| Security, access, dependencies, secrets | Public attributed text and images only; no new packages, credentials or authentication code | Jack | **verified** — normal React text rendering and existing public-link validation; unchanged source lockfile; no fetched project code executed | Existing dependency/lint debt and third-party availability remain; no broad security assessment claimed |
| Data integrity, migrations, recovery | Existing entries retained; unique IDs and links; alphabetical display; no private-store migration | Jack | **verified** — catalog integrity comparisons and scanner regression tests; additive optional fields; explicit approved-discovery URLs | Scanner write interruption and full backup restore not exercised in this change |
| Tests, reproducible builds, delivery | Scanner tests and project boundaries pass; exact locked build completes; compare lint against baseline | Jack | **verified** — seven scanner tests, project boundary check, production build; 50 pre-existing lint errors with no new errors | Exact production commit must reach READY and public content must match before reporting live |
| Observability, monitoring, privacy | Scan timestamp and source failures retained; actionable failures recorded without exposing credentials | Jack | **verified** — 20-profile scan completed; unavailable Reddit source recorded; no public operational panel reintroduced | Scheduled scans still depend on host availability; no new long-running scheduler test |
| Interface and accessibility | Equal alphabetical cards, team label, navigable source/project links, readable story paragraphs, image fallback retained | Jack | **partial** — desktop project pages and loaded logos inspected; search found sequico; Enter opened its dialog with four story paragraphs and semantic source controls | Full screen-reader and narrow-viewport acceptance not run for this candidate |
| Privacy, consent, retention, licensing | Public sources only; preserve handles and team attribution; no inferred personal identity or private-lead publication | Jack | **verified** — GitHub and creator-authored sources, linked image provenance; current project license distinctions; private notes unchanged | New video embeds, collected user data, or third-party tool deployment would need their own review |

## Identity assessment

The existing [Happy Jack sign-in policy](</Volumes/10TB JBOD/Agents/business-hub/identity/SSO-POLICY.md>) and assessment register classify Loki’s Lab among public websites with protected administration to assess separately. Radar remains a public reading surface; its private notes remain local to the browser. These additions introduce no new human sign-in or independent password system. Machine credentials used by monitoring remain separate from human sign-in. This is an assessment of this change, not a claim that the site’s publishing administration is federated.

## Candidate data fingerprints

These Secure Hash Algorithm 256-bit (SHA-256) digests identify the reviewed editorial candidate. Monitoring data has its own recorded scan timestamp.

- `catalog.json`: `419966512a802ee70b108850abae9502c89e5eaf2849c68d4bbcd7758ce348a1`
- `projects.json`: `9decdb38d00b3a35d4696c0ae3968339033dca8534d5e88cbef5322fc53582be`
- `profiles.json`: `16d8029fc46e2a917fe5353749e71432dd41a0e028bb5852c70211c4825c5ab9`
- `visuals.json`: `8a0cb730422ed9b947133e16a2107598f0b798273590038a8a04259a90da217b`

## Scoped acceptance evidence

- Seven Python scanner regression tests passed, including approved discoveries remaining out of the queue.
- Project activity boundary checks passed; both new project spaces point to their exact repositories.
- Locked Next.js 15.5.25 production build passed; lint matches the existing 50-error baseline with no new errors.
- Four new routes returned every authored paragraph through content negotiation for Markdown; the sitemap contains all four routes and the AxiomCode profile identifies an Organization in structured data.
- Desktop browser review covered AxiomCode’s team story, both project pages, loaded project logos, creator search, and keyboard activation of the sequico dialog. No screen-reader or mobile acceptance is claimed.
