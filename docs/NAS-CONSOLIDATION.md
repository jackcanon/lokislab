# NAS Data Consolidation Report

**Scan date:** 2026-09-01  
**Scan method:** `find /Volumes/HJMPool1/AI Workspace -name .git -type d` with media/cache pruning  
**Total repos found:** 89 (across 4 top-level areas)  
**Working repos:** 64 (have HEAD + config + objects)  
**Broken repos:** 25 (empty `.git` skeletons or missing HEAD)  
**Repos with GitHub remote:** 61  

---

## Where the repos live (4 locations)

### 1. AI Workspace/Projects/Applications/HJM Apps/ — 16 repos
The "primary" Applications location on NAS. **8 broken, 8 working.**

| Repo | Status | Remote |
|------|--------|--------|
| CMDSwitcher-src | ✓ working | (no remote — integration branch) |
| CmdCue-src | ✓ working | github.com/jackcanon/CmdCue-src |
| CmdKey-app-src | ✓ working | github.com/jackcanon/CmdKey-app-src |
| CmdKey-src | ✓ working | github.com/jackcanon/CmdKey-src |
| CmdOS-Companion-src | ✓ working | github.com/jackcanon/CmdOS-Companion-src |
| CmdOS-src | ✓ working | github.com/jackcanon/CmdOS-src |
| CmdPlanner-src | ✓ working | github.com/jackcanon/CmdPlanner-src |
| CmdRadio-src | ✓ working | github.com/jackcanon/CmdRadio-src |
| CmdRecall-src | ✗ broken | — |
| CmdWork-src | ✗ broken | — |
| JackPress-src | ✗ broken | — |
| JackPress-src/JackPress | ✗ broken | — |
| PodLapse-src | ✗ broken | — |
| SRA Audits-src | ✗ broken | — |
| SRAudit-src | ✗ broken | — |
| SynSpike | ✗ broken | — |

### 2. AI Workspace/Projects/Web Applications/HJM Web Apps/ — 14 repos
**13 broken, 1 working.** Nearly all broken — empty `.git` skeletons.

| Repo | Status | Remote |
|------|--------|--------|
| CmdControlRoom-src | ✓ working | local path (not GitHub) |
| cmdbrief-webapp | ✗ broken | — |
| cmbcue-site | ✗ broken | — |
| cmdkey-webapp | ✗ broken | — |
| cmdplanner-site | ✗ broken | — |
| cmdrecall-site | ✗ broken | — |
| cmdwork-site | ✗ broken | — |
| cmdwork-webapp | ✗ broken | — |
| hjm-command | ✗ broken | — |
| jackpress-site | ✗ broken | — |
| lokislab | ✗ broken | — |
| podlapse-site | ✗ broken | — |
| showrunner | ✗ broken | — |
| world-cup-tracker | ✗ broken | — |

### 3. AI Workspace/Projects/Websites/HJM Websites/ — 26 repos (15 unique + duplicates in Obsidian)
**13 working, 2 broken** (rest are duplicates in Obsidian Vault).

| Repo | Status | Remote |
|------|--------|--------|
| beards-of-war | ✓ working | github.com/jackcanon/beards-of-war |
| cmdbrief-webapp | ✓ working | github.com/jackcanon/cmdbrief-webapp |
| cmbcue-site | ✓ working | github.com/jackcanon/cmdcue-site |
| cmdkey-webapp | ✓ working | github.com/jackcanon/CmdKey-webapp |
| cmdplanner-site | ✓ working | github.com/jackcanon/cmdplanner-site |
| cmdrecall-site | ✓ working | github.com/jackcanon/cmdrecall-site |
| cmdwork-site | ✓ working | github.com/jackcanon/cmdwork-site |
| cmdwork-webapp | ✓ working | github.com/jackcanon/cmdwork-webapp |
| happyjack-media | ✓ working | github.com/jackcanon/happyjack-media |
| jackpress-site | ✓ working | github.com/jackcanon/CmdPress-website |
| lokislab | ✓ working | github.com/jackcanon/lokislab |
| podlapse-site | ✓ working | github.com/jackcanon/PodLapse-web |
| showrunner | ✓ working | github.com/jackcanon/show-runner |
| documentaryledger.com | ✗ broken | — |
| SRA Audits Website | ✗ broken | — |

### 4. AI Workspace/Obsidian Vault/Claude/Projects/ — 39 repos
**ALL 39 working.** These are Claude's project workspace copies. Every one has a proper `.git` with HEAD, config, and GitHub remote. This is the healthiest copy of everything.

