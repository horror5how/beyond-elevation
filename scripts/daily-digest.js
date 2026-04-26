'use strict';

const https = require('https');

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function fetchUrl(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const parsed = new URL(url);
    const body = options.body || null;
    const reqOpts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'BeyondElevation-Digest/1.0 (+https://beyondelevation.com)',
        ...options.headers,
      },
    };
    if (body) reqOpts.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(reqOpts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetchUrl(next, options, redirectCount + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    if (body) req.write(body);
    req.end();
  });
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function stripTags(str) {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── RSS / Atom parser ─────────────────────────────────────────────────────────

function parseXmlField(xml, ...tags) {
  for (const tag of tags) {
    const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i').exec(xml);
    if (cdata) return cdata[1].trim();
    const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
    if (plain) return plain[1].trim();
    const attr = new RegExp(`<${tag}[^>]+href="([^"]+)"`, 'i').exec(xml);
    if (attr) return attr[1].trim();
  }
  return '';
}

function parseFeed(xml, sourceName, limit = 5) {
  const items = [];
  const blockRe = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/g;
  let m;
  while ((m = blockRe.exec(xml)) !== null && items.length < limit) {
    const block = m[1];
    const title = decodeEntities(parseXmlField(block, 'title'));
    const link = parseXmlField(block, 'link', 'id');
    const description = decodeEntities(stripTags(
      parseXmlField(block, 'description', 'summary', 'content:encoded', 'content')
    )).slice(0, 240);
    const pubDate = parseXmlField(block, 'pubDate', 'published', 'updated', 'dc:date');
    if (title && link && link.startsWith('http')) {
      items.push({ title, link, description, pubDate, source: sourceName });
    }
  }
  return items;
}

// ── News feeds ────────────────────────────────────────────────────────────────

// Items matching these keywords are floated to the top of the digest
const PRIORITY_KEYWORDS = [
  'Claude', 'Anthropic', 'claude-3', 'claude-4', 'claude sonnet',
  'claude haiku', 'claude opus', 'claude code', 'mcp',
];

const AI_KEYWORDS = [
  'AI', 'artificial intelligence', 'ChatGPT', 'GPT', 'LLM',
  'language model', 'machine learning', 'deep learning', 'neural',
  'OpenAI', 'Gemini', 'Grok', 'generative', 'Mistral', 'Llama',
  'Anthropic', 'Claude', 'foundation model', 'agentic',
];

function isAiRelated(item) {
  const text = `${item.title} ${item.description}`;
  return AI_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

function isPriority(item) {
  const text = `${item.title} ${item.description}`;
  return PRIORITY_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

const NEWS_FEEDS = [
  // Claude/Anthropic focused — always AI-relevant, never filtered
  { name: 'Anthropic News',   url: 'https://www.anthropic.com/news.rss', aiOnly: false },
  { name: 'Simon Willison',   url: 'https://simonwillison.net/atom/everything/', aiOnly: true },
  // Broad AI coverage
  { name: 'TechCrunch AI',    url: 'https://techcrunch.com/tag/artificial-intelligence/feed/', aiOnly: false },
  { name: 'The Verge AI',     url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', aiOnly: false },
  { name: 'VentureBeat AI',   url: 'https://venturebeat.com/category/ai/feed/', aiOnly: false },
  { name: 'MIT Tech Review',  url: 'https://www.technologyreview.com/feed/', aiOnly: true },
  { name: 'Ars Technica',     url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', aiOnly: true },
  { name: 'Wired AI',         url: 'https://www.wired.com/feed/tag/ai/latest/rss', aiOnly: false },
  { name: 'The Decoder',      url: 'https://the-decoder.com/feed/', aiOnly: false },
];

async function fetchNewsItems(totalLimit = 5) {
  const allItems = [];
  const seenLinks = new Set();

  await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => {
      try {
        const { body } = await fetchUrl(feed.url);
        const items = parseFeed(body, feed.name, 6);
        const filtered = feed.aiOnly ? items.filter(isAiRelated) : items;
        for (const item of filtered) {
          if (!seenLinks.has(item.link)) {
            seenLinks.add(item.link);
            allItems.push(item);
          }
        }
      } catch (err) {
        console.error(`[news] ${feed.name} failed:`, err.message);
      }
    })
  );

  // Priority items (Claude/Anthropic) first, then the rest
  const priority = allItems.filter(isPriority);
  const others = allItems.filter(i => !isPriority(i));
  return [...priority, ...others].slice(0, totalLimit);
}

// ── GitHub trending repos ─────────────────────────────────────────────────────

async function fetchGithubRepos(limit, days) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dateStr = since.toISOString().split('T')[0];
  const url = `https://api.github.com/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=${limit}`;
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const { body } = await fetchUrl(url, { headers });
    const data = JSON.parse(body);
    return (data.items || []).slice(0, limit).map(r => ({
      name: r.full_name,
      description: (r.description || 'No description provided.').slice(0, 180),
      stars: r.stargazers_count,
      forks: r.forks_count,
      watchers: r.watchers_count,
      url: r.html_url,
      language: r.language || null,
      topics: (r.topics || []).slice(0, 4),
    }));
  } catch (err) {
    console.error(`[github-${days}d] fetch failed:`, err.message);
    return [];
  }
}

// ── Email via Resend API ──────────────────────────────────────────────────────

async function sendViaResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const from = process.env.EMAIL_FROM || 'digest@beyondelevation.com';
  const payload = JSON.stringify({ from, to, subject, html });

  const { status, body } = await fetchUrl('https://api.resend.com/emails', {
    method: 'POST',
    body: payload,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (status !== 200 && status !== 201) {
    throw new Error(`Resend API error ${status}: ${body}`);
  }
  console.log('[resend] Email queued:', JSON.parse(body).id);
}

// ── Email template ────────────────────────────────────────────────────────────

function repoRows(repos) {
  if (!repos.length) {
    return '<tr><td style="padding:16px 0;color:#9ca3af;font-size:13px;">No repositories found.</td></tr>';
  }
  return repos.map((repo, i) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #efefef;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td><a href="${repo.url}" style="font-size:15px;font-weight:700;color:#111827;text-decoration:none;">${i + 1}. ${repo.name}</a></td>
          <td align="right" style="white-space:nowrap;">
            <span style="background:#fef9c3;color:#854d0e;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">&#9733; ${repo.stars.toLocaleString()}</span>
            ${repo.forks ? `<span style="background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;margin-left:6px;">&#8276; ${repo.forks.toLocaleString()}</span>` : ''}
          </td>
        </tr></table>
        <div style="font-size:13px;color:#4b5563;margin:7px 0;line-height:1.55;">${repo.description}</div>
        <div style="font-size:12px;color:#9ca3af;">
          ${repo.language ? `<span style="margin-right:10px;">&#128187; ${repo.language}</span>` : ''}
          ${repo.topics.length ? `<span>&#127991; ${repo.topics.join(' &middot; ')}</span>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

function buildEmailHtml(newsItems, repos24h, repos7d) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const newsHtml = newsItems.length
    ? newsItems.map((item, i) => {
        const highlight = isPriority(item);
        return `
      <tr>
        <td style="padding:18px 0;border-bottom:1px solid #efefef;${highlight ? 'background:#fffbeb;' : ''}">
          <div style="font-size:11px;color:${highlight ? '#b45309' : '#9ca3af'};letter-spacing:.8px;text-transform:uppercase;margin-bottom:5px;font-weight:${highlight ? '700' : '400'};">
            ${highlight ? '&#9889; ' : ''}${item.source}
          </div>
          <a href="${item.link}" style="font-size:15px;font-weight:700;color:#111827;text-decoration:none;line-height:1.45;display:block;margin-bottom:7px;">${i + 1}. ${item.title}</a>
          ${item.description ? `<div style="font-size:13px;color:#6b7280;line-height:1.6;">${item.description}&hellip;</div>` : ''}
        </td>
      </tr>`;
      }).join('')
    : '<tr><td style="padding:16px 0;color:#9ca3af;font-size:13px;">No AI news found today.</td></tr>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Beyond Elevation &mdash; Daily AI &amp; GitHub Digest</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:36px 40px;border-radius:14px 14px 0 0;text-align:center;">
      <div style="font-size:13px;letter-spacing:2.5px;color:#7dd3fc;text-transform:uppercase;margin-bottom:10px;font-weight:600;">Beyond Elevation</div>
      <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-.5px;line-height:1.2;">AI &amp; GitHub Daily Digest</div>
      <div style="font-size:13px;color:#94a3b8;margin-top:10px;">${dateStr}</div>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:#ffffff;padding:36px 40px;">

      <!-- AI & Claude News -->
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#3b82f6;margin-bottom:6px;">Top Stories</div>
      <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">&#129302; AI &amp; Claude News</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:4px;">Top 5 stories &mdash; Claude &amp; Anthropic items highlighted first</div>
      <div style="font-size:11px;color:#d97706;font-style:italic;margin-bottom:16px;">&#9889; = Claude / Anthropic story</div>
      <table width="100%" cellpadding="0" cellspacing="0">${newsHtml}</table>

      <div style="height:36px;"></div>

      <!-- GitHub 24h -->
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#10b981;margin-bottom:6px;">Trending Now</div>
      <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">&#11088; Top GitHub Repos &mdash; Last 24 Hours</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:16px;">Top 5 most-starred repositories created in the past 24 hours</div>
      <table width="100%" cellpadding="0" cellspacing="0">${repoRows(repos24h)}</table>

      <div style="height:36px;"></div>

      <!-- GitHub 7d -->
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6366f1;margin-bottom:6px;">This Week</div>
      <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">&#128200; Top GitHub Repos &mdash; Last 7 Days</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:16px;">Top 10 most-starred repositories from the past week</div>
      <table width="100%" cellpadding="0" cellspacing="0">${repoRows(repos7d)}</table>

    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f9fafb;padding:24px 40px;border-radius:0 0 14px 14px;border-top:1px solid #e5e7eb;text-align:center;">
      <div style="font-size:12px;color:#9ca3af;line-height:1.8;">
        Daily digest for <a href="https://beyondelevation.com" style="color:#0f172a;font-weight:700;text-decoration:none;">hayat@beyondelevation.com</a>
        &nbsp;&middot;&nbsp; 8:00 AM GMT / 9:00 AM BST<br/>
        <span style="font-size:11px;">Powered by GitHub Actions &middot; GitHub API &middot; RSS feeds &middot; Resend</span>
      </div>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[digest] Starting daily digest generation...');

  const [newsItems, repos24h, repos7d] = await Promise.all([
    fetchNewsItems(5),
    fetchGithubRepos(5, 1),
    fetchGithubRepos(10, 7),
  ]);

  console.log(`[digest] news=${newsItems.length} repos24h=${repos24h.length} repos7d=${repos7d.length}`);

  if (newsItems.length === 0 && repos24h.length === 0) {
    console.error('[digest] No data fetched — aborting');
    process.exit(1);
  }

  const html = buildEmailHtml(newsItems, repos24h, repos7d);
  const subjectDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const subject = `AI & GitHub Digest — ${subjectDate}`;
  const to = process.env.EMAIL_TO || 'hayat@beyondelevation.com';

  await sendViaResend({ to, subject, html });
  console.log('[digest] Done.');
}

main().catch(err => {
  console.error('[digest] Fatal error:', err);
  process.exit(1);
});
