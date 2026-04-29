// Lead-magnet form handler. Stores contact in Loops + redirects to thank-you.
// Vercel serverless. Reads LOOPS_API_KEY from env.

const LOOPS_API = "https://app.loops.so/api/v1/contacts/create";
const LOOPS_UPDATE = "https://app.loops.so/api/v1/contacts/update";

const isValidEmail = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;

async function readBody(req) {
  // Vercel sets req.body for application/json automatically. Fallback for form-encoded.
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch {}
    const params = new URLSearchParams(req.body);
    return Object.fromEntries(params.entries());
  }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve(Object.fromEntries(new URLSearchParams(data).entries())); }
    });
    req.on("error", () => resolve({}));
  });
}

module.exports = async (req, res) => {
  // CORS for our own domain only.
  res.setHeader("Access-Control-Allow-Origin", "https://beyondelevation.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method-not-allowed" });

  const body = await readBody(req);
  const email = (body.email || "").trim().toLowerCase();
  const firstName = (body.firstName || body.name || "").trim().slice(0, 60);

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "invalid-email" });
  }

  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) {
    console.error("Missing LOOPS_API_KEY");
    return res.status(500).json({ ok: false, error: "config" });
  }

  const payload = {
    email,
    firstName: firstName || undefined,
    source: "ip-leverage-audit",
    userGroup: "lead-magnet",
    subscribed: true,
  };

  // 3x retry per CLAUDE.md routine resilience rule.
  let createOk = false;
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(LOOPS_API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const text = await resp.text();
      let json = {};
      try { json = JSON.parse(text); } catch {}

      if (resp.ok && json.success !== false) {
        createOk = true;
        break;
      }

      // Loops returns 409 for "Email already on list" — fall back to update.
      if (resp.status === 409 || /already/i.test(json.message || "")) {
        try {
          const u = await fetch(LOOPS_UPDATE, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          if (u.ok) { createOk = true; break; }
          lastErr = `update_status=${u.status}`;
        } catch (e) { lastErr = `update_throw=${e.message}`; }
      } else {
        lastErr = `status=${resp.status} body=${text.slice(0, 200)}`;
      }
    } catch (e) {
      lastErr = `throw=${e.message}`;
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 500 + attempt * 1000));
  }

  if (!createOk) {
    console.error("Loops create failed:", lastErr);
    return res.status(502).json({ ok: false, error: "upstream", detail: lastErr });
  }

  const redirect = process.env.LEAD_MAGNET_REDIRECT || "/resources/thank-you/";

  // If browser prefers HTML form post (no fetch), redirect.
  const accept = req.headers.accept || "";
  if (accept.includes("text/html") && !accept.includes("application/json")) {
    res.setHeader("Location", redirect);
    return res.status(303).end();
  }

  return res.status(200).json({ ok: true, redirect });
};
