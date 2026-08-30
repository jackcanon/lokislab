# Loki's Lab agent handoff

## Canonical checkout (single source of truth)

`/Volumes/HJMPool1/AI Workspace/Obsidian Vault/Claude/Projects/Websites/lokislab/`

This is the authoritative working copy for all agents. It lives on the UNAS share
so every machine in the fleet reaches the same tree. The old
`/Volumes/10TB JBOD/Agents/...` path is retired (the vault + sites moved to UNAS).

- **GitHub remote:** `https://github.com/jackcanon/lokislab.git`
- **Production branch:** `main`
- **Public site:** `https://lokislab.org`
- **Deploy target:** Cloudflare Workers (Vinext/RSC build → `wrangler deploy`)

## Toolchain

- Node 24 (repo pins it via `.nvmrc`; `nvm use 24`). Node 22.13+ is the floor.
- The NAS checkout ships **without** `node_modules`. Run `npm install` (network
  access required) before any build/dev/deploy command.
- `wrangler` is a devDependency but is only operational where `CF_API_TOKEN` is set
  (or `wrangler login` has run). Builds do not need it; deploys do.

## Local checks (run from the canonical checkout after `npm install`)

```sh
npm run lint
npm run test:leaderboard
npm run build          # vinext build -> dist/
```

## Deploy (Cloudflare Workers — see DEPLOY.md for the full flow)

```sh
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

## Architecture

Reconciliation of the original (phone-built) deployment is documented in
`docs/ADR-002-deployment-reconciliation.md`. In short:

- **One deploy model:** Cloudflare Workers via Vinext. The OpenAI Sites plugin and
  `.openai/` hosting config were removed — the site edges from Cloudflare and must
  deploy from `wrangler`, not ChatGPT Sites.
- **We control:** the app code, GitHub repo, NAS checkout, benchmark schema/runner,
  and (now) the leaderboard feed via Cloudflare R2.
- **We sub out (external, per ADR-001):** Google Form + Apps Script as the
  submission doorway and read-only feed; Discord/newsletter (future); EmDash CMS
  (future editorial layer, not yet adopted).

Do **not** rewrite historical Fleet Skill Matrix v2 results when adding the
proposed `agent-work` suite. Keep the public-status allowlist in `lib/leaderboard.ts`.
