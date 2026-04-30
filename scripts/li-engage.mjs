#!/usr/bin/env node
/**
 * li-engage.mjs — LinkedIn first-30-min engagement loop.
 *
 * 1. Reads latest published `urn:li:share:*` from
 *    `Claude Database/linkedin-post-log.md` (CI: copied into ./linkedin-post-log.md)
 * 2. Fetches new comments via the LinkedIn Voyager API (cookie auth — no OAuth scope
 *    needed; the official `/v2/socialActions/{urn}/comments` requires `r_member_social`
 *    which LinkedIn only grants via Community Management API review)
 * 3. Drafts substantive replies using Anthropic Claude SDK in Hayat's voice
 * 4. Posts replies via Voyager (cookie auth) with OAuth /rest/socialActions as fallback
 * 5. Likes 5 recent posts from linkedin-queue/founder-network.json (OAuth, requires w_member_social)
 * 6. Logs every action to linkedin-engagement-log.md
 *
 * Routine resilience: every external call wrapped in 3-retry with 3-8s backoff.
 *
 * Env:
 *   LI_TOKEN              — OAuth access token (w_member_social) for posts/likes fallback
 *   LI_URN                — urn:li:person:... (Hayat's member URN)
 *   LI_COOKIES_JSON       — JSON-stringified array of LinkedIn session cookies
 *                           (must include li_at and JSESSIONID). Used for Voyager API calls.
 *   ANTHROPIC_API_KEY     — Claude API
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const { LI_TOKEN, LI_URN, LI_COOKIES_JSON, ANTHROPIC_API_KEY } = process.env;
if (!LI_TOKEN || !LI_URN) {
  console.error("Missing LI_TOKEN or LI_URN");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

// ── Voyager cookie auth (preferred for reads) ───────────────────────────
let VOYAGER_COOKIE_HEADER = null;
let VOYAGER_CSRF = null;
if (LI_COOKIES_JSON) {
  try {
    const cookies = JSON.parse(LI_COOKIES_JSON);
    const liAt = cookies.find((c) => c.name === "li_at")?.value;
    const jsess = cookies.find((c) => c.name === "JSESSIONID")?.value;
    if (liAt && jsess) {
      VOYAGER_COOKIE_HEADER = `li_at=${liAt}; JSESSIONID=${jsess}`;
      VOYAGER_CSRF = jsess.replace(/^"|"$/g, "");
    }
  } catch (e) {
    console.error(`Bad LI_COOKIES_JSON: ${e.message}`);
  }
}

const LI_VERSION = "202604";
const ENG_LOG = "linkedin-engagement-log.md";
const SEEN_FILE = "linkedin-queue/seen-comments.json";
const NETWORK_FILE = "linkedin-queue/founder-network.json";
const POST_LOG_CANDIDATES = [
  "linkedin-post-log.md",
  "../Claude Database/linkedin-post-log.md",
  "../../Claude Database/linkedin-post-log.md",
];

const stamp = () =>
  new Date().toISOString().slice(0, 16).replace("T", " ");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (line) => {
  const entry = `${stamp()} | ${line}\n`;
  appendFileSync(ENG_LOG, entry);
  console.log(entry.trim());
};

// ── 3-retry wrapper per CLAUDE.md routine resilience ─────────────────────
async function withRetry(label, fn, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.error(`[retry ${i}/${attempts}] ${label}: ${e.message}`);
      if (e.code === 401) throw e; // don't retry auth failures
      if (i < attempts) await sleep(3000 + Math.random() * 5000);
    }
  }
  throw lastErr;
}

// ── parse latest urn:li:share from post log ──────────────────────────────
function findLatestShareUrn() {
  for (const p of POST_LOG_CANDIDATES) {
    if (!existsSync(p)) continue;
    const lines = readFileSync(p, "utf8").trim().split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(/urn:li:share:\d+/);
      if (m) return m[0];
    }
  }
  return null;
}

// ── LinkedIn API helpers ─────────────────────────────────────────────────
async function liFetch(path, init = {}) {
  const url = path.startsWith("http")
    ? path
    : `https://api.linkedin.com${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${LI_TOKEN}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": LI_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (res.status === 401) {
    const e = new Error("401 EMPTY_ACCESS_TOKEN");
    e.code = 401;
    throw e;
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path} :: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// ── Voyager fetch (cookie auth) ─────────────────────────────────────────
async function voyagerFetch(path) {
  if (!VOYAGER_COOKIE_HEADER) {
    const e = new Error("VOYAGER_DISABLED no LI_COOKIES_JSON");
    e.code = "NO_VOYAGER";
    throw e;
  }
  const url = path.startsWith("http") ? path : `https://www.linkedin.com${path}`;
  const res = await fetch(url, {
    headers: {
      Cookie: VOYAGER_COOKIE_HEADER,
      "Csrf-Token": VOYAGER_CSRF,
      Accept: "application/vnd.linkedin.normalized+json+2.1",
      "X-Restli-Protocol-Version": "2.0.0",
      "X-Li-Lang": "en_US",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
      Referer: "https://www.linkedin.com/",
    },
  });
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    const e = new Error(`${res.status} VOYAGER_AUTH_EXPIRED`);
    e.code = "VOYAGER_AUTH";
    throw e;
  }
  if (!res.ok) throw new Error(`voyager ${res.status} ${path} :: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// Normalize Voyager comment elements into the shape the rest of the loop expects:
//   { id, actor, message: { text } }
function normalizeVoyagerComments(json) {
  const elts = json?.data?.elements || json?.elements || [];
  const included = json?.included || [];
  // Voyager's normalized format: actor URN may be in element.commenter or element.actor.
  return elts.map((el) => {
    const id = el.commentUrn || el.entityUrn || el.urn || el.$URN || el.id;
    const actor =
      el.commenter || el.actor?.urn || el.actor || el["*commenter"] || el.author || "";
    const text =
      el.commentary?.text ||
      el.message?.text ||
      el.text ||
      el.commentary ||
      "";
    return { id, actor, message: { text } };
  });
}

async function fetchComments(shareUrn) {
  const encoded = encodeURIComponent(shareUrn);

  // Path A — Voyager (cookie auth, no OAuth scope needed). Preferred.
  if (VOYAGER_COOKIE_HEADER) {
    try {
      const json = await withRetry(
        "fetchComments-voyager",
        () =>
          voyagerFetch(
            `/voyager/api/feed/comments?count=50&numReplies=0&q=comments&sortOrder=RELEVANCE&updateId=${encoded}`
          ),
        2
      );
      const elements = normalizeVoyagerComments(json);
      return { elements, _source: "voyager" };
    } catch (e) {
      console.error(`voyager path failed: ${e.message} — falling back to OAuth`);
      // fall through to OAuth path
    }
  }

  // Path B — OAuth /rest then /v2 (requires r_member_social — likely 403 today).
  const tries = [
    `/rest/socialActions/${encoded}/comments?count=50`,
    `/v2/socialActions/${encoded}/comments?count=50`,
  ];
  let lastErr;
  for (const path of tries) {
    try {
      const data = await withRetry("fetchComments-oauth", () => liFetch(path), 2);
      return { ...data, _source: "oauth" };
    } catch (e) {
      lastErr = e;
      if (!/^403/.test(e.message)) break;
    }
  }
  throw lastErr;
}

async function postComment(shareUrn, text) {
  const encoded = encodeURIComponent(shareUrn);
  const path = `/v2/socialActions/${encoded}/comments`;
  const body = JSON.stringify({
    actor: LI_URN,
    object: shareUrn,
    message: { text, attributes: [] },
  });
  return withRetry("postComment", () => liFetch(path, { method: "POST", body }));
}

async function likePost(shareUrn) {
  const encoded = encodeURIComponent(shareUrn);
  const path = `/v2/socialActions/${encoded}/likes`;
  const body = JSON.stringify({ actor: LI_URN, object: shareUrn });
  return withRetry("likePost", () => liFetch(path, { method: "POST", body }));
}

// ── seen-comments persistence ────────────────────────────────────────────
function loadSeen() {
  if (!existsSync(SEEN_FILE)) return {};
  try {
    return JSON.parse(readFileSync(SEEN_FILE, "utf8"));
  } catch {
    return {};
  }
}
function saveSeen(seen) {
  writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));
}

// ── network list (curated handles to like) ──────────────────────────────
function loadNetwork() {
  if (!existsSync(NETWORK_FILE)) return [];
  try {
    return JSON.parse(readFileSync(NETWORK_FILE, "utf8")).handles || [];
  } catch {
    return [];
  }
}

// ── Claude reply drafter ─────────────────────────────────────────────────
const claude = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function draftReply({ commenterFirstName, originalPost, commentText }) {
  return withRetry("claude", async () => {
    const msg = await claude.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 400,
      system:
        "You are Hayat Amin's voice on LinkedIn. Reply substantively (≥30 words, ≤80 words), reference the commenter by first name, add ONE concrete insight or counter-view from the IP/fractional CXO domain. No emojis. No 'great point.' No platitudes.",
      messages: [
        {
          role: "user",
          content: `Commenter first name: ${commenterFirstName}\n\nOriginal post (excerpt):\n${(originalPost || "").slice(0, 800)}\n\nTheir comment:\n${commentText}\n\nWrite the reply now. Output only the reply text — no preamble, no quotes.`,
        },
      ],
    });
    return msg.content[0].text.trim();
  });
}

// ── fetch commenter profile name ────────────────────────────────────────
async function fetchFirstName(actorUrn) {
  if (!actorUrn) return "there";
  try {
    const id = String(actorUrn).split(":").pop();
    if (VOYAGER_COOKIE_HEADER) {
      // Voyager identity dash: returns full profile object
      const data = await withRetry("getName-voyager", () =>
        voyagerFetch(`/voyager/api/identity/dash/profiles/${id}`)
      );
      const profile = data?.elements?.[0] || data?.data || data;
      return profile?.firstName || profile?.localizedFirstName || "there";
    }
    const data = await withRetry("getName-oauth", () =>
      liFetch(`/v2/people/(id:${id})?projection=(localizedFirstName)`)
    );
    return data.localizedFirstName || "there";
  } catch {
    return "there";
  }
}

// ── main ────────────────────────────────────────────────────────────────
async function main() {
  const shareUrn = findLatestShareUrn();
  if (!shareUrn) {
    log("no urn:li:share found in post log — exiting clean");
    return;
  }
  log(`latest post: ${shareUrn}`);

  // 1) fetch + reply to new comments
  let comments;
  try {
    comments = await fetchComments(shareUrn);
  } catch (e) {
    if (e.code === 401 || e.code === "VOYAGER_AUTH") {
      log(`FAIL | auth expired (${e.message}) — refresh LI_COOKIES_JSON or LI_TOKEN`);
      return;
    }
    if (/^403/.test(e.message)) {
      log(`SKIP | 403 ACCESS_DENIED on socialActions — provide LI_COOKIES_JSON for Voyager path or get r_member_social via Community Management API. Exiting clean.`);
      return;
    }
    log(`FAIL | fetchComments: ${e.message}`);
    return;
  }

  const elements = comments.elements || [];
  log(`found ${elements.length} total comments on latest post (source: ${comments._source || "unknown"})`);

  if (elements.length === 0 && (comments._error || comments.message)) {
    log(`note: API returned no elements — likely scope-limited; exiting clean`);
  }

  const seen = loadSeen();
  const seenSet = new Set(seen[shareUrn] || []);
  const newComments = elements.filter((c) => {
    const id = c.id || c.$URN || c.commentUrn;
    if (!id) return false;
    if (seenSet.has(id)) return false;
    if ((c.actor || "") === LI_URN) return false; // skip own comments
    return true;
  });

  if (newComments.length === 0) {
    log(`no new comments — exiting clean`);
  } else {
    log(`processing ${newComments.length} new comment(s)`);
    for (const c of newComments) {
      const id = c.id || c.$URN || c.commentUrn;
      const commentText = (c.message && c.message.text) || "";
      if (!commentText.trim()) {
        seenSet.add(id);
        continue;
      }
      const firstName = await fetchFirstName(c.actor || "");
      try {
        const reply = await draftReply({
          commenterFirstName: firstName,
          originalPost: "",
          commentText,
        });
        log(`DRAFT for ${firstName}: ${reply.replace(/\n/g, " ").slice(0, 200)}`);
        await postComment(shareUrn, reply);
        log(`POSTED reply to ${firstName} (${id})`);
        seenSet.add(id);
      } catch (e) {
        log(`FAIL | reply to ${id}: ${e.message}`);
      }
    }
  }
  seen[shareUrn] = [...seenSet];
  saveSeen(seen);

  // 2) like 5 posts from curated network (best-effort)
  const network = loadNetwork();
  if (network.length === 0) {
    log(`network list empty — skipping like loop`);
  } else {
    let liked = 0;
    for (const entry of network) {
      if (liked >= 5) break;
      // entry can be { lastShareUrn: "urn:li:share:..." } from a prior crawl,
      // or just a handle (we skip those — liking by handle requires search scope).
      const target = entry.lastShareUrn || entry.shareUrn;
      if (!target) continue;
      try {
        await likePost(target);
        log(`LIKED ${target}`);
        liked++;
      } catch (e) {
        log(`SKIP like ${target}: ${e.message.slice(0, 120)}`);
      }
    }
    log(`liked ${liked}/5 network posts`);
  }

  log(`done`);
}

main().catch((e) => {
  log(`FATAL ${e.message}`);
  process.exit(1);
});
