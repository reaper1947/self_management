"""Create a student account and grant it every course — for testing the course
as a real student sees it.

    python3 tools/make_student.py you@example.com
    python3 tools/make_student.py you@example.com --grant-only
    python3 tools/make_student.py you@example.com --revoke

The password is typed by you, at the prompt, and is never echoed, never passed
as an argument (so it stays out of your shell history and out of `ps`), and
never written anywhere except as a werkzeug hash in the database. Nothing here
prints it back.

Why this exists: the admin panel logs in with APP_PASSWORD and sees the admin
views. It cannot walk the course the way a paying student does — XP, streaks,
locked lessons, the player, progress saving. To find bugs in that experience you
need a real student row, and this makes one.

Run it on the machine that holds the database. In Docker:

    sudo docker exec -it <container> python3 /app/tools/make_student.py you@example.com
"""
from __future__ import annotations

import argparse
import getpass
import os
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.environ.get(
    "LMS_DB", os.path.join(ROOT, "habit-tracker", "habit_tracker.db"))

try:
    from werkzeug.security import generate_password_hash
except ImportError:  # pragma: no cover
    sys.exit("werkzeug is not installed — run this inside the app's environment.")

MIN_PASSWORD = 10


def connect() -> sqlite3.Connection:
    if not os.path.exists(DB_PATH):
        sys.exit(f"no database at {DB_PATH}\n"
                 "Set LMS_DB=/path/to/habit_tracker.db, or run this on the host "
                 "that serves the site.")
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def ask_password() -> str:
    """Read a password from the terminal, twice, without echoing it."""
    while True:
        first = getpass.getpass("Password for the new account: ")
        if len(first) < MIN_PASSWORD:
            print(f"  too short — use at least {MIN_PASSWORD} characters.")
            continue
        if first != getpass.getpass("Again: "):
            print("  they did not match.")
            continue
        return first


def grant_all(db: sqlite3.Connection, student_id: int) -> list[str]:
    granted = []
    for row in db.execute("SELECT id FROM courses ORDER BY sort, id"):
        cid = row["id"]
        exists = db.execute(
            "SELECT 1 FROM purchases WHERE student_id=? AND course_id=?",
            (student_id, cid)).fetchone()
        if exists:
            continue
        db.execute(
            "INSERT INTO purchases (student_id, course_id, source, note) "
            "VALUES (?,?,?,?)",
            (student_id, cid, "admin", "granted by tools/make_student.py"))
        granted.append(cid)
    return granted


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("email")
    ap.add_argument("--name", default="", help="display name, optional")
    ap.add_argument("--grant-only", action="store_true",
                    help="account already exists — just grant every course")
    ap.add_argument("--revoke", action="store_true",
                    help="remove every course grant from this account")
    args = ap.parse_args()

    email = args.email.strip().lower()
    db = connect()

    student = db.execute("SELECT id, email, name FROM students WHERE email=?",
                         (email,)).fetchone()

    if args.revoke:
        if not student:
            sys.exit(f"no account for {email}")
        n = db.execute("DELETE FROM purchases WHERE student_id=?",
                       (student["id"],)).rowcount
        db.commit()
        print(f"revoked {n} grant(s) from {email}")
        return 0

    if student and not args.grant_only:
        sys.exit(f"{email} already exists (id {student['id']}).\n"
                 "Use --grant-only to give it every course, or pick another "
                 "address. This tool will not change an existing password.")

    if not student:
        if args.grant_only:
            sys.exit(f"no account for {email} — drop --grant-only to create it.")
        password = ask_password()
        db.execute(
            "INSERT INTO students (email, password_hash, name) VALUES (?,?,?)",
            (email, generate_password_hash(password), args.name or email.split("@")[0]))
        db.commit()
        student = db.execute("SELECT id, email, name FROM students WHERE email=?",
                             (email,)).fetchone()
        print(f"created student {email} (id {student['id']})")

    granted = grant_all(db, student["id"])
    db.commit()

    total = db.execute("SELECT COUNT(*) FROM purchases WHERE student_id=?",
                       (student["id"],)).fetchone()[0]
    if granted:
        print("granted: " + ", ".join(granted))
    else:
        print("no new grants — this account already had every course")
    print(f"{email} now has access to {total} course(s)")
    print("\nSign in at /academy/ with that email and the password you just set.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
