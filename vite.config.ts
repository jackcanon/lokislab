import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Loki's Lab build config — SINGLE deploy target: Cloudflare Workers via Vinext (RSC).
// OpenAI Sites plugin + `.openai/hosting.json` were removed (ADR-002): the site
// edge-serves from Cloudflare and deploys via `wrangler deploy`, not ChatGPT Sites.
// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

// Keep Wrangler and Miniflare state project-local. These are non-secret tool
// settings; application environment belongs in ignored `.env*` files.
process.env.WRANGLER_WRITE_LOGS ??= 'false';
process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

export default defineConfig(async () => {
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        // No D1/R2 bindings yet at build time. The leaderboard feed is served
        // from Cloudflare R2 at runtime (see DEPLOY.md). Add bindings here once
        // the R2 bucket + KV namespace exist and CF_API_TOKEN is configured.
        config: {
          main: 'vinext/server/fetch-handler',
          compatibility_flags: ['nodejs_compat'],
        },
      }),
    ],
  };
});
