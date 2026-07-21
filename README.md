# AirIntel Malaysia

Real-time haze AQI monitoring and proactive safety alerts for Malaysia —
web app (installable as a PWA), Telegram bot, and an n8n-orchestrated
backend, all sitting on Supabase.

## What it does

- Live AQI/PM2.5/PM10 at your current location or any pinned favorite,
  with a 24h trend sparkline and a next-day forecast indicator.
- Threshold-based push alerts (app + Telegram) when a pinned location
  crosses a PM2.5/AQI threshold you set — checked on a schedule, not
  something you have to keep the app open for.
- An AI chat assistant (in-app and Telegram) that can check current
  conditions, pull a 3-day trend for a station, and search official
  Malaysian haze policy/health guidance (RAG over `policy_documents`) —
  and combine both when asked something like "is it safe for the kids to
  go to school given the last 3 days?"
- Admin dashboard: manage the policy RAG documents, watch API usage, send
  an emergency broadcast.

## Architecture

```
┌─────────────┐   HTTPS    ┌──────────────┐   webhooks/cron   ┌────────┐
│  Next.js PWA │ ─────────▶ │  n8n         │ ─────────────────▶ │Supabase│
│  (Vercel)    │ ◀───────── │  (Render)    │ ◀───────────────── │(Postgres
└─────────────┘  API routes └──────────────┘   Postgres nodes   │+PostGIS
       │                          │                             │+pgvector)
       │                          ├─ AQICN / Open-Meteo (ingestion)
       │                          ├─ Google Gemini (embeddings + chat)
       │                          ├─ Groq (chat)
       │                          ├─ Telegram Bot API
       │                          └─ OneSignal REST API (push send)
       │
       └─ OneSignal Web SDK (browser) ── subscribes directly, independent of n8n
```

The frontend never talks to n8n directly from the browser — every call
goes through a Next.js API route (`app/api/*`) server-side, which attaches
a shared secret header. The one exception: OneSignal's Web SDK, which the
browser talks to directly to manage its own push subscription; n8n only
calls OneSignal's REST API to _send_ pushes, using subscription IDs your
backend already has in `device_push_tokens`.

## Repo layout

```
frontend/            Next.js 14 app — the PWA, also wrapped in Capacitor
                      for optional native Android/iOS builds
  app/                routes + API route handlers
  components/         UI
  lib/                Supabase clients, OneSignal, shared helpers
  public/             manifest.json, service worker, icons
backend/
  n8n-workflows/       01–09, exported workflow JSON (see below)
  docker/              Dockerfile + entrypoint for Render, docker-compose
                        for local dev, nginx.conf (unused on Render —
                        kept for reference / a future non-Render host)
  terraform/           Oracle Cloud VM provisioning — currently unused,
                        see terraform/README.md
database/
  schema.sql           full schema, RLS policies, triggers
  migrations/          incremental changes since schema.sql was written
```

## n8n workflows

| #   | Trigger            | What it does                                                                                        |
| --- | ------------------ | --------------------------------------------------------------------------------------------------- |
| 01  | Cron (hourly)      | Pulls AQICN + Open-Meteo wind data, appends to `real_time_stations` (history table, not a snapshot) |
| 02  | Webhook            | Haze vector math — nearest/upwind station, safety status, clearance estimate                        |
| 03  | Webhook (Telegram) | Telegram bot: pairing, location sharing, chat agent                                                 |
| 04  | Webhook            | Register/update a favorite location (geofence)                                                      |
| 05  | Cron               | Checks pinned locations against thresholds, sends push via OneSignal + logs to `haze_alert_logs`    |
| 06  | Cron               | Scrapes/refreshes policy source documents                                                           |
| 07  | Webhook            | Admin emergency broadcast                                                                           |
| 08  | Webhook            | In-app chat agent (haze check + policy RAG + 3-day trend, same tool set as 03)                      |
| 09  | Manual             | One-time seed of `policy_documents` (embeds + inserts into the pgvector store)                      |

