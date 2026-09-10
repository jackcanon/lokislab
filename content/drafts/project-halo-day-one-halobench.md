---
title: "Project Halo, Day One: Can Six Macs and a Linux Box Run One Model Together?"
slug: project-halo-day-one-halobench
date: 2026-09-10
updated: 2026-09-10
status: published
section: Lab Notes
author: "Jack Blair"
author_slug: jack
dek: "\"We’re connecting the computers we already have to find out whether they can run larger AI models together. The first runs worked. The bigger model didn’t. Both belong in the story.\""
image: /images/articles/project-halo-day-one-halobench/halobench-dashboard-2026-09-10.jpg
tags:
  - - Project Halo   - HaloBench   - local AI   - distributed inference   - Apple Silicon   - home lab
---

# Project Halo, Day One: What If Our Computers Could Do This Together?

![Concept illustration of the six fleet computers together in a rack with Ubiquiti networking](/images/articles/project-halo-day-one-halobench/project-halo-fleet-rack-ubiquiti.png)

*A vision for Project HALO: Harnessing AI Locally, Together. This AI-generated concept brings the six machines from our fleet deck into one rack; they currently live in different spaces.*

There’s a particular moment in running local AI when curiosity runs into the specifications of your computer.

You find a model you’d like to try. You look at the memory it needs. Then you look at the machine on your desk.

Well. That’s disappointing.

Here at Loki’s Lab, we have a few computers. Some are busy with everyday work. Some have room to spare. Individually, each has its limits. But looking around the lab, it’s hard not to wonder: could they help each other?

Could a Mac on the desk, a laptop nearby, and a Linux machine down the hall share the work of running one larger AI model? Could the computers we already own give us access to something none of them could comfortably handle alone?

That’s the possibility behind Project Halo. And we’re excited enough about it to start plugging things in and finding out.

## What we hope Halo can become

**Harnessing AI Locally, Together.**

That’s the goal of Project HALO: finding out what the computers we already have can make possible when they work together.

Our goal is to spread a single model across several computers, with each carrying part of it. We want to know whether that can make larger models practical on the hardware already sitting around us.

Getting a model to load would be a start. Getting a useful response without waiting so long that you forget the question would be better.

There’s something appealing about that idea beyond the technical challenge. An older laptop might still have a useful contribution to make. A machine that spends part of its day idle could become part of something bigger. We like finding more possibilities in equipment we already have.

We’re starting on the lab’s wired network. The broader idea of people contributing machines is further down the road, with plenty of unanswered questions between here and there.

This is the first entry in that process: what we tried, what worked, what broke, and what we want to try next.

## Meet the computers

Naturally, everyone in the lab has a Norse name. It makes the reports easier to follow, and occasionally makes troubleshooting sound like a family disagreement.

| Name | Hardware | Memory | Where it fits so far |
|---|---|---|---|
| Midgaard | Mac mini, M4 Pro | 24 GB | Everyday work machine and test host |
| Odin | MacBook Pro, M4 Pro | 24 GB | Participating Mac worker |
| Overgaard | M4 Max | 36 GB | Fastest single-machine reference so far; also hosts shared runs |
| Asgard | M2 Pro | 16 GB | Mac worker |
| Jotunheim | MacBook Pro, M1 Pro | 16 GB | Tested alone; shared run still ahead |
| Heimdall | Ryzen 5900X and RTX 4070 | 62 GB system RAM; 12 GB GPU memory | NVIDIA worker |
| Vanaheim | M1 | 8 GB | Smaller-machine candidate for later |

Those memory figures don’t simply add up to one big, freely available pool. Each computer has its own operating system, workload, and limits. Discovering how much it can actually contribute is part of the work.

We’re using llama.cpp’s RPC backend for these experiments, with build b10883 pinned across the machines. In plain language, that gives the host a way to send part of the model’s computation to another computer.

First, we had to make sure the computers were talking over the connections we intended. A troublesome USB network adapter and some accidentally selected Wi-Fi addresses gave us an early detour. Once corrected, our wired measurements were around 935–939 Mbit/s, with round trips under a millisecond.

Before asking the computers to cooperate, it helps to check which cable they’re using.

## We built a way to remember what happened

The first evening’s tests ran from the terminal. Before long, we had enough logs to make answering “which run was that?” its own little project.

So we built HaloBench, a small macOS app for setting up runs, watching their output, and keeping the results together.

It lets us choose a model, select the participating computers, and configure the split. Every run leaves a readable report and a raw log. The dashboard gives us an overview; the reports preserve the details, including the failures.

![HaloBench dashboard showing the first 16 filed reports](/images/articles/project-halo-day-one-halobench/halobench-dashboard-2026-09-10.jpg)

