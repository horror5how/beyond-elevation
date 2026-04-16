#!/usr/bin/env node
/**
 * Daily AI Digest — sends a morning email to hayat@beyondelevation.com
 *
 * Data sources:
 *   News  → NewsAPI.org (NEWS_API_KEY, optional) + Hacker News Algolia API +
 *            Reddit (r/artificial, r/LocalLLaMA, r/MachineLearning)
 *   Repos → GitHub Search API (no auth required for 1 req/day)
 *   Email → Resend (RESEND_API_KEY required)
 *
 * Required secret: RESEND_API_KEY
 * Optional secret: NEWS_API_KEY  (newsapi.org free tier)
 */

'use strict';

const https = require('https');

const RESEND_API_KEY  = process.env.RESEND_API_KEY;
const NEWS_API_KEY    = process.env.NEWS_API_KEY;
const RECIPIENT_EMAIL = 'hayat@beyondelevation.com';
const SENDER_EMAIL    = 'digest@beyondelevation.com';

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { reject(new Error(`JSON parse failed for ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      let buf = '';
      res.on('data', chunk => { buf += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf)); }
          catch { resolve(buf); }
        } else {
          reject(new Error(`HTTP ${res.statusCode} from ${url}: ${buf}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    req.write(payload);
    req.end();
  });
}

// ─── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchHackerNewsAI() {
  const since = Math.floor((Date.now() - 86_400_000) / 1000);
  const url = `https://hn.algolia.com/api/v1/search`
    + `?query=anthropic+claude+AI+LLM+openai+gemini`
    + `&tags=story`
    + `&hitsPerPage=20`
    + `&numericFilters=created_at_i>${since}`;

  const { data } = await get(url, { 'User-Agent': 'beyond-elevation-digest/1.0' });
  return (data.hits || [])
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 10)
    .map(h => ({
      title:       h.title,
      url:         h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      source:      'Hacker News',
      meta:        `${h.points || 0} pts · ${h.num_comments || 0} comments`,
      description: '',
      time:        new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    }));
}

