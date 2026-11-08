// Server-side page rendering for Fourdots Links. Every client page is built from the
// client's theme + an ordered list of blocks. Pure functions: data in, HTML out.
const { ICONS, guessIcon } = require("../icons.js");

const SUPA = process.env.SUPABASE_URL;
const IMG = p => !p ? "" : /^https?:\/\//.test(p) ? p : `${SUPA}/storage/v1/object/public/links/${p}`;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/* ---------- theme ---------- */
const DEFAULT_THEME = {
  colors: { bg: "#0b0a0b", surface: "#161416", text: "#ffffff", muted: "#a69ea5", line: "#2b272b", accent: "#ff00a7", accent_text: "#ffffff" },
  fonts: {
    display: { source: "google", family: "Inter", weights: "600;700;800" },
    body: { source: "google", family: "Inter", weights: "400;500;600" },
  },
  radius: 14, button_shape: "pill", heading_case: "upper", heading_tracking: 0, texture: false, max_width: 460, card_style: "flat",
};
const okColor = c => typeof c === "string" && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent)$/i.test(c.trim()) ? c.trim() : null;
const okFamily = f => typeof f === "string" && /^[\w \-.]{1,60}$/.test(f.trim()) ? f.trim() : null;
const okWeights = w => typeof w === "string" && /^\d{3}(;\d{3})*$/.test(w) ? w : null;
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

function themeOf(t) {
  t = t || {};
  const c = Object.assign({}, DEFAULT_THEME.colors);
  for (const k of Object.keys(c)) { const v = okColor((t.colors || {})[k]); if (v) c[k] = v; }
  const font = role => {
    const d = DEFAULT_THEME.fonts[role], f = (t.fonts || {})[role] || {};
    return { source: ["google", "upload", "system"].includes(f.source) ? f.source : d.source, family: okFamily(f.family) || d.family,
      weights: okWeights(f.weights) || d.weights, files: Array.isArray(f.files) ? f.files.filter(x => x && typeof x.url === "string").slice(0, 6) : [] };
  };
  return {
    colors: c, display: font("display"), body: font("body"),
    radius: num(t.radius, 0, 32, DEFAULT_THEME.radius),
    button_shape: ["pill", "rounded", "square"].includes(t.button_shape) ? t.button_shape : DEFAULT_THEME.button_shape,
    heading_case: ["upper", "none"].includes(t.heading_case) ? t.heading_case : DEFAULT_THEME.heading_case,
    heading_tracking: num(t.heading_tracking, -0.05, 0.3, 0),
    texture: !!t.texture, max_width: num(t.max_width, 360, 640, 460),
    card_style: ["flat", "outline", "raised"].includes(t.card_style) ? t.card_style : "flat",
  };
}

function fontHead(th) {
  const out = [], google = [];
  for (const f of [th.display, th.body]) {
    if (f.source === "google") google.push(f);
    if (f.source === "upload") for (const file of f.files) {
      const fmt = /\.woff2(\?|$)/i.test(file.url) ? "woff2" : /\.woff(\?|$)/i.test(file.url) ? "woff" : /\.otf(\?|$)/i.test(file.url) ? "opentype" : "truetype";
      out.push(`@font-face{font-family:"${f.family}";src:url("${encodeURI(IMG(file.url))}") format("${fmt}");font-weight:${num(file.weight, 100, 900, 400)};font-style:${file.style === "italic" ? "italic" : "normal"};font-display:swap}`);
    }
  }
  const seen = new Set();
  const links = google.filter(f => !seen.has(f.family) && seen.add(f.family))
    .map(f => `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family).replace(/%20/g, "+")}:wght@${f.weights}&display=swap">`);
  return { links: (links.length ? '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' : "") + links.join(""), faces: out.join("") };
}

function themeCSS(th) {
  const c = th.colors, r = th.radius, btn = th.button_shape === "pill" ? "999px" : th.button_shape === "rounded" ? `${Math.max(8, r - 2)}px` : "2px";
  const fam = f => f.source === "system" ? f.family : `"${f.family}",system-ui,sans-serif`;
  return `:root{--bg:${c.bg};--surface:${c.surface};--text:${c.text};--muted:${c.muted};--line:${c.line};--accent:${c.accent};--accent-text:${c.accent_text};--r:${r}px;--btn:${btn};--display:${fam(th.display)};--body:${fam(th.body)};--case:${th.heading_case === "upper" ? "uppercase" : "none"};--track:${th.heading_tracking}em;--w:${th.max_width}px}`
    + (th.texture ? `body{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}` : "")
    + (th.card_style === "outline" ? `.surf{background:transparent!important;border:1px solid var(--line)!important}` : th.card_style === "raised" ? `.surf{box-shadow:0 10px 30px -14px rgba(0,0,0,.45)}` : "");
}

