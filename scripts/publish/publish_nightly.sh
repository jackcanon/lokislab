#!/bin/bash
# Nightly Loki's Lab publish pipeline (autonomous, pre-approved).
# Collects 3x eval results from all fleet boxes, converts to v1 submissions,
# builds the sanitized public leaderboard feed, validates it against the site's
# parse rules, and pushes to main. The OpenAI Sites Worker fetches the committed
# file at runtime -> live on lokislab.org with no dashboard action.
set -u
REPO=/tmp/lokislab-inspect
STAGE=/tmp/lokislab_recon/nightly_results
CONVERTED=/tmp/lokislab_recon/nightly_converted
BOXES="midgaard odin heimdall m1pro overgaard"
mkdir -p "$STAGE" "$CONVERTED"

echo "[nightly] $(date) collecting results from $BOXES"
rm -f "$STAGE"/*.json
for h in $BOXES; do
  scp -o ConnectTimeout=15 -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    "$h:/tmp/v2run/results/*.json" "$STAGE/" 2>/dev/null && echo "  $h: copied" || echo "  $h: none/no access"
done
echo "[nightly] collected $(ls "$STAGE"/*.json 2>/dev/null | wc -l) result files"

echo "[nightly] converting to v1 submissions"
cd "$REPO"
RESULTS_GLOB="$STAGE/*.json" OUT_DIR="$CONVERTED" python3 scripts/reconcile/convert_v2.py 2>&1 | tail -6

echo "[nightly] building sanitized public feed"
python3 scripts/publish/build_feed.py --src "$CONVERTED" --validate 2>&1 | tail -4

echo "[nightly] committing + pushing"
git add public/leaderboard-feed.json
if git diff --cached --quiet; then
  echo "[nightly] no feed change; nothing to push"
else
  git commit -q -m "publish: nightly leaderboard feed from 3x fleet eval runs" && \
  git push origin main 2>&1 | tail -2 && \
  echo "[nightly] PUSHED -> live on lokislab.org (Worker fetches at runtime)"
fi
echo "[nightly] done $(date)"
