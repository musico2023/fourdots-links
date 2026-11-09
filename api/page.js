// Renders a client page. The domain decides the client (bio.client.com); /c/<slug>/<page>
// works on any domain for previews before DNS is set up.
const { renderPage, notFound } = require("../lib/render.js");

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;

module.exports = async (req, res) => {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(":")[0].toLowerCase();
  const path = String((req.query && req.query.p) || "").replace(/^\/+|\/+$/g, "").toLowerCase();
  let client = null, slug = path, base = "";
  const m = path.match(/^c\/([a-z0-9-]+)(?:\/([a-z0-9-]*))?$/);
  if (m) { client = m[1]; slug = m[2] || ""; base = `/c/${client}`; }
  if (!/^[a-z0-9-]{0,60}$/.test(slug)) { res.statusCode = 404; return res.end(notFound()); }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  try {
    const r = await fetch(`${SUPA}/rest/v1/rpc/link_page`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_host: host, p_client: client, p_slug: slug }),
    });
    const data = r.ok ? await r.json() : null;
    if (!data || !data.client) {
      res.statusCode = 404;
      return res.end(notFound(m ? "No client page with that name." : "This page isn't set up yet."));
    }
    if (!data.page) { res.statusCode = 404; return res.end(notFound()); }
    const preview = !!m || (req.query && req.query.preview);
    // Short shared cache: schedules flip within a minute, edits show within ~30s.
    res.setHeader("Cache-Control", preview ? "no-store" : "public, s-maxage=30, stale-while-revalidate=300");
    const qd = preview && req.query && /^[0-6]$/.test(String(req.query.day || "")) ? +req.query.day : undefined;
    const week = !!(preview && req.query && req.query.week);
    return res.end(renderPage(data, { base, preview, day: qd, week, path: `${base}${slug ? "/" + slug : ""}` }));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    return res.end(notFound("Something went wrong loading this page."));
  }
};
