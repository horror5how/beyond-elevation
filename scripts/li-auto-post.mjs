#!/usr/bin/env node
/**
 * li-auto-post.mjs — Reads next pending post from linkedin-queue/daily-posts.md
 * and publishes it. Image generation (Playwright + BEIP template) UNCHANGED.
 *
 * Source of truth for content: linkedin-queue/daily-posts.md (produced upstream
 * by the beyondelevation-linkedin-content-pipeline scheduled task at 04:00 daily).
 *
 * 1. Read queue file → find first post with `status: pending`
 * 2. Inject post's BEIP variables into scripts/beip-template.html
 * 3. Playwright renders HTML → 1000×1000 PNG
 * 4. LinkedIn REST API publishes the image post
 * 5. Mark post as published in queue file (status, published_at, share_urn)
 * 6. Append success line to linkedin-post-log.md (workflow commits both files)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';

// ── env ──────────────────────────────────────────────────────────────────────
const { LI_TOKEN, LI_URN } = process.env;
if (!LI_TOKEN || !LI_URN) {
  console.error('Missing required env: LI_TOKEN, LI_URN');
  process.exit(1);
}

const LINKEDIN_VERSION = '202604';
const QUEUE_FILE = 'linkedin-queue/daily-posts.md';
const LOG_FILE   = 'linkedin-post-log.md';
const REPO       = process.cwd();

// ── helpers ──────────────────────────────────────────────────────────────────
const readFileSafe = p => existsSync(p) ? readFileSync(p, 'utf8') : '';
const appendLog    = line => writeFileSync(LOG_FILE, readFileSafe(LOG_FILE) + line + '\n');
const stamp        = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// ── 1. Read + parse queue ────────────────────────────────────────────────────
if (!existsSync(QUEUE_FILE)) {
  console.log('NO_QUEUE_FILE — pipeline must run first');
  process.exit(0);
}

const queueRaw = readFileSync(QUEUE_FILE, 'utf8');

// Frontmatter between first two `---`
const fmMatch = queueRaw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!fmMatch) {
  appendLog(`${stamp()} | FAIL | Malformed queue file: missing frontmatter`);
  console.error('Malformed queue file');
  process.exit(1);
}
const body = fmMatch[2];

// Split into post blocks: anything starting with `## Post N`
const postBlocks = [];
const postRegex = /\n## Post (\d+)\n([\s\S]*?)(?=\n## Post |\n*$)/g;
let m;
while ((m = postRegex.exec('\n' + body)) !== null) {
  postBlocks.push({ num: parseInt(m[1], 10), raw: m[2] });
}

if (postBlocks.length === 0) {
  console.log('NO_POSTS_IN_QUEUE — pipeline must run');
  process.exit(0);
}

// Parse each block: meta lines until first blank line, caption after.
function parsePost(raw) {
  const lines = raw.split('\n');
  const meta = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') break;
    const kv = line.match(/^([a-z_0-9]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  // Caption = lines after the blank, stop at trailing `---`
  let captionLines = lines.slice(i + 1);
  const sep = captionLines.findIndex(l => l.trim() === '---');
  if (sep >= 0) captionLines = captionLines.slice(0, sep);
  return { meta, caption: captionLines.join('\n').trim() };
}

const parsed = postBlocks.map(p => ({ num: p.num, ...parsePost(p.raw) }));
const pending = parsed.find(p => p.meta.status === 'pending');

if (!pending) {
  console.log('NO_PENDING_POSTS — all published or queue stale');
  process.exit(0);
}

// Validate required fields
const meta = pending.meta;
const required = ['headline', 'metric_1', 'label_1', 'metric_2', 'label_2', 'metric_3', 'label_3'];
const missing  = required.filter(k => !meta[k]);
if (missing.length || !pending.caption) {
  appendLog(`${stamp()} | FAIL | Post #${pending.num} missing: ${missing.join(', ') || 'caption'}`);
  console.error(`Post #${pending.num} incomplete:`, missing);
  process.exit(1);
}

// Defensive 700-char cap
let caption = pending.caption;
if (caption.length > 700) {
  const cut = caption.slice(0, 700);
  caption = cut.slice(0, cut.lastIndexOf('\n')) || cut;
  console.warn(`Caption trimmed to ${caption.length} chars`);
}

console.log(`[1/5] Loaded post #${pending.num} from queue`);
console.log(`      slug:    ${meta.slug || '(none)'}`);
console.log(`      caption (${caption.length} chars):\n${caption}\n`);

// ── 2. Build BEIP HTML from canonical template (UNCHANGED) ───────────────────
const htmlPath = '/tmp/beip-post.html';
const imgPath  = '/tmp/be-li-image.png';
const template = readFileSync('scripts/beip-template.html', 'utf8');

const imageHtml = template
  .replaceAll('{{REPO}}',    REPO)
  .replace('{{HEADLINE}}',  meta.headline)
  .replace('{{METRIC_1}}',  meta.metric_1)
  .replace('{{LABEL_1}}',   meta.label_1)
  .replace('{{METRIC_2}}',  meta.metric_2)
  .replace('{{LABEL_2}}',   meta.label_2)
  .replace('{{METRIC_3}}',  meta.metric_3)
  .replace('{{LABEL_3}}',   meta.label_3);

writeFileSync(htmlPath, imageHtml);

// ── 3. Render via Playwright (UNCHANGED) ─────────────────────────────────────
console.log('[2/5] Rendering BEIP image via Playwright...');
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page    = await browser.newPage();
await page.setViewportSize({ width: 1000, height: 1000 });
await page.goto(`file://${htmlPath}`);
await page.waitForTimeout(1500); // let @font-face fully load
await page.screenshot({ path: imgPath, fullPage: false });
await browser.close();

const imgBytes = readFileSync(imgPath);
console.log(`      ${imgPath} — ${(imgBytes.length / 1024).toFixed(1)} KB`);
if (imgBytes.length < 50_000) {
  appendLog(`${stamp()} | FAIL | post #${pending.num} | image render too small (${imgBytes.length}B)`);
  console.error('Image suspiciously small — render may have failed');
  process.exit(1);
}

// ── 4. Publish to LinkedIn (UNCHANGED) ───────────────────────────────────────
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
    commentary: caption,
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    content: { media: { id: init.image, altText: caption.split('\n')[0].slice(0, 200) } },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  });
  if (!postRes.ok) throw new Error(`createPost ${postRes.status}: ${await postRes.text()}`);
  shareUrn = postRes.headers.get('x-restli-id') || postRes.headers.get('x-linkedin-id');
} catch (e) {
  const msg = e.code === 401 ? '401 re-auth needed' : e.message.slice(0, 150);
  appendLog(`${stamp()} | FAIL | post #${pending.num} | ${msg}`);
  console.error(`\nFAIL ${e.message}`);
  process.exit(e.code === 401 ? 2 : 1);
}

// ── 5. Mark post as published in the queue file ──────────────────────────────
const nowIso  = new Date().toISOString();
let updated   = queueRaw;

// Update this post's metadata block
const header   = `\n## Post ${pending.num}\n`;
const headerAt = updated.indexOf(header);
if (headerAt >= 0) {
  const metaStart = headerAt + header.length;
  const blankAt   = updated.indexOf('\n\n', metaStart);
  let metaBlock   = updated.slice(metaStart, blankAt);
  metaBlock = metaBlock.replace(
    /^status:\s*pending\s*$/m,
    `status: published\npublished_at: ${nowIso}\nshare_urn: ${shareUrn}`,
  );
  updated = updated.slice(0, metaStart) + metaBlock + updated.slice(blankAt);
}

// Increment posts_published in frontmatter
updated = updated.replace(
  /^posts_published:\s*(\d+)\s*$/m,
  (_, n) => `posts_published: ${parseInt(n, 10) + 1}`,
);

writeFileSync(QUEUE_FILE, updated);

// ── 6. Log success ───────────────────────────────────────────────────────────
const first80 = caption.slice(0, 80).replace(/\n/g, ' ');
appendLog(`${stamp()} | ${shareUrn} | post #${pending.num} | ${meta.slug || ''} | ${first80}`);
console.log(`\nOK ${shareUrn}`);
console.log(`https://www.linkedin.com/feed/update/${shareUrn}/`);