const BASE_CSS = `*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background-color:var(--bg);color:var(--text);font-family:var(--body);font-size:15px;line-height:1.5;padding:max(28px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(56px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
a{color:inherit;text-decoration:none}button,input{font:inherit;color:inherit}:focus-visible{outline:2px solid var(--accent);outline-offset:3px}[hidden]{display:none!important}
.wrap{max-width:var(--w);margin:0 auto;display:flex;flex-direction:column;gap:14px}
.gap{height:10px}
.d{font-family:var(--display);text-transform:var(--case);letter-spacing:var(--track)}
.back{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--muted);align-self:flex-start;padding:6px 0}
.hd{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;margin-bottom:10px}
.hd .av{width:104px;height:104px;border-radius:50%;object-fit:cover;background:var(--surface);box-shadow:0 0 0 3px var(--bg),0 0 0 4px var(--line)}
.hd .logo{max-width:220px;max-height:96px;width:auto;height:auto;object-fit:contain}
.hd .logo.dark{filter:brightness(0);opacity:.88}.hd .logo.light{filter:brightness(0) invert(1)}
.hd h1{margin:2px 0 0;font-size:26px;line-height:1.05;font-weight:700}
.hd .tag{margin:0;white-space:pre-line;color:var(--text);opacity:.9;font-size:15px;max-width:34ch}
.hd .sub{margin:0;color:var(--muted);font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:600}
.sh{margin:14px 0 0;font-size:19px;font-weight:700;line-height:1.1}
.btn{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:15px 20px;border-radius:var(--btn);background:var(--surface);border:1px solid var(--line);font-family:var(--display);text-transform:var(--case);letter-spacing:var(--track);font-weight:600;font-size:14px;line-height:1.2;transition:transform .15s,border-color .15s;cursor:pointer;text-align:left}
.btn:hover{border-color:var(--accent);transform:translateY(-1px)}
.btn small{display:block;font-family:var(--body);text-transform:none;letter-spacing:0;font-weight:400;color:var(--muted);font-size:12.5px;margin-top:2px}
.btn .i{flex:none;display:grid;color:var(--accent)}.btn .i svg{width:16px;height:16px}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-text)}.btn.primary small{color:var(--accent-text);opacity:.85}.btn.primary .i{color:var(--accent-text)}
.banner{display:block;border-radius:var(--r);overflow:hidden;background:var(--surface);transition:transform .2s}.banner:hover{transform:translateY(-2px)}.banner img{display:block;width:100%;height:auto}
.card{position:relative;display:block;border-radius:var(--r);overflow:hidden;background:var(--surface);isolation:isolate;transition:transform .2s}
.card:hover{transform:translateY(-2px)}.card img{display:block;width:100%;height:auto}
.card .noimg{aspect-ratio:4/3;display:grid;place-items:center;font-family:var(--display);font-size:46px;color:var(--muted);opacity:.4}
.card .chip{position:absolute;top:12px;left:12px;z-index:2;font-family:var(--display);font-size:12px;font-weight:600;line-height:1;text-transform:uppercase;padding:8px 13px;border-radius:999px;background:var(--accent);color:var(--accent-text)}
.card .tab{position:absolute;left:0;bottom:0;z-index:2;font-family:var(--display);font-size:14px;font-weight:700;line-height:1.1;text-transform:var(--case);letter-spacing:var(--track);color:#fff;background:rgba(0,0,0,.82);padding:11px 24px 11px 14px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 100%,0 100%);max-width:70%}
.card .tab small{display:block;font-family:var(--body);text-transform:none;font-weight:500;font-size:11.5px;opacity:.85;letter-spacing:0}
.card .cta{position:absolute;right:12px;bottom:12px;z-index:2;display:inline-flex;align-items:center;gap:7px;font-family:var(--display);font-size:12px;font-weight:600;text-transform:var(--case);line-height:1;padding:10px 14px;border-radius:var(--btn);background:var(--accent);color:var(--accent-text)}
.card .cta svg{width:11px;height:11px}
.card.out img{filter:grayscale(1) brightness(.6)}.card.out .cta{background:var(--line);color:var(--muted)}
.pl{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:12px;border-radius:var(--r);background:var(--surface);border:1px solid var(--line);transition:border-color .15s}
.pl:hover{border-color:var(--accent)}.pl img{width:64px;height:64px;border-radius:calc(var(--r) - 4px);object-fit:cover}
.pl b{display:block;font-family:var(--display);text-transform:var(--case);letter-spacing:var(--track);font-size:15px;line-height:1.15}.pl span{font-size:13px;color:var(--muted)}.pl .i{color:var(--accent)}.pl .i svg{width:16px;height:16px}
.pl.noimg{grid-template-columns:1fr auto;padding:16px 18px}
.txt{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px}.txt h2{margin:0 0 8px;font-size:20px;line-height:1.1}
.txt p{margin:0 0 10px}.txt p:last-child,.txt ul:last-child{margin-bottom:0}.txt ul{margin:0 0 10px;padding-left:20px}.txt li{margin:3px 0}
.soc{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:14px}
.soc a{display:grid;place-items:center;width:50px;height:50px;border-radius:50%;border:1px solid var(--line);transition:border-color .15s,color .15s}.soc a:hover{border-color:var(--accent);color:var(--accent)}.soc svg{width:22px;height:22px}
.loc{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.loc .seg{display:flex;padding:5px;gap:5px;border-bottom:1px solid var(--line)}
.loc .seg button{flex:1;border:0;background:none;padding:10px 8px;border-radius:calc(var(--r) - 5px);font-family:var(--display);text-transform:var(--case);letter-spacing:var(--track);font-weight:600;font-size:13px;color:var(--muted);cursor:pointer;line-height:1.15}
.loc .seg button small{display:block;font-family:var(--body);text-transform:none;letter-spacing:0;font-weight:400;font-size:11px}
.loc .seg button.on{background:var(--accent);color:var(--accent-text)}
.loc .pan{padding:16px;display:flex;flex-direction:column;gap:12px}
.loc .meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:13px;color:var(--muted)}
.loc .open{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--text)}
.loc .dot{width:8px;height:8px;border-radius:50%;background:var(--muted)}.loc .dot.on{background:#3ddc84;box-shadow:0 0 8px #3ddc84}
.loc .acts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.loc .act{display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:var(--btn);border:1px solid var(--line);font-family:var(--display);text-transform:var(--case);letter-spacing:var(--track);font-weight:600;font-size:13px;line-height:1.1;cursor:pointer;background:none;text-align:left}
.loc .act svg{width:17px;height:17px;flex:none}.loc .act:hover{border-color:var(--accent)}
.loc .act.primary{grid-column:1/-1;justify-content:center;background:var(--accent);border-color:var(--accent);color:var(--accent-text);padding:15px}
.loc .rsv{grid-column:1/-1;display:flex;flex-direction:column;gap:8px}
.loc .rsel{display:grid;grid-template-columns:.8fr 1.2fr 1fr;gap:6px}
.loc .rsel label{display:flex;flex-direction:column;gap:3px;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.loc .rsel select{appearance:none;-webkit-appearance:none;width:100%;background:var(--bg);border:1px solid var(--line);border-radius:var(--btn);padding:11px 10px;font-size:15px;font-family:var(--body);letter-spacing:0;text-transform:none;color:var(--text);background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),linear-gradient(135deg,var(--muted) 50%,transparent 50%);background-position:calc(100% - 14px) 50%,calc(100% - 9px) 50%;background-size:5px 5px;background-repeat:no-repeat}
.loc .rsel select:focus{border-color:var(--accent);outline:none}.loc .rsv .act.disabled{opacity:.5;pointer-events:none}
.loc details{font-size:13px;color:var(--muted)}.loc summary{cursor:pointer;font-weight:600;color:var(--text)}
.loc table{width:100%;border-collapse:collapse;margin-top:8px}.loc td{padding:3px 0}.loc td+td{text-align:right}.loc tr.today td{color:var(--text);font-weight:600}
.join{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:22px 20px;display:flex;flex-direction:column;gap:12px}
.join .top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.join .k{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.join .steps{display:flex;gap:5px}.join .steps i{width:22px;height:4px;border-radius:2px;background:var(--line)}.join .steps i.on{background:var(--accent)}
.join h3{margin:0;font-size:24px;line-height:1.05}.join p{margin:0;color:var(--muted);font-size:14px}
.join form{display:flex;flex-direction:column;gap:10px}
.join input{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:var(--btn);padding:14px 18px;font-size:16px}
.join input:focus{border-color:var(--accent);outline:none}
.join .acts{display:flex;gap:8px;align-items:center}
.join .go{flex:1;border:0;border-radius:var(--btn);padding:14px 20px;background:var(--accent);color:var(--accent-text);font-family:var(--display);text-transform:var(--case);letter-spacing:var(--track);font-weight:700;font-size:14px;cursor:pointer}
.join .go[disabled]{opacity:.6}.join .skip{background:none;border:0;color:var(--muted);padding:12px 8px;cursor:pointer;font-weight:600}
.join .fine{font-size:11.5px;color:var(--muted);line-height:1.45}.join .err{color:#ff7a7a;font-size:13px}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:50;opacity:0;transition:opacity .2s}.sheet-bg.on{opacity:1}
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:51;max-width:640px;margin:0 auto;height:min(88vh,820px);background:var(--bg);border-radius:18px 18px 0 0;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .28s ease;box-shadow:0 -20px 60px rgba(0,0,0,.4)}
.sheet.on{transform:none}.sheet .bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line)}
.sheet .bar b{font-family:var(--display);text-transform:var(--case);letter-spacing:var(--track);font-size:14px}.sheet .bar a{font-size:12.5px;color:var(--muted);text-decoration:underline}
.sheet .x{border:0;background:var(--surface);width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1}
.sheet iframe{flex:1;width:100%;border:0;background:#fff}
.foot{margin-top:18px;text-align:center;font-size:11px;color:var(--muted);opacity:.7}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}`;

