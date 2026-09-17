---
title: "The Den Builds the Den"
slug: the-den-builds-the-den
date: 2026-09-17
updated: 2026-09-17
status: published
section: Lab Notes
author: "Jack Blair"
author_slug: jack
published_at: 2026-09-17T19:00:00Z
dek: "Thirteen days from a first commit to a fleet that verifies its own work — and why the goal is a machine that can do real development on its own codebase."
image: /images/articles/the-den-builds-the-den/03-the-gate-holds.png
image_alt: "Two sibling cards: the model reports success in both; the host's exit code decides."
tags:
  - Loki's Den
  - Hive
  - Lab Notes
---

Every project I've built has had a moment where it stops being a plan and starts being a thing. For Loki's Den, that moment had a timestamp: 2026-09-16, 21:34 UTC. A card was claimed by a Mac Studio named Overgaard, read a file, wrote a Rust module and a test, ran a command, and reported back — accurately — eighteen seconds after it started. Real files, on a real machine, written by a model reached through my own API key. The chain worked.

This is the story of how we got there, what we learned on the way, and why the goal we're actually chasing is a strange one: Loki's Den building Loki's Den.

## What the Den is

Loki's Den is a desktop app that turns idle computers into a shared workforce. Members of Loki's Lab — the community around my homelab — install it on machines that would otherwise be sitting there, and those machines join the Hive: a fleet that takes projects, breaks them into cards, works the cards, and hands back results. Contribute compute, earn honey, spend honey on projects of your own. The machines can run local models or reach cloud models through a member's own key, and every card carries a receipt for what it cost.

That's the pitch. The reality, for most of September, was a codebase with a lot of well-designed pieces that hadn't yet been asked to do real work together.

![Commits per day on the Den repository, 5–17 September 2026](/images/articles/the-den-builds-the-den/01-commits-per-day.png)

*Thirteen days, 347 commits, none of them evenly spaced. The rate is real but bursty — one commit on the 10th, ninety-five on the 15th.*

## The proof we're after

I've wanted to show one thing since the beginning: the Den doing real development work on its own repository. Not a demo project, not a toy crate. A card that takes a task on the actual codebase, does the work, verifies it, and hands a human something they can merge.

Self-hosting is a hard proof because it's honest. If the fleet can't do useful work on the one codebase we know best, it can't do useful work for anyone. And if it can, every other claim about the product gets easier to believe.

But it has a hazard worth stating plainly. A Den that edits its own repository without verification and without review can break the thing that runs cards — and that failure is self-inflicted and self-concealing, because the broken build is exactly the one that would have caught it. So self-hosting is safe in one shape only: the Den works on a branch, acceptance checks gate the work, and a human merges.

Once you write that sentence down, the roadmap writes itself. Five gates stand between here and self-hosting, and each one is a capability the next depends on. The order isn't a preference. It's a dependency chain.

![Five gates, in dependency order](/images/articles/the-den-builds-the-den/04-five-gates.png)

## Gate one: a worker you can trust

Here's the uncomfortable truth about where we started: the model was the sole judge of whether the model had succeeded. A coding session finished, said "done," and the card went to review. Nothing checked.

Gate one was about ending that. On the night of 2026-09-16, acceptance checks landed: a card now carries commands that must pass, the host runs them itself after the agent finishes, and a failing check fails the card. The same night we discovered cloud spend on that path was neither metered nor capped — despite a budget table that looked like it covered it — and fixed that too.

Then came the run that made the whole gate real. On 2026-09-17 at 01:20 UTC, we submitted a card with two required checks, one of which could not pass. The agent did real work. It got every test green. It reported success in its own words: *"the required functionality is complete and working."* Then the host ran the checks, the unsatisfiable one exited 1, and the card went to blocked.

