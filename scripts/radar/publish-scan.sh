#!/usr/bin/env bash
set -euo pipefail
task_root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$task_root"
if [[ "$(git branch --show-current)" != "main" ]]; then
  echo 'Radar publishing requires the main branch.' >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Checkout has existing changes. Preserve them and resolve before scanning.' >&2
  exit 1
fi
git pull --ff-only
python3 -m unittest discover -s scripts/radar -p 'test_*.py'
task_scan_status=0
python3 scripts/radar/scan.py || task_scan_status=$?
git add data/radar/feed.json data/radar/scan-state.json
if git diff --cached --quiet; then
  echo 'No Radar data changes to publish.'
  exit "$task_scan_status"
fi
git commit -m "Refresh Radar public-source scan"
# A concurrent publisher can advance main. Rebase our data-only commit; conflicts
# halt the run rather than overwrite either publisher's work.
git pull --rebase
git push origin main
exit "$task_scan_status"
