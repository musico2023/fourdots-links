// Public config for the dashboard (the anon key is public by design; RLS does the guarding).
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("Content-Type", "application/javascript");
  res.end(`window.LINKS_CFG=${JSON.stringify({ url: process.env.SUPABASE_URL || "", anon: process.env.SUPABASE_ANON_KEY || "" })};`);
};
