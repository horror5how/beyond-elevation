#!/usr/bin/env node
/**
 * li-carousel-post.mjs — Reads next pending carousel from
 * linkedin-carousel-queue/daily-carousels.md, renders 7 slides as a PDF
 * via Playwright, and publishes to LinkedIn as a Document (carousel) post.
 *
 * Slide structure: cover → 4 metric slides → takeaway → about (Hayat Amin)
 * Template: scripts/beip-carousel-template.html
 *
 * Exit codes: 0 ok, 2 auth expired (401), 1 any other error.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';

const { LI_TOKEN, LI_URN } = process.env;
if (!LI_TOKEN || !LI_URN) {
  console.error('Missing required env: LI_TOKEN, LI_URN');
  process.exit(1);
}

const LINKEDIN_VERSION = '202604';
const QUEUE_FILE  = 'linkedin-carousel-queue/daily-carousels.md';
const LOG_FILE    = 'linkedin-carousel-post-log.md';
const SLUGS_FILE  = 'linkedin-carousel-slugs-used.txt';
const REPO        = process.cwd();

const readFileSafe = p => existsSync(p) ? readFileSync(p, 'utf8') : '';
const appendLog    = line => writeFileSync(LOG_FILE, readFileSafe(LOG_FILE) + line + '\n');
const stamp        = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// ── 1. Read + parse queue ────────────────────────────────────────────────────
if (!existsSync(QUEUE_FILE)) {
  console.log('NO_QUEUE_FILE — carousel pipeline must run first');
  process.exit(0);
}

const queueRaw = readFileSync(QUEUE_FILE, 'utf8');

const fmMatch = queueRaw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!fmMatch) {
  appendLog(`${stamp()} | FAIL | Malformed carousel queue: missing frontmatter`);
  console.error('Malformed queue file');
  process.exit(1);
}
const body = fmMatch[2];

const blocks = [];
const blockRegex = /\n## Carousel (\d+)\n([\s\S]*?)(?=\n## Carousel |\n*$)/g;
let m;
while ((m = blockRegex.exec('\n' + body)) !== null) {
  blocks.push({ num: parseInt(m[1], 10), raw: m[2] });
}

if (blocks.length === 0) {
  console.log('NO_CAROUSELS_IN_QUEUE — pipeline must run');
  process.exit(0);
}

function parseCarousel(raw) {
  const lines = raw.split('\n');
  const meta = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') break;
    const kv = line.match(/^([a-z0-9_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  let captionLines = lines.slice(i + 1);
  const sep = captionLines.findIndex(l => l.trim() === '---');
  if (sep >= 0) captionLines = captionLines.slice(0, sep);
  return { meta, caption: captionLines.join('\n').trim() };
}

const parsed  = blocks.map(b => ({ num: b.num, ...parseCarousel(b.raw) }));
const pending = parsed.find(p => p.meta.status === 'pending');

if (!pending) {
  console.log('NO_PENDING_CAROUSELS — all published or queue stale');
  process.exit(0);
}

const meta = pending.meta;
const required = [
  'cover_hook', 'cover_sub',
  'slide2_stat', 'slide2_label', 'slide2_body',
  'slide3_stat', 'slide3_label', 'slide3_body',
  'slide4_stat', 'slide4_label', 'slide4_body',
  'slide5_stat', 'slide5_label', 'slide5_body',
  'takeaway',
];
const missing = required.filter(k => !meta[k]);
if (missing.length || !pending.caption) {
  appendLog(`${stamp()} | FAIL | Carousel #${pending.num} missing: ${missing.join(', ') || 'caption'}`);
  console.error(`Carousel #${pending.num} incomplete:`, missing);
  process.exit(1);
}

let caption = pending.caption;
if (caption.length > 700) {
  const cut = caption.slice(0, 700);
  caption = cut.slice(0, cut.lastIndexOf('\n')) || cut;
  console.warn(`Caption trimmed to ${caption.length} chars`);
}

console.log(`[1/6] Loaded carousel #${pending.num} — slug: ${meta.slug}`);
console.log(`      cover: ${meta.cover_hook.replace(/<br>/g, ' / ')}`);
console.log(`      caption (${caption.length} chars)`);

// ── 2. Build HTML from template ───────────────────────────────────────────────
const htmlPath = '/tmp/be-carousel.html';
const pdfPath  = '/tmp/be-carousel.pdf';
const template = readFileSync('scripts/beip-carousel-template.html', 'utf8');

const html = template
  .replaceAll('{{REPO}}',        REPO)
  .replace('{{COVER_HOOK}}',     meta.cover_hook)
  .replace('{{COVER_SUB}}',      meta.cover_sub)
  .replace('{{SLIDE2_STAT}}',    meta.slide2_stat)
  .replace('{{SLIDE2_LABEL}}',   meta.slide2_label)
  .replace('{{SLIDE2_BODY}}',    meta.slide2_body)
  .replace('{{SLIDE3_STAT}}',    meta.slide3_stat)
  .replace('{{SLIDE3_LABEL}}',   meta.slide3_label)
  .replace('{{SLIDE3_BODY}}',    meta.slide3_body)
  .replace('{{SLIDE4_STAT}}',    meta.slide4_stat)
  .replace('{{SLIDE4_LABEL}}',   meta.slide4_label)
  .replace('{{SLIDE4_BODY}}',    meta.slide4_body)
  .replace('{{SLIDE5_STAT}}',    meta.slide5_stat)
  .replace('{{SLIDE5_LABEL}}',   meta.slide5_label)
  .replace('{{SLIDE5_BODY}}',    meta.slide5_body)
  .replace('{{TAKEAWAY}}',       meta.takeaway);

writeFileSync(htmlPath, html);

// ── 3. Render PDF via Playwright ──────────────────────────────────────────────
console.log('[2/6] Rendering 7-slide carousel PDF via Playwright...');
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page    = await browser.newPage();
await page.setViewportSize({ width: 1080, height: 9450 }); // 7 × 1350
await page.goto(`file://${htmlPath}`);
await page.waitForTimeout(2500); // allow fonts + portrait image to load
await page.pdf({
  path: pdfPath,
  printBackground: true,
  width: '1080px',
  height: '1350px',
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await browser.close();

const pdfBytes = readFileSync(pdfPath);
console.log(`      ${pdfPath} — ${(pdfBytes.length / 1024).toFixed(1)} KB`);
if (pdfBytes.length < 80_000) {
  appendLog(`${stamp()} | FAIL | carousel #${pending.num} | PDF too small (${pdfBytes.length}B) — render may have failed`);
  console.error('PDF suspiciously small — render failed');
  process.exit(1);
}

// ── 4. Upload to LinkedIn Document API ───────────────────────────────────────
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
  console.log('[3/6] initializeUpload (document)...');
  const initRes = await liReq('POST', '/documents?action=initializeUpload', {
    initializeUploadRequest: { owner: LI_URN },
  });
  if (!initRes.ok) throw new Error(`initUpload ${initRes.status}: ${await initRes.text()}`);
  const { value: init } = await initRes.json();

  console.log('[4/6] PUT PDF bytes...');
  const putRes = await fetch(init.uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${LI_TOKEN}`,
      'Content-Type': 'application/octet-stream',
    },
    body: pdfBytes,
  });
  if (!putRes.ok) throw new Error(`PUT ${putRes.status}: ${await putRes.text()}`);

  console.log('[5/6] createPost (document carousel)...');
  const title = meta.cover_hook.replace(/<br>/g, ' ').slice(0, 120);
  const postRes = await liReq('POST', '/posts', {
    author: LI_URN,
    commentary: caption,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      document: {
        id: init.document,
        title,
        altText: title,
      },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  });
  if (!postRes.ok) throw new Error(`createPost ${postRes.status}: ${await postRes.text()}`);
  shareUrn = postRes.headers.get('x-restli-id') || postRes.headers.get('x-linkedin-id');
} catch (e) {
  const msg = e.code === 401 ? '401 re-auth needed' : e.message.slice(0, 200);
  appendLog(`${stamp()} | FAIL | carousel #${pending.num} | ${msg}`);
  console.error(`\nFAIL: ${e.message}`);
  process.exit(e.code === 401 ? 2 : 1);
}

// ── 5. Mark carousel as published in queue file ───────────────────────────────
const nowIso  = new Date().toISOString();
let updated   = queueRaw;

const header   = `\n## Carousel ${pending.num}\n`;
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

updated = updated.replace(
  /^carousels_published:\s*(\d+)\s*$/m,
  (_, n) => `carousels_published: ${parseInt(n, 10) + 1}`,
);

writeFileSync(QUEUE_FILE, updated);

// ── 6. Record slug + log ──────────────────────────────────────────────────────
if (meta.slug) {
  const existing = readFileSafe(SLUGS_FILE);
  const slugs = existing.split('\n').filter(Boolean);
  if (!slugs.includes(meta.slug)) {
    writeFileSync(SLUGS_FILE, slugs.concat(meta.slug).join('\n') + '\n');
  }
}

const first80 = caption.slice(0, 80).replace(/\n/g, ' ');
appendLog(`${stamp()} | ${shareUrn} | carousel #${pending.num} | ${meta.slug || ''} | ${first80}`);

console.log(`\n[6/6] Published.`);
console.log(`OK ${shareUrn}`);
console.log(`https://www.linkedin.com/feed/update/${shareUrn}/`);
