// GET /api/slots?s=<link> -> { tz, duration, link, slots: [ISO...] }. Public. Reads the live diary every call.
const { slots, linkConfig } = require("../lib/booking");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  try {
    const cfg = await linkConfig(String((req.query && req.query.s) || "").slice(0, 40));
    const r = await slots(Date.now(), cfg);
    res.status(200).end(JSON.stringify({ tz: r.tz, duration: r.link.duration, link: r.link, slots: r.slots }));
  } catch (e) {
    console.error("slots failed", e.message);
    res.status(503).end(JSON.stringify({ error: "unavailable" }));
  }
};
