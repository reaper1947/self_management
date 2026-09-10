"""
lms_seed.py — load course content from academy/seed/<course>/manifest.json into
the LMS tables, and build the downloadable concatenated guide.

Seeding is idempotent:
  * a course is only created if it does not exist, unless force=True (admin reseed)
  * on force, modules match by (course_id, title) and lessons by (course_id, slug),
    so existing lesson ids — and therefore student progress — are preserved.
"""
import json
import os
import re

from md_render import render_markdown

SEED_DIR = os.path.join(os.path.dirname(__file__), "..", "academy", "seed")


def _slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")


def _lesson_slug(file_path):
    stem = file_path.rsplit(".", 1)[0]
    parts = [re.sub(r"^\d+[-_]?", "", p) for p in stem.split("/")]
    return _slugify("-".join(p for p in parts if p))


def available_manifests():
    if not os.path.isdir(SEED_DIR):
        return []
    out = []
    for name in sorted(os.listdir(SEED_DIR)):
        mpath = os.path.join(SEED_DIR, name, "manifest.json")
        if os.path.isfile(mpath):
            out.append((name, mpath))
    return out


def _read_manifest(mpath):
    with open(mpath, "r", encoding="utf-8") as f:
        return json.load(f)


def _read_body(course_dir, rel):
    if not rel:
        return ""
    fp = os.path.join(course_dir, rel)
    if os.path.isfile(fp):
        with open(fp, "r", encoding="utf-8") as f:
            return f.read()
    return ""


def seed_courses(db, only=None, force=False):
    """Load one or all seed courses. Returns a summary dict {course_id: {...}}."""
    summary = {}
    for name, mpath in available_manifests():
        man = _read_manifest(mpath)
        cid = man.get("id") or name
        if only and cid != only:
            continue

        exists = db.execute("SELECT 1 FROM courses WHERE id=?", (cid,)).fetchone()
        if exists and not force:
            summary[cid] = {"skipped": True}
            continue

        course_dir = os.path.dirname(mpath)
        db.execute(
            """INSERT INTO courses (id, title, subtitle, description, hero, accent,
                    price_label, bmc_url, access_mode, published, sort)
               VALUES (?,?,?,?,?,?,?,?,?,1,?)
               ON CONFLICT(id) DO UPDATE SET
                   title=excluded.title, subtitle=excluded.subtitle,
                   description=excluded.description, hero=excluded.hero,
                   accent=excluded.accent, price_label=excluded.price_label,
                   bmc_url=excluded.bmc_url, access_mode=excluded.access_mode,
                   sort=excluded.sort""",
            (
                cid, man.get("title", cid), man.get("subtitle", ""),
                man.get("description", ""), man.get("hero", ""),
                man.get("accent", "cal"), man.get("price_label", ""),
                man.get("bmc_url", ""), man.get("access_mode", "paid"),
                man.get("sort", 100),
            ),
        )

        seen_modules, n_lessons = [], 0
        for mi, mod in enumerate(man.get("modules", [])):
            row = db.execute(
                "SELECT id FROM modules WHERE course_id=? AND title=?",
                (cid, mod["title"]),
            ).fetchone()
            if row:
                mod_id = row["id"]
                db.execute(
                    "UPDATE modules SET summary=?, category=?, sort=? WHERE id=?",
                    (mod.get("summary", ""), mod.get("category"), mi, mod_id),
                )
            else:
                cur = db.execute(
                    "INSERT INTO modules (course_id, title, summary, category, sort) VALUES (?,?,?,?,?)",
                    (cid, mod["title"], mod.get("summary", ""), mod.get("category"), mi),
                )
                mod_id = cur.lastrowid
            seen_modules.append(mod_id)

            seen_lessons = []
            for li, les in enumerate(mod.get("lessons", [])):
                slug = les.get("slug") or _lesson_slug(les.get("file", les["title"]))
                body_md = _read_body(course_dir, les.get("file"))
                body_html = render_markdown(body_md)
                is_free = 1 if les.get("is_free") else 0
                vals = (
                    mod_id, cid, les["title"], slug, les.get("kind", "reading"),
                    int(les.get("duration_min", 0) or 0), les.get("video_url", ""),
                    body_md, body_html, is_free, li,
                )
                row = db.execute(
                    "SELECT id FROM lessons WHERE course_id=? AND slug=?", (cid, slug)
                ).fetchone()
                if row:
                    lid = row["id"]
                    db.execute(
                        """UPDATE lessons SET module_id=?, title=?, kind=?, duration_min=?,
                               video_url=?, body_md=?, body_html=?, is_free=?, sort=?,
                               published=1, updated_at=CURRENT_TIMESTAMP
                           WHERE id=?""",
                        (vals[0], vals[2], vals[4], vals[5], vals[6], vals[7],
                         vals[8], vals[9], vals[10], lid),
                    )
                else:
                    cur = db.execute(
                        """INSERT INTO lessons (module_id, course_id, title, slug, kind,
                               duration_min, video_url, body_md, body_html, is_free,
                               sort, published)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,1)""",
                        vals,
                    )
                    lid = cur.lastrowid
                seen_lessons.append(lid)
                n_lessons += 1

            if seen_lessons:
                q = ",".join("?" * len(seen_lessons))
                db.execute(
                    f"DELETE FROM lessons WHERE module_id=? AND id NOT IN ({q})",
                    (mod_id, *seen_lessons),
                )

        if seen_modules:
            q = ",".join("?" * len(seen_modules))
            db.execute(
                f"DELETE FROM lessons WHERE course_id=? AND module_id NOT IN ({q})",
                (cid, *seen_modules),
            )
            db.execute(
                f"DELETE FROM modules WHERE course_id=? AND id NOT IN ({q})",
                (cid, *seen_modules),
            )

        db.commit()
        summary[cid] = {"modules": len(seen_modules), "lessons": n_lessons,
                        "reseeded": bool(exists)}
    return summary


