# OpenAI Sites leaderboard feed setup

This document explains how Loki’s Lab publishes leaderboard data when hosted with OpenAI Sites.

## Recommended approach

Use the public GitHub feed as the runtime source:

```text
https://raw.githubusercontent.com/jackcanon/lokislab/main/public/leaderboard-feed.json
```

This allows an approved update to `public/leaderboard-feed.json` to appear on the live site without redeploying the entire OpenAI Site.

## 1. Configure the hosted environment variable

The hosted value is configured in the OpenAI Sites interface, not in the repository.

1. Open [chatgpt.com/sites](https://chatgpt.com/sites).
2. Find **Loki’s Lab**.
3. Select **More actions (`⋯`) → Settings**.
4. Find **Runtime environment values**.
5. Add the following value:

   ```text
   Name:
   LOKISLAB_LEADERBOARD_FEED_URL

   Value:
   https://raw.githubusercontent.com/jackcanon/lokislab/main/public/leaderboard-feed.json
   ```

6. Save the setting.
7. Redeploy the latest saved Site version once so the new runtime value takes effect.

OpenAI’s Sites documentation says hosted runtime values are managed in Site settings and are applied by the next deployment. They should not be stored in `.openai/hosting.json`.

## What not to change

These files are not the hosted OpenAI Sites configuration location:

- `wrangler.json` or `wrangler.toml`
- `.dev.vars`
- a Cloudflare `vars` block
- `.openai/hosting.json`

The repository’s `.env.example` should continue to document the variable for local development, but the production value belongs in Sites settings.

## 2. The static feed URL

When `public/leaderboard-feed.json` is included in a deployed Vinext build, the expected static URL is:

```text
https://lokislab.org/leaderboard-feed.json
```

That URL is stable only for the contents of the deployed Site version. OpenAI Sites does not automatically redeploy when `main` changes, so pushing a new JSON file would not update the hosted copy by itself.

The canonical checkout currently available for this project does not yet contain `public/leaderboard-feed.json` on `main`. Add and push that file before testing either feed URL.

## 3. Git and deployment behavior

OpenAI Sites is not currently a GitHub-connected CI/CD deployment system:

- A push to `main` does not automatically redeploy the Site.
- There is no supported OpenAI Sites `wrangler deploy` command.
- There is no separate Sites deployment token to configure for this workflow.
- Codex CLI can edit and test the local project, but Site versions are saved and deployed through ChatGPT web or the ChatGPT desktop app.

Sites associates saved versions with project Git commits, but saving a version and deploying it are separate actions.

If true push-to-deploy behavior is required for the entire application, the project would need to move to a Git-connected host such as Cloudflare Workers/Pages or Vercel. For the leaderboard feed alone, using the raw GitHub URL avoids that migration.

## 4. Fetch location and CORS

The current leaderboard fetch is server-side:

- `app/page.tsx` renders the page on the server.
- It calls `getLeaderboardData()`.
- `lib/leaderboard.ts` fetches the configured feed with `cache: 'no-store'`.

The OpenAI Sites Worker fetches GitHub, rather than the visitor’s browser. CORS is therefore not an issue for the current implementation.

If the leaderboard is later changed to fetch directly from browser-side JavaScript, CORS behavior would need to be reconsidered.

## 5. Minimal one-time setup

1. Add `public/leaderboard-feed.json` to the `main` branch.
2. Push it to GitHub.
3. Set `LOKISLAB_LEADERBOARD_FEED_URL` in OpenAI Sites settings to the raw GitHub URL.
4. Redeploy the Site once so the variable is available at runtime.
5. Future pushes that update `public/leaderboard-feed.json` will be fetched by the live leaderboard without another Sites dashboard action.

## Integrity and safety

The raw GitHub feed is public and any change to that file becomes eligible to appear on the live site. Protect the `main` branch and generate this file only from approved, privacy-safe leaderboard entries.

Do not commit submitter emails, private evidence URLs, internal review notes, credentials, user-directory paths, private IP addresses, or unsanitized raw output.

The safer long-term architecture remains the read-only Apps Script feed generated from the private review Sheet. The raw GitHub option is the simplest way to achieve automatic updates from approved commits without redeploying the Site.

## References

- [OpenAI Sites documentation](https://learn.chatgpt.com/docs/sites)
- [OpenAI Help Center: Creating and managing ChatGPT Sites](https://help.openai.com/en/articles/20001339)
