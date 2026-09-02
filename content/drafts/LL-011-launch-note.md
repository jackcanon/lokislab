---
title: "What Loki's Lab Is For"
short_title: "What Loki's Lab Is For"
date: "2026-08-31"
pin: true
---


# What Loki's Lab Is For

Loki's Lab is a place for people who want to run AI on their own hardware — whether that's a homelab in the closet, a Mac Studio on a small-business desk, or a GPU rig that's tired of phoning home. We test local models honestly, publish what we find, and leave the cloud hype on the shelf where it belongs.

The lab is named for the trickster, not the theater. A little mischief in the framing is fine. Stacking the deck is not. Every score here comes from a fixed harness, three runs per test, and a submission that passed a privacy check before it ever saw a leaderboard. If a result looks too clean, the methodology section tells you exactly how it was produced so you can reproduce it — or challenge it.

## What You Can Use This For

- **Home lab builders:** find out which local models actually do useful work on the hardware you already own — not the hardware a vendor demo was filmed on.
- **Small businesses:** spot models that can act as backend partners — drafting, research, tool use, file work — without sending customer data to an API you don't control. If your workflow touches real information, you get to keep it local.
- **Anyone tired of benchmark theater:** scores here are tied to specific hardware, model versions, and harness settings. You know what you're comparing.

## Current Benchmark Status

The benchmark is young. The leaderboard currently reflects early Fleet Skill Matrix v2 results from real homelab configurations — token throughput, context endurance, and a handful of agent-work tasks that survived the cut. It is not a massive dataset yet, and we say so plainly. We'd rather ship a small honest table than a large theatrical one.

New suites are coming. A Gemma story battery, agent-work tasks, and more are defined and waiting on their first controlled runs. Until they land, the v2 baseline is the immutable launch reference — no retroactive score changes, no moving the goalposts after the fact.

## How to Read the Leaderboard

- Scores are grouped by **suite and version**. Unlike benchmark versions are never ranked together.
- Every entry links back to the hardware, model version, OS, and harness profile that produced it.
- Speed and quality are reported separately. A model that burns through tokens but can't finish the task isn't "better" — it's just faster at failing.
- Green and red are aesthetics, not verdicts. Read the numbers.

## Free, Open, and Stay That Way

All metrics are open access. No paywall, no account wall, no "enter your email to see the results." If you can reach the site, you can read the leaderboard, the methodology, and the raw privacy-safe submission JSON behind each entry.

We do not monetize your hardware logs. We do not sell submission data. The private reviewer sheet and contributor emails stay private; what ships publicly is the sanitized projection.

## How to Take Part

1. **Run the harness.** The v0 benchmark runner supports macOS, Linux, native Windows PowerShell, and WSL. It checks its dependencies, explains what's missing, and asks before installing anything. No silent system changes.
2. **Submit honestly.** Every submission gets a unique ID. We accept results via the runner script and the submission form. The form writes to a private review sheet — the public site only ever sees what passes a privacy check.
3. **Expect a real review.** Submissions move through `New` → `Validating` → `Unverified` or `Under review` → `Verified` or `Rejected`. `Verified` is always a human decision. Trusted contributors may get a lighter evidence workflow, but contributor status does not auto-verify a result. We're a community, not a rubber stamp.
4. **Read the methodology before you trust a score.** The methodology doc explains the test definitions, median-of-three scoring, coverage rules, N/A handling, hardware fields, and budget tiers. If you can't reproduce it, you shouldn't trust it — and neither do we.

## A Word on Tricks

Loki's Lab is named for a trickster god. That means a little mischief in the writing is on brand. It does not mean we tricks with the data. Fixed harness, fixed settings, three runs, privacy review, manual verification — the boring parts are the point. The theater is free; the scores are not.

## Links

- **Methodology:** how we define tests, score them, and keep versions separable.
- **Submission instructions:** how to run the harness and submit a result that passes validation.
- **GitHub runner:** https://github.com/jackcanon/lokislab — the source for the runner, validator, and this site.
- **Public site:** https://lokislab.org — the live leaderboard and what we've published so far.

The forge is warm. Bring your own rig.
