# MAC ARTICLE HANDOFF

## What we're writing

A Loki's Lab story celebrating Apple's new Mac Studios and Mac Minis and what they mean for local models. The angle: these are the machines that make local AI actually practical for a wider range of people — not just people with GPU rigs.

## Why this matters for the audience (~2,000 people)

A lot of the people following Loki's Lab are small-business owners, homelab builders, and developers who already own Mac hardware or are looking to buy. They care about: what can I actually run on this? How many tokens/sec? What model sizes fit? What's the cost per useful result? This story answers those questions directly.

## Key points to cover

- **New Mac Studios + Mac Minis**: what's new (M-series chips, memory options, thermal design), why it matters for local models specifically (not just "it's fast" but "here's what fits where")
- **Local model landscape**: which models realistically run on these machines today — Qwen, GLM, Hermes-agent-class tools, llama.cpp-class inference — at what sizes and speeds
- **Practical framing**: match hardware to workload. Not every machine needs to run every model. A Mac Mini with 16GB is great for some things, a Studio with 128GB is a different tool entirely
- **Real numbers where we have them**: if we've benchmarked anything on Mac hardware, include it. If not, say so plainly and frame what we'd need to test
- **Who this is for**: home lab builders, small businesses keeping data local, people tired of cloud-only options
- **Tone**: practical, honest, a little mischief in the framing (it's Loki's Lab — trickster is on brand, stacking the deck is not)

## Loki's Lab voice guidelines

- Headline should be readable and specific — not hype, not clickbait
- Lead with what the reader can actually do with this information
- If something is early or untested, say so — "we'd rather ship a small honest table than a large theatrical one" (from LL-011)
- Trust the reader — they can handle a real number next to a caveat

## Formatting

- Markdown with YAML frontmatter (title, date, category, author, excerpt, short_title)
- Use the article editor at `/admin` to write and preview before publishing
- Preview renders via the same `renderMarkdown` pipeline that powers the live site — what you see is what ships
- Category: "News" or "Field Notes" (decide with the team)
- Author: Jack (for now; author onboarding pipeline is planned)

## Publish path

1. Write draft in `/admin/edit/<slug>`
2. Preview live in the editor
3. Save → file lands in `content/drafts/`
4. Commit + push to `main` → Vercel deploys
5. The story appears in the Trusted Sources feed (pinned if it's the latest)

## Open questions for the writing agent

- Do we have any real benchmark numbers to include, or is this a news/reaction piece?
- Which specific Mac configurations should we focus on? (base Mac Mini vs Studio? Which chip 세대?)
- Is there a teaser or angle we want to lead with — e.g., "the machine that changes who can run local models" vs "here's what actually fits"?
- Should we link to any specific model release pages (Qwen3.8, GLM-5.3, etc.) as "what to run on this hardware"?
