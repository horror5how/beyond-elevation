#!/usr/bin/env node
/**
 * be-approve.mjs
 *
 * Hayat's interactive approval CLI for draft blog posts.
 *
 * Flow:
 *   1. Lists every post in data/posts.json with status==='draft' or human_reviewed!==true.
 *   2. For each draft, prints title, excerpt, word count, slug, author.
 *   3. Asks: approve / reject / skip / quit.
 *   4. On approve: flips status='published', human_reviewed=true, alexReview.approved=true,
 *      stamps human_reviewed_at + human_reviewed_by. Commits + pushes to main.
 *      The deploy workflow takes it live and pings IndexNow.
 *   5. On reject: flips status='rejected', persists the reason. Stays in posts.json
 *      for audit but never publishes.
 *
 * Hard 2-per-7-day cap: refuses to approve a 3rd post inside any rolling 7d window
 * (matches the gate in .github/workflows/publish.yml).
 *
 * Usage:
 *   node scripts/be-approve.mjs                # interactive
 *   node scripts/be-approve.mjs --list         # list pending, no prompt
 *   node scripts/be-approve.mjs --slug <slug>  # approve one slug non-interactively
 *   node scripts/be-approve.mjs --slug <slug> --reject "reason"
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_JSON = path.join(ROOT, 'data', 'posts.json');

const REVIEWER = process.env.BE_REVIEWER || 'hayat@beyondelevation.com';
const WEEK_CAP = 2;

function load() { return JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8')); }
function save(posts) { fs.writeFileSync(POSTS_JSON, JSON.stringify(posts, null, 2)); }

function recent7d(posts) {
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  return posts.filter(p =>
    p.status === 'published' &&
    !p.noIndex &&
    new Date(p.date || p.human_reviewed_at || 0).getTime() >= cutoff
  );
}

function wordCount(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function pending(posts) {
  return posts.filter(p => p.status === 'draft' || p.human_reviewed !== true);
}

function approve(post, posts) {
  const recent = recent7d(posts.filter(p => p.slug !== post.slug));
  if (recent.length >= WEEK_CAP) {
    console.error(`❌ Cannot approve "${post.slug}". 7-day cap (${WEEK_CAP}) already used by:`);
    recent.forEach(p => console.error(`   - ${p.slug} (${p.date})`));
    console.error('Wait until the oldest of those rolls past 7d, or reject one first.');
    return false;
  }
  const now = new Date().toISOString();
  post.status = 'published';
  post.human_reviewed = true;
  post.human_reviewed_at = now;
  post.human_reviewed_by = REVIEWER;
  post.alexReview = { ...(post.alexReview || {}), approved: true, approved_at: now };
  if (!post.date || post.date < now.slice(0, 10)) post.date = now.slice(0, 10);
  console.log(`✅ Approved: ${post.slug}`);
  return true;
}

function reject(post, reason) {
  post.status = 'rejected';
  post.human_reviewed = false;
  post.rejected_at = new Date().toISOString();
  post.rejected_by = REVIEWER;
  post.rejected_reason = reason || 'no reason given';
  console.log(`🗑️  Rejected: ${post.slug} — ${post.rejected_reason}`);
}

function commitPush(msg) {
  try {
    execSync('git add data/posts.json', { cwd: ROOT, stdio: 'inherit' });
    execSync(`git commit -m ${JSON.stringify(msg)}`, { cwd: ROOT, stdio: 'inherit' });
    execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });
    console.log('   pushed to main → deploy workflow will pick it up.');
  } catch (e) {
    console.error('   ⚠ git commit/push failed:', e.message);
  }
}

function promptOne(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => { rl.close(); resolve(ans.trim()); });
  });
}

function previewBody(html) {
  const text = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 480) + (text.length > 480 ? '…' : '');
}

async function interactive() {
  const posts = load();
  const todo = pending(posts);
  if (!todo.length) {
    console.log('Nothing pending. All posts are reviewed.');
    return;
  }
  console.log(`\n${todo.length} draft post(s) awaiting your review.\n`);
  const approved = [];
  const rejected = [];

  for (const post of todo) {
    console.log('─'.repeat(72));
    console.log(`📄  ${post.title}`);
    console.log(`    slug:     ${post.slug}`);
    console.log(`    author:   ${post.author}`);
    console.log(`    category: ${post.category}`);
    console.log(`    date:     ${post.date}`);
    console.log(`    words:    ${wordCount(post.body)}`);
    console.log(`    excerpt:  ${post.excerpt}`);
    console.log(`\n    preview:  ${previewBody(post.body)}\n`);

    const recent = recent7d(posts);
    console.log(`    rolling 7d used: ${recent.length}/${WEEK_CAP}`);

    const ans = (await promptOne('    [a]pprove / [r]eject / [s]kip / [q]uit ? ')).toLowerCase();
    if (ans === 'q') break;
    if (ans === 's' || ans === '') continue;
    if (ans === 'r') {
      const reason = await promptOne('    rejection reason: ');
      reject(post, reason);
      rejected.push(post.slug);
    } else if (ans === 'a') {
      if (approve(post, posts)) approved.push(post.slug);
    } else {
      console.log('    (unrecognised input — skipped)');
    }
  }

  save(posts);
  if (approved.length || rejected.length) {
    const msg = `content: human review — approved=${approved.length} rejected=${rejected.length}`;
    commitPush(msg);
  }
  console.log(`\nApproved: ${approved.length}. Rejected: ${rejected.length}.`);
}

async function nonInteractive() {
  const args = process.argv.slice(2);
  const flags = Object.fromEntries(args.reduce((acc, v, i, a) => {
    if (v.startsWith('--')) acc.push([v.slice(2), a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : true]);
    return acc;
  }, []));

  const posts = load();

  if (flags.list) {
    const todo = pending(posts);
    console.log(JSON.stringify(todo.map(p => ({
      slug: p.slug, title: p.title, date: p.date, words: wordCount(p.body), status: p.status
    })), null, 2));
    return;
  }

  if (flags.slug) {
    const post = posts.find(p => p.slug === flags.slug);
    if (!post) { console.error(`No post with slug "${flags.slug}".`); process.exit(2); }
    if (flags.reject) {
      reject(post, typeof flags.reject === 'string' ? flags.reject : 'unspecified');
    } else {
      if (!approve(post, posts)) process.exit(3);
    }
    save(posts);
    commitPush(`content: ${flags.reject ? 'reject' : 'approve'} ${flags.slug}`);
    return;
  }

  await interactive();
}

nonInteractive().catch(e => { console.error(e); process.exit(1); });
