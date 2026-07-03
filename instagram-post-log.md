
## 2026-06-24T06:18:19Z
- Pillar: The Human Edge in the Age of AI
- Status: FAILED
- Media ID: n/a
- Slides: 6

## 2026-06-24T06:29:37Z
- Pillar: The Human Edge in the Age of AI
- Status: POSTED
- Media ID: 18090371243575973
- Slides: 6

## 2026-06-28T23:27:33Z
- Pillar: Human Purpose of Work
- Status: FAILED — TOKEN EXPIRED (error 190)
- Media ID: n/a
- Slides: 6
- Note: IG token expired 2026-06-25. Slides rendered OK. Pipeline works. Token must be renewed in workflow YAML + env secrets.

## 2026-06-29T20:11:03Z
- Pillar: How to Become Fractional
- Status: FAILED — TOKEN EXPIRED (relay workflow run #28399608573)
- Slug: fractional-risk-reversal-20260629
- Media ID: n/a
- Note: Token EAASS...ZD still expired (same token as June 28 failure). Token expired 2026-06-25. Must be renewed at developers.facebook.com before any post can go live. Both instagram-post.yml and instagram-relay.yml hardcode the same expired token.

## 2026-06-30T06:21:14Z
- Pillar: The Human Edge in the Age of AI
- Status: FAILED
- Media ID: n/a
- Slides: 6

## 2026-06-30T07:00:00Z
- Pillar: n/a (blocked before pillar selection)
- Status: FAILED — DUAL BLOCK: proxy denies graph.facebook.com (403) + github.com (403)
- Media ID: n/a
- Note: Session egress only permits beyond-elevation repo. graph.facebook.com blocked — IG API calls impossible regardless of token. Token also still expired (error 190, same as June 28-29). Action required: (1) renew IG token at developers.facebook.com, (2) run autopilot from an unrestricted environment (local machine, GH Actions on instagram-autopilot repo, or a VPS).

## 2026-07-01T09:38:28Z
- Pillar: The Human Edge in the Age of AI
- Status: FAILED
- Media ID: n/a
- Slides: 6

## 2026-07-02T20:12:51Z
- Pillar: The Human Edge in the Age of AI
- Status: FAILED
- Media ID: n/a
- Slides: 6

## 2026-07-03T06:14:58Z
- Pillar: The Human Edge in the Age of AI
- Status: FAILED
- Media ID: n/a
- Slides: 6

## 2026-07-03T16:05:38Z
- Pillar: Human Purpose of Work (queued, slides rendered)
- Status: FAILED — DUAL BLOCK: expired token (error 190, same EAASS...ZD) + graph.facebook.com 403 from session proxy
- Media ID: n/a
- Slides: 6 (already rendered in instagram-queue/slides/rendered/)
- Note: Same two blockers as 2026-06-30. Token hardcoded in instagram-post.yml line 24. Action required: renew token at developers.facebook.com, then update instagram-post.yml env.ACTIVE_IG_TOKEN.

## 2026-07-03T20:14:41Z
- Pillar: The Human Edge in the Age of AI
- Status: FAILED
- Media ID: n/a
- Slides: 6
