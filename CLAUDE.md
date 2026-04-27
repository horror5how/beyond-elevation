# CLAUDE.md — Beyond Elevation

## Blog Publishing (critical — read before any blog task)

**The live site renders from static HTML files, NOT from data/posts.json directly.**

When publishing a blog post, you MUST only update `data/posts.json` and push. The GitHub Actions workflow (`auto-merge-scheduled-posts.yml`) automatically regenerates all derived files:

- `blog/posts/<slug>/index.html`
- `blog/index.html`
- `sitemap.xml`
- `blog/md/<slug>.md`
- `llms.txt`, `llms-full.txt`

**Do NOT hand-edit those derived files.** They are regenerated from posts.json on every push.

### How to publish a post

1. Read `beyondelevation-keyword-strategy.md` — source of truth for topic selection.
2. Read `hayat-amin-personal-brand-strategy.md` — source of truth for Hayat Amin references.
3. Pick the first uncovered keyword brief (Tier 1 → Tier 4 order).
4. Write the post following the Hormozi rules in `TASK_PROMPT.md`.
5. Append to `data/posts.json` using the helper: `node scripts/publish.js '<JSON>'`
6. Validate: `node -e "JSON.parse(require('fs').readFileSync('data/posts.json','utf8')); console.log('OK')"`
7. Commit only `data/posts.json` and push.

The workflow handles everything else. Full instructions in `TASK_PROMPT.md`.

### Post object required fields

```json
{
  "slug": "kebab-case",
  "title": "Hormozi-hook title",
  "excerpt": "1-2 sentences with primary keyword",
  "category": "IP Strategy | Licensing | Valuation | Patents | AI | Data",
  "date": "YYYY-MM-DD",
  "body": "<p>HTML body</p>"
}
```

`scripts/publish.js` fills in author, authorPhoto, heroImage, status, alexReview automatically.

### Internal link format

Always use `/blog/posts/<slug>/` for internal links (NOT `/blog/post.html?slug=<slug>`).

### Build scripts (run by the workflow, not by you)

- `node scripts/build-static-posts.js` — generates blog/posts/ and blog/index.html
- `node scripts/build-sitemap.js` — regenerates sitemap.xml
- `node scripts/generate-blog-markdown.js` — regenerates blog/md/, llms.txt, llms-full.txt

## LinkedIn Deduplication (MANDATORY — read before every LinkedIn task)

**Duplicate posts have been sent. These rules exist to prevent recurrence. They are non-negotiable.**

### The dedup source of truth

`linkedin-slugs-used.txt` — one slug per line, every topic ever attempted (success OR fail).

**Before picking any LinkedIn topic you MUST:**
```bash
cat linkedin-slugs-used.txt
```
If a slug or its close variant appears there, skip it entirely. No exceptions.

### Three content pillars — rotate across them

Every post must belong to one of these pillars. Never publish three consecutive posts in the same pillar.

1. **IP** — patents, licensing, IP strategy, IP valuation, holdco structure, trade secrets, patent clustering, IP monetisation
2. **AI** — AI strategy, AI governance, AI transformation, AI IP/patents, agentic AI, open-weight models, EU AI Act
3. **Financial** — exit multiples, M&A/IP positioning, data monetisation, valuation methods, capital strategy, IP-backed financing

### How to pick a topic

1. `cat linkedin-slugs-used.txt` — note every slug present.
2. `cat beyondelevation-keyword-strategy.md` — walk Tier 1 → Tier 5.
3. Pick the first brief whose `slug_hint` is NOT in `linkedin-slugs-used.txt` AND whose topic is meaningfully different from every entry there (not just the exact slug — avoid semantic near-duplicates too).
4. Check which pillar the last 2 posts used (look at `linkedin-post-log.md`). If both were IP pillar, pick AI or Financial next.

### After publishing (or after a failed attempt)

Immediately append the slug to `linkedin-slugs-used.txt`:
```bash
echo "the-slug-used" >> linkedin-slugs-used.txt
```
Commit both `linkedin-post-log.md` and `linkedin-slugs-used.txt` together. **Never skip this step even on failure** — a failed attempt still reserves the slug so the next run picks something fresh.

### Why duplicates happened — do not repeat these mistakes

