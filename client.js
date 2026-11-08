/* Fourdots Links: in-page behaviour (signup steps, locations, booking sheet, schedules, tracking). */
(() => {
  const L = window.LINKS || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const px = (...a) => { try { if (window.fbq) window.fbq(...a); } catch {} };
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const beacon = (kind, block, target) => {
    try {
      const body = JSON.stringify({ c: L.c, p: L.p, b: block || null, k: kind, t: target || null });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/t", new Blob([body], { type: "application/json" }));
      else fetch("/api/t", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {}
  };

  /* schedules: cards appear and disappear on time without a reload */
  const nums = v => String(v || "").split(",").filter(x => x !== "").map(Number);
  const todayDow = () => tzParts().day;
  function schedule() {
    const now = Date.now(), day = todayDow();
    $$("[data-s],[data-e],[data-days]").forEach(el => {
      const s = el.dataset.s ? Date.parse(el.dataset.s) : null, e = el.dataset.e ? Date.parse(el.dataset.e) : null;
      const days = nums(el.dataset.days);
      el.hidden = !((!s || s <= now) && (!e || e > now) && (!days.length || days.includes(day)));
    });
    rankCards();
  }
  /* day specials: today's specials first, then cards featured today, then the visitor's location before the other one */
  function rankCards() {
    const day = todayDow(), loc = window.LINKS_LOCKEY || "";
    const cards = $$("a.card[data-b]"); if (cards.length < 2) return;
    const runs = []; let cur = [];
    cards.forEach(c => { if (cur.length && cur[cur.length - 1].nextElementSibling !== c) { runs.push(cur); cur = []; } cur.push(c); });
    if (cur.length) runs.push(cur);
    runs.forEach(run => {
      if (run.length < 2) return;
      if (!run[0].dataset.k) run.forEach((c, i) => c.dataset.k = i);
      const score = c => { const d = nums(c.dataset.days), f = nums(c.dataset.feat), l = String(c.dataset.at || "").split(",").filter(Boolean);
        return (d.length && d.includes(day) ? 4 : 0) + (f.includes(day) ? 2 : 0) + (loc && l.length ? (l.includes(loc) ? 1 : -1) : 0); };
      const sorted = run.slice().sort((a, b) => score(b) - score(a) || a.dataset.k - b.dataset.k);
      if (sorted.every((c, i) => c === run[i])) return;
      const anchor = run[run.length - 1].nextSibling, parent = run[0].parentNode;
      sorted.forEach(c => parent.insertBefore(c, anchor));
    });
  }
  setInterval(schedule, 60000);

  /* tracking: one view per load, every outbound tap */
  beacon("view");
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    const b = a.closest("[data-b]"), href = a.getAttribute("href") || "", ev = a.dataset.ev;
    beacon("click", b && b.dataset.b, href);
    const name = (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 80);
    if (ev) px("track", ev, { content_name: name }); else if (/^https?:/i.test(href)) px("trackCustom", "LinkClick", { content_name: name });
    if (a.dataset.sheet != null) { e.preventDefault(); openSheet(href, a.dataset.sheet || name); }
  }, true);

  /* booking sheet: the booking page opens over the link page instead of leaving it */
  let sheetEls = null;
  function openSheet(url, title) {
    if (!sheetEls) {
      const bg = document.createElement("div"); bg.className = "sheet-bg";
      const sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true");
      sh.innerHTML = `<div class="bar"><b></b><span style="display:flex;gap:12px;align-items:center"><a target="_blank" rel="noopener">Open in browser</a><button class="x" type="button" aria-label="Close">×</button></span></div><iframe title="Booking" allow="payment"></iframe>`;
      document.body.append(bg, sh);
      const close = () => { bg.classList.remove("on"); sh.classList.remove("on"); document.body.style.overflow = ""; setTimeout(() => { bg.hidden = sh.hidden = true; sh.querySelector("iframe").src = "about:blank"; }, 280); };
      bg.onclick = close; sh.querySelector(".x").onclick = close;
      document.addEventListener("keydown", e => { if (e.key === "Escape" && sh.classList.contains("on")) close(); });
      sheetEls = { bg, sh };
    }
    const { bg, sh } = sheetEls;
    sh.querySelector("b").textContent = title || "";
    sh.querySelector(".bar a").href = url;
    sh.querySelector("iframe").src = url;
    bg.hidden = sh.hidden = false; document.body.style.overflow = "hidden";
    requestAnimationFrame(() => { bg.classList.add("on"); sh.classList.add("on"); });
  }

  /* locations: remember the chosen room; show open now from that room's hours */
  const tzParts = () => {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: L.tz || "America/Toronto", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const g = k => (p.find(x => x.type === k) || {}).value;
    return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday")), mins: (+g("hour") % 24) * 60 + +g("minute") };
  };
  const toM = t => { const m = String(t).trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/); if (!m) return null; let h = +m[1]; if (m[3] === "pm" && h < 12) h += 12; if (m[3] === "am" && h === 12) h = 0; return h * 60 + (+m[2] || 0); };
  const span = s => { const p = String(s || "").split(/\s*[-–]\s*/); if (p.length !== 2) return null; const a = toM(p[0]), b = toM(p[1]); return a == null || b == null ? null : [a, b <= a ? b + 1440 : b]; };
  function openState(hours) {
    const { day, mins } = tzParts();
    const today = span(hours[day]), y = span(hours[(day + 6) % 7]);
    if (y && y[1] > 1440 && mins < y[1] - 1440) return { open: true, label: "Open now" };
    if (today && mins >= today[0] && mins < today[1]) return { open: true, label: `Open now · until ${String(hours[day]).split(/\s*[-–]\s*/)[1]}` };
    if (today && mins < today[0]) return { open: false, label: `Opens today ${String(hours[day]).split(/\s*[-–]\s*/)[0]}` };
    return { open: false, label: hours[day] ? "Closed now" : "Closed today" };
  }
  $$("[data-locs]").forEach(box => {
    const pans = $$("[data-pan]", box), segs = $$("[data-loc]", box);
    const paint = pan => {
      try {
        const hours = JSON.parse(pan.dataset.hours || "[]"); if (!hours.some(Boolean)) return;
        const st = openState(hours); pan.querySelector(".dot").classList.toggle("on", st.open); pan.querySelector(".ot").textContent = st.label;
        const td = tzParts().day; $$("tr[data-day]", pan).forEach(tr => tr.classList.toggle("today", +tr.dataset.day === td));
      } catch {}
    };
    const pick = key => {
      pans.forEach(p => { p.hidden = p.dataset.pan !== key; if (!p.hidden) paint(p); });
      segs.forEach(b => { b.classList.toggle("on", b.dataset.loc === key); b.setAttribute("aria-selected", b.dataset.loc === key); });
      window.LINKS_LOC = (pans.find(p => p.dataset.pan === key) || {}).dataset?.tag || "";
      window.LINKS_LOCKEY = key; rankCards();
    };
    segs.forEach(b => b.onclick = () => { pick(b.dataset.loc); store.set("links_loc_" + L.c, b.dataset.loc); });
    const saved = store.get("links_loc_" + L.c);
    pick(pans.some(p => p.dataset.pan === saved) ? saved : pans[0].dataset.pan);
    setInterval(() => pans.filter(p => !p.hidden).forEach(paint), 60000);
  });

  /* reservation picker: guests, day and time from this location's hours, then the booking page opens prefilled */
  const pad = n => String(n).padStart(2, "0");
  const fmtT = m => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${pad(mm)} ${h < 12 ? "am" : "pm"}`; };
  $$("[data-rsv]").forEach(f => {
    const pan = f.closest("[data-pan]"), a = $("a", f), base = f.dataset.rsv;
    let hours = []; try { hours = JSON.parse((pan && pan.dataset.hours) || "[]"); } catch {}
    const [P, D, T] = ["p", "d", "t"].map(n => $(`select[name=${n}]`, f));
    P.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${i === 1 ? "selected" : ""}>${i + 1}</option>`).join("") + `<option value="13">13+</option>`;
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: L.tz || "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const g = k => +(parts.find(x => x.type === k) || {}).value;
    const today = Date.UTC(g("year"), g("month") - 1, g("day")), nowM = tzParts().mins;
    const slots = (dow, isToday) => {
      const s = span(hours[dow]); if (!s) return [];
      const out = []; for (let m = Math.ceil(s[0] / 30) * 30; m <= Math.min(s[1] - 60, 1410); m += 30) if (!isToday || m > nowM + 30) out.push(m);
      return out;
    };
    const days = [];
    for (let i = 0; i < 21 && days.length < 14; i++) {
      const d = new Date(today + i * 864e5), dow = d.getUTCDay(), s = slots(dow, i === 0);
      if (!s.length) continue;
      const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
      days.push({ iso: d.toISOString().slice(0, 10), label, s });
    }
    if (!days.length) { f.querySelector(".rsel").hidden = true; return; }
    D.innerHTML = days.map((d, i) => `<option value="${i}">${esc(d.label)}</option>`).join("");
    const fillT = keep => {
      const s = days[+D.value].s, want = keep != null && s.includes(keep) ? keep : s.includes(1140) ? 1140 : (s.find(m => m >= 1080) ?? s[0]);
      T.innerHTML = s.map(m => `<option value="${m}" ${m === want ? "selected" : ""}>${fmtT(m)}</option>`).join("");
    };
    const update = () => {
      try {
        const d = days[+D.value], m = +T.value, dt = `${d.iso}T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`;
        const u = new URL(base);
        u.searchParams.set("covers", P.value); u.searchParams.set("dateTime", dt); u.searchParams.set("p", P.value); u.searchParams.set("sd", dt);
        a.href = u.toString();
      } catch {}
    };
    D.onchange = () => { fillT(+T.value); update(); };
    P.onchange = T.onchange = update;
    fillT(); update();
  });

  /* stepped signup: phone, then email, then first name; each step saves on its own */
  const STEPS = [
    { key: "phone", k: "Step 1 of 3", type: "tel", mode: "tel", ac: "tel", ph: "(416) 555-0123", btn: "Continue" },
    { key: "email", k: "Step 2 of 3", t: "Add your email", p: "So nothing gets lost if you miss a text.", type: "email", mode: "email", ac: "email", ph: "Email address", btn: "Continue", skip: true },
    { key: "name", k: "Step 3 of 3", t: "What should we call you?", p: "First name only.", type: "text", mode: "text", ac: "given-name", ph: "First name", btn: "Finish", skip: true },
  ];
  function fmtPhone(v) {
    if (/^\s*\+\s*([02-9]|$)/.test(v)) return v.trimStart();
    let d = v.replace(/\D/g, ""); if (d === "1") return v.replace(/[^+1]/g, ""); if (d[0] === "1") d = d.slice(1); d = d.slice(0, 10);
    if (d.length <= 3) return d; if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`; return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  async function send(body) {
    const r = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Something went wrong. Try again."); return j;
  }
  $$("[data-signup]").forEach(root => {
    const blockId = root.dataset.signup, title = root.dataset.title, body = root.dataset.body;
    if (store.get("links_su_" + blockId)) { root.innerHTML = `<div class="top"><span class="k">You're on the list</span><span class="steps"><i class="on"></i><i class="on"></i><i class="on"></i></span></div><h3 class="d">${esc(root.dataset.doneTitle)}</h3><p>${esc(root.dataset.done)}</p>`; return; }
    let step = 0, token = null;
    root.innerHTML = `<div class="top"><span class="k"></span><span class="steps"><i class="on"></i><i></i><i></i></span></div><h3 class="d"></h3><p></p>
      <form novalidate><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><input class="ji"><div class="err" hidden></div>
      <div class="acts"><button class="go" type="submit"></button><button class="skip" type="button" hidden>Skip</button></div><div class="fine">${esc(L.consent)}</div></form>`;
    const q = s => root.querySelector(s), i = q(".ji");
    const show = () => {
      const S = STEPS[step];
      q(".k").textContent = S.k; [...q(".steps").children].forEach((x, n) => x.classList.toggle("on", n <= step));
      q("h3").textContent = step ? S.t : title; q("p").textContent = step ? S.p : body; q("p").hidden = !q("p").textContent;
      i.value = ""; i.type = S.type; i.inputMode = S.mode; i.autocomplete = S.ac; i.placeholder = S.ph; i.setAttribute("aria-label", S.ph);
      q(".go").textContent = S.btn; q(".skip").hidden = !S.skip; q(".fine").hidden = step !== 0; q(".err").hidden = true;
      if (step) i.focus();
    };
    const done = () => {
      store.set("links_su_" + blockId, "1");
      root.innerHTML = `<div class="top"><span class="k">You're on the list</span><span class="steps"><i class="on"></i><i class="on"></i><i class="on"></i></span></div><h3 class="d">${esc(root.dataset.doneTitle)}</h3><p>${esc(root.dataset.done)}</p>`;
    };
    q("form").addEventListener("submit", async e => {
      e.preventDefault();
      const v = i.value.trim(), S = STEPS[step];
      if (!v) { q(".err").textContent = "Fill this in to continue."; q(".err").hidden = false; return; }
      q(".go").disabled = true; q(".err").hidden = true;
      try {
        const b = { step: S.key, token, block: blockId, website: q(".hp").value };
        if (S.key === "phone") { b.phone = v; b.loc = window.LINKS_LOC || ""; }
        if (S.key === "email") b.email = v;
        if (S.key === "name") b.firstName = v;
        const j = await send(b); token = j.token;
        if (S.key === "phone") { px("track", "Lead", { content_name: title }); beacon("lead", blockId); }
        if (!token || step === STEPS.length - 1) return done();
        step++; show();
      } catch (err) { q(".err").textContent = err.message; q(".err").hidden = false; }
      finally { const b = q(".go"); if (b) b.disabled = false; }
    });
    i.addEventListener("input", () => { if (STEPS[step] && STEPS[step].key === "phone") { const o = fmtPhone(i.value); if (o !== i.value) i.value = o; } });
    q(".skip").onclick = () => { if (step === STEPS.length - 1) return done(); step++; show(); };
    show();
  });

  schedule(); // fixes up a cached page that crossed midnight, and applies day/location ranking
})();
