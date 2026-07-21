// www.beyondelevation.com is the landing host for the Smartlead sender-domain
// 301s (joinbeyondelevation.com etc.) — tag that traffic before serving.
// Edge Middleware because vercel.json redirects lose to the filesystem on static deploys.
export const config = { matcher: '/:path*' };

export default function middleware(req) {
  const url = new URL(req.url);
  if (url.hostname === 'www.beyondelevation.com') {
    url.hostname = 'beyondelevation.com';
    if (!url.searchParams.has('utm_source')) {
      url.searchParams.set('utm_source', 'sender-domain');
    }
    return Response.redirect(url, 307);
  }
}