def build_guide(db, course_id, fmt="md"):
    """Concatenate a course into one downloadable document."""
    course = db.execute("SELECT * FROM courses WHERE id=?", (course_id,)).fetchone()
    if not course:
        return None, None
    mods = db.execute(
        "SELECT * FROM modules WHERE course_id=? ORDER BY sort, id", (course_id,)
    ).fetchall()

    parts = [f"# {course['title']}", ""]
    if course["subtitle"]:
        parts += [f"_{course['subtitle']}_", ""]
    if course["description"]:
        parts += [course["description"], ""]
    parts += ["---", ""]

    for mi, m in enumerate(mods, 1):
        parts.append(f"## Module {mi} — {m['title']}")
        if m["summary"]:
            parts += ["", m["summary"]]
        parts.append("")
        lessons = db.execute(
            "SELECT * FROM lessons WHERE module_id=? AND published=1 ORDER BY sort, id",
            (m["id"],),
        ).fetchall()
        for l in lessons:
            parts.append(f"### {l['title']}")
            parts.append("")
            parts.append(l["body_md"] or "_(no written content — see the video lesson)_")
            parts.append("")

    md = "\n".join(parts)
    if fmt == "md":
        return md, "text/markdown"

    body = render_markdown(md)
    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>{course['title']} — Peter1947 Academy</title>
<style>
 body{{max-width:760px;margin:2rem auto;padding:0 1.2rem;font:16px/1.7 -apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a}}
 h1,h2,h3{{line-height:1.25;margin:1.6em 0 .5em}} h1{{font-size:2rem}} h2{{font-size:1.5rem;border-bottom:1px solid #ddd;padding-bottom:.2em}}
 pre{{background:#f5f5f5;padding:1rem;overflow-x:auto;border-radius:6px}} code{{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em}}
 table{{border-collapse:collapse;width:100%}} th,td{{border:1px solid #ddd;padding:.5rem .7rem;text-align:left}}
 blockquote{{border-left:3px solid #ccc;margin:1rem 0;padding:.2rem 1rem;color:#555}}
 @media print{{body{{max-width:none}}}}
</style></head><body>
{body}
<hr><p><small>© Peter1947 Academy · peter1947.space — for your personal use.</small></p>
</body></html>"""
    return doc, "text/html"
