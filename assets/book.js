// Booking widget for /call. Talks to /api/slots and /api/book. No dependencies.
(function () {
  const root = document.getElementById("book");
  if (!root) return;
  const qs = new URLSearchParams(location.search);
  const source = (qs.get("s") || qs.get("ref") || "").slice(0, 40);
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  let tz = deviceTz || "Europe/London";
  let tzHow = deviceTz ? "device" : "default"; // device | ip | default | chosen
  let data = null; // {tz, duration, slots}
  let rawSlots = [];
  // Only offer hours a guest would take: 7am to 9pm in THEIR zone. His diary runs 9-9 Dubai,
  // which put midnight-to-6am slots in front of US founders, and two booked 3:30 AM.
  const sane = (iso) => { const h = +new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)); return h >= 7 && h < 21; };
  const applyTz = () => { data.slots = rawSlots.filter(sane); };
  let month = null; // Date (1st of month, local)
  let day = null; // "YYYY-MM-DD" in visitor tz
  let pick = null; // ISO start

  const fmt = (iso, opt) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opt }).format(new Date(iso));
  const ymd = (iso) => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
    return p; // en-CA gives YYYY-MM-DD
  };
  // 12-hour clock with AM/PM: US guests read a 24h "03:30" as afternoon and booked 3:30 AM.
  const clock = (iso) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
  const el = (h) => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstChild; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function byDay() {
    const m = {};
    for (const s of data.slots) (m[ymd(s)] = m[ymd(s)] || []).push(s);
    return m;
  }

  function tzOptions() {
    let list = [];
    try { list = Intl.supportedValuesOf("timeZone"); } catch (_) { list = ["Europe/London", "Asia/Dubai", "America/New_York", "America/Los_Angeles", "Europe/Paris", "Asia/Singapore"]; }
    if (!list.includes(tz)) list.unshift(tz);
    return list.map((z) => `<option value="${esc(z)}"${z === tz ? " selected" : ""}>${esc(z.replace(/_/g, " "))}</option>`).join("");
  }

  // City from the visitor's IP (Vercel geo). Only shown when the picked zone is that IP's zone,
  // so "2:47 AM in Philadelphia" is never paired with the wrong clock.
  const here = () => (data && data.ipCity && data.ipTz === tz ? data.ipCity : "");
  function ipSuggest() {
    if (!data || !data.ipTz || data.ipTz === tz || tzHow === "chosen") return "";
    const z = data.ipTz.replace(/_/g, " ");
    return `<button type="button" class="bk-tzsuggest" id="bk-tzsuggest">${data.ipCity ? `Looks like you are in ${esc(data.ipCity)}.` : "Looks like you are elsewhere."} Use ${esc(z)} time (${new Intl.DateTimeFormat("en-US", { timeZone: data.ipTz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date())}) &rarr;</button>`;
  }

  function tzNote() {
    const z = tz.replace(/_/g, " ");
    if (tzHow === "chosen") return `All times below are in ${z}.`;
    if (tzHow === "default") return `We could not detect where you are. Pick your city so the times are right.`;
    return `Detected from your ${tzHow === "ip" ? "location" : "device"}. Wrong? Change it before you pick a time.`;
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
      const label = new Date(key + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
      cells += `<button type="button" class="bk-cell${open ? " open" : ""}${key === day ? " sel" : ""}${key === todayKey ? " today" : ""}" data-day="${key}" aria-label="${label}${open ? "" : ", no times"}" aria-pressed="${key === day}" ${open ? "" : "disabled"}>${d}</button>`;
    }
    const monthName = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const now = new Date();
    const canPrev = month > new Date(now.getFullYear(), now.getMonth(), 1);
    const lastKey = data.slots.length ? ymd(data.slots[data.slots.length - 1]) : ymd(now.toISOString());
    const nextKey = `${month.getFullYear()}-${String(month.getMonth() + 2).padStart(2, "0")}-01`.replace(/-13-01$/, "-01-01");
    const canNext = nextKey <= lastKey; // compared as yyyy-mm-dd in the picked zone (the device clock put a 7-hour-ahead guest a month out)

    const times = day ? (days[day] || []) : [];
    if (data.link && data.link.inactive) { root.innerHTML = `<div class="bk-done"><p class="mono">Not taking bookings</p><p>This link is paused for now. Email <a href="mailto:hayat@beyondelevation.com?subject=Call%20booking">hayat@beyondelevation.com</a> and we will find a time by hand.</p></div>`; return; }
    const focused = document.activeElement && document.activeElement.id; // the whole frame re-renders; put focus back where it was
    root.innerHTML = `
      ${data.link && data.link.intro ? `<p class="bk-hint" style="margin:0 0 14px">${esc(data.link.intro)}</p>` : ""}
      <div class="bk-tzband" id="bk-tzband">
        <span class="bk-tzicon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg></span>
        <div class="bk-tzbody">
          <p class="bk-tzkicker">Step 1</p>
          <b class="bk-tztitle">Please select your time zone first</b>
          <div class="bk-tzrow">
            <div class="bk-tzsel"><select id="bk-tz" aria-label="Your time zone">${tzOptions()}</select></div>
            <span class="bk-tzclock"><svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="#22C55E"/></svg>${clock(new Date().toISOString())} ${here() ? `in ${esc(here())}` : "there now"}</span>
          </div>
          ${ipSuggest()}
          <p class="bk-tznote">${tzNote()}</p>
        </div>
      </div>
      <div class="bk-head"><p class="mono bk-step">2. Pick a day</p></div>
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
          <p class="mono bk-step">3. Pick a time</p>
          ${day ? `<p class="bk-dayname">${fmt(times[0] || new Date(day + "T12:00:00Z").toISOString(), { weekday: "long", day: "numeric", month: "long" })}</p>` : `<p class="bk-hint">${data.slots.length ? "Choose a day on the left." : "No times between 7am and 9pm in your zone in the next few days. Email hayat@beyondelevation.com and we will find one."} ${data.duration} minutes, ${esc((data.link && data.link.location) || "Google Meet")}.</p>`}
          <div class="bk-list">${times.map((s) => `<button type="button" class="bk-time${s === pick ? " sel" : ""}" data-start="${s}" aria-pressed="${s === pick}">${clock(s)}</button>`).join("")}</div>
        </div>
      </div>
      <form id="bk-form" class="bk-form${pick ? "" : " hidden"}" novalidate>
        <p class="mono bk-step">4. Your details</p>
        <p class="bk-picked">${pick ? `${fmt(pick, { weekday: "long", day: "numeric", month: "long" })}, ${clock(pick)} to ${clock(new Date(Date.parse(pick) + data.duration * 60000).toISOString())} (${tz.replace(/_/g, " ")})` : ""}</p>
        <div class="bk-row"><label>Name<input name="name" required autocomplete="name" maxlength="80"></label>
        <label>Email<input name="email" type="email" required autocomplete="email" maxlength="120"></label></div>
        <label>Company <span class="mono">optional</span><input name="company" autocomplete="organization" maxlength="80"></label>
        ${((data.link && data.link.questions) || []).map((q, i) => `<label>${esc(q.label)}${q.required ? "" : ' <span class="mono">optional</span>'}${q.kind === "textarea" ? `<textarea name="q${i}" rows="3" maxlength="1500"${q.required ? " required" : ""}></textarea>` : `<input name="q${i}" maxlength="300"${q.required ? " required" : ""}>`}</label>`).join("")}
        <label>What should we look at first? <span class="mono">optional</span><textarea name="notes" rows="3" maxlength="1500"></textarea></label>
        <input name="bk_zq9" tabindex="-1" autocomplete="off" class="bk-hp" aria-hidden="true">
        <p class="bk-err" id="bk-err" role="alert"></p>
        <button class="btn lg" type="submit" id="bk-submit">Confirm the call <span class="arw">&rarr;</span></button>
      </form>`;

    const sug = root.querySelector("#bk-tzsuggest");
    if (sug) sug.onclick = () => { tz = data.ipTz; tzHow = "ip"; day = null; pick = null; applyTz(); render(); };
    root.querySelector("#bk-tz").onchange = (e) => { tz = e.target.value; tzHow = "chosen"; day = null; pick = null; applyTz(); render(); };
    root.querySelector("#bk-prev").onclick = () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); render(); };
    root.querySelector("#bk-next").onclick = () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); render(); };
    root.querySelectorAll(".bk-cell.open").forEach((b) => (b.onclick = () => { day = b.dataset.day; pick = null; render(); }));
    root.querySelectorAll(".bk-time").forEach((b) => (b.onclick = () => { pick = b.dataset.start; render(); root.querySelector("#bk-form input[name=name]").focus(); }));
    root.querySelector("#bk-form").onsubmit = submit;
    if (focused) { const f = root.querySelector("#" + focused); if (f) f.focus(); }
  }

  async function submit(e) {
    e.preventDefault();
    const f = e.target;
    const err = f.querySelector("#bk-err");
    const btn = f.querySelector("#bk-submit");
    err.textContent = "";
    if (!f.name.value.trim() || !f.email.checkValidity()) { err.textContent = "Name and a working email, please."; return; }
    const qs = (data.link && data.link.questions) || [];
    const answers = {};
    qs.forEach((q, i) => { answers[q.label] = f[`q${i}`].value; });
    const gap = qs.find((q, i) => q.required && !f[`q${i}`].value.trim());
    if (gap) { err.textContent = `Please answer: ${gap.label}`; return; }
    btn.disabled = true; btn.textContent = "Booking…";
    try {
      const r = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: pick, name: f.name.value, email: f.email.value, company: f.company.value, notes: f.notes.value, answers, tz, source, website: f.bk_zq9.value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        err.textContent = j.error || "Something broke. Email hayat@beyondelevation.com and we will fix it by hand.";
        btn.disabled = false; btn.innerHTML = 'Confirm the call <span class="arw">&rarr;</span>';
        if (r.status === 409) { const keep = { name: f.name.value, email: f.email.value, company: f.company.value, notes: f.notes.value }; pick = null; await load(true); const f2 = root.querySelector("#bk-form"); if (f2) { f2.name.value = keep.name; f2.email.value = keep.email; f2.company.value = keep.company; f2.notes.value = keep.notes; } const e2 = root.querySelector("#bk-err"); if (e2) e2.textContent = j.error || "That time has just gone. Pick another."; }
        return;
      }
      const link = j.link || {};
      if (link.redirectUrl) { location.href = link.redirectUrl; return; }
      const when = j.start ? `<h2>${esc(fmt(j.start, { weekday: "long", day: "numeric", month: "long" }))}<br>${esc(clock(j.start))} to ${esc(clock(j.end))} <span class="mono">${esc(tz.replace(/_/g, " "))}</span></h2>` : "";
      root.innerHTML = `<div class="bk-done">
        <p class="mono">Booked</p>
        ${when}
        <p>The invite is on its way to <b>${esc(f.email.value.trim())}</b>${j.meet ? ` with the Google Meet link` : ""}. Nothing to prepare.</p>
        ${j.meet ? `<p><a class="btn" href="${esc(j.meet)}">Google Meet link <span class="arw">&rarr;</span></a></p>` : ""}
        ${link.confirmText ? `<p>${esc(link.confirmText)}</p>` : ""}
        <p class="bk-hint">Need to move it? Reply to the confirmation email.</p>
      </div>`;
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (_) {
      err.textContent = "Network hiccup. Try again, or email hayat@beyondelevation.com.";
      btn.disabled = false; btn.innerHTML = 'Confirm the call <span class="arw">&rarr;</span>';
    }
  }

  async function load(quiet) {
    if (!quiet) root.innerHTML = `<p class="bk-hint">Checking the diary…</p>`;
    try {
      const r = await fetch(`/api/slots?s=${encodeURIComponent(source)}${["from", "to"].filter((k) => qs.get(k)).map((k) => `&${k}=${encodeURIComponent(qs.get(k))}`).join("")}`, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      data = await r.json();
      rawSlots = data.slots || []; // an empty list is a real answer (fully booked, or a paused link), not an outage
      // Device clock wins (VPNs fool IP lookups); the IP guess only fills in when the device says nothing useful.
      if ((!deviceTz || /^(Etc\/)?UTC$/.test(deviceTz)) && data.ipTz && tzHow !== "chosen") { tz = data.ipTz; tzHow = "ip"; }
      applyTz();
      if (!month) { const f = data.slots.length ? new Date(data.slots[0]) : new Date(); month = new Date(f.getFullYear(), f.getMonth(), 1); }
      render();
    } catch (_) {
      root.innerHTML = `<div class="bk-done"><p class="mono">The diary is not answering</p><p>Email <a href="mailto:hayat@beyondelevation.com?subject=Call%20booking">hayat@beyondelevation.com</a> with two or three times that suit you and we will confirm one by hand.</p></div>`;
    }
  }
  load();
})();
