#!/usr/bin/env node
/**
 * build-static-posts.js — renders data/posts.json into static pages under
 * /insights/<slug>/index.html in the be-fearn 2026 site design, and rebuilds
 * the /insights/index.html listing.
 *
 * Retargeted 2026-08-25: the old /blog/posts/ output is gone; vercel.json
 * 301s every old /blog/posts/<slug>/ URL to /insights/<slug>/.
 *
 * Hand-written evergreen insight pages (HANDWRITTEN set below) are never
 * overwritten; they are pinned to the top of the listing.
 *
 * Idempotent: safe to run repeatedly. Old files for slugs that no longer exist
 * are NOT removed (we never want to nuke URLs Google has indexed).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_JSON = path.join(ROOT, 'data', 'posts.json');
const OUT_DIR = path.join(ROOT, 'insights');
const SITE = 'https://beyondelevation.com';

// Hand-authored pages in /insights/ that this generator must never touch.
const HANDWRITTEN = new Set([
  'automate-first',
  'two-day-close',
  'value-your-data',
  'what-is-a-chief-ip-officer',
  'what-is-a-fractional-cfo',
  'what-is-ai-operations',
]);

// Pinned order for the top of the listing (the evergreen role explainers).
const PINNED = [
  { slug: 'what-is-a-fractional-cfo', label: 'CFO insight', title: 'What is a fractional CFO?' },
  { slug: 'what-is-a-chief-ip-officer', label: 'IP insight', title: 'What is a Chief IP Officer?' },
  { slug: 'what-is-ai-operations', label: 'AI Operations (FDE) insight', title: 'What is an AI Operations (FDE) operator?' },
  { slug: 'automate-first', label: 'AI Operations (FDE) insight', title: 'Which business processes should you automate first with AI?' },
  { slug: 'two-day-close', label: 'CFO insight', title: 'How fast should month end actually close?' },
  { slug: 'value-your-data', label: 'CFO & IP insight', title: 'How do you value your company’s data?' },
];

// Map post categories (old and new) to the display label used on cards and
// article eyebrows, in the new site's voice.
function categoryLabel(category = '') {
  const c = String(category).toLowerCase();
  if (/ai operations|fde|automation/.test(c)) return 'AI Operations (FDE) insight';
  if (/^ai$|ai strategy/.test(c)) return 'AI insight';
  if (/cfo|finance|fundrais/.test(c)) return 'CFO insight';
  if (/leadership|managing director|md insight|coo|exec/.test(c)) return 'Leadership insight';
  if (/valuation/.test(c)) return 'Valuation insight';
  if (/data/.test(c)) return 'Data insight';
  if (/patent|licens|ip|trade secret/.test(c)) return 'IP insight';
  return 'Insight';
}

// Which service page an article should point back to.
function positionLink(category = '') {
  const label = categoryLabel(category);
  if (label === 'AI Operations (FDE) insight' || label === 'AI insight') return { href: '/fde', name: 'The AI Operations (FDE) position' };
  if (label === 'CFO insight' || label === 'Valuation insight') return { href: '/cfo', name: 'The CFO position' };
  if (label === 'Leadership insight') return { href: '/which-seat', name: 'Which position do I need?' };
  return { href: '/ip', name: 'The Chief IP Officer position' };
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// === Related posts cross-linking ===
// Every post links out to sibling posts so Google can flow PageRank between
// posts and discover the full archive from any entry point.

const STOPWORDS = new Set('a,an,and,are,as,at,be,by,for,from,has,how,if,in,into,is,it,of,on,or,that,the,to,was,were,will,with,you,your,my,me,we,us,vs,about,why,what,when,where,does,do,can,not,2026,2025,2024'.split(','));

function tokensFor(post) {
  const fromSlug = (post.slug || '').split('-');
  const fromTitle = (post.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  const all = [...fromSlug, ...fromTitle].filter(t => t && t.length > 2 && !STOPWORDS.has(t));
  return new Set(all);
}

function similarity(aSet, bSet) {
  let inter = 0;
  for (const t of aSet) if (bSet.has(t)) inter++;
  const union = aSet.size + bSet.size - inter;
  return union === 0 ? 0 : inter / union;
}

function pickRelated(post, allPosts, n = 4) {
  const aTokens = tokensFor(post);
  const cands = allPosts
    .filter(p => p.slug && p.slug !== post.slug && p.noIndex !== true && p.status !== 'archived')
    .map(p => ({ post: p, score: similarity(aTokens, tokensFor(p)) }))
    .sort((a, b) => b.score - a.score || (b.post.date || '').localeCompare(a.post.date || ''));
  return cands.slice(0, n).map(c => c.post);
}

// === FAQ extraction for FAQPage JSON-LD ===
function stripTags(s = '') {
  return String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function decodeEntities(s = '') {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

function extractFaqs(body) {
  if (!body) return [];
  const h2 = body.match(/<h2[^>]*>\s*(?:FAQ|Frequently\s+Asked)[^<]*<\/h2>/i);
  if (!h2) return [];
  let rest = body.slice(body.indexOf(h2[0]) + h2[0].length);
  const nextH2 = rest.match(/<h2[^>]*>/i);
  if (nextH2) rest = rest.slice(0, rest.indexOf(nextH2[0]));
  const qas = [];
  const re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*((?:<p[^>]*>[\s\S]*?<\/p>\s*)+)/gi;
  let m;
  while ((m = re.exec(rest)) !== null) {
    const q = decodeEntities(stripTags(m[1]));
    const a = decodeEntities(stripTags(m[2]));
    if (q && a) qas.push({ q, a });
  }
  return qas;
}

// Trim a string to a target length on a word boundary (for meta description).
function clampMeta(s, limit = 155) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= limit) return t;
  let cut = t.slice(0, limit);
  const sp = cut.lastIndexOf(' ');
  if (sp > limit * 0.6) cut = cut.slice(0, sp);
  return cut.replace(/[\s,;:\-–—]+$/, '');
}

// Shared chrome, matching the hand-written /insights pages exactly.
const NAV = `<header class="nav">
  <a class="brand" href="/"><span class="mark"></span>Beyond&nbsp;Elevation</a>
  <nav class="navlinks">
    <a href="/cfo">Chief Financial Officer</a>
    <a href="/ip">Chief IP Officer</a>
    <a href="/fde">AI Operations (FDE)</a>
    <a href="/case-studies">Case Studies</a>
    <a class="on" href="/insights">Insights</a>
    <a href="/about">About</a>
  </nav>
  <div class="navcta">
    <a class="btn" href="/call">Book a free call <span class="arw">↗</span></a>
  </div>
  <button class="menubtn" aria-label="Menu" aria-expanded="false" type="button"><span></span><span></span><span></span></button>
  <nav class="mobilemenu" aria-label="Menu">
    <div class="mm-grid">
      <div><p class="mono">The three positions</p><a href="/cfo">Chief Financial Officer</a><a href="/ip">Chief IP Officer</a><a href="/fde">AI Operations (FDE)</a><a href="/which-seat">Which position do I need?</a></div>
      <div><p class="mono">Proof</p><a href="/case-studies">Case studies</a><a href="/insights">Insights</a><a href="/faq">Questions, answered</a></div>
      <div><p class="mono">Company</p><a href="/about">About</a><a href="/how-it-works">How it works</a><a href="/contact">Contact</a><a href="/privacy">Privacy policy</a></div>
      <div class="mm-contact"><p class="mono">Talk to us</p><p><a href="/call">Book a free call</a></p><p><a href="tel:+15713807699">+1 571 380 7699</a></p><p><a href="tel:+447476383531">+44 7476 383531</a></p><p><a href="tel:+971521125754">+971 52 112 5754</a></p><p><a href="mailto:clara.hawkins@beyondelevation.com">clara.hawkins@beyondelevation.com</a></p></div>
    </div>
  </nav>
</header>
<div id="main"></div>`;

const GKSLIM = `<section class="gkslim">
  <div class="gkslim-who">
    <img loading="lazy" decoding="async" src="/assets/img/georgina-king.webp" alt="Georgina King">
    <p><b>Still reading? Talk it through instead.</b><span>A free 30-minute call with Georgina. Straight answer, no pitch, if there is nothing worth doing, we say so.</span></p>
  </div>
  <a class="btn" href="/call">Book a free call <span class="arw">↗</span></a>
</section>`;

const FOOTER = `<footer class="foot">
  <div class="foot-top">
    <p class="footline">Exited operators. Wired to AI.</p>
    <a class="btn" href="/call">Book a free call <span class="arw">↗</span></a>
  </div>
  <div class="foot-cols">
    <div><p class="mono">The three positions</p><a href="/ip">Chief IP Officer</a><a href="/cfo">Chief Financial Officer</a><a href="/fde">AI Operations (FDE)</a><a href="/which-seat">Which position do I need?</a></div>
    <div><p class="mono">Company</p><a href="/case-studies">Case studies</a><a href="/insights">Insights</a><a href="/about">About</a></div>
    <div><p class="mono">Contact</p><a href="tel:+15713807699">+1 571 380 7699</a><a href="tel:+447476383531">+44 7476 383531</a><a href="mailto:clara.hawkins@beyondelevation.com">clara.hawkins@beyondelevation.com</a></div>
  </div>
  <p class="fineprint">Beyond Elevation places exited C-suite operators into fractional executive positions. New York · London · Dubai.</p>
  <p class="fineprint">© 2026 Beyond Elevation · <a href="/company">Company</a> · <a href="/privacy">Privacy</a></p>
</footer>`;

// Old posts carry internal links to /blog/posts/<slug>/ — rewrite them to the
// new home so link equity stays on-site instead of bouncing through a 301.
function rewriteInternalLinks(body = '') {
  return String(body)
    .replace(/(href=["'])(?:https?:\/\/(?:www\.)?beyondelevation\.com)?\/blog\/posts\/([^"'#?]+?)\/?(["'#?])/gi, '$1/insights/$2$3')
    .replace(/(href=["'])(?:https?:\/\/(?:www\.)?beyondelevation\.com)?\/blog\/?(["'#?])/gi, '$1/insights/$2');
}

function relatedCards(related) {
  if (!related || !related.length) return '';
  const cards = related.map(p => `    <a class="inscard" href="/insights/${p.slug}">
      <p class="mono">${escapeHtml(categoryLabel(p.category))}</p>
      <h3>${escapeHtml(p.title || '')}</h3>
      <p class="ins-go">Read the insight <span class="arw">↗</span></p>
    </a>`).join('\n');
  return `
<section style="padding:0 0 clamp(40px,5vw,72px)" aria-label="Related insights">
  <div class="insgrid">
${cards}
  </div>
</section>`;
}

function pageTemplate(post, related) {
  const canonical = `${SITE}/insights/${post.slug}`;
  const seoTitle = post.seoTitle || post.title;
  const BRAND_SUFFIX = ' | Beyond Elevation';
  const title = (seoTitle.length + BRAND_SUFFIX.length) <= 60
    ? `${seoTitle}${BRAND_SUFFIX}`
    : seoTitle;
  const description = clampMeta(post.metaDescription || post.excerpt || `Insights from Beyond Elevation — ${post.title}`);
  // Posts published before hero art carry the old default '../assets/og-image.jpg'
  // and render exactly as before. A real heroImage becomes the og:image and a
  // full-width hero at the top of the article.
  const DEFAULT_HERO = '../assets/og-image.jpg';
  let heroPath = null;
  if (post.heroImage && post.heroImage !== DEFAULT_HERO) {
    heroPath = /^https?:\/\//.test(post.heroImage)
      ? post.heroImage
      : '/' + String(post.heroImage).replace(/^(\.\.\/|\.\/|\/)+/, '');
  }
  const ogImage = heroPath
    ? (/^https?:\/\//.test(heroPath) ? heroPath : `${SITE}${heroPath}`)
    : `${SITE}/assets/img/og.jpg`;
  const datePublished = post.date;
  const dateModified = post.dateModified || post.date;
  let author = post.author || 'Hayat Amin';
  if (/beyond elevation( team| editorial)?/i.test(author)) author = 'Hayat Amin';
  const category = post.category || 'IP Strategy';
  const label = categoryLabel(category);
  const pos = positionLink(category);
  const isNoIndex = post.noIndex === true || post.status === 'archived';
  const robotsContent = isNoIndex
    ? 'noindex, follow'
    : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
  const robotsMeta = isNoIndex ? `\n<meta name="robots" content="${robotsContent}">` : `\n<meta name="robots" content="${robotsContent}">`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description,
    image: ogImage,
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: author,
      url: 'https://beyondelevation.com/about',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Beyond Elevation',
      url: SITE,
      logo: { '@type': 'ImageObject', url: ogImage },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    articleSection: category,
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE}/insights/` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
    ],
  };

  const faqs = extractFaqs(post.body);
  const faqSchema = faqs.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  } : null;
  const faqScript = faqSchema
    ? `\n<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`
    : '';

  const body = rewriteInternalLinks(post.body);
  const excerpt = post.excerpt ? `<p class="standfirst">${escapeHtml(decodeEntities(stripTags(post.excerpt)))}</p>` : '';
  const heroImg = heroPath
    ? `\n  <img class="article-hero" src="${heroPath}" alt="${escapeHtml(post.title)}" style="width:100%;height:auto;display:block;margin:26px 0 6px;border:1px solid var(--line)" decoding="async">`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="canonical" href="${canonical}">${robotsMeta}
<meta name="theme-color" content="#FFFFFF">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:title" content="${escapeHtml(seoTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
<meta property="article:published_time" content="${datePublished}">
<meta property="article:modified_time" content="${dateModified}">
<link rel="stylesheet" href="/assets/style.css?v=33">
<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>${faqScript}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

${NAV}

<main class="article">
  <p class="mono">${escapeHtml(label)}</p>
  <h1>${escapeHtml(post.title)}</h1>
  <p class="mono">${escapeHtml(author)} · Updated ${escapeHtml(dateModified)}</p>${heroImg}
  ${excerpt}
  ${body}
</main>

<section class="storynav" style="border-top:0;padding-top:0">
  <a href="${pos.href}"><p class="mono">The position behind it</p><b>${escapeHtml(pos.name)} →</b></a>
  <a href="/insights"><p class="mono">Keep reading</p><b>All insights →</b></a>
</section>
${relatedCards(related)}
${GKSLIM}

${FOOTER}
<script src="/assets/site.js?v=8"></script>
</body>
</html>
`;
}

function insightsIndexTemplate(posts) {
  // Newest first, pinned evergreens on top.
  const sorted = [...posts]
    .filter(p => !HANDWRITTEN.has(p.slug) && p.noIndex !== true)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const pinnedCards = PINNED.map(p => `    <a class="inscard" href="/insights/${p.slug}">
      <p class="mono">${escapeHtml(p.label)}</p>
      <h3>${escapeHtml(p.title)}</h3>
      <p class="ins-go">Read the insight <span class="arw">↗</span></p>
    </a>`).join('\n');

  const cards = sorted.map(p => `    <a class="inscard" href="/insights/${p.slug}">
      <p class="mono">${escapeHtml(categoryLabel(p.category))}</p>
      <h3>${escapeHtml(p.title || '')}</h3>
      <p class="ins-go">Read the insight <span class="arw">↗</span></p>
    </a>`).join('\n');

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [...PINNED.map((p, i) => ({
      '@type': 'ListItem', position: i + 1, url: `${SITE}/insights/${p.slug}`,
    })), ...sorted.map((p, i) => ({
      '@type': 'ListItem', position: PINNED.length + i + 1, url: `${SITE}/insights/${p.slug}`,
    }))],
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Insights | Beyond Elevation</title>
<meta name="description" content="Straight talking pieces on finance, AI operations, IP strategy, data and the money behind them.">
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="canonical" href="https://beyondelevation.com/insights">
<meta name="theme-color" content="#FAF9F7">
<meta property="og:url" content="https://beyondelevation.com/insights">
<meta property="og:image" content="https://beyondelevation.com/assets/img/og.jpg">
<meta property="og:title" content="Insights | Beyond Elevation">
<meta property="og:description" content="Straight talking pieces on finance, AI operations, IP strategy, data and the money behind them.">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/style.css?v=33">
<script type="application/ld+json">${JSON.stringify(itemList)}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

${NAV}

<section class="storyhero">
  <div class="inner">
    <p class="eyebrow">Insights</p>
    <h1>What we know, written down.</h1>
    <p class="sub">Straight talking pieces on finance, AI operations, IP strategy, data and the money behind them. No fluff, no legal waffle.</p>
  </div>
</section>

<section style="padding:0 0 clamp(40px,5vw,72px)">
  <div class="insgrid">
${pinnedCards}
${cards}
  </div>
</section>

<section class="about">
  <div class="about-copy">
    <p class="eyebrow">Let&rsquo;s get on a call</p>
    <h2 class="h2">Want this position in your company?</h2>
    <p class="sub"><b>Georgina</b> books you a free 30 minute call. Straight answer, no pitch. If there is nothing worth doing, we say so on the call.</p>
    <p class="mono small">Consultants are paid to advise. We are paid to deliver.</p>
    <a class="gk-btn" href="/call">Get on a call now <span class="arw">↗</span></a>
  </div>
  <figure class="about-art gk-art">
    <img loading="lazy" decoding="async" src="/assets/img/georgina-king.webp" alt="Georgina King" width="800" height="800">
    <span class="gk-status"><span class="gk-pulse"></span>Available this week</span>
    <figcaption><b>Georgina King</b><i>Executive Partnership Manager</i></figcaption>
  </figure>
</section>

${GKSLIM}

${FOOTER}

<script src="/assets/site.js?v=4"></script>
</body>
</html>
`;
}

function main() {
  const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));
  const approved = posts.filter(p =>
    p.status === 'published' &&
    p.alexReview &&
    p.alexReview.approved === true
  );

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  approved.forEach(post => {
    if (!post.slug || !post.title || !post.body) {
      console.warn('SKIP (missing slug/title/body):', post.slug || '(no slug)');
      return;
    }
    if (HANDWRITTEN.has(post.slug)) {
      console.warn('SKIP (hand-written page owns this slug):', post.slug);
      return;
    }
    const dir = path.join(OUT_DIR, post.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'index.html');
    const related = pickRelated(post, approved, 4);
    fs.writeFileSync(file, pageTemplate(post, related));
    written++;
  });

  const indexPath = path.join(OUT_DIR, 'index.html');
  fs.writeFileSync(indexPath, insightsIndexTemplate(approved));

  console.log(`Generated ${written} static post page(s) into ${OUT_DIR}`);
  console.log(`Rebuilt insights listing at ${indexPath}`);
}

if (require.main === module) main();

module.exports = { pageTemplate, insightsIndexTemplate, categoryLabel };
