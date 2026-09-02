# Loki's Lab agent handoff

## What this repo is

The **Loki's Lab** website (https://lokislab.org) — a reproducible-agent-benchmark
site. Its primary value is the **live test data**: the homepage Agent Leaderboard
(top 5) and the `/test/results` table are both rendered from a single canonical
feed, `data/skill-matrix.json`, committed to this repo and rebuilt by Vercel.

## Single source of truth (SSoT)

- **Code + data:** this GitHub repo (`main`). `data/skill-matrix.json` is the
  canonical feed; it is GENERATED, not hand-edited.
- **GitHub:** `https://github.com/jackcanon/lokislab.git` (Production branch `main`).
- **NAS checkout (read-only mirror only):** `/Volumes/HJMPool1/AI Workspace/Obsidian
  Projects/Websites/HJM Websites/lokislab/`. It is an ARCHIVE mirror pulled from
  GitHub by a staggered launchd cron — it NEVER commits or pushes. Do not run
  services or writes from the NAS.
- **Asgard working clone (publisher):** `~/lokislab-publish` on Asgard. The publisher
  regenerates the feed and pushes to GitHub from here.

## Deploy target: Vercel (NOT Cloudflare Workers / Vinext / OpenAI Sites)

ADR-002 was superseded: the site deploys to **Vercel** via the Next.js App Router
(`next build`). Cloudflare Workers / Vinext / OpenAI Sites hosting were removed.
`lokislab.org` DNS is detached from Cloudflare and served by Vercel. Pushing to
`main` triggers a Vercel production build automatically.

## How the test data gets to the site (Option A — Asgard-owned)

1. Evals run on each box (`fleet_eval/skill-matrix-authoritative/run_matrix.py`).
2. Asgard consolidates results from all boxes into
   `~/fleet_eval/skill-matrix-consolidated/results/`.
3. `scripts/publish/generate_skill_matrix.py` reads the consolidated results and
   writes `data/skill-matrix.json` (summary + runs + top5).
4. `scripts/publish/publish_skill_matrix.sh` (run on **Asgard**) commits the feed
   and **pushes to GitHub** → Vercel rebuilds → homepage top-5 + `/test/results`
   update. Midgard is NOT a git intermediary.
5. The NAS mirror pulls the new commit (staggered, read-only).

To publish after a local eval run:
```sh
bash ~/fleet_eval/skill-matrix-authoritative/run_asgard_pipeline.sh   # run + patch + publish
# or just regenerate+push the feed:
bash ~/lokislab-publish/scripts/publish/publish_skill_matrix.sh
```

## Local checks (from any checkout with `node_modules`)
```sh
npm run lint
npm run build          # next build
```

## The feed contract (don't silently drop data)
- `data/skill-matrix.json` shape: `{ meta, summary[], runs[], top5[] }`.
- `runs[].status` must be `"complete"`; partial runs are filtered.
- All run metrics are privacy-stripped (no emails, private IPs, or local paths) —
  only auditable per-run metrics (test_id/category/capable/skipped/quality/
  accuracy/speed_seconds/auto_scored/tested_at).
- `top5` is ranked by avg quality (desc), then capable/total (desc).

## Architecture notes
- `lib/skillMatrix.ts` imports `data/skill-matrix.json` (canonical).
- `app/test/results/page.tsx` renders the full table (summary + raw toggle).
- `components/skillMatrixLeaderboard.tsx` renders the homepage top-5 from `top5`.
- `lib/leaderboard.ts` (legacy hardcoded baselines) is no longer used by the UI;
  do not extend it.

Do **not** rewrite historical Fleet Skill Matrix v2 results when adding new suites —
new runs simply append to `results/` and regenerate the feed.
