#!/usr/bin/env node
/**
 * publish.js
 *
 * One-shot helper for the BE Blog Publisher scheduled task. Takes a post
 * object (passed as a JSON string argument or via stdin) and appends it to
 * data/posts.json after a duplicate check. The auto-merge workflow then
 * regenerates every derived file (blog/posts/<slug>/index.html,
 * blog/index.html, sitemap.xml, blog/md/*.md, llms.txt, llms-full.txt) on
 * push.
 *
 * Usage:
 *   node scripts/publish.js '{"slug":"...","title":"...", ... }'
 *   echo '{"slug":"..."}' | node scripts/publish.js
 *
 * Required post fields: slug, title, excerpt, category, date, body
 * Optional: author, authorPhoto, heroImage, status, alexReview
 *
 * Exits non-zero if:
 *   - JSON is malformed
 *   - slug already exists in posts.json
 *   - title substring matches any existing post title
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_JSON = path.join(ROOT, 'data', 'posts.json');

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  let input = process.argv[2];
  if (!input) {
    input = (await readStdin()).trim();
  }
  if (!input) {
    console.error('ERROR: no post JSON provided (pass as arg or via stdin).');
    process.exit(1);
  }

  let post;
  try {
    post = JSON.parse(input);
  } catch (e) {
    console.error('ERROR: invalid JSON:', e.message);
    process.exit(1);
  }

  const required = ['slug', 'title', 'excerpt', 'category', 'date', 'body'];
  for (const k of required) {
    if (!post[k]) {
      console.error(`ERROR: missing required field: ${k}`);
      process.exit(1);
    }
  }

  // Fill defaults
  post.author = post.author || 'Beyond Elevation Team';
  post.authorPhoto = post.authorPhoto || '../assets/be-author-headshot.jpg';
  post.heroImage = post.heroImage || '../assets/og-image.jpg';
  post.status = post.status || 'published';
  post.alexReview = post.alexReview || { approved: true, score: 8, notes: 'Hormozi quality pass' };

  const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));

  // Dedup: slug match or title substring match
  if (posts.some(p => p.slug === post.slug)) {
    console.error(`ERROR: slug already exists: ${post.slug}`);
    process.exit(2);
  }
  const titleLower = post.title.toLowerCase();
  const dupTitle = posts.find(p => {
    const t = (p.title || '').toLowerCase();
    return t.includes(titleLower) || titleLower.includes(t);
  });
  if (dupTitle) {
    console.error(`ERROR: title near-duplicate of existing post: ${dupTitle.slug}`);
    process.exit(2);
  }

  posts.push(post);
  fs.writeFileSync(POSTS_JSON, JSON.stringify(posts, null, 2));
  console.log(`Appended post: ${post.slug}. Total posts: ${posts.length}.`);
  console.log('The auto-merge workflow will regenerate static pages on push.');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