/* ---------- links ---------- */
// Outbound links get UTM tags (per-client settings) and any per-domain params (e.g. a ticketing referrer id).
function linkFor(url, ctx, label) {
  let u = String(url || "").trim();
  if (!u) return "#";
  if (/^(mailto|tel|sms):/i.test(u)) return u;
  if (u.startsWith("/")) return ctx.base + (u === "/" ? "" : u);
  try {
    const x = new URL(u), s = ctx.settings;
    for (const rule of Array.isArray(s.link_params) ? s.link_params : []) {
      if (rule && rule.match && x.hostname.includes(String(rule.match))) for (const [k, v] of Object.entries(rule.params || {})) if (!x.searchParams.has(k)) x.searchParams.set(k, String(v));
    }
    const utm = s.utm || {};
    if (utm.enabled !== false && !x.searchParams.has("utm_source") && !(ctx.domains || []).includes(x.hostname)) {
      x.searchParams.set("utm_source", utm.source || "instagram");
      x.searchParams.set("utm_medium", utm.medium || "social");
      x.searchParams.set("utm_campaign", utm.campaign || "link_in_bio");
      if (label) x.searchParams.set("utm_content", slugify(label));
    }
    return x.toString();
  } catch { return "#"; }
}

/* ---------- day-based specials ---------- */
// Cards can be limited to some weekdays (days), pushed to the top on others (feature_days),
// and tied to locations (locs). Runs of cards are re-ranked for "today" in the client's time zone;
// client.js repeats this when the visitor switches location.
const dayList = v => (Array.isArray(v) ? v : []).map(Number).filter(n => n >= 0 && n <= 6);
const locList = v => (Array.isArray(v) ? v : []).map(String).filter(Boolean);
function todayIn(tz) {
  try { return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date())); }
  catch { return new Date().getDay(); }
}
function cardRank(b, day) {
  const d = b.data || {}, days = dayList(d.days), feat = dayList(d.feature_days);
  return (days.length && days.includes(day) ? 4 : 0) + (feat.includes(day) ? 2 : 0);
}
function orderCards(blocks, day) {
  const out = blocks.slice();
  for (let i = 0; i < out.length;) {
    if (out[i].type !== "card") { i++; continue; }
    let j = i; while (j < out.length && out[j].type === "card") j++;
    const run = out.slice(i, j).map((b, k) => ({ b, k, r: cardRank(b, day) })).sort((x, y) => y.r - x.r || x.k - y.k).map(x => x.b);
    out.splice(i, j - i, ...run); i = j;
  }
  return out;
}