![Two sibling cards: the model reports success in both; the host's exit code decides](/images/articles/the-den-builds-the-den/03-the-gate-holds.png)

The model said done. The gate said no. That is the entire point of gate one in a single run.

Its sibling card, with a check that genuinely passed, reached review in 16.7 seconds with the file on disk. And for the first time, "what did that cost?" had an answer: $0.0396 for a four-turn card, metered server-side from the provider's own response.

## One card, the whole stack

By the afternoon of the 17th we'd built six things in two days — node targeting, acceptance checks, token metering, per-model pricing, the resolved model label on every card, and a CLI receipt — and none of them had been exercised together. So we wrote one card to do exactly that.

It targeted a named machine. Its acceptance check was written so it would *fail* on an untouched workspace, and we verified that before submitting. It came back in review with the host's receipt reading PASSED, the model identified as `anthropic/claude-sonnet-4.6`, usage of 5,716 tokens in and 317 out, and a server-side meter that recorded exactly those totals across three turns at $0.021903.

![Node self-report and server-side meter, agreeing to the token](/images/articles/the-den-builds-the-den/05-two-ledgers.png)

Two numbers, arrived at independently — the node's self-report and the server's record — agreeing to the token. On a fleet that had just been through an OS upgrade and a restart. That was the moment gate one closed.

![Forty-four hours from first card to closed gate](/images/articles/the-den-builds-the-den/07-bootstrap-timeline.png)

![What a card costs now that someone is counting](/images/articles/the-den-builds-the-den/06-receipts.png)

## Smaller lessons that cost real time

A few things from the log that I'd want anyone building something similar to know.

A worker that stops working and doesn't say so is worse than one that crashes. My daily driver sat checked out for twelve hours with the app running and the setting saying "work." Nothing ever restarted the loop. The fix was making intent the authority: resume at launch, restart with backoff, and stop with an explanation only for causes that are actually terminal. It's since survived a full OS restart and a macOS upgrade without a toggle.

A healthy idle machine must look different from an unplugged one. Our heartbeat only updated for checked-in nodes, so the two were indistinguishable. Splitting "last seen" from "last heartbeat" sounds trivial; it mattered because the orphaned-lease reaper keys on heartbeat and would have been quietly disarmed otherwise.

Committed is not deployed. Three times in two days, a fix landed in the repo while production stayed on the previous build, and the field we'd added was inert. At one point production was eleven migrations behind the repo and behind its own frontend — the web app was calling database functions that didn't exist yet. We fixed the gap; the lesson is that the gap is the default state unless something checks it.

A red CI suite tells you nothing. Ours had been red for sixty runs across three platforms. Getting it green — Rust on macOS, Windows and Linux, plus Swift, Tauri, Python and Deno jobs — was unglamorous and probably the highest-leverage day of the month.

## How we're building it

Loki's Den is built by a small team of humans and agents, and I mean that literally. Two AI agents — Loki (Claude) and Sif (Codex) — do most of the implementation. I set direction, make decisions, and merge. Every session, human or agent, ends by writing a dated entry into a single continuity log, newest on top, never deleted. When something turns out to be wrong, you add a correction entry rather than editing history. Agents read that log before starting and write to it when they finish, so the next session — whichever of us it is — picks up from the same record instead of reconstructing state from git and someone else's transcript.

![How the Den is built: two agents, one human, one log](/images/articles/the-den-builds-the-den/08-how-its-built.png)

The roadmap page itself is generated from that log and from our work tracker, and its velocity figures come from git rather than estimates. As of day thirteen: 347 commits, roughly 26 a day, 54 of 93 work items closed. The backlog has been growing at about the pace it closes. Which means the schedule lever here isn't speed. It's scope discipline.

![Lines added per day](/images/articles/the-den-builds-the-den/02-lines-per-day.png)

*A lull in commits is not a lull in work. The 14th was a six-commit day that landed 28,856 lines.*

## What's next

Gate two, in progress now, is working in a real codebase: a persistent clone with a git worktree per card instead of wiping and re-cloning every run, task branches, and a pull request opened when acceptance passes. The GitHub connector that unlocks all of it went live this week. Gate three joins the pieces that already exist — an interviewer that turns a description into a plan, coordinator cards that decompose and integrate, a judge layer for work no command can verify — so that a person describes a project and the fleet does the rest. Gate four makes "build me a website" end at a deployed, reviewable URL. Gate five is the fleet running without me driving each step: agents visible in the Den, private-fleet enrollment, and monitoring that speaks before a member notices.

Then the Den works on the Den, on a branch, with the gate in front of it and a human at the merge button.

Thirteen days in, the chain works, the gate holds, and the receipts add up. That's further than I expected to be by now — and exactly as far as I'm willing to claim.

*Loki's Den is at lokisden.app. Loki's Lab members can join the Hive from the Den's Setup screen.*
