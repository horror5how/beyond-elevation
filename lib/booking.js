// Booking engine for beyondelevation.com/call. Google Calendar is the only store.
// Auth: service account be-indexing-2 with domain-wide delegation, acting as hayat@.
// Env: GMAIL_SA_JSON (base64 of the service-account key JSON).
"use strict";
const crypto = require("crypto");

const CONFIG = {
  host: "hayat@beyondelevation.com",
  hostName: "Hayat Amin",
  durationMin: 30,
  stepMin: 30,
  bufferMin: 15, // gap kept either side of anything already in the diary
  minNoticeHours: 4,
  horizonDays: 30,
  // Working hours in the calendar's own timezone (Google setting, read live, so it follows him when he travels).
  // 0 = Sunday. Unlisted days are closed.
  hours: { 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18] },
  // Every calendar that counts as "busy". The owner's primary first; a failure there fails closed.
  calendars: [
    "hayat@beyondelevation.com",
    "amin.hayat05@gmail.com",
    "c_95b1afcc334bbf159e162c953a43906e2e8c8f4f6c3b129ae87aa3bdda1057d3@group.calendar.google.com",
    "c_b0dd02453322b98791ae8dac10ec221b4a39c65ae57178ba26c21284db07fbd3@group.calendar.google.com",
  ],
  posthogKey: "phc_CDKFjeVGfuEEid74UGx5CNwNFaqaijF8b6e9A6QhLruM",
};

const SCOPES = {
  read: "https://www.googleapis.com/auth/calendar.readonly",
  write: "https://www.googleapis.com/auth/calendar.events",
  mail: "https://www.googleapis.com/auth/gmail.send",
  mailRead: "https://www.googleapis.com/auth/gmail.readonly",
};

function saKey() {
  const raw = process.env.GMAIL_SA_JSON;
  if (!raw) throw new Error("GMAIL_SA_JSON not set");
  return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
}

