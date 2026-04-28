#!/usr/bin/env node
/**
 * li-auto-post.mjs — Reads next pending post from linkedin-queue/daily-posts.md
 * and publishes it.
 *
 * Source of truth for content: linkedin-queue/daily-posts.md (produced upstream
 * by the beyondelevation-linkedin-content-pipeline scheduled task at 04:00 daily).
 *
 * 1. Read queue file → find first post with `status: pending`
 * 2. Inject post's BEIP variables into scripts/beip-template.html with a
 *    rotating LAYOUT (a|b|c) and ACCENT — Playwright renders to 1000×1000 PNG
 * 3. Compute a perceptual hash; compare against last 7 published images.
 *    If Hamming distance < threshold → re-render with a different variant
 *    (up to 4 attempts).
 * 4. LinkedIn REST API publishes the image post
 * 5. Mark post as published in queue file (status, published_at, share_urn)
 * 6. Append success line to linkedin-post-log.md
 * 7. Append the new pHash to linkedin-queue/recent-image-hashes.json (keep last 7)
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

// ── env ──────────────────────────────────────────────────────────────────────
const { LI_TOKEN, LI_URN, LI_DRY_RUN } = process.env;
const DRY_RUN = LI_DRY_RUN === '1' || LI_DRY_RUN === 'true';
if (!DRY_RUN && (!LI_TOKEN || !LI_URN)) {
  console.error('Missing required env: LI_TOKEN, LI_URN');
  process.exit(1);
}

const LINKEDIN_VERSION = '202604';
const QUEUE_FILE   = 'linkedin-queue/daily-posts.md';
const LOG_FILE     = 'linkedin-post-log.md';
const HASHES_FILE  = 'linkedin-queue/recent-image-hashes.json';
const PIPELINE_LOG = 'linkedin-pipeline-log.md';
const REPO         = process.cwd();

// pHash diff threshold — Hamming distance below this = too similar, regenerate.
// We hash the inner content region (skip eyebrow + footer chrome that is shared
// across every BEIP card), so layout/content drives the diff, not boilerplate.
const PHASH_THRESHOLD     = 5;
const PHASH_BITS          = 64;
const RECENT_KEEP         = 7;
const MAX_RENDER_ATTEMPTS = 6;

// Layout + accent variants for visual diversity
const LAYOUTS = ['a', 'b', 'c'];
const ACCENTS = [
  { hex: '#d7b086', soft: 'rgba(255, 220, 180, 0.35)' }, // warm peach (default BEIP)
  { hex: '#8aa6b8', soft: 'rgba(150, 190, 220, 0.32)' }, // cool steel blue
  { hex: '#a89968', soft: 'rgba(220, 200, 140, 0.32)' }, // muted gold
  { hex: '#a87c7c', soft: 'rgba(220, 170, 170, 0.30)' }, // dusty rose
  { hex: '#7a8c6e', soft: 'rgba(170, 200, 150, 0.30)' }, // sage
];

// ── helpers ──────────────────────────────────────────────────────────────────
const readFileSafe = p => existsSync(p) ? readFileSync(p, 'utf8') : '';
const appendLog    = line => writeFileSync(LOG_FILE, readFileSafe(LOG_FILE) + line + '\n');
const stamp        = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
const pipeLog      = msg => {
  const line = `${stamp()} | li-auto-post | ${msg}\n`;
  appendFileSync(PIPELINE_LOG, line);
  console.log(line.trim());
};

// 64-bit perceptual hash: downsample to 8x8 grayscale via canvas, threshold by mean.
async function computePHashFromBytes(page, pngBytes) {
  const dataUrl = `data:image/png;base64,${pngBytes.toString('base64')}`;
  return await page.evaluate(async (url) => {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    // Crop inner content region (skip top eyebrow + bottom footer chrome)
    // Source 1000×1000 → take y:140..760 (620px tall), x:60..940 (880px wide)
    const sx = 60, sy = 140, sw = 880, sh = 620;
    const N = 32;
    const c = document.createElement('canvas');
    c.width = N; c.height = N;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, N, N);
    const data = ctx.getImageData(0, 0, N, N).data;
    const gray = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) {
      const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
      gray[i] = 0.299*r + 0.587*g + 0.114*b;
    }
    const M = 8;
    const small = new Float64Array(M * M);
    const block = N / M;
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < M; x++) {
        let sum = 0;
        for (let yy = 0; yy < block; yy++) {
          for (let xx = 0; xx < block; xx++) {
            sum += gray[(y*block+yy)*N + (x*block+xx)];
          }
        }
        small[y*M+x] = sum / (block*block);
      }
    }
    let mean = 0;
    for (let i = 0; i < M*M; i++) mean += small[i];
    mean /= M*M;
    let bits = '';
    for (let i = 0; i < M*M; i++) bits += (small[i] > mean) ? '1' : '0';
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i+4), 2).toString(16);
    }
    return hex;
  }, dataUrl);
}

function hammingHex(a, b) {
  if (!a || !b || a.length !== b.length) return PHASH_BITS;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

function loadRecentHashes() {
  if (!existsSync(HASHES_FILE)) return [];
  try {
    const arr = JSON.parse(readFileSync(HASHES_FILE, 'utf8'));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRecentHashes(arr) {
  const trimmed = arr.slice(-RECENT_KEEP);
  writeFileSync(HASHES_FILE, JSON.stringify(trimmed, null, 2) + '\n');
}

function pickVariant(attempt, slugSeed, triedLayouts = new Set()) {
  // First attempt: deterministic from slug.
  // Retries: prefer a layout we have NOT tried yet, then rotate accent.
  const seedStr = String(slugSeed || '') + ':' + attempt;
  const h = createHash('sha1').update(seedStr).digest();
  let layout;
  if (attempt === 1) {
    layout = LAYOUTS[h[0] % LAYOUTS.length];
  } else {
    const fresh = LAYOUTS.filter(l => !triedLayouts.has(l));
    layout = (fresh.length ? fresh : LAYOUTS)[h[0] % (fresh.length || LAYOUTS.length)];
  }
  const accent = ACCENTS[h[1] % ACCENTS.length];
  return { layout, accent };
}

// ── 1. Read + parse queue ────────────────────────────────────────────────────
if (!existsSync(QUEUE_FILE)) {
  console.log('NO_QUEUE_FILE — pipeline must run first');
  process.exit(0);
}

const queueRaw = readFileSync(QUEUE_FILE, 'utf8');

const fmMatch = queueRaw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!fmMatch) {
  appendLog(`${stamp()} | FAIL | Malformed queue file: missing frontmatter`);
  console.error('Malformed queue file');
  process.exit(1);
}
const body = fmMatch[2];

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

const meta = pending.meta;
const required = ['headline', 'metric_1', 'label_1', 'metric_2', 'label_2', 'metric_3', 'label_3'];
const missing  = required.filter(k => !meta[k]);
if (missing.length || !pending.caption) {
  appendLog(`${stamp()} | FAIL | Post #${pending.num} missing: ${missing.join(', ') || 'caption'}`);
  console.error(`Post #${pending.num} incomplete:`, missing);
  process.exit(1);
}

let caption = pending.caption;
if (caption.length > 700) {
  const cut = caption.slice(0, 700);
  caption = cut.slice(0, cut.lastIndexOf('\n')) || cut;
  console.warn(`Caption trimmed to ${caption.length} chars`);
}

console.log(`[1/5] Loaded post #${pending.num} from queue`);
console.log(`      slug:    ${meta.slug || '(none)'}`);
console.log(`      caption (${caption.length} chars):\n${caption}\n`);

// ── 2. Build BEIP HTML + render with layout/accent rotation + pHash dedup ────
const htmlPath = '/tmp/beip-post.html';
const imgPath  = '/tmp/be-li-image.png';
const template = readFileSync('scripts/beip-template.html', 'utf8');
const recentHashes = loadRecentHashes();

function renderTemplate(layout, accentHex, accentSoft) {
  return template
    .replaceAll('{{REPO}}',         REPO)
    .replaceAll('{{LAYOUT}}',       layout)
    .replaceAll('{{ACCENT_HEX}}',   accentHex)
    .replaceAll('{{ACCENT_SOFT}}',  accentSoft)
    .replaceAll('{{HEADLINE}}',     meta.headline)
    .replaceAll('{{METRIC_1}}',     meta.metric_1)
    .replaceAll('{{LABEL_1}}',      meta.label_1)
    .replaceAll('{{METRIC_2}}',     meta.metric_2)
    .replaceAll('{{LABEL_2}}',      meta.label_2)
    .replaceAll('{{METRIC_3}}',     meta.metric_3)
    .replaceAll('{{LABEL_3}}',      meta.label_3);
}

console.log('[2/5] Rendering BEIP image via Playwright (with pHash dedup)...');
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page    = await browser.newPage();
await page.setViewportSize({ width: 1000, height: 1000 });

let imgBytes;
let chosen = null;
let lastDist = null;
const triedLayouts = new Set();

for (let attempt = 1; attempt <= MAX_RENDER_ATTEMPTS; attempt++) {
  const variant = pickVariant(attempt, meta.slug, triedLayouts);
  triedLayouts.add(variant.layout);
  const html    = renderTemplate(variant.layout, variant.accent.hex, variant.accent.soft);
  writeFileSync(htmlPath, html);

  await page.goto(`file://${htmlPath}`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: imgPath, fullPage: false });

  const bytes = readFileSync(imgPath);
  if (bytes.length < 50_000) {
    pipeLog(`render attempt ${attempt} | image too small (${bytes.length}B) | layout=${variant.layout}`);
    continue;
  }

  const hash = await computePHashFromBytes(page, bytes);
  const minDist = recentHashes.reduce(
    (m, h) => Math.min(m, hammingHex(h.hash, hash)),
    PHASH_BITS,
  );
  lastDist = minDist;

  console.log(`      attempt ${attempt} | layout=${variant.layout} accent=${variant.accent.hex} hash=${hash} minDist=${minDist}`);

  if (minDist >= PHASH_THRESHOLD || recentHashes.length === 0) {
    imgBytes = bytes;
    chosen   = { ...variant, hash, dist: minDist, attempt };
    pipeLog(`render OK | post #${pending.num} | layout=${variant.layout} accent=${variant.accent.hex} hash=${hash} minDist=${minDist} attempts=${attempt}`);
    break;
  }
  pipeLog(`render attempt ${attempt} | TOO SIMILAR (dist=${minDist} < ${PHASH_THRESHOLD}) | trying different variant`);
}

await browser.close();

if (!imgBytes || !chosen) {
  pipeLog(`render FAIL | post #${pending.num} | exhausted ${MAX_RENDER_ATTEMPTS} variants | lastDist=${lastDist}`);
  appendLog(`${stamp()} | FAIL | post #${pending.num} | image dedup failed (lastDist=${lastDist})`);
  console.error('All variants too similar to recent posts — aborting');
  process.exit(1);
}

console.log(`      ${imgPath} — ${(imgBytes.length / 1024).toFixed(1)} KB | layout=${chosen.layout} accent=${chosen.accent.hex}`);

if (DRY_RUN) {
  console.log('\n[DRY_RUN] skipping LinkedIn API + queue mutation');
  pipeLog(`DRY_RUN OK | post #${pending.num} | hash=${chosen.hash} layout=${chosen.layout} accent=${chosen.accent.hex}`);
  process.exit(0);
}

// ── 4. Publish to LinkedIn ───────────────────────────────────────────────────
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

updated = updated.replace(
  /^posts_published:\s*(\d+)\s*$/m,
  (_, n) => `posts_published: ${parseInt(n, 10) + 1}`,
);

writeFileSync(QUEUE_FILE, updated);

// ── 6. Record slug + log success + persist image hash ────────────────────────
if (meta.slug) {
  const SLUGS_FILE = 'linkedin-slugs-used.txt';
  const existing = existsSync(SLUGS_FILE) ? readFileSync(SLUGS_FILE, 'utf8') : '';
  const slugs = existing.split('\n').filter(Boolean);
  if (!slugs.includes(meta.slug)) {
    writeFileSync(SLUGS_FILE, slugs.concat(meta.slug).join('\n') + '\n');
  }
}

if (chosen?.hash) {
  const updatedHashes = recentHashes.concat({
    hash: chosen.hash,
    layout: chosen.layout,
    accent: chosen.accent.hex,
    slug: meta.slug || '',
    ts: nowIso,
  });
  saveRecentHashes(updatedHashes);
}

const first80 = caption.slice(0, 80).replace(/\n/g, ' ');
appendLog(`${stamp()} | ${shareUrn} | post #${pending.num} | ${meta.slug || ''} | ${first80}`);
console.log(`\nOK ${shareUrn}`);
console.log(`https://www.linkedin.com/feed/update/${shareUrn}/`);
