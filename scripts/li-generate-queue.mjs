#!/usr/bin/env node
/**
 * li-generate-queue.mjs — Daily LinkedIn content pipeline.
 * Called by .github/workflows/linkedin-content-pipeline.yml at 04:00 UTC.
 *
 * 1. Idempotency check — skip if today's queue already has pending posts
 * 2. Load context (keyword strategy, slugs used, recent log)
 * 3. Call Claude Sonnet to generate 5 posts
 * 4. Validate output and write linkedin-queue/daily-posts.md
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const { ANTHROPIC_API_KEY } = process.env;
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const QUEUE_FILE  = 'linkedin-queue/daily-posts.md';
const SLUGS_FILE  = 'linkedin-slugs-used.txt';
const LOG_FILE    = 'linkedin-post-log.md';
const TODAY       = new Date().toISOString().slice(0, 10);
const NOW_ISO     = new Date().toISOString();

const readSafe = p => existsSync(p) ? readFileSync(p, 'utf8') : '';

// ── 1. Idempotency ────────────────────────────────────────────────────────────
const existing = readSafe(QUEUE_FILE);
if (existing.includes(`date: ${TODAY}`) && existing.includes('status: pending')) {
  console.log(`Queue for ${TODAY} already has pending posts — skipping generation.`);
  process.exit(0);
}

// ── 2. Load context ───────────────────────────────────────────────────────────
const keywordStrategy = readFileSync('beyondelevation-keyword-strategy.md', 'utf8');

// All slugs ever used: linkedin-slugs-used.txt + slug: lines from current queue file
const fileSlugLines = (existing.match(/^slug:\s*(.+)$/gm) || []).map(l => l.replace(/^slug:\s*/, '').trim());
const trackedSlugs  = readSafe(SLUGS_FILE).split('\n').filter(Boolean);
const allSlugsUsed  = [...new Set([...trackedSlugs, ...fileSlugLines])].join('\n') || '(none yet)';

// Last 30 log lines for pillar-rotation context
const recentLog = readSafe(LOG_FILE).split('\n').filter(Boolean).slice(-30).join('\n') || '(no log yet)';

// ── 3. Build prompt ───────────────────────────────────────────────────────────
const SYSTEM = `\
You are Beyond Elevation's LinkedIn content strategist. Beyond Elevation is an IP strategy \
and data intelligence consultancy led by Hayat Amin — the operator who turned a 66-patent \
portfolio into eight figures of recurring royalty revenue.

THREE CONTENT PILLARS — rotate across all 5 posts, never 3 consecutive in the same pillar:
1. IP       — patents, licensing, IP strategy, holdco structure, trade secrets, IP monetisation, valuation
2. AI       — AI strategy, AI governance, AI transformation, AI IP/patents, agentic AI, EU AI Act
3. Financial — exit multiples, M&A/IP positioning, data monetisation, valuation methods, capital strategy

HORMOZI RULES (non-negotiable):
- Line 1: hook — contrarian claim, specific number, or pattern break. No warm-up.
- One idea per line. Blank line between EVERY line.
- Specific numbers (real or highly plausible). No vague claims.
- No emoji. No "thrilled". No "excited to share". No fluff.
- 3 hashtags max at the end, on the final line.
- Caption HARD CAP: 700 characters including newlines and hashtags.

BEIP IMAGE RULES:
- headline: two lines separated by <br>, punchy, derived from the caption hook
- 3 metric tiles: big number/stat + short uppercase label (use <br> for two-line labels)
- Metrics must reinforce the caption — real or highly plausible numbers

Output ONLY the file content. No preamble. No explanation. Start immediately with ---.`;

const USER = `\
Today is ${TODAY}. Generate the full content of linkedin-queue/daily-posts.md with 5 posts.

SLUGS ALREADY USED — never repeat or create a semantic near-duplicate of these:
${allSlugsUsed}

RECENT POST LOG — use this to determine pillar rotation and avoid repeating angles:
${recentLog}

KEYWORD STRATEGY — pick uncovered topics walking Tier 1 → Tier 5:
${keywordStrategy}

Output EXACTLY this format:

---
date: ${TODAY}
theme: <one sentence describing today's unifying angle>
generated_at: ${NOW_ISO}
posts_total: 5
posts_published: 0
---

# Daily theme
<2-3 sentences explaining today's content batch and the through-line across posts>

# Topic shortlist (research notes - not posted)
1. <topic — keyword, angle, key number>
2. <topic — keyword, angle, key number>
3. <topic — keyword, angle, key number>
4. <topic — keyword, angle, key number>
5. <topic — keyword, angle, key number>

---

## Post 1
status: pending
hook_format: <contrarian|number-led|frame-break|listicle|prediction|story>
cta_goal: <follows|dms|clicks>
slug: <new-kebab-case-slug>
keyword: <primary keyword phrase>
numbers_check: <num1, num2, num3>
headline: <headline line one><br><headline line two>
metric_1: <big number>
label_1: <UPPERCASE<br>LABEL>
metric_2: <big number>
label_2: <UPPERCASE<br>LABEL>
metric_3: <big number>
label_3: <UPPERCASE<br>LABEL>

<caption — Hormozi style, ≤700 chars total, blank line between every line>

#Hashtag1 #Hashtag2 #Hashtag3

---

## Post 2
[same structure as Post 1]

---

## Post 3
[same structure]

---

## Post 4
[same structure]

---

## Post 5
[same structure]

HARD RULES:
- Rotate pillars across the 5 posts (IP / AI / Financial — no 3 consecutive same pillar)
- Every slug must be brand new — not in the slugs-already-used list
- Every caption ≤700 characters (count carefully including newlines and hashtags)
- Every headline must use <br> to split into exactly two lines
- Output ONLY the file — nothing before the opening --- or after the last post`;

// ── 4. Call Claude ────────────────────────────────────────────────────────────
console.log(`Calling Claude to generate queue for ${TODAY}...`);

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: 'user', content: USER }],
  }),
});

if (!res.ok) {
  console.error(`Anthropic API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const data  = await res.json();
const raw   = data.content?.[0]?.text?.trim();

if (!raw) {
  console.error('Empty response from Claude');
  process.exit(1);
}

// ── 5. Validate ───────────────────────────────────────────────────────────────
const pendingCount = (raw.match(/^status:\s*pending\s*$/gm) || []).length;
const hasHeadline  = raw.includes('headline:');
const hasMetrics   = raw.includes('metric_1:');
const hasDate      = raw.includes(`date: ${TODAY}`);

if (pendingCount < 5 || !hasHeadline || !hasMetrics || !hasDate) {
  console.error(`Validation failed — pendingPosts=${pendingCount} headline=${hasHeadline} metrics=${hasMetrics} date=${hasDate}`);
  console.error('First 800 chars of response:\n', raw.slice(0, 800));
  process.exit(1);
}

// Strip any prose Claude added before the opening ---
let fileContent = raw;
const fmStart = raw.indexOf('---');
if (fmStart > 0) fileContent = raw.slice(fmStart);

// ── 6. Write ──────────────────────────────────────────────────────────────────
writeFileSync(QUEUE_FILE, fileContent + '\n');
console.log(`Written ${QUEUE_FILE} with ${pendingCount} pending posts (${Buffer.byteLength(fileContent)} bytes)`);
