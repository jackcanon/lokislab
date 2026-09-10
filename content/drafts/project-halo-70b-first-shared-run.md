---
title: "Project HALO: The Day the 70B Ran"
slug: project-halo-70b-first-shared-run
date: 2026-09-10
updated: 2026-09-10
status: published
section: Lab Notes
author: "Jack Blair"
author_slug: jack
dek: "Four computers shared a model too large for any one of their GPUs to hold. Then three computers did it faster. A good day for finding out what our existing machines can do together."
image: /images/articles/project-halo-70b-first-shared-run/halo-with-without-jotunheim.png
tags:
  - Project HALO
  - HaloBench
  - local AI
  - distributed inference
  - Apple Silicon
  - llama.cpp
---

In our first Project HALO article, we wrote about a possibility: perhaps the next AI model we wanted to try wouldn’t require another computer. Perhaps it would require the computers we already had to work together.

This morning, we got to see that happen.

At 11:26, Llama 3.3 70B completed a benchmark across four of our machines. An M4 Max Mac, an M4 Pro MacBook Pro, a Linux machine with an NVIDIA RTX 4070, and an older M1 Pro laptop each carried part of the same model.

The model file was about 42.5 GB, or 39.59 GiB as the benchmark reports it. That’s larger than the available GPU memory on any one of those machines. Together, they loaded it and completed the test.

We’re pretty excited about that.

Generation came in at roughly five tokens per second. We’ll come back to the speed, because it matters. But so does the fact that something we had only hoped would work was now showing a completed run in HaloBench.

**Harnessing AI Locally, Together.** That goal feels a little more tangible today.

## Four computers, one job

Overgaard, our M4 Max Mac Studio, hosted the run. Odin, Heimdall, and Jotunheim joined as workers over the lab’s wired network. Midgaard ran HaloBench to launch and follow the test, but didn’t hold a share of the model.

| Computer | Hardware | Planned share budget |
|---|---|---:|
| Overgaard | M4 Max, 36 GB memory | 15 GB |
| Odin | M4 Pro MacBook Pro, 24 GB memory | 13 GB |
| Heimdall | Linux PC with RTX 4070, 12 GB GPU memory | 9 GB |
| Jotunheim | M1 Pro MacBook Pro, 16 GB memory | 6 GB |

Those figures describe our intended placement budgets. They aren’t measurements of exact model bytes on each device, and they don’t turn the machines into one interchangeable block of memory.

Each computer still has its own limits. The point was to divide the work within what each could actually contribute.

There was a long loading stage while the host read the model and distributed the workers’ portions. Then HaloBench’s stages turned green, and the results arrived: about 51.2 tokens per second for processing the input and 4.97 for generation.

A fresh run later that morning returned 51.27 and 4.99. Each benchmark used three repetitions, with a 512-token input-processing test and a 128-token generation test.

![HaloBench showing the successful four-machine Llama 3.3 70B benchmark](/images/articles/project-halo-70b-first-shared-run/halobench-70b-four-machine-pass.png)

*The repeat four-machine run: 51.27 tokens/sec for input processing and 4.99 for generation. Overgaard hosted, with Odin, Heimdall, and Jotunheim contributing. The benchmark completed successfully.*

This was also our first successful 70B run combining Apple’s Metal and NVIDIA’s CUDA backends. That matters to us. The lab has grown over time, and the computers don’t all come from the same generation or run the same operating system.

We like the possibility that they can still find something useful to do together.

## The setting that changed the day

If you read the previous article, you’ll remember that our larger-model attempts were failing. We had working smaller-model runs, healthy-looking workers, and an error on the host that didn’t explain much.

The investigation led us to how this build was loading the model on the Mac host.

With the default memory-mapped loading path in our setup, splitting the model wasn’t relieving the host’s memory requirements the way we expected. The host was still trying to accommodate the full model through that path. Adding workers wasn’t solving that problem.

The benchmark tool’s default logging also hid library messages that would have helped us understand the failure sooner.

Disabling memory-mapped loading with `-lm none` allowed the host to work within the split. Forty minutes after identifying that behavior, the 70B passed.

That changes our interpretation of the earlier failures. Our suspicion about Qwen3-32B and RPC had been a useful question to investigate, but it wasn’t a settled diagnosis. The loading behavior gave us a more concrete explanation to work with in this configuration.

