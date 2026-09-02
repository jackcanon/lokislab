#!/usr/bin/env bash
# publish_skill_matrix.sh -- Asgard-centric publisher for Loki's Lab test data.
#
# Single source of truth: the fleet eval results, consolidated on Asgard, are
# turned into data/skill-matrix.json in the lokislab website repo and pushed to
# GitHub. Vercel rebuilds and the homepage leaderboard + /test/results update.
#
# No Midgard involvement: Asgard owns the git write. Each box's results are
# pulled here via scp, merged into a consolidated dir, then the generator runs.
#
# Usage:
#   ./publish_skill_matrix.sh            # full publish (gather + generate + push)
#   ./publish_skill_matrix.sh --no-push  # generate + commit locally, don't push
#
# Requires: ssh access to the eval boxes, and a git clone of lokislab at LOKISLAB_REPO.
set -u

LOKISLAB_REPO="${LOKISLAB_REPO:-/Users/jack/lokislab-publish}"
RESULTS_LOCAL="$HOME/fleet_eval/skill-matrix-authoritative/results"
CONSOLIDATED="$HOME/fleet_eval/skill-matrix-consolidated/results"
GEN_SCRIPT="$LOKISLAB_REPO/scripts/publish/generate_skill_matrix.py"

# Boxes that run evals (host alias -> remote results dir). Add/remove as needed.
BOXES=(
  "midgaard:/Users/dit1/Claude/Projects/Fleet-Eval-2026-08/skill-matrix/results"
  "odin:/path/to/skill-matrix/results"
  "overgaard:/path/to/skill-matrix/results"
  "heimdall:/path/to/skill-matrix/results"
  "m1pro:/path/to/skill-matrix/results"
)

NO_PUSH=0
[[ "${1:-}" == "--no-push" ]] && NO_PUSH=1

log() { echo "[$(date +%H:%M:%S)] $*"; }

# 1. ensure lokislab repo clone exists + is on main + clean
if [ ! -d "$LOKISLAB_REPO/.git" ]; then
  log "Cloning lokislab repo to $LOKISLAB_REPO (HTTPS)"
  git clone https://github.com/jackcanon/lokislab.git "$LOKISLAB_REPO" || {
    echo "FATAL: cannot clone lokislab repo"; exit 1; }
fi
cd "$LOKISLAB_REPO" || exit 1
git checkout main --quiet 2>/dev/null
git pull --quiet origin main 2>/dev/null || log "warn: git pull failed (offline?)"

# 2. consolidate results: start from this box's local results
log "Consolidating results into $CONSOLIDATED"
mkdir -p "$CONSOLIDATED"
cp -f "$RESULTS_LOCAL"/*.json "$CONSOLIDATED"/ 2>/dev/null || log "warn: no local results to copy"

# 2b. pull from other boxes (best-effort; skip if unreachable)
for entry in "${BOXES[@]}"; do
  host="${entry%%:*}"; rdir="${entry#*:}"
  # skip placeholder paths
  [[ "$rdir" == *"/path/to/"* ]] && { log "  (skip $host: no result path configured)"; continue; }
  if scp -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=no \
        "$host:$rdir/"*.json "$CONSOLIDATED"/ 2>/dev/null; then
    log "  pulled results from $host"
  else
    log "  (skip $host: unreachable or no results)"
  fi
done

# 3. regenerate the feed
log "Generating data/skill-matrix.json"
python3 "$GEN_SCRIPT" --results "$CONSOLIDATED" --out "$LOKISLAB_REPO/data/skill-matrix.json" || {
  echo "FATAL: generator failed"; exit 1; }

# 4. commit + push
cd "$LOKISLAB_REPO"
if git diff --quiet -- data/skill-matrix.json; then
  log "No changes to feed -- nothing to publish."
  exit 0
fi
git add data/skill-matrix.json
git commit -q -m "Publish skill-matrix feed: $(date +%Y-%m-%dT%H:%M) ($(git diff --shortstat -- data/skill-matrix.json | tr -d '\n'))"
log "Committed feed update."

if [ "$NO_PUSH" -eq 1 ]; then
  log "--no-push: committed locally, not pushing."
  exit 0
fi

git push origin main && log "Pushed to GitHub -> Vercel will rebuild." || {
  echo "FATAL: push failed"; exit 1; }