async function fetchRedditAI() {
  const subreddits = ['LocalLLaMA', 'artificial', 'MachineLearning'];
  const ua = { 'User-Agent': 'beyond-elevation-digest/1.0 (automated newsletter)' };
  const posts = [];

  for (const sub of subreddits) {
    try {
      const url = `https://www.reddit.com/r/${sub}/top.json?t=day&limit=5`;
      const { data } = await get(url, ua);
      const children = data?.data?.children || [];
      for (const { data: p } of children) {
        posts.push({
          title:       p.title,
          url:         p.url?.startsWith('http') ? p.url : `https://reddit.com${p.permalink}`,
          source:      `r/${sub}`,
          meta:        `${(p.score || 0).toLocaleString()} upvotes · ${p.num_comments || 0} comments`,
          description: (p.selftext || '').slice(0, 140),
          time:        new Date(p.created_utc * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        });
      }
    } catch (e) {
      console.warn(`  Reddit r/${sub} failed: ${e.message}`);
    }
  }

  // Sort by score, deduplicate by title
  const seen = new Set();
  return posts
    .sort((a, b) => {
      const scoreA = parseInt((a.meta.match(/^([\d,]+)/) || ['0'])[0].replace(',', ''), 10);
      const scoreB = parseInt((b.meta.match(/^([\d,]+)/) || ['0'])[0].replace(',', ''), 10);
      return scoreB - scoreA;
    })
    .filter(p => {
      const key = p.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

async function fetchNewsAPI() {
  if (!NEWS_API_KEY) return [];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  const q = encodeURIComponent('"anthropic" OR "claude AI" OR "ChatGPT" OR "large language model" OR "OpenAI" OR "Gemini" OR "AI agent"');
  const url = `https://newsapi.org/v2/everything?q=${q}&sortBy=publishedAt&from=${yesterday}&pageSize=15&language=en&apiKey=${NEWS_API_KEY}`;
  const { data } = await get(url, { 'User-Agent': 'beyond-elevation-digest/1.0' });

  if (data.status !== 'ok') {
    console.warn(`  NewsAPI returned status: ${data.status} — ${data.message || ''}`);
    return [];
  }

  return (data.articles || []).slice(0, 10).map(a => ({
    title:       a.title,
    url:         a.url,
    source:      a.source?.name || 'News',
    meta:        a.source?.name || '',
    description: (a.description || '').slice(0, 140),
    time:        new Date(a.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }));
}

async function fetchTopGitHubRepos() {
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  const url = `https://api.github.com/search/repositories?q=created:%3E${yesterday}&sort=stars&order=desc&per_page=10`;
  const headers = {
    'User-Agent': 'beyond-elevation-digest/1.0',
    'Accept':     'application/vnd.github.v3+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const { data } = await get(url, headers);
  return (data.items || []).slice(0, 5).map(r => ({
    name:        r.full_name,
    url:         r.html_url,
    description: (r.description || '').slice(0, 160),
    stars:       r.stargazers_count,
    forks:       r.forks_count,
    language:    r.language || 'Unknown',
    topics:      (r.topics || []).slice(0, 4).join(', '),
  }));
}

// ─── Email builder ─────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function newsRow(item, index) {
  return `
    <tr>
      <td style="padding:18px 0;border-bottom:1px solid #f0f0f0;">
        <div style="font-size:11px;color:#999;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:5px;">
          ${index + 1}. ${esc(item.source)}${item.meta ? ` &nbsp;·&nbsp; ${esc(item.meta)}` : ''}${item.time ? ` &nbsp;·&nbsp; ${esc(item.time)}` : ''}
        </div>
        <a href="${esc(item.url)}" style="font-size:16px;font-weight:700;color:#111;text-decoration:none;line-height:1.4;display:block;">${esc(item.title)}</a>
        ${item.description ? `<div style="font-size:13px;color:#666;margin-top:5px;line-height:1.55;">${esc(item.description)}${item.description.length >= 140 ? '&hellip;' : ''}</div>` : ''}
      </td>
    </tr>`;
}

function repoRow(repo, index) {
  const stars = (repo.stars || 0).toLocaleString();
  const forks = (repo.forks || 0).toLocaleString();
  return `
    <tr>
      <td style="padding:18px 0;border-bottom:1px solid #f0f0f0;">
        <div style="font-size:11px;color:#999;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:5px;">
          ${index + 1}. ${esc(repo.language)} &nbsp;·&nbsp; &#11088; ${stars} stars &nbsp;·&nbsp; &#127860; ${forks} forks${repo.topics ? ` &nbsp;·&nbsp; ${esc(repo.topics)}` : ''}
        </div>
        <a href="${esc(repo.url)}" style="font-size:16px;font-weight:700;color:#111;text-decoration:none;display:block;">${esc(repo.name)}</a>
        ${repo.description ? `<div style="font-size:13px;color:#666;margin-top:5px;line-height:1.55;">${esc(repo.description)}${repo.description.length >= 160 ? '&hellip;' : ''}</div>` : ''}
      </td>
    </tr>`;
}

function buildEmail(news, repos, dateStr) {
  const noNewsMsg = `
    <tr><td style="padding:20px 0;color:#999;font-size:14px;">No stories found for today. Try again later or check your NEWS_API_KEY.</td></tr>`;
  const noReposMsg = `
    <tr><td style="padding:20px 0;color:#999;font-size:14px;">No new repositories found in the last 24 hours.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AI Morning Digest · ${esc(dateStr)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- ── Header ── -->
          <tr>
            <td style="background:#0a0a0a;border-radius:12px 12px 0 0;padding:36px 44px 28px;">
              <div style="font-size:11px;color:#666;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Beyond Elevation &nbsp;·&nbsp; Daily AI Digest</div>
              <div style="font-size:30px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.5px;">Your Morning Briefing</div>
              <div style="font-size:14px;color:#888;margin-top:10px;">${esc(dateStr)}</div>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="background:#ffffff;padding:36px 44px;">

              <!-- Section 1: AI & Claude News -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="background:#f7f7f8;border-left:4px solid #0a0a0a;padding:10px 16px;border-radius:0 6px 6px 0;">
                    <span style="font-size:12px;font-weight:800;color:#0a0a0a;letter-spacing:1.2px;text-transform:uppercase;">Top 5 &mdash; Anthropic Claude &amp; AI News</span>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${news.length ? news.map((n, i) => newsRow(n, i)).join('') : noNewsMsg}
              </table>

              <div style="height:36px;"></div>

              <!-- Section 2: GitHub Repos -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="background:#f7f7f8;border-left:4px solid #6f42c1;padding:10px 16px;border-radius:0 6px 6px 0;">
                    <span style="font-size:12px;font-weight:800;color:#6f42c1;letter-spacing:1.2px;text-transform:uppercase;">Top 5 &mdash; GitHub Repositories (Last 24 Hours)</span>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${repos.length ? repos.map((r, i) => repoRow(r, i)).join('') : noReposMsg}
              </table>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background:#f7f7f8;border-radius:0 0 12px 12px;padding:20px 44px;border-top:1px solid #ebebeb;">
              <div style="font-size:12px;color:#bbb;text-align:center;line-height:1.6;">
                Delivered daily at 8 AM BST / 7 AM UTC &nbsp;·&nbsp;
                <a href="https://beyondelevation.com" style="color:#bbb;text-decoration:underline;">beyondelevation.com</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Merge & de-duplicate news ─────────────────────────────────────────────────

function mergeNews(newsApiItems, hnItems, redditItems) {
  // Prefer mainstream news first, then HN, then Reddit; keep top 5 unique titles
  const all = [...newsApiItems, ...hnItems, ...redditItems];
  const seen = new Set();
  const result = [];
  for (const item of all) {
    const key = item.title.toLowerCase().slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
    if (result.length >= 5) break;
  }
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set. Add it as a GitHub secret.');
  }

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  console.log(`\nBeyond Elevation — Daily AI Digest — ${dateStr}`);

  // ── Fetch news (parallel) ──
  console.log('\n[1/2] Fetching AI & Claude news...');

  const [newsApiItems, hnItems, redditItems] = await Promise.allSettled([
    fetchNewsAPI(),
    fetchHackerNewsAI(),
    fetchRedditAI(),
  ]).then(results => results.map((r, i) => {
    const labels = ['NewsAPI', 'Hacker News', 'Reddit'];
    if (r.status === 'fulfilled') {
      console.log(`  ${labels[i]}: ${r.value.length} stories`);
      return r.value;
    } else {
      console.warn(`  ${labels[i]} failed: ${r.reason?.message}`);
      return [];
    }
  }));

  const news = mergeNews(newsApiItems, hnItems, redditItems);
  console.log(`  → ${news.length} stories selected for digest`);

  // ── Fetch GitHub repos ──
  console.log('\n[2/2] Fetching top GitHub repositories (last 24 h)...');
  let repos = [];
  try {
    repos = await fetchTopGitHubRepos();
    console.log(`  → ${repos.length} repositories selected`);
  } catch (e) {
    console.warn(`  GitHub API failed: ${e.message}`);
  }

  // ── Build & send email ──
  console.log('\nBuilding email...');
  const html = buildEmail(news, repos, dateStr);

  console.log(`Sending to ${RECIPIENT_EMAIL}...`);
  const result = await post(
    'https://api.resend.com/emails',
    {
      from:    `Beyond Elevation Digest <${SENDER_EMAIL}>`,
      to:      [RECIPIENT_EMAIL],
      subject: `AI Morning Digest · ${dateStr}`,
      html,
    },
    { Authorization: `Bearer ${RESEND_API_KEY}` },
  );

  console.log(`\nEmail sent successfully. Resend ID: ${result.id}`);
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
