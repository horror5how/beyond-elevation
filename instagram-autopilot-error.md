# Instagram Autopilot — BLOCKED: Expired Token (2026-07-02)

## Status

**Carousel slides are ready. Pipeline works. The ONLY blocker is an expired Instagram access token.**

## What works

- GitHub Actions runs (not billing-blocked) ✓
- Playwright renders all 6 slides from HTML ✓
- Slides committed to repo CDN (raw.githubusercontent.com) ✓
- graph.facebook.com reachable from GitHub Actions ✓
- Caption ready (Human Purpose of Work pillar) ✓

## What is broken

The Instagram access token `EAASS...ZD` expired **2026-06-25**. Every run since then fails at the "Publish to Instagram" step with **error 190** (token expired).

Run history: June 28, 29, 30, July 1, July 2 — all FAILED with same expired token. The same token is hardcoded in:
- `.github/workflows/instagram-post.yml` (env: ACTIVE_IG_TOKEN)
- `.github/workflows/instagram-relay.yml` (config.json / input)

## How to fix (one-time, 5 minutes)

1. Go to **https://developers.facebook.com** → Your App → Tools → Graph API Explorer
2. Select your Instagram Business account and generate a new **long-lived user token** with scopes: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
3. Update the token in `.github/workflows/instagram-post.yml`:
   - Find the line: `ACTIVE_IG_TOKEN: EAASSEUy7BCo...`
   - Replace with the new token
4. Commit and push → the next autopilot run will post successfully

## What the next run will post

- **Pillar**: Human Purpose of Work
- **Hook**: "Most people don't quit jobs. They quit feeling like their work matters."
- **Slides**: 6 slides already rendered and committed
- **Caption**: See `instagram-queue/next-caption.txt`

---
*Last updated: 2026-07-02 by cloud autopilot session*
