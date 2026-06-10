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

const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const POSTS_JSON = path.join(ROOT, 'data', 'posts.json');
const SERVICES_JSON = path.join(ROOT, 'data', 'services.json');
const OUT = path.join(ROOT, 'sitemap.xml');
const LLMS_OUT = path.join(ROOT, 'llms.txt');
const SITE = 'https://beyondelevation.com';
const TODAY = new Date().toISOString().slice(0, 10);

// Fixed routes — the high-priority non-content pages of the site.
// Each gets its REAL last-modified date via git history (see lastmodForPath).
// Previously every URL got TODAY which produced a "scaled content abuse" signal.
const FIXED_ROUTES = [
  {
    loc: '/', priority: '1.0', changefreq: 'weekly', sourceFile: 'index.html',
    images: [
      {
        loc: '/assets/hayat-amin-og.jpg',
        title: 'Hayat Amin — Founder & CEO of Beyond Elevation',
        caption: 'Hayat Amin, three-time exited entrepreneur and three-time FT100 CxO. Founder of Beyond Elevation, the IP strategy firm tech founders call when their patents are worth more than their cap table.',
        license: '/about/',
      },
      {
        loc: '/assets/testimonial-dgs-final-v4.jpg',
        title: 'DGS IP Strategy Case Study — Beyond Elevation',
        caption: 'DGS data monetisation case study. Beyond Elevation restructured DGS patent and data assets into a recurring revenue model for telecom. Fernando Murias, CEO.',
        license: '/',
      },
      {
        loc: '/assets/proof-portrait-latest.jpg',
        title: 'Position Imaging IP Licensing Case Study — Beyond Elevation',
        caption: 'Position Imaging 66-patent portfolio restructured by Beyond Elevation into eight-figure licensing revenue. IP strategy and patent monetisation case study.',
        license: '/',
      },
      {
        loc: '/assets/alexandra-headshot.jpg',
        title: 'Alexandra — Executive Partnership Manager at Beyond Elevation',
        caption: 'Alexandra, Executive Partnership Manager at Beyond Elevation. IP strategy and licensing revenue consultancy based in New York.',
        license: '/',
      },
      {
        loc: '/assets/be-linkedin-still-v2.jpg',
        title: 'Hayat Amin — IP Strategy Operator, Beyond Elevation',
        caption: 'Hayat Amin, IP strategy operator and Founder of Beyond Elevation. Three-time exited entrepreneur helping founders turn patents and data into licensing revenue.',
        license: '/about/',
      },
      {
        loc: '/assets/ceo-mat.jpg',
        title: 'Mat Westergreen — Founder & CEO, Grantify',
        caption: 'Mat Westergreen, Founder and CEO of Grantify. Beyond Elevation client testimonial on IP strategy.',
        license: '/',
      },
      {
        loc: '/assets/ceo-william.jpg',
        title: 'William Green — CEO, L\'Estrange London',
        caption: 'William Green, CEO of L\'Estrange London. Beyond Elevation client testimonial on patent licensing framework.',
        license: '/',
      },
      {
        loc: '/assets/ceo-carl.jpg',
        title: 'Carl Steinmann — Founder, Acresclub',
        caption: 'Carl Steinmann, Founder of Acresclub. Beyond Elevation helped structure the IP narrative for a $30M funding round.',
        license: '/',
      },
      {
        loc: '/assets/ceo-joysy.jpg',
        title: 'Joysy John — CEO, Educate Ventures',
        caption: 'Joysy John, CEO of Educate Ventures. Beyond Elevation client testimonial on IP commercialisation strategy.',
        license: '/',
      },
      {
        loc: '/assets/ceo-babacar.jpg',
        title: 'Babacar Diallo — CEO, Oolu Solar',
        caption: 'Babacar Diallo, CEO of Oolu Solar. Beyond Elevation turned data assets into recurring revenue streams.',
        license: '/',
      },
      {
        loc: '/assets/ceo-dan.jpg',
        title: 'Dan Moller — COO, Vinaya Technology',
        caption: 'Dan Moller, COO of Vinaya Technology. Beyond Elevation reshaped approach to hidden IP value.',
        license: '/',
      },
      {
        loc: '/assets/ceo-ngozi.jpg',
        title: 'Ngozi Fakeye — Founder, Nala Health',
        caption: 'Ngozi Fakeye, Founder of Nala Health. Beyond Elevation IP strategy central to closing first funding round.',
        license: '/',
      },
      {
        loc: '/assets/ceo-rob.jpg',
        title: 'Rob Withagen — Founder, Asoko Insight',
        caption: 'Rob Withagen, Founder of Asoko Insight. Beyond Elevation IP and business development expertise for scale-up funding rounds.',
        license: '/',
      },
    ],
  },
  { loc: '/services/', priority: '0.95', changefreq: 'weekly', sourceFile: 'services/index.html' },
  { loc: '/case-studies/', priority: '0.9', changefreq: 'monthly', sourceFile: 'case-studies/index.html' },
  { loc: '/blog/', priority: '0.9', changefreq: 'weekly', sourceFile: 'blog/index.html' },
  {
    loc: '/about/', priority: '0.95', changefreq: 'monthly', sourceFile: 'about/index.html',
    images: [
      {
        loc: '/assets/hayat-amin-portrait.jpg',
        title: 'Hayat Amin — Founder & CEO of Beyond Elevation',
        caption: 'Hayat Amin — Founder & CEO of Beyond Elevation. Three-time exited entrepreneur, three-time FT100 CxO, and IP strategy operator. Portrait, black-and-white. 1200x1500.',
        license: '/about/',
      },
      {
        loc: '/assets/hayat-amin-og.jpg',
        title: 'Hayat Amin — Founder & CEO of Beyond Elevation (social card)',
        caption: 'Open Graph card image of Hayat Amin, Founder & CEO of Beyond Elevation. 1200x630.',
        license: '/about/',
      },
    ],
  },
];

