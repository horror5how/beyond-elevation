# Instagram Autopilot — BLOCKED: Expired Token (updated 2026-07-20)

## Status

**All pipeline steps work. The ONLY blocker is an expired Instagram access token.**

## What works

- GitHub Actions runs (not billing-blocked) ✓
- Playwright renders all 6 slides from HTML ✓
- Slides committed to repo CDN (raw.githubusercontent.com) ✓
- graph.facebook.com reachable from GitHub Actions ✓
- Caption and slides ready (Pillar 1: Human Purpose of Work) ✓

## What is broken

The Instagram access token `EAASS...ZD` expired **2026-06-25**. Every run since then fails at the "Publish to Instagram" step with **error 190** (token expired).

Confirmed across 21+ GH Actions runs — steps 1–7 succeed, step 8 "Publish to Instagram" fails.

Latest failure: run #29364353723 (2026-07-14T20:06:38Z). CI log exact error: "Session has expired on Thursday, 25-Jun-26 23:32:48 PDT."

Run history: June 28, 29, 30, July 1, 2 (×2), July 3 (×3), July 4, July 6, July 7 (×3), July 8 (×2), July 9 (×2), July 14 — all FAILED with same error 190.

The token in the task prompt (2026-07-20) is the SAME expired token: `EAASSEUy7BCo...`. No `INSTAGRAM_TOKEN` repo secret is set (confirmed: CI logs show the hardcoded fallback token unmasked, not a secret).

The expired token is hardcoded in:
- `.github/workflows/instagram-post.yml` env.ACTIVE_IG_TOKEN (line 24)
- The workflow checks `secrets.INSTAGRAM_TOKEN` first — if that repo secret is set to a valid token, no code change is needed.

Note: `horror5how/instagram-autopilot` repo referenced in cloud run scripts does not exist.
Direct calls to `graph.facebook.com` are blocked in the cloud session environment — GitHub Actions is the only viable publish path.

## How to fix (one-time, ~5 minutes)

**Option A — Repo secret (no code change needed):**
1. Go to github.com/horror5how/beyond-elevation → Settings → Secrets and variables → Actions
2. Add or update secret `INSTAGRAM_TOKEN` with a fresh long-lived token
3. Run the workflow from Actions tab or push any change to `instagram-queue/slides/slide-1.html`

**Option B — Update the workflow file:**
1. Go to **https://developers.facebook.com** → Your App → Tools → Graph API Explorer
2. Select your Instagram Business account and generate a new **long-lived user token** with scopes: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
3. Update `.github/workflows/instagram-post.yml` line 24 — replace the `ACTIVE_IG_TOKEN` fallback value
4. Commit and push → the workflow triggers automatically

## What the next run will post (ready to go)

- **Pillar**: Human Purpose of Work (Pillar 1)
- **Hook**: "AI just separated your job from your work. They were never the same thing."
- **Slides**: 6 slides in `instagram-queue/slides/slide-{1-6}.html`
- **Caption**: `instagram-queue/next-caption.txt`

Once token is renewed, push any change to `instagram-queue/slides/slide-1.html` to trigger the workflow automatically.

---
*Last updated: 2026-07-20 by cloud autopilot session — 21st consecutive failure. Fresh slides generated (new hook). Token renewal required to unblock.*
