// www.beyondelevation.com is the landing host for the Smartlead sender-domain
// 301s (joinbeyondelevation.com etc.) — tag that traffic before serving.
// Edge Middleware because vercel.json redirects lose to the filesystem on static deploys.
//
// Also the AI crawler counter (2026-09-11): every fetch by a named AI or
// search crawler is reported to topelevens.com's store under this site's name,
// so one reader compares which of Hayat's sites the engines actually read.
export const config = { matcher: '/:path*' };

const CRAWLERS = [
  [/oai-searchbot/i, 'oai-searchbot'], [/chatgpt-user/i, 'chatgpt-user'], [/gptbot/i, 'gptbot'],
  [/claude-searchbot/i, 'claude-searchbot'], [/claude-user/i, 'claude-user'], [/claudebot|anthropic-ai/i, 'claudebot'],
  [/perplexity-user/i, 'perplexity-user'], [/perplexitybot/i, 'perplexitybot'],
  [/google-extended/i, 'google-extended'], [/googlebot|google-inspectiontool/i, 'googlebot'], [/bingbot/i, 'bingbot'],
  [/applebot-extended/i, 'applebot-extended'], [/applebot/i, 'applebot'],
  [/amzn-searchbot/i, 'amzn-searchbot'], [/amazonbot/i, 'amazonbot'],
  [/meta-externalagent|facebookexternalhit/i, 'meta-externalagent'], [/bytespider/i, 'bytespider'], [/ccbot/i, 'ccbot'],
  [/duckassistbot|duckduckbot/i, 'duckduckbot'], [/youbot/i, 'youbot'], [/cohere-ai/i, 'cohere-ai'],
  [/mistralai-user/i, 'mistralai-user'], [/yandexbot/i, 'yandexbot'],
  [/ahrefsbot|semrushbot|mj12bot|dotbot/i, 'seo-tools'],
];

function crawlerLabel(ua) {
  for (const [re, label] of CRAWLERS) if (re.test(ua)) return label;
  return null;
}

export default function middleware(req, context) {
  const url = new URL(req.url);
  if (url.hostname === 'www.beyondelevation.com') {
    url.hostname = 'beyondelevation.com';
    if (!url.searchParams.has('utm_source')) {
      url.searchParams.set('utm_source', 'sender-domain');
    }
    return Response.redirect(url, 307);
  }
  const bot = crawlerLabel(req.headers.get('user-agent') || '');
  if (bot && !/\.(css|js|png|jpg|jpeg|webp|svg|ico|woff2?|txt|xml|mp4)$/i.test(url.pathname)) {
    const p = fetch('https://topelevens.com/api/ref', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: bot, path: url.pathname, cls: 'crawl', site: 'beyondelevation.com' }),
    }).catch(() => {});
    if (context && context.waitUntil) context.waitUntil(p);
  }
}
