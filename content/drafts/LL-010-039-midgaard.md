---
title: "Fleet Skill Matrix v2 Methodology"
short_title: "Fleet Skill Matrix v2 Methodology"
date: "2026-08-30"
---


-

# DOC 1 — Fleet Skill Matrix v2 Methodology (LL-010)

## 1.0 Overview
This document defines the standardized procedure for generating scores within the Loki’s Lab Fleet Skill Matrix. The objective is to ensure that every benchmark result represents a comparable, reproducible measure of model capability against hardware constraints and specific task definitions. All published scores must adhere to this framework to maintain integrity and transparency.

## 2.0 Test Suite Definition
The v2 Methodology utilizes exactly 19 starting tests selected for stability and coverage. These tasks are categorized into logical clusters. A score is only generated if the model attempts the task successfully or fails consistently.

### 2.1 Logical Reasoning (3 Tests)
*   **Test 01:** Arithmetic Word Problems.
*   **Test 02:** Abstract Pattern Recognition.
*   **Test 03:** Causal Inference Tasks.

### 2.2 Coding and Technical Implementation (4 Tests)
*   **Test 04:** Python Script Generation from Docstring.
*   **Test 05:** Refactoring Legacy Code.
*   **Test 06:** Bug Detection in Short Snippets.
*   **Test 07:** API Endpoint Documentation Creation.

### 2.3 Mathematical Computation (3 Tests)
*   **Test 08:** Calculus Problem Solving.
*   **Test 09:** Probability and Statistics Queries.
*   **Test 10:** Numerical Reasoning under Time Constraint.

### 2.4 Knowledge and RAG (4 Tests)
*   **Test 11:** Factual Recall on General Knowledge.
*   **Test 12:** Context Window Retention over 64k tokens.
*   **Test 13:** Multi-step Retrieval Reasoning.
*   **Test 14:** Hallucination Resistance in Fact-Checking.

### 2.5 Language and Creativity (4 Tests)
*   **Test 15:** Creative Writing Prompt Adherence.
*   **Test 16:** Sentiment Analysis Accuracy.
*   **Test 17:** Translation Quality Assessment.
*   **Test 18:** Instruction Following in Multilingual Contexts.

### 2.6 Utility and Safety (1 Test)
*   **Test 19:** Harmful Content Refusal Rate.

## 3.0 Scoring Protocol
To mitigate variance caused by temperature sampling or stochastic generation, we utilize a strict median-of-three scoring protocol.

### 3.1 Execution Cycle
For each test ID:
1.  Run the task three times using the same seed configuration unless the task is inherently deterministic (where one run is used).
2.  Record the raw score for each execution.
3.  Sort the three scores in ascending order.
4.  Identify the median value as the official result.

### 3.2 Outlier Handling
If the distribution of results deviates significantly from a tight cluster, we investigate environment logs. If two runs are valid and one is a clear outlier (defined as greater than 15% deviation from the mean of the three), we recalculate using only the remaining two runs if applicable to the test definition, or default to the single run median for non-deterministic tasks.

### 3.3 Normalization
Raw scores are normalized against a baseline dataset published alongside the matrix release notes.

## 4.0 Budget Classification
All results are tagged with a hardware budget tier based on total system acquisition cost at time of build.
*   **Entry:** Total Hardware Cost <= $1,500 USD.
*   **Midrange:** Total Hardware Cost is $1,501 to $3,000 USD.
*   **High-End:** Total Hardware Cost > $3,000 USD.

These tiers are used to stratify leaderboard segments and ensure fair comparison between hardware constraints.

## 5.0 Data Field Definitions
Every benchmark entry must populate the following fields:

### 5.1 Model Fields
*   **Model Name:** Full official identifier (e.g., Llama-3-8B).
*   **Version Number:** Specific revision hash or release date.
*   **Context Window:** Maximum supported token count verified.
*   **Quantization Level:** FP16, INT4, etc.

### 5.2 Hardware Fields
*   **GPU Model:** Chipset model (e.g., RTX 4090).
*   **VRAM Size:** Total physical memory available.
*   **RAM Capacity:** System system RAM size.
*   **CPU Threads:** Logical processor count.

### 5.3 Budget Tier
Derived from the Hardware Fields using the ranges in Section 4.0.

