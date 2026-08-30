# Deploying Loki's Lab

Single deploy target: **Cloudflare Workers** via Vinext/RSC. This replaces the
old ChatGPT/OpenAI Sites workflow (see `docs/ADR-002-deployment-reconciliation.md`).

> Safety rule (owner, 2026-08-30): never push to production without a preview.
> Deploy to a **preview worker** first, review, then promote to `lokislab`.

## Prerequisites

- Node 24: `nvm use 24` (repo pins it via `.nvmrc`).
- `node_modules` present: `npm install` (the UNAS checkout ships without it).
- Cloudflare auth: `CF_API_TOKEN` exported, **or** `npx wrangler login`.
  The token needs `Workers Scripts:Edit`, `Workers R2:Edit`, `Account:Read`.
- `dist/server/wrangler.json` is produced by `npm run build` (do not hand-edit).

## 1. Build

```sh
nvm use 24
npm install
npm run lint            # oxlint
npm run test:leaderboard
npm run build           # vinext build -> dist/  (also writes dist/server/wrangler.json)
```

If `npm install` fails on the NAS (no network / slow SMB), run it on a local
clone instead: `git clone git@github.com:jackcanon/lokislab.git && cd lokislab`.

## 2. Preview (isolated, does NOT touch production)

Deploy to a throwaway worker name so you get a real `*.workers.dev` URL:

```sh
npx wrangler deploy --config dist/server/wrangler.json --name lokislab-preview
# -> https://lokislab-preview.<subdomain>.workers.dev
```

Open that URL, click through `/`, `/test`, and confirm the leaderboard renders.
When happy, delete the preview worker:

```sh
npx wrangler delete --name lokislab-preview
```

(Local-only alternative if you cannot reach the worker URL: `npm run start`
runs `wrangler dev` from `dist/server/wrangler.json` at http://localhost:8787.)

## 3. Promote to production

Only after preview approval:

```sh
npx wrangler deploy --config dist/server/wrangler.json
# deploys the worker named "lokislab" (from dist/server/wrangler.json)
```

Cloudflare DNS already points `lokislab.org` at the Worker. No nameserver change
needed. Retire the old OpenAI Sites version afterward.

## 4. Leaderboard feed on Cloudflare R2 (replaces raw GitHub JSON)

The site reads `LOKISLAB_LEADERBOARD_FEED_URL` (server-side, `cache: 'no-store'`).
We host that file in R2 so approved updates appear without a redeploy.

### One-time provisioning

```sh
npx wrangler r2 bucket create lokislab-public
# create a public dev URL or bind a route; simplest: allow public access on the bucket
npx wrangler r2 public-bucket lokislab-public --binding LOKISLAB_FEED
```

Set the production env var (via `wrangler` secret/env, not committed):

```sh
npx wrangler secret put LOKISLAB_LEADERBOARD_FEED_URL --name lokislab
# value: https://<account>.r2.cloudflarestorage.com/lokislab-public/leaderboard-feed.json
#        (or the public-bucket URL Cloudflare returns)
```

### Publishing an update

Generate `public/leaderboard-feed.json` from **approved, privacy-safe** entries
only (run `npm run validate:submission` on each). Then:

```sh
npx wrangler r2 object put lokislab-public/leaderboard-feed.json \
  --file public/leaderboard-feed.json --content-type application/json
```

Interim (before R2 is provisioned): keep `LOKISLAB_LEADERBOARD_FEED_URL` pointing
at the raw GitHub URL
`https://raw.githubusercontent.com/jackcanon/lokislab/main/public/leaderboard-feed.json`
and redeploy once after editing that file. Documented cutover, not silent.

## 5. Submission doorway (sub-out, unchanged)

Public submissions go through the Google Form
(`app/page.tsx` → `submissionUrl`). The Form's Apps Script projects a sanitized,
read-only leaderboard from the private review Sheet. We do **not** rebuild that;
it is an external dependency we accept per ADR-001.

## Troubleshooting

- `wrangler: command not found` → `npm install` first; it is a devDependency.
- `Missing CF_API_TOKEN` → export it or `npx wrangler login`.
- Build errors about `vinext` → confirm `nvm use 24` (Vinext needs Node 22.13+).
- Site serves old HTML → `wrangler deploy` again; the Worker is immutable per
  deploy, so a new deploy is required for any change to take effect.