/* ---------- small helpers ---------- */
const arrow = ICONS.arrow.s;
const sched = b => (b.start_at ? ` data-s="${esc(b.start_at)}"` : "") + (b.end_at ? ` data-e="${esc(b.end_at)}"` : "");
const isShown = (b, now) => (!b.start_at || Date.parse(b.start_at) <= now) && (!b.end_at || Date.parse(b.end_at) > now);
const ext = u => /^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : "";
function mdLite(src) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="text-decoration:underline">$1</a>');
  const out = []; let list = null;
  for (const line of String(src || "").split(/\r?\n/)) {
    const m = line.match(/^\s*[-•]\s+(.*)$/);
    if (m) { (list = list || []).push(`<li>${inline(m[1])}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
    if (line.trim()) out.push(`<p>${inline(line.trim())}</p>`);
  }
  if (list) out.push(`<ul>${list.join("")}</ul>`);
  return out.join("");
}

const ACTION_ICONS = { reserve: "calendar", book: "calendar", order: "bag", delivery: "truck", menu: "menu", directions: "maps", call: "phone", gift: "gift", web: "web", reviews: "star" };
const ACTION_EVENTS = { reserve: "Schedule", book: "Schedule", order: "InitiateCheckout", delivery: "InitiateCheckout", call: "Contact", directions: "FindLocation" };

/* ---------- blocks ---------- */
function block(b, ctx) {
  const d = b.data || {}, id = esc(b.id), attrs = ` data-b="${id}"${sched(b)}${isShown(b, ctx.now) ? "" : " hidden"}`;
  switch (b.type) {
    case "header": {
      const img = d.image_path ? (d.image_style === "logo" ? `<img class="logo ${d.tint === "dark" ? "dark" : d.tint === "light" ? "light" : ""}" src="${esc(IMG(d.image_path))}" alt="${esc(d.title || ctx.client.name)}">` : `<img class="av" src="${esc(IMG(d.image_path))}" alt="${esc(d.title || ctx.client.name)}">`) : "";
      return `<header class="hd"${attrs}>${img}${d.title ? `<h1 class="d">${esc(d.title)}</h1>` : ""}${d.tagline ? `<p class="tag">${esc(d.tagline)}</p>` : ""}${d.sub ? `<p class="sub">${esc(d.sub)}</p>` : ""}</header>`;
    }
    case "heading":
      return `<h2 class="sh d"${attrs}>${esc(d.text)}</h2>`;
    case "button": {
      const href = linkFor(d.url, ctx, d.label), ev = d.event || (d.kind && ACTION_EVENTS[d.kind]) || "";
      if (d.style === "banner" && d.image_path) return `<a class="banner"${attrs} href="${esc(href)}"${ext(href)} data-ev="${esc(ev)}"><img src="${esc(IMG(d.image_path))}" alt="${esc(d.label)}" loading="lazy"></a>`;
      return `<a class="btn surf ${d.style === "primary" ? "primary" : ""}"${attrs} href="${esc(href)}"${ext(href)} data-ev="${esc(ev)}"><span>${esc(d.label)}${d.note ? `<small>${esc(d.note)}</small>` : ""}</span><span class="i">${(ICONS[d.icon] || ICONS.arrow).s}</span></a>`;
    }
    case "card": {
      const href = linkFor(d.url, ctx, d.title || d.date_tab), img = d.image_path ? `<img src="${esc(IMG(d.image_path))}" alt="${esc(d.title || d.date_tab || "")}" loading="lazy">` : `<div class="noimg">${esc((d.title || d.date_tab || "").slice(0, 3))}</div>`;
      const chip = d.chip ? `<span class="chip"${okColor(d.chip_color) ? ` style="background:${okColor(d.chip_color)}"` : ""}>${esc(d.chip)}</span>` : "";
      const tab = d.date_tab ? `<span class="tab">${esc(d.date_tab)}${d.sub ? `<small>${esc(d.sub)}</small>` : ""}</span>` : "";
      const cta = d.soldout ? `<span class="cta">Sold out</span>` : d.cta ? `<span class="cta">${esc(d.cta)}${arrow}</span>` : "";
      const days = dayList(d.days), feat = dayList(d.feature_days), locs = locList(d.locs);
      const dayAttrs = (days.length ? ` data-days="${days.join(",")}"` : "") + (feat.length ? ` data-feat="${feat.join(",")}"` : "") + (locs.length ? ` data-locs="${esc(locs.join(","))}"` : "");
      const offToday = days.length && !days.includes(ctx.day) && !/ hidden$/.test(attrs) ? " hidden" : "";
      return `<a class="card ${d.soldout ? "out" : ""}"${attrs}${dayAttrs}${offToday} href="${esc(href)}"${ext(href)} data-ev="${esc(d.event || "")}">${img}${chip}${tab}${cta}</a>`;
    }
    case "page_link": {
      const href = `${ctx.base}/${encodeURIComponent(d.page_slug || "")}`;
      return `<a class="pl surf ${d.image_path ? "" : "noimg"}"${attrs} href="${esc(href)}">${d.image_path ? `<img src="${esc(IMG(d.image_path))}" alt="" loading="lazy">` : ""}<div><b>${esc(d.title)}</b>${d.sub ? `<span>${esc(d.sub)}</span>` : ""}</div><span class="i">${arrow}</span></a>`;
    }
    case "text":
      return `<section class="txt surf"${attrs}>${d.heading ? `<h2 class="d">${esc(d.heading)}</h2>` : ""}${mdLite(d.body)}</section>`;
    case "socials": {
      const items = (d.items || []).filter(x => x && x.url);
      return `<nav class="soc"${attrs}>${items.map(x => { const ic = ICONS[x.icon] || ICONS[guessIcon(x)]; const href = /^(mailto|tel):/i.test(x.url) ? x.url : linkFor(x.url, { ...ctx, settings: { ...ctx.settings, utm: { enabled: false } } }); return `<a href="${esc(href)}"${ext(href)} aria-label="${esc(ic.n)}" title="${esc(ic.n)}">${ic.s}</a>`; }).join("")}</nav>`;
    }
    case "booking": {
      const href = linkFor(d.url, ctx, d.label);
      const sheet = d.mode !== "link" && /^https:/i.test(href);
      return `<a class="btn surf ${d.style === "outline" ? "" : "primary"}"${attrs} href="${esc(href)}"${sheet ? ` data-sheet="${esc(d.sheet_title || d.label)}"` : ext(href)} data-ev="${esc(d.event || "Schedule")}"><span>${esc(d.label || "Book")}${d.note ? `<small>${esc(d.note)}</small>` : ""}</span><span class="i">${ICONS.calendar.s}</span></a>`;
    }
    case "signup":
      return `<div class="join surf"${attrs} data-signup="${id}" data-title="${esc(d.title || "Stay in the loop")}" data-body="${esc(d.body || "")}" data-done-title="${esc(d.done_title || "You're in.")}" data-done="${esc(d.done_text || "Thanks. Watch your texts.")}"></div>`;
    case "locations": {
      const items = (d.items || []).filter(x => x && x.name);
      if (!items.length) return "";
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const seg = items.length > 1 ? `<div class="seg" role="tablist">${items.map((l, i) => `<button type="button" role="tab" data-loc="${esc(l.key || i)}" class="${i ? "" : "on"}">${esc(l.name)}${l.area ? `<small>${esc(l.area)}</small>` : ""}</button>`).join("")}</div>` : "";
      const pans = items.map((l, i) => {
        const acts = (l.actions || []).filter(a => a && (a.url || a.kind === "directions" || a.kind === "call")).map((a, j) => {
          let u = a.url;
          if (!u && a.kind === "directions" && l.address) u = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(l.address);
          if (!u && a.kind === "call" && l.phone) u = "tel:" + String(l.phone).replace(/[^\d+]/g, "");
          if (!u) return "";
          const href = linkFor(u, ctx, `${l.name} ${a.label || a.kind}`), ic = ICONS[ACTION_ICONS[a.kind] || "arrow"];
          const sheet = a.sheet && /^https:/i.test(href);
          // Reservation picker: party, day and time chosen here, then the booking site opens with them filled in.
          if (a.picker && /^https:/i.test(href)) return `<form class="rsv ${j === 0 ? "first" : ""}" data-rsv="${esc(href)}" data-label="${esc(a.label || "Reserve")}">
            <div class="rsel"><label><span>Guests</span><select name="p" aria-label="Guests"></select></label><label><span>Day</span><select name="d" aria-label="Day"></select></label><label><span>Time</span><select name="t" aria-label="Time"></select></label></div>
            <a class="act primary" href="${esc(href)}"${ext(href)} data-ev="Schedule">${ic.s}<span>${esc(a.label || "Reserve")}</span></a></form>`;
          return `<a class="act ${j === 0 ? "primary" : ""}" href="${esc(href)}"${sheet ? ` data-sheet="${esc(a.label)}"` : ext(href)} data-ev="${esc(ACTION_EVENTS[a.kind] || "")}">${ic.s}<span>${esc(a.label || a.kind)}</span></a>`;
        }).join("");
        const hours = Array.isArray(l.hours) ? l.hours : [];
        const rows = days.map((n, k) => `<tr data-day="${k}"><td>${n}</td><td>${esc(hours[k] || "Closed")}</td></tr>`).join("");
        return `<div class="pan" data-pan="${esc(l.key || i)}" data-hours="${esc(JSON.stringify(hours))}" data-tag="${esc(l.tag || "")}" ${i ? "hidden" : ""}>
          <div class="meta"><span class="open"><i class="dot"></i><span class="ot">Hours</span></span>${l.address ? `<span>${esc(l.address)}</span>` : ""}</div>
          <div class="acts">${acts}</div>
          ${hours.some(Boolean) ? `<details><summary>All hours</summary><table>${rows}</table></details>` : ""}</div>`;
      }).join("");
      return `<section class="loc surf"${attrs} data-locs>${seg}${pans}</section>`;
    }
    default: return "";
  }
}

function pixel(id) {
  if (!/^\d{6,20}$/.test(String(id || ""))) return "";
  return `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');</script><noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/></noscript>`;
}

function renderPage(data, opts) {
  const { client, page } = data, s = client.settings || {}, th = themeOf(client.theme), f = fontHead(th);
  const ctx = { client, settings: s, base: opts.base, now: Date.now(), domains: s.domains_for_utm || [], day: todayIn(s.tz || "America/Toronto") };
  const blocks = orderCards(data.blocks || [], ctx.day).map(b => block(b, ctx)).join("\n");
  const isHome = !page.slug;
  const parent = !isHome ? (page.parent_slug ? `${ctx.base}/${page.parent_slug}` : (ctx.base || "/")) : "";
  const title = isHome ? (s.seo_title || client.name) : `${page.title || page.slug} · ${client.name}`;
  const desc = (isHome ? s.seo_description : page.description) || s.seo_description || "";
  const og = s.og_image_path ? IMG(s.og_image_path) : "";
  const cfg = { c: client.id, p: page.slug, tz: s.tz || "America/Toronto", consent: s.consent_text || `By continuing you agree to get texts and emails from ${client.name}. Msg & data rates may apply. Reply STOP to opt out anytime.` };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>${desc ? `<meta name="description" content="${esc(desc)}">` : ""}<meta property="og:title" content="${esc(title)}">${desc ? `<meta property="og:description" content="${esc(desc)}">` : ""}${og ? `<meta property="og:image" content="${esc(og)}">` : ""}
<meta name="theme-color" content="${th.colors.bg}">${s.favicon_path ? `<link rel="icon" href="${esc(IMG(s.favicon_path))}">` : ""}${client.is_live === false || opts.preview ? '<meta name="robots" content="noindex">' : ""}
${f.links}<style>${f.faces}${themeCSS(th)}${BASE_CSS}</style>${pixel(s.pixel_id)}</head>
<body><main class="wrap">${parent ? `<a class="back" href="${esc(parent)}">← Back</a>` : ""}
${blocks}
${s.hide_footer ? "" : `<p class="foot">Made by <a href="https://fourdots.io?utm_source=links&utm_medium=referral&utm_content=${esc(client.slug)}" target="_blank" rel="noopener">Fourdots</a></p>`}
</main>
<script>window.LINKS=${JSON.stringify(cfg).replace(/</g, "\\u003c")}</script><script src="/client.js" defer></script></body></html>`;
}

function notFound(msg) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title><meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0d;color:#fff;font:15px system-ui,sans-serif}p{color:#9a9aa3}</style></head><body><div style="text-align:center"><h1 style="margin:0 0 6px">Page not found</h1><p>${esc(msg || "Check the link and try again.")}</p></div></body></html>`;
}

module.exports = { renderPage, notFound, themeOf, DEFAULT_THEME, linkFor, esc };
