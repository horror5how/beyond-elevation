#!/usr/bin/env node
/**
 * generate-blog-markdown.js
 *
 * Reads data/posts.json and generates:
 * 1. Individual markdown files in blog/md/{slug}.md
 * 2. Updates llms.txt with blog listing
 * 3. Updates llms-full.txt with full blog content
 * 4. Updates sitemap.xml with markdown file entries
 *
 * Run: node scripts/generate-blog-markdown.js
 * Designed to be called by scheduled tasks after new blog posts are added.
 */

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const POSTS_FILE = path.join(BASE, 'data', 'posts.json');
const MD_DIR = path.join(BASE, 'blog', 'md');
const LLMS_FILE = path.join(BASE, 'llms.txt');
const LLMS_FULL_FILE = path.join(BASE, 'llms-full.txt');
const SITEMAP_FILE = path.join(BASE, 'sitemap.xml');

// End-of-post conversion CTA in markdown form. Inserted between body and FAQ
// (when present), otherwise appended. Mirrors the HTML CTA in
// scripts/build-static-posts.js so /blog/md/<slug>.md and llms-full.txt also
// surface the conversion path. ?ref=blog-<slug> attributes Motion bookings.
function renderPostCTAMarkdown(slug) {
  const ref = encodeURIComponent(slug || '');
  return `

---

### You just read the framework. Now price your own IP.

Beyond Elevation runs a 60-minute IP & licensing diagnostic for founders raising Seed–Series B. You leave with: (1) a defensibility score, (2) the royalty range your current portfolio supports, (3) the next 3 filings ranked by exit-multiple impact. No deck. No proposal. One call, one number.

[Book the diagnostic →](https://usemotion.com/meet/hayat-amin/be?ref=blog-${ref})

*14 founders booked this month. Hayat takes 4/week.*

---
`;
}

function injectCTAMarkdown(bodyMd, slug) {
  if (!bodyMd) return bodyMd;
  if (/Book the diagnostic/.test(bodyMd)) return bodyMd;
  const cta = renderPostCTAMarkdown(slug);
  const faqRegex = /(^|\n)##\s+(?:FAQ|Frequently\s+Asked)\b[^\n]*/i;
  const m = bodyMd.match(faqRegex);
  if (m && typeof m.index === 'number') {
    const splitAt = m.index + (m[1] ? m[1].length : 0);
    return bodyMd.slice(0, splitAt) + cta + '\n' + bodyMd.slice(splitAt);
  }
  return bodyMd + cta;
}

function htmlToMarkdown(html) {
  if (!html) return '';
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n');
  md = md.replace(/<\/p>/gi, '\n\n');
  md = md.replace(/<p[^>]*>/gi, '');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&mdash;/g, '\u2014');
  md = md.replace(/&ndash;/g, '\u2013');
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

function main() {
  console.log('[generate-blog-markdown] Starting...');

  // Load posts
  const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
  const approvedPosts = posts.filter(p => p.alexReview && p.alexReview.approved);
  console.log(`[generate-blog-markdown] Found ${approvedPosts.length} approved posts`);

  // Ensure md directory exists
  fs.mkdirSync(MD_DIR, { recursive: true });

  // Generate individual markdown files
  let blogListing = '';
  let blogFullContent = '';

  for (const post of approvedPosts) {
    const bodyMd = injectCTAMarkdown(htmlToMarkdown(post.body || ''), post.slug);
    const date = post.publishDate || post.date || '';

    const mdContent = `---
title: "${post.title.replace(/"/g, '\\"')}"
slug: ${post.slug}
date: ${date}
url: https://beyondelevation.com/blog/post.html?slug=${post.slug}
author: Hayat Amin
site: Beyond Elevation
---

# ${post.title}

${bodyMd}

---
*Published on [Beyond Elevation](https://beyondelevation.com) \u2014 IP Strategy & Licensing Revenue Consultancy*
`;

    fs.writeFileSync(path.join(MD_DIR, `${post.slug}.md`), mdContent);

    blogListing += `- [${post.title}](https://beyondelevation.com/blog/post.html?slug=${post.slug}) \u2014 /blog/md/${post.slug}.md\n`;
    blogFullContent += `\n## ${post.title}\n\nURL: https://beyondelevation.com/blog/post.html?slug=${post.slug}\n\n${bodyMd.substring(0, 1500)}\n\n---\n`;
  }

  // Update llms.txt - replace blog section or append
  let llms = fs.readFileSync(LLMS_FILE, 'utf8');
  const blogSectionMarker = '## Blog Articles';
  const blogSectionIdx = llms.indexOf(blogSectionMarker);

  const newBlogSection = `## Blog Articles\n\nBeyond Elevation publishes expert articles on IP strategy and licensing revenue. Individual markdown files available at /blog/md/{slug}.md\n\n${blogListing}\n> Full blog content available at /llms-full.txt\n`;

  if (blogSectionIdx !== -1) {
    llms = llms.substring(0, blogSectionIdx) + newBlogSection;
  } else {
    llms = llms.trimEnd() + '\n\n' + newBlogSection;
  }
  fs.writeFileSync(LLMS_FILE, llms);

  // Update llms-full.txt - replace blog section or append
  let llmsFull = fs.readFileSync(LLMS_FULL_FILE, 'utf8');
  const blogFullMarker = '# Blog Articles';
  const blogFullIdx = llmsFull.indexOf(blogFullMarker);

  const newBlogFullSection = `# Blog Articles\n\nBeyond Elevation publishes in-depth articles on IP strategy, patent licensing, AI company valuation, and data monetization. All articles are available as individual markdown files at /blog/md/{slug}.md\n${blogFullContent}`;

  if (blogFullIdx !== -1) {
    llmsFull = llmsFull.substring(0, blogFullIdx) + newBlogFullSection;
  } else {
    llmsFull = llmsFull.trimEnd() + '\n\n' + newBlogFullSection;
  }
  fs.writeFileSync(LLMS_FULL_FILE, llmsFull);

  // Update sitemap.xml
  let sitemap = fs.readFileSync(SITEMAP_FILE, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  // Remove existing md entries and llms entries
  sitemap = sitemap.replace(/<url>\s*<loc>https:\/\/beyondelevation\.com\/blog\/md\/[^<]+<\/loc>[\s\S]*?<\/url>\s*/g, '');
  sitemap = sitemap.replace(/<url>\s*<loc>https:\/\/beyondelevation\.com\/llms[^<]*<\/loc>[\s\S]*?<\/url>\s*/g, '');

  let newSitemapEntries = `  <url>
    <loc>https://beyondelevation.com/llms.txt</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://beyondelevation.com/llms-full.txt</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>\n`;

  for (const post of approvedPosts) {
    newSitemapEntries += `  <url>
    <loc>https://beyondelevation.com/blog/md/${post.slug}.md</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
  }

  sitemap = sitemap.replace('</urlset>', newSitemapEntries + '</urlset>');
  fs.writeFileSync(SITEMAP_FILE, sitemap);

  console.log(`[generate-blog-markdown] Done!`);
  console.log(`  - ${approvedPosts.length} markdown files in blog/md/`);
  console.log(`  - llms.txt updated (${(llms.length/1024).toFixed(1)}KB)`);
  console.log(`  - llms-full.txt updated (${(llmsFull.length/1024).toFixed(1)}KB)`);
  console.log(`  - sitemap.xml updated`);
}

main();
