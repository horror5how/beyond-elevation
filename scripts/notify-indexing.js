#!/usr/bin/env node
/**
 * notify-indexing.js  (v2 — 2026-04-29 hardened)
 *
 * Post-build script. Pings search engines after each deploy:
 *  1. IndexNow (Bing/Yandex/Seznam/Naver) — batch submission, instant.
 *  2. Google Indexing API (service account) — per-URL POST. 200/day quota.
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
const { google } = (() => { try { return require('googleapis'); } catch { return { google: null }; } })();

const ROOT = path.resolve(__dirname, '..');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const CACHE = path.join(ROOT, '.indexing-cache.json');
const GCP_KEY_PATH = path.join(ROOT, '.gcp-indexing-key.json');
const SITE = 'https://beyondelevation.com';
const INDEXNOW_KEY = '49f3bbc5f19b1d0fed582d230d7e152f';
const TIMEOUT_MS = 8000;
const INDEXING_API_QUOTA = 180; // safe ceiling (Google quota = 200/day)

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

async function submitIndexingAPI(urls) {
  if (!google) { console.log('  google-indexing: googleapis not installed — skipping'); return; }
  if (!fs.existsSync(GCP_KEY_PATH)) { console.log('  google-indexing: no service account key — skipping'); return; }
  const auth = new google.auth.GoogleAuth({ keyFile: GCP_KEY_PATH, scopes: ['https://www.googleapis.com/auth/indexing'] });
  const idx = google.indexing({ version: 'v3', auth });
  const target = urls.slice(0, INDEXING_API_QUOTA);
  console.log(`  google-indexing: submitting ${target.length}/${urls.length} URLs (quota cap)`);
  let ok = 0, fail = 0; const errs = new Set();
  const CONCURRENCY = 4;
  for (let i = 0; i < target.length; i += CONCURRENCY) {
    const batch = target.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (url) => {
      try { await idx.urlNotifications.publish({ requestBody: { url, type: 'URL_UPDATED' } }); ok++; }
      catch (e) { fail++; errs.add(String(e?.message || e).slice(0, 120)); }
    }));
    if ((i % 20) === 0) console.log(`    ...${i + batch.length}/${target.length}`);
  }
  console.log(`  google-indexing: ok=${ok} fail=${fail}`);
  if (errs.size) console.log(`    sample errors: ${Array.from(errs).slice(0, 3).join(' | ')}`);
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
  if (!newUrls.length) { console.log('No new URLs.'); saveCache(allUrls); return; }
  await submitIndexNow(newUrls);
  await submitIndexingAPI(newUrls);
  saveCache(allUrls);
  console.log(`Done. Cache updated with ${allUrls.length} URLs.`);
}

if (require.main === module) main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
module.exports = { main };
