# Loki's Lab workspace handoff

## Durable location note

- **Canonical checkout:** `/Volumes/HJMPool1/AI Workspace/Obsidian Vault/Claude/Projects/Websites/lokislab/`
- **Git remote:** `https://github.com/jackcanon/lokislab.git`
- **Branch:** `main` (production)
- **Public site:** `https://lokislab.org`
- **Known head (this rewrite):** `refactor/deploy-reconciliation` branch → ADR-002

> The prior `/Volumes/10TB JBOD/Agents/...` path is retired. Treat the UNAS
> checkout above as authoritative. If a second copy appears, reconcile to UNAS.

## Benchmark baseline

- Fleet Skill Matrix v2, Ollama through the fixed Hermes profile.
- Recommended new track: `tests/agent-work-v1.yml` (requires the Hermes harness;
  not runnable by a bare public WSL2 tester — see `public/eval/`).

## Run project checks

```sh
nvm use 24
npm install            # NAS checkout ships without node_modules
npm run lint
npm run test:leaderboard
npm run build
```

Node 22.13+ is required; Node 24 is pinned via `.nvmrc` because Vinext uses newer
Node filesystem APIs.

## Deployment (changed in ADR-002)

Deployment moved from ChatGPT/OpenAI Sites to **Cloudflare Workers** via `wrangler`.
The live site already edges from Cloudflare; this makes the *build source* match the
*edge*, restoring reproducible deploys. See `DEPLOY.md` for the exact, working flow
and the Cloudflare R2 leaderboard-feed setup.
