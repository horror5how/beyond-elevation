// GET /api/slots -> { tz, duration, slots: [ISO...] }. Public. Reads the live diary every call.
const { slots, CONFIG } = require("../lib/booking");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  try {
    const r = await slots();
    res.status(200).end(JSON.stringify({ tz: r.tz, duration: CONFIG.durationMin, slots: r.slots }));
  } catch (e) {
    console.error("slots failed", e.message);
    res.status(503).end(JSON.stringify({ error: "unavailable" }));
  }
};
