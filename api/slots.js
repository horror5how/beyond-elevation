// GET /api/slots?s=<link> -> { tz, duration, link, slots: [ISO...], ipTz, ipCity }. Public. Reads the live diary every call.
const { slots, linkConfig } = require("../lib/booking");

// Vercel geo header is URL-encoded ("New%20York"). City only, never stored.
const city = (v) => { try { return decodeURIComponent(String(v || "")).slice(0, 60); } catch (_) { return ""; } };

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  try {
    const cfg = await linkConfig(String((req.query && req.query.s) || "").slice(0, 40));
    const r = await slots(Date.now(), cfg);
    // ?from=&to= (a link cut from the Mail HQ calendar): only the times he dragged over
    const from = Date.parse(req.query && req.query.from), to = Date.parse(req.query && req.query.to);
    if (from && to) r.slots = r.slots.filter((s) => { const t = Date.parse(s); return t >= from && t + r.link.duration * 60000 <= to; });
    res.status(200).end(JSON.stringify({ tz: r.tz, duration: r.link.duration, link: r.link, slots: r.slots,
      ipTz: String(req.headers["x-vercel-ip-timezone"] || "").slice(0, 60),
      ipCity: city(req.headers["x-vercel-ip-city"]) }));
  } catch (e) {
    console.error("slots failed", e.message);
    res.status(503).end(JSON.stringify({ error: "unavailable" }));
  }
};
