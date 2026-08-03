// Booking link source tracker. Logs the click to PostHog, then 302s to Motion.
// One function serves every channel: /call/li, /call/web, /call/me (see vercel.json rewrite).
// Vercel serverless. No secrets needed — PostHog project key is public (write-only capture).

const MOTION_URL = "https://usemotion.com/meet/hayat-amin/be";
const POSTHOG_KEY = "phc_CDKFjeVGfuEEid74UGx5CNwNFaqaijF8b6e9A6QhLruM";
const POSTHOG_CAPTURE = "https://us.i.posthog.com/capture/";

// Short code -> human label. Unknown codes pass through as-is.
const SOURCES = { li: "LinkedIn", web: "Website", me: "Personal (Gmail)" };

module.exports = async (req, res) => {
  const code = String((req.query && req.query.s) || "unknown").toLowerCase().slice(0, 40);
  const source = SOURCES[code] || code;
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";

  // Log the click. Await so the send completes before the function freezes — but never block the redirect.
  try {
    await fetch(POSTHOG_CAPTURE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: "booking_link_click",
        distinct_id: ip,
        properties: {
          site: "beyondelevation",
          booking_source: source,
          source_code: code,
          $current_url: req.url,
          referrer: req.headers["referer"] || "",
          user_agent: req.headers["user-agent"] || "",
        },
      }),
    });
  } catch (_) { /* tracking must never break the booking */ }

  // Pass the source to Motion too (shows up if Motion keeps the ref param).
  const dest = `${MOTION_URL}?ref=${encodeURIComponent(code)}`;
  res.setHeader("Cache-Control", "no-store");
  res.writeHead(302, { Location: dest });
  res.end();
};
