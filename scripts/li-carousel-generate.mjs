#!/usr/bin/env node
/**
 * li-carousel-generate.mjs — Daily carousel content pipeline.
 * Called by .github/workflows/linkedin-carousel-pipeline.yml at 03:00 UTC.
 *
 * 1. Idempotency check — skip if today's carousel queue already has pending items
 * 2. Load context (keyword strategy, carousel slugs used, recent log)
 * 3. Call Claude Sonnet to generate 5 carousels (7-slide BEIP format)
 * 4. Validate output and write linkedin-carousel-queue/daily-carousels.md
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';

const { ANTHROPIC_API_KEY } = process.env;
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const QUEUE_FILE  = 'linkedin-carousel-queue/daily-carousels.md';
const SLUGS_FILE  = 'linkedin-carousel-slugs-used.txt';
const LOG_FILE    = 'linkedin-carousel-post-log.md';
const IMG_LOG     = 'linkedin-post-log.md';         // image post log for pillar context
const TODAY       = new Date().toISOString().slice(0, 10);
const NOW_ISO     = new Date().toISOString();

mkdirSync('linkedin-carousel-queue', { recursive: true });

const readSafe = p => existsSync(p) ? readFileSync(p, 'utf8') : '';

// ── 1. Idempotency ────────────────────────────────────────────────────────────
const existing = readSafe(QUEUE_FILE);
if (existing.includes(`date: ${TODAY}`) && existing.includes('status: pending')) {
  console.log(`Carousel queue for ${TODAY} already has pending items — skipping.`);
  process.exit(0);
}

// ── 2. Load context ───────────────────────────────────────────────────────────
const keywordStrategy = readFileSync('beyondelevation-keyword-strategy.md', 'utf8');

const fileSlugLines = (existing.match(/^slug:\s*(.+)$/gm) || []).map(l => l.replace(/^slug:\s*/, '').trim());
const trackedSlugs  = readSafe(SLUGS_FILE).split('\n').filter(Boolean);
const allSlugsUsed  = [...new Set([...trackedSlugs, ...fileSlugLines])].join('\n') || '(none yet)';

// Combine both logs for pillar rotation context
const recentCarouselLog = readSafe(LOG_FILE).split('\n').filter(Boolean).slice(-15).join('\n') || '(no carousel log yet)';
const recentImageLog    = readSafe(IMG_LOG).split('\n').filter(Boolean).slice(-15).join('\n') || '(no image log yet)';

// ── 3. Build prompt ───────────────────────────────────────────────────────────
const SYSTEM = `\
You are Beyond Elevation's LinkedIn carousel strategist. Beyond Elevation is an IP strategy \
and data intelligence consultancy led by Hayat Amin — the operator who turned a 66-patent \
portfolio into eight figures of recurring royalty revenue.

You generate 7-slide BEIP carousels for LinkedIn. Each carousel is a PDF document post \
that readers swipe through slide by slide. They must be eye-grabbing, data-dense, and \
scroll-to-the-end compelling.

CAROUSEL STRUCTURE (7 slides, non-negotiable):
- Slide 1 (Cover): Hook headline in cover_hook (use <br> to split into 2 lines), cover_sub (italic sub-headline)
- Slides 2–5 (Metric): Each has a BIG stat (slide2_stat / slide3_stat / slide4_stat / slide5_stat),
  a SHORT UPPERCASE label (slide2_label etc.), and a 1–2 sentence body (slide2_body etc.)
- Slide 6 (Takeaway): A single punchy takeaway sentence (takeaway field) — no numbers, pure insight
- Slide 7 (About): Static Hayat Amin slide — auto-generated, no fields needed

THREE CONTENT PILLARS — rotate across all 5 carousels, never 3 consecutive in the same pillar:
1. IP       — patents, licensing, IP strategy, holdco structure, trade secrets, IP monetisation, valuation
2. AI       — AI strategy, AI governance, AI transformation, AI IP/patents, agentic AI, EU AI Act
3. Financial — exit multiples, M&A/IP positioning, data monetisation, valuation methods, capital strategy

RULES (non-negotiable):
- Big stats: huge numbers people can't scroll past (e.g. 30x, 78%, $7.2B, 10.2x, €580B)
- slide_body fields: 1–2 sentences, specific, real or highly plausible numbers, no fluff
- cover_hook: max 8 words per line, punchy contrarian or number-led
- Caption: Hormozi style — hook line 1, one idea per line, blank line between every line, ≤700 chars
- No emoji, no "thrilled", no "excited to share"
- 3 hashtags max at end of caption
- Carousel slugs end in -carousel to distinguish from image post slugs

Output ONLY the file content. No preamble. Start immediately with ---.`;

