#!/usr/bin/env node
/**
 * build-service-pages.js
 *
 * Reads data/services.json and writes:
 *  - services/<slug>/index.html         (one page per service)
 *  - services/index.html                (overview index of all services)
 *
 * Why: AI assistants and Google rank specific service pages, not homepages.
 * Each service page is a standalone, schema-marked, FAQ-rich, conversion-focused
 * landing page targeting one commercial-intent query.
 *
 * Author voice: Alex Hormozi-style direct response copy for Beyond Elevation.
 * Visible byline = Beyond Elevation team. Schema author = Hayat Amin (Person)
 * for Knowledge Graph credit.
 *
 * Idempotent.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SERVICES_JSON = path.join(ROOT, 'data', 'services.json');
const OUT_DIR = path.join(ROOT, 'services');
const SITE = 'https://beyondelevation.com';
const CTA_URL = 'https://usemotion.com/meet/hayat-amin/be';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serviceSchema(svc) {
  const url = `${SITE}/services/${svc.slug}/`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: svc.title,
    description: svc.subheading,
    url,
    provider: {
      '@type': 'Organization',
      name: 'Beyond Elevation',
      url: SITE,
      founder: {
        '@type': 'Person',
        name: 'Hayat Amin',
        jobTitle: 'CEO of Beyond Elevation',
      },
    },
    areaServed: { '@type': 'Country', name: 'Worldwide' },
    serviceType: svc.category,
    offers: {
      '@type': 'Offer',
      price: svc.price,
      priceCurrency: 'USD',
      url,
      availability: 'https://schema.org/InStock',
    },
  };
}

function faqSchema(svc) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: svc.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

function breadcrumbSchema(svc) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE}/services/` },
      { '@type': 'ListItem', position: 3, name: svc.title, item: `${SITE}/services/${svc.slug}/` },
    ],
  };
}

function header() {
  return `    <header class="topbar shell">
      <a class="brand" href="/" aria-label="Beyond Elevation home">
        <span class="brand-mark" aria-hidden="true">BE</span>
        <span>Beyond Elevation</span>
      </a>
      <nav>
        <a href="/#thesis">Problem</a>
        <a href="/services/">Pricing</a>
        <a href="/case-studies/">Case Studies</a>
        <a href="/blog/">Insights</a>
      </nav>
      <div class="topbar-right">
        <a class="topbar-phone" href="tel:+15713807699">(571) 380-7699</a>
        <a class="button button-ghost small" href="${CTA_URL}" target="_blank" rel="noreferrer">Get Your Free IP Diagnostic</a>
      </div>
    </header>`;
}

function footer() {
  return `    <footer class="footer shell">
      <div class="footer-inner">
        <div>
          <strong>Beyond Elevation</strong><br/>
          IP strategy, licensing revenue, valuation engineering for tech founders.
        </div>
        <div>
          <a href="/services/">All services</a> · <a href="/case-studies/">Case studies</a> · <a href="/blog/">Insights</a> · <a href="/#contact">Contact</a>
        </div>
      </div>
    </footer>`;
}

function pageStyles() {
  return `      .svc-page { padding: 120px 0 90px; }
      .svc-shell { max-width: 880px; margin: 0 auto; }
      .svc-eyebrow { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6b6b6b; margin: 0 0 14px; }
      .svc-shell h1 { font-size: clamp(2.4rem, 5.6vw, 4rem); line-height: 1.02; letter-spacing: -0.03em; margin: 0 0 22px; max-width: 18ch; }
      .svc-tagline { font-size: clamp(1.15rem, 2vw, 1.35rem); color: #2a2a2a; line-height: 1.55; margin: 0 0 14px; max-width: 56ch; font-weight: 500; }
      .svc-sub { font-size: 1.05rem; color: #444; line-height: 1.7; margin: 0 0 38px; max-width: 66ch; }
      .svc-cta-row { display: flex; gap: 14px; flex-wrap: wrap; margin: 0 0 18px; }
      .svc-cta-primary, .svc-cta-secondary { display: inline-flex; align-items: center; gap: 10px; padding: 16px 28px; font-size: 0.98rem; font-weight: 700; border-radius: 100px; text-decoration: none; transition: all 0.25s ease; letter-spacing: -0.005em; }
      .svc-cta-primary { background: #1a1a1a; color: #fff; border: 2px solid #1a1a1a; }
      .svc-cta-primary:hover { background: #000; transform: translateY(-1px); }
      .svc-cta-secondary { background: #fff; color: #1a1a1a; border: 2px solid #1a1a1a; }
      .svc-cta-secondary:hover { background: #f5f5f5; }
      .svc-price { display: inline-block; padding: 8px 16px; border-radius: 100px; background: #f4f4f0; font-size: 0.92rem; font-weight: 600; color: #1a1a1a; margin-left: 8px; }
      .svc-price-note { display: block; font-size: 0.85rem; color: #777; margin-top: 8px; }
      .svc-section { margin: 64px 0; }
      .svc-section h2 { font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.18; letter-spacing: -0.02em; margin: 0 0 22px; max-width: 22ch; }
      .svc-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
      .svc-list li { padding: 18px 22px; border: 1px solid #e8e8e8; border-radius: 14px; background: #fafafa; line-height: 1.6; color: #2a2a2a; }
      .svc-deliverables { display: grid; gap: 16px; }
      .svc-deliverables .item { padding: 22px 24px; border: 1px solid #e8e8e8; border-radius: 16px; background: #fff; }
      .svc-deliverables .item strong { display: block; font-size: 1.08rem; color: #1a1a1a; margin: 0 0 8px; letter-spacing: -0.01em; }
      .svc-deliverables .item p { margin: 0; color: #444; line-height: 1.65; font-size: 0.98rem; }
      .svc-edge { padding: 32px 36px; border-radius: 18px; background: #1a1a1a; color: #f4f4f0; line-height: 1.7; font-size: 1.05rem; }
      .svc-edge strong { color: #fff; display: block; font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase; margin: 0 0 12px; opacity: 0.7; }
      .svc-guarantee { padding: 28px 32px; border: 2px solid #1a1a1a; border-radius: 18px; background: #fff; line-height: 1.65; font-size: 1.05rem; }
      .svc-guarantee strong { display: block; font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase; margin: 0 0 10px; }
      .svc-faq h3 { font-size: 1.12rem; margin: 28px 0 8px; line-height: 1.35; }
      .svc-faq p { margin: 0 0 12px; line-height: 1.7; color: #2a2a2a; }
      .svc-final { margin: 80px 0 0; padding: 56px 48px; text-align: center; background: #1a1a1a; color: #fff; border-radius: 22px; }
      .svc-final h2 { color: #fff; max-width: none; margin: 0 0 14px; }
      .svc-final p { color: #ccc; margin: 0 0 28px; font-size: 1.05rem; }
      .svc-final .svc-cta-primary { background: #fff; color: #1a1a1a; border-color: #fff; }
      .svc-final .svc-cta-primary:hover { background: #f4f4f0; }
      .svc-final .svc-cta-secondary { background: transparent; color: #fff; border-color: #fff; }
      .svc-final .svc-cta-secondary:hover { background: rgba(255,255,255,0.08); }
      @media (max-width: 760px) {
        .svc-page { padding: 102px 0 64px; }
        .svc-shell h1 { max-width: none; }
        .svc-final { padding: 40px 28px; }
      }`;
}

function commonHead(title, description, canonical, schemas) {
  return `    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="GPTBot" content="index, follow" />
    <meta name="ClaudeBot" content="index, follow" />
    <meta name="PerplexityBot" content="index, follow" />
    <meta name="Google-Extended" content="index, follow" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='black'/%3E%3Ctext x='50%25' y='53%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,Helvetica,sans-serif' font-size='24' font-weight='700' fill='white'%3EBE%3C/text%3E%3C/svg%3E" />

    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${SITE}/assets/og-image.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Beyond Elevation" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${SITE}/assets/og-image.jpg" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" /></noscript>
    <link rel="stylesheet" href="/styles.css?v=20260411a" />
    <style>
${pageStyles()}
    </style>

${schemas.map(s => `    <script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}`;
}

function servicePageHTML(svc) {
  const canonical = `${SITE}/services/${svc.slug}/`;
  const title = `${svc.title} — Beyond Elevation`;
  const description = svc.subheading;

  const schemas = [serviceSchema(svc), faqSchema(svc), breadcrumbSchema(svc)];

  return `<!DOCTYPE html>
<html lang="en">
  <head>
${commonHead(title, description, canonical, schemas)}
  </head>
  <body>
${header()}

    <main class="shell svc-page">
      <article class="svc-shell">
        <p class="svc-eyebrow">${escapeHtml(svc.category)}</p>
        <h1>${escapeHtml(svc.title)}</h1>
        <p class="svc-tagline">${escapeHtml(svc.tagline)}</p>
        <p class="svc-sub">${escapeHtml(svc.subheading)}</p>

        <div class="svc-cta-row">
          <a class="svc-cta-primary" href="${CTA_URL}" target="_blank" rel="noreferrer">${escapeHtml(svc.ctaPrimary)} →</a>
          <a class="svc-cta-secondary" href="${CTA_URL}" target="_blank" rel="noreferrer">${escapeHtml(svc.ctaSecondary)}</a>
          <span class="svc-price">${escapeHtml(svc.price)}</span>
        </div>
        <small class="svc-price-note">${escapeHtml(svc.priceNote)}</small>

        <section class="svc-section">
          <h2>Who this is for</h2>
          <ul class="svc-list">
${svc.whoFor.map(w => `            <li>${escapeHtml(w)}</li>`).join('\n')}
          </ul>
        </section>

        <section class="svc-section">
          <h2>What you get</h2>
          <div class="svc-deliverables">
${svc.whatYouGet.map(d => `            <div class="item"><strong>${escapeHtml(d.title)}</strong><p>${escapeHtml(d.body)}</p></div>`).join('\n')}
          </div>
        </section>

        <section class="svc-section">
          <h2>The unfair advantage</h2>
          <div class="svc-edge">
            <strong>Why we win</strong>
            ${escapeHtml(svc.unfairAdvantage)}
          </div>
        </section>

        <section class="svc-section">
          <h2>Our guarantee</h2>
          <div class="svc-guarantee">
            <strong>The risk reversal</strong>
            ${escapeHtml(svc.guarantee)}
          </div>
        </section>

        <section class="svc-section svc-faq">
          <h2>FAQ</h2>
${svc.faqs.map(f => `          <h3>${escapeHtml(f.q)}</h3>\n          <p>${escapeHtml(f.a)}</p>`).join('\n')}
        </section>

        <section class="svc-final">
          <h2>${escapeHtml(svc.tagline)}</h2>
          <p>${escapeHtml(svc.price)} · ${escapeHtml(svc.priceNote)}</p>
          <div class="svc-cta-row" style="justify-content:center;">
            <a class="svc-cta-primary" href="${CTA_URL}" target="_blank" rel="noreferrer">${escapeHtml(svc.ctaPrimary)} →</a>
            <a class="svc-cta-secondary" href="${CTA_URL}" target="_blank" rel="noreferrer">${escapeHtml(svc.ctaSecondary)}</a>
          </div>
        </section>
      </article>
    </main>

${footer()}
  </body>
</html>
`;
}

function indexPageHTML(services) {
  const canonical = `${SITE}/services/`;
  const title = 'Services & Pricing — Beyond Elevation | Choose What Fits';
  const description = 'Three services. One playbook. AI patent intelligence, patentability audits for early-stage companies, and embedded fractional IP CxOs for growth-stage leaders. Operators, not lawyers.';

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: services.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/services/${s.slug}/`,
      name: s.title,
    })),
  };

  // Card visual configs
  const cardConfigs = [
    { bg: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)', orb: '#4a9eff', tag: 'AI', metrics: [{l:'Filings Tracked',v:'24/7'},{l:'Time Saved',v:'$30K+'}], tags: ['Licensing Revenue','Real-time Alerts','Audit & IP Strategy'] },
    { bg: 'linear-gradient(145deg, #1a3a2a 0%, #2d4a3a 100%)', orb: '#4aff8a', tag: 'Human + AI', metrics: [{l:'IP Assets',v:'12+'},{l:'Valuation Lift',v:'$4.2M'}], tags: ['Audit & IP Strategy','Exit Multiple','Fundraising Ready'] },
    { bg: 'linear-gradient(145deg, #2a1a0a 0%, #3d2a18 100%)', orb: '#ffa64a', tag: 'Human + AI', metrics: [{l:'Licensing Rev.',v:'$1.8M+'},{l:'Patents Filed',v:'66'}], tags: ['Licensing Revenue','Exit Multiple','Audit & IP Strategy'] },
  ];

  const priceDisplay = (s) => {
    if (s.price.includes('touch')) return '<div class="sc-price">Custom</div><div class="sc-price-sub">Get in touch for pricing</div>';
    const match = s.price.match(/\$([\d,]+)/);
    const amount = match ? match[0] : s.price;
    const period = s.price.includes('month') ? '/mo' : '';
    const note = s.priceNote || '';
    return `<div class="sc-price">${amount}<span class="sc-price-period">${period}</span></div><div class="sc-price-sub">${escapeHtml(note)}</div>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
${commonHead(title, description, canonical, [itemListSchema])}
    <style>
      /* === Horizontal 3-column service cards === */
      .sc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin:48px 0 0}
      .sc-card{border-radius:22px;overflow:hidden;display:flex;flex-direction:column;background:#fff;border:1px solid #e8e4df;transition:transform .4s cubic-bezier(.16,1,.3,1),box-shadow .4s ease}
      .sc-card:hover{transform:translateY(-6px);box-shadow:0 24px 60px rgba(0,0,0,.12)}

      .sc-visual{position:relative;padding:28px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;overflow:hidden}
      .sc-visual-tag{display:inline-block;font-size:.65rem;font-weight:600;padding:4px 12px;border-radius:100px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.7);letter-spacing:.04em;text-transform:uppercase;margin-bottom:12px}
      .sc-visual h3{color:#fff;font-size:1.15rem;line-height:1.25;letter-spacing:-.02em;margin:0 0 16px;text-align:center;max-width:240px}
      .sc-metrics{display:flex;gap:10px}
      .sc-metric{background:rgba(255,255,255,.08);backdrop-filter:blur(8px);border-radius:10px;padding:10px 14px;border:1px solid rgba(255,255,255,.1);text-align:left;min-width:90px}
      .sc-metric-label{font-size:.55rem;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.05em}
      .sc-metric-val{font-size:1.1rem;font-weight:700;color:#fff;margin-top:2px}
      .sc-orb{position:absolute;border-radius:50%;filter:blur(50px);opacity:.25;width:120px;height:120px;bottom:-20px;right:-20px}

      .sc-body{padding:28px 24px 32px;display:flex;flex-direction:column;flex:1}
      .sc-price-block{margin:0 0 14px}
      .sc-price{font-size:2rem;font-weight:800;color:#1a1a1a;letter-spacing:-.02em;line-height:1.1}
      .sc-price-period{font-size:.5em;font-weight:500;color:#888}
      .sc-price-sub{font-size:.82rem;color:#888;margin-top:2px}
      .sc-desc{font-size:.95rem;color:#555;line-height:1.65;margin:0 0 16px;flex:1}
      .sc-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 20px}
      .sc-tag{font-size:.68rem;font-weight:600;padding:5px 12px;border-radius:100px;background:#f4f0eb;color:#6b5b4a;letter-spacing:.02em}
      .sc-link{display:inline-flex;align-items:center;gap:6px;font-size:.9rem;font-weight:700;color:#1a1a1a;text-decoration:none;transition:gap .2s ease}
      .sc-link:hover{gap:10px}
      .sc-link svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2}

      @media(max-width:900px){.sc-grid{grid-template-columns:1fr;max-width:420px;margin:48px auto 0}}
    </style>
  </head>
  <body>
${header()}

    <main class="shell svc-page">
      <article class="svc-shell" style="max-width:1200px">
        <p class="svc-eyebrow">Services &amp; Pricing</p>
        <h1>Choose what fits.</h1>
        <p class="svc-tagline">We are not patent attorneys. We are operators who turn patents, data, and know-how into licensing revenue, higher valuation, and exit multiples.</p>

        <div class="sc-grid">
${services.map((s, i) => {
  const c = cardConfigs[i] || cardConfigs[0];
  return `          <div class="sc-card">
            <div class="sc-visual" style="background:${c.bg}">
              <div class="sc-orb" style="background:${c.orb}"></div>
              <span class="sc-visual-tag">${c.tag}</span>
              <h3>${escapeHtml(s.title)}</h3>
              <div class="sc-metrics">
${c.metrics.map(m => `                <div class="sc-metric"><div class="sc-metric-label">${m.l}</div><div class="sc-metric-val">${m.v}</div></div>`).join('\n')}
              </div>
            </div>
            <div class="sc-body">
              <div class="sc-price-block">${priceDisplay(s)}</div>
              <p class="sc-desc">${escapeHtml(s.tagline)}</p>
              <div class="sc-tags">
${c.tags.map(t => `                <span class="sc-tag">${t}</span>`).join('\n')}
              </div>
              <a class="sc-link" href="/services/${s.slug}/">Read the full breakdown <svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
            </div>
          </div>`;
}).join('\n')}
        </div>

        <section class="svc-final">
          <h2>Not sure which one fits?</h2>
          <p>Book a free 30-minute IP diagnostic. We will tell you which service makes sense — or that none of them do.</p>
          <div class="svc-cta-row" style="justify-content:center;">
            <a class="svc-cta-primary" href="${CTA_URL}" target="_blank" rel="noreferrer">Get Your Free IP Diagnostic →</a>
          </div>
        </section>
      </article>
    </main>

    <footer class="site-footer">
      <div class="site-footer-inner">
        <div class="site-footer-brand">
          <strong>Beyond Elevation</strong>
          <p>Turn your company's data, patents and know-how into licensing revenue, higher valuation and market domination.</p>
        </div>
        <nav class="site-footer-nav" aria-label="Footer navigation">
          <div class="site-footer-col">
            <span class="site-footer-heading">Navigate</span>
            <a href="/#thesis">Why IP Monetization</a>
            <a href="/services/">Pricing</a>
            <a href="/#system">How It Works</a>
            <a href="/#faq">FAQ</a>
          </div>
          <div class="site-footer-col">
            <span class="site-footer-heading">Proof</span>
            <a href="/case-studies/">Case Studies</a>
            <a href="/blog/">Insights</a>
          </div>
          <div class="site-footer-col">
            <span class="site-footer-heading">Resources</span>
            <a href="/blog/">Insights</a>
            <a href="/#end-cap">Contact</a>
          </div>
        </nav>
      </div>
      <div class="site-footer-bottom">
        <span>&copy; 2026 Beyond Elevation. All rights reserved.</span>
      </div>
    </footer>
  </body>
</html>
`;
}

function main() {
  const services = JSON.parse(fs.readFileSync(SERVICES_JSON, 'utf8'));
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  services.forEach(svc => {
    const dir = path.join(OUT_DIR, svc.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), servicePageHTML(svc));
    written++;
  });

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexPageHTML(services));
  console.log(`Generated ${written} service page(s) + 1 index into ${OUT_DIR}`);
}

if (require.main === module) main();
module.exports = { servicePageHTML, indexPageHTML };
