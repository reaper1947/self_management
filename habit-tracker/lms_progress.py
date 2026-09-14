"""
lms_progress.py — pure XP / level / streak helpers for the Peter1947 Academy LMS.

No Flask, no DB — just functions over plain data so they can be unit-tested
directly (see selftest_lms.py).

XP model
--------
    lesson completed        +100
    module fully completed   +200   (bonus, on top of its lessons)
    course fully completed   +500   (bonus, on top of its modules)
"""

XP_LESSON = 100
XP_MODULE_BONUS = 200
XP_COURSE_BONUS = 500

RANKS = [
    "Recruit", "Novice", "Apprentice", "Practitioner", "Adept",
    "Specialist", "Expert", "Master", "Grandmaster",
]
# XP required to *reach* each level index (level = index + 1).
THRESHOLDS = [0, 300, 800, 1600, 2800, 4500, 7000, 10500, 15000]


def level_for(xp):
    """Return (level:int>=1, title:str, xp_into_level:int, xp_to_next:int|None)."""
    xp = max(0, int(xp or 0))
    idx = 0
    for i, t in enumerate(THRESHOLDS):
        if xp >= t:
            idx = i
        else:
            break
    level = idx + 1
    title = RANKS[min(idx, len(RANKS) - 1)]
    base = THRESHOLDS[idx]
    if idx + 1 < len(THRESHOLDS):
        nxt = THRESHOLDS[idx + 1]
        return level, title, xp - base, nxt - xp
    return level, title, xp - base, None  # max level reached


def compute_xp(module_lessons, completed_ids):
    """
    module_lessons: list of modules, each a list/iterable of lesson ids
                    e.g. [[1,2,3], [4,5], [6,7,8]]
    completed_ids : set/collection of lesson ids the student has completed

    Returns dict: xp, lessons_completed, modules_completed, courses_completed(0/1),
                  and the derived level fields.
    """
    done = set(completed_ids or [])
    all_ids = [lid for mod in module_lessons for lid in mod]
    lessons_done = sum(1 for lid in all_ids if lid in done)

    xp = lessons_done * XP_LESSON
    modules_done = 0
    for mod in module_lessons:
        mod = list(mod)
        if mod and all(lid in done for lid in mod):
            modules_done += 1
            xp += XP_MODULE_BONUS

    course_done = 1 if all_ids and all(lid in done for lid in all_ids) else 0
    if course_done:
        xp += XP_COURSE_BONUS

    level, title, into, to_next = level_for(xp)
    return {
        "xp": xp,
        "lessons_completed": lessons_done,
        "modules_completed": modules_done,
        "courses_completed": course_done,
        "level": level,
        "level_title": title,
        "xp_into_level": into,
        "xp_to_next": to_next,
    }


def streak_days(dates, today=None):
    """
    dates : iterable of 'YYYY-MM-DD' strings (completion days, any order, dupes ok)
    today : optional 'YYYY-MM-DD' (defaults to real today)

    Returns the number of consecutive days up to and including today (or yesterday,
    so a streak isn't "lost" until a full day is missed) that have >=1 completion.
    """
    import datetime

    day_set = {d for d in dates if d}
    if not day_set:
        return 0
    if today is None:
        today = datetime.date.today().isoformat()
    cur = datetime.date.fromisoformat(today)

    # allow the streak to "hold" through today if the last activity was yesterday
    if cur.isoformat() not in day_set:
        cur = cur - datetime.timedelta(days=1)
        if cur.isoformat() not in day_set:
            return 0

    count = 0
    while cur.isoformat() in day_set:
        count += 1
        cur = cur - datetime.timedelta(days=1)
    return count


def aggregate_profile(courses):
    """
    courses: list of dicts, each {module_lessons: [[ids]...], completed_ids: set}
    Returns the combined profile stats across all courses (XP sums).
    """
    total_xp = 0
    total_lessons = 0
    for c in courses:
        b = compute_xp(c["module_lessons"], c["completed_ids"])
        total_xp += b["xp"]
        total_lessons += b["lessons_completed"]
    level, title, into, to_next = level_for(total_xp)
    return {
        "xp": total_xp,
        "lessons_completed": total_lessons,
        "level": level,
        "level_title": title,
        "xp_into_level": into,
        "xp_to_next": to_next,
    }