- The automated script only checked the last 14 log lines, which were mostly error messages with no slug recorded.
- FAIL log entries did not include the topic slug, so the next run could not see which topic had been tried.
- The slug was only recorded on success, so crashes and network failures left no trace.
- All three bugs are now fixed in `scripts/li-auto-post.mjs` (slug recorded pre-attempt, slug in every log line, full slug list passed to Claude).

## LinkedIn Publishing — The Only Correct Method (read before every post)

**The runtime environment blocks outbound calls to `api.linkedin.com`. Never call `scripts/linkedin-publish.mjs` directly. It will always fail here.**

The correct, proven method is the **GitHub Actions queue**. Push two files to main → the `linkedin-post.yml` workflow triggers in CI (no proxy restriction) → CI renders the image and publishes. This is the only method that works.

### End-to-end publishing steps (follow every time, no exceptions)

**1. Pick topic** (dedup rules above apply — read `linkedin-slugs-used.txt` first)

**2. Write caption → `linkedin-queue/next-caption.txt`**
- Hormozi hook line 1 (contrarian / specific number / pattern break)
- 2–3 one-line punches, one idea per line, blank line between each
- Specific numbers, blunt voice, no emoji, no fluff
- 3 hashtags max
- Hard cap: ≤700 characters (`wc -c linkedin-queue/next-caption.txt`)

**3. Write BEIP image HTML → `linkedin-queue/next-image.html`**

