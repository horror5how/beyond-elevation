# Instagram Autopilot — BLOCKED: Expired Token (updated 2026-07-07)

## Status

**All pipeline steps work. The ONLY blocker is an expired Instagram access token.**

## What works

- GitHub Actions runs (not billing-blocked) ✓
- Playwright renders all 6 slides from HTML ✓
- Slides committed to repo CDN (raw.githubusercontent.com) ✓
- graph.facebook.com reachable from GitHub Actions ✓
- Caption and slides ready (Pillar 3: How to Become Fractional) ✓

## What is broken

The Instagram access token `EAASS...ZD` expired **2026-06-25**. Every run since then fails at the "Publish to Instagram" step with **error 190** (token expired).

Confirmed from GH Actions run #28868432512 (2026-07-07T13:05:44Z) — step 8 "Publish to Instagram" failed, all other steps succeeded.

Run history: June 28, 29, 30, July 1, 2 (×2), July 3 (×3), July 4, July 6, July 7 (×3) — all FAILED with same error 190.

The same expired token is hardcoded in:
- `.github/workflows/instagram-post.yml` (env: ACTIVE_IG_TOKEN, line 24)

Note: `horror5how/instagram-autopilot` repo referenced in cloud run scripts does not exist.
Direct calls to `graph.facebook.com` are blocked (HTTP 403) in the cloud session environment — GitHub Actions is the only viable publish path.

## How to fix (one-time, 5 minutes)

1. Go to **https://developers.facebook.com** → Your App → Tools → Graph API Explorer
2. Select your Instagram Business account and generate a new **long-lived user token** with scopes: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
3. Update `.github/workflows/instagram-post.yml` line 24 — replace the `ACTIVE_IG_TOKEN` value with the new token
4. Commit and push → the workflow triggers automatically and the carousel goes live

## What the next run will post (ready to go)

- **Pillar**: How to Become Fractional (Pillar 3)
- **Hook**: "Most people take 18 months to decide. The ones doing it took 6 weeks."
- **Slides**: 6 slides rendered and committed to `instagram-queue/slides/rendered/`
- **Caption**: `instagram-queue/next-caption.txt`

Once token is renewed, touching either `instagram-queue/next-caption.txt` or `instagram-queue/slides/slide-1.html` triggers the workflow automatically.

---
*Last updated: 2026-07-07 by cloud autopilot session (run #28868432512)*
