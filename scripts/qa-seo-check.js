#!/usr/bin/env node
/**
 * qa-seo-check.js — Playwright QA for the SEO/AEO fixes.
 * Serves the repo statically and verifies the homepage + sample blog posts:
 *   - meta description present and reasonable length
 *   - <title> <= ~70 chars (seoTitle, not the long H1)
 *   - FAQPage JSON-LD present where the post has an FAQ
 *   - byline renders a real named human ("Hayat Amin", no team label)
 *   - no pageerror / console error / 4xx-5xx
 * Screenshots desktop (1440x900) + mobile (375x812) to /tmp/be-qa-*.png.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8799;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.md': 'text/markdown',
};

function serve() {
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, urlPath);
    try {
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
        file = path.join(file, 'index.html');
      }
      if (!fs.existsSync(file)) { res.writeHead(404); res.end('404'); return; }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    } catch (e) { res.writeHead(500); res.end('500'); }
  });
}

async function checkPage(browser, route, label, expectFaq) {
  const results = { route, label, errors: [], info: {} };
  for (const [vp, w, h] of [['desktop', 1440, 900], ['mobile', 375, 812]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    // Ignore /_vercel/ analytics scripts — they are injected by Vercel only on
    // the deployed site, so a local static server legitimately 404s them.
    const ignore = u => /\/_vercel\//.test(u);
    page.on('pageerror', e => results.errors.push(`[${vp}] pageerror: ${e.message}`));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const loc = (m.location() && m.location().url) || '';
      const txt = m.text() || '';
      // "Failed to load resource" errors have no useful location — skip the
      // generic one too, since the matching 404 response is already captured
      // (and /_vercel/ ones are deliberately ignored).
      if (ignore(loc) || /Failed to load resource/i.test(txt)) return;
      results.errors.push(`[${vp}] console.error: ${txt}`);
    });
    page.on('response', r => {
      const s = r.status();
      if (s >= 400 && new URL(r.url()).host.includes('localhost') && !ignore(r.url())) {
        results.errors.push(`[${vp}] ${s} ${r.url()}`);
      }
    });
    const resp = await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    if (vp === 'desktop') {
      results.info.httpStatus = resp.status();
      results.info.title = await page.title();
      results.info.titleLen = results.info.title.length;
      results.info.metaDesc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
      results.info.metaDescLen = results.info.metaDesc ? results.info.metaDesc.length : 0;
      const ldTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
      results.info.schemaTypes = ldTypes.map(t => { try { return JSON.parse(t)['@type']; } catch { return '?'; } });
      results.info.hasFaqSchema = results.info.schemaTypes.includes('FAQPage');
      results.info.byline = await page.locator('.author-copy strong, .blog-author span').first().textContent().catch(() => null);
    }
    await page.screenshot({ path: `/tmp/be-qa-${label}-${vp}.png`, fullPage: false });
    await ctx.close();
  }
  if (expectFaq && !results.info.hasFaqSchema) results.errors.push('EXPECTED FAQPage schema, not found');
  if (results.info.titleLen > 72) results.errors.push(`title too long: ${results.info.titleLen} chars`);
  if (results.info.metaDescLen < 50 || results.info.metaDescLen > 165) {
    results.errors.push(`meta description length off: ${results.info.metaDescLen}`);
  }
  if (results.info.byline && /beyond elevation( team| editorial)?$/i.test((results.info.byline || '').trim())) {
    results.errors.push(`byline not a named human: "${results.info.byline}"`);
  }
  return results;
}

(async () => {
  const server = serve();
  await new Promise(r => server.listen(PORT, r));
  const browser = await chromium.launch();

  const pages = [
    { route: '/', label: 'home', faq: false },
    { route: '/blog/posts/ai-engineering-ip-what-is-protectable/', label: 'post1', faq: true },
    { route: '/blog/posts/what-is-a-trade-secret/', label: 'post2', faq: true },
    { route: '/blog/', label: 'bloglist', faq: false },
  ];

  let allOk = true;
  for (const p of pages) {
    const r = await checkPage(browser, p.route, p.label, p.faq);
    const ok = r.errors.length === 0;
    allOk = allOk && ok;
    console.log(`\n${ok ? 'PASS' : 'FAIL'} — ${p.label} (${p.route})`);
    console.log(`  http=${r.info.httpStatus} titleLen=${r.info.titleLen} metaDescLen=${r.info.metaDescLen}`);
    console.log(`  title: ${r.info.title}`);
    console.log(`  schema: ${(r.info.schemaTypes || []).join(', ')}`);
    console.log(`  byline: ${r.info.byline}`);
    if (r.errors.length) r.errors.forEach(e => console.log(`  ERROR: ${e}`));
  }

  await browser.close();
  server.close();
  console.log(`\n${allOk ? 'ALL QA CHECKS PASSED' : 'QA FAILURES PRESENT'}`);
  process.exit(allOk ? 0 : 1);
})();
