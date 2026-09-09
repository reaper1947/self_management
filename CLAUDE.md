# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Peter's personal "Self Management Dashboard" plus a commercial course site (Peter1947 Academy),
all served by **one Flask app** and reverse-proxied by nginx behind a Cloudflare tunnel at
`peter1947.space`. Active development happens on the **`docker-method`** branch, not `main`.

## Repository layout (each is a separately-served frontend)

| Path | Served at | Type | Build step |
|---|---|---|---|
| `habit-tracker/app.py` | `/api/*` + everything | Flask, port 5055 | none |
| `dashboard/` | `/dashboard/` | React 19 + Vite SPA | `npm run build` → `habit-tracker/dist/` |
| `standby_page/` | `/` (root) | static HTML/JS | none |
| `academy/` | `/academy/` | static HTML/JS (+ `demos/`, `starter_*.html` login-gated free modules) | none |
| `storefront/` | `/storefront/` | static HTML/JS (marketing site + `trial/` public free lessons) | none |

`habit-tracker/frontend/`, `habit-tracker/main.jsx`, `habit-tracker/dist/` (checked-in),
`habit-tracker/cf/`, and `requiements.txt` (sic) are **legacy** — the live SPA is `dashboard/`.

The storefront and academy are hand-rolled multi-page static sites (vanilla HTML/CSS/JS, no
build, no framework). Cache-bust by bumping the `?v=` query on `<link>`/`<script>` when you
edit CSS/JS. `storefront/trial/*.html` are public free lessons; `academy/starter_*.html`
gate on `/api/student/status` and redirect to `/academy/` when logged out.

## Commands

Frontend (from `dashboard/`):
```bash
npm install
npm run dev      # Vite dev server on :5173, proxies /api → 127.0.0.1:5055
npm run build    # outputs dist/ (Docker copies this into habit-tracker/dist)
npm run lint     # oxlint (config: dashboard/.oxlintrc.json)
```

Backend (from `habit-tracker/`):
```bash
pip install -r requirements.txt
APP_PASSWORD=xxx OPENROUTER_API_KEY=xxx python3 app.py   # serves on 0.0.0.0:5055
```
`init_db()` runs on startup and is idempotent (`CREATE TABLE IF NOT EXISTS`). There is no
backend test suite. `migrate_db*.py` / `revert_db.py` are one-off scripts.

Standby page smoke test (from `standby_page/`): `node test_jsdom.js`

Safety backup (from repo root): `bash backup.sh` — writes a timestamped `.tar.gz` to
`backups/` (gitignored) excluding `node_modules`/`venv`, with a consistent SQLite snapshot.
`bash backup.sh --label <name>` tags the archive; `KEEP=n` env var sets retention.

Full stack (Docker, run from repo root — needs `sudo`):
```bash
sudo docker build -t self_management_dashboard .
bash start_docker.sh     # NOT docker-compose; runs two `docker run` containers on network sm_network
```
`docker-compose.yml` exists but `start_docker.sh` is the actual deploy path. The
`update_*.sh` scripts are Peter's one-shot deploy helpers (git commit + push + rebuild +
restart systemd `ttyd`); don't run them unless asked.

## Architecture notes

**Single-process routing.** `app.py` serves the API and hand-rolls static routing for all
four frontends via `send_from_directory` with `../` paths (e.g. `ACADEMY_DIR = ../academy`).
The Dockerfile copies `storefront/`, `academy/`, `standby_page/` to `/app/...` so those
relative paths resolve inside the container. Route order matters: the catch-all
`/<path:path>` (standby assets) explicitly 404s prefixes `api/ dashboard/ terminal/
academy/ storefront/`. Vite `base` is `/dashboard/` and Flask's `static_url_path` is
`/dashboard/static`, so the SPA must stay mounted at that subpath.

**Two independent auth systems**, both cookie-session based (`app.secret_key`):
- *Admin* (Peter): `POST /api/auth/login` with `password == APP_PASSWORD` → `session["logged_in"]`, `role=admin`. Guards dashboard APIs via `@require_auth`. Also `role=student` via `magic_token` in the `users` table.
- *Academy students*: `students` table (werkzeug password hashes), `session["student_logged_in"]` / `student_id`. Separate `/api/student/*` endpoints. Purchased courses come from the `purchases` table.

**Web terminal.** systemd runs `ttyd` on host port 7681 (`ttyd.service`, no auth). nginx
exposes it at `/terminal/` and gates every request with `auth_request /api/auth/verify_nginx`,
which checks the admin session. nginx reaches ttyd via `host.docker.internal`.

**Dashboard persistence.** The React app has no per-feature API. It stores habit/scheduler/
gym state as JSON blobs through the generic key/value store: `GET/POST/DELETE /api/data/<key>`
and `GET /api/keys?prefix=` backed by the `store` table.

**AI chat.** `POST /api/chat` uses the `google.antigravity` Agent SDK (package
`google-antigravity`), not OpenRouter — the README is out of date. Response is reshaped into
OpenAI `choices[0].message.content` form for the frontend.

**Payments.** Stripe Checkout (`/api/create-checkout-session`, `/api/student/checkout`) with
hardcoded course catalog (`calisthenics` $49, `robotics` $69). `/api/webhook` verifies
`STRIPE_WEBHOOK_SECRET` and inserts into `purchases` on `checkout.session.completed`.

## Environment variables

Loaded from `.env` (gitignored) at repo root: `APP_PASSWORD`, `OPENROUTER_API_KEY` (legacy),
`GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FLASK_SECRET_KEY`.
The SQLite DB `habit-tracker/habit_tracker.db` is volume-mounted so it survives rebuilds —
never commit it (it's gitignored) and don't delete it.
