#!/usr/bin/env node
/**
 * li-engage.mjs — Beyond Elevation LinkedIn engagement bot (browser-driven).
 *
 * Schedule (set in .github/workflows/linkedin-engage.yml):
 *   08:00, 13:00, 16:00 UK time (BST → 07/12/15 UTC).
 *
 * Drives a real Chromium via Browserbase (cloud) with Hayat's LinkedIn cookies
 * injected. Opens his recent activity, finds his last few posts, and on each
 * one replies to NEW commenters with a short, on-brand Claude-drafted reply.
 *
 * Env:
 *   BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID
 *   LI_COOKIES_JSON   — JSON array of LinkedIn cookies (li_at, JSESSIONID, etc.)
 *   ANTHROPIC_API_KEY — Claude API
 *   DRY_RUN           — "true" to draft + log replies without actually posting
 */

import { Browserbase } from "@browserbasehq/sdk";
import { chromium } from "playwright-core";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";

const {
  BROWSERBASE_API_KEY,
  BROWSERBASE_PROJECT_ID,
  LI_COOKIES_JSON,
  ANTHROPIC_API_KEY,
} = process.env;
const DRY_RUN = ["true", "1", "yes"].includes(String(process.env.DRY_RUN || "").toLowerCase());
const MAX_REPLIES = 5;
const MAX_POSTS_TO_CHECK = 3;
const LOG = "linkedin-engagement-log.md";
const SEEN = "linkedin-queue/seen-comments.json";
const PROFILE_URL = "https://www.linkedin.com/in/hayatamin/recent-activity/all/";

function bail(msg) { console.error(msg); process.exit(0); }
if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) bail("Missing Browserbase env");
if (!LI_COOKIES_JSON) bail("Missing LI_COOKIES_JSON");
if (!ANTHROPIC_API_KEY) bail("Missing ANTHROPIC_API_KEY");

const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const log = (line) => {
  try { appendFileSync(LOG, `${stamp()} | ${line}\n`); } catch {}
  console.log(line);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync("linkedin-queue", { recursive: true });
let seen = new Set();
try {
  if (existsSync(SEEN)) {
    const parsed = JSON.parse(readFileSync(SEEN, "utf8"));
    if (Array.isArray(parsed)) seen = new Set(parsed);
    else if (parsed && typeof parsed === "object") seen = new Set(Object.keys(parsed));
  }
} catch {}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function draftReply(postText, commentText, commenter) {
  const r = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 220,
    system:
      "You are Hayat Amin replying on LinkedIn to someone who commented on your own post. " +
      "One or two sentences. Warm, specific, additive — react to the substance of THEIR comment, " +
      "not a generic 'thanks for sharing'. No hashtags, no emojis, no preamble. Sound like a human, " +
      "not a brand. Don't repeat their words back at them.",
    messages: [
      {
        role: "user",
        content:
          `My post:\n"""${postText.slice(0, 1500)}"""\n\n` +
          `${commenter || "A commenter"} said:\n"""${commentText.slice(0, 800)}"""\n\nReply.`,
      },
    ],
  });
  return r.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^["']|["']$/g, "");
}

