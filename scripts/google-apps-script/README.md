# Google Sheets validator setup

This free Apps Script turns the linked Google Form response Sheet into an automatic first-pass review queue. It never grants `Verified` status and never checks `Leaderboard Ready`.

## Install

1. Open the private **Loki's Lab Benchmark Review Queue** Sheet.
2. Choose **Extensions → Apps Script**.
3. Replace the starter contents of `Code.gs` with this directory's `Code.gs`.
4. Save the project as **Loki's Lab Submission Validator**.
5. Run `installOrRepairTrigger` once and approve the requested access to the response Sheet and uploaded Drive files.
6. Return to the Sheet and reload it. A **Loki's Lab** menu will appear.

## What happens on submission

- The row moves through `Validating` to either `Unverified` or `Under review`.
- Duplicate submission IDs and a Form/JSON ID mismatch are flagged.
- Canonical v1 structure, three-run coverage, scores, timestamps, and supported OS/configuration values are checked.
- Obvious email addresses, user-directory paths, private IP addresses, and credential-like strings block privacy approval.
- The automated findings appear as a note on the row's **Review Notes** cell, leaving any human-entered review text untouched.
- `Verified`, the reviewer identity, and publication remain manual.

Use **Loki's Lab → Validate selected submission** to recheck an existing row after replacing or correcting its JSON file.
