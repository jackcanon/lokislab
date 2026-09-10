# Publishing an article to lokislab.org

There is exactly one way an article reaches the site: a markdown file lands in
`content/drafts/<slug>.md` on the `main` branch of `jackcanon/lokislab`, and
Vercel rebuilds. Everything below is just a different door into that commit.

The site's filesystem on Vercel is read-only. Anything that "saves" an article
to disk at runtime (the old `/api/articles` editor, Decap CMS pointed at the
wrong folder, dropping files in `Articles/` or `content/blog/`) will never show
up. **Only `content/drafts/*.md` is read.**

## Door 1 — the web form (humans)

Open **https://lokislab.org/publish**, paste the publish token once (it is
remembered in that browser), paste the markdown, attach images if any, click
Publish. The page shows the article URL; it is live in about two minutes.

## Door 2 — the API (agents: Hermes, Loki, anyone)

```
POST https://lokislab.org/api/publish
Authorization: Bearer $LOKISLAB_PUBLISH_TOKEN
Content-Type: application/json

{
  "title": "iPhone Duo: The Best Screen Might Be the One You Always Have",
  "date": "2026-09-10",            // optional, YYYY-MM-DD, default today (Phoenix)
  "slug": "iphone-duo",            // optional, derived from title
  "dek": "One-line summary",       // optional, shown on the News page
  "tags": ["Apple", "local AI"],   // optional
  "hero": "hero.jpg",              // optional, name of one of images[]
  "images": [{ "name": "hero.jpg", "base64": "..." }],   // optional, ≤3.5 MB each
  "body": "# Title\n\nMarkdown…"    // required; may include its own --- frontmatter
}
```

Response: `{ ok: true, slug, url, commitUrl, files[] }`. A `401` means the
bearer token is wrong; `503` means the Vercel env vars are not set.

From a shell: `scripts/publish-article.sh path/to/article.md [image ...]`
(reads `LOKISLAB_PUBLISH_TOKEN` from the environment).

Image references in the body written as `![alt](hero.jpg)` or
`![alt](assets/hero.jpg)` are rewritten to the served path automatically.
Images are committed to `public/images/articles/<slug>/`.

## Door 3 — git (anyone with push access)

```
cp my-article.md content/drafts/my-article.md   # frontmatter: title, date
git add content/drafts/my-article.md && git commit -m "Publish: …" && git push origin main
```

## Frontmatter the site understands

```
---
title: "Article title"        # required (falls back to first H1)
date: 2026-09-10              # YYYY-MM-DD; drives sort order
dek: "One-line summary"       # News-page excerpt and article subtitle
image: /images/articles/slug/hero.jpg   # featured image (News page + article header)
image_alt: "…"
author: "Jack Blair"
tags: [ … ]
---
```

## One-time setup (Vercel → lokislab project → Settings → Environment Variables)

| Variable | Value |
| --- | --- |
| `LOKISLAB_PUBLISH_TOKEN` | any long random secret; share it with agents/humans who may publish |
| `LOKISLAB_GITHUB_TOKEN` | GitHub fine-grained personal access token: repository `jackcanon/lokislab`, permission **Contents: Read and write** |

Redeploy once after adding them. `GET /api/publish` reports whether both are set.

## Article packages (Codex / any agent that writes a folder)

`/publish` can ingest a whole folder — drop it on the page or pick it. The
convention it expects, which is what Codex already produces:

```
My Article Package/
  Some Title.md          ← the article: frontmatter (title, slug, date, dek, tags, image) + body
  hero.png               ← images referenced from the body as ![alt](hero.png)
  chart.png
  Image Notes.md         ← ignored (any "notes"/"readme" markdown is ignored)
  chart.svg, data.csv    ← ignored (only referenced raster images are uploaded)
```

Rules: the article is the markdown file with frontmatter (largest wins if
several). Only images the body references — plus a frontmatter `image:` naming
a file in the folder — are uploaded, to `public/images/articles/<slug>/`. The
frontmatter `image:` (or the Featured dropdown) is the News-card/hero image; if
the body also places that image inline it is shown once, where the body puts
it. Per-image limit 3.5 MB, whole package ≈4.2 MB per request. Review the
preview, then press Publish.