Also contains:
- `Obsidian Vault/Claude/Git/` — 2 repos (beards-of-war, cmbcue-site)
- `Obsidian Vault/Claude/HJM-Website-Photos/git/` — 1 repo (happyjack-media)
- `Obsidian Vault/Claude/Projects/Dashboards/` — 2 repos (hjm-command, world-cup-tracker)
- `Obsidian Vault/Claude/Projects/Plugins/` — 1 repo (cmd-work)
- `Obsidian Vault/Claude/Projects/Websites/` — 12 repos

### 5. Other scattered locations — 5 repos
- `Projects/Assets/happyjack-media` — ✓ working
- `Projects/Infra/CmdBrief-src` — ✓ working  
- `Projects/Infra/CmdID-src` — ✓ working
- `Projects/Libraries/cmdwork-agent-mcp-src` — ✗ broken
- `Projects/Plugins/cmd-work` — ✗ broken

---

## Consolidation plan

### Where everything should live on Asgard
```
/Users/jack/Documents/JackPress/
├── apps/          # macOS applications (Swift apps)
│   ├── CmdCue-src/
│   ├── CmdKey-src/
│   ├── CmdOS-src/
│   ├── CmdPlanner-src/
│   ├── CmdRadio-src/
│   ├── CmdRecall-src/
│   ├── CmdWork-src/
│   ├── JackPress-src/
│   ├── PodLapse-src/
│   ├── SRAudit-src/
│   ├── CMDSwitcher-src/
│   ├── CmdOS-Companion-src/
│   ├── CmdKey-app-src/
│   ├── SRA Audits-src/
│   └── SynSpike/
├── webapps/       # Next.js / web application code
│   ├── cmdwork-webapp/
│   ├── cmdwork-site/
│   ├── cmdbrief-webapp/
│   ├── cmbcue-site/
│   ├── cmdkey-webapp/
│   ├── cmdplanner-site/
│   ├── cmdrecall-site/
│   ├── hjm-command/
│   ├── jackpress-site/
│   ├── lokislab/
│   ├── podlapse-site/
│   ├── showrunner/
│   ├── world-cup-tracker/
│   └── CmdControlRoom-src/
├── websites/      # Static/marketing sites
│   ├── beards-of-war/
│   ├── happyjack-media/
│   ├── CmdPress-website/      (jackpress-site)
│   ├── PodLapse-web/          (podlapse-site)
│   ├── show-runner/           (showrunner)
│   ├── cmdbrief-webapp/
│   ├── cmbcue-site/
│   ├── cmdkey-webapp/
│   ├── cmdplanner-site/
│   ├── cmdrecall-site/
│   ├── cmdwork-site/
│   ├── documentaryledger-website/
│   └── sra-audits-website/
└── libs/          # Shared libraries
    └── cmdwork-agent-mcp/
```

### Already done (on Asgard)
- **lokislab** → `~/lokislab-publish` (active, publishing)
- **cmdwork-webapp** → `~/Documents/JackPress/cmdwork/cmdwork-webapp-final` (committed + pushed)
- **cmdwork-src** → `~/Documents/JackPress/cmdwork/cmdwork-src-cloned` (GitHub already has user's code)

### What needs to happen (staged NAS → Asgard copy)
Since git-on-SMB is broken, each repo needs to be:
1. Fresh-cloned from GitHub on Asgard (if GitHub has it), OR
2. Copied from NAS Obsidian Vault copy (if it's the only working copy), then
3. Re-initialized with proper remote if needed

**Priority order:**
1. **CmdWork-src** — already cloned, GitHub has user's `mintProjectAgentCredential` code
2. **JackPress-src** — Cmd Press source, needed for LL publishing pipeline (locked behind Cmd Work project work)
3. **lokislab (HJM Web Apps copy)** — already handled via Obsidian Vault copy
4. **All other webapps** — 13 broken repos need fresh clones from GitHub
5. **All broken apps** — 8 broken repos need fresh clones from GitHub

### Broken repos: GitHub availability check needed
The 25 broken repos need GitHub availability verified. The Obsidian Vault copies have the remotes — those URLs are the source of truth. A fresh clone from GitHub should work for repos that have GitHub remotes.

**Repos with NO GitHub remote (need investigation):**
- `CMDSwitcher-src` (Obsidian Vault copy: no remote, integration branch)
- `CmdControlRoom-src` (remote is local path `/Users/dit1/...`, not GitHub)
- `cmdwork-agent-mcp-src` (broken, no remote readable)
- `cmd-work` (broken, no remote readable)

### Duplicates to clean up
The Obsidian Vault has copies of nearly everything. After migration:
- NAS `AI Workspace/Projects/` copies become **read-only archive** (like the AGENTS.md says)
- NAS `AI Workspace/Obsidian Vault/Claude/Projects/` copies become **read-only archive**
- Only Asgard working copies are live

---

## Scanner output files
- `/tmp/nas-aiworkspace-gitdirs.txt` — 89 repo paths
- `/tmp/nas-repo-health.json` — full health check for each repo
