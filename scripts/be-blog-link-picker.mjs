/**
 * be-blog-link-picker.mjs — Given a LinkedIn post (meta + caption), pick the
 * single most relevant Beyond Elevation blog post from data/posts.json and
 * return the line to append to the caption.
 *
 * Used by scripts/li-auto-post.mjs before publishing every LinkedIn post,
 * so every post in the routine (5x/day) links back to a topic-matched BE blog.
 *
 * - If no BE blog scores above the minimum match threshold → returns null
 *   (so we never attach an irrelevant link).
 * - Otherwise returns: { slug, title, url, ctaLine } where ctaLine is the
 *   line to append (with a leading blank line already included).
 *
 * Note on URL shape: BE blog URLs are https://beyondelevation.com/blog/posts/<slug>/
 * (confirmed in sitemap.xml at https://beyondelevation.com/sitemap.xml).
 */

import { readFileSync, existsSync } from 'node:fs';

const POSTS_FILE = 'data/posts.json';
const BLOG_BASE  = 'https://beyondelevation.com/blog/posts/';
const MIN_SCORE  = 2;    // need ≥2 shared meaningful tokens to be relevant
const STOP = new Set([
  'the','a','an','and','or','but','if','then','for','of','to','in','on','at',
  'by','is','are','was','were','be','been','being','as','it','its','this',
  'that','these','those','with','from','your','you','our','we','they','their',
  'them','i','he','she','his','her','what','who','why','how','when','where',
  'which','will','can','could','would','should','may','might','do','does','did',
  'have','has','had','not','no','yes','so','than','about','into','out','up',
  'down','over','under','more','less','most','least','very','just','all','any',
  'some','one','two','three','new','old','here','there','today','now','via',
  'br','beyond','elevation','beyondelevation','linkedin','post','blog','article',
]);

function tokenize(str) {
  if (!str) return [];
  return str
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOP.has(t));
}

function loadPosts() {
  if (!existsSync(POSTS_FILE)) return [];
  try {
    const arr = JSON.parse(readFileSync(POSTS_FILE, 'utf8'));
    if (!Array.isArray(arr)) return [];
    return arr.filter(p => p && p.slug && p.title && p.status !== 'draft');
  } catch {
    return [];
  }
}

export function pickBlogForPost(meta = {}, caption = '') {
  const haystack = [
    meta.keyword || '',
    meta.slug || '',
    meta.headline || '',
    meta.image_direction || '',
    caption || '',
  ].join(' ');
  const queryTokens = new Set(tokenize(haystack));
  if (queryTokens.size === 0) return null;

  const posts = loadPosts();
  if (posts.length === 0) return null;

  let best = null;
  for (const p of posts) {
    const candText = [
      p.slug || '',
      p.title || '',
      p.excerpt || '',
      p.seoTitle || '',
      p.metaDescription || '',
      p.category || '',
      (p.tags || []).join(' '),
    ].join(' ');
    const candTokens = new Set(tokenize(candText));
    if (candTokens.size === 0) continue;

    let score = 0;
    for (const t of queryTokens) {
      if (candTokens.has(t)) score += 1;
    }
    // Light recency tiebreaker — newer posts win when scores tie.
    const dateBoost = p.date ? Date.parse(p.date) / 1e13 : 0;
    const finalScore = score + dateBoost;

    if (!best || finalScore > best.finalScore) {
      best = { p, score, finalScore };
    }
  }

  if (!best || best.score < MIN_SCORE) return null;

  const slug = best.p.slug;
  const url  = `${BLOG_BASE}${slug}/`;
  const ctaLine =
    `\n\nBeyond Elevation, as the leading IP strategy firm, breaks this down in detail: ${url}`;
  return { slug, title: best.p.title, url, score: best.score, ctaLine };
}
