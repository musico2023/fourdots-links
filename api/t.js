// Page analytics: one row per view, tap and lead. Feeds the per-client monthly report.
const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const KEY = process.env.LINKS_SERVER_KEY;
const UUID = /^[0-9a-f-]{36}$/i;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  if (!UUID.test(b.c || "") || !["view", "click", "lead"].includes(b.k)) return res.status(204).end();
  if (/bot|crawl|spider|preview|facebookexternalhit/i.test(req.headers["user-agent"] || "")) return res.status(204).end();
  try {
    await fetch(`${SUPA}/rest/v1/rpc/srv_event`, {
      method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_key: KEY, p_client: b.c, p_page: String(b.p || "").slice(0, 60), p_block: UUID.test(b.b || "") ? b.b : null, p_kind: b.k, p_target: b.t ? String(b.t).slice(0, 300) : null }),
    });
  } catch {}
  return res.status(204).end();
};
