#!/usr/bin/env node
// Pull GSC "strike distance" keywords (position 4-20, decent impressions) grouped
// by page, so the weekly SEO pass upgrades near-winners instead of only writing
// new posts. Writes data/strike-distance.json and prints a summary.
// Usage: node scripts/strike-distance.mjs
import crypto from 'crypto';
import https from 'https';
import fs from 'fs';

const SA = JSON.parse(fs.readFileSync('/Users/hayatamin/Documents/beyond-elevation/.gcp-indexing-key.json', 'utf8'));
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const jb = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
  iss: SA.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly',
  aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
});
const sig = crypto.createSign('RSA-SHA256').update(jb).sign(SA.private_key, 'base64url');

const post = (url, data, hdrs) => new Promise((res, rej) => {
  const u = new URL(url);
  const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: hdrs },
    x => { let b = ''; x.on('data', c => b += c); x.on('end', () => res(JSON.parse(b))); });
  r.on('error', rej); r.end(data);
});

const tok = await post('https://oauth2.googleapis.com/token',
  'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jb + '.' + sig,
  { 'Content-Type': 'application/x-www-form-urlencoded' });

const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 84 * 864e5).toISOString().slice(0, 10);
const q = await post(
  'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent('sc-domain:beyondelevation.com') + '/searchAnalytics/query',
  JSON.stringify({ startDate: start, endDate: end, dimensions: ['query', 'page'], rowLimit: 1000, orderBy: [{ field: 'impressions', descending: true }] }),
  { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok.access_token });

const rows = (q.rows || [])
  .filter(r => r.position >= 4 && r.position <= 20 && r.impressions >= 15 && !r.keys[0].includes('"'));

const byPage = {};
for (const r of rows) {
  const page = r.keys[1].replace('https://beyondelevation.com', '');
  (byPage[page] ||= []).push({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: +r.position.toFixed(1) });
}
const ranked = Object.entries(byPage)
  .map(([page, queries]) => ({ page, total_impressions: queries.reduce((a, x) => a + x.impressions, 0), queries: queries.sort((a, b) => b.impressions - a.impressions) }))
  .sort((a, b) => b.total_impressions - a.total_impressions);

fs.writeFileSync(new URL('../data/strike-distance.json', import.meta.url), JSON.stringify({ built: end, window_days: 84, pages: ranked }, null, 1));
console.log(`strike-distance: ${ranked.length} pages, top 10:`);
ranked.slice(0, 10).forEach(p => console.log(`  ${p.total_impressions}i ${p.page} (${p.queries.length} queries, best: "${p.queries[0].query}" pos${p.queries[0].position})`));
