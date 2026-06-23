#!/usr/bin/env node
/**
 * li-generate-queue.mjs — Daily LinkedIn content pipeline.
 * Called by .github/workflows/linkedin-content-pipeline.yml at 04:00 UTC.
 *
 * 1. Idempotency check — skip if today's queue already has pending posts
 * 2. Load context (keyword strategy, slugs used, recent log, P→M→R template)
 * 3. Call Claude Sonnet to generate 5 posts — RETRY up to 3 times if any post
 *    fails the P→M→R quality gate
 * 4. Validate output and write linkedin-queue/daily-posts.md
 *
 * Quality gate (Hormozi P→M→R) per caption:
 *   - HOOK (line 1) ≤9 words, ends in . or :
 *   - MECHANISM: 3+ numbered or bulleted lines
 *   - RESULT: at least one specific number (e.g. 87%, $14M, 2,200 publishers, 11 days)
 *   - No banned tokens (em-dashes, "leverage" as verb, "delve", "seamless",
 *     "navigate the landscape", forbidden openers)
 *   - Audience lens: addresses worker / founder, not employer/HR
 *
 * If a post fails the gate after 3 full-batch retries, the run is logged to
 * linkedin-pipeline-log.md and exits non-zero (per routine-resilience rule).
 *
 * RAIL STATUS (2026-06-15): runs in GitHub Actions (cloud), so no local
 * `claude -p` subscription CLI. Primary rail = Anthropic API
 * (secrets.ANTHROPIC_API_KEY), which has $0 credit and throws 400
 * "credit balance is too low". FALLBACK rail = Google Gemini
 * (secrets.GEMINI_API_KEY, gemini-2.0-flash REST). callModel() tries
 * Anthropic, and on ANY error (400 credit / 401 / 5xx / network) falls back
 * to Gemini with the same prompt and output shape. Both rails must fail before
 * an attempt aborts. So today, with $0 Anthropic credit, runs succeed via Gemini.
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';

const { ANTHROPIC_API_KEY, GEMINI_API_KEY } = process.env;
if (!ANTHROPIC_API_KEY && !GEMINI_API_KEY) {
  console.error('Missing both ANTHROPIC_API_KEY and GEMINI_API_KEY — need at least one generation rail');
  process.exit(1);
}

const QUEUE_FILE     = 'linkedin-queue/daily-posts.md';
const TEMPLATE_FILE  = 'linkedin-queue/post-template.md';
const SLUGS_FILE     = 'linkedin-slugs-used.txt';
const LOG_FILE       = 'linkedin-post-log.md';
const PIPELINE_LOG   = 'linkedin-pipeline-log.md';
const TODAY          = new Date().toISOString().slice(0, 10);
const NOW_ISO        = new Date().toISOString();
const MAX_ATTEMPTS   = 3;

const readSafe = p => existsSync(p) ? readFileSync(p, 'utf8') : '';
const stamp    = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
const pipeLog  = msg => {
  const line = `${stamp()} | li-generate-queue | ${msg}\n`;
  appendFileSync(PIPELINE_LOG, line);
  console.log(line.trim());
};

// ── 1. Idempotency ────────────────────────────────────────────────────────────
const existing = readSafe(QUEUE_FILE);
if (existing.includes(`date: ${TODAY}`) && existing.includes('status: pending')) {
  console.log(`Queue for ${TODAY} already has pending posts — skipping generation.`);
  process.exit(0);
}

// ── 2. Load context ───────────────────────────────────────────────────────────
const keywordStrategy = readFileSync('beyondelevation-keyword-strategy.md', 'utf8');
const postTemplate    = readSafe(TEMPLATE_FILE);

if (!postTemplate) {
  console.error(`Missing ${TEMPLATE_FILE} — required for P→M→R enforcement`);
  process.exit(1);
}

// All slugs ever used: linkedin-slugs-used.txt + slug: lines from current queue file
const fileSlugLines = (existing.match(/^slug:\s*(.+)$/gm) || []).map(l => l.replace(/^slug:\s*/, '').trim());
const trackedSlugs  = readSafe(SLUGS_FILE).split('\n').filter(Boolean);
const allSlugsUsed  = [...new Set([...trackedSlugs, ...fileSlugLines])].join('\n') || '(none yet)';

// Last 30 log lines for pillar-rotation context
const recentLog = readSafe(LOG_FILE).split('\n').filter(Boolean).slice(-30).join('\n') || '(no log yet)';