01, 05, and 06 are Cron-triggered — see the Render section below for why
that matters.

## Local setup

**Database**: run `database/schema.sql` on a fresh Supabase project, then
everything in `database/migrations/` in order.

**Frontend**:

```bash
cd frontend
cp .env.example .env   # fill in every value
npm install
npm run dev
```

**Backend** (n8n, local):

```bash
cd backend/docker
cp .env.example .env   # fill in every value
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The `.dev.yml` file exposes n8n directly on `localhost:5678` for editing
workflows. Don't run that file in production — see the comment at the
top of it.

## Deployment

**Frontend → Vercel.** Root Directory: `frontend/`. Set every var from
`frontend/.env.example` in Vercel's project settings. Leave
`CAPACITOR_BUILD` unset — `next.config.js` switches to a static export
when it's `true`, which has no server and would break every `/api/*`
route.

**Backend → Render**, deployed from `backend/docker/Dockerfile` (Render
builds it directly from the repo, no manual image push needed):

- Root Directory / build context: `backend/`, Dockerfile Path: `docker/Dockerfile`
- Environment: Docker
- Set every var from `backend/docker/.env.example`, plus (recommended —
  see note below) `DB_TYPE=postgresdb` pointed at your Supabase Postgres
  in its own schema, so the container has no state of its own to lose
  between deploys.
- **Plan matters here**: workflows 01/05/06 rely on n8n's own internal
  Cron trigger, which only fires while the container is actually running.
  Render's free tier sleeps after ~15 min idle — fine for occasional
  demos (wake it with one request beforehand; manually hit "Execute
  Workflow" in the n8n UI if you want to show 05 firing live rather than
  waiting on its real schedule), but genuinely unreliable for anything
  meant to run unattended in production. Use a paid, always-on plan
  before relying on this for real users.

After first deploy, workflows import automatically (see the Dockerfile's
entrypoint), but **credentials do not** — n8n never exports credential
secrets, only a reference id/name. Recreate these once by hand in the
n8n UI: the Supabase Postgres connection, Google Gemini, Groq, Telegram
Bot, and the Supabase Vector Store credential (used by 08's RAG tool).

**Three** things to update only once you have real production domains\*\*:

- OneSignal dashboard → Web Push platform's Site URL (push subscriptions
  are origin-scoped; anyone subscribed against a dev/tunnel URL won't
  carry over).
- Supabase → Authentication → URL Configuration (Site URL / Redirect
  URLs) — otherwise the password-reset email links point at `localhost`.
- Set up own Domain and Resend and Supabase to have custom email sent.

## Known platform caveats worth knowing before you hit them

- **iOS web push**: only works if the PWA is added to the Home Screen
  first, and only on iOS 16.4+. A bare Safari tab can never receive push,
  no matter how long it's open — there's no code fix for this, it's a
  hard platform rule.
- **Supabase "Confirm email"**: if that's enabled on your project,
  `signUp()` returns no session until the email is confirmed — the
  frontend already handles this (shows a "check your email" message
  instead of silently redirecting), but sign-in will 400 with "email not
  confirmed" until then, which is expected, not a bug.
- **Username requires a migration**: `database/migrations/002_username.sql`
  adds the column and updates the signup trigger to read it. Signup and
  Settings both write to it — if that migration hasn't been run, both
  will fail with a real Postgres error naming the missing column.
- **`SUPABASE_SERVICE_ROLE_KEY`** is required for account deletion
  (`app/api/account`, `DELETE`) to work — it calls
  `supabase.auth.admin.deleteUser`, which needs elevated privileges the
  anon key doesn't have. Server-only, never exposed to the browser.
- **Run** curl -F "url=https://[your backend host url]" https://telegram.org<YOUR_BOT_TOKEN>/setWebhook in CMD once to setup Telegram with the backend.

## License

MIT
