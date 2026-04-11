#!/usr/bin/env node
/**
 * build-sitemap.js
 *
 * Regenerates sitemap.xml from data/posts.json + data/services.json + a list of
 * fixed site routes. Runs on every deploy so new blog posts and services get
 * discovered by Google, Bing, and AI crawlers automatically — no hand-editing.
 *
 * Why: previously sitemap.xml was hand-maintained and drifted out of sync with
 * the posts.json source of truth. New posts were written to disk but never
 * listed in the sitemap, so Google never discovered them.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_JSON = path.join(ROOT, 'data', 'posts.json');
const SERVICES_JSON = path.join(ROOT, 'data', 'services.json');
const OUT = path.join(ROOT, 'sitemap.xml');
const LLMS_OUT = path.join(ROOT, 'llms.txt');
const SITE = 'https://beyondelevation.com';
const TODAY = new Date().toISOString().slice(0, 10);

// Fixed routes — the high-priority non-content pages of the site.
const FIXED_ROUTES = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/services/', priority: '0.95', changefreq: 'weekly' },
  { loc: '/case-studies/', priority: '0.9', changefreq: 'monthly' },
  { loc: '/blog/', priority: '0.9', changefreq: 'weekly' },
];

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${SITE}${loc}</loc>
    <lastmod>${lastmod || TODAY}</lastmod>
    <changefreq>${changefreq || 'monthly'}</changefreq>
    <priority>${priority || '0.7'}</priority>
  </url>`;
}

function main() {
  const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));
  const services = JSON.parse(fs.readFileSync(SERVICES_JSON, 'utf8'));

  const approvedPosts = posts
    .filter(p => p.status === 'published' && p.alexReview && p.alexReview.approved === true)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const entries = [];

  // Fixed routes
  FIXED_ROUTES.forEach(r => entries.push(urlEntry(r)));

  // Service pages
  services.forEach(svc => {
    entries.push(urlEntry({
      loc: `/services/${svc.slug}/`,
      lastmod: TODAY,
      changefreq: 'weekly',
      priority: '0.9',
    }));
  });

  // Blog posts
  approvedPosts.forEach(post => {
    entries.push(urlEntry({
      loc: `/blog/posts/${post.slug}/`,
      lastmod: esc(post.dateModified || post.date || TODAY),
      changefreq: 'monthly',
      priority: '0.7',
    }));
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  fs.writeFileSync(OUT, xml);
  console.log(`Wrote sitemap with ${FIXED_ROUTES.length} fixed + ${services.length} services + ${approvedPosts.length} posts = ${entries.length} URLs`);

  // Also regenerate llms.txt so AI crawlers get a fresh index of services +
  // posts with the CORRECT clean URLs (not the legacy /blog/post.html?slug=X
  // pattern that the old hand-maintained file was stuck on).
  const serviceBlock = services.map(svc => {
    const price = svc.price || '';
    return `- [${svc.title}](${SITE}/services/${svc.slug}/) — ${price}${price ? ' — ' : ''}${svc.tagline || ''}`;
  }).join('\n');

  const postBlock = approvedPosts.map(p =>
    `- [${p.title}](${SITE}/blog/posts/${p.slug}/) — /blog/md/${p.slug}.md`
  ).join('\n');

  const llms = `# Beyond Elevation — IP Strategy & Licensing Revenue Consultancy

Beyond Elevation is a specialist IP strategy consulting firm that helps tech companies, AI startups, and SMEs turn dormant patents, proprietary data, and know-how into licensing revenue and higher valuations. We are operators and business strategists, not lawyers — that is the unfair advantage. Every engagement combines proprietary AI frameworks (audit, scoring, competitive intelligence) with exited human operators who have closed eight-figure licensing deals. Founded by Hayat Amin. We serve founders, CEOs, and investors seeking expert guidance on patent licensing, IP valuation, AI valuations, tech company valuations, and data monetization.

## Services (AI + Human)

${serviceBlock}

All services combine proprietary AI frameworks with senior human operators. We are operators and business strategists, not lawyers — that is the unfair advantage our clients hire us for.

## Service Details

### AI Patent Intelligence Dashboard — $980 / month
Real-time competitive patent intelligence. Live competitor patent feed, AI patentability scoring (under 8 minutes per idea), white-space map, block + leverage alerts, and monthly operator review. Built by operators who have closed eight-figure licensing deals. 30-day revenue-lever guarantee.
URL: ${SITE}/services/ai-patent-intelligence-dashboard/

### Patentability Audit + IP Strategy Sprint — $6,500 / month × 3 months
For early-stage companies with proprietary tech and zero filings. Month 1: patent mining (we find 4–9 hidden assets). Month 2: strategic filing plan + IP Defensibility 7-Point Test. Month 3: filings + investor narrative 1-pager. Includes trade secret playbook and fundraise-ready IP moat summary. Refund guarantee if we don't find 3 patentable assets your attorney missed in month one.
URL: ${SITE}/services/patentability-audit/

### Fractional IP CxO — Get in touch for pricing
An exited Beyond Elevation operator joins your company two days a week as fractional Chief IP Officer. Runs licensing programme, strategic blocking patents, employment IP lockdown, exit-ready IP narrative. Includes AI Patent Intelligence Dashboard. For Series B+ with real patent portfolio. 90-day proof window with refund.
URL: ${SITE}/services/fractional-ip-cxo/

## Founder
Hayat Amin, Founder & CEO. Exited operator who restructured Position Imaging's 66-patent portfolio into a recurring royalty stream. Built DGS into a data-monetisation model for telecom. Team of exited C-suite operators, not lawyers.

## Proof Points
- Trustpilot: 4.5 stars | Google: 5.0 stars
- Startups with patents + trademarks are 10.2x more likely to secure early-stage funding
- 2x higher likelihood of successful exit with protected IP
- Case study: Position Imaging 66-patent portfolio restructured into eight-figure licensing revenue
- Case study: DGS data monetisation framework for telecom

## Key Pages
- Homepage: ${SITE}/
- Services: ${SITE}/services/
- Case Studies: ${SITE}/case-studies/
- Blog: ${SITE}/blog/

## Book a Strategy Session
https://usemotion.com/meet/hayat-amin/be
Phone: +1-571-380-7699
Address: 178 Broadway, 3rd Floor #4542, New York, NY 10001, United States

## Blog Articles

Beyond Elevation publishes expert articles on IP strategy and licensing revenue. Individual markdown files available at /blog/md/{slug}.md

${postBlock}

> Full blog content available at /llms-full.txt
`;

  fs.writeFileSync(LLMS_OUT, llms);
  console.log(`Wrote llms.txt with ${services.length} services + ${approvedPosts.length} posts`);
}

if (require.main === module) main();

module.exports = { main };
