// Vercel serverless proxy — routes Instagram carousel posting through Vercel's
// non-blocked IP. This sandbox's IP is blocked by Cloudflare WAF from calling
// graph.facebook.com directly; Vercel's edge IPs are not.
//
// POST /api/ig-carousel-post
// Body: { slides: string[], caption: string, ig_id: string, token: string }
// Returns: { media_id: string } | { error: string }

const BASE = "https://graph.facebook.com/v23.0";

async function metaPost(endpoint, token, params) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const r = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { slides, caption, ig_id, token } = req.body || {};
  if (!slides?.length || !caption || !ig_id || !token) {
    return res.status(400).json({ error: "slides, caption, ig_id, token required" });
  }

  try {
    // 1. Child media containers (one per slide)
    const childIds = [];
    for (const imageUrl of slides) {
      const r = await metaPost(`${ig_id}/media`, token, {
        image_url: imageUrl,
        is_carousel_item: "true",
      });
      if (!r.id) {
        return res.status(400).json({ error: `child container failed for ${imageUrl}: ${JSON.stringify(r)}` });
      }
      childIds.push(r.id);
    }

    // 2. Carousel container
    const carousel = await metaPost(`${ig_id}/media`, token, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
    });
    if (!carousel.id) {
      return res.status(400).json({ error: `carousel container failed: ${JSON.stringify(carousel)}` });
    }

    // 3. Publish
    const pub = await metaPost(`${ig_id}/media_publish`, token, {
      creation_id: carousel.id,
    });
    if (!pub.id) {
      return res.status(400).json({ error: `publish failed: ${JSON.stringify(pub)}` });
    }

    return res.status(200).json({ media_id: pub.id, success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