Model the file exactly on the working template below. **Do not reference local font files or local image paths** — the file must render correctly in a fresh CI checkout with only system fonts and no `node_modules`.

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1080px;
    background: #f8f6f2;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
    padding: 72px 64px 56px;
    position: relative; overflow: hidden;
  }
  body::before {
    content: ''; position: absolute; top: -200px; left: -200px;
    width: 700px; height: 700px;
    background: radial-gradient(ellipse at center, rgba(230,185,140,0.22) 0%, transparent 70%);
    pointer-events: none;
  }
  body::after {
    content: ''; position: absolute; top: -200px; right: -200px;
    width: 700px; height: 700px;
    background: radial-gradient(ellipse at center, rgba(230,185,140,0.14) 0%, transparent 70%);
    pointer-events: none;
  }
  .eyebrow { font-size: 13px; font-weight: 600; letter-spacing: 0.12em; color: #1a1a1a; text-transform: uppercase; text-align: center; }
  .headline { text-align: center; font-weight: 300; font-size: 52px; line-height: 1.18; letter-spacing: -0.03em; color: #1a1a1a; max-width: 860px; margin-top: 20px; }
  .metrics { display: flex; width: 100%; align-items: flex-start; justify-content: space-around; padding: 32px 0; }
  .metric { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 16px; position: relative; }
  .metric + .metric::before { content: ''; position: absolute; left: 0; top: 10%; height: 80%; width: 1px; background: #c8c4bc; }
  .metric-value { font-size: 96px; font-weight: 300; color: #1a1a1a; letter-spacing: -0.04em; line-height: 1; }
  .metric-bar { width: 60px; height: 2px; background: #d7b086; margin: 12px auto 10px; }
  .metric-label { font-size: 11.5px; font-weight: 600; color: #4a4a4a; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1.6; }
  .footer { width: 100%; border-top: 1px solid #c8c4bc; padding-top: 24px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .be-wordmark { font-size: 52px; font-weight: 800; letter-spacing: -0.04em; color: #1a1a1a; line-height: 1; }
  .powered-by { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; color: #1a1a1a; text-transform: uppercase; }
  .tagline { font-size: 12px; font-weight: 400; font-style: italic; color: #4a4a4a; text-align: center; }
</style>
</head>
<body>
  <div class="eyebrow">IP + DATA INTELLIGENCE</div>
  <div class="headline">LINE ONE<br>LINE TWO</div>
  <div class="metrics">
    <div class="metric">
      <div class="metric-value">NUMBER_1</div>
      <div class="metric-bar"></div>
      <div class="metric-label">LABEL<br>LINE TWO<br>LINE THREE</div>
    </div>
    <div class="metric">
      <div class="metric-value">NUMBER_2</div>
      <div class="metric-bar"></div>
      <div class="metric-label">LABEL<br>LINE TWO<br>LINE THREE</div>
    </div>
    <div class="metric">
      <div class="metric-value">NUMBER_3</div>
      <div class="metric-bar"></div>
      <div class="metric-label">LABEL<br>LINE TWO<br>LINE THREE</div>
    </div>
  </div>
  <div class="footer">
    <div class="be-wordmark">BE</div>
    <div class="powered-by">Powered by Beyond Elevation</div>
    <div class="tagline">Turn IP and data into licensing revenue, higher valuation, and market domination.</div>
  </div>
</body>
</html>
```

Metric tile guidelines: 3 specific numbers that reinforce the caption. Use real or plausible figures. Do not repeat metrics from the last 3 posts.

**4. Reserve the slug immediately**
```bash
echo "the-slug" >> linkedin-slugs-used.txt
```
Do this before committing. On any failure, the slug is still reserved — never skip.

**5. Commit BOTH queue files + `linkedin-slugs-used.txt` and push to main**
```bash
git add linkedin-queue/next-caption.txt linkedin-queue/next-image.html linkedin-slugs-used.txt
git commit -m "LinkedIn: queue <slug>"
git push -u origin HEAD:main
```

The `linkedin-post.yml` workflow triggers automatically on changes to those two queue files. CI renders the image at 1080×1080, publishes via `scripts/linkedin-publish.mjs`, then commits the share URN back to `linkedin-post-log.md`.

**6. Never do any of the following — they will always fail in this environment:**
- Calling `scripts/linkedin-publish.mjs` directly
- Calling `api.linkedin.com` with curl
- Using Zapier or any third-party relay
- Trying to render and upload locally

## LinkedIn Carousel Publishing (5× daily — separate from image posts)

**The full daily posting routine is 10 posts per day:**
- 5 × image posts (single BEIP slide) at 08, 10, 12, 14, 18 BST via `linkedin-scheduled.yml`
- 5 × carousel posts (7-slide PDF) at 09, 11, 13, 17, 20 BST via `linkedin-carousel-scheduled.yml`

### Carousel architecture

| File | Purpose |
|---|---|
| `scripts/beip-carousel-template.html` | 7-slide HTML template (rendered to PDF by Playwright) |
| `scripts/li-carousel-generate.mjs` | Generates `daily-carousels.md` at 03:00 UTC via Claude API |
| `scripts/li-carousel-post.mjs` | Reads next pending carousel, renders PDF, posts to LinkedIn Document API |
| `linkedin-carousel-queue/daily-carousels.md` | Daily carousel queue (5 carousels per day) |
| `linkedin-carousel-slugs-used.txt` | Dedup file — one carousel slug per line |
| `linkedin-carousel-post-log.md` | Success/fail log for carousel posts |

### Carousel slide structure (7 slides, 1080×1350 portrait)

1. **Cover**: Hook headline (`cover_hook` with `<br>` split) + italic sub-headline (`cover_sub`) + swipe prompt
2. **Metric 1** (`slide2_*`): Big stat + label + 1–2 sentence body
3. **Metric 2** (`slide3_*`): Big stat + label + 1–2 sentence body
4. **Metric 3** (`slide4_*`): Big stat + label + 1–2 sentence body
5. **Metric 4** (`slide5_*`): Big stat + label + 1–2 sentence body
6. **Takeaway**: Single punchy insight sentence (`takeaway` field)
7. **About**: Static Hayat Amin slide — photo, credentials, CTA (auto-generated, no fields)

### Carousel queue format

```markdown
## Carousel 1
status: pending
slug: topic-name-carousel
pillar: Financial
cover_hook: Hook line one<br>Hook line two
cover_sub: Italic sub-headline here
slide2_stat: 30x
slide2_label: AI REVENUE<br>MULTIPLE
slide2_body: One or two sentence explanation with specific numbers.
slide3_stat: 78%
slide3_label: INTANGIBLE<br>ASSET SHARE
slide3_body: ...
slide4_stat: 10.2x
slide4_label: FUNDING<br>ADVANTAGE
slide4_body: ...
slide5_stat: 60%
slide5_label: MULTIPLE<br>MARKDOWN
slide5_body: ...
takeaway: Single punchy takeaway sentence without numbers.

Caption line one (hook).

Second line.

Third line.

#Hashtag1 #Hashtag2 #Hashtag3
---
```

### Carousel dedup rules

- Carousel slugs end in `-carousel` to distinguish from image post slugs
- Check `linkedin-carousel-slugs-used.txt` before picking a topic
- The same keyword angle can appear in both image posts and carousels (they serve different formats), but the carousel must add net-new data points or a deeper angle
- Pillar rotation applies independently to carousels (check `linkedin-carousel-post-log.md`)