// ── 3. Quality gate ───────────────────────────────────────────────────────────
const BANNED_TOKENS = [
  ' — ', ' – ',                                  // em-dash / en-dash
  /\bleverage\b/i, /\bleveraging\b/i, /\bleveraged\b/i,
  /\bdelve\b/i, /\bdelving\b/i,
  /\bseamless\b/i, /\bseamlessly\b/i,
  /navigate the landscape/i,
  /^in today'?s\b/im,
  /^companies are\b/im,
  /^it'?s no secret\b/im,
];

const SPECIFIC_NUMBER = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?%|\$[\d,.]+(?:[KkMmBb])?|\b\d+\s*(?:founders|clients|days|weeks|months|years|publishers|patents|companies|customers|operators|deals|x|×)\b)/i;

function countWords(line) {
  return line.trim().split(/\s+/).filter(Boolean).length;
}

function stripHashtags(caption) {
  return caption.split('\n').filter(l => !/^#[A-Za-z0-9_ #]+$/.test(l.trim())).join('\n');
}

// 2026-05-01 COO audit: cheap pre-gate auto-fix. Claude Sonnet 4-6 ignores
// "no em-dashes" and "no leverage" instructions ~100% of the time. Rather than
// burn 3 retries fighting the model, normalise the obvious things first and
// only fail the gate on stuff we can't safely auto-fix (hook length, missing
// numbers, mechanism shape, audience framing). Cuts gate failures by ~70%.
function autoCleanCaption(caption) {
  return caption
    // em-dash / en-dash → period+space (preserves sentence rhythm)
    .replace(/\s+[—–]\s+/g, '. ')
    .replace(/[—–]/g, '. ')
    // "leverage" verb forms → "use" forms (banned per brand voice)
    .replace(/\bLeveraging\b/g, 'Using')
    .replace(/\bleveraging\b/g, 'using')
    .replace(/\bLeveraged\b/g, 'Used')
    .replace(/\bleveraged\b/g, 'used')
    .replace(/\bLeverage\b/g, 'Use')
    .replace(/\bleverage\b/g, 'use')
    // Other lazy AI tics caught by BANNED_TOKENS
    .replace(/\bDelving\b/g, 'Working through').replace(/\bdelving\b/g, 'working through')
    .replace(/\bDelve\b/g, 'Work through').replace(/\bdelve\b/g, 'work through')
    .replace(/\bSeamlessly\b/g, 'Cleanly').replace(/\bseamlessly\b/g, 'cleanly')
    .replace(/\bSeamless\b/g, 'Clean').replace(/\bseamless\b/g, 'clean')
    .replace(/navigate the landscape/gi, 'work the market')
    // Collapse the double-period the dash replacement can leave
    .replace(/\.\s*\./g, '.');
}

function validateCaption(caption) {
  const reasons = [];
  const body = stripHashtags(caption);
  const lines = body.split('\n').map(l => l.trim());
  const nonEmpty = lines.filter(Boolean);

  if (nonEmpty.length < 4) reasons.push('caption_too_short');

  const hook = nonEmpty[0] || '';
  const hookWords = countWords(hook);
  if (hookWords > 9) reasons.push(`hook_too_long(${hookWords}w)`);
  if (!/[.:]\s*$/.test(hook)) reasons.push('hook_no_terminal_punct');

  const mechLines = nonEmpty.filter(l => /^(?:\d+[.)]\s+|[-*•]\s+)/.test(l));
  if (mechLines.length < 3) reasons.push(`mechanism_lines<3(${mechLines.length})`);

  if (!SPECIFIC_NUMBER.test(body)) reasons.push('no_specific_number');

  for (const tok of BANNED_TOKENS) {
    if (typeof tok === 'string') {
      if (body.includes(tok)) reasons.push(`banned:${JSON.stringify(tok)}`);
    } else if (tok.test(body)) {
      reasons.push(`banned_re:${tok}`);
    }
  }

  if (/^(stop paying salaries|5 reasons companies|why companies should)/im.test(body)) {
    reasons.push('audience_employer_framing');
  }

  return { ok: reasons.length === 0, reasons };
}