// Resolve a per-file lastmod from git (most recent commit that touched the file).
// Falls back to fs mtime, then to TODAY. This stops the sitemap from claiming
// every URL was modified today on every deploy.
function lastmodForPath(relPath) {
  const abs = path.join(ROOT, relPath);
  try {
    const out = execSync(`git log -1 --pretty=%cs -- "${relPath}"`, { cwd: ROOT }).toString().trim();
    if (out) return out;
  } catch (_) {}
  try {
    return new Date(fs.statSync(abs).mtime).toISOString().slice(0, 10);
  } catch (_) {}
  return TODAY;
}

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function imageEntry(img) {
  const lic = img.license ? `\n      <image:license>${SITE}${img.license}</image:license>` : '';
  return `    <image:image>
      <image:loc>${SITE}${img.loc}</image:loc>
      <image:title>${esc(img.title)}</image:title>
      <image:caption>${esc(img.caption)}</image:caption>${lic}
    </image:image>`;
}

function urlEntry({ loc, lastmod, changefreq, priority, images }) {
  const imageBlock = (images && images.length)
    ? '\n' + images.map(imageEntry).join('\n')
    : '';
  return `  <url>
    <loc>${SITE}${loc}</loc>
    <lastmod>${lastmod || TODAY}</lastmod>
    <changefreq>${changefreq || 'monthly'}</changefreq>
    <priority>${priority || '0.7'}</priority>${imageBlock}
  </url>`;
}

function main() {
  const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));
  const services = JSON.parse(fs.readFileSync(SERVICES_JSON, 'utf8'));

  // Filter out:
  //  - status != 'published'
  //  - alexReview.approved != true (legacy gate)
  //  - noIndex === true (added 2026-05-06 for HCU triage)
  //  - status === 'archived' (added 2026-05-06)
  const approvedPosts = posts
    .filter(p => p.status === 'published'
              && p.alexReview && p.alexReview.approved === true
              && p.noIndex !== true
              && p.status !== 'archived')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const entries = [];

  // Fixed routes — use real per-file git lastmod, NOT today.
  FIXED_ROUTES.forEach(r => entries.push(urlEntry({
    loc: r.loc,
    lastmod: lastmodForPath(r.sourceFile),
    changefreq: r.changefreq,
    priority: r.priority,
    images: r.images,
  })));

  // Service pages — use real per-file git lastmod.
  services.forEach(svc => {
    entries.push(urlEntry({
      loc: `/services/${svc.slug}/`,
      lastmod: lastmodForPath(`services/${svc.slug}/index.html`),
      changefreq: 'monthly',
      priority: '0.9',
    }));
  });

  // Blog posts — prefer explicit dateModified, then date, then git lastmod, then TODAY.
  approvedPosts.forEach(post => {
    const lastmod = post.dateModified
      || post.date
      || lastmodForPath(`blog/posts/${post.slug}/index.html`)
      || TODAY;
    const heroImage = post.heroImage
      ? (post.heroImage.startsWith('http')
          ? post.heroImage
          : `${SITE}/assets/${path.basename(post.heroImage)}`)
      : `${SITE}/assets/og-image.jpg`;
    const heroImagePath = heroImage.replace(SITE, '');
    entries.push(urlEntry({
      loc: `/blog/posts/${post.slug}/`,
      lastmod: esc(lastmod),
      changefreq: 'monthly',
      priority: '0.7',
      images: [
        {
          loc: heroImagePath,
          title: post.title,
          caption: `${post.title} — IP strategy insights from Beyond Elevation by Hayat Amin`,
          license: `/blog/posts/${post.slug}/`,
        },
      ],
    }));
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
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
