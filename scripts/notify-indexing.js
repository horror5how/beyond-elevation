#!/usr/bin/env node
/**
 * notify-indexing.js  (v2 — 2026-04-29 hardened)
 *
 * Post-build script. Pings search engines after each deploy:
 *  1. IndexNow (Bing/Yandex/Seznam/Naver) — batch submission, instant.
 *  2. Search Console sitemap resubmit — the only Google-side nudge that is
 *     actually recorded. Runs every deploy, not just for new urls.
 *
 * Google's Indexing API is deliberately NOT used: urlNotifications:publish only
 * queues JobPosting and BroadcastEvent. For ordinary pages it answers 200 with
 * an empty urlNotificationMetadata and records nothing. The one URL here with a
 * stored notification (the homepage) is dated 2025-05-06 and a fresh publish
 * does not move it. Removed 2026-08-17.
 *
 * Drops the deprecated google.com/ping?sitemap= endpoint (sunset 2023).
 * All HTTP calls have explicit timeouts so the script can never hang in CI.
 *
 * Modes:
 *   default       — only NEW urls (vs .indexing-cache.json)
 *   --all         — every URL in sitemap (use for first run / backfill)
 *   --dry         — print plan but don't call APIs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const CACHE = path.join(ROOT, '.indexing-cache.json');
const GCP_KEY_PATH = path.join(ROOT, '.gcp-indexing-key.json');
const SITE = 'https://beyondelevation.com';
const INDEXNOW_KEY = '49f3bbc5f19b1d0fed582d230d7e152f';
const TIMEOUT_MS = 8000;
// Search Console property the service account owns, and the sitemaps to resubmit.
const GSC_SITE = 'sc-domain:beyondelevation.com';
const SITEMAPS = [`${SITE}/sitemap.xml`];

const args = new Set(process.argv.slice(2));
const FORCE_ALL = args.has('--all');
const DRY = args.has('--dry');

function extractUrls(xml) {
  const out = []; const re = /<loc>(.*?)<\/loc>/g; let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function loadCache() { try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { return { urls: [], lastRun: null }; } }
function saveCache(urls) { fs.writeFileSync(CACHE, JSON.stringify({ urls, lastRun: new Date().toISOString() }, null, 2)); }

function postJson(url, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data) },
      timeout: TIMEOUT_MS,
    }, (res) => { let buf = ''; res.on('data', (c) => (buf += c)); res.on('end', () => resolve({ status: res.statusCode, body: buf })); });
    req.on('timeout', () => { req.destroy(new Error('timeout')); resolve({ status: 0, body: 'timeout' }); });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.write(data); req.end();
  });
}

async function submitIndexNow(urls) {
  if (!urls.length) return;
  const payload = { host: 'beyondelevation.com', key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: urls };
  const r = await postJson('https://api.indexnow.org/indexnow', payload);
  console.log(`  IndexNow: ${r.status} — ${urls.length} URLs (${r.body?.slice(0, 80) || 'no body'})`);
}

const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Service-account JWT -> OAuth token, by hand. Avoids pulling googleapis (~50MB)
// into every deploy for two HTTP calls, and lets this run locally with no install.
async function gscToken() {
  const key = JSON.parse(fs.readFileSync(GCP_KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  };
  const input = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claim))}`;
  const sig = crypto.createSign('RSA-SHA256').update(input).sign(key.private_key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${input}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${(await res.text()).slice(0, 120)}`);
  return (await res.json()).access_token;
}

async function resubmitSitemaps() {
  if (!fs.existsSync(GCP_KEY_PATH)) { console.log('  gsc-sitemap: no service account key — skipping'); return; }
  let token;
  try { token = await gscToken(); }
  catch (e) { console.log(`  gsc-sitemap: auth FAILED — ${String(e.message).slice(0, 140)}`); return; }

  const base = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/sitemaps`;
  const auth = { Authorization: `Bearer ${token}` };
  for (const feedpath of SITEMAPS) {
    const url = `${base}/${encodeURIComponent(feedpath)}`;
    try {
      const put = await fetch(url, { method: 'PUT', headers: auth });
      if (!put.ok) throw new Error(`submit ${put.status}: ${(await put.text()).slice(0, 120)}`);
      // Read it back — a 2xx on the PUT alone does not prove Google recorded it.
      const got = await fetch(url, { headers: auth });
      const d = got.ok ? await got.json() : {};
      console.log(`  gsc-sitemap: ${feedpath} — lastSubmitted ${d.lastSubmitted || '?'}, errors ${d.errors ?? 0}, warnings ${d.warnings ?? 0}`);
    } catch (e) {
      console.log(`  gsc-sitemap: ${feedpath} FAILED — ${String(e.message).slice(0, 140)}`);
    }
  }
}

async function main() {
  if (!fs.existsSync(SITEMAP)) { console.log('No sitemap.xml found — skipping'); return; }
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const allUrls = extractUrls(xml);
  const cache = loadCache();
  const prev = new Set(cache.urls);
  const newUrls = FORCE_ALL ? allUrls : allUrls.filter((u) => !prev.has(u));
  console.log(`Indexing: ${allUrls.length} total, ${newUrls.length} ${FORCE_ALL ? '(forced --all)' : 'new'}`);
  if (DRY) { console.log('DRY — exiting'); return; }
  // Sitemaps are resubmitted on every deploy, not just when URLs are new — a
  // changed page needs the recrawl nudge as much as a brand-new one does.
  await resubmitSitemaps();
  if (!newUrls.length) { console.log('No new URLs for IndexNow.'); saveCache(allUrls); return; }
  await submitIndexNow(newUrls);
  saveCache(allUrls);
  console.log(`Done. Cache updated with ${allUrls.length} URLs.`);
}

if (require.main === module) main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
module.exports = { main };
