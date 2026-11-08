# Fourdots Links

Branded link-in-bio pages for Fourdots clients, bundled into social retainers. One app serves every client: the domain picks the client (`bio.thegoodsontoronto.com`), and `/c/<slug>/<page>` previews any client on any domain.

## How it fits together

- `api/page.js` loads a page with the `link_page` RPC and renders it with `lib/render.js` (server-side HTML, per-client colours and fonts).
- `client.js` runs in the page: location switcher with open-now, the stepped text signup, booking sheet, schedules, tracking.
- `api/subscribe.js` saves each signup in Supabase first, then pushes it to that client's own GHL sub-account with their Private Integration Token.
- `api/t.js` records views, taps and leads for the stats tab.
- `admin.html` (`/admin`) is the dashboard: blocks, sub-pages, look (colours, Google or uploaded fonts, shape), settings, GHL connection, signups CSV, stats, team.

## Data

Supabase project `fourdots-links` (`glevumoytvkiryjogrvc`, ca-central-1). Row-level security limits every team member to their own clients; `team` rows with no client are Fourdots admins. GHL tokens live in `client_secrets`, readable only by the server functions (which check `LINKS_SERVER_KEY`).

## Environment (Vercel)

| Name | What |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `LINKS_SERVER_KEY` | Shared secret for the `srv_*` functions (its sha256 is in `private`) |
| `LINKS_SIGNING_SECRET` | HMAC secret for signup step tokens |

## Adding a client

1. In `/admin`, **+ New client**, then fill Look and Settings.
2. Add their domain in Settings and in Vercel; they point a CNAME (`bio`) to `cname.vercel-dns.com`.
3. Paste their GHL Private Integration Token and Location ID under Settings → GoHighLevel.
4. Add their people under Team. They sign in at `/admin` with “First time? Set password”.
