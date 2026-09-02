#!/usr/bin/env python3
"""
Seed a one-off news item directly into trusted-news.json.
Used for stories we can't scrape automatically (e.g. TechCrunch articles
about Z.ai, or manual picks from sources without clean RSS).
Run with: python3 scripts/seed-news-item.py
"""
import json
from pathlib import Path
from datetime import datetime, timezone

OUT = Path("/Users/jack/lokislab-publish/data/trusted-news.json")

ITEMS = [
    # Z.ai is the AI lab behind the mysterious "Ox" Alpha model — TechCrunch, 2026-08-26
    {
        "source": "Zai",
        "title": "Z.ai Is the AI Lab Behind the Mysterious \"Ox\" Alpha Model",
        "href": "https://techcrunch.com/2026/08/26/surprise-z-ai-is-the-ai-lab-behind-the-mysterious-ox-alpha-model/",
        "date": "2026-08-26",
        "excerpt": "TechCrunch identifies Z.ai (formerly Zhipu AI) as the lab behind Ox Alpha, a model that appeared without announcement and shook up the leaderboard conversation.",
    },
    # Z.ai / GLM-5.3 — Frontier Coding with Emergent Cyber Capabilities — 2026-08-14
    {
        "source": "Zai",
        "title": "GLM-5.3: Frontier Coding with Emergent Cyber Capabilities",
        "href": "https://z.ai/blog/glm-5.3",
        "date": "2026-08-14",
        "excerpt": "Z.ai's latest model uses the same base as GLM-5.2 — every gain comes from post-training. 50% improvement on Z.ai Code Bench, open-source SOTA on Terminal Bench 3.0 and Agents' Last Exam.",
    },
    # Qwen3.8 — from the Qwen team blog
    {
        "source": "Qwen",
        "title": "Qwen3.8: A New Bar for Coding and Cowork",
        "href": "https://qwenlm.github.io/blog/qwen3.8/",
        "date": "2026-08-13",
        "excerpt": "Qwen3.8 ships with stronger coding capabilities and improved cowork/reasoning profiles. The Qwen team frames it as the latest step in the Qwen3 family.",
    },
]

def main():
    # Load existing
    if OUT.exists():
        payload = json.loads(OUT.read_text())
    else:
        payload = {"items": [], "sources": [], "generated_at": ""}

    # Merge: append new items, dedupe by href
    existing = {item["href"]: item for item in payload.get("items", [])}
    for item in ITEMS:
        existing[item["href"]] = item

    # Rebuild items list, sorted by date desc
    merged = sorted(existing.values(), key=lambda x: x.get("date", ""), reverse=True)
    payload["items"] = merged
    payload["sources"] = sorted(set(item["source"] for item in merged))
    payload["generated_at"] = datetime.now(timezone.utc).isoformat()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2))

    print(f"Seeded {len(ITEMS)} items into {OUT}")
    print(f"Total items now: {len(merged)}")
    for item in merged:
        print(f"  [{item['source']}] {item['title']}")

if __name__ == "__main__":
    main()
