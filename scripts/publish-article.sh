#!/usr/bin/env bash
# Publish a markdown article (and optional images) to lokislab.org.
#
#   LOKISLAB_PUBLISH_TOKEN=… scripts/publish-article.sh article.md [hero.jpg ...]
#
# Title is taken from frontmatter `title:` or the first H1. Set LOKISLAB_HERO to
# name the featured image, LOKISLAB_DATE to override the date, LOKISLAB_SITE to
# target a preview deployment.
set -euo pipefail

ARTICLE="${1:?usage: publish-article.sh article.md [image ...]}"
shift || true
SITE="${LOKISLAB_SITE:-https://lokislab.org}"
: "${LOKISLAB_PUBLISH_TOKEN:?set LOKISLAB_PUBLISH_TOKEN}"

command -v jq >/dev/null || { echo "jq is required (brew install jq)"; exit 1; }

TITLE="$(grep -m1 -E '^title:' "$ARTICLE" | sed -E 's/^title:[[:space:]]*"?([^"]*)"?/\1/' || true)"
[ -n "$TITLE" ] || TITLE="$(grep -m1 -E '^# ' "$ARTICLE" | sed -E 's/^# //')"
[ -n "$TITLE" ] || { echo "could not find a title (frontmatter title: or first # H1)"; exit 1; }

IMAGES='[]'
for img in "$@"; do
  IMAGES="$(jq -c --arg n "$(basename "$img")" --arg b "$(base64 < "$img" | tr -d '\n')" '. + [{name:$n, base64:$b}]' <<<"$IMAGES")"
done

PAYLOAD="$(jq -n \
  --arg title "$TITLE" \
  --rawfile body "$ARTICLE" \
  --arg date "${LOKISLAB_DATE:-}" \
  --arg hero "${LOKISLAB_HERO:-}" \
  --argjson images "$IMAGES" \
  '{title:$title, body:$body, images:$images}
   + (if $date != "" then {date:$date} else {} end)
   + (if $hero != "" then {hero:$hero} else {} end)')"

curl -sS -X POST "$SITE/api/publish" \
  -H "Authorization: Bearer $LOKISLAB_PUBLISH_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "$PAYLOAD" | jq .
