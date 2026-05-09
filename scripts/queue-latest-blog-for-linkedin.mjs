#!/usr/bin/env node
// Queue the most recently changed blog post into linkedin-queue/ so that the existing
// linkedin-post.yml workflow picks it up and publishes a native LinkedIn image post
// that contains the post URL in the caption.
//
// Usage (CI):
//   node scripts/queue-latest-blog-for-linkedin.mjs
//
// Output:
//   - linkedin-queue/next-caption.txt   (commentary + URL + hashtags)
//   - linkedin-queue/next-image.html    (renders to PNG via existing pipeline)
//   - linkedin-slugs-used.txt           (append slug)

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const POSTS_DIR = `${ROOT}/blog/posts`;

// 1. Pick the post: prefer the most recent ADDED/MODIFIED post in the last commit;
//    fall back to the newest by lastmod in sitemap.
function latestSlugFromGit() {
  try {
    const range = process.env.GITHUB_BEFORE && process.env.GITHUB_AFTER
      ? `${process.env.GITHUB_BEFORE}..${process.env.GITHUB_AFTER}`
      : "HEAD~1..HEAD";
    const out = execSync(`git diff --name-only --diff-filter=AM ${range} -- 'blog/posts/**/index.html' 'blog/posts/**.html'`, { encoding: "utf8" });
    const lines = out.trim().split("\n").filter(Boolean);
    if (!lines.length) return null;
    // Prefer index.html paths
    const m = lines[0].match(/blog\/posts\/([^/]+)/);
    return m ? m[1] : null;
  } catch { return null; }
}

function latestSlugFromSitemap() {
  const sm = readFileSync(`${ROOT}/sitemap.xml`, "utf8");
  const entries = [...sm.matchAll(/<loc>([^<]+\/blog\/posts\/[^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)];
  if (!entries.length) return null;
  entries.sort((a, b) => b[2].localeCompare(a[2]));
  const m = entries[0][1].match(/\/blog\/posts\/([^/]+)/);
  return m ? m[1] : null;
}

const slug = latestSlugFromGit() || latestSlugFromSitemap();
if (!slug) { console.error("FAIL: no recent blog post found"); process.exit(1); }
console.log(`[1/4] picked slug: ${slug}`);

// Skip duplicates
const slugsFile = `${ROOT}/linkedin-slugs-used.txt`;
const used = existsSync(slugsFile) ? readFileSync(slugsFile, "utf8").split("\n").map(s => s.trim()) : [];
if (used.includes(slug)) {
  console.log(`SKIP: ${slug} already posted to LinkedIn`);
  process.exit(0);
}

// 2. Read post HTML and extract title + description + h1
const postPath = `${POSTS_DIR}/${slug}/index.html`;
if (!existsSync(postPath)) { console.error(`FAIL: ${postPath} not found`); process.exit(1); }
const html = readFileSync(postPath, "utf8");
const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ""])[1].replace(/<[^>]+>/g, "").trim();
const desc = (html.match(/<meta\s+name="description"\s+content="([^"]+)"/) || [, ""])[1];
const url = `https://beyondelevation.com/blog/posts/${slug}/`;
console.log(`[2/4] title: ${h1.slice(0, 80)}`);

// 3. Build caption — worker-facing, hook-first, includes URL.
//    Audience rule: address the individual founder/operator, never the company.
function pickHook(title, desc) {
  // Use first sentence of description as the hook if it's punchy; otherwise short title.
  const firstSentence = (desc.split(/[.!?]/)[0] || "").trim();
  if (firstSentence.length > 14 && firstSentence.length <= 110) return firstSentence;
  return title.split(/[—:]/)[0].trim();
}
const hook = pickHook(h1, desc);
const body = desc.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").trim();
const caption = [
  hook + ".",
  "",
  body,
  "",
  `Read it: ${url}`,
  "",
  "#IPStrategy #Founders #AIvaluation",
].filter(Boolean).join("\n");
writeFileSync(`${ROOT}/linkedin-queue/next-caption.txt`, caption + "\n");
console.log(`[3/4] caption written (${caption.length} chars)`);

// 4. Image: simple branded card that the existing pipeline renders to PNG via Playwright.
const imageHtml = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(h1)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:1200px;background:#0d0d0d;color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:90px 80px;font-family:'Inter',system-ui,sans-serif;font-feature-settings:'ss01' on}
  .top{display:flex;justify-content:space-between;align-items:center}
  .brand{display:flex;align-items:center;gap:14px;font-weight:700;letter-spacing:-.01em;font-size:1.25rem}
  .brand-mark{width:40px;height:40px;border-radius:10px;background:linear-gradient(145deg,#fff,#e8e3d8);color:#0d0d0d;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem}
  .eyebrow{font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.55);font-weight:600}
  h1{font-size:5.4rem;line-height:1.05;letter-spacing:-.035em;font-weight:700;max-width:18ch}
  .url{font-size:1.15rem;color:rgba(255,255,255,.6);font-weight:500;letter-spacing:-.005em}
  .accent{display:inline-block;width:62px;height:6px;background:#e8e3d8;border-radius:4px;margin-bottom:42px}
</style></head>
<body>
  <div class="top">
    <div class="brand"><span class="brand-mark">BE</span>Beyond Elevation</div>
    <div class="eyebrow">Insights</div>
  </div>
  <div>
    <span class="accent"></span>
    <h1>${escapeHtml(truncate(h1, 110))}</h1>
  </div>
  <div class="url">beyondelevation.com</div>
</body></html>`;
writeFileSync(`${ROOT}/linkedin-queue/next-image.html`, imageHtml);
console.log(`[4/4] image template written`);

// Mark slug as used
appendFileSync(slugsFile, `\n${slug}`);

console.log(`OK queued: ${slug}`);
console.log(`URL: ${url}`);

function escapeHtml(s){return String(s||"").replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));}
function truncate(s,n){return s.length<=n?s:s.slice(0,n-1).trimEnd()+"…";}
