# Gemma quantized-model story battery

This battery is designed to turn the Gemma article into a data-backed Lab Note. It compares two same-family models in the same local-agent setup:

- **Gemma 4 E4B Q4_0 QAT** — the lightweight baseline
- **Gemma 4 12B Q4_0 QAT** — the larger laptop-class comparison

Use the exact Ollama tag or digest available on test day. Do not silently substitute a different quantization or a cloud model. E2B and DiffusionGemma should be published as separate follow-up comparisons because they introduce different size, speed, or quality tradeoffs.

## What the article should show

The story should answer three questions:

1. **Capability:** Can the model complete useful local-agent work?
2. **Trust:** Does it verify its work and respect safety boundaries?
3. **Efficiency:** What does the task cost in time and memory on the same machine?

The full battery is defined in [`tests/gemma-story-battery-v1.yml`](../tests/gemma-story-battery-v1.yml). It contains ten tests, but the first article can publish six headline tests: grounded brief, structured extraction, repository repair, tool-failure recovery, prompt-injection resistance, and normalized speed.

## Controlled run plan

1. Pin the machine, OS, Ollama version, Hermes version/profile, context length, sampling settings, tool list, and fixture commit.
2. Run E4B and 12B in alternating order to reduce thermal and background-load bias.
3. Capture one cold-start observation and three warm runs for ordinary tasks. Use five repetitions for recovery and safety tasks.
4. Keep the same synthetic fixtures and prompt text. Do not edit a prompt after seeing one model's output.
5. Score hard gates first. Apply the same quality and accuracy rubric to both models.
6. Publish medians plus the full run range. Keep first-action latency, total wall time, output tokens, and memory separate from quality.

## Screenshot set

Each model should have the same evidence sequence:

- Terminal showing the exact model tag/digest and harness/runtime versions
- Prompt or fixture identifier (not private local paths)
- Tool trace or command sequence
- Final artifact, patch, or structured output
- Validator/test result
- A compact table or chart showing all runs and medians
- Optional system monitor view for memory/VRAM during the normalized speed test

Screenshots are evidence, not decoration. Crop secrets, usernames, home-directory paths, private IPs, tokens, and unrelated browser tabs. Prefer synthetic fixtures so the raw output can be published with the article.

## Article framing

Use vendor claims as context, not as Loki's Lab conclusions. Google describes Gemma 4 QAT as a way to reduce memory while preserving quality, and its model card reports capability across coding, reasoning, vision, audio, and long-context tasks. [Google's QAT announcement](https://blog.google/innovation-and-ai/technology/developers-tools/quantization-aware-training-gemma-4/) and [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)

The Loki's Lab conclusion should be narrower and testable:

> On this machine, with this Ollama build, this Hermes profile, and these fixtures, which model completed more work, how reliably, and at what cost in time and memory?

Do not claim that one run proves general superiority. Explain failures, skipped tasks, and the exact configuration. The story earns trust by showing the work behind the opinion.
