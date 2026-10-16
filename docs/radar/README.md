# Loki’s Lab Radar

The public page is `/radar`. Main navigation and the homepage link to it.
The catalog, source links and caveats were migrated from the first private
Radar prototype. Personal bookmarks and notes use browser storage, not a shared
database. Export on the prototype and import on the main site to move them.

## Monitoring and discovery

`python3 scripts/radar/scan.py` uses only the Python standard library. It reads
the public catalog and source configuration, then updates `data/radar/feed.json`
and `data/radar/scan-state.json`. GitHub credentials come from the existing
authenticated GitHub command-line tool or its standard token environment
variables. Credentials never enter the public data.

- Catalog: each linked GitHub owner’s latest 30 non-fork public repositories,
  plus repositories explicitly linked from projects and evidence. Recent activity
  (14 days) and recent releases are surfaced. First scan is labeled baseline.
  Later head changes link to the exact previous/current commit comparison.
- Creator feeds: Simon Willison, Sebastian Raschka, Ethan Mollick and Sam Rose.
- Configured public websites (CLOUDflex Broadcast, Stadium Sound and Craig MacFarlane’s company biography): text changes, excluding scripts and styles.
  This flags a page edit for inspection; it does not infer a new release.
- Discovery: recent GitHub repositories tagged artificial intelligence with at
  least three stars, keyword-matched Hacker News creator submissions, and creator
  project posts from Reddit’s LocalLLaMA and LocalLLM communities.
- New leads retain handles, source links, source dates and first-observed dates.
  They are not automatically endorsed, given inferred real identities or added
  to the catalog. Candidate lists are bounded to 40; updates to 100.
- Source failures appear publicly in scan coverage. Reddit access can be limited.
  LinkedIn, Office Hours video and private accounts are not automatically scanned.
  Client-rendered product content may not be available to the text check.

The daily Codex heartbeat scans at 8:00 a.m. America/Phoenix. It runs on Jack’s
connected desktop host; it needs the host, workspace and GitHub connection to be
available. It commits only Radar data to `main`; the existing Vercel connection
rebuilds production. It does not publish articles or edit generated benchmarks.
Notifications are reserved for meaningful changes, scan/deployment failures or
needed user action. Discovery review never authorizes outreach.

## Maintenance

Add reviewed people to `data/radar/catalog.json`; include source evidence and
capability caveats. Add creator feeds in `sources.json`. All catalog people are
scanned, regardless of personal browser bookmarks. Imported personal leads are
not shared monitoring configuration.

Before deployment: `npm run lint`, `npm run build`, and
`python3 -m unittest discover -s scripts/radar -p 'test_*.py'`.
Scanner regressions cover repeat deduplication, exact comparison links,
releases with unchanged push timestamps, retry after a failed request, and
ignoring script/whitespace noise in product page changes.
Rollback: revert the integration commit. Pause the heartbeat separately to stop
scanning; reverting code alone does not change its schedule.

Projects use `data/radar/projects.json`, with exact repository and website matching rather than creator-wide activity. Explicit project repositories are included in scheduled scans. People and creator filters are alphabetical with equal styling. LinkedIn remains a reading link. Verify boundaries with `node tests/radar/project-activity.mjs`.

## Profile stories

`data/radar/profiles.json` holds the reviewed background, tool explanations, practical uses, and follow rationale for every catalog person. Stories appear on permanent person pages and in the Radar profile dialog. The public Markdown representation includes the same paragraphs, source links, and video links for crawlers. Videos use verified publisher links; channel links are explicitly distinguished from individual videos. Update the checked date when rechecking a source. Scheduled scans do not rewrite this editorial file. Preserve public handles and avoid inferring personal identities or capabilities from repository activity.

Approved discoveries are recorded in `catalog.json` under `approved_discovery_urls` so their discussion links do not return to the pending queue. Direct links to already-curated projects are also removed from discovery results. Creator entries may identify an `Organization`; public pages use the matching structured-data type and label teams explicitly. Optional project `description` paragraphs appear on permanent project pages and their public Markdown responses.

The scoped Craigslist lifecycle matrix is maintained in `docs/radar/CRAIGSLIST.md`. Preserve the distinction between a verified catalog publication and independent validation of the external tools being followed.
