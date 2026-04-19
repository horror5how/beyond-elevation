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
