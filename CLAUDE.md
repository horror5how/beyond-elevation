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

## LinkedIn Image Generation (BEIP infographic — read before every LinkedIn post)

**Every LinkedIn post image MUST be generated from the canonical template.**

Template file: `scripts/beip-template.html`

### Brand rules (non-negotiable)

- Logo: `assets/brand/be-logo-horizontal.png` — the arc/figure mark + "Beyond Elevation" wordmark. Never use a hand-typed "BE" text substitute.
- Footer line 1: **PROPERTY OF BEYOND ELEVATION** (uppercase, weight 600, tracked)
- Footer line 2 (quote, italic): *"Patent and data are the only thing differentiating tech companies today, and we master in its craft."*
- Tile labels: 13px, weight 700, uppercase, #1a1a1a — large enough to be legible at LinkedIn feed scale.

### How to generate the image

1. Copy `scripts/beip-template.html` to `/tmp/beip-post.html` and replace the six placeholders:
   - `{{HEADLINE}}` — two-line hook derived from the caption (use `<br>` for line break)
   - `{{METRIC_1}}`, `{{LABEL_1}}` — first tile number + uppercase label
   - `{{METRIC_2}}`, `{{LABEL_2}}` — second tile number + uppercase label
   - `{{METRIC_3}}`, `{{LABEL_3}}` — third tile number + uppercase label
2. Render to PNG via Playwright (1000×1000 px):
   ```bash
   node -e "
   const { chromium } = require('/opt/node22/lib/node_modules/playwright');
   (async () => {
     const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
     const page = await browser.newPage();
     await page.setViewportSize({ width: 1000, height: 1000 });
     await page.goto('file:///tmp/beip-post.html');
     await page.waitForTimeout(2000);
     await page.screenshot({ path: '/tmp/be-li-image.png', fullPage: false });
     await browser.close();
   })();
   "
   ```
3. Verify: `ls -la /tmp/be-li-image.png` — must be >100 KB.
4. Publish: `node scripts/linkedin-publish.mjs --image /tmp/be-li-image.png --text "$(cat /tmp/caption.txt)"`

### Metric tile guidelines

Bake 3 specific numbers that reinforce the caption into the tiles. Use real or plausible figures; each number must relate directly to the post's hook. Do not repeat metrics from the last 3 posts.
