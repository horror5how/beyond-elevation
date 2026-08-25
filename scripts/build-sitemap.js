#!/usr/bin/env node
/**
 * build-sitemap.js — regenerates sitemap.xml for the be-fearn 2026 site:
 * the fixed site pages plus every published post at /insights/<slug>/.
 * Runs on every deploy (deploy.yml) so new posts get indexed fast.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_JSON = path.join(ROOT, 'data', 'posts.json');
const OUT = path.join(ROOT, 'sitemap.xml');
const SITE = 'https://beyondelevation.com';

// The hand-built site pages (mirrors the static site structure).
const FIXED = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/cfo', priority: '0.95', changefreq: 'monthly' },
  { loc: '/ip', priority: '0.95', changefreq: 'monthly' },
  { loc: '/fde', priority: '0.95', changefreq: 'monthly' },
  { loc: '/which-seat', priority: '0.9', changefreq: 'monthly' },
  { loc: '/case-studies', priority: '0.9', changefreq: 'monthly' },
  { loc: '/insights', priority: '0.9', changefreq: 'daily' },
  { loc: '/about', priority: '0.9', changefreq: 'monthly' },
  { loc: '/how-it-works', priority: '0.8', changefreq: 'monthly' },
  { loc: '/faq', priority: '0.8', changefreq: 'monthly' },
  { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
  { loc: '/call', priority: '0.7', changefreq: 'monthly' },
  { loc: '/story/codi', priority: '0.8', changefreq: 'monthly' },
  { loc: '/story/dgs', priority: '0.8', changefreq: 'monthly' },
  { loc: '/story/loowatt', priority: '0.8', changefreq: 'monthly' },
  { loc: '/story/position-imaging', priority: '0.8', changefreq: 'monthly' },
  { loc: '/story/mcards', priority: '0.8', changefreq: 'monthly' },
  { loc: '/story/arabesque', priority: '0.8', changefreq: 'monthly' },
  { loc: '/story/iona', priority: '0.8', changefreq: 'monthly' },
  { loc: '/story/cfo', priority: '0.7', changefreq: 'monthly' },
  { loc: '/story/ip', priority: '0.7', changefreq: 'monthly' },
  { loc: '/story/ai', priority: '0.7', changefreq: 'monthly' },
  { loc: '/insights/what-is-a-fractional-cfo', priority: '0.85', changefreq: 'monthly' },
  { loc: '/insights/what-is-a-chief-ip-officer', priority: '0.85', changefreq: 'monthly' },
  { loc: '/insights/what-is-ai-operations', priority: '0.85', changefreq: 'monthly' },
  { loc: '/insights/automate-first', priority: '0.8', changefreq: 'monthly' },
  { loc: '/insights/two-day-close', priority: '0.8', changefreq: 'monthly' },
  { loc: '/insights/value-your-data', priority: '0.8', changefreq: 'monthly' },
  { loc: '/company', priority: '0.5', changefreq: 'yearly' },
  { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
];

const HANDWRITTEN = new Set(FIXED.map(f => f.loc.replace('/insights/', '')).filter(s => !s.startsWith('/')));

function main() {
  const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));
  const approved = posts.filter(p =>
    p.status === 'published' &&
    p.alexReview && p.alexReview.approved === true &&
    p.noIndex !== true &&
    p.slug && !HANDWRITTEN.has(p.slug)
  );

  const today = new Date().toISOString().slice(0, 10);
  const urls = [];

  for (const f of FIXED) {
    urls.push(`  <url>\n    <loc>${SITE}${f.loc}</loc>\n    <changefreq>${f.changefreq}</changefreq>\n    <priority>${f.priority}</priority>\n  </url>`);
  }
  for (const p of approved) {
    const lastmod = (p.dateModified || p.date || today).slice(0, 10);
    urls.push(`  <url>\n    <loc>${SITE}/insights/${p.slug}/</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(OUT, xml);
  console.log(`Wrote sitemap with ${FIXED.length} fixed + ${approved.length} posts = ${urls.length} URLs`);
}

if (require.main === module) main();

module.exports = { main };
