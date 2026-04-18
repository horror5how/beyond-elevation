'use strict';

const https = require('https');
const nodemailer = require('nodemailer');

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function fetchUrl(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const req = https.get(url, {
      headers: {
        'User-Agent': 'BeyondElevation-Digest/1.0 (+https://beyondelevation.com)',
        ...options.headers,
      },
    }, (res) => {
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

function parseFeed(xml, sourceName, limit = 3) {
  const items = [];
  const blockRe = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/g;
  let m;
  while ((m = blockRe.exec(xml)) !== null && items.length < limit) {
    const block = m[1];
    const title = decodeEntities(parseXmlField(block, 'title'));
    const link = parseXmlField(block, 'link', 'id');
    const description = decodeEntities(stripTags(
      parseXmlField(block, 'description', 'summary', 'content:encoded', 'content')
    )).slice(0, 220);
    const pubDate = parseXmlField(block, 'pubDate', 'published', 'updated', 'dc:date');
    if (title && link && link.startsWith('http')) {
      items.push({ title, link, description, pubDate, source: sourceName });
    }
  }
  return items;
}

// ── News feeds ────────────────────────────────────────────────────────────────

const AI_KEYWORDS = [
  'AI', 'artificial intelligence', 'Claude', 'Anthropic', 'ChatGPT', 'GPT',
  'LLM', 'language model', 'machine learning', 'deep learning', 'neural',
  'OpenAI', 'Gemini', 'Grok', 'generative', 'Mistral', 'Llama',
];

function isAiRelated(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  return AI_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
}

const NEWS_FEEDS = [
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/tag/artificial-intelligence/feed/', aiOnly: false },
  { name: 'The Verge AI',  url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', aiOnly: false },
  { name: 'VentureBeat',   url: 'https://venturebeat.com/category/ai/feed/', aiOnly: false },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', aiOnly: true },
  { name: 'Ars Technica',    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', aiOnly: true },
  { name: 'Wired',           url: 'https://www.wired.com/feed/tag/ai/latest/rss', aiOnly: false },
];

async function fetchNewsItems(totalLimit = 5) {
  const allItems = [];
  const seenLinks = new Set();
  await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => {
      try {
        const { body } = await fetchUrl(feed.url);
        const items = parseFeed(body, feed.name, 5);
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
  return allItems.slice(0, totalLimit);
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
      url: r.html_url,
      language: r.language || null,
      topics: (r.topics || []).slice(0, 4),
    }));
  } catch (err) {
    console.error(`[github-${days}d] fetch failed:`, err.message);
    return [];
  }
}

// ── Reddit trending skills ────────────────────────────────────────────────────

const SKILL_KEYWORDS = [
  // Languages
  { name: 'Python', pattern: /\bpython\b/i },
  { name: 'JavaScript', pattern: /\bjavascript\b|\bjs\b/i },
  { name: 'TypeScript', pattern: /\btypescript\b|\bts\b/i },
  { name: 'Rust', pattern: /\brust\b/i },
  { name: 'Go / Golang', pattern: /\bgolang\b|\b\bgo lang\b/i },
  { name: 'Java', pattern: /\bjava\b(?!script)/i },
  { name: 'C++', pattern: /\bc\+\+\b|\bcpp\b/i },
  { name: 'Swift', pattern: /\bswift\b/i },
  { name: 'Kotlin', pattern: /\bkotlin\b/i },
  { name: 'SQL', pattern: /\bsql\b/i },
  // Frameworks / tools
  { name: 'React', pattern: /\breact\b/i },
  { name: 'Next.js', pattern: /\bnext\.?js\b/i },
  { name: 'Vue', pattern: /\bvue\b/i },
  { name: 'Node.js', pattern: /\bnode\.?js\b/i },
  { name: 'FastAPI', pattern: /\bfastapi\b/i },
  { name: 'Django', pattern: /\bdjango\b/i },
  { name: 'Docker', pattern: /\bdocker\b/i },
  { name: 'Kubernetes', pattern: /\bkubernetes\b|\bk8s\b/i },
  { name: 'AWS', pattern: /\baws\b|\bamazon web services\b/i },
  { name: 'Linux', pattern: /\blinux\b/i },
  // AI/ML
  { name: 'Machine Learning', pattern: /\bmachine learning\b|\bml\b/i },
  { name: 'LLM / AI Agents', pattern: /\bllm\b|\bai agent/i },
  { name: 'PyTorch', pattern: /\bpytorch\b/i },
  { name: 'TensorFlow', pattern: /\btensorflow\b/i },
  { name: 'Prompt Engineering', pattern: /\bprompt engineer/i },
  // Career
  { name: 'System Design', pattern: /\bsystem design\b/i },
  { name: 'Data Structures', pattern: /\bdata structure/i },
  { name: 'DevOps', pattern: /\bdevops\b/i },
  { name: 'Cybersecurity', pattern: /\bcybersecurity\b|\bsecurity\b/i },
  { name: 'Web Scraping', pattern: /\bweb scraping\b|\bscraping\b/i },
];

const REDDIT_SUBREDDITS = [
  'learnprogramming', 'webdev', 'datascience',
  'MachineLearning', 'artificial', 'programming', 'cscareerquestions',
];

async function fetchRedditSkills() {
  const counts = {};
  const postSamples = {};

  await Promise.allSettled(
    REDDIT_SUBREDDITS.map(async (sub) => {
      try {
        const url = `https://www.reddit.com/r/${sub}/top.json?t=week&limit=25`;
        const { body, status } = await fetchUrl(url, {
          headers: {
            'User-Agent': 'BeyondElevation-Digest/1.0 (daily newsletter bot)',
            Accept: 'application/json',
          },
        });
        if (status !== 200) return;
        const data = JSON.parse(body);
        const posts = (data?.data?.children || []).map(c => c.data);
        for (const post of posts) {
          const text = `${post.title} ${post.selftext || ''}`;
          for (const skill of SKILL_KEYWORDS) {
            if (skill.pattern.test(text)) {
              counts[skill.name] = (counts[skill.name] || 0) + 1;
              if (!postSamples[skill.name]) {
                postSamples[skill.name] = {
                  title: post.title,
                  url: `https://reddit.com${post.permalink}`,
                  subreddit: sub,
                };
              }
            }
          }
        }
      } catch (err) {
        console.error(`[reddit] r/${sub} failed:`, err.message);
      }
    })
  );

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, sample: postSamples[name] }));
}

