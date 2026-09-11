# Guides (Hermes 101 and future courses)

Guides are evergreen, undated training pages with persistent routes — not News
articles. They do not go through `/publish`.

## Hermes Day One — `/guides/hermes-day-one`

Routes: `/guides/hermes-day-one` (OS chooser), `/guides/hermes-day-one/linux`,
`/mac`, `/windows`. Stable anchors on every lane: `#install-once`,
`#track-1-nous-account`, `#track-2-chatgpt-or-codex-login`, `#track-3-anthropic`,
`#track-4-local-model-through-ollama`, `#first-working-task`, `#troubleshooting`,
`#command-cheat-sheet`.

Source of truth: `content/guides/hermes-day-one/source/`
- `hermes-day-one.md` — shared content for all three lanes
- `build-guide.mjs` — the OS-specific fragments (`platforms` object) and the generator
- `guide-theme.css` — styling source

Rendered fragments the site serves: `content/guides/hermes-day-one/<os>.body.html`
and `<os>.toc.html` (the `<main>` and `<aside>` of the generated pages, with
`.html` links rewritten to site routes). Do not hand-edit these.

### To update the guide

1. Edit `source/hermes-day-one.md` (shared steps) and/or the `platforms` object in
   `source/build-guide.mjs` (OS-specific steps).
2. Regenerate the three lanes: `node scripts/guides/build-hermes.mjs`
   (needs `marked`: `npm i -D marked` once).
3. If you changed `guide-theme.css`, run `python3 scripts/guides/scope-css.py`.
4. `npm run build`, check all four routes and the anchors, commit, push.

Keep the editorial choices in the package's `CLAUDE-HANDOFF.md` (kept with the
source folder on the NAS): no visible dates or event branding, all four tracks in
every lane, Apple-Silicon-only Mac lane, Ubuntu/Debian-scoped Linux lane, native
PowerShell Windows lane, Anthropic entitlement left explicitly uncertain.
