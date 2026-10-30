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

// Per-link settings are edited in Mail HQ (mail-hq-navy.vercel.app/booking) and read here with its robot key.
// Any failure falls back to CONFIG, so a Mail HQ outage never takes the booking page down.
const TYPES_URL = "https://mail-hq-navy.vercel.app/api/booking";
const pad2 = (n) => String(n).padStart(2, "0");
const BASE_LINK = {
  slug: "call", name: "Free 30 minute call", durationMin: CONFIG.durationMin, stepMin: CONFIG.stepMin,
  bufferBefore: CONFIG.bufferMin, bufferAfter: CONFIG.bufferMin, minNoticeHours: CONFIG.minNoticeHours,
  horizonDays: CONFIG.horizonDays, maxPerDay: null, tz: null,
  hours: Object.fromEntries(Object.entries(CONFIG.hours).map(([d, [a, b]]) => [d, [[`${pad2(a)}:00`, `${pad2(b)}:00`]]])),
  overrides: {}, calendars: CONFIG.calendars, locationKind: "meet", locationText: "", questions: [],
  intro: "", confirmText: "", redirectUrl: "", emailNote: "",
};

// Last good settings per slug, kept on the warm instance. A cold Mail HQ function can take 5 to 14 s to answer; with a 4 s
// timeout and no memory the page silently fell back to the built-in 9-18 hours and the default link name (seen live 28 Oct 2026).
const cfgCache = {};
async function fetchLink(slug, key, ms) {
  const r = await fetch(`${TYPES_URL}?slug=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`mail-hq ${r.status}`);
  return r.json();
}
async function linkConfig(slug) {
  const key = process.env.MAILHQ_ROBOT_KEY;
  if (!key) return BASE_LINK;
  slug = String(slug || "call").toLowerCase();
  const hit = cfgCache[slug];
  if (hit && hit.exp > Date.now()) return hit.cfg;
  // Mail HQ answers {inactive:true} for a link that is switched off
  try {
    let t;
    try { t = await fetchLink(slug, key, 8000); } catch (e1) { console.error("mail-hq settings slow, retrying once:", e1.message); t = await fetchLink(slug, key, 8000); }
    const cfg = toCfg(t);
    cfgCache[slug] = { cfg, exp: Date.now() + 10 * 60000 };
    return cfg;
  } catch (e) {
    if (hit) { console.error("booking link settings unavailable, using the last good copy:", e.message); return hit.cfg; }
    console.error("booking link settings unavailable, using defaults:", e.message);
    return BASE_LINK;
  }
}
function toCfg(t) {
  {
    if (t.inactive) return { ...BASE_LINK, slug: t.slug, name: t.name || BASE_LINK.name, inactive: true };
    return {
      slug: t.slug, name: t.name, durationMin: t.duration_min, stepMin: t.step_min,
      bufferBefore: t.buffer_before_min, bufferAfter: t.buffer_after_min, minNoticeHours: t.min_notice_hours,
      horizonDays: t.horizon_days, maxPerDay: t.max_per_day, tz: t.timezone,
      hours: t.hours_json || {}, overrides: t.overrides_json || {},
      // the host's primary is always in the busy check; a link saved with only "Personal Gmail" ticked must never skip his own diary
      calendars: t.calendars_json && t.calendars_json.length ? [...new Set([CONFIG.host, ...t.calendars_json])] : CONFIG.calendars,
      inactive: !!t.inactive,
      locationKind: t.location_kind, locationText: t.location_text || "", questions: t.questions_json || [],
      intro: t.intro || "", confirmText: t.confirm_text || "", redirectUrl: t.redirect_url || "", emailNote: t.email_note || "",
    };
  }
}

// What the public page may see about a link (no calendar ids).
const publicLink = (c) => ({ slug: c.slug, name: c.name, duration: c.durationMin, intro: c.intro, confirmText: c.confirmText, inactive: !!c.inactive,
  redirectUrl: c.redirectUrl, questions: c.questions, location: c.locationKind === "custom" ? c.locationText : c.locationKind === "phone" ? "Phone call" : "Google Meet" });

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
  // capped at 40 and tolerant: with 100 parallel reads a run this used to trip Gmail's per-user limit and the page said "The diary is not answering"
  const list = await gapi(SCOPES.mailRead, `${base}?q=${encodeURIComponent(q)}&maxResults=40`);
  const ids = (list.messages || []).map((m) => m.id);
  const metas = await Promise.all(ids.map((id) => gapi(SCOPES.mailRead, `${base}/${id}?format=metadata&metadataHeaders=X-BE-Booking&metadataHeaders=To&metadataHeaders=Cc`)));
  const lo = Date.parse(timeMin), hi = Date.parse(timeMax);
  const hdr = (m, n) => (((m.payload || {}).headers || []).find((h) => h.name.toLowerCase() === n) || {}).value || "";
  return metas
    .filter((m) => !/clara\.hawkins@beyondelevation\.com/i.test(hdr(m, "to"))) // ponytail: internal test bookings never block real slots
    .filter((m) => hdr(m, "x-be-booking"))
    // Third field: true for the no-calendar fallback (it Cc's the host). Only those block slots; a booking that made
    // a calendar event is already in freeBusy, and counting its mail too kept the slot blocked after a cancel.
    .map((m) => [...hdr(m, "x-be-booking").split("/").map((x) => Date.parse(x)), hdr(m, "cc").toLowerCase().includes(CONFIG.host)])
    .filter(([s, e]) => !Number.isNaN(s) && !Number.isNaN(e) && e > lo && s < hi);
}

// Returns busy [start,end] pairs; .mailed holds the bookings made through this page (for the daily cap).
async function busy(timeMin, timeMax, calendars = CONFIG.calendars) {
  const [j, mailed] = await Promise.all([
    gapi(SCOPES.read, "https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      body: JSON.stringify({ timeMin, timeMax, items: calendars.map((id) => ({ id })) }),
    }),
    mailedBookings(timeMin, timeMax).catch((e) => { console.error("mailed bookings unreadable, ignoring:", e.message); return []; }),
  ]);
  const out = mailed.filter((m) => m[2]).map(([s, e]) => [s, e]);
  out.mailed = mailed; // every booking made here still counts toward the daily cap
  for (const id of calendars) {
    const c = (j.calendars || {})[id] || {};
    if (c.errors && c.errors.length) {
      if (id === CONFIG.host) throw new Error(`primary calendar unreadable: ${JSON.stringify(c.errors)}`);
      continue; // a secondary calendar we cannot read must not block bookings
    }
    for (const b of c.busy || []) out.push([Date.parse(b.start), Date.parse(b.end)]);
  }
  return out;
}

function overlaps(busyList, start, end, beforeMin = CONFIG.bufferMin, afterMin = CONFIG.bufferMin) {
  return busyList.some(([s, e]) => s < end + afterMin * 60000 && e > start - beforeMin * 60000);
}

// All bookable starts (UTC ms) over the horizon, for one link's settings.
async function slots(now = Date.now(), cfg = BASE_LINK, opts = {}) {
  if (cfg.inactive) return { tz: cfg.tz || "Europe/London", link: publicLink(cfg), slots: [] };
  const tz = cfg.tz || await calendarTz();
  const from = now;
  const to = now + cfg.horizonDays * 86400000;
  const busyList = await busy(new Date(from).toISOString(), new Date(to + 86400000).toISOString(), cfg.calendars);
  // graceMin: the submit re-check allows a slot that was bookable when the page loaded (a 6-minute form fill used to earn a 409)
  const earliest = now + cfg.minNoticeHours * 3600000 - (opts.graceMin || 0) * 60000;
  const dur = cfg.durationMin * 60000;
  const dayKey = (ms) => { const { y, m, d } = ymdInTz(new Date(ms), tz); return `${y}-${pad2(m)}-${pad2(d)}`; };
  const bookedOn = {};
  for (const [s] of busyList.mailed || []) bookedOn[dayKey(s)] = (bookedOn[dayKey(s)] || 0) + 1;
  const out = [];
  // one step per local calendar day (a fixed 24 h step skipped a day across the spring-forward night)
  const first = ymdInTz(new Date(from), tz);
  for (let i = 0; i <= cfg.horizonDays; i++) {
    const t = zonedToUtc(first.y, first.m, first.d + i, 12, 0, tz); // local noon of that day
    if (t > to + 86400000) break;
    const { y, m, d, dow } = ymdInTz(new Date(t), tz);
    const key = `${y}-${pad2(m)}-${pad2(d)}`;
    if (cfg.maxPerDay && (bookedOn[key] || 0) >= cfg.maxPerDay) continue;
    const wins = cfg.overrides[key] || cfg.hours[dow] || [];
    for (const [a, b] of wins) {
      const [ah, am] = a.split(":").map(Number), [bh, bm] = b.split(":").map(Number);
      const ws = zonedToUtc(y, m, d, ah, am, tz);
      const we = zonedToUtc(y, m, d, bh, bm, tz);
      for (let s = ws; s + dur <= we; s += cfg.stepMin * 60000) {
        if (s < earliest) continue;
        if (overlaps(busyList, s, s + dur, cfg.bufferBefore, cfg.bufferAfter)) continue;
        out.push(s);
      }
    }
  }
  return { tz, link: publicLink(cfg), slots: [...new Set(out)].sort((a, b) => a - b).map((ms) => new Date(ms).toISOString()) };
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
    `LOCATION:${icsEsc(meet || "Google Meet (link to follow)")}`,
    `ORGANIZER;CN=${icsEsc(CONFIG.hostName)}:mailto:${CONFIG.host}`,
    `ATTENDEE;CN=${icsEsc(CONFIG.hostName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:${CONFIG.host}`,
    `ATTENDEE;CN=${icsEsc(guest.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${guest.email}`,
    "STATUS:CONFIRMED", "SEQUENCE:0", "TRANSP:OPAQUE",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}

/** "Smith, John" <x@y> stays one recipient: the name is quoted, quotes inside it dropped. */
const addr = (name, email) => { const n = String(name || "").replace(/"/g, "").trim(); return n ? `"${n}" <${email}>` : email; };

async function sendMail({ from, to, cc, subject, text, icsText, slot, inReplyTo }) {
  const boundary = "be-" + crypto.randomBytes(8).toString("hex");
  const b64 = (s) => Buffer.from(s, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  const lines = [
    `From: ${from ? from.name : CONFIG.hostName} <${from ? from.email : CONFIG.host}>`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    slot ? `X-BE-Booking: ${slot}` : null,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    inReplyTo ? `References: ${inReplyTo}` : null,
    "MIME-Version: 1.0",
    // ponytail: plain text alone when Google sends the invite; text + calendar as alternatives (proper iMIP) otherwise
    ...(icsText ? [
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(text),
      `--${boundary}`,
      "Content-Type: text/calendar; charset=UTF-8; method=REQUEST",
      "Content-Transfer-Encoding: base64",
      "",
      b64(icsText),
      `--${boundary}--`,
    ] : [
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(text),
    ]),
    "",
  ].filter((l) => l !== null).join("\r\n");
  const raw = Buffer.from(lines).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return gapi(SCOPES.mail, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", body: JSON.stringify({ raw }), as: from ? from.email : CONFIG.host });
}

function fmtWhen(ms, tz) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" }).format(new Date(ms));
}

// ---- Clara's reminders: 6pm the evening before (guest's zone), one hour before, and a thank-you one hour after ----
function reminderTimes(start, tz, now = Date.now()) {
  const { y, m, d } = ymdInTz(new Date(start), tz);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  const r1 = zonedToUtc(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate(), 18, 0, tz);
  const r2 = start - 3600000;
  return {
    r1: r1 > now && r1 < r2 ? new Date(r1).toISOString() : "", // skipped when booked after 6pm the night before
    r2: r2 > now + 5 * 60000 ? new Date(r2).toISOString() : "", // skipped when booked inside the hour
  };
}

async function scheduleReminders({ eventId, start, guestTz, first, sentId, subject, meet, ip, email, name }) {
  const tz = guestTz || "Europe/London";
  const { r1, r2 } = reminderTimes(start, tz);
  let mid = "";
  if (sentId) {
    try {
      const m = await gapi(SCOPES.mailRead, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${sentId}?format=metadata&metadataHeaders=Message-ID`);
      mid = ((m.payload && m.payload.headers) || []).find((h) => /^message-id$/i.test(h.name))?.value || "";
    } catch (e) { console.error("no Message-ID, reminders will not thread", e.message); }
  }
  await gapi(SCOPES.write, `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, { method: "PATCH",
    // ip: private to the host copy of the event; the call brief matches it to site visits. Never shown to the guest.
    body: JSON.stringify({ extendedProperties: { private: { rem: "1", r1, r2, tz, first, mid, subj: subject, meet: meet || "", ip: ip || "", ge: email || "", gn: name || "" } } }) });
}

const cityOf = (tz) => tz.split("/").pop().replace(/_/g, " ");
const dayOf = (ms, tz) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date(ms));
const timeOf = (ms, tz) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(ms));
const CLARA = { name: "Clara Hawkins", email: "clara.hawkins@beyondelevation.com" };
const SIGN = ["Best regards,", "Clara Hawkins", "Executive Assistant to Hayat Amin"];

function reminderText(which, p, start, end) {
  const at = `${timeOf(start, p.tz)} ${cityOf(p.tz)} time`;
  if (which === "r3") return [
    `Hi ${p.first},`, "",
    "Thank you for taking the time to speak with Hayat today.", "",
    "If anything comes up from the call, or you would like to set up a next conversation, reply to this email and I will arrange it.", "",
    ...SIGN,
  ].join("\n");
  if (which === "r1") return [
    `Hi ${p.first},`, "",
    `Just a reminder that you have a call with Hayat Amin tomorrow, ${dayOf(start, p.tz)} at ${at}. ${Math.round((end - start) / 60000)} minutes${p.meet ? " on Google Meet" : ""}.`, "",
    ...(p.meet ? [`The Google Meet link should be in your calendar invite. If it isn't there, here it is for reference: ${p.meet}`, ""] : []),
    "If the time no longer works, reply to this email and I will move it for you.", "", ...SIGN,
  ].join("\n");
  return [
    `Hi ${p.first},`, "",
    `A quick reminder that your call with Hayat Amin starts in one hour, at ${at}.`, "",
    ...(p.meet ? [`Here is the Google Meet link again: ${p.meet}`, ""] : []),
    ...SIGN,
  ].join("\n");
}

// Guarantee: every booking ends with its guest on the Google invite. Runs every 5 minutes (api/reminders). Any upcoming
// booking with no guest gets them added with sendUpdates=all, which is what makes Google send the invitation.
const guestOf = (ev, p) => {
  if (p.ge) return { email: p.ge, name: p.gn || p.first || "" };
  const m = /Guest: ([^<\n]*)<([^>\s]+@[^>\s]+)>/.exec(ev.description || ""); // bookings made before ge was stored
  return m ? { email: m[2], name: m[1].trim().replace(/,$/, "") } : null;
};
async function healGuests(now = Date.now()) {
  const q = new URLSearchParams({ privateExtendedProperty: "rem=1", singleEvents: "true", maxResults: "250",
    timeMin: new Date(now).toISOString(), timeMax: new Date(now + 120 * 86400000).toISOString() });
  const { items = [] } = await gapi(SCOPES.read, `https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`);
  const out = [];
  for (const ev of items) {
    const p = (ev.extendedProperties && ev.extendedProperties.private) || {};
    if (ev.status === "cancelled" || (ev.attendees || []).some((a) => !a.self && a.email !== CONFIG.host)) continue;
    if (now - Date.parse(ev.created) < 120000) continue; // a booking still mid-flight; book() is adding the guest itself
    // a race loser whose delete failed must never get an invite for a taken slot
    if (await lostRace(ev.id, Date.parse(ev.start.dateTime), Date.parse(ev.end.dateTime)).catch(() => false)) { console.error("NOT HEALED, lost the slot race", ev.id); continue; }
    const g = guestOf(ev, p);
    if (!g) { console.error("BOOKING WITH NO GUEST AND NO STORED EMAIL", ev.id); out.push({ event: ev.id, error: "no guest email" }); continue; }
    try {
      const fixed = await gapi(SCOPES.write, `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.id}?conferenceDataVersion=1&sendUpdates=all`,
        { method: "PATCH", body: JSON.stringify({ attendees: [{ email: g.email, displayName: g.name }] }) });
      const ok = (fixed.attendees || []).some((a) => a.email.toLowerCase() === g.email.toLowerCase());
      console.error("GUEST HEALED", ev.id, g.email, ok);
      out.push({ event: ev.id, healed: g.email, ok });
    } catch (e) { console.error("GUEST HEAL FAILED", ev.id, g.email, e.message); out.push({ event: ev.id, error: e.message.slice(0, 200) }); }
  }
  return out;
}

// Sends every reminder that is due. Claims each one on the event before sending, so a double run never double sends.
async function sendDueReminders(now = Date.now()) {
  const q = new URLSearchParams({ privateExtendedProperty: "rem=1", singleEvents: "true", maxResults: "250",
    timeMin: new Date(now - 5 * 3600000).toISOString(), timeMax: new Date(now + 2 * 86400000).toISOString() });
  const { items = [] } = await gapi(SCOPES.read, `https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`);
  const out = [];
  for (const ev of items) {
    const p = (ev.extendedProperties && ev.extendedProperties.private) || {};
    const guest = (ev.attendees || []).find((a) => !a.self && a.email !== CONFIG.host);
    const start = Date.parse(ev.start && ev.start.dateTime), end = Date.parse(ev.end && ev.end.dateTime);
    if (!guest || ev.status === "cancelled" || guest.responseStatus === "declined" || Number.isNaN(start)) continue;
    // due times come from the LIVE start every tick, so a meeting Hayat moved is reminded at its new time (the stored r1/r2 were fixed at booking)
    const live = reminderTimes(start, p.tz || "Europe/London", 0);
    for (const which of ["r1", "r2", "r3"]) {
      if (which !== "r3" && !(start > now)) continue;
      const due = which === "r3" ? end + 3600000 : Date.parse(live[which] || p[which] || ""); // r3: one hour after the call ends
      const flag = `${which}sent`;
      if (!due || p[flag] || due > now || now - due > 3 * 3600000) continue;
      const mark = (v, etag) => gapi(SCOPES.write, `https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.id}`,
        { method: "PATCH", body: JSON.stringify({ extendedProperties: { private: { ...p, [flag]: v } } }), ...(etag ? { headers: { "If-Match": etag } } : {}) }); // full map: never rely on patch merge semantics
      // the claim carries the event's etag: a second run that read the same event gets a 412 and skips (two overlapping runs used to both send)
      try { const claimed = await mark(new Date(now).toISOString(), ev.etag); ev.etag = claimed.etag || ev.etag; }
      catch (e) { if (/412|conditionNotMet/.test(String(e.message))) { out.push({ event: ev.id, which, skipped: "claimed by another run" }); continue; } throw e; }
      try {
        await sendMail({ from: CLARA, to: addr(guest.displayName || p.first, guest.email), subject: `Re: ${p.subj}`,
          text: reminderText(which, p, start, end), inReplyTo: p.mid || null });
        out.push({ event: ev.id, which, to: guest.email });
      } catch (e) {
        await mark("").catch(() => {});
        out.push({ event: ev.id, which, error: e.message.slice(0, 200) });
      }
    }
  }
  return out;
}

// Create the booking. Returns {start,end,meet,via}. Throws on conflict ("SLOT_TAKEN") or failure.
const validTz = (tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } catch (_) { return ""; } };

// Two guests who both passed the slot check and both inserted: the later-created event loses and is removed before any
// invitation goes out. The event is inserted WITHOUT the guest first, checked, then the guest is added (that PATCH sends the
// invitation), so the loser's guest never sees an invite or a cancellation.
async function lostRace(eventId, start, end) {
  const q = new URLSearchParams({ singleEvents: "true", timeMin: new Date(start - 1).toISOString(), timeMax: new Date(end).toISOString(), maxResults: "50" });
  const { items = [] } = await gapi(SCOPES.read, `https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`);
  const mine = items.find((e) => e.id === eventId);
  return items.some((e) => e.id !== eventId && e.status !== "cancelled" && e.start && e.start.dateTime && Date.parse(e.start.dateTime) < end && Date.parse(e.end.dateTime) > start
    && (!mine || Date.parse(e.created) <= Date.parse(mine.created)) && !(e.transparency === "transparent"));
}

async function book({ startIso, name, email, company, notes, guestTz, source, answers = {}, ip = "" }) {
  const cfg = await linkConfig(source);
  if (cfg.inactive) { const e = new Error("This link is not taking bookings at the moment."); e.code = "BAD_INPUT"; throw e; }
  const missing = cfg.questions.find((q) => q.required && !String(answers[q.label] || "").trim());
  if (missing) { const e = new Error(`Please answer: ${missing.label}`); e.code = "BAD_INPUT"; throw e; }
  guestTz = validTz(guestTz) || ""; // a bad zone used to throw after the event was already made: invite out, no confirmation, no reminders
  const start = Date.parse(startIso);
  const end = start + cfg.durationMin * 60000;
  const { slots: open } = await slots(Date.now(), cfg, { graceMin: 10 });
  if (!open.includes(new Date(start).toISOString())) { const e = new Error("SLOT_TAKEN"); e.code = "SLOT_TAKEN"; throw e; }

  const uid = uidFor(email, new Date(start).toISOString());
  const summary = `${name}${company ? ` (${company})` : ""} <> Hayat Amin`;
  const descLines = [
    `Booked at beyondelevation.com/call${source ? ` (${source})` : ""}.`,
    `Guest: ${name} <${email}>${company ? `, ${company}` : ""}`,
    guestTz ? `Guest timezone: ${guestTz}` : null,
    `Link: ${cfg.name} (/call${cfg.slug === "call" ? "" : `/${cfg.slug}`})`,
    ...cfg.questions.filter((q) => String(answers[q.label] || "").trim()).map((q) => `${q.label}: ${String(answers[q.label]).trim().slice(0, 1500)}`),
    notes ? `\nNotes from guest:\n${notes}` : null,
  ].filter(Boolean);
  const meetWanted = cfg.locationKind === "meet";
  const place = cfg.locationKind === "phone" ? "Phone call. Hayat will call you" : cfg.locationKind === "custom" ? cfg.locationText : "";

  let meet = "";
  let eventId = "";
  let via = "ics";
  try {
    const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    let ev = await gapi(SCOPES.write, `${base}?conferenceDataVersion=1&sendUpdates=none`,
      { method: "POST", body: JSON.stringify({
        iCalUID: uid, summary, description: descLines.join("\n"),
        start: { dateTime: new Date(start).toISOString() }, end: { dateTime: new Date(end).toISOString() },
        ...(meetWanted ? { conferenceData: { createRequest: { requestId: uid.slice(0, 20), conferenceSolutionKey: { type: "hangoutsMeet" } } } } : { location: place }),
        reminders: { useDefault: true },
        // the guest is stored on the event from the first write, so the 5-minute healer can always add them if the invite step fails
        extendedProperties: { private: { rem: "1", ge: email, gn: name } },
        source: { title: "beyondelevation.com/call", url: "https://beyondelevation.com/call" },
      }) });
    eventId = ev.id;
    if (await lostRace(eventId, start, end).catch(() => false)) {
      await gapi(SCOPES.write, `${base}/${eventId}?sendUpdates=none`, { method: "DELETE" }).catch(() => {});
      const e = new Error("SLOT_TAKEN"); e.code = "SLOT_TAKEN"; throw e;
    }
    // the guest goes on now; this PATCH is what sends the Google invitation
    // retried: on 28 Oct 2026 one transient 403 here left Kayla Luu's event with no guest and no Google invite
    for (let i = 0; ; i++) {
      try { ev = await gapi(SCOPES.write, `${base}/${eventId}?conferenceDataVersion=1&sendUpdates=all`, { method: "PATCH", body: JSON.stringify({ attendees: [{ email, displayName: name }] }) }); break; }
      catch (err) { if (i >= 3) { console.error("GUEST NOT ADDED, healer will retry", eventId, email, err.message); ev = null; break; } await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
    }
    if (!ev) ev = await gapi(SCOPES.read, `${base}/${eventId}?conferenceDataVersion=1`).catch(() => ({}));
    meet = ev.hangoutLink || "";
    // the Meet link can lag the insert; read the event once more rather than promising "the link follows" forever
    if (meetWanted && !meet) {
      const again = await gapi(SCOPES.read, `${base}/${eventId}?conferenceDataVersion=1`).catch(() => ({}));
      meet = again.hangoutLink || (((again.conferenceData || {}).entryPoints || []).find((x) => x.entryPointType === "video") || {}).uri || "";
    }
    via = "api";
  } catch (e) {
    if (e.code === "SLOT_TAKEN") throw e;
    if (eventId) { via = "api"; console.error("booking post-insert step failed, healer covers the invite", eventId, e.message); } else
    // Write scope not granted yet (or API hiccup): fall back to a mailed invite that also lands on the host's calendar.
    if (!/unauthorized_client|403|401/.test(String(e.message))) throw e;
  }

  const whenGuest = fmtWhen(start, guestTz || "Europe/London");
  const first = name.trim().split(/\s+/)[0];
  const text = [
    `Hi ${first},`,
    "",
    `Booked. ${whenGuest}, ${cfg.durationMin} minutes${!meetWanted ? `. ${place}` : meet ? `, on Google Meet: ${meet}` : ". Hayat will send the Google Meet link before the call"}.`,
    "",
    ...(cfg.emailNote ? [cfg.emailNote, ""] : []),
    via === "api" ? "Google Calendar sends the invite separately, accept it there." : "The invite is attached, it should land in your calendar on its own.",
    "If you need to move it, reply to this email.",
    "",
    "Hayat Amin",
    "Beyond Elevation",
  ].join("\n");
  const icsText = ics({ uid, start, end, guest: { name, email }, summary, description: descLines.join("\n") + (meet ? `\n\nGoogle Meet: ${meet}` : ""), meet: meet || place });
  const sent = await sendMail({ to: addr(name, email), cc: via === "ics" ? CONFIG.host : null, subject: `Call booked: ${whenGuest}`, text, icsText: via === "ics" ? icsText : null,
    slot: `${new Date(start).toISOString()}/${new Date(end).toISOString()}` });

  // Clara's two reminders are fixed now, at booking time, on the event itself. api/reminders only sends what is due.
  if (eventId) await scheduleReminders({ eventId, start, guestTz, first, sentId: sent && sent.id, subject: `Call booked: ${whenGuest}`, meet, ip, email, name })
    .catch((e) => console.error("reminders not scheduled", e.message));

  fetch("https://us.i.posthog.com/capture/", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: CONFIG.posthogKey, event: "booking_made", distinct_id: email,
      properties: { site: "beyondelevation", booking_source: source || "", start: new Date(start).toISOString(), via, company: company || "" } }) }).catch(() => {});

  return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), meet, via, uid, link: publicLink(cfg) };
}

module.exports = { healGuests, guestOf, reminderTimes, reminderText, sendDueReminders, CONFIG, linkConfig, slots, book, busy, calendarTz, zonedToUtc, overlaps, token, SCOPES, sendMail, ics };
