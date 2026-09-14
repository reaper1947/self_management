# DEVUSER.md — running Peter1947 Academy

Everything you (Peter) need to operate the learning platform: add content, upload video,
take payment, and read the numbers. No code required for day-to-day work.

---

## 1. The map

| URL | What it is |
|---|---|
| `peter1947.space/storefront/` | Marketing site (terminal theme). Sends people to the free lesson / sign-up. |
| `peter1947.space/storefront/trial/calisthenics.html`, `.../robotics.html` | Public free lessons — no account. |
| `peter1947.space/academy/` | Student login / sign-up. |
| `peter1947.space/academy/app` | Student dashboard — profile card, level/XP, courses. |
| `peter1947.space/academy/learn?course=calisthenics` | The course player. |
| **`peter1947.space/academy/admin`** | **Your admin panel.** Log in with `APP_PASSWORD` (from `.env`). |

The whole thing is one Flask app (`habit-tracker/app.py`) behind nginx. Course content
lives in a SQLite table; uploaded video/docs live in the `media/` folder (a Docker volume).

---

## 2. First deploy (or after pulling new commits)

```bash
cd /home/next/peter_folder
git pull                       # or git checkout docker-method
bash backup.sh --label pre-deploy
sudo docker build -t self_management_dashboard .
bash start_docker.sh
```

`start_docker.sh` now also creates `media/` and mounts it. On the **first** run the two
courses seed themselves from `academy/seed/`. If the courses already existed from an older
build and look thin, go to **Admin → Dashboard → "Reseed from files"** for each course.

Then run the smoke test in section 8.

---

## 3. Adding / editing course content

### Option A — the admin panel (quick edits, new lessons, media)

**Admin → Courses & lessons.**

- Click a **course** to edit its title, subtitle, description, **Buy Me a Coffee URL**,
  access mode (`paid` = needs a grant, `free` = open to any signed-in student), and
  `published`.
- **+ Add module** → set title, summary, category (`core` / `static` / `dynamic`), sort.
- Click a **module** → **+ Add lesson**.
- Click a **lesson** to edit:
  - **Type** (`reading` / `video` / `practice`), **minutes**, **sort**.
  - **Free preview** toggle — free lessons are visible to everyone, logged in or not-owned.
  - **Published / draft** toggle — drafts are hidden from students.
  - **Video** — paste a URL *or* upload a file (see section 4).
  - **Markdown content** — live preview on the right. Standard Markdown: `#` headings,
    `**bold**`, `- lists`, `` `code` ``, fenced ```code```, `| tables |`, `> quotes`.
  - **Resources / downloads** — add a link URL or upload a file (PDF, etc). These show up
    as download buttons in the lesson.

### Option B — the guide docs (big rewrites, version-controlled)

The real source of truth for the two seeded courses is:

- `docs/calisthenics-guide.md`
- `docs/robotics-ros2-guide.md`

Each lesson is marked with `<!-- FILE: 02-static-support/01-support-hold.md -->`. Edit the
prose, then:

```bash
cd habit-tracker
python3 build_seed_from_guide.py          # rewrites academy/seed/*
cd .. && git add docs academy/seed && git commit -m "content: ..."
# deploy, then Admin -> Dashboard -> "Reseed from files"
```

Reseed **matches lessons by slug**, so lesson IDs — and therefore every student's progress
— survive a content refresh. Adding/removing lessons in the manifest is fine; renaming a
file changes its slug and resets that one lesson's progress.

To add a brand-new module/lesson via the docs, also edit
`academy/seed/<course>/manifest.json` (module list + lesson `file`, `kind`, `duration_min`,
`is_free`).

---

## 4. Uploading video — read this

**Cloudflare's free tier caps a single upload at ~100 MB.** The tunnel is on the free tier.
So:

| Video size | Do this |
|---|---|
| Short clips, < ~80 MB | Upload the file in the lesson editor. Stored in `media/`, streamed with seek support. |
| Full lessons, bigger | **Host it elsewhere and paste the URL:** a YouTube *unlisted* video, Vimeo, or a cheap CDN like **Bunny.net Stream** (~$1/mo + $0.01/GB). The player auto-embeds YouTube/Vimeo and plays direct `.mp4` URLs. |

Recommended workflow: **YouTube unlisted** for launch (free, reliable, fast), move to
Bunny.net later if you want to stop people sharing links.

Documents (PDF, cheat-sheets): upload directly as **lesson resources** — those are small
and fine.

Uploaded files live in `/home/next/peter_folder/media/` on the server. **`backup.sh`
includes them.** Don't delete a file that a lesson still points to.

---

## 5. Taking payment (Buy Me a Coffee)

### One-time setup on buymeacoffee.com

