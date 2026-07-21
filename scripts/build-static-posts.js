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

// End-of-post conversion CTA. Inserted between body and FAQ (when present),
// otherwise appended after the body. ?ref=blog-<slug> attributes Motion
// bookings back to the originating blog post for conversion analytics.
function renderPostCTA(slug) {
  const ref = encodeURIComponent(slug || '');
  return `
<aside class="post-cta">
  <h3>You just read the framework. Now price your own IP.</h3>
  <p>Beyond Elevation runs a 60-minute IP &amp; licensing diagnostic for founders raising Seed–Series B. You leave with: (1) a defensibility score, (2) the royalty range your current portfolio supports, (3) the next 3 filings ranked by exit-multiple impact. No deck. No proposal. One call, one number.</p>
  <a class="cta-primary" href="https://usemotion.com/meet/hayat-amin/be?ref=blog-${ref}" target="_blank" rel="noreferrer">Book the diagnostic →</a>
  <p class="cta-fineprint">14 founders booked this month. Hayat takes 4/week.</p>
</aside>
`;
}

// Inject CTA into the post body just before the FAQ block; if no FAQ, append.
// Idempotent: skips if a .post-cta is already present in the body.
function injectCTA(body, slug) {
  if (!body) return body;
  if (/class=["']post-cta["']/.test(body)) return body;
  const cta = renderPostCTA(slug);
  const faqMatch = body.match(/<h2[^>]*>\s*(?:FAQ|Frequently\s+Asked)\b[^<]*<\/h2>/i);
  if (faqMatch) {
    const idx = body.indexOf(faqMatch[0]);
    return body.slice(0, idx) + cta + body.slice(idx);
  }
  return body + cta;
}

// === Related posts cross-linking ===
// Every post links out to 4 sibling posts so Google can flow PageRank between
// posts and discover the full archive from any entry point. Without this,
// posts are crawl dead-ends — the #1 reason Google verdicts "Discovered –
// currently not indexed" on this site.

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
// Posts carry a visible FAQ section as <h2>FAQ…</h2> followed by
// <h3>question</h3><p>answer</p> pairs. We parse those into a FAQPage schema
// so Google can surface rich FAQ results and AI engines can cite the Q&As.
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

function renderRelatedSection(related) {
  if (!related || !related.length) return '';
  const cards = related.map(p => {
    const url = `/blog/posts/${p.slug}/`;
    const cat = escapeHtml(p.category || 'IP Strategy');
    const title = escapeHtml(p.title || '');
    return `            <a class="related-card" href="${url}">
              <span class="related-tag">${cat}</span>
              <h3>${title}</h3>
              <span class="related-cta">Read article →</span>
            </a>`;
  }).join('\n');
  return `
        <aside class="related-posts" aria-label="Related insights">
          <div class="related-head">
            <span class="related-eyebrow">Continue reading</span>
            <h2>Related insights</h2>
          </div>
          <div class="related-grid">
${cards}
          </div>
        </aside>
`;
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

function pageTemplate(post, related) {
  const canonical = `${SITE}/blog/posts/${post.slug}/`;
  // SEO <title>: short seoTitle so Google does not truncate it; the long
  // post.title stays the visible H1. The " — Beyond Elevation" brand suffix is
  // only appended when the total stays within Google's ~60-char display limit;
  // otherwise the seoTitle alone is used (brand still appears in og:site_name).
  const seoTitle = post.seoTitle || post.title;
  const BRAND_SUFFIX = ' — Beyond Elevation';
  const title = (seoTitle.length + BRAND_SUFFIX.length) <= 60
    ? `${seoTitle}${BRAND_SUFFIX}`
    : seoTitle;
  // <meta description>: trimmed metaDescription (~155 chars). Falls back to a
  // clamped excerpt so it never exceeds Google's truncation length.
  const description = clampMeta(post.metaDescription || post.excerpt || `IP strategy insights from Beyond Elevation — ${post.title}`);
  const ogImage = `${SITE}/assets/og-image.jpg`;
  const heroImage = post.heroImage
    ? (post.heroImage.startsWith('http') ? post.heroImage : `${SITE}/assets/${path.basename(post.heroImage)}`)
    : `${SITE}/assets/og-image.jpg`;
  const datePublished = post.date;
  const dateModified = post.dateModified || post.date;
  // Author byline — a real named human for Google E-E-A-T. Data is normalised
  // to "Hayat Amin" in posts.json; any legacy team label is rewritten here too.
  let author = post.author || 'Hayat Amin';
  if (/beyond elevation( team| editorial)?/i.test(author)) author = 'Hayat Amin';
  const category = post.category || 'IP Strategy';
  // Per-post noindex flag (added 2026-05-06 for HCU triage). When true, the
  // page renders with `noindex,follow` and is excluded from sitemap.xml.
  const isNoIndex = post.noIndex === true || post.status === 'archived';
  const robotsContent = isNoIndex
    ? 'noindex, follow'
    : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
  const aiBotContent = isNoIndex ? 'noindex, follow' : 'index, follow';

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

  // FAQPage JSON-LD — generated from the post's visible FAQ Q&As so the page
  // is eligible for Google FAQ rich results and is cleanly citable by AI
  // engines. Only emitted when the post actually has an FAQ section.
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
    ? `\n    <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="${robotsContent}" />
    <meta name="GPTBot" content="${aiBotContent}" />
    <meta name="ChatGPT-User" content="${aiBotContent}" />
    <meta name="ClaudeBot" content="${aiBotContent}" />
    <meta name="Claude-Web" content="${aiBotContent}" />
    <meta name="anthropic-ai" content="${aiBotContent}" />
    <meta name="PerplexityBot" content="${aiBotContent}" />
    <meta name="Google-Extended" content="${aiBotContent}" />
    <meta name="Applebot-Extended" content="${aiBotContent}" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <!-- Open Graph -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(seoTitle)}" />
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
    <meta name="twitter:title" content="${escapeHtml(seoTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="twitter:site" content="@BeyondElevation" />
    <meta name="twitter:creator" content="@HayatAmin" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" /></noscript>
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
      .post-body a { color: #2A1E3F; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
      .author-block { display:flex; align-items:center; gap: 12px; margin: 18px 0 24px; padding: 0; border: 0; background: transparent; box-shadow:none; }
      .author-photo { width: 34px; height: 34px; border-radius: 999px; object-fit: cover; }
      .author-copy strong { display:block; font-size:1rem; color:#2A1E3F; }
      .author-copy span { color:#666; font-size: 0.93rem; }
      .post-hero { width: 100%; border-radius: 16px; margin: 24px 0 28px; object-fit: cover; }
      .post-cta { margin: 48px 0 8px; padding: 28px 28px 24px; border-radius: 16px; background: #FAF7F2; border: 1px solid #ECE6DA; box-shadow: 0 1px 0 rgba(17,17,17,0.02); font-family: 'Inter', system-ui, -apple-system, Helvetica, Arial, sans-serif; }
      .post-cta h3 { margin: 0 0 12px; font-size: 1.32rem; line-height: 1.25; letter-spacing: -0.018em; color: #111; font-weight: 700; max-width: 28ch; }
      .post-cta p { margin: 0 0 18px; color: #2a2a2a; line-height: 1.65; font-size: 1rem; }
      .post-cta .cta-primary { display: inline-flex; align-items: center; gap: 8px; padding: 14px 24px; font-size: 0.95rem; font-weight: 700; letter-spacing: -0.005em; border-radius: 100px; background: #2A1E3F; color: #fff; text-decoration: none; border: 2px solid #2A1E3F; transition: transform 0.2s ease, background 0.2s ease; }
      .post-cta .cta-primary:hover { background: #000; transform: translateY(-1px); }
      .post-cta .cta-fineprint { margin: 14px 0 0; font-size: 0.84rem; color: #777; line-height: 1.5; }
      @media (max-width: 760px) { .post-cta { padding: 22px 20px 20px; border-radius: 14px; } .post-cta h3 { font-size: 1.18rem; } }
      .related-posts { margin: 64px 0 0; padding: 48px 0 0; border-top: 1px solid #e8e8e8; }
      .related-eyebrow { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #999; }
      .related-head h2 { margin: 8px 0 28px; font-size: 1.6rem; line-height: 1.18; letter-spacing: -0.02em; color: #2A1E3F; }
      .related-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .related-card { display: flex; flex-direction: column; gap: 12px; padding: 22px 22px 20px; border-radius: 14px; border: 1px solid #e8e8e8; background: #fff; color: inherit; text-decoration: none; transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease; }
      .related-card:hover { border-color: #2A1E3F; transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,0,0,0.06); }
      .related-tag { display: inline-block; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #666; }
      .related-card h3 { font-size: 1.05rem; line-height: 1.32; letter-spacing: -0.012em; color: #2A1E3F; margin: 0; }
      .related-cta { font-size: 0.82rem; font-weight: 600; color: #2A1E3F; margin-top: auto; }
      @media (max-width: 760px) { .related-grid { grid-template-columns: 1fr; } }
      .share-bar { margin: 56px 0 0; padding: 40px 0 0; border-top: 1px solid #e8e8e8; }
      .share-bar-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 16px; }
      .share-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
      .share-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; font-size: 0.82rem; font-weight: 600; border-radius: 100px; border: 1.5px solid #e0e0e0; background: #fff; color: #333; text-decoration: none; transition: all 0.25s ease; }
      .share-btn:hover { border-color: #333; background: #2A1E3F; color: #fff; transform: translateY(-1px); }
      .share-btn svg { width: 16px; height: 16px; fill: currentColor; flex-shrink: 0; }
      @media (max-width: 760px) {
        .post-page { padding: 102px 0 72px; }
        .post-shell { max-width: 100%; }
        .post-shell h1 { max-width: none; }
      }
    </style>

    <!-- Article schema (JSON-LD) -->
    <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>${faqScript}

    <!-- Analytics: Vercel + Speed Insights -->
    <script defer src="/_vercel/insights/script.js"></script>
    <script defer src="/_vercel/speed-insights/script.js"></script>
    <!-- /Analytics -->

    <!-- PostHog -->
    <script>
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify alias people set set_once register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures startSessionRecording stopSessionRecording captureException loadToolbar".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init('phc_CDKFjeVGfuEEid74UGx5CNwNFaqaijF8b6e9A6QhLruM',{api_host:'https://us.i.posthog.com',capture_pageview:true,capture_pageleave:true,autocapture:true,person_profiles:'always',loaded:function(){try{if(location.search.indexOf('utm_source=sender-domain')>-1){history.replaceState(null,'',location.pathname+location.hash)}}catch(e){}}});
    </script>
    <!-- /PostHog -->
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
          <img class="author-photo" src="/assets/be-author-headshot.jpg" alt="${escapeHtml(author)}" loading="eager" />
          <div class="author-copy">
            <strong>${escapeHtml(author)}</strong>
            <span>CEO of Beyond Elevation · IP strategy &amp; licensing</span>
          </div>
        </div>
        <img class="post-hero" src="${heroImage}" alt="${escapeHtml(post.title)}" loading="eager" />
        <div class="post-meta">
          <span>${escapeHtml(author)}</span>
          <span>${escapeHtml(datePublished)}</span>
          ${post.readingTime ? `<span>${escapeHtml(post.readingTime)}</span>` : ''}
        </div>
        <div class="post-body">
${injectCTA(post.body, post.slug)}
        </div>
${renderRelatedSection(related)}
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

function blogIndexTemplate(posts) {
  const sorted = posts.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const canonical = `${SITE}/blog/`;
  const cards = sorted.map(post => {
    const href = `/blog/posts/${post.slug}/`;
    const cat = escapeHtml(post.category || 'IP Strategy');
    const title = escapeHtml(post.title);
    const excerpt = escapeHtml(post.excerpt || '');
    const author = escapeHtml(post.author || 'Hayat Amin');
    const date = escapeHtml(post.date || '');
    const reading = escapeHtml(post.readingTime || '');
    return `          <article class="blog-list-card">
            <span class="eyebrow">${cat}</span>
            <h2><a href="${href}">${title}</a></h2>
            <p>${excerpt}</p>
            <div class="blog-meta-row">
              <span class="blog-author">
                <img src="/assets/be-linkedin-still-v2.jpg" alt="Beyond Elevation" loading="lazy" />
                <span>${author}</span>
              </span>
              <span>${date}</span>
              ${reading ? `<span>${reading}</span>` : ''}
              <a href="${href}">Read article</a>
            </div>
          </article>`;
  }).join('\n');

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: sorted.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/blog/posts/${p.slug}/`,
      name: p.title,
    })),
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IP Strategy Insights for Founders &amp; CEOs | Beyond Elevation</title>
    <meta name="description" content="Practical IP strategy insights for founders: turn hidden assets into revenue, valuation growth &amp; competitive moats. Read the latest from Beyond Elevation." />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="GPTBot" content="index, follow" />
    <meta name="ClaudeBot" content="index, follow" />
    <meta name="PerplexityBot" content="index, follow" />
    <meta name="Google-Extended" content="index, follow" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="IP Strategy Insights for Founders &amp; CEOs | Beyond Elevation" />
    <meta property="og:description" content="Practical IP strategy insights for founders: turn hidden assets into revenue, valuation growth &amp; competitive moats." />
    <meta property="og:image" content="${SITE}/assets/og-image.jpg" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonical}" />
    <meta name="twitter:title" content="IP Strategy Insights for Founders &amp; CEOs" />
    <meta name="twitter:description" content="Practical IP strategy insights for founders: turn hidden assets into revenue, valuation growth &amp; competitive moats." />
    <meta name="twitter:image" content="${SITE}/assets/og-image.jpg" />
    <meta name="twitter:site" content="@BeyondElevation" />
    <meta name="twitter:creator" content="@HayatAmin" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" media="print" onload="this.media='all'" />
    <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" /></noscript>
    <link rel="stylesheet" href="/styles.css?v=20260411a" />
    <style>
      .blog-page { padding: 126px 0 88px; max-width: 760px; margin: 0 auto; }
      .section-head { margin-bottom: 56px; padding: 0 24px; }
      .section-head .eyebrow { margin-bottom: 16px; text-transform: uppercase; letter-spacing: .08em; font-size: 0.74rem; }
      .section-head h1 { margin: 0 0 16px; max-width: 16ch; line-height: 1.05; font-size: clamp(2.2rem, 4.9vw, 3.3rem); }
      .section-head p { max-width: 55ch; line-height: 1.65; color:#2A1E3F; margin: 0; }
      .blog-list { display:flex; flex-direction:column; border-top: 1px solid rgba(16, 16, 16, 0.12); }
      .blog-list-card { padding: 32px 24px; border-bottom: 1px solid rgba(16, 16, 16, 0.12); background: transparent; border-radius: 0; box-shadow: none; }
      .blog-list-card .eyebrow { margin-bottom: 12px; }
      .blog-list-card h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); line-height: 1.15; letter-spacing: -0.028em; margin: 0 0 12px; font-weight: 500; max-width: 18ch; }
      .blog-list-card h2 a { color: inherit; text-decoration: none; }
      .blog-list-card h2 a:hover { text-decoration: underline; }
      .blog-list-card p { color:#262626; line-height: 1.8; margin: 0 0 22px; font-size: 1rem; max-width: 68ch; }
      .blog-meta-row { display:flex; gap: 16px; flex-wrap:wrap; color:#666; font-size: 0.9rem; align-items:center; }
      .blog-meta-row a { margin-left: auto; font-weight: 600; color: #111; text-decoration: none; border-bottom: 1px solid rgba(17,17,17,0.35); padding-bottom: 1px; }
      .blog-author { display:flex; align-items:center; gap: 10px; }
      .blog-author img { width: 32px; height: 32px; border-radius: 999px; object-fit:cover; }
      @media (max-width: 760px) {
        .blog-page { padding-top: 112px; }
        .section-head { padding: 0 18px; }
        .section-head h1 { line-height: 1.08; }
        .blog-list-card { padding: 28px 18px; }
        .blog-list-card p { line-height: 1.7; }
        .blog-list-card h2 { max-width: none; }
      }
    </style>

    <script type="application/ld+json">${JSON.stringify(itemList)}</script>

    <!-- Analytics: Vercel + Speed Insights -->
    <script defer src="/_vercel/insights/script.js"></script>
    <script defer src="/_vercel/speed-insights/script.js"></script>
    <!-- /Analytics -->

    <!-- PostHog -->
    <script>
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify alias people set set_once register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures startSessionRecording stopSessionRecording captureException loadToolbar".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init('phc_CDKFjeVGfuEEid74UGx5CNwNFaqaijF8b6e9A6QhLruM',{api_host:'https://us.i.posthog.com',capture_pageview:true,capture_pageleave:true,autocapture:true,person_profiles:'always',loaded:function(){try{if(location.search.indexOf('utm_source=sender-domain')>-1){history.replaceState(null,'',location.pathname+location.hash)}}catch(e){}}});
    </script>
    <!-- /PostHog -->
  </head>
  <body>
    <header class="topbar shell is-scrolled">
      <a class="brand" href="/">
        <span class="brand-dot"></span>
        <span>Beyond Elevation</span>
      </a>
      <nav>
        <a href="/#offer">Leverage</a>
        <a href="/#system">Model</a>
        <a href="/services/">Pricing</a>
        <a href="/case-studies/">Case Studies</a>
        <a href="/blog/">Insights</a>
        <a href="/#contact">Contact</a>
      </nav>
      <a class="button button-ghost small" href="https://usemotion.com/meet/hayat-amin/be" target="_blank" rel="noreferrer">Book a Strategy Session</a>
    </header>

    <main class="blog-page">
      <div class="section-head">
        <span class="eyebrow">Insights</span>
        <h1>Ideas on IP, valuation, and strategic leverage.</h1>
        <p>Practical thinking on IP, valuation, defensibility, and strategic leverage for founders and CEOs.</p>
      </div>
      <section id="blog-list" class="blog-list">
${cards}
      </section>
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
    const related = pickRelated(post, approved, 4);
    fs.writeFileSync(file, pageTemplate(post, related));
    written++;
  });

  // Regenerate the blog listing page as STATIC HTML with real <a href> links.
  // This fixes the root cause of blog posts failing to show up in Google:
  // previously /blog/index.html was a JS-only shell with zero crawlable links.
  const blogIndexPath = path.join(ROOT, 'blog', 'index.html');
  fs.writeFileSync(blogIndexPath, blogIndexTemplate(approved));

  console.log(`Generated ${written} static post page(s) into ${OUT_DIR}`);
  console.log(`Rebuilt static blog listing at ${blogIndexPath}`);
}

if (require.main === module) main();

module.exports = { pageTemplate, blogIndexTemplate };