## 6.0 Coverage and N/A Handling
Coverage indicates the percentage of the 19 starting tests successfully executed on a given run.

*   **N/A Criteria:** A test is marked as N/A only if the model lacks specific architectural support for that task type (e.g., a pure text-only model receiving a visual grounding task). This requires a flag in the metadata JSON and must not be treated as a failed run.
*   **Coverage Calculation:** Reported as a percentage of 19 tests completed versus skipped due to N/A.

## 7.0 Known Limitations
Users must acknowledge specific limitations inherent to this methodology:
*   **Temperature Sensitivity:** Scores may fluctuate with sampling parameters not strictly controlled in this v2 methodology.
*   **Context Collapse:** Long-context tests (Test 12) are capped at specific token limits.
*   **Hardware Variance:** Scores from the Entry tier assume standard power supply and cooling profiles; overclocked systems are not benchmarked here.

## 8.0 Reproducibility Requirements
To challenge a published score, an independent party must be able to:
1.  Access the specific prompt set associated with the Test ID.
2.  Replicate the hardware configuration or equivalent class within the same budget tier.
3.  Run the median-of-three protocol documented in Section 3.0.
4.  Match the normalized score within a margin of error of 5% to claim statistical parity.

***

# DOC 2 — Weekly Editorial Operating Rhythm (LL-039)

## 1.0 Objective
This document defines the operational cadence for Loki’s Lab content creation and moderation. The process is designed for a solo operator environment where automation handles data gathering, but human oversight ensures quality control. The goal is consistent output without sacrificing editorial integrity.

## 2.0 Human-in-the-Loop Policy
Automation tools are permitted to draft text, collect raw results, and summarize discussion threads. However, the human operator retains full authority over:
*   **Source Approval:** Deciding which news feeds or data sources are trusted for inclusion.
*   **Claim Verification:** Validating all factual assertions made in articles or benchmark summaries.
*   **Result Status:** Determining if a benchmark score is stable enough to publish or if it requires re-running.
*   **Corrections:** Authorizing any post-publication edits or errata releases.
*   **Publication Sign-Off:** The final gate before content goes live to Discord, Newsletter, or Website.

## 3.0 Weekly Cadence Breakdown
The solo operator follows this weekly rhythm to balance workload and output quality.

### 3.1 Monday: Trusted Feed Review
*   **Task:** Scan trusted news feeds for new model releases, hardware benchmarks, or community corrections.
*   **Action:** Curate the week's topics. Discard noise immediately.
*   **Output:** A prioritized list of potential articles or lessons.

### 3.2 Tuesday: One Test and Configuration
*   **Task:** Conduct deep benchmark work on exactly one test configuration identified Monday (e.g., fine-tuning a specific model variant for Test 12).
*   **Action:** Run the full v2 Methodology sequence. Document results manually.
*   **Output:** Raw data ready for analysis.

### 3.3 Wednesday: One Article or Lesson Draft
*   **Task:** Write and draft one piece of content based on Tuesday's work or Monday's curation.
*   **Action:** Focus on clarity, avoiding over-promising results not yet verified.
*   **Output:** First draft ready for internal review.

### 3.4 Thursday: Submission Moderation
*   **Task:** Review community submissions for blog posts, discord threads, or test requests.
*   **Action:** Approve valid contributions or provide constructive feedback.
*   **Output:** A queue of moderated content ready for final editing.

### 3.5 Friday: Newsletter and Discord Summary
*   **Task:** Compile the weekly summary email and update Discord channels.
*   **Action:** Include highlights from Tuesday's benchmarks and Thursday's community interactions.
*   **Output:** Scheduled distribution lists confirmed.

### 3.6 Saturday: Maintenance and Cleanup
*   **Task:** System updates, hardware health checks, and cleaning up data logs.
*   **Action:** Ensure automation scripts are running correctly for the next week.
*   **Output:** Fresh environment ready for Monday.

## 4.0 Automation Roles
To support the human operator, automation tools have restricted permissions:
*   **Data Collection:** Scrape test results and feed URLs without modification.
*   **Drafting:** Generate skeleton text based on structured prompts from the editor.
*   **Collection:** Aggregate community links for moderation review.

The human must read and approve every draft generated by automation before it is presented to the final publication stage. This prevents hallucinated claims or biased summarization from slipping into the public record.