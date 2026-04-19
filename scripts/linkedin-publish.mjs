#!/usr/bin/env node
// Native LinkedIn image post — cloud-safe version of the linkedin-native-post skill.
// Publishes an image + caption to LinkedIn as a full-width native post (not a link preview)
// via LinkedIn's official Images API + Posts API. No OAuth flow, no .env file — reads
// credentials from environment variables so it works cleanly in cloud/CI environments.
//
// Usage:
//   LI_TOKEN=... LI_URN=... node scripts/linkedin-publish.mjs --image /tmp/img.png --text "caption"
//
// Flags:
//   --image <path|url>      Local file path OR remote URL (required)
//   --text  <string>        Post caption (required; can come via stdin)
//   --alt   <string>        Alt text (defaults to first line of caption)
//   --visibility <PUBLIC|CONNECTIONS>   (default PUBLIC)
//   --dry-run               Register upload but don't create the post
//
// Exit codes: 0 ok, 2 auth expired (401), 1 any other error.

import { readFileSync, existsSync } from "node:fs";
import { basename, extname } from "node:path";

const LINKEDIN_VERSION = "202604";

function parseArgs(argv) {
  const args = { visibility: "PUBLIC" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--image") args.image = argv[++i];
    else if (a === "--text") args.text = argv[++i];
    else if (a === "--alt") args.alt = argv[++i];
    else if (a === "--visibility") args.visibility = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function loadImage(arg) {
  if (/^https?:\/\//i.test(arg)) {
    const res = await fetch(arg);
    if (!res.ok) throw new Error(`fetch image URL: ${res.status}`);
    const ab = await res.arrayBuffer();
    return {
      bytes: Buffer.from(ab),
      contentType: res.headers.get("content-type") || "image/png",
    };
  }
  if (!existsSync(arg)) throw new Error(`image not found: ${arg}`);
  const bytes = readFileSync(arg);
  const ext = extname(arg).toLowerCase();
  const contentType =
    { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".gif": "image/gif", ".webp": "image/webp" }[ext] || "application/octet-stream";
  return { bytes, contentType };
}

async function initializeUpload(token, ownerUrn) {
  const res = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Linkedin-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });
  if (res.status === 401) { const e = new Error("401 EMPTY_ACCESS_TOKEN"); e.code = 401; throw e; }
  if (!res.ok) throw new Error(`initializeUpload ${res.status}: ${await res.text()}`);
  return (await res.json()).value;
}

async function putBytes(uploadUrl, bytes, contentType, token) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
    body: bytes,
  });
  if (!res.ok) throw new Error(`PUT upload ${res.status}: ${await res.text()}`);
}

async function createPost(token, { author, commentary, imageUrn, altText, visibility }) {
  const payload = {
    author,
    commentary,
    visibility,
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: { media: { id: imageUrn, altText: altText || "" } },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Linkedin-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) { const e = new Error("401 EMPTY_ACCESS_TOKEN"); e.code = 401; throw e; }
  if (!res.ok) throw new Error(`createPost ${res.status}: ${await res.text()}`);
  return res.headers.get("x-restli-id") || res.headers.get("x-linkedin-id");
}

function printHelp() {
  console.log(`Usage: LI_TOKEN=... LI_URN=... node scripts/linkedin-publish.mjs --image <path|url> --text "caption" [--alt "..."] [--visibility PUBLIC|CONNECTIONS] [--dry-run]`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); process.exit(0); }

  const token = process.env.LI_TOKEN;
  const urn = process.env.LI_URN;
  if (!token || !urn) {
    console.error("Missing LI_TOKEN or LI_URN environment variables");
    process.exit(1);
  }

  let text = args.text;
  if (!text) text = await readStdin();
  if (!args.image || !text) { printHelp(); process.exit(1); }

  console.log(`[1/3] loading image ${args.image}`);
  const img = await loadImage(args.image);
  console.log(`      ${img.contentType}, ${(img.bytes.length / 1024).toFixed(1)} KB`);

  console.log(`[2/3] initializeUpload...`);
  const init = await initializeUpload(token, urn);
  console.log(`      ${init.image}`);

  console.log(`      PUT bytes...`);
  await putBytes(init.uploadUrl, img.bytes, img.contentType, token);

  if (args.dryRun) {
    console.log(`[dry-run] would post ${init.image} with caption:\n${text.slice(0, 160)}${text.length > 160 ? "..." : ""}`);
    return;
  }

  console.log(`[3/3] createPost...`);
  const shareUrn = await createPost(token, {
    author: urn,
    commentary: text,
    imageUrn: init.image,
    altText: args.alt || text.split("\n")[0].slice(0, 200),
    visibility: args.visibility,
  });
  console.log(`\nOK ${shareUrn}`);
  console.log(`https://www.linkedin.com/feed/update/${shareUrn}/`);
}

main().catch((e) => {
  console.error(`\nFAIL ${e.message}`);
  process.exit(e.code === 401 ? 2 : 1);
});
