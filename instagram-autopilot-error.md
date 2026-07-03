# Instagram Autopilot — BLOCKED: Expired Token (2026-07-03)

## Status

**Carousel slides are ready and rendered. Pipeline works end-to-end. The ONLY blocker is an expired Instagram access token.**

## What works

- GitHub Actions runs (not billing-blocked) ✓
- Playwright renders all 6 slides from HTML ✓
- Slides committed to repo CDN (raw.githubusercontent.com) ✓
- graph.facebook.com reachable from GitHub Actions ✓
- Caption ready (The Fractional Future pillar) ✓

## What is broken

The Instagram access token `EAASS...ZD` expired **2026-06-25**. Every run since then fails at the "Publish to Instagram" step with **error 190** (token expired).

Confirmed from GH Actions logs (run #28681500726, 2026-07-03T20:14:41Z):
```
Error: IG token expired: Session has expired on Thursday, 25-Jun-26 23:32:48 PDT.
code: 190
```

Run history: June 28, 29, 30, July 1, 2 (×2), July 3 (×3) — all FAILED with same error 190. The same token is hardcoded in:
- `.github/workflows/instagram-post.yml` (env: ACTIVE_IG_TOKEN, line 24)
- `.github/workflows/instagram-relay.yml` (config.json / input)

## How to fix (one-time, 5 minutes)

1. Go to **https://developers.facebook.com** → Your App → Tools → Graph API Explorer
2. Select your Instagram Business account and generate a new **long-lived user token** with scopes: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
3. Update the token in `.github/workflows/instagram-post.yml`:
   - Find the line: `ACTIVE_IG_TOKEN: EAASSEUy7BCo...`
   - Replace with the new token
4. Commit and push → the next autopilot run will post successfully (slides already rendered)

## What the next run will post (ready to go)

- **Pillar**: The Fractional Future
- **Hook**: "Full-time employment is the riskiest career move you can make right now."
- **Slides**: 6 slides rendered and committed (GH Actions run #28681500726)
- **Caption**: `instagram-queue/next-caption.txt`
- **Rendered PNGs**: `instagram-queue/slides/rendered/slide-{1-6}.png`

Once token is renewed, push any change to `instagram-queue/next-caption.txt` or `instagram-queue/slides/slide-1.html` to trigger the workflow automatically.

---
*Last updated: 2026-07-03 by cloud autopilot session (run #28681500726)*
