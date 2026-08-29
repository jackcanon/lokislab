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

## Public leaderboard feed

The same script can expose a read-only JSON feed for the website without making the response Sheet public.

1. Run `previewPublicLeaderboardFeed` and confirm the log contains only rows intended for publication.
2. Choose **Deploy → New deployment → Web app**.
3. Set **Execute as** to the project owner and **Who has access** to anyone.
4. Copy the `/exec` URL into the hosted site's `LOKISLAB_LEADERBOARD_FEED_URL` setting.

The feed uses an allowlist, not a blocklist. A row appears only when `Review Status` is `Unverified` or `Verified`, JSON is `Valid`, privacy is `Clear`, evidence is `Not requested` or `Accepted`, and `Leaderboard Ready` is checked. The uploaded file is parsed and validated again at request time.

The response excludes the submitter's email, response timestamp, internal review notes, private evidence URLs, consent text, and raw benchmark output. It publishes only the fields needed to render and compare a leaderboard entry.