function parseGeneratedPosts(raw) {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const body = fmMatch ? fmMatch[2] : raw;
  const blocks = [];
  const re = /\n## Post (\d+)\n([\s\S]*?)(?=\n## Post |\n*$)/g;
  let m;
  while ((m = re.exec('\n' + body)) !== null) {
    const block = m[2];
    const lines = block.split('\n');
    let i = 0;
    for (; i < lines.length; i++) if (lines[i].trim() === '') break;
    let captionLines = lines.slice(i + 1);
    const sep = captionLines.findIndex(l => l.trim() === '---');
    if (sep >= 0) captionLines = captionLines.slice(0, sep);
    blocks.push({ num: parseInt(m[1], 10), caption: captionLines.join('\n').trim() });
  }
  return blocks;
}

// ── 4. Build prompt ───────────────────────────────────────────────────────────
const SYSTEM = `\
You are Beyond Elevation's LinkedIn content strategist. Beyond Elevation is an IP strategy \
and data intelligence consultancy led by Hayat Amin — the operator who turned a 66-patent \
portfolio into eight figures of recurring royalty revenue.

EVERY caption MUST follow the Hormozi Pain → Mechanism → Result template defined below. \
This is non-negotiable. Treat the template as a hard contract.

=========================================================
${postTemplate}
=========================================================

FIXED CONTENT SPLIT - exactly 5 posts, assigned by POSITION, never deviate:
- Posts 1-2 = IP pillar: patents, licensing, IP strategy, holdco structure, trade secrets, IP monetisation, valuation. Same angle, voice, and quality as every prior batch.
- Posts 3-5 = AI OPERATIONS pillar: how companies actually USE AI to win - drive sales/revenue, build operational efficiency, make processes cleaner and more effective. Write these as Hayat's first-person thought leadership: blend what is happening across the industry right now with what Hayat is doing with clients. Go controversial and very niche - contrarian operator insights NOT found in generic AI commentary. This is NOT AI strategy/governance/EU-AI-Act theory and NOT AI patents - it is hands-on AI operations proven with hard numbers (hours saved, % cost cut, conversion or close-rate lift, headcount avoided, cycle-time drop, $ impact, payback period). Each AI-ops post needs at least 2 specific numbers and at least 1 named KPI.

HARD WRITING RULES:
- AUDIENCE: founders / CEOs / Seed–Series B operators. Speak TO the operator. Never address \
  HR, paralegals, or "companies" in the abstract.
- HOOK (line 1): ≤9 words, contrarian or numbered, ends with period or colon. No warm-up.
- PAIN (1–2 lines): the specific cost of NOT solving this, in CEO terms.
- MECHANISM: 3–5 numbered steps OR bulleted lines. The actual "how", concrete moves.
- RESULT: one line. A specific number, client outcome, or stat (e.g. "$14M in 11 days", "87%", "2,200 publishers").
- CTA: a binary or open question that invites a comment ("↳ Founders: which X would hurt most?").
- One idea per line. Blank line between every line.
- NO emoji. NO "thrilled". NO "excited to share". NO em-dashes. NO "leverage" as a verb. \
  NO "delve". NO "seamless". NO "navigate the landscape".
- FORBIDDEN OPENERS: "In today's...", "Companies are...", "It's no secret that...", abstract noun phrases.
- 3 hashtags max at the end, on the final line.
- Caption HARD CAP: 700 characters including newlines and hashtags.
- FOLD-SAFE OPENING: LinkedIn collapses the post after roughly 210 characters with a "see more". The HOOK plus the very next line must BOTH deliver concrete payoff (a number, a named result). NEVER let a bare teaser like "The fix", "Here's how", or "The play:" be the last visible line before that fold — if you promise a fix, the result number must already be visible above it. Put the win in the first two lines, then the mechanism.

BEIP IMAGE RULES (frontmatter only — these drive the visual card, not the caption):
- headline: two lines separated by <br>, punchy, derived from the caption hook
- 3 metric tiles: big number/stat + short uppercase label (use <br> for two-line labels)
- Metrics must reinforce the caption — real or highly plausible numbers

Output ONLY the file content. No preamble. No explanation. Start immediately with ---.`;

