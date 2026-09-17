"""Smoke-check the public site without a browser or a running server.

Boots the Flask app with test_client(), walks every public route, and fails on
three things that have actually gone wrong on this site before:

  * a route that stopped serving, or an unknown path answering 200 (the old
    catch-all served newtab.html for everything, which reads to a crawler as a
    site full of duplicate pages)
  * a marketing claim that was removed coming back — the storefront once sold
    "50+ HD video lessons" for a course of 28 written ones, plus invented
    student counts and three invented testimonials
  * a data-i18n key present on the page but missing from EN or TH, which shows
    up as an English string stranded in the middle of the Thai page

Run from anywhere:  python3 tools/verify_site.py
"""
from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_DIR = os.path.join(ROOT, "habit-tracker")
sys.path.insert(0, APP_DIR)
os.chdir(APP_DIR)

import app  # noqa: E402

app.DB_PATH = os.path.join(os.environ.get("TEMP", "/tmp"), "verify_site.db")
app.init_db()
client = app.app.test_client()

ROUTES = [
    "/", "/robots.txt", "/sitemap.xml",
    "/storefront/", "/storefront/style.css", "/storefront/script.js",
    "/storefront/translations.js", "/storefront/og-card.png",
    "/storefront/favicon.svg",
    "/storefront/trial/robotics.html", "/storefront/trial/calisthenics.html",
    "/storefront/trial/lesson.css", "/storefront/trial/lesson.js",
    "/academy/", "/academy/academy.css", "/academy/lms.css",
    "/api/lms/courses",
]

# Strings that must never reappear on the storefront.
BANNED = [
    "HD video", "50+", "80+",                             # the video/count lie
    "marcus_j", "sarah_t", "david_l",                     # invented reviews
    "4.9", "520",                                         # invented rating/students
    "nutrition guide", "community access",                # promised, never existed
    "10 build projects", "Raspberry", "microcontroller",  # a different course
    "first-circuit",                                      # the Arduino trial lesson
]


def main() -> int:
    failures: list[str] = []

    for route in ROUTES:
        res = client.get(route)
        print("%4d %8d  %s" % (res.status_code, len(res.data), route))
        if res.status_code != 200:
            failures.append(f"{route} returned {res.status_code}, expected 200")

    unknown = "/definitely-not-a-real-path"
    res = client.get(unknown)
    print("%4d %8d  %s" % (res.status_code, len(res.data), unknown))
    if res.status_code != 404:
        failures.append(f"unknown path returned {res.status_code}, expected 404")

    storefront = client.get("/storefront/").get_data(as_text=True)
    for claim in BANNED:
        if claim in storefront:
            failures.append(f"removed claim is back on the storefront: {claim!r}")

    translations = client.get("/storefront/translations.js").get_data(as_text=True)
    keys = set(re.findall(r'data-i18n="([^"]+)"', storefront))
    en_block, _, th_block = translations.partition("th: {")
    for key in sorted(keys):
        if key + ":" not in en_block:
            failures.append(f"i18n key missing from EN: {key}")
        if key + ":" not in th_block:
            failures.append(f"i18n key missing from TH: {key}")
    print(f"i18n: {len(keys)} keys used on the storefront")

    failures += check_courses(storefront)
    return report(failures)


def check_courses(storefront: str) -> list[str]:
    """Each seed course must be internally consistent, and the storefront must
    quote the counts the seed actually has.

    The storefront has claimed a lesson count that the course did not have
    before, so this is checked rather than trusted.
    """
    import json

    failures: list[str] = []
    counts = {}
    for course in ("calisthenics", "robotics"):
        seed = os.path.join(ROOT, "academy", "seed", course)
        manifest = json.load(open(os.path.join(seed, "manifest.json"), encoding="utf-8"))
        lessons = [l for m in manifest["modules"] for l in m["lessons"]]
        counts[course] = (len(lessons), len(manifest["modules"]))

        figures_dir = os.path.join(ROOT, "academy", "figures")
        have = set(os.listdir(figures_dir)) if os.path.isdir(figures_dir) else set()
        for lesson in lessons:
            path = os.path.join(seed, lesson["file"])
            if not os.path.isfile(path):
                failures.append(f"{course}: manifest points at a missing file: {lesson['file']}")
                continue
            body = open(path, encoding="utf-8").read()
            for fig in re.findall(r"/academy/figures/([\w.-]+\.svg)", body):
                if fig not in have:
                    failures.append(f"{course}/{lesson['file']}: missing figure {fig}")

        md_files = [f for _, _, fs in os.walk(seed) for f in fs if f.endswith(".md")]
        if len(md_files) != len(lessons):
            failures.append(f"{course}: {len(md_files)} .md files on disk but "
                            f"{len(lessons)} in the manifest — stale lesson files?")

    total = sum(c for c, _ in counts.values())
    print("seed: " + ", ".join(f"{k} {c} lessons / {m} modules"
                               for k, (c, m) in counts.items())
          + f" — {total} total")

    for course, (count, modules) in counts.items():
        if f"{count} in-depth written lessons" not in storefront:
            failures.append(f"storefront does not quote {course}'s real lesson "
                            f"count ({count})")
    if f'data-count="{total}"' not in storefront:
        failures.append(f"storefront hero does not quote the real total ({total})")

    return failures


def report(failures: list[str]) -> int:

    if failures:
        print("\nFAIL")
        for f in failures:
            print("  -", f)
        return 1
    print("\nPASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
