#!/usr/bin/env node
/**
 * build-static-posts.js
 *
 * Reads data/posts.json and writes one fully-rendered static HTML page per
 * approved blog post at blog/posts/<slug>/index.html.
 *
 * Why: blog/post.html is a JS-rendered shell — every post URL serves identical
 * HTML to crawlers, so Google sees 36 duplicate pages and AI crawlers (GPTBot,
 * ClaudeBot, PerplexityBot) see no content at all. This generator emits real
 * HTML with the title, description, body, JSON-LD Article schema, and a
 * canonical URL pointing to the clean path. After this runs, both Google and
 * LLMs can index the content on first request.
 *
 * Usage:
 *   node scripts/build-static-posts.js
 *
 * Output:
 *   blog/posts/<slug>/index.html  (one per approved post)
 *
 * Idempotent: safe to run repeatedly. Old files for slugs that no longer exist
 * are NOT removed (we never want to nuke URLs Google has indexed).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_JSON = path.join(ROOT, 'data', 'posts.json');
const OUT_DIR = path.join(ROOT, 'blog', 'posts');
const SITE = 'https://beyondelevation.com';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonLd(str = '') {
  // JSON.stringify handles escaping for embedded JSON-LD
  return JSON.stringify(String(str));
}

function pageTemplate(post) {
  const canonical = `${SITE}/blog/posts/${post.slug}/`;
  const title = `${post.title} — Beyond Elevation`;
  const description = post.excerpt || `IP strategy insights from Beyond Elevation — ${post.title}`;
  const ogImage = `${SITE}/assets/og-image.jpg`;
  const heroImage = post.heroImage
    ? (post.heroImage.startsWith('http') ? post.heroImage : `${SITE}/assets/${path.basename(post.heroImage)}`)
    : `${SITE}/assets/og-image.jpg`;
  const datePublished = post.date;
  const dateModified = post.dateModified || post.date;
  const author = post.author || 'Beyond Elevation Team';
  const category = post.category || 'IP Strategy';

  // JSON-LD Article schema. Author is Hayat Amin (Person) so the Knowledge
  // Graph still associates content with the personal brand, while the visible
  // byline shows the team.
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
      name: 'Hayat Amin',
      url: 'https://beyondelevation.com/#founder',
      jobTitle: 'CEO of Beyond Elevation',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Beyond Elevation',
      url: SITE,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE}/assets/og-image.jpg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical,
    },
    articleSection: category,
  };

  // BreadcrumbList for SEO
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE}/blog/` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='black'/%3E%3Ctext x='50%25' y='53%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial,Helvetica,sans-serif' font-size='24' font-weight='700' fill='white'%3EBE%3C/text%3E%3C/svg%3E" />

    <!-- Open Graph -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(post.title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="Beyond Elevation" />
    <meta property="article:published_time" content="${datePublished}" />
    <meta property="article:modified_time" content="${dateModified}" />
    <meta property="article:author" content="Hayat Amin" />
    <meta property="article:section" content="${escapeHtml(category)}" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonical}" />
    <meta name="twitter:title" content="${escapeHtml(post.title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:site" content="@BeyondElevation" />
    <meta name="twitter:creator" content="@HayatAmin" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css?v=20260411a" />
    <style>
      .post-page { padding: 120px 0 90px; }
      .post-shell { max-width: 720px; margin: 0 auto; }
      .post-shell h1 { font-size: clamp(2.1rem, 5vw, 3.7rem); max-width: 14ch; line-height: 1.04; letter-spacing: -0.03em; }
      .post-meta { display:flex; gap: 14px; flex-wrap:wrap; color:#666; margin: 18px 0 30px; font-size: 0.92rem; }
      .post-body { color:#1f1f1f; line-height: 1.92; font-size: 1.08rem; }
      .post-body p { margin: 0 0 24px; }
      .post-body h2 { margin: 48px 0 16px; font-size: 1.55rem; line-height: 1.25; letter-spacing: -0.01em; }
      .post-body h3 { margin: 36px 0 12px; font-size: 1.2rem; line-height: 1.3; }
      .post-body a { color: #1a1a1a; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
      .author-block { display:flex; align-items:center; gap: 12px; margin: 18px 0 24px; padding: 0; border: 0; background: transparent; box-shadow:none; }
      .author-photo { width: 34px; height: 34px; border-radius: 999px; object-fit: cover; }
      .author-copy strong { display:block; font-size:1rem; color:#1a1a1a; }
      .author-copy span { color:#666; font-size: 0.93rem; }
      .post-hero { width: 100%; border-radius: 16px; margin: 24px 0 28px; object-fit: cover; }
      .share-bar { margin: 56px 0 0; padding: 40px 0 0; border-top: 1px solid #e8e8e8; }
      .share-bar-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 16px; }
      .share-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
      .share-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-size: 0.82rem; font-weight: 600; border-radius: 100px; border: 1.5px solid #e0e0e0; background: #fff; color: #333; text-decoration: none; transition: all 0.25s ease; }
      .share-btn:hover { border-color: #333; background: #1a1a1a; color: #fff; transform: translateY(-1px); }
      .share-btn svg { width: 16px; height: 16px; fill: currentColor; flex-shrink: 0; }
      @media (max-width: 760px) {
        .post-page { padding: 102px 0 72px; }
        .post-shell { max-width: 100%; }
        .post-shell h1 { max-width: none; }
      }
    </style>

    <!-- Article schema (JSON-LD) -->
    <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  </head>
  <body>
    <header class="topbar shell is-scrolled">
      <a class="brand" href="/">
        <span class="brand-dot"></span>
        <span>Beyond Elevation</span>
      </a>
      <nav>
        <a href="/blog/">Insights</a>
        <a href="/#contact">Contact</a>
      </nav>
      <a class="button button-ghost small" href="/#contact">Book a Strategy Session</a>
    </header>

    <main class="shell post-page">
      <article id="post" class="post-shell">
        <span class="eyebrow">${escapeHtml(category)}</span>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="author-block">
          <img class="author-photo" src="/assets/be-author-headshot.jpg" alt="Beyond Elevation Team" loading="eager" />
          <div class="author-copy">
            <strong>${escapeHtml(author)}</strong>
            <span>Featuring insights from Hayat Amin, CEO of Beyond Elevation</span>
          </div>
        </div>
        <img class="post-hero" src="${heroImage}" alt="${escapeHtml(post.title)}" loading="eager" />
        <div class="post-meta">
          <span>${escapeHtml(author)}</span>
          <span>${escapeHtml(datePublished)}</span>
          ${post.readingTime ? `<span>${escapeHtml(post.readingTime)}</span>` : ''}
        </div>
        <div class="post-body">
${post.body}
        </div>
        <div class="share-bar">
          <div class="share-bar-label">Share this article</div>
          <div class="share-buttons">
            <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">LinkedIn</a>
            <a class="share-btn" href="https://x.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(post.title + ' — Beyond Elevation')}" target="_blank" rel="noopener">X</a>
            <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" rel="noopener">Facebook</a>
          </div>
        </div>
      </article>
    </main>
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
    const dir = path.join(OUT_DIR, post.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'index.html');
    fs.writeFileSync(file, pageTemplate(post));
    written++;
  });

  console.log(`Generated ${written} static post page(s) into ${OUT_DIR}`);
}

if (require.main === module) main();

module.exports = { pageTemplate };
