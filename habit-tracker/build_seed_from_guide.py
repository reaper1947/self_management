"""
build_seed_from_guide.py — split the master guide docs into per-lesson seed files.

    python3 build_seed_from_guide.py

Reads:
    ../docs/calisthenics-guide.md   ->  ../academy/seed/calisthenics/<file>
    ../docs/robotics-ros2-guide.md  ->  ../academy/seed/robotics/<file>

Each lesson in a guide is introduced by a line of the exact form:

    <!-- FILE: 02-static-support/01-support-hold.md -->

Everything between one marker and the next (trimmed) becomes that file's body.
After running this, open the admin panel and "Reseed from files" for each course
(or restart the app on a fresh DB).
"""
import os
import re

HERE = os.path.dirname(__file__)
JOBS = [
    ("../docs/calisthenics-guide.md", "../academy/seed/calisthenics"),
    ("../docs/robotics-ros2-guide.md", "../academy/seed/robotics"),
]
MARKER = re.compile(r"^<!--\s*FILE:\s*([A-Za-z0-9._/\-]+\.md)\s*-->\s*$", re.M)


def split_guide(src_path, out_dir):
    with open(src_path, "r", encoding="utf-8") as f:
        text = f.read()

    marks = list(MARKER.finditer(text))
    if not marks:
        print(f"  no FILE markers in {src_path}")
        return 0

    n = 0
    for i, m in enumerate(marks):
        rel = m.group(1)
        start = m.end()
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        body = text[start:end].strip() + "\n"

        dest = os.path.join(out_dir, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(body)
        n += 1
    return n


if __name__ == "__main__":
    total = 0
    for src, out in JOBS:
        src_p = os.path.normpath(os.path.join(HERE, src))
        out_p = os.path.normpath(os.path.join(HERE, out))
        c = split_guide(src_p, out_p)
        print(f"{os.path.basename(src)}: wrote {c} lesson files -> {out}")
        total += c
    print(f"done — {total} lesson files. Now reseed each course from the admin panel.")
