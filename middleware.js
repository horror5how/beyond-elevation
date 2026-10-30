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


// /bondl: Hayat's private business canvas. Server-side password gate.
// The password never lives in this public repo: only a salted SHA-256 in the
// BONDL_PASS_SHA256 env var, plus BONDL_SALT and BONDL_SECRET (session signing).
// The canvas data itself is never served from here: it lives encrypted on Hayat's Mac.
const B_COOKIE = 'bondl_s';
const B_TTL = 12 * 3600;
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function bSha(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
async function bHmac(msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(process.env.BONDL_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
function bEq(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
async function bValid(req) {
  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)bondl_s=([^;]+)/);
  if (!m || !process.env.BONDL_SECRET) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return bEq(sig, await bHmac('hayat.' + exp));
}
const bHeaders = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' };
async function bondlGate(req, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === '/bondl/login' || p === '/bondl/login.html') return new Response(null, { headers: { 'x-middleware-next': '1', ...bHeaders } });
  if (p === '/bondl/auth' && req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch (e) {}
    const user = String(body.u || '').trim().toLowerCase();
    const ok = process.env.BONDL_PASS_SHA256 && user === 'hayat' &&
      bEq(await bSha((process.env.BONDL_SALT || '') + String(body.p || '')), process.env.BONDL_PASS_SHA256);
    if (!ok) { await new Promise((r) => setTimeout(r, 900)); return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'Content-Type': 'application/json', ...bHeaders } }); }
    const exp = Math.floor(Date.now() / 1000) + B_TTL;
    const val = exp + '.' + (await bHmac('hayat.' + exp));
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', 'Set-Cookie': `${B_COOKIE}=${val}; Path=/bondl; Max-Age=${B_TTL}; HttpOnly; Secure; SameSite=Strict`, ...bHeaders } });
  }
  if (p === '/bondl/logout') return new Response(null, { status: 302, headers: { Location: '/bondl/login', 'Set-Cookie': `${B_COOKIE}=; Path=/bondl; Max-Age=0; HttpOnly; Secure; SameSite=Strict`, ...bHeaders } });
  if (await bValid(req)) return new Response(null, { headers: { 'x-middleware-next': '1', ...bHeaders } });
  const wantsPage = p === '/bondl' || /\.html?$/.test(p) || !/\.[a-z0-9]+$/i.test(p);
  return wantsPage ? Response.redirect(new URL('/bondl/login', url), 302) : new Response('Not authorised', { status: 401, headers: bHeaders });
}

export default async function middleware(req, context) {
  const url = new URL(req.url);
  if (url.pathname === '/bondl' || url.pathname.startsWith('/bondl/')) return bondlGate(req, url);
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
