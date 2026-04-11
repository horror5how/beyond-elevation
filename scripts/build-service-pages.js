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
        <a href="/services/">Services</a>
        <a href="/case-studies/">Case Studies</a>
        <a href="/blog/">Blog</a>
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
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
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
  const title = 'Services — Beyond Elevation | AI + Human IP Strategy for Tech Founders';
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

  return `<!DOCTYPE html>
<html lang="en">
  <head>
${commonHead(title, description, canonical, [itemListSchema])}
  </head>
  <body>
${header()}

    <main class="shell svc-page">
      <article class="svc-shell">
        <p class="svc-eyebrow">Services</p>
        <h1>AI + Human IP strategy. Built by operators. Priced for outcomes.</h1>
        <p class="svc-tagline">We are not patent attorneys. We are operators and business strategists who turn patents, data, and know-how into licensing revenue, higher valuation, and exit multiples.</p>
        <p class="svc-sub">Three services. One playbook. Pick the one that matches where your company is right now — and the one that gets you to where you need to be in 12 months.</p>

        <section class="svc-section">
          <div class="svc-deliverables">
${services.map(s => `            <div class="item">
              <strong>${escapeHtml(s.title)}</strong>
              <p style="margin:8px 0 14px; font-size:0.95rem; color:#666;">${escapeHtml(s.price)}</p>
              <p>${escapeHtml(s.tagline)}</p>
              <p style="margin-top:16px;"><a href="/services/${s.slug}/" style="color:#1a1a1a; font-weight:700; text-decoration:underline;">Read the full breakdown →</a></p>
            </div>`).join('\n')}
          </div>
        </section>

        <section class="svc-final">
          <h2>Not sure which one fits?</h2>
          <p>Book a free 30-minute IP diagnostic. We will tell you which service makes sense — or that none of them do.</p>
          <div class="svc-cta-row" style="justify-content:center;">
            <a class="svc-cta-primary" href="${CTA_URL}" target="_blank" rel="noreferrer">Get Your Free IP Diagnostic →</a>
          </div>
        </section>
      </article>
    </main>

${footer()}
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