// ── TikTok trending skills via Apify ─────────────────────────────────────────

async function fetchTikTokSkills() {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.log('[tiktok] APIFY_TOKEN not set — skipping');
    return [];
  }

  // Apify TikTok Hashtag Scraper — searches tech/skill hashtags
  const hashtags = ['coding', 'programming', 'learntocode', 'techskills', 'artificialintelligence', 'datascience'];
  const results = [];

  try {
    // Start the Apify actor run
    const runBody = JSON.stringify({
      hashtags,
      resultsPerPage: 20,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    });

    const startResp = await fetchUrl(
      `https://api.apify.com/v2/acts/clockworks~free-tiktok-scraper/run-sync-get-dataset-items?token=${token}&timeout=60`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(runBody),
        },
        method: 'POST',
        body: runBody,
      }
    );

    if (startResp.status !== 200 && startResp.status !== 201) {
      console.error('[tiktok] Apify run failed:', startResp.status);
      return [];
    }

    const items = JSON.parse(startResp.body);
    const counts = {};
    const samples = {};

    for (const item of (Array.isArray(items) ? items : [])) {
      const text = `${item.text || ''} ${(item.hashtags || []).join(' ')}`.toLowerCase();
      for (const skill of SKILL_KEYWORDS) {
        if (skill.pattern.test(text)) {
          counts[skill.name] = (counts[skill.name] || 0) + (item.diggCount || 1);
          if (!samples[skill.name]) {
            samples[skill.name] = {
              title: (item.text || '').slice(0, 100),
              url: item.webVideoUrl || `https://tiktok.com/@${item.authorMeta?.name}`,
              likes: item.diggCount || 0,
            };
          }
        }
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, sample: samples[name] }));
  } catch (err) {
    console.error('[tiktok] fetch failed:', err.message);
    return [];
  }
}

