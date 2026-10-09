// Booking widget for /call. Talks to /api/slots and /api/book. No dependencies.
(function () {
  const root = document.getElementById("book");
  if (!root) return;
  const qs = new URLSearchParams(location.search);
  const source = (qs.get("s") || qs.get("ref") || "").slice(0, 40);
  let tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  let data = null; // {tz, duration, slots}
  let month = null; // Date (1st of month, local)
  let day = null; // "YYYY-MM-DD" in visitor tz
  let pick = null; // ISO start

  const fmt = (iso, opt) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opt }).format(new Date(iso));
  const ymd = (iso) => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
    return p; // en-CA gives YYYY-MM-DD
  };
  const el = (h) => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function byDay() {
    const m = {};
    for (const s of data.slots) (m[ymd(s)] = m[ymd(s)] || []).push(s);
    return m;
  }

  function tzOptions() {
    let list = [];
    try { list = Intl.supportedValuesOf("timeZone"); } catch (_) { list = ["Europe/London", "Asia/Dubai", "America/New_York", "America/Los_Angeles", "Europe/Paris", "Asia/Singapore"]; }
    if (!list.includes(tz)) list.unshift(tz);
    return list.map((z) => `<option value="${z}"${z === tz ? " selected" : ""}>${z.replace(/_/g, " ")}</option>`).join("");
  }

  function render() {
    if (!data) return;
    const days = byDay();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startDow = (first.getDay() + 6) % 7; // Monday first
    const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const todayKey = ymd(new Date().toISOString());
    let cells = "";
    for (let i = 0; i < startDow; i++) cells += `<span class="bk-cell bk-pad"></span>`;
    for (let d = 1; d <= dim; d++) {
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const open = !!days[key];
      cells += `<button type="button" class="bk-cell${open ? " open" : ""}${key === day ? " sel" : ""}${key === todayKey ? " today" : ""}" data-day="${key}" ${open ? "" : "disabled"}>${d}</button>`;
    }
    const monthName = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const now = new Date();
    const canPrev = month > new Date(now.getFullYear(), now.getMonth(), 1);
    const lastSlot = data.slots.length ? new Date(data.slots[data.slots.length - 1]) : now;
    const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= lastSlot;

    const times = day ? (days[day] || []) : [];
    root.innerHTML = `
      <div class="bk-head">
        <div><p class="mono bk-step">1. Pick a day</p></div>
        <label class="bk-tz"><span class="mono">Times shown in</span>
          <select id="bk-tz">${tzOptions()}</select></label>
      </div>
      <div class="bk-grid-wrap">
        <div class="bk-cal">
          <div class="bk-month">
            <button type="button" class="bk-nav" id="bk-prev" ${canPrev ? "" : "disabled"} aria-label="Previous month">&larr;</button>
            <b>${monthName}</b>
            <button type="button" class="bk-nav" id="bk-next" ${canNext ? "" : "disabled"} aria-label="Next month">&rarr;</button>
          </div>
          <div class="bk-dows">${["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((x) => `<span>${x}</span>`).join("")}</div>
          <div class="bk-cells">${cells}</div>
        </div>
        <div class="bk-times">
          <p class="mono bk-step">2. Pick a time</p>
          ${day ? `<p class="bk-dayname">${fmt(times[0] || new Date(day + "T12:00:00Z").toISOString(), { weekday: "long", day: "numeric", month: "long" })}</p>` : `<p class="bk-hint">Choose a day on the left. ${data.duration} minutes, Google Meet.</p>`}
          <div class="bk-list">${times.map((s) => `<button type="button" class="bk-time${s === pick ? " sel" : ""}" data-start="${s}">${fmt(s, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</button>`).join("")}</div>
        </div>
      </div>
      <form id="bk-form" class="bk-form${pick ? "" : " hidden"}" novalidate>
        <p class="mono bk-step">3. Your details</p>
        <p class="bk-picked">${pick ? `${fmt(pick, { weekday: "long", day: "numeric", month: "long" })}, ${fmt(pick, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} to ${fmt(new Date(Date.parse(pick) + data.duration * 60000).toISOString(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} (${tz.replace(/_/g, " ")})` : ""}</p>
        <div class="bk-row"><label>Name<input name="name" required autocomplete="name" maxlength="80"></label>
        <label>Email<input name="email" type="email" required autocomplete="email" maxlength="120"></label></div>
        <label>Company <span class="mono">optional</span><input name="company" autocomplete="organization" maxlength="80"></label>
        <label>What should we look at first? <span class="mono">optional</span><textarea name="notes" rows="3" maxlength="1500"></textarea></label>
        <input name="website" tabindex="-1" autocomplete="off" class="bk-hp" aria-hidden="true">
        <p class="bk-err" id="bk-err" role="alert"></p>
        <button class="btn lg" type="submit" id="bk-submit">Confirm the call <span class="arw">&rarr;</span></button>
      </form>`;

    root.querySelector("#bk-tz").onchange = (e) => { tz = e.target.value; day = null; pick = null; render(); };
    root.querySelector("#bk-prev").onclick = () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); render(); };
    root.querySelector("#bk-next").onclick = () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); render(); };
    root.querySelectorAll(".bk-cell.open").forEach((b) => (b.onclick = () => { day = b.dataset.day; pick = null; render(); }));
    root.querySelectorAll(".bk-time").forEach((b) => (b.onclick = () => { pick = b.dataset.start; render(); root.querySelector("#bk-form input[name=name]").focus(); }));
    root.querySelector("#bk-form").onsubmit = submit;
  }

  async function submit(e) {
    e.preventDefault();
    const f = e.target;
    const err = f.querySelector("#bk-err");
    const btn = f.querySelector("#bk-submit");
    err.textContent = "";
    if (!f.name.value.trim() || !f.email.checkValidity()) { err.textContent = "Name and a working email, please."; return; }
    btn.disabled = true; btn.textContent = "Booking…";
    try {
      const r = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: pick, name: f.name.value, email: f.email.value, company: f.company.value, notes: f.notes.value, tz, source, website: f.website.value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        err.textContent = j.error || "Something broke. Email hayat@beyondelevation.com and we will fix it by hand.";
        btn.disabled = false; btn.innerHTML = 'Confirm the call <span class="arw">&rarr;</span>';
        if (r.status === 409) { await load(); }
        return;
      }
      root.innerHTML = `<div class="bk-done">
        <p class="mono">Booked</p>
        <h2>${esc(fmt(j.start, { weekday: "long", day: "numeric", month: "long" }))}<br>${esc(fmt(j.start, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }))} to ${esc(fmt(j.end, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }))} <span class="mono">${esc(tz.replace(/_/g, " "))}</span></h2>
        <p>The invite is on its way to <b>${esc(f.email.value.trim())}</b>${j.meet ? ` with the Google Meet link` : ""}. Nothing to prepare.</p>
        ${j.meet ? `<p><a class="btn" href="${esc(j.meet)}">Google Meet link <span class="arw">&rarr;</span></a></p>` : ""}
        <p class="bk-hint">Need to move it? Reply to the confirmation email.</p>
      </div>`;
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (_) {
      err.textContent = "Network hiccup. Try again, or email hayat@beyondelevation.com.";
      btn.disabled = false; btn.innerHTML = 'Confirm the call <span class="arw">&rarr;</span>';
    }
  }

  async function load() {
    root.innerHTML = `<p class="bk-hint">Checking the diary…</p>`;
    try {
      const r = await fetch("/api/slots", { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      data = await r.json();
      if (!data.slots.length) throw new Error("empty");
      if (!month) { const f = new Date(data.slots[0]); month = new Date(f.getFullYear(), f.getMonth(), 1); }
      render();
    } catch (_) {
      root.innerHTML = `<div class="bk-done"><p class="mono">The diary is not answering</p><p>Email <a href="mailto:hayat@beyondelevation.com?subject=Call%20booking">hayat@beyondelevation.com</a> with two or three times that suit you and we will confirm one by hand.</p></div>`;
    }
  }
  load();
})();