const USER = `\
Today is ${TODAY}. Generate the full content of linkedin-carousel-queue/daily-carousels.md with 5 carousels.

CAROUSEL SLUGS ALREADY USED — never repeat or create a semantic near-duplicate:
${allSlugsUsed}

RECENT CAROUSEL LOG (for pillar rotation):
${recentCarouselLog}

RECENT IMAGE POST LOG (for context on what was recently covered):
${recentImageLog}

KEYWORD STRATEGY — pick uncovered topics walking Tier 1 → Tier 5 (same source as image posts):
${keywordStrategy}

Output EXACTLY this format — no prose before the opening --- or after the last carousel:

---
date: ${TODAY}
generated_at: ${NOW_ISO}
carousels_total: 5
carousels_published: 0
---

## Carousel 1
status: pending
slug: <kebab-case-topic-carousel>
pillar: <IP|AI|Financial>
cover_hook: <line one of hook><br><line two of hook>
cover_sub: <italic sub-headline, 6–10 words>
slide2_stat: <big number e.g. 30x or 78% or $7.2B>
slide2_label: <SHORT LABEL<br>LINE TWO>
slide2_body: <1–2 sentence explanation, specific numbers>
slide3_stat: <big number>
slide3_label: <SHORT LABEL<br>LINE TWO>
slide3_body: <1–2 sentence explanation>
slide4_stat: <big number>
slide4_label: <SHORT LABEL<br>LINE TWO>
slide4_body: <1–2 sentence explanation>
slide5_stat: <big number>
slide5_label: <SHORT LABEL<br>LINE TWO>
slide5_body: <1–2 sentence explanation>
takeaway: <single punchy insight sentence — what should the reader do or know?>

<caption — Hormozi style, ≤700 chars total, blank line between EVERY line>

#Hashtag1 #Hashtag2 #Hashtag3

---

## Carousel 2
[same structure]

---

## Carousel 3
[same structure]

---

## Carousel 4
[same structure]

---

## Carousel 5
[same structure]

HARD RULES:
- Rotate pillars across the 5 carousels (IP / AI / Financial — no 3 consecutive same pillar)
- Every slug must end in -carousel and be brand new
- Every caption ≤700 characters including newlines and hashtags
- cover_hook must use <br> to split into exactly two punchy lines
- All slide label fields must use <br> to split into two lines
- Slides 2–5 stats must be DIFFERENT numbers — no repeats across the 4 metric slides
- Output ONLY the file content`;

// ── 4. Call Claude ────────────────────────────────────────────────────────────
console.log(`Generating carousel queue for ${TODAY}...`);

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 10000,
    system: SYSTEM,
    messages: [{ role: 'user', content: USER }],
  }),
});

if (!res.ok) {
  console.error(`Anthropic API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const data = await res.json();
const raw  = data.content?.[0]?.text?.trim();

if (!raw) {
  console.error('Empty response from Claude');
  process.exit(1);
}

// ── 5. Validate ───────────────────────────────────────────────────────────────
const pendingCount = (raw.match(/^status:\s*pending\s*$/gm) || []).length;
const hasCoverHook = raw.includes('cover_hook:');
const hasSlide2    = raw.includes('slide2_stat:');
const hasTakeaway  = raw.includes('takeaway:');
const hasDate      = raw.includes(`date: ${TODAY}`);

if (pendingCount < 5 || !hasCoverHook || !hasSlide2 || !hasTakeaway || !hasDate) {
  console.error(`Validation failed — pending=${pendingCount} cover=${hasCoverHook} slide2=${hasSlide2} takeaway=${hasTakeaway} date=${hasDate}`);
  console.error('First 1000 chars:\n', raw.slice(0, 1000));
  process.exit(1);
}

let fileContent = raw;
const fmStart = raw.indexOf('---');
if (fmStart > 0) fileContent = raw.slice(fmStart);

// ── 6. Write ──────────────────────────────────────────────────────────────────
writeFileSync(QUEUE_FILE, fileContent + '\n');
console.log(`Written ${QUEUE_FILE} with ${pendingCount} pending carousels (${Buffer.byteLength(fileContent)} bytes)`);
