#!/usr/bin/env node
// Instagram carousel publisher — posts public image URLs as a carousel.
// Usage: node scripts/instagram-publish.mjs <url1> <url2> ... <urlN>
// Env: ACTIVE_IG_TOKEN, ACTIVE_IG_BUSINESS_ID, IG_CAPTION
// Exit codes: 0 ok, 2 auth error (token expired), 1 any other error.

const IG_TOKEN = process.env.ACTIVE_IG_TOKEN;
const IG_ID = process.env.ACTIVE_IG_BUSINESS_ID;
const CAPTION = process.env.IG_CAPTION || "";
const GV = process.env.INSTAGRAM_GRAPH_VERSION || "v23.0";
const BASE = `https://graph.facebook.com/${GV}`;

if (!IG_TOKEN || !IG_ID) {
  console.error("Missing required env: ACTIVE_IG_TOKEN, ACTIVE_IG_BUSINESS_ID");
  process.exit(1);
}

const imageUrls = process.argv.slice(2);
if (imageUrls.length < 2 || imageUrls.length > 10) {
  console.error(`Provide 2-10 public image URLs as arguments (got ${imageUrls.length})`);
  process.exit(1);
}
for (const url of imageUrls) {
  if (!/^https?:\/\//.test(url)) {
    console.error(`Not a valid URL: ${url}`);
    process.exit(1);
  }
}

async function igPost(endpoint, params) {
  const body = new URLSearchParams({ ...params, access_token: IG_TOKEN });
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await r.json();
  if (data.error) {
    if (data.error.code === 190) {
      const e = new Error(`IG token expired: ${data.error.message}`);
      e.code = 190;
      throw e;
    }
    throw new Error(`IG API error ${data.error.code}: ${data.error.message}`);
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

async function retry(fn, attempts = 3, delay = 4000) {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      if (e.code === 190) throw e;
      if (i === attempts - 1) throw e;
      console.log(`  [retry ${i + 1}/${attempts - 1}] ${e.message} — waiting ${delay * (i + 1)}ms`);
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

console.log(`[ig] Posting ${imageUrls.length}-slide carousel...`);
for (let i = 0; i < imageUrls.length; i++) {
  console.log(`  slide ${i + 1}: ${imageUrls[i]}`);
}

console.log("[ig] Creating child containers...");
const childIds = [];
for (const url of imageUrls) {
  const { id } = await retry(() => igPost(`${IG_ID}/media`, {
    image_url: url,
    is_carousel_item: "true",
  }));
  console.log(`  child: ${id}`);
  childIds.push(id);
}

console.log("[ig] Creating carousel container...");
const { id: carouselId } = await retry(() => igPost(`${IG_ID}/media`, {
  media_type: "CAROUSEL",
  children: childIds.join(","),
  caption: CAPTION,
}));
console.log(`  carousel: ${carouselId}`);

console.log("[ig] Waiting 3s before publish...");
await new Promise(r => setTimeout(r, 3000));

console.log("[ig] Publishing...");
const { id: mediaId } = await retry(() => igPost(`${IG_ID}/media_publish`, {
  creation_id: carouselId,
}));

console.log(`[ig] PUBLISHED: ${mediaId}`);
console.log(`[ig] View: https://www.instagram.com/p/${mediaId}/`);
