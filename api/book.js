// POST /api/book {start, name, email, company, notes, answers, tz, source, website} -> {ok, start, end, meet}
const { book } = require("../lib/booking");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, n) => String(v || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") return res.status(405).end(JSON.stringify({ error: "POST only" }));
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};

  if (body.website) return res.status(200).end(JSON.stringify({ ok: true })); // honeypot: bots think they won
  const name = clean(body.name, 80);
  const email = clean(body.email, 120).toLowerCase();
  const company = clean(body.company, 80);
  const notes = String(body.notes || "").trim().slice(0, 1500);
  const guestTz = clean(body.tz, 60);
  const source = clean(body.source, 40);
  const startIso = clean(body.start, 40);
  const answers = {};
  for (const [k, v] of Object.entries(body.answers && typeof body.answers === "object" ? body.answers : {}).slice(0, 10)) answers[clean(k, 120)] = String(v || "").trim().slice(0, 1500);
  if (name.length < 2) return res.status(400).end(JSON.stringify({ error: "Please add your name." }));
  if (!EMAIL.test(email)) return res.status(400).end(JSON.stringify({ error: "That email does not look right." }));
  if (Number.isNaN(Date.parse(startIso))) return res.status(400).end(JSON.stringify({ error: "Pick a time first." }));

  try {
    const r = await book({ startIso, name, email, company, notes, guestTz, source, answers });
    res.status(200).end(JSON.stringify({ ok: true, start: r.start, end: r.end, meet: r.meet, link: r.link }));
  } catch (e) {
    if (e.code === "BAD_INPUT") return res.status(400).end(JSON.stringify({ error: e.message }));
    if (e.code === "SLOT_TAKEN") return res.status(409).end(JSON.stringify({ error: "That time has just gone. Pick another." }));
    console.error("book failed", e.message);
    res.status(500).end(JSON.stringify({ error: "Something broke on our side. Email hayat@beyondelevation.com and we will fix the time by hand." }));
  }
};
