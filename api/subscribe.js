// Stepped signup (phone, then email, then first name) for any client page.
// Each step is saved in the Links database first, then pushed to that client's GHL sub-account
// with their own Private Integration Token, so a GHL outage never loses a lead.
const crypto = require("crypto");

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const KEY = process.env.LINKS_SERVER_KEY;
const SIGN = process.env.LINKS_SIGNING_SECRET;
const GHL = "https://services.leadconnectorhq.com";

async function rpc(fn, args) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_key: KEY, ...args }) });
  const t = await r.text(); if (!r.ok) throw new Error(`${fn} ${r.status} ${t.slice(0, 200)}`); return t ? JSON.parse(t) : null;
}
const sign = o => { const p = Buffer.from(JSON.stringify(o)).toString("base64url"); return p + "." + crypto.createHmac("sha256", SIGN).update(p).digest("base64url"); };
function verify(tok) {
  if (typeof tok !== "string") return null; const [p, s] = tok.split("."); if (!p || !s) return null;
  const e = crypto.createHmac("sha256", SIGN).update(p).digest("base64url");
  if (e.length !== s.length || !crypto.timingSafeEqual(Buffer.from(e), Buffer.from(s))) return null;
  try { const o = JSON.parse(Buffer.from(p, "base64url").toString()); return Date.now() - o.t > 3600e3 ? null : o; } catch { return null; }
}
function normPhone(v) {
  const raw = String(v || "").trim(), d = raw.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d; if (d.length === 11 && d[0] === "1") return "+" + d;
  if (raw.startsWith("+") && d.length >= 8 && d.length <= 15) return "+" + d; return null;
}
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
async function ghl(pit, path, method, body) {
  const r = await fetch(GHL + path, { method, headers: { Authorization: `Bearer ${pit}`, Version: "2021-07-28", "Content-Type": "application/json", Accept: "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  if (!r.ok) throw new Error(`GHL ${method} ${path} ${r.status}: ${t.slice(0, 200)}`); return j;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!SUPA || !ANON || !KEY || !SIGN) return res.status(500).json({ error: "Signup isn't set up yet." });
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  if (b.website) return res.status(200).json({ ok: true, token: null }); // bot trap

  try {
    if (b.step === "phone") {
      const phone = normPhone(b.phone);
      if (!phone) return res.status(400).json({ error: "Enter a valid phone number." });
      if (!/^[0-9a-f-]{36}$/i.test(b.block || "")) return res.status(400).json({ error: "Refresh the page and try again." });
      const blk = await rpc("srv_block", { p_block: b.block });
      if (!blk || blk.type !== "signup") return res.status(400).json({ error: "This signup isn't available." });
      const g = await rpc("srv_ghl", { p_client: blk.client_id });
      const loc = (g.loc_tags || []).includes(b.loc) ? b.loc : null;
      const tags = [...new Set([g.default_tag, blk.data && blk.data.tag, loc].map(x => String(x || "").trim()).filter(Boolean))];
      const consent = g.consent || `By continuing you agree to get texts and emails from ${g.name}. Msg & data rates may apply. Reply STOP to opt out anytime.`;
      let contact = null, status = "not_connected";
      if (g.pit && g.location_id) {
        try {
          const up = await ghl(g.pit, "/contacts/upsert", "POST", { locationId: g.location_id, phone, source: "Link in bio" });
          contact = (up && up.contact && up.contact.id) || null;
          if (contact && tags.length) await ghl(g.pit, `/contacts/${contact}/tags`, "POST", { tags });
          status = contact ? "synced" : "error";
        } catch (e) { console.error(e.message); status = "error"; }
      }
      const id = await rpc("srv_signup", { p_id: null, p_client: blk.client_id, p_block: b.block, p_phone: phone, p_email: null, p_first: null, p_tags: tags, p_contact: contact, p_status: status, p_consent: consent });
      return res.status(200).json({ ok: true, token: sign({ id, c: blk.client_id, g: contact, t: Date.now() }) });
    }

    if (b.step === "email" || b.step === "name") {
      const s = verify(b.token);
      if (!s) return res.status(400).json({ error: "This signup timed out. Start again." });
      let email = null, first = null;
      if (b.step === "email") { if (!emailOk(b.email)) return res.status(400).json({ error: "Enter a valid email." }); email = String(b.email).trim().toLowerCase(); }
      else { first = String(b.firstName || "").trim().slice(0, 60); if (!first) return res.status(400).json({ error: "Enter your first name." }); }
      let status = null;
      if (s.g) {
        const g = await rpc("srv_ghl", { p_client: s.c });
        if (g && g.pit) {
          try { await ghl(g.pit, `/contacts/${s.g}`, "PUT", email ? { email } : { firstName: first }); status = "synced"; }
          catch (e) { console.error(e.message); status = email ? "email_conflict" : "error"; }
        }
      }
      await rpc("srv_signup", { p_id: s.id, p_client: s.c, p_block: null, p_phone: null, p_email: email, p_first: first, p_tags: null, p_contact: null, p_status: status, p_consent: null });
      return res.status(200).json({ ok: true, token: b.token });
    }
    return res.status(400).json({ error: "Unknown step." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
};
