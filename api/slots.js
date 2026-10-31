// GET /api/slots?s=<link> -> { tz, duration, link, slots: [ISO...], ipTz, ipCity }. Public. Reads the live diary every call.
const { slots, linkConfig } = require("../lib/booking");

// Vercel geo header is URL-encoded ("New%20York"). City only, never stored.
const city = (v) => { try { return decodeURIComponent(String(v || "")).slice(0, 60); } catch (_) { return ""; } };

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*"); // public times; Mail HQ checks a link before copying it
  try {
    const cfg = await linkConfig(String((req.query && req.query.s) || "").slice(0, 40));
    const r = await slots(Date.now(), cfg);
    // A link cut from the Mail HQ calendar offers only the windows he picked: ?w=a-b,c-d in epoch minutes (or the older
    // ?from=&to=). If none of them is bookable any more the guest gets the whole diary rather than an empty page, and
    // windowed:false tells Mail HQ so before it copies the link (31 Oct 2026).
    const q = req.query || {};
    const wins = String(q.w || "").split(",").map((p) => p.split("-").map((n) => +n * 60000)).filter(([a, b]) => a > 0 && b > a);
    if (Date.parse(q.from) && Date.parse(q.to)) wins.push([Date.parse(q.from), Date.parse(q.to)]);
    let windowed = false;
    if (wins.length) {
      const inside = r.slots.filter((s) => { const t = Date.parse(s), e = t + r.link.duration * 60000; return wins.some(([a, b]) => t >= a && e <= b); });
      if (inside.length) { r.slots = inside; windowed = true; }
    }
    res.status(200).end(JSON.stringify({ tz: r.tz, duration: r.link.duration, link: r.link, slots: r.slots, windowed,
      ipTz: String(req.headers["x-vercel-ip-timezone"] || "").slice(0, 60),
      ipCity: city(req.headers["x-vercel-ip-city"]) }));
  } catch (e) {
    console.error("slots failed", e.message);
    res.status(503).end(JSON.stringify({ error: "unavailable" }));
  }
};