1. Create your page (you have `buymeacoffee.com/peter1947` — change `BMC_USERNAME` in
   `.env` / `docker-compose.yml` if it's different).
2. Create one **Extra** per course (Dashboard → Extras → Add):
   - "Calisthenics: Zero to Expert" — price $49
   - "Robotics with ROS 2: Beginner to Expert" — price $69
   - (optional) "Both courses" bundle — $99
3. Copy each Extra's link. In **Admin → Courses**, paste it into that course's
   **Buy Me a Coffee URL** field. (Until you do, the "Get access" buttons fall back to
   your main BMC page.)

### The sale flow

1. Visitor clicks **Get access** on the storefront or in a locked lesson → opens your BMC
   Extra in a new tab. They pay by card.
2. BMC **emails you** the buyer's name, email and which Extra they bought.
3. You go to **Admin → Grant access**, enter their **email** + pick the **course**, source
   `buy me a coffee`, click **Grant access**.
   - The buyer must have **created an academy account first** (or does so after paying —
     tell them to use the same email). If there's no account with that email yet, the grant
     fails with a clear message; grant it once they've signed up.
4. Next time they log in, the course is unlocked. Done.

The storefront already shows buyers the note: *"pay with the same email you sign up with;
Peter unlocks it within a day."* Keep that promise — check BMC email daily.

### How the money reaches you

- BMC pays out to your connected **Stripe** or **PayPal** account. Set this under BMC →
  Settings → Payout.
- **Stripe payout:** on a rolling schedule (typically every few days once verified).
- **PayPal payout:** BMC transfers on demand / weekly.
- **Fees:** BMC takes **5%**, plus the payment processor's card fee (~2.9% + $0.30). On a
  $49 sale you net roughly **$43–44**.
- You are the merchant of record — handle your own tax reporting.

### Later: automate it

If sales get frequent, upgrade to a BMC **Membership (paid) plan** to get **webhooks**,
then add a `/api/bmc/webhook` handler that auto-grants on `extra_purchase.created` by
matching the Extra name to a course. The code is structured for this (`purchases.source`,
the grant helper). Until then, manual granting is 20 seconds per sale.

---

## 6. The dashboard (Admin → Dashboard)

- **Students / active 7d** — total accounts, and how many completed a lesson this week.
- **Lessons completed / completed 7d** — total engagement and this week's.
- **Access grants** — how many course unlocks exist (≈ sales + comps).
- **Per course** — enrolled, average progress %, how many finished.
- **Recent signups / completions** — the live pulse.

Watch **average progress** — if people buy and stall at < 20%, the early lessons need work
or the onboarding email is missing.

---

## 7. Levels & XP (so you can answer student questions)

- 100 XP per completed lesson, +200 for finishing a module, +500 for finishing a course.
- Ranks: Recruit → Novice → Apprentice → Practitioner → Adept → Specialist → Expert →
  Master → Grandmaster, at 0 / 300 / 800 / 1600 / 2800 / 4500 / 7000 / 10500 / 15000 XP.
- **Streak** = consecutive days with at least one completed lesson (misses reset it after a
  full day's gap).
- XP is computed live from progress — it's always correct, nothing to maintain.

---

## 8. Post-deploy smoke test (5 minutes)

1. `peter1947.space/academy/` → **Sign up** with a throwaway email → lands on the dashboard.
2. Profile card shows **Level 1 · Recruit**, 0 XP, your name, the avatar. Click the avatar →
   pick an emoji → it saves. Edit **Goal** → saves.
3. Open a course → the **first free lesson** loads with content. **Mark complete** → XP
   toast, sidebar tick, dashboard XP rises.
4. Open a **paid** lesson → locked screen with a "Get access" (Buy Me a Coffee) button.
5. `peter1947.space/academy/admin` → log in with `APP_PASSWORD`.
6. **Grant access** → your throwaway email + that course → now the locked lesson opens, and
   the **"Download full guide"** button appears in a lesson's resources.
7. **Courses → a lesson → upload** a small test file as a resource → it appears as a
   download and works.
8. Dashboard counts reflect your test student.

If all 8 pass, you're live.

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| Uploads fail at ~1 MB | nginx not reloaded — `bash start_docker.sh` re-runs it with `client_max_body_size 256M`. |
| Uploads fail at ~100 MB | Cloudflare free-tier cap — host that video on YouTube/Bunny and paste the URL. |
| Courses show no lessons | Fresh DB didn't seed, or old content — Admin → Dashboard → **Reseed from files**. |
| "Reseed" wiped progress on one lesson | Its file was renamed (slug changed). Rename it back, or accept the reset. |
| Student paid but can't see the course | They signed up with a different email than they paid with — grant to the email on their **account**. |
| Video won't play | YouTube link must be a normal watch/share URL; direct files must end `.mp4`/`.webm`. |
| Markdown looks wrong | The server uses standard Markdown; check for a missing blank line before a list or table. |
