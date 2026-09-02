# NAS Data Management

NAS (UNAS at 192.168.1.191, 73TB) has repos and source trees scattered across `/Volumes/HJMPool1/AI Workspace/` in unstructured locations. Git operations fail on SMB mounts. Goal: inventory everything, migrate repos to local SSDs, convert NAS to archive-only.

## Current state

- NAS: `//unifidriveinternal;...@192.168.1.191/HJMPool1` mounted at `/Volumes/HJMPool1`
- Multiple broken `.git` directories found on SMB (no HEAD, no config, empty objects)
- Known repos on NAS:
  - `JackPress-src` — Cmd Press source, broken .git (empty skeleton, 46 files)
  - `cmdwork-src` — Cmd Work source, broken .git (empty skeleton, 46 files, you edited ProjectStore.swift + ProjectViews.swift today at 15:08)
  - `cmdwork-webapp` — Cmd Work webapp, real .git but SMB blocks git ops (260 files, 42 modified earlier, last commit 7ea1290)
  - `lokislab` (Obsidian Vault path) — broken .git, NAS "read-only mirror" per AGENTS.md
  - `lokislab` (HJM Websites path) — broken .git, has uncommitted changes on NAS (M app/page.tsx, M public/favicon.svg)
  - `lokislab-publish` — local clone on Asgard (~/lokislab-publish), working, publishes to GitHub

## What works

- Local git clones on Asgard work fine (cmddwork-src-final, cmdwork-webapp-final, lokislab-publish)
- GitHub repos all exist and are accessible: jackcanon/cmdwork-src, jackcanon/cmdwork-webapp, jackcanon/lokislab, jackcanon/JackPress-src
- Your edits to cmdwork-webapp (AgentAccessModal "Get agent credential" UI) committed and pushed to GitHub (e90f139)
- Your edits to CmdWork-src (mintProjectAgentCredential) — need to verify if already in GitHub or need committing

## Inventory scan

Background scan running: `python3 /tmp/nas_quick_inventory.py` — scanning /Volumes/HJMPool1 for .git dirs and source tree indicators. Pruning 27 directory patterns to avoid walking huge subtrees. Results will go to `/tmp/nas-targetted-inventory.json`.

Scan started: see proc_4b27d3e78596

## Migration approach

1. **Inventory** — find every .git repo, source tree, and large data dir on NAS (scan in progress)
2. **Assess** — for each repo: is it on GitHub? is the NAS copy the only copy? are there uncommitted changes?
3. **Migrate** — re-clone from GitHub to local SSD on each machine that works on it. NAS copy becomes archive-only (file copy, no .git).
4. **Consolidate** — repos go to logical endpoints:
   - Active development: local SSD clones, push to GitHub
   - Archive: NAS `/Volumes/HJMPool1/Archive/<project>/` — file copies only, no .git
5. **Crawl** — use HJM DAM-style filesystem crawler to find non-repo files living in weird places
6. **Sync** — staggered sync from local clones → NAS archive (don't flood spinning drives)

## Key repos to track

- **CmdWork-src** — Cmd Work macOS app source. GitHub: jackcanon/cmdwork-src. Last GitHub commit: 30a69c5. NAS copy: broken .git.
- **CmdWork-webapp** — Cmd Work Next.js webapp. GitHub: jackcanon/cmdwork-webapp. Last GitHub commit: 3102d82 (yours: e90f139 pushed). NAS copy: real .git, SMB-blocked.
- **Loki's Lab** — Website. GitHub: jackcanon/lokislab. NAS copies: 2 broken mirrors. Publisher: ~/lokislab-publish on Asgard.
- **JackPress-src** — Cmd Press source. GitHub: jackcanon/JackPress-src. NAS copy: broken .git.

## Notes

- User explicitly said: "we will find repos all over the mas in weird places and we need to use the crawlers we built for HJM DAM to figure out the weird places that files are living in and then get them consolidated to logical endpoints."
- NAS is archive storage — not for active git work. SMB + git doesn't work.
- Each machine that develops a repo needs its own local clone. No shared NAS git repos.
- Stagger any NAS writes to avoid flooding the spinning drives.
