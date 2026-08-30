# ADR-002: Deployment reconciliation and control boundary

- Status: Accepted (supersedes the mixed deploy model implied by the original
  phone-built setup)
- Date: 2026-08-30
- Owners: Loki's Lab engineering
- Supersedes: the implicit three-target deploy (Cloudflare Workers + OpenAI Sites
  + Vercel/Vinext assumptions) found in the initial `vite.config.ts`,
  `AGENTS.md`, and `docs/OPENAI-SITES-LEADERBOARD-FEED.md`.

## Context

ADR-001 named Cloudflare Workers as the application layer and OpenAI Sites was
later layered on as an alternate build/publish path. In practice the repository
accumulated **three conflicting deployment mental models**:

1. `vite.config.ts` imported **both** `@cloudflare/vite-plugin` **and**
   `@openai/sites-vite-plugin`, reading D1/R2 bindings from `.openai/hosting.json`.
2. `AGENTS.md` / `WORKSPACE.md` described a Vinext/`npm run build` flow pointing at
   a retired Midgard JBOD path (`/Volumes/10TB JBOD/Agents/...`).
3. `docs/OPENAI-SITES-LEADERBOARD-FEED.md` described publishing via ChatGPT Sites
   with the leaderboard fed from a raw GitHub JSON URL.

The live site (`lokislab.org`) is **edge-served by Cloudflare** (observed
`server: cloudflare`, Vinext/RSC HTML), but the *build source of truth* lived in
ChatGPT/OpenAI Sites — a manual, non-CI, no-push-to-deploy workflow. That mismatch
is the root cause of "unusual choices causing problems": deploys were unreproducible
and references were stale.

Owner directive (2026-08-30): *rebuild using the pieces we control, sub out the
pieces we don't control, and document the architecture well.*

## Decision

### 1. One deploy target: Cloudflare Workers via Vinext + wrangler

- Remove `@openai/sites-vite-plugin` and delete `.openai/hosting.json`.
- `vite.config.ts` keeps only `vinext()` + `@cloudflare/vite-plugin`.
- Production deploy is `npx wrangler deploy --config dist/server/wrangler.json`.
- ChatGPT/OpenAI Sites is no longer a deployment path.

### 2. Control boundary (what we own vs. sub out)

| Concern | Owner | Decision |
| --- | --- | --- |
| App code (Vinext/RSC, React 19) | **We control** | Keep, it is sound |
| Repo + checkout | **We control** | UNAS share = single source of truth |
| Build/deploy pipeline | **We control** | Cloudflare Workers via `wrangler` |
| Benchmark schema + validator | **We control** | Keep `schemas/*.json`, `scripts/validate-*.mjs` |
| Public runner (WSL2/Linux) | **We control** | `public/eval/lokislab-wsl2-eval.sh` |
| Leaderboard feed | **We control** | Move to **Cloudflare R2** (was raw GitHub JSON) |
| Submission doorway | **Sub out** | Google Form (ADR-001 sanctioned first doorway) |
| Read-only public feed | **Sub out** | Google Apps Script projection from the Form's Sheet |
| Community venue | **Sub out** | Discord (future; not system of record) |
| Editorial CMS | **Sub out** | EmDash/Astro (future; not yet adopted) |
| Domain registrar | **Sub out** | Vercel (keep as registrar only) |
| DNS + edge delivery | **Sub out (managed)** | Cloudflare (already authoritative) |

### 3. Leaderboard feed → Cloudflare R2

The raw GitHub JSON URL (`LOKISLAB_LEADERBOARD_FEED_URL`) required a manual site
redeploy to refresh and lived outside our controlled pipeline. It is replaced by a
R2-hosted `leaderboard-feed.json` updated by the moderation/approval step (see
DEPLOY.md). The `lib/leaderboard.ts` parser is unchanged — it still reads a JSON
feed by URL; only the *source* of that URL changes to an R2 public URL.

Until R2 is provisioned, the interim source is the GitHub raw URL; the cutover is
documented, not silent.

### 4. Submission doorway fix

`app/page.tsx` linked `...viewform?usp=publish-editor` (an internal editor param).
It now links the public Form URL with `?usp=sharing&ouid=...`. The Form remains the
first public submission doorway per ADR-001; direct uploads are deferred.

## Consequences

- Reproducible, CI-able deploys: `npm run build` → `wrangler deploy`.
- One mental model for agents; `AGENTS.md`/`WORKSPACE.md` point at the UNAS
  checkout and correct toolchain.
- Removal of OpenAI Sites loses no function: `.openai/hosting.json` had
  `d1: null, r2: null` (no bindings in use).
- R2 feed needs `CF_API_TOKEN` + a one-time bucket/KV provisioning (Phase B).
- EmDash and Discord remain future work; the site stays static-first.

## Migration steps (Phase A done here, Phase B needs CF_API_TOKEN)

**Phase A (no creds, this branch):**
- [x] Remove OpenAI Sites plugin + `.openai/`
- [x] Fix `submissionUrl`
- [x] Rewrite `AGENTS.md` / `WORKSPACE.md`
- [x] Write ADR-002 + DEPLOY.md
- [x] Add `/test` page + `public/eval/` script

**Phase B (needs `CF_API_TOKEN`, on a machine with `node_modules`):**
- [ ] `npm install` + `npm run build`
- [ ] `wrangler deploy` to a **preview** worker; owner reviews
- [ ] Provision R2 bucket + KV; wire `leaderboard-feed.json` publish
- [ ] Owner approves → deploy to production `lokislab` worker
- [ ] Retire the OpenAI Sites version of the site

## Open inputs still required

- `CF_API_TOKEN` (or `wrangler login`) with Workers + R2 rights.
- Final Google Form → Sheet → Apps Script read-only feed URL (sub-out we accept).
- Discord invite / newsletter / donation URLs (future).
