"""
selftest_lms.py — offline checks for the LMS layer (no Flask, no network).

    python3 selftest_lms.py

Exercises the pure progress math, the markdown fallback, and the seed loader
against an in-memory database.
"""
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(__file__))

from lms_progress import compute_xp, level_for, streak_days, aggregate_profile
from md_render import render_markdown
from lms_seed import seed_courses, build_guide

FAILED = []


def check(name, cond):
    print(("  ok   " if cond else "  FAIL ") + name)
    if not cond:
        FAILED.append(name)


def _schema(db):
    db.executescript(
        """
        CREATE TABLE courses (id TEXT PRIMARY KEY, title TEXT, subtitle TEXT DEFAULT '',
            description TEXT DEFAULT '', hero TEXT DEFAULT '', accent TEXT DEFAULT 'cal',
            price_label TEXT DEFAULT '', bmc_url TEXT DEFAULT '', access_mode TEXT DEFAULT 'paid',
            published INTEGER DEFAULT 1, sort INTEGER DEFAULT 100);
        CREATE TABLE modules (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id TEXT, title TEXT,
            summary TEXT DEFAULT '', category TEXT, sort INTEGER DEFAULT 0);
        CREATE TABLE lessons (id INTEGER PRIMARY KEY AUTOINCREMENT, module_id INTEGER, course_id TEXT,
            title TEXT, slug TEXT, kind TEXT DEFAULT 'reading', duration_min INTEGER DEFAULT 0,
            video_url TEXT DEFAULT '', video_file TEXT DEFAULT '', body_md TEXT DEFAULT '',
            body_html TEXT DEFAULT '', is_free INTEGER DEFAULT 0, published INTEGER DEFAULT 1,
            sort INTEGER DEFAULT 0, updated_at TEXT);
        """
    )


def test_levels():
    print("\n[levels / xp]")
    check("level 1 at 0 xp", level_for(0)[0] == 1)
    check("still level 1 at 299", level_for(299)[0] == 1)
    check("level 2 at 300", level_for(300)[0] == 2)
    check("level 3 at 800", level_for(800)[0] == 3)
    lvl, title, into, to_next = level_for(500)
    check("xp_into_level correct at 500", into == 200 and to_next == 300)
    check("max level has no next", level_for(999999)[3] is None)
    check("title is a string", isinstance(title, str) and title)

    mods = [[1, 2, 3], [4, 5], [6, 7, 8]]
    b = compute_xp(mods, [])
    check("no completions => 0 xp", b["xp"] == 0)
    b = compute_xp(mods, [1, 2, 3])
    check("full module => 3*100 + 200 bonus", b["xp"] == 500 and b["modules_completed"] == 1)
    b = compute_xp(mods, [1, 2, 3, 4, 5, 6, 7, 8])
    check("full course => lessons + 3 module + 500 course",
          b["xp"] == 8 * 100 + 3 * 200 + 500 and b["courses_completed"] == 1)

    agg = aggregate_profile([
        # course 1: fully complete -> 2*100 lessons + 200 module + 500 course
        {"module_lessons": [[1, 2]], "completed_ids": [1, 2]},
        # course 2: one lesson -> 100
        {"module_lessons": [[3, 4]], "completed_ids": [3]},
    ])
    check("aggregate xp sums across courses", agg["xp"] == (200 + 200 + 500) + 100)
    check("aggregate lessons count", agg["lessons_completed"] == 3)


def test_streak():
    print("\n[streak]")
    check("empty => 0", streak_days([], today="2026-09-10") == 0)
    check("today only => 1", streak_days(["2026-09-10"], today="2026-09-10") == 1)
    check("3 in a row => 3",
          streak_days(["2026-09-10", "2026-09-09", "2026-09-08"], today="2026-09-10") == 3)
    check("gap breaks it",
          streak_days(["2026-09-10", "2026-09-08"], today="2026-09-10") == 1)
    check("yesterday still counts (grace day)",
          streak_days(["2026-09-09", "2026-09-08"], today="2026-09-10") == 2)
    check("missed 2 days => 0",
          streak_days(["2026-09-07"], today="2026-09-10") == 0)


def test_markdown():
    print("\n[markdown]")
    h = render_markdown("# Hi\n\nSome **bold** and `code`.\n\n- a\n- b\n")
    check("heading", "<h1>Hi</h1>" in h)
    check("bold", "<strong>bold</strong>" in h)
    check("inline code", "<code>code</code>" in h)
    check("list", "<li>a</li>" in h and "<ul>" in h)
    h2 = render_markdown("```python\nx = 1\n```")
    check("fenced code", "<pre><code" in h2 and "x = 1" in h2)
    h3 = render_markdown("| a | b |\n|---|---|\n| 1 | 2 |")
    check("table", "<table>" in h3 and "<td>1</td>" in h3)


def test_seed():
    print("\n[seed]")
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    _schema(db)

    summary = seed_courses(db)
    check("seeded calisthenics", "calisthenics" in summary)
    check("seeded robotics", "robotics" in summary)

    cal = db.execute("SELECT COUNT(*) FROM lessons WHERE course_id='calisthenics'").fetchone()[0]
    rob = db.execute("SELECT COUNT(*) FROM lessons WHERE course_id='robotics'").fetchone()[0]
    check(f"calisthenics has lessons ({cal})", cal >= 20)
    check(f"robotics has lessons ({rob})", rob >= 25)

    free = db.execute("SELECT COUNT(*) FROM lessons WHERE is_free=1").fetchone()[0]
    check(f"some free lessons ({free})", free >= 6)

    slugs = [r[0] for r in db.execute("SELECT slug FROM lessons WHERE course_id='calisthenics'")]
    check("slugs are unique", len(slugs) == len(set(slugs)))

    real_free = db.execute(
        "SELECT COUNT(*) FROM lessons WHERE is_free=1 AND length(body_md) > 200"
    ).fetchone()[0]
    check(f"free lessons have real bodies ({real_free})", real_free >= 10)

    # idempotent: second seed skips
    summary2 = seed_courses(db)
    check("second seed skips", summary2["calisthenics"].get("skipped"))

    # reseed preserves lesson ids (progress safety)
    ids_before = {r["slug"]: r["id"] for r in db.execute(
        "SELECT slug,id FROM lessons WHERE course_id='calisthenics'")}
    seed_courses(db, only="calisthenics", force=True)
    ids_after = {r["slug"]: r["id"] for r in db.execute(
        "SELECT slug,id FROM lessons WHERE course_id='calisthenics'")}
    check("reseed keeps lesson ids stable",
          all(ids_before.get(s) == i for s, i in ids_after.items() if s in ids_before))

    md, mime = build_guide(db, "calisthenics", "md")
    check("guide md builds", md and md.startswith("# Calisthenics") and "## Module 1" in md)
    html, mime2 = build_guide(db, "robotics", "html")
    check("guide html builds", html and "<html" in html and mime2 == "text/html")


if __name__ == "__main__":
    test_levels()
    test_streak()
    test_markdown()
    test_seed()
    print()
    if FAILED:
        print(f"FAILED ({len(FAILED)}): " + ", ".join(FAILED))
        sys.exit(1)
    print("all LMS selftests passed")
