// GET /api/reminders -> sends Clara's booking reminders that are due. Vercel cron, every 5 minutes.
// Times were fixed at booking (lib/booking.js scheduleReminders); this only sends what is due, once.
const { sendDueReminders, healGuests } = require("../lib/booking");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  // fail closed: with no CRON_SECRET nothing runs; the compare is timing-safe (cto-weekly, 28 Oct 2026)
  const secret = process.env.CRON_SECRET || "";
  const got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const ok = secret && got.length === secret.length && require("crypto").timingSafeEqual(Buffer.from(got), Buffer.from(secret));
  if (!ok) return res.status(401).end(JSON.stringify({ error: "no" }));
  try {
    // the guest invite is healed first and on its own: a reminder failure must never stop it
    const healed = await healGuests().catch((e) => [{ error: e.message.slice(0, 200) }]);
    const sent = await sendDueReminders();
    res.status(200).end(JSON.stringify({ ok: true, healed, sent }));
  } catch (e) {
    console.error("reminders failed", e.message);
    res.status(500).end(JSON.stringify({ error: e.message.slice(0, 200) }));
  }
};
