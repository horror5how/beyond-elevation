// GET /api/reminders -> sends Clara's booking reminders that are due. Vercel cron, every 5 minutes.
// Times were fixed at booking (lib/booking.js scheduleReminders); this only sends what is due, once.
const { sendDueReminders } = require("../lib/booking");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  // ponytail: open when CRON_SECRET is unset; a stray call can only send reminders that are already due, never early or twice.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).end(JSON.stringify({ error: "no" }));
  try {
    const sent = await sendDueReminders();
    res.status(200).end(JSON.stringify({ ok: true, sent }));
  } catch (e) {
    console.error("reminders failed", e.message);
    res.status(500).end(JSON.stringify({ error: e.message.slice(0, 200) }));
  }
};
