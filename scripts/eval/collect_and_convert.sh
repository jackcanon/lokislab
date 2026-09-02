#!/usr/bin/env bash
# Collect 3x-run results from all fleet boxes, merge with original v2 results,
# convert to Loki's Lab v1 envelopes, and validate. Reports progress.
set -u
export PATH="$HOME/.local/node22/bin:$PATH"
# Midgaard EXCLUDED: Jack requires explicit per-run approval for Midgaard evals
# (sterile-env gate). Only the other 4 boxes are in scope for this auto-run.
BOXES="odin heimdall m1pro overgaard"
MERGED=/tmp/lokislab_recon/merged_results
mkdir -p "$MERGED"
# 1) pull fresh 3x results from each box
for h in $BOXES; do
  scp -o ConnectTimeout=15 -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    "$h:/tmp/v2run/results/*.json" "$MERGED/" 2>/dev/null || true
done
# 2) also include the original 317 v2 results (so coverage compounds)
cp /tmp/lokislab_recon/skillmatrix/skill-matrix/results/*.json "$MERGED/" 2>/dev/null || true
COUNT=$(ls "$MERGED"/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "merged result files: $COUNT"
# 3) convert + validate
cd /tmp/lokislab_recon
python3 convert_v2.py 2>&1
# 4) tally decisions
VALID=0; UNDER=0; INVALID=0
for f in /tmp/lokislab_recon/converted/*.v1.json; do
  [ -f "$f" ] || continue
  d=$(node /tmp/lokislab_run/scripts/validate-benchmark-submission.mjs "$f" 2>/dev/null \
      | python3 -c "import sys,json;print(json.load(sys.stdin).get('decision'))" 2>/dev/null)
  case "$d" in valid) VALID=$((VALID+1));; under_review) UNDER=$((UNDER+1));; invalid) INVALID=$((INVALID+1));; esac
done
echo "CONVERTED_TALLY valid=$VALID under_review=$UNDER invalid=$INVALID"
# 5) are all boxes done? (orchestrator prints "DONE" at the end of its log)
DONE=0
NBOX=$(echo $BOXES | wc -w | tr -d ' ')
for h in $BOXES; do
  if ssh -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$h" \
       "grep -q DONE /tmp/v2run/${h}_orch.log 2>/dev/null" 2>/dev/null; then
    DONE=$((DONE+1)); echo "$h: DONE"; else echo "$h: still running"; fi
done
echo "BOXES_DONE=$DONE/$NBOX"
