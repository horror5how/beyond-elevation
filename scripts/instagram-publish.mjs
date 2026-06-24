#!/usr/bin/env node
// Instagram carousel publisher — uploads slides to Vercel Blob, posts to Instagram Graph API.
// Usage: node scripts/instagram-publish.mjs slide-1.png slide-2.png ... slide-N.png
// Env: ACTIVE_IG_TOKEN, ACTIVE_IG_BUSINESS_ID, BLOB_READ_WRITE_TOKEN, IG_CAPTION
// Exit codes: 0 ok, 2 auth error, 1 any other error.

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { put } from "@vercel/blob";

const IG_TOKEN = process.env.ACTIVE_IG_TOKEN;
const IG_ID = process.env.ACTIVE_IG_BUSINESS_ID;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const CAPTION = process.env.IG_CAPTION || "";
const GV = process.env.INSTAGRAM_GRAPH_VERSION || "v23.0";
const BASE = `https://graph.facebook.com/${GV}`;

if (!IG_TOKEN || !IG_ID || !BLOB_TOKEN) {
  console.error("Missing required env: ACTIVE_IG_TOKEN, ACTIVE_IG_BUSINESS_ID, BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

const imagePaths = process.argv.slice(2);
if (imagePaths.length < 2 || imagePaths.length > 10) {
  console.error("Provide 2-10 image file paths as arguments");
  process.exit(1);
}

async function uploadToBlob(filePath) {
  const bytes = readFileSync(filePath);
  const name = `ig-carousel/${Date.now()}-${basename(filePath)}`;
  const { url } = await put(name, bytes, {
    access: "public",
    token: BLOB_TOKEN,
    contentType: "image/png",
  });
  return url;
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
    if (data.error.code === 190) { const e = new Error("IG auth error"); e.code = 190; throw e; }
    throw new Error(`IG API error: ${JSON.stringify(data.error)}`);
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
      console.log(`  retry ${i + 1}/${attempts - 1} after ${delay}ms: ${e.message}`);
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

console.log(`[ig] Uploading ${imagePaths.length} slides to Vercel Blob...`);
const urls = [];
for (const p of imagePaths) {
  const url = await retry(() => uploadToBlob(p));
  console.log(`  ✓ ${basename(p)} → ${url}`);
  urls.push(url);
}

console.log("[ig] Creating child carousel containers...");
const childIds = [];
for (const url of urls) {
  const { id } = await retry(() => igPost(`${IG_ID}/media`, {
    image_url: url,
    is_carousel_item: "true",
  }));
  console.log(`  ✓ child container: ${id}`);
  childIds.push(id);
}

console.log("[ig] Creating carousel container...");
const { id: carouselId } = await retry(() => igPost(`${IG_ID}/media`, {
  media_type: "CAROUSEL",
  children: childIds.join(","),
  caption: CAPTION,
}));
console.log(`  ✓ carousel container: ${carouselId}`);

await new Promise(r => setTimeout(r, 3000));

console.log("[ig] Publishing...");
const { id: mediaId } = await retry(() => igPost(`${IG_ID}/media_publish`, {
  creation_id: carouselId,
}));

console.log(`[ig] PUBLISHED: ${mediaId}`);
console.log(`[ig] View: https://www.instagram.com/p/${mediaId}/`);
