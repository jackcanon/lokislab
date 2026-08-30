# Benchmark submissions

## Purpose

Loki's Lab accepts community benchmark evidence without treating every upload as equally trustworthy. The submission JSON is public evidence after privacy review; the contributor's verified email and internal review notes remain private.

The Google Form writes to the private [Loki's Lab Benchmark Review Queue](https://docs.google.com/spreadsheets/d/1z-4dsjSnQcXDymM8Aso2JtPQ3DgCG97CW8n9qAGhtzU/edit). Form-owned columns must not be renamed or removed. Moderation columns begin at `Review Status`.

The canonical working checkout is `/Volumes/10TB JBOD/Agents/Claude/Projects/Websites/lokislab/`; the repository handoff is recorded in [`WORKSPACE.md`](WORKSPACE.md).

## Test catalog status

Fleet Skill Matrix v2 remains the immutable launch baseline. The repository currently contains its envelope, validator, and examples, but the original 19 prompts, fixtures, validators, and rubrics still need to be imported from the Fleet Eval source. The recommended real-work additions are defined separately in [`tests/agent-work-v1.yml`](../tests/agent-work-v1.yml). They must be published as a new suite and must not be retroactively applied to v2 scores.

## Status model

| Status       | Meaning                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------ |
| New          | Received but not yet checked                                                                     |
| Validating   | JSON/schema checks are running or being reproduced                                               |
| Under review | Visible transparency state when a decision or evidence is pending                                |
| Unverified   | Schema-valid and privacy-safe, but not independently reproduced or submitted by a trusted tester |
| Verified     | Manually approved after evidence review or reproduction                                          |
| Rejected     | Malformed, unsafe, duplicate, ineligible, or withdrawn                                           |

`Verified` is always a manual decision. Invitation-only trusted contributors may have a lighter evidence workflow, but their contributor status does not make a result verified automatically.

## Publication gate

`Leaderboard Ready` may be checked only when all of the following are true:

1. The uploaded file parses as JSON.
2. `JSON Validation` is `Valid`.
3. `Privacy Review` is `Clear`.
4. The submission ID is unique.
5. The suite and suite version exist and are compared only with like versions.
6. Each applicable official test has three runs.
7. The result status is `Unverified` or `Verified`.
8. Any requested evidence has been received or the reviewer has documented why it is not required.

The public result must never expose the response timestamp, email address, internal review notes, or a private evidence URL.

### Website publication feed

The website reads a sanitized JSON projection from the bound Apps Script web app. The private Sheet is never shared publicly. The feed repeats the full publication gate and re-validates the uploaded JSON before constructing an entry.

The website applies a second status allowlist and discards any feed entry that is not explicitly `Unverified` or `Verified`. `New`, `Validating`, `Under review`, `Rejected`, malformed, or unknown statuses fail closed. Leaderboards are separated by suite ID and version so unlike benchmark versions are never ranked together.

## JSON contract

The canonical machine-readable contract is [`schemas/benchmark-submission.v1.schema.json`](../schemas/benchmark-submission.v1.schema.json). A safe fixture is available at [`examples/benchmark-submission.v1.example.json`](../examples/benchmark-submission.v1.example.json).

The v1 envelope records:

- immutable submission, suite, and suite-version identifiers;
- Hermes version and fixed profile;
- hardware, OS, architecture, and memory;
- Ollama runtime and exact model version;
- publisher, Loki-tuned, or custom configuration labels;
- three numbered runs per applicable test;
- scores, timing, raw output, notes, and timestamps.

The current v1 envelope does not yet require expected artifacts, tool traces, failure reasons, memory, energy, or p95 timing. These are planned extensions for the agent-work and performance tracks; adding them requires a schema version or an explicitly backward-compatible schema revision.

Old Fleet Skill Matrix single-result JSON remains readable as transition evidence, but the validator marks it `under_review`. It must be wrapped with the rest of the run set before leaderboard publication.

## Local validation

Run:

```sh
npm run validate:submission -- path/to/submission.json
```

The validator emits one of four decisions:

- `valid`: structurally valid, three-run complete, and no obvious private data found;
- `under_review`: readable but incomplete or in the legacy single-result format;
- `privacy_blocked`: structurally acceptable but contains an email, user path, private IP address, or credential-like value;
- `invalid`: malformed JSON or a structural/scoring error.

The privacy scan is a safety net, not a guarantee. A human privacy review remains mandatory before publishing raw output.

## Review sequence

1. Confirm the Form submission ID matches the JSON `submission_id`.
2. Download the file from the private response row.
3. Run the validator and record its decision in `JSON Validation` and `Privacy Review`.
4. Check the suite version, model/version, system description, OS, and Hermes profile against the Form row.
5. Request evidence when something is inconsistent, exceptional, or selected for verification.
6. Set the public status, reviewer, review notes, and review date.
7. Check `Leaderboard Ready` only after the publication gate is satisfied.
8. Add the public result URL after publication.

## Automation boundary

The free automation source is maintained in [`scripts/google-apps-script`](../scripts/google-apps-script). Once installed in the response Sheet, it sets new rows to `Validating`, fetches the uploaded JSON, checks the v1 structure, detects duplicate submission IDs, flags probable private data, and assigns either `Unverified` or `Under review`. It cannot grant `Verified` status, check `Leaderboard Ready`, or publish a privacy-flagged file automatically. Its public endpoint remains read-only and cannot change moderation state.
