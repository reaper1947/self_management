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
| `academy/` | `/academy/` | static HTML/JS — the LMS (see below) | none |
| `storefront/` | `/storefront/` | static HTML/JS (terminal-themed marketing site + `trial/` public free lessons) | none |
| `academy/seed/` | (loaded into SQLite on startup) | Markdown course content + `manifest.json` | none |
| `docs/*-guide.md` | download / repo reference | full written course guides (source of truth for the seed) | `build_seed_from_guide.py` splits them |

`habit-tracker/frontend/`, `habit-tracker/main.jsx`, `habit-tracker/dist/` (checked-in),
`habit-tracker/cf/`, and `requiements.txt` (sic) are **legacy** — the live SPA is `dashboard/`.

The storefront and academy are hand-rolled multi-page static sites (vanilla HTML/CSS/JS, no
build, no framework). Cache-bust by bumping the `?v=` query on `<link>`/`<script>` when you
edit CSS/JS.

**The LMS (`academy/`)** — clean dark theme in `lms.css`, shared helpers in `lms.js`:
- `index.html` (`academy.js`) — login/signup.
- `app.html` (`app.js`) — student dashboard: profile card, level/XP/streak, course grid.
- `learn.html` (`player.js`) — The-Construct-style course player.
- `admin.html` (`admin.js`) — admin panel (password = `APP_PASSWORD`): dashboard,
  course/module/lesson CRUD + media upload + Markdown editor, students, access grants.
- `serve_academy()` aliases: `/academy/{app,learn,admin,courses}` → the `.html`;
  `/academy/course/<id>` → `learn?course=<id>`. Old `courses.html` / `course_*` / `starter_*`
  are redirect stubs. `starter.*` / `courses.js` were removed.
- `storefront/trial/*.html` are still standalone public free lessons (localStorage progress).

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
`init_db()` runs on startup and is idempotent (`CREATE TABLE IF NOT EXISTS` + an
`_add_column_if_missing()` helper for migrations) and seeds the LMS courses from
`academy/seed/` if absent. `migrate_db*.py` / `revert_db.py` are one-off scripts.

LMS offline checks (from `habit-tracker/`): `python3 selftest_lms.py` — XP/level/streak
math, the Markdown fallback, and the seed loader against an in-memory DB. The full app also
boots under the **stdlib Flask** (`stripe` / `google.antigravity` / `markdown` imports are
all optional), so `python3 -c "import app; app.DB_PATH='/tmp/x.db'; app.init_db(); ..."`
with `app.test_client()` is the practical way to exercise endpoints here.

After editing `docs/*-guide.md`: `python3 build_seed_from_guide.py` regenerates
`academy/seed/`, then **Admin → Reseed from files** (reseed matches lessons by slug, so
lesson ids and student progress survive).

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
- *Admin* (Peter): `POST /api/auth/login` with `password == APP_PASSWORD` → `session["logged_in"]`, `role=admin`. Guards dashboard APIs via `@require_auth` and LMS admin via `_require_admin()`. Also `role=student` via `magic_token` in the `users` table.
- *Academy students*: `students` table (werkzeug password hashes), `session["student_logged_in"]` / `student_id`. `/api/student/*` and `/api/lms/*` endpoints. Course ownership = a row in `purchases` (`source` = stripe/bmc/admin/free) OR the course's `access_mode='free'`.

**LMS data model** (all in `habit_tracker.db`): `courses` (slug PK, `bmc_url`, `access_mode`),
`modules` (`category` static/dynamic/core), `lessons` (`slug` unique per course, `is_free`,
`published`, `video_url` or `video_file`, `body_md` + rendered `body_html`), `resources`
(url or `file_path` under `MEDIA_DIR`), `lesson_progress` (unique per student+lesson).
XP/level/streak are **computed live** from `lesson_progress` by `lms_progress.py` — never
stored. Markdown → HTML via `md_render.py` (real `markdown` package, or a regex fallback).

**Web terminal.** systemd runs `ttyd` on host port 7681 (`ttyd.service`, no auth). nginx
exposes it at `/terminal/` and gates every request with `auth_request /api/auth/verify_nginx`,
which checks the admin session. nginx reaches ttyd via `host.docker.internal`.

**Dashboard persistence.** The React app has no per-feature API. It stores habit/scheduler/
gym state as JSON blobs through the generic key/value store: `GET/POST/DELETE /api/data/<key>`
and `GET /api/keys?prefix=` backed by the `store` table.

**AI chat.** `POST /api/chat` uses the `google.antigravity` Agent SDK (package
`google-antigravity`), not OpenRouter — the README is out of date. Response is reshaped into
OpenAI `choices[0].message.content` form for the frontend.

**Payments = Buy Me a Coffee** (see `MARKETING.md` / `DEVUSER.md`). Storefront + player
"Get access" buttons hit `/api/lms/checkout/<course>` → open the course's `bmc_url` Extra.
After payment Peter grants access manually in the admin panel (`/api/admin/lms/grant`).
Stripe code (`/api/create-checkout-session`, `/api/webhook`) is left in place but dormant
(no key); the import is optional.

**Media uploads.** `MEDIA_DIR` (env, `/app/media` in prod) is a Docker volume mounted by
`start_docker.sh` / `docker-compose.yml`. `MAX_CONTENT_LENGTH` = 256 MB and nginx
`client_max_body_size` = 256M — but Cloudflare's free tier still caps a request at ~100 MB,
so big videos go on YouTube/Vimeo/Bunny as a URL, not an upload.

## Environment variables

Loaded from `.env` (gitignored) at repo root: `APP_PASSWORD`, `OPENROUTER_API_KEY` (legacy),
`GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FLASK_SECRET_KEY`,
`BMC_USERNAME` (Buy Me a Coffee page slug), `MEDIA_DIR`.
`habit-tracker/habit_tracker.db` and `media/` are volume-mounted so they survive rebuilds —
never commit them (both gitignored) and don't delete them. `backup.sh` includes `media/`.