Sometimes progress is a bigger machine. This time, it was a setting we needed to understand and an error message we needed to see.

## Five tokens per second deserves some context

Tokens are pieces of text, rather than a fixed number of words. At this speed, a long response would take patience.

But our first question was whether these machines could share a model of this size at all. Now we have a successful benchmark, and we can start asking what the arrangement might be useful for.

Could it handle a background task where we’re happy to wait? Would access to a larger model produce an answer worth the extra time? How would it behave with a much longer input?

Those are still questions. This benchmark measures processing and generation speed. It doesn’t establish answer quality, successful agent work, or reliability over a long session. A larger model also has to earn its place by doing something useful.

The result gives us a reason to keep exploring those possibilities.

## Then we let the older laptop sit one out

Jotunheim is our M1 Pro MacBook Pro with 16 GB of memory. In the four-machine arrangement, it carried a planned six-gigabyte share.

For the next run, we removed it from the group and increased Overgaard’s planned share from 15 to 21 GB. Odin and Heimdall kept theirs.

The same model completed again, this time at 6.67 tokens per second for generation and 67.87 for input processing.

| Configuration | Input processing | Generation |
|---|---:|---:|
| Four machines, first successful run | About 51.2 tokens/sec | 4.97 tokens/sec |
| Four machines, fresh repeat | 51.27 tokens/sec | 4.99 tokens/sec |
| Three machines, larger host share | 67.87 tokens/sec | 6.67 tokens/sec |

![Two bar charts comparing the same 70B model with and without Jotunheim: generation rises from 4.99 to 6.67 tokens per second, and input processing rises from 51.27 to 67.87](/images/articles/project-halo-70b-first-shared-run/halo-with-without-jotunheim.png)

*The four-machine repeat compared with the three-machine follow-up. Overgaard’s planned share increased from 15 to 21 GB when Jotunheim sat out. Each panel has its own scale, starting at zero.*

That’s about a 34% increase in generation speed and a 32% increase in input-processing speed over the four-machine repeat.

![HaloBench showing the successful three-machine Llama 3.3 70B benchmark](/images/articles/project-halo-70b-first-shared-run/halobench-70b-three-machine-pass.png)

*The three-machine follow-up: Overgaard took a larger share, Jotunheim sat out, and generation reached 6.67 tokens/sec. This is the same model as the four-machine run above.*

Expressed another way, the average time per generated token fell from about 200 milliseconds to 150. Removing the laptop and reallocating its work saved roughly 50 milliseconds per token in this comparison.

That measures the change in configuration. It doesn’t separate the cost of the network connection from the difference in processing speed or the changed placement on the host.

Still, there’s a useful lesson here: the best group may be smaller than the group we have available.

An older computer could provide the extra capacity that makes a particular placement possible. When a faster machine has room for that work, including the older one may slow things down. We want HALO to understand those tradeoffs rather than invite every available computer into every job.

That makes measuring each machine’s available capacity and performance feel even more worthwhile.

## We have a working run. We still have work to do.

All of this happened on wired gigabit Ethernet, with round trips under a millisecond. Our machines currently live in different spaces, but these tests kept them on the lab’s local network.

The larger ambition includes the possibility of people contributing computers from elsewhere. Today’s result doesn’t tell us how well that would work across the internet.

We also had an earlier attempt with memory-mapped loading disabled lose a worker connection during upload. That remains unexplained. The successful runs don’t erase it.

Next, we want to deliberately interrupt a worker during generation and record what happens. We also plan to compare output from all-Mac, mixed Mac-and-NVIDIA, and CPU configurations using the same prompt and deterministic settings.

Then we’ll add controlled network delays of 25, 50, and 100 milliseconds to one connection. That should help us understand how sensitive this arrangement is to latency, although it won’t reproduce every complication of a real internet connection.

These are the next entries in the log. What works, what changes, and what falls apart when we ask a little more of it.

For today, we’ve crossed a meaningful line. A model too large for any one of our participating GPUs completed its benchmark by sharing the work. Then we changed the group and made it faster.

There’s still plenty between this and a dependable system people can use. But the idea that brought us here now has a successful run behind it.

Our computers did something together that we couldn’t fit on one GPU alone. We’re looking forward to seeing what else that makes possible.