*HaloBench on September 10: 16 filed reports, with 10 passes and 6 failures. Four of the 10 shared runs passed. This is a snapshot of our progress, not a controlled ranking of the machines.*

That matters because we want these articles to be a useful record. A week from now, we should be able to explain what we changed and why, without relying on someone remembering an evening of terminal windows.

## The first encouraging result

We started with Qwen3-14B in Q4_K_M, a compressed version small enough to run on individual machines. That gave us a reference before asking them to share it.

| Configuration | Response generation speed |
|---|---:|
| Midgaard alone, while in daily use | 16.4 tokens/sec |
| Odin alone, idle | 26.8 tokens/sec |
| Overgaard alone | 39.4 tokens/sec |
| Midgaard and Odin together | 18.7 tokens/sec |

Tokens are the pieces of text a model generates. These numbers describe speed in these runs; they don’t tell us how useful or accurate an answer was.

The shared run completed. It was also a little faster than Midgaard working alone, which was encouraging. We had expected it to slow down.

But Odin alone was faster than that pair, and Overgaard was faster still. More computers did not automatically mean more speed.

Later runs made that tradeoff clearer. With Overgaard hosting and Odin taking progressively larger shares, generation speed dropped from 31.4 to 17.7 tokens per second. Sharing the model worked, but how we divided it mattered.

The question we care about most is whether sharing can make a model usable when one machine doesn’t have enough room. We haven’t demonstrated that goal yet.

## The memory on the box isn’t the memory you can use

Midgaard and Odin both have an M4 Pro and 24 GB of memory. They gave us very different results.

Midgaard was carrying a normal day’s work, including substantial memory compression. Odin was idle. That makes memory pressure a plausible contributor to the gap, but this comparison alone doesn’t establish how much of the difference it caused.

It does underline a practical problem for Halo: a participating computer may also be someone’s everyday computer. We need to measure what it can spare, rather than plan around the number printed on its specifications.

We also found that loading a model wasn’t always enough. Some memory failures appeared only when computation began. A successful allocation is an encouraging first step, but it isn’t a completed run.

## Some problems were ours to fix

One early mistake came from assigning the model shares in the wrong order. In our setup, the split listed the remote devices before the local GPU. We had interpreted it the other way around, giving workers more than we intended and running them out of memory.

HaloBench now constructs that ordering for us.

Another failed run happened because the app started a worker on its CPU backend when we intended to use its GPU. We corrected that too, and improved the failure logs so the next problem would be easier to see.

These are worth recording. When an experiment fails, sometimes the idea needs work. Sometimes we’ve simply asked the computer to do the wrong thing.

## Macs and NVIDIA, working together

One result we were particularly pleased to see: the 14B model ran across Midgaard, Odin, and Heimdall’s NVIDIA GPU together, producing 14.6 tokens per second.

That gives us a successful mixed Mac-and-Linux run in this configuration. It opens an interesting possibility for a lab assembled over time, where the computers don’t all share a badge or an architecture.

A separate 14B run using the larger Q8_0 version also passed over RPC at 12.4 tokens per second. That helped rule out our initial suspicion that Q8_0 simply couldn’t work through this route.

## The larger model is still an open question

Qwen3-32B has been less cooperative.

Our shared attempts with its Q4_K_M and Q8_0 versions failed across the configurations we tried. Correcting the allocation order fixed one mistake, but it didn’t resolve the larger-model failures.

Then we ran the 32B Q4_K_M model on Overgaard alone. It completed at 18.2 tokens per second.

That narrows the investigation: the 32B model works on that machine by itself, and the 14B model works in our shared configurations. The 32B shared path remains unresolved in this build and setup.

We have something concrete to investigate and prepare a reproducible bug report around. We don’t yet have enough evidence to assign the cause definitively. The 70B attempt is on hold while we work through this.

Heimdall also gave us a separate reminder that memory isn’t the only limit. Its CPU-only fallback test reached 93°C within two minutes and tripped once. That needs attention before we treat it as a dependable option for larger workloads.

## Where we go from here

Next, we want to try a 24B-class model across machines, bring Jotunheim into its first shared run, and keep narrowing down the 32B failure.

We also need to ask a very ordinary question with potentially complicated consequences: what happens if someone closes their laptop halfway through an answer?

If Halo is ever going to involve computers people actually use, interrupted connections and disappearing workers belong in the plan. We haven’t tested that yet.

For now, we’ve seen one model run across Macs and an NVIDIA machine. We’ve made mistakes, fixed some of them, and built a better record of the ones we’re still working on.

That’s enough to keep us curious.

The possibility is still the same one that started this: maybe the next model we want to try won’t require another computer. Maybe it will require the computers we already have to do something together.

We’re looking forward to finding out.