// ── Email template ────────────────────────────────────────────────────────────

function repoRows(repos) {
  if (!repos.length) return '<tr><td style="padding:16px 0;color:#9ca3af;font-size:13px;">No repositories found.</td></tr>';
  return repos.map((repo, i) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #efefef;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td><a href="${repo.url}" style="font-size:15px;font-weight:700;color:#111827;text-decoration:none;">${i + 1}. ${repo.name}</a></td>
          <td align="right" style="white-space:nowrap;">
            <span style="background:#fef9c3;color:#854d0e;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">★ ${repo.stars.toLocaleString()}</span>
            ${repo.forks ? `<span style="background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;margin-left:6px;">⑂ ${repo.forks.toLocaleString()}</span>` : ''}
          </td>
        </tr></table>
        <div style="font-size:13px;color:#4b5563;margin:7px 0;line-height:1.55;">${repo.description}</div>
        <div style="font-size:12px;color:#9ca3af;">
          ${repo.language ? `<span style="margin-right:10px;">💻 ${repo.language}</span>` : ''}
          ${repo.topics.length ? `<span>🏷 ${repo.topics.join(' · ')}</span>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

function skillRows(skills, platform, icon) {
  if (!skills.length) return `<tr><td style="padding:16px 0;color:#9ca3af;font-size:13px;">No data available${platform === 'TikTok' ? ' — add APIFY_TOKEN secret to enable' : ''}.</td></tr>`;
  return skills.map((skill, i) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #efefef;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <span style="font-size:15px;font-weight:700;color:#111827;">${i + 1}. ${skill.name}</span>
            ${skill.sample ? `<div style="font-size:12px;color:#6b7280;margin-top:5px;line-height:1.5;">
              ${skill.sample.url
                ? `<a href="${skill.sample.url}" style="color:#6b7280;text-decoration:none;">"${skill.sample.title}"${skill.sample.subreddit ? ` — r/${skill.sample.subreddit}` : ''}</a>`
                : `"${skill.sample.title}"`
              }
            </div>` : ''}
          </td>
          <td align="right" style="white-space:nowrap;vertical-align:top;">
            <span style="background:#ede9fe;color:#5b21b6;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${skill.count} mentions</span>
          </td>
        </tr></table>
      </td>
    </tr>`).join('');
}

function buildEmailHtml(newsItems, repos24h, repos7d, redditSkills, tiktokSkills) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const newsHtml = newsItems.length
    ? newsItems.map((item, i) => `
      <tr>
        <td style="padding:18px 0;border-bottom:1px solid #efefef;">
          <div style="font-size:11px;color:#9ca3af;letter-spacing:.8px;text-transform:uppercase;margin-bottom:5px;">${item.source}</div>
          <a href="${item.link}" style="font-size:15px;font-weight:700;color:#111827;text-decoration:none;line-height:1.45;display:block;margin-bottom:7px;">${i + 1}. ${item.title}</a>
          ${item.description ? `<div style="font-size:13px;color:#6b7280;line-height:1.6;">${item.description}…</div>` : ''}
        </td>
      </tr>`).join('')
    : '<tr><td style="padding:16px 0;color:#9ca3af;font-size:13px;">No AI news found today.</td></tr>';

  const hasSkills = redditSkills.length || tiktokSkills.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Beyond Elevation — Daily AI & GitHub Digest</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:36px 40px;border-radius:14px 14px 0 0;text-align:center;">
      <div style="font-size:13px;letter-spacing:2.5px;color:#7dd3fc;text-transform:uppercase;margin-bottom:10px;font-weight:600;">Beyond Elevation</div>
      <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-.5px;line-height:1.2;">AI & GitHub Daily Digest</div>
      <div style="font-size:13px;color:#94a3b8;margin-top:10px;">${dateStr}</div>
    </td></tr>

    <!-- Body -->
    <tr><td style="background:#ffffff;padding:36px 40px;">

      <!-- AI News -->
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#3b82f6;margin-bottom:6px;">Top Stories</div>
      <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">🤖 AI &amp; Claude News</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:16px;">Top 5 — last 24 hours</div>
      <table width="100%" cellpadding="0" cellspacing="0">${newsHtml}</table>

      <div style="height:36px;"></div>

      <!-- GitHub 24h -->
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#10b981;margin-bottom:6px;">Trending Now</div>
      <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">⭐ Top GitHub Repos — Last 24 Hours</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:16px;">Top 5 most-starred new repositories</div>
      <table width="100%" cellpadding="0" cellspacing="0">${repoRows(repos24h)}</table>

      <div style="height:36px;"></div>

      <!-- GitHub 7d -->
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6366f1;margin-bottom:6px;">This Week</div>
      <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">📈 Top GitHub Repos — Last 7 Days</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:16px;">Top 10 most-starred new repositories this week</div>
      <table width="100%" cellpadding="0" cellspacing="0">${repoRows(repos7d)}</table>

      ${hasSkills ? `
      <div style="height:36px;"></div>

      <!-- Reddit Skills -->
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ef4444;margin-bottom:6px;">Community Pulse</div>
      <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">🔥 Top Skills on Reddit</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:16px;">Most discussed skills this week across r/learnprogramming, r/webdev, r/MachineLearning &amp; more</div>
      <table width="100%" cellpadding="0" cellspacing="0">${skillRows(redditSkills, 'Reddit', '🔴')}</table>

      ${tiktokSkills.length ? `
      <div style="height:28px;"></div>
      <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">🎵 Top Skills on TikTok</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:16px;">Most-liked tech skill content across #coding, #programming, #AI &amp; more</div>
      <table width="100%" cellpadding="0" cellspacing="0">${skillRows(tiktokSkills, 'TikTok', '🎵')}</table>
      ` : ''}
      ` : ''}

    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f9fafb;padding:24px 40px;border-radius:0 0 14px 12px;border-top:1px solid #e5e7eb;text-align:center;">
      <div style="font-size:12px;color:#9ca3af;line-height:1.8;">
        Daily digest for <a href="https://beyondelevation.com" style="color:#0f172a;font-weight:700;text-decoration:none;">hayat@beyondelevation.com</a>
        &nbsp;·&nbsp; Delivered at 8:00 AM GMT/BST<br/>
        <span style="font-size:11px;">Powered by GitHub Actions · GitHub API · Reddit · ${tiktokSkills.length ? 'Apify/TikTok' : 'RSS feeds'}</span>
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

  const [newsItems, repos24h, repos7d, redditSkills, tiktokSkills] = await Promise.all([
    fetchNewsItems(5),
    fetchGithubRepos(5, 1),
    fetchGithubRepos(10, 7),
    fetchRedditSkills(),
    fetchTikTokSkills(),
  ]);

  console.log(`[digest] news=${newsItems.length} repos24h=${repos24h.length} repos7d=${repos7d.length} redditSkills=${redditSkills.length} tiktokSkills=${tiktokSkills.length}`);

  if (newsItems.length === 0 && repos24h.length === 0) {
    console.error('[digest] No data fetched — aborting');
    process.exit(1);
  }

  const html = buildEmailHtml(newsItems, repos24h, repos7d, redditSkills, tiktokSkills);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const subjectDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  await transporter.sendMail({
    from: `"Beyond Elevation Digest" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: process.env.EMAIL_TO || 'hayat@beyondelevation.com',
    subject: `🤖 AI & GitHub Digest — ${subjectDate}`,
    html,
  });

  console.log('[digest] Email sent successfully.');
}

main().catch(err => {
  console.error('[digest] Fatal error:', err);
  process.exit(1);
});