function buildUser(extraNote = '') {
  return `\
Today is ${TODAY}. Generate the full content of linkedin-queue/daily-posts.md with 5 posts.

SLUGS ALREADY USED — never repeat or create a semantic near-duplicate of these:
${allSlugsUsed}

RECENT POST LOG — use only to avoid repeating angles and slugs. Do NOT rotate pillars: the split is FIXED by position (Posts 1-2 IP, Posts 3-5 AI operations):
${recentLog}

KEYWORD STRATEGY (for the 2 IP posts ONLY — ignore it entirely when writing the 3 AI-operations posts): pick uncovered IP topics walking Tier 1 → Tier 5:
${keywordStrategy}
${extraNote ? `\nFEEDBACK FROM PREVIOUS ATTEMPT (fix all of these):\n${extraNote}\n` : ''}
REMINDER - POST PILLARS ARE FIXED BY POSITION:
- Post 1, Post 2 = IP (patents, licensing, IP strategy, valuation).
- Post 3, Post 4, Post 5 = AI OPERATIONS only. Each shows how a company USES AI to drive sales/revenue, build operational efficiency, or make a process cleaner - proven with at least 2 hard numbers and a named KPI (e.g. "cut SDR ramp 40%", "an agent replaced a 3-person ops queue, 18-day payback", "AI ticket triage lifted CSAT 12 points"). Frame as Hayat's first-person operator POV plus current client work; controversial and very niche.
- REJECT for Posts 3-5 (these are NOT AI operations): EU AI Act, AI governance or policy, AI patents/IP, "AI moat"/defensibility, valuation multiples, data-as-asset theory. If a Post 3-5 draft is about any of those, rewrite it as a hands-on operations play with numbers.
All 5 posts keep the identical format and all have image frontmatter.

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

<HOOK line — ≤9 words, period or colon>

<PAIN — 1–2 lines naming the cost of inaction>

The fix (3 moves, this week):
1. <step>
2. <step>
3. <step>

<RESULT line — a specific number or client outcome>

<CTA — a question inviting comment>

#Hashtag1 #Hashtag2 #Hashtag3

---

## Post 2
[same structure as Post 1 — PILLAR: IP]

---

## Post 3
[same structure — PILLAR: AI OPERATIONS — a concrete AI deployment that drove sales / efficiency / cleaner process, quantified; NOT governance, EU AI Act, patents, or moats]

---

## Post 4
[same structure — PILLAR: AI OPERATIONS]

---

## Post 5
[same structure — PILLAR: AI OPERATIONS]

HARD RULES:
- FIXED SPLIT (do NOT rotate): Posts 1-2 = IP pillar. Posts 3-5 = AI OPERATIONS pillar (how companies USE AI to lift sales, cut cost, or clean up a process, with hard numbers). AI-ops posts must NOT be about AI governance, the EU AI Act, AI patents, "moats", or valuation multiples.
- Every slug must be brand new — not in the slugs-already-used list
- Every caption ≤700 characters (count carefully including newlines and hashtags)
- Every headline must use <br> to split into exactly two lines
- Every caption MUST pass: hook ≤9 words, 3+ numbered/bulleted mechanism lines, at least one specific number, no banned tokens
- Output ONLY the file — nothing before the opening --- or after the last post`;
}

// ── 5. Generation rails (Anthropic primary, Gemini fallback) ──────────────────
// The Anthropic account currently has $0 credit, so every cloud run threw 400
// "credit balance too low" and the routine failed daily. Per routine-resilience:
// try Anthropic first; on ANY error (400 credit / 401 / 5xx / network), fall back
// to Google Gemini using GEMINI_API_KEY. Both must fail before we abort the attempt.
async function callAnthropic(userMessage) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
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
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const raw  = data.content?.[0]?.text?.trim();
  if (!raw) throw new Error('Empty response from Anthropic');
  return raw;
}

async function callGemini(userMessage) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      // 2.5-flash spends "thinking" tokens before the answer; keep the budget
      // high so the full 5-post file isn't truncated (finishReason MAX_TOKENS).
      generationConfig: { temperature: 0.9, maxOutputTokens: 16000 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const raw  = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim();
  if (!raw) throw new Error(`Empty response from Gemini (finishReason=${data.candidates?.[0]?.finishReason || 'none'})`);
  return raw;
}

// Returns the same shape (a raw markdown string) regardless of which rail served it.
async function callModel(userMessage) {
  try {
    const out = await callAnthropic(userMessage);
    console.log('  rail: anthropic (claude-sonnet-4-6)');
    return out;
  } catch (anthErr) {
    pipeLog(`anthropic failed (${anthErr.message.slice(0, 160)}) → falling back to gemini`);
    try {
      const out = await callGemini(userMessage);
      console.log('  rail: gemini-2.5-flash (fallback)');
      return out;
    } catch (gemErr) {
      throw new Error(`both rails failed — anthropic: ${anthErr.message.slice(0, 140)} | gemini: ${gemErr.message.slice(0, 140)}`);
    }
  }
}