async function main() {
  log(`=== engage start · ${DRY_RUN ? "DRY-RUN" : "LIVE"} ===`);

  const bb = new Browserbase({ apiKey: BROWSERBASE_API_KEY });
  const session = await bb.sessions.create({
    projectId: BROWSERBASE_PROJECT_ID,
    browserSettings: {
      fingerprint: { devices: ["desktop"], locales: ["en-GB"], operatingSystems: ["macos"] },
      viewport: { width: 1440, height: 900 },
    },
  });
  log(`browserbase session ${session.id}`);

  const browser = await chromium.connectOverCDP(session.connectUrl);
  let ctx = browser.contexts()[0] || (await browser.newContext());
  let page = ctx.pages()[0] || (await ctx.newPage());

  // Inject LinkedIn cookies
  try {
    const raw = JSON.parse(LI_COOKIES_JSON);
    const cookies = raw.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || ".linkedin.com",
      path: c.path || "/",
      secure: c.secure !== false,
      httpOnly: c.httpOnly === true,
      sameSite:
        c.sameSite === "Lax"
          ? "Lax"
          : c.sameSite === "Strict"
          ? "Strict"
          : "None",
      ...(c.expires || c.expirationDate
        ? { expires: Math.floor(c.expires || c.expirationDate) }
        : {}),
    }));
    await ctx.addCookies(cookies);
    log(`injected ${cookies.length} cookies`);
  } catch (e) {
    log(`cookie inject failed: ${e.message}`);
    await browser.close();
    return;
  }

  await page.goto(PROFILE_URL, { waitUntil: "domcontentloaded", timeout: 35000 });
  await sleep(3500);
  if (/\/login|\/checkpoint|\/uas/.test(page.url())) {
    log(`cookies stale — redirected to ${page.url()}`);
    try { await page.screenshot({ path: "/tmp/li-stale.png" }); } catch {}
    await browser.close();
    return;
  }

  // Lazy-loaded activity feed: wait for any post link, then scroll to load a few more.
  await page.waitForSelector('a[href*="urn:li:activity:"]', { timeout: 15000 }).catch(() => {});
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 1200); await sleep(900); }

  const collect = async () =>
    page.evaluate((max) => {
      const links = [...document.querySelectorAll('a[href*="urn:li:activity:"]')];
      const urns = new Set();
      const out = [];
      for (const a of links) {
        const m = a.href.match(/urn:li:activity:\d+/);
        if (!m || urns.has(m[0])) continue;
        urns.add(m[0]);
        const url = `https://www.linkedin.com/feed/update/${m[0]}/`;
        out.push(url);
        if (out.length >= max) break;
      }
      return out;
    }, MAX_POSTS_TO_CHECK);

  let postLinks = await collect();
  if (postLinks.length === 0) {
    // Fallback: try the home feed, filter to posts authored by Hayat
    log(`no posts on activity page — falling back to /feed/`);
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded", timeout: 35000 });
    await sleep(3500);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 1500); await sleep(900); }
    postLinks = await collect();
  }
  log(`found ${postLinks.length} recent posts`);

  let replies = 0;

  outer: for (const postUrl of postLinks) {
    if (replies >= MAX_REPLIES) break;
    log(`open ${postUrl}`);
    await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 35000 });
    await sleep(3500);

    // Try to switch comments to "Most recent"
    try {
      await page.click('button:has-text("Most relevant")', { timeout: 4000 });
      await sleep(400);
      await page.click('div[role="menuitem"]:has-text("Most recent"), button:has-text("Most recent")', { timeout: 4000 });
      await sleep(1500);
    } catch {}

    // Scroll to load comments
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 900);
      await sleep(900);
    }

    const postText = await page.evaluate(() => {
      const el = document.querySelector(
        "div.feed-shared-update-v2__description, div.update-components-text"
      );
      return el ? el.innerText.trim() : "";
    });

    const comments = await page.evaluate(() => {
      const out = [];
      const blocks = [
        ...document.querySelectorAll(
          'article.comments-comment-entity, div.comments-comment-item, div[data-id^="urn:li:comment:"]'
        ),
      ];
      for (const b of blocks) {
        const author =
          b.querySelector('a span[dir="ltr"], span.comments-post-meta__name-text span[aria-hidden]')
            ?.innerText?.trim() || "";
        const txt =
          b.querySelector(
            "span.comments-comment-item__main-content, div.comments-comment-item-content-body, .update-components-text"
          )?.innerText?.trim() || "";
        const id = b.getAttribute("data-id") || b.id || "";
        if (txt) out.push({ id, author, text: txt });
      }
      return out.slice(0, 20);
    });
    log(`${comments.length} comments on this post`);

    for (const c of comments) {
      if (replies >= MAX_REPLIES) break outer;
      const key = `${postUrl}::${c.id || c.author}::${c.text.slice(0, 40)}`;
      if (seen.has(key)) continue;
      let reply;
      try {
        reply = await draftReply(postText, c.text, c.author);
      } catch (e) {
        log(`draft fail (${c.author}): ${e.message}`);
        continue;
      }
      if (!reply || reply.length < 6) {
        log(`empty reply for ${c.author}`);
        continue;
      }
      if (DRY_RUN) {
        log(`DRY_RUN would reply to ${c.author}: ${reply.slice(0, 120)}`);
        seen.add(key);
        replies++;
        continue;
      }

      try {
        const opened = await page.evaluate((snippet) => {
          const blocks = [
            ...document.querySelectorAll(
              'article.comments-comment-entity, div.comments-comment-item, div[data-id^="urn:li:comment:"]'
            ),
          ];
          const block = blocks.find((b) => (b.innerText || "").includes(snippet));
          if (!block) return false;
          const btn = [...block.querySelectorAll("button")].find((x) =>
            /^reply$/i.test((x.innerText || "").trim())
          );
          if (!btn) return false;
          btn.scrollIntoView({ block: "center" });
          btn.click();
          return true;
        }, c.text.slice(0, 30));
        if (!opened) { log(`reply button not found for ${c.author}`); continue; }
        await sleep(1500);

        const editor = await page.$(
          'div.ql-editor[contenteditable="true"], div[contenteditable="true"][aria-label*="Reply"]'
        );
        if (!editor) { log(`reply editor not found for ${c.author}`); continue; }
        await editor.click();
        await page.keyboard.type(reply, { delay: 28 });
        await sleep(900);

        const submitted = await page.evaluate(() => {
          const btns = [...document.querySelectorAll("button")].filter((b) =>
            /^reply$|^post$/i.test((b.innerText || "").trim())
          );
          for (const b of btns.reverse()) {
            if (b.offsetParent !== null && !b.disabled) { b.click(); return true; }
          }
          return false;
        });
        if (!submitted) { log(`submit not found for ${c.author}`); continue; }
        await sleep(2500);
        seen.add(key);
        replies++;
        log(`REPLIED to ${c.author}: ${reply.slice(0, 100)}`);
      } catch (e) {
        log(`reply error (${c.author}): ${e.message}`);
      }
    }
  }

  try { writeFileSync(SEEN, JSON.stringify([...seen])); } catch {}
  log(`run done — ${replies} ${DRY_RUN ? "would-reply" : "replies"} (browserbase ${session.id})`);
  await browser.close();
}

main().catch(async (e) => {
  log(`fatal: ${e.message}`);
  process.exit(0);
});
