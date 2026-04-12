#!/usr/bin/env node
/**
 * notify-indexing.js
 *
 * Post-build script that detects NEW URLs added to sitemap.xml and pings
 * search engines via IndexNow (Bing/Yandex/Google) so they crawl immediately.
 *
 * How it works:
 * 1. Reads the just-generated sitemap.xml
 * 2. Compares against .indexing-cache.json (previous URL set)
 * 3. Any new URLs get submitted via IndexNow batch API
 * 4. Updates the cache for next deploy
 *
 * IndexNow is free, instant, and requires no GCP service account.
 * Supported by: Bing, Yandex, Seznam, Naver. Google is testing support.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const CACHE = path.join(ROOT, '.indexing-cache.json');
const SITE = 'https://beyondelevation.com';
const INDEXNOW_KEY = '49f3bbc5f19b1d0fed582d230d7e152f';

// IndexNow endpoints — submit to one, all participating engines get notified
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
];

function extractUrls(sitemapXml) {
  const urls = [];
  const re = /<loc>(.*?)<\/loc>/g;
  let m;
  while ((m = re.exec(sitemapXml)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  } catch {
    return { urls: [], lastRun: null };
  }
}

function saveCache(urls) {
  fs.writeFileSync(CACHE, JSON.stringify({
    urls,
    lastRun: new Date().toISOString(),
  }, null, 2));
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function submitIndexNow(newUrls) {
  if (newUrls.length === 0) return;

  const payload = {
    host: 'beyondelevation.com',
    key: INDEXNOW_KEY,
    keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
    urlList: newUrls,
  };

  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const res = await postJson(endpoint, payload);
      if (res.status === 200 || res.status === 202) {
        console.log(`  IndexNow ${endpoint}: ${res.status} OK — ${newUrls.length} URLs submitted`);
      } else {
        console.log(`  IndexNow ${endpoint}: ${res.status} — ${res.body}`);
      }
    } catch (err) {
      console.log(`  IndexNow ${endpoint}: ERROR — ${err.message}`);
    }
  }
}

async function main() {
  if (!fs.existsSync(SITEMAP)) {
    console.log('No sitemap.xml found — skipping indexing notifications');
    return;
  }

  const sitemapXml = fs.readFileSync(SITEMAP, 'utf8');
  const currentUrls = extractUrls(sitemapXml);
  const cache = loadCache();
  const previousUrls = new Set(cache.urls);

  const newUrls = currentUrls.filter(u => !previousUrls.has(u));

  console.log(`\nIndexing check: ${currentUrls.length} total URLs, ${newUrls.length} new since last deploy`);

  if (newUrls.length === 0) {
    console.log('No new URLs — skipping IndexNow ping');
    saveCache(currentUrls);
    return;
  }

  console.log('New URLs detected:');
  newUrls.forEach(u => console.log(`  + ${u}`));

  console.log('\nSubmitting to IndexNow...');
  await submitIndexNow(newUrls);

  // Also ping Google and Bing sitemap endpoints (lightweight GET pings)
  const sitemapUrl = encodeURIComponent(`${SITE}/sitemap.xml`);
  const pingUrls = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
  ];

  for (const pingUrl of pingUrls) {
    try {
      const parsed = new URL(pingUrl);
      await new Promise((resolve, reject) => {
        https.get(pingUrl, (res) => {
          res.on('data', () => {});
          res.on('end', () => {
            console.log(`  Sitemap ping ${parsed.hostname}: ${res.statusCode}`);
            resolve();
          });
        }).on('error', reject);
      });
    } catch (err) {
      console.log(`  Sitemap ping failed: ${err.message}`);
    }
  }

  saveCache(currentUrls);
  console.log(`\nDone. Cache updated with ${currentUrls.length} URLs.`);
}

if (require.main === module) main().catch(console.error);

module.exports = { main };