const b64url = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const tokenCache = {};
async function token(scope, as = CONFIG.host) {
  const ck = `${as}|${scope}`;
  const hit = tokenCache[ck];
  if (hit && hit.exp > Date.now() + 60000) return hit.value;
  const k = saKey();
  const now = Math.floor(Date.now() / 1000);
  const hdr = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const pl = b64url(JSON.stringify({ iss: k.client_email, sub: as, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = b64url(crypto.sign("RSA-SHA256", Buffer.from(`${hdr}.${pl}`), k.private_key));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${hdr}.${pl}.${sig}` }),
  });
  const j = await r.json();
  if (!r.ok) {
    const e = new Error(`token ${scope}: ${j.error || r.status} ${j.error_description || ""}`);
    e.unauthorized = j.error === "unauthorized_client";
    throw e;
  }
  tokenCache[ck] = { value: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return j.access_token;
}

async function gapi(scope, url, opts = {}) {
  const t = await token(scope, opts.as);
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(opts.headers || {}) } });
  const text = await r.text();
  let j = {};
  try { j = text ? JSON.parse(text) : {}; } catch (_) { j = { raw: text }; }
  if (!r.ok) throw new Error(`${url.split("?")[0]} -> ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

// ---- time zone maths without a library ----
function tzOffsetMs(date, tz) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(date).reduce((a, x) => (a[x.type] = x.value, a), {});
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}
// Wall-clock in tz -> UTC ms. Two passes handle DST edges.
function zonedToUtc(y, m, d, h, min, tz) {
  let guess = Date.UTC(y, m - 1, d, h, min);
  guess -= tzOffsetMs(new Date(guess), tz);
  guess = Date.UTC(y, m - 1, d, h, min) - tzOffsetMs(new Date(guess), tz);
  return guess;
}
function ymdInTz(date, tz) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(date).reduce((a, x) => (a[x.type] = x.value, a), {});
  return { y: +p.year, m: +p.month, d: +p.day, dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
}

async function calendarTz() {
  const j = await gapi(SCOPES.read, "https://www.googleapis.com/calendar/v3/users/me/settings/timezone");
  return j.value || "Europe/London";
}

// Bookings confirmed by email carry an X-BE-Booking header (start/end). Reading them back from the
// host's own mailbox is what stops a double booking when the calendar write scope is not granted.
async function mailedBookings(timeMin, timeMax) {
  const q = `from:${CONFIG.host} subject:"Call booked:" newer_than:60d`;
  const base = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
  const list = await gapi(SCOPES.mailRead, `${base}?q=${encodeURIComponent(q)}&maxResults=100`);
  const ids = (list.messages || []).map((m) => m.id);
  const metas = await Promise.all(ids.map((id) => gapi(SCOPES.mailRead, `${base}/${id}?format=metadata&metadataHeaders=X-BE-Booking&metadataHeaders=To`)));
  const lo = Date.parse(timeMin), hi = Date.parse(timeMax);
  const hdr = (m, n) => (((m.payload || {}).headers || []).find((h) => h.name.toLowerCase() === n) || {}).value || "";
  return metas
    .filter((m) => !/clara\.hawkins@beyondelevation\.com/i.test(hdr(m, "to"))) // ponytail: internal test bookings never block real slots
    .map((m) => hdr(m, "x-be-booking"))
    .filter(Boolean)
    .map((h) => h.value.split("/").map((x) => Date.parse(x)))
    .filter(([s, e]) => !Number.isNaN(s) && !Number.isNaN(e) && e > lo && s < hi);
}

async function busy(timeMin, timeMax) {
  const [j, mailed] = await Promise.all([
    gapi(SCOPES.read, "https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      body: JSON.stringify({ timeMin, timeMax, items: CONFIG.calendars.map((id) => ({ id })) }),
    }),
    mailedBookings(timeMin, timeMax),
  ]);
  const out = [...mailed];
  for (const id of CONFIG.calendars) {
    const c = (j.calendars || {})[id] || {};
    if (c.errors && c.errors.length) {
      if (id === CONFIG.host) throw new Error(`primary calendar unreadable: ${JSON.stringify(c.errors)}`);
      continue; // a secondary calendar we cannot read must not block bookings
    }
    for (const b of c.busy || []) out.push([Date.parse(b.start), Date.parse(b.end)]);
  }
  return out;
}

function overlaps(busyList, start, end) {
  const pad = CONFIG.bufferMin * 60000;
  return busyList.some(([s, e]) => s < end + pad && e > start - pad);
}

// All bookable starts (UTC ms) over the horizon.
async function slots(now = Date.now()) {
  const tz = await calendarTz();
  const from = now;
  const to = now + CONFIG.horizonDays * 86400000;
  const busyList = await busy(new Date(from).toISOString(), new Date(to + 86400000).toISOString());
  const earliest = now + CONFIG.minNoticeHours * 3600000;
  const dur = CONFIG.durationMin * 60000;
  const out = [];
  for (let t = from; t <= to; t += 86400000) {
    const { y, m, d, dow } = ymdInTz(new Date(t), tz);
    const win = CONFIG.hours[dow];
    if (!win) continue;
    const ws = zonedToUtc(y, m, d, win[0], 0, tz);
    const we = zonedToUtc(y, m, d, win[1], 0, tz);
    for (let s = ws; s + dur <= we; s += CONFIG.stepMin * 60000) {
      if (s < earliest) continue;
      if (overlaps(busyList, s, s + dur)) continue;
      out.push(s);
    }
  }
  return { tz, slots: [...new Set(out)].sort((a, b) => a - b).map((ms) => new Date(ms).toISOString()) };
}

function uidFor(email, startIso) {
  return crypto.createHash("sha256").update(`${email.toLowerCase()}|${startIso}`).digest("hex").slice(0, 32) + "@beyondelevation.com";
}

const icsDate = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsEsc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function ics({ uid, start, end, guest, summary, description, meet }) {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Beyond Elevation//Booking//EN", "METHOD:REQUEST", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`, `DTSTAMP:${icsDate(Date.now())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEsc(summary)}`, `DESCRIPTION:${icsEsc(description)}`,
    meet ? `LOCATION:${icsEsc(meet)}` : "LOCATION:Google Meet (link to follow)",
    `ORGANIZER;CN=${icsEsc(CONFIG.hostName)}:mailto:${CONFIG.host}`,
    `ATTENDEE;CN=${icsEsc(CONFIG.hostName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:${CONFIG.host}`,
    `ATTENDEE;CN=${icsEsc(guest.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${guest.email}`,
    "STATUS:CONFIRMED", "SEQUENCE:0", "TRANSP:OPAQUE",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}

async function sendMail({ from, to, cc, subject, text, icsText, slot }) {
  const boundary = "be-" + crypto.randomBytes(8).toString("hex");
  const b64 = (s) => Buffer.from(s, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  const lines = [
    `From: ${from ? from.name : CONFIG.hostName} <${from ? from.email : CONFIG.host}>`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    slot ? `X-BE-Booking: ${slot}` : null,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(text),
    `--${boundary}`,
    'Content-Type: text/calendar; charset=UTF-8; method=REQUEST; name="invite.ics"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(icsText),
    `--${boundary}`,
    'Content-Type: application/ics; name="invite.ics"',
    'Content-Disposition: attachment; filename="invite.ics"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(icsText),
    `--${boundary}--`,
    "",
  ].filter((l) => l !== null).join("\r\n");
  const raw = Buffer.from(lines).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return gapi(SCOPES.mail, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", body: JSON.stringify({ raw }), as: from ? from.email : CONFIG.host });
}

function fmtWhen(ms, tz) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short" }).format(new Date(ms));
}

// Create the booking. Returns {start,end,meet,via}. Throws on conflict ("SLOT_TAKEN") or failure.
async function book({ startIso, name, email, company, notes, guestTz, source }) {
  const start = Date.parse(startIso);
  const end = start + CONFIG.durationMin * 60000;
  const { slots: open } = await slots();
  if (!open.includes(new Date(start).toISOString())) { const e = new Error("SLOT_TAKEN"); e.code = "SLOT_TAKEN"; throw e; }

  const uid = uidFor(email, new Date(start).toISOString());
  const summary = `${name}${company ? ` (${company})` : ""} <> Hayat Amin`;
  const descLines = [
    `Booked at beyondelevation.com/call${source ? ` (${source})` : ""}.`,
    `Guest: ${name} <${email}>${company ? `, ${company}` : ""}`,
    guestTz ? `Guest timezone: ${guestTz}` : null,
    notes ? `\nNotes from guest:\n${notes}` : null,
  ].filter(Boolean);

  let meet = "";
  let via = "ics";
  try {
    const ev = await gapi(SCOPES.write,
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none",
      { method: "POST", body: JSON.stringify({
        iCalUID: uid, summary, description: descLines.join("\n"),
        start: { dateTime: new Date(start).toISOString() }, end: { dateTime: new Date(end).toISOString() },
        attendees: [{ email, displayName: name }],
        conferenceData: { createRequest: { requestId: uid.slice(0, 20), conferenceSolutionKey: { type: "hangoutsMeet" } } },
        reminders: { useDefault: true },
        source: { title: "beyondelevation.com/call", url: "https://beyondelevation.com/call" },
      }) });
    meet = ev.hangoutLink || "";
    via = "api";
  } catch (e) {
    // Write scope not granted yet (or API hiccup): fall back to a mailed invite that also lands on the host's calendar.
    if (!/unauthorized_client|403|401/.test(String(e.message))) throw e;
  }

  const whenGuest = fmtWhen(start, guestTz || "Europe/London");
  const first = name.trim().split(/\s+/)[0];
  const text = [
    `Hi ${first},`,
    "",
    `Booked. ${whenGuest}, ${CONFIG.durationMin} minutes${meet ? `, on Google Meet: ${meet}` : ", on Google Meet. The link follows by email before the call"}.`,
    "",
    "The invite is attached, it should land in your calendar on its own.",
    "If you need to move it, reply to this email.",
    "",
    "Hayat Amin",
    "Beyond Elevation",
  ].join("\n");
  const icsText = ics({ uid, start, end, guest: { name, email }, summary, description: descLines.join("\n") + (meet ? `\n\nGoogle Meet: ${meet}` : ""), meet });
  await sendMail({ to: `${name} <${email}>`, cc: via === "ics" ? CONFIG.host : null, subject: `Call booked: ${whenGuest}`, text, icsText,
    slot: `${new Date(start).toISOString()}/${new Date(end).toISOString()}` });

  fetch("https://us.i.posthog.com/capture/", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: CONFIG.posthogKey, event: "booking_made", distinct_id: email,
      properties: { site: "beyondelevation", booking_source: source || "", start: new Date(start).toISOString(), via, company: company || "" } }) }).catch(() => {});

  return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), meet, via, uid };
}

module.exports = { CONFIG, slots, book, busy, calendarTz, zonedToUtc, overlaps, token, SCOPES, sendMail, ics };
