#!/usr/bin/env node
/**
 * li-auto-post.mjs — Autonomous LinkedIn post generator + publisher.
 * Called by .github/workflows/linkedin-scheduled.yml (5× daily cron).
 *
 * 1. Load context: keyword strategy, existing posts, post log, brand guide
 * 2. Ask Claude (haiku) to pick angle + write Hormozi caption + BEIP variables
 * 3. Inject variables into scripts/beip-template.html (Inter font, real logo, correct footer)
 * 4. Playwright renders the HTML → 1000×1000 PNG
 * 5. LinkedIn REST API publishes the image post
 * 6. Appends one line to linkedin-post-log.md (workflow commits the file)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// ── env ──────────────────────────────────────────────────────────────────────
const { ANTHROPIC_API_KEY, LI_TOKEN, LI_URN } = process.env;
if (!ANTHROPIC_API_KEY || !LI_TOKEN || !LI_URN) {
  console.error('Missing required env: ANTHROPIC_API_KEY, LI_TOKEN, LI_URN');
  process.exit(1);
}

const LINKEDIN_VERSION = '202604';
const LOG_FILE        = 'linkedin-post-log.md';
const REPO            = process.cwd(); // absolute path, used to resolve local assets

// ── helpers ──────────────────────────────────────────────────────────────────
const readFile  = p => existsSync(p) ? readFileSync(p, 'utf8') : '';
const appendLog = line => writeFileSync(LOG_FILE, readFile(LOG_FILE) + line + '\n');
const stamp     = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// ── 1. Load context ──────────────────────────────────────────────────────────
const keywordStrategy = readFileSync('beyondelevation-keyword-strategy.md', 'utf8');
const brandNotes      = readFile('hayat-amin-personal-brand-strategy.md').slice(0, 2000);

const posts       = JSON.parse(readFileSync('data/posts.json', 'utf8'));
const coveredPosts = posts.map(p => `${p.slug}: ${p.title}`).join('\n');

const logLines = readFile(LOG_FILE).trim().split('\n').filter(Boolean);
const last14   = logLines.slice(-14).join('\n') || '(none yet)';

// ── 2. Generate content via Claude ───────────────────────────────────────────
const systemPrompt = `You are Beyond Elevation's LinkedIn content strategist. Beyond Elevation is an IP strategy and data intelligence consultancy led by Hayat Amin — the operator who turned a 66-patent portfolio into eight figures of recurring royalty revenue.

HORMOZI LINKEDIN RULES (non-negotiable):
- Line 1: hook — contrarian claim, specific number, or pattern break. No warm-up.
- One idea per line. Blank line between EVERY line.
- Specific numbers (real or highly plausible). No vague claims.
- No emoji. No "thrilled". No "excited to share". No fluff.
- Voice: founder, blunt, results-obsessed.
- Close with max 3 hashtags on the final line.
- HARD CAP: 700 characters total including newlines.

BEIP IMAGE VARIABLES (you provide only the content values — the template handles all styling):
- headline: two-line hook derived from caption (use <br> for the line break), weight 300, centered
- metric_1 / label_1: first big number + short UPPERCASE label (e.g. "73%" / "AI STARTUPS<br>AT RISK")
- metric_2 / label_2: second tile
- metric_3 / label_3: third tile
- Labels are rendered at 13px / weight 700 / uppercase — keep them short (2–4 words max, use <br> for two lines)
- All three metrics must directly reinforce the caption's core claim with real or highly plausible figures`;

const userPrompt = `COVERED BLOG POSTS (avoid repeating these as the primary angle):
${coveredPosts}

LAST 14 LINKEDIN HOOKS TO AVOID (do not reuse these angles):
${last14}

KEYWORD STRATEGY — pick the single highest-ROI uncovered brief (Tier 1 → Tier 4 order):
${keywordStrategy}

PERSONAL BRAND NOTES:
${brandNotes}

---
Produce ONE post. Rules:
1. Walk the keyword strategy Tier 1 → Tier 4. Pick the first brief not yet covered by the blog slugs above AND not matching a recent LinkedIn hook.
2. Write the caption. Count every character. Stay ≤700.
3. Provide the 7 BEIP template variables (headline + 3 metric/label pairs).

Respond ONLY with valid JSON — no markdown fences, no commentary, nothing else:
{
  "slug": "kebab-case-slug",
  "keyword": "primary keyword phrase",
  "caption": "full caption ≤700 chars",
  "headline": "Line one<br>Line two",
  "metric_1": "73%",
  "label_1": "AI STARTUPS<br>AT RISK",
  "metric_2": "$4.2M",
  "label_2": "IP VALUE<br>RECOVERED",
  "metric_3": "4",
  "label_3": "CLAUSES<br>MISSED BY DEFAULT"
}`;

console.log('[1/5] Calling Claude for content generation...');
const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: [{ type: 'text', text: userPrompt, cache_control: { type: 'ephemeral' } }],
    }],
  }),
});

if (!apiRes.ok) {
  const err = await apiRes.text();
  appendLog(`${stamp()} | FAIL | Claude API ${apiRes.status}: ${err.slice(0, 150)}`);
  console.error(`Claude API error ${apiRes.status}:`, err);
  process.exit(1);
}

const { content } = await apiRes.json();
const raw = content[0].text.trim()
  .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

let post;
try {
  post = JSON.parse(raw);
} catch {
  appendLog(`${stamp()} | FAIL | JSON parse error from Claude`);
  console.error('Failed to parse Claude JSON:\n', raw.slice(0, 400));
  process.exit(1);
}

const required = ['caption', 'headline', 'metric_1', 'label_1', 'metric_2', 'label_2', 'metric_3', 'label_3', 'slug'];
const missing  = required.filter(k => !post[k]);
if (missing.length) {
  appendLog(`${stamp()} | FAIL | Incomplete Claude response — missing: ${missing.join(', ')}`);
  console.error('Missing fields:', missing);
  process.exit(1);
}

// Enforce 700-char cap
if (post.caption.length > 700) {
  const cut = post.caption.slice(0, 700);
  post.caption = cut.slice(0, cut.lastIndexOf('\n')) || cut;
  console.warn(`Caption trimmed to ${post.caption.length} chars`);
}

console.log(`      slug:    ${post.slug}`);
console.log(`      keyword: ${post.keyword}`);
console.log(`      caption (${post.caption.length} chars):\n${post.caption}\n`);

// ── 3. Build BEIP HTML from canonical template ────────────────────────────────
const htmlPath = '/tmp/beip-post.html';
const imgPath  = '/tmp/be-li-image.png';
const template = readFileSync('scripts/beip-template.html', 'utf8');

const imageHtml = template
  .replaceAll('{{REPO}}',     REPO)
  .replace('{{HEADLINE}}',   post.headline)
  .replace('{{METRIC_1}}',   post.metric_1)
  .replace('{{LABEL_1}}',    post.label_1)
  .replace('{{METRIC_2}}',   post.metric_2)
  .replace('{{LABEL_2}}',    post.label_2)
  .replace('{{METRIC_3}}',   post.metric_3)
  .replace('{{LABEL_3}}',    post.label_3);

writeFileSync(htmlPath, imageHtml);

// ── 4. Render via Playwright ──────────────────────────────────────────────────
console.log('[2/5] Rendering BEIP image via Playwright...');
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page    = await browser.newPage();
await page.setViewportSize({ width: 1000, height: 1000 });
await page.goto(`file://${htmlPath}`);
await page.waitForTimeout(1500); // allow @font-face to fully load
await page.screenshot({ path: imgPath, fullPage: false });
await browser.close();

const imgBytes = readFileSync(imgPath);
console.log(`      ${imgPath} — ${(imgBytes.length / 1024).toFixed(1)} KB`);
if (imgBytes.length < 50_000) {
  appendLog(`${stamp()} | FAIL | Image render too small (${imgBytes.length}B) — likely blank`);
  console.error('Image suspiciously small — render may have failed');
  process.exit(1);
}

// ── 5. Publish to LinkedIn ────────────────────────────────────────────────────
const liHeaders = {
  Authorization: `Bearer ${LI_TOKEN}`,
  'Linkedin-Version': LINKEDIN_VERSION,
  'X-Restli-Protocol-Version': '2.0.0',
  'Content-Type': 'application/json',
};

async function liReq(method, path, body) {
  const r = await fetch(`https://api.linkedin.com/rest${path}`, {
    method,
    headers: liHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) { const e = new Error('401 EMPTY_ACCESS_TOKEN'); e.code = 401; throw e; }
  return r;
}

let shareUrn;
try {
  console.log('[3/5] initializeUpload...');
  const initRes = await liReq('POST', '/images?action=initializeUpload',
    { initializeUploadRequest: { owner: LI_URN } });
  if (!initRes.ok) throw new Error(`initUpload ${initRes.status}: ${await initRes.text()}`);
  const { value: init } = await initRes.json();
  console.log(`      image URN: ${init.image}`);

  console.log('[4/5] PUT image bytes...');
  const putRes = await fetch(init.uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${LI_TOKEN}`, 'Content-Type': 'image/png' },
    body: imgBytes,
  });
  if (!putRes.ok) throw new Error(`PUT ${putRes.status}: ${await putRes.text()}`);

  console.log('[5/5] createPost...');
  const postRes = await liReq('POST', '/posts', {
    author: LI_URN,
    commentary: post.caption,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        id: init.image,
        altText: post.caption.split('\n')[0].slice(0, 200),
      },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  });
  if (!postRes.ok) throw new Error(`createPost ${postRes.status}: ${await postRes.text()}`);
  shareUrn = postRes.headers.get('x-restli-id') || postRes.headers.get('x-linkedin-id');
} catch (e) {
  const msg = e.code === 401 ? '401 re-auth needed' : e.message.slice(0, 150);
  appendLog(`${stamp()} | FAIL | ${msg}`);
  console.error(`\nFAIL ${e.message}`);
  process.exit(e.code === 401 ? 2 : 1);
}

// ── 6. Log success ────────────────────────────────────────────────────────────
const first80 = post.caption.slice(0, 80).replace(/\n/g, ' ');
appendLog(`${stamp()} | ${shareUrn} | ${post.slug} | ${first80}`);
console.log(`\nOK ${shareUrn}`);
console.log(`https://www.linkedin.com/feed/update/${shareUrn}/`);