let raw = null;
let lastFailures = '';

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`Calling model (attempt ${attempt}/${MAX_ATTEMPTS}) for ${TODAY}...`);
  let candidate;
  try {
    candidate = await callModel(buildUser(lastFailures));
  } catch (e) {
    pipeLog(`attempt ${attempt} | API error: ${e.message.slice(0, 200)}`);
    if (attempt === MAX_ATTEMPTS) {
      pipeLog(`ABORT after ${MAX_ATTEMPTS} attempts — API unreachable`);
      process.exit(1);
    }
    await new Promise(r => setTimeout(r, 3000 + attempt * 2000));
    continue;
  }

  const pendingCount = (candidate.match(/^status:\s*pending\s*$/gm) || []).length;
  const hasHeadline  = candidate.includes('headline:');
  const hasMetrics   = candidate.includes('metric_1:');
  const hasDate      = candidate.includes(`date: ${TODAY}`);
  if (pendingCount < 5 || !hasHeadline || !hasMetrics || !hasDate) {
    lastFailures = `Structural failure: pendingPosts=${pendingCount} headline=${hasHeadline} metrics=${hasMetrics} date=${hasDate}. Re-emit ALL 5 posts with the exact frontmatter and the canonical headline:/metric_*/label_* lines.`;
    pipeLog(`attempt ${attempt} | ${lastFailures}`);
    continue;
  }

  // Auto-clean every caption (em-dashes, "leverage", etc.) BEFORE gating.
  // Re-emit the candidate with the cleaned bodies so the file we keep already
  // has the cleanups baked in.
  const posts = parseGeneratedPosts(candidate);
  const failures = [];
  const cleanedFailures = []; // for retry feedback: full text Claude can rewrite from
  let totalAutoFixes = 0;
  for (const p of posts) {
    const cleaned = autoCleanCaption(p.caption);
    if (cleaned !== p.caption) {
      totalAutoFixes++;
      candidate = candidate.replace(p.caption, cleaned);
      p.caption = cleaned;
    }
    const v = validateCaption(p.caption);
    if (!v.ok) {
      failures.push(`Post ${p.num}: ${v.reasons.join(', ')}`);
      cleanedFailures.push(`Post ${p.num} FAILED [${v.reasons.join(', ')}]\nCURRENT TEXT (rewrite ONLY this post — keep all other posts unchanged):\n${p.caption}`);
    }
  }
  if (totalAutoFixes > 0) {
    pipeLog(`attempt ${attempt} | auto-cleaned ${totalAutoFixes}/${posts.length} post(s) (em-dashes / leverage / etc.)`);
  }

  if (failures.length === 0) {
    raw = candidate;
    pipeLog(`attempt ${attempt} | OK — all 5 posts pass P→M→R gate (auto-fixes=${totalAutoFixes})`);
    break;
  }

  lastFailures = failures.join('\n') + '\n\n' + cleanedFailures.join('\n\n');
  pipeLog(`attempt ${attempt} | quality gate failed:\n${failures.join('\n')}`);
  if (attempt === MAX_ATTEMPTS) {
    pipeLog(`ABORT after ${MAX_ATTEMPTS} attempts — quality gate could not be satisfied. SKIPPING SLOT per routine-resilience rule.`);
    process.exit(1);
  }
  await new Promise(r => setTimeout(r, 2000 + attempt * 1500));
}

if (!raw) {
  pipeLog('ABORT — no candidate accepted');
  process.exit(1);
}

let fileContent = raw;
const fmStart = raw.indexOf('---');
if (fmStart > 0) fileContent = raw.slice(fmStart);

writeFileSync(QUEUE_FILE, fileContent + '\n');
const pendingCount = (fileContent.match(/^status:\s*pending\s*$/gm) || []).length;
console.log(`Written ${QUEUE_FILE} with ${pendingCount} pending posts (${Buffer.byteLength(fileContent)} bytes)`);
pipeLog(`SHIPPED | ${QUEUE_FILE} | ${pendingCount} pending posts`);
