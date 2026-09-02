---
title: "Account & Contributor Specs"
short_title: "Account & Contributor Specs"
date: "2026-08-30"
---


-

# Loki's Lab — Account & Contributor Specs (LL-031, LL-032)

> Drafted statically (vanaheim Ollama was offline at generation time). Design-only; needs implementation + review.

## LL-031 — Account sign-in when justified

Support the following providers, but ONLY enable when volume justifies the operational cost:
- Passwordless email (magic-link)
- GitHub OAuth
- Google OAuth
- Discord OAuth

Rules:
- Provider linking is secure (PKCE/OAuth2), optional, and documented.
- Remains within the annual infrastructure budget (~$150/yr target).
- Sign-in is gated behind a volume threshold; until then the site stays read-only/public with no accounts.
- No PII exposed; email used only for auth + (optional) contribution attribution.

## LL-032 — Contributor profiles and history

- Optional public contributor name + contribution history (linked to submissions, lessons, Lab Notes).
- Submission email is NEVER shown publicly.
- Users may stay pseudonymous.
- Users may request correction or removal of their profile data (GDPR-style erase path).
- Profile data sourcing: derived from approved/published work only.

## Open questions
- Where do accounts live? (D1 user table per LL-021 storage model.)
- Rate limits / abuse on account creation?
- Discord ID linkage vs separate identity?
