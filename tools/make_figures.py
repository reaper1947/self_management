"""Draw every figure in the calisthenics course.

    python3 tools/make_figures.py      -> academy/figures/*.svg

Each figure is built from tools/figures.py, so the bodies share proportions and
every centre of mass and lever arm on the page is computed from the segment
model rather than drawn by eye.
"""
from __future__ import annotations

import math

from figures import (AMBER, AMBER_DEEP, CHALK, DIM, HEAD_R, INK, LINE, MUTE,
                     SEG, Pose, arrow, bar, com_marker, dim_h, ground,
                     hanging_pose, lever_poses, lever_table, line, pivot, svg,
                     text, write, _pt)

W, H = 520, 300


# ══════════════════════════════════════════════════════════════════════════
# 1. The lever arm — the single idea the whole static syllabus rests on
# ══════════════════════════════════════════════════════════════════════════

def fig_lever_arm():
    w, h = 620, 300
    barY, scale = 54, 2.0
    anchor = 150
    p = hanging_pose(scale, (anchor, barY + (SEG["upper_arm"] + SEG["forearm"]) * scale),
                     body_dir=0.0, arm_dir=90.0)
    com = p.com()
    dimY = 208
    g = [text((26, 30), "THE ONE EQUATION THE WHOLE STATIC SYLLABUS RUNS ON", "lbl-s")]
    g.append(bar(barY, 40, 580))
    g.append(line((anchor, barY), (anchor, dimY + 8), MUTE, 1, "3 4"))
    g.append(p.draw(sw=3.4))
    g.append(pivot((anchor, barY)))
    g.append(com_marker(com))
    g.append(arrow(com, (com[0], dimY - 18)))
    g.append(text((com[0] + 10, dimY - 34), "m · g", "lbl-a"))
    g.append(line(com, (com[0], dimY + 8), AMBER, 1, "3 4"))
    g.append(dim_h(anchor, com[0], dimY, "d"))
    g.append(text((26, 248), "τ = m · g · d", "big"))
    g.append(text((26, 270), "m is your mass and g is fixed, so d — and only d —", "lbl"))
    g.append(text((26, 288), "is the dial you get to turn.", "lbl"))
    return svg(w, h, "".join(g), "Torque about the bar is bodyweight times the "
                                 "horizontal distance to the centre of mass")


# ══════════════════════════════════════════════════════════════════════════
# 2. The front-lever ladder, with the measured lever arm under each rung
# ══════════════════════════════════════════════════════════════════════════

def _ladder(title, keys, poses_for, note_a, note_b, mirrored=False):
    """A 2x2 grid of lever positions, each with its measured lever arm.

    Laid out as a grid rather than a row so the bodies can be drawn big enough
    to read at the width of a lesson column.
    """
    w, h = 660, 540
    cellw, cellh = 330, 214
    g = [text((26, 30), title, "lbl-s")]
    for i, (key, label) in enumerate(keys):
        cx = 26 + (i % 2) * cellw
        cy = 58 + (i // 2) * cellh
        barY = cy + 26
        anchor = cx + (236 if mirrored else 64)
        p = poses_for(key, (anchor, barY))
        com = p.com()
        dimY = cy + 132
        g.append(bar(barY, cx + 8, cx + cellw - 26))
        g.append(line((anchor, barY), (anchor, dimY + 6), MUTE, 1, "3 4"))
        g.append(p.draw(sw=3))
        g.append(pivot((anchor, barY), 3.4))
        g.append(com_marker(com, 5))
        g.append(line(com, (com[0], dimY + 6), AMBER, 1, "3 4"))
        g.append(dim_h(anchor, com[0], dimY, ""))
        g.append(text((cx + 8, dimY + 34), label, "big"))
        g.append(text((cx + 8, dimY + 54), f"d = {abs(com[0] - anchor):.0f} px  ·  "
                                           f"{p._pct * 100:.0f}% of full", "lbl-a"))
    g.append(text((26, h - 28), note_a, "lbl-s"))
    g.append(text((26, h - 12), note_b, "lbl-s"))
    return svg(w, h, "".join(g), title)


def fig_fl_ladder():
    table = lever_table()
    names = {"tuck": "tuck", "advanced": "advanced tuck",
             "straddle": "straddle", "full": "full lay"}
    scale = 1.85

    def poses_for(key, anchor):
        p = lever_poses(scale, anchor)[key]
        p._pct = table[key][1]
        return p

    return _ladder(
        "THE FRONT-LEVER LADDER — AND WHAT EACH RUNG ACTUALLY COSTS",
        [(k, names[k]) for k in ("tuck", "advanced", "straddle", "full")],
        poses_for,
        "d is the horizontal distance from the bar to your centre of mass, and "
        "torque is m·g·d.",
        "Every percentage here was computed from segment masses — nothing on "
        "this page was estimated.",
    )


# ══════════════════════════════════════════════════════════════════════════
# 3. Where the torque actually comes from
# ══════════════════════════════════════════════════════════════════════════

def fig_torque_breakdown():
    """Stacked contribution of each body part to full-lever torque."""
    from figures import MASS
    scale = 1.0
    p = lever_poses(scale, (0.0, 0.0))["full"]

    def along(a, b, f):
        return a[0] + (b[0] - a[0]) * f

    parts = [
        ("head", MASS["head"][0], p.head[0]),
        ("torso", MASS["trunk"][0], along(p.hip, p.shoulder, 0.5)),
        ("arms", MASS["upper_arm"][0] + MASS["forearm"][0], 0.0),
        ("thighs", MASS["thigh"][0], along(p.hip, p.knee, 0.433)),
        ("shins + feet", MASS["shank"][0] + MASS["foot"][0],
         along(p.knee, p.ankle, 0.5)),
    ]
    total = sum(m * x for _, m, x in parts)

    w, h = 620, 250
    x0, y0, bw = 60, 60, 460
    g = []
    cursor = x0
    for i, (label, m, x) in enumerate(parts):
        share = (m * x) / total
        width = share * bw
        fill = AMBER if label == "torso" else (
            AMBER_DEEP if label in ("thighs", "shins + feet") else MUTE)
        if width < 0:  # the head hangs on the far side and subtracts
            g.append(f'<rect x="{cursor + width:.1f}" y="{y0}" '
                     f'width="{abs(width):.1f}" height="44" fill="{INK}" '
                     f'stroke="{MUTE}" stroke-width="1" stroke-dasharray="3 3"/>')
        else:
            g.append(f'<rect x="{cursor:.1f}" y="{y0}" width="{width:.1f}" '
                     f'height="44" fill="{fill}" opacity="0.92"/>')
            g.append(f'<rect x="{cursor:.1f}" y="{y0}" width="{width:.1f}" '
                     f'height="44" fill="none" stroke="{INK}" stroke-width="2"/>')
        ty = 128 + (i % 2) * 34
        cx = cursor + width / 2
        g.append(line((cx, y0 + 48), (cx, ty - 16), MUTE, 1))
        g.append(text((cx, ty), label, "lbl", "middle"))
        g.append(text((cx, ty + 15), f"{share * 100:.0f}%", "lbl-a", "middle"))
        cursor += max(width, 0)

    g.insert(0, text((60, 38), "FULL FRONT LEVER — WHERE THE TORQUE COMES FROM", "lbl-s"))
    g.append(text((60, 224),
                  "Your torso alone is a third of it, and a tuck cannot remove "
                  "any of that —", "lbl-s"))
    g.append(text((60, 238),
                  "which is why even a deep tuck still asks for two thirds of "
                  "the full hold.", "lbl-s"))
    return svg(w, h, "".join(g), "Contribution of each body segment to "
                                 "front-lever torque")


# ══════════════════════════════════════════════════════════════════════════
# 4. Hollow body vs arch
# ══════════════════════════════════════════════════════════════════════════

def _spine(x, y, curve, length=150, color=CHALK, sw=3.2):
    """A spine drawn as a quadratic curve; `curve` bows it up (+) or down (-)."""
    return (f'<path d="M{x} {y} Q{x + length / 2} {y - curve} {x + length} {y}" '
            f'fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round"/>')


def fig_hollow_arch():
    w, h = 560, 260
    g = [text((40, 34), "THE TWO SHAPES EVERYTHING IS BUILT FROM", "lbl-s")]

    # hollow
    g.append(_spine(60, 110, 34))
    g.append(f'<circle cx="52" cy="98" r="{HEAD_R * 1.5}" fill="none" '
             f'stroke="{CHALK}" stroke-width="3.2"/>')
    g.append(line((60, 130), (210, 130), LINE, 1, "3 4"))
    g.append(arrow((135, 130), (135, 100), AMBER, 1.5))
    g.append(text((142, 118), "ribs down, pelvis tucked", "lbl-a"))
    g.append(text((40, 168), "HOLLOW", "big"))
    g.append(text((40, 188), "lower back flat against the floor.", "lbl"))
    g.append(text((40, 204), "This is the shape of every straight-arm", "lbl"))
    g.append(text((40, 220), "hold you will ever do.", "lbl"))

    # arch
    g.append(_spine(320, 110, -34))
    g.append(f'<circle cx="312" cy="122" r="{HEAD_R * 1.5}" fill="none" '
             f'stroke="{CHALK}" stroke-width="3.2"/>')
    g.append(line((320, 130), (470, 130), LINE, 1, "3 4"))
    g.append(text((40, 240),
                  "A lever held in an arch leaks force at the hips — "
                  "the shape is the strength.", "lbl-s"))
    g.append(text((320, 168), "ARCH", "big"))
    g.append(text((320, 188), "the shape a tired lever collapses into.", "lbl"))
    g.append(text((320, 204), "Train it deliberately (superman holds),", "lbl"))
    g.append(text((320, 220), "never accept it in a lever.", "lbl"))
    return svg(w, h, "".join(g), "Hollow body versus arch")


# ══════════════════════════════════════════════════════════════════════════
# 5. Dead hang vs active hang
# ══════════════════════════════════════════════════════════════════════════

def fig_scap():
    w, h = 520, 300
    barY, scale = 46, 1.5
    g = [bar(barY, 40, 480)]
    for x, drop, label, note in (
        (150, 0, "DEAD HANG", "shoulders at the ears"),
        (370, -13, "ACTIVE HANG", "shoulders pulled down"),
    ):
        arm = (SEG["upper_arm"] + SEG["forearm"]) * scale
        sh = (x, barY + arm + drop)
        p = Pose.__new__(Pose)
        p.shoulder = sh
        p.hip = _pt(sh, SEG["trunk"] * scale, -90)
        p.head = _pt(sh, SEG["neck"] * scale, 90)
        p.elbow = _pt(sh, SEG["upper_arm"] * scale, 90)
        p.wrist = _pt(p.elbow, SEG["forearm"] * scale, 90)
        p.knee = _pt(p.hip, SEG["thigh"] * scale, -90)
        p.ankle = _pt(p.knee, SEG["shank"] * scale, -90)
        p.toe = _pt(p.ankle, SEG["foot"] * scale, -10)
        g.append(p.draw(sw=3))
        g.append(line((x - 52, sh[1]), (x + 52, sh[1]), AMBER, 1.2, "4 4"))
        g.append(text((x, 246), label, "big", "middle"))
        g.append(text((x, 264), note, "lbl", "middle"))
    g.append(arrow((262, 108), (262, 92), AMBER, 1.6))
    g.append(text((272, 104), "13 units of travel —", "lbl-a"))
    g.append(text((272, 118), "that gap is the whole", "lbl-a"))
    g.append(text((272, 132), "scapular pull", "lbl-a"))
    g.append(text((40, 288),
                  "Everything hard on a bar starts by closing this gap first.",
                  "lbl-s"))
    return svg(w, h, "".join(g), "Dead hang compared with an active hang")


# ══════════════════════════════════════════════════════════════════════════
# 6. The pull-up, phase by phase
# ══════════════════════════════════════════════════════════════════════════

def fig_pullup_phases():
    w, h = 760, 290
    barY, scale = 44, 1.2
    arm_full = (SEG["upper_arm"] + SEG["forearm"]) * scale
    g = [bar(barY, 30, 730)]
    phases = [
        (110, arm_full, 0, "1 · dead hang", "arms straight, shoulders long"),
        (280, arm_full - 16, 0, "2 · scapular pull", "shoulders down, arms still straight"),
        (450, arm_full * 0.62, 40, "3 · the pull", "elbows drive down and back"),
        (620, arm_full * 0.30, 78, "4 · chin over", "chest to the bar, not the chin"),
    ]
    for x, drop, elbow_out, label, note in phases:
        sh = (x, barY + drop)
        p = Pose.__new__(Pose)
        p.shoulder = sh
        p.hip = _pt(sh, SEG["trunk"] * scale, -90)
        p.head = _pt(sh, SEG["neck"] * scale, 90)
        p.elbow = (x - elbow_out * 0.55, barY + drop * 0.45)
        p.wrist = (x, barY)
        p.knee = _pt(p.hip, SEG["thigh"] * scale, -78)
        p.ankle = _pt(p.knee, SEG["shank"] * scale, -100)
        p.toe = _pt(p.ankle, SEG["foot"] * scale, -20)
        g.append(p.draw(sw=2.8))
        g.append(text((x, 236), label, "lbl-a", "middle"))
        g.append(text((x, 254), note, "lbl-s", "middle"))
    g.append(text((30, 282),
                  "Most people never do step 2, and then wonder why step 3 "
                  "stalls halfway.", "lbl-s"))
    return svg(w, h, "".join(g), "The four phases of a pull-up")


# ══════════════════════════════════════════════════════════════════════════
# 7. Push-up load by hand height  (measured values, not modelled)
# ══════════════════════════════════════════════════════════════════════════

def fig_pushup_load():
    w, h = 560, 290
    rows = [
        ("hands on a wall", 0.28),
        ("hands waist high", 0.41),
        ("hands on a low box", 0.55),
        ("knees, on the floor", 0.53),
        ("full push-up, top", 0.64),
        ("full push-up, bottom", 0.75),
        ("feet elevated 30 cm", 0.74),
    ]
    x0, bw = 210, 280
    g = [text((36, 34), "WHAT FRACTION OF YOUR BODYWEIGHT IS ON YOUR HANDS", "lbl-s")]
    for i, (label, frac) in enumerate(rows):
        y = 62 + i * 29
        g.append(text((196, y + 4), label, "lbl", "end"))
        g.append(f'<rect x="{x0}" y="{y - 9}" width="{bw}" height="16" '
                 f'fill="none" stroke="{LINE}" stroke-width="1"/>')
        g.append(f'<rect x="{x0}" y="{y - 9}" width="{bw * frac:.1f}" '
                 f'height="16" fill="{AMBER}" opacity="0.88"/>')
        g.append(text((x0 + bw * frac + 8, y + 4), f"{frac * 100:.0f}%", "lbl-a"))
    g.append(text((36, 272),
                  "Approximate, from force-plate studies. The ladder you climb "
                  "is this column.", "lbl-s"))
    return svg(w, h, "".join(g), "Fraction of bodyweight supported by the hands "
                                 "in push-up variations")


# ══════════════════════════════════════════════════════════════════════════
# 8. Dip lean
# ══════════════════════════════════════════════════════════════════════════

def fig_dip_lean():
    """The bottom of a dip, drawn from the hands down — because the hands are
    the fixed point and everything else is arranged relative to them."""
    w, h = 600, 300
    scale = 1.5
    g = [text((26, 30), "THE LEAN DECIDES WHAT THE DIP TRAINS", "lbl-s")]
    for hx, lean, title, note in ((170, 0, "UPRIGHT", "elbows tight, triceps"),
                                  (420, 32, "LEANING", "chest over the hands")):
        hand = (hx, 74)
        # shoulder sits below and slightly in front of the hand at the bottom
        shoulder = _pt(hand, SEG["upper_arm"] * scale * 1.05, -80 + lean * 0.7)
        p = Pose.__new__(Pose)
        p.wrist = hand
        p.elbow = _pt(hand, SEG["forearm"] * scale * 0.55, -105 + lean * 0.3)
        p.shoulder = shoulder
        p.hip = _pt(shoulder, SEG["trunk"] * scale, -90 + lean)
        p.head = _pt(shoulder, SEG["neck"] * scale, 90 + lean)
        p.knee = _pt(p.hip, SEG["thigh"] * scale, -95 + lean * 0.5)
        p.ankle = _pt(p.knee, SEG["shank"] * scale, -95 + lean * 0.2)
        p.toe = _pt(p.ankle, SEG["foot"] * scale, -30)
        # the parallel bar, seen end-on
        g.append(f'<rect x="{hx - 16}" y="68" width="32" height="7" fill="{MUTE}"/>')
        g.append(p.draw(sw=3))
        g.append(line((hx, 68), (hx, 232), MUTE, 1, "3 4"))
        g.append(com_marker(p.com(), 5))
        g.append(dim_h(hx, p.com()[0], 232, ""))
        g.append(text((hx, 258), title, "big", "middle"))
        g.append(text((hx, 278), note, "lbl", "middle"))
    g.append(text((26, h - 22), "Upright, d is almost zero — the elbows do the "
                  "work. Lean, and d opens up under your chest.", "lbl-s"))
    g.append(text((26, h - 6), "Same movement, two different jobs. Pick one per "
                  "block and stay with it.", "lbl-s"))
    return svg(w, h, "".join(g), "Upright versus leaning dip")


# ══════════════════════════════════════════════════════════════════════════
# 9. L-sit — torque about the hands
# ══════════════════════════════════════════════════════════════════════════

def fig_lsit():
    w, h = 620, 300
    scale = 1.95
    sh = (150, 96)
    p = Pose.__new__(Pose)
    p.shoulder = sh
    p.hip = _pt(sh, SEG["trunk"] * scale, -90)
    p.head = _pt(sh, SEG["neck"] * scale, 90)
    p.elbow = _pt(sh, SEG["upper_arm"] * scale, -90)
    p.wrist = _pt(p.elbow, SEG["forearm"] * scale, -90)
    p.knee = _pt(p.hip, SEG["thigh"] * scale, 0)
    p.ankle = _pt(p.knee, SEG["shank"] * scale, 0)
    p.toe = _pt(p.ankle, SEG["foot"] * scale, 60)
    com = p.com()
    g = [p.draw(sw=3)]
    g.append(line((p.wrist[0] - 30, p.wrist[1]), (p.wrist[0] + 30, p.wrist[1]),
                  MUTE, 2.4))
    g.append(pivot(p.wrist, 3))
    g.append(line((p.wrist[0], p.wrist[1]), (p.wrist[0], 236), MUTE, 1, "3 4"))
    g.append(com_marker(com))
    g.append(arrow(com, (com[0], com[1] + 60)))
    g.append(text((com[0] + 10, com[1] + 56), "m·g", "lbl-a"))
    g.append(dim_h(p.wrist[0], com[0], 230, "d"))
    g.append(text((360, 96), "Straighten the knees and d grows.", "lbl"))
    g.append(text((360, 116), "Nothing about you changed —", "lbl"))
    g.append(text((360, 136), "the lever did.", "lbl"))
    g.append(text((360, 172), "tuck → one leg → L-sit", "lbl-a"))
    g.append(text((360, 192), "is one ladder, not three", "lbl"))
    g.append(text((360, 212), "separate skills.", "lbl"))
    g.append(text((26, 276),
                  "Push the floor away and stay tall: a sunk shoulder shortens "
                  "nothing and costs everything.", "lbl-s"))
    return svg(w, h, "".join(g), "Torque about the hands in an L-sit")


# ══════════════════════════════════════════════════════════════════════════
# 10. Handstand balance — centre of mass over the base
# ══════════════════════════════════════════════════════════════════════════

def fig_handstand():
    w, h = 560, 300
    scale = 1.45
    for_x = [(150, 0, "BALANCED", "line of gravity inside the hands"),
             (390, 16, "FALLING OVER", "line of gravity past the fingers")]
    g = []
    for x, tilt, title, note in for_x:
        wrist = (x, 214)
        p = Pose.__new__(Pose)
        p.wrist = wrist
        p.elbow = _pt(wrist, SEG["forearm"] * scale, 90 + tilt * 0.35)
        p.shoulder = _pt(p.elbow, SEG["upper_arm"] * scale, 90 + tilt * 0.35)
        p.hip = _pt(p.shoulder, SEG["trunk"] * scale, 90 + tilt * 0.55)
        p.head = _pt(p.shoulder, SEG["neck"] * scale, -90 + tilt * 0.3)
        p.knee = _pt(p.hip, SEG["thigh"] * scale, 90 + tilt)
        p.ankle = _pt(p.knee, SEG["shank"] * scale, 90 + tilt)
        p.toe = _pt(p.ankle, SEG["foot"] * scale, 90 + tilt)
        com = p.com()
        g.append(ground(222, x - 90, x + 90))
        g.append(p.draw(sw=3))
        # base of support = the hand
        g.append(f'<rect x="{x - 16}" y="210" width="34" height="7" '
                 f'fill="{AMBER}" opacity="0.30"/>')
        g.append(com_marker(com, 5))
        g.append(line(com, (com[0], 222), AMBER, 1.3, "4 4"))
        g.append(text((x, 250), title, "lbl-a", "middle"))
        g.append(text((x, 268), note, "lbl-s", "middle"))
    g.insert(0, text((40, 34), "BALANCE IS ONE RULE, AND YOUR FINGERS ENFORCE IT",
                     "lbl-s"))
    g.append(text((40, 292),
                  "Press the fingers to stop going over; press the heel of the "
                  "hand to stop falling back.", "lbl-s"))
    return svg(w, h, "".join(g), "Centre of mass over the base of support in a "
                                 "handstand")


# ══════════════════════════════════════════════════════════════════════════
# 11. Planche lean
# ══════════════════════════════════════════════════════════════════════════

def fig_planche_lean():
    w, h = 560, 280
    scale = 1.4
    g = [text((40, 32), "LEAN IS THE DIAL. THE LEAN IS THE WHOLE SKILL.", "lbl-s")]
    for x, lean, label in ((140, 8, "small lean"), (380, 30, "big lean")):
        wrist = (x, 190)
        sh = _pt(wrist, (SEG["upper_arm"] + SEG["forearm"]) * scale, 90 - lean)
        p = Pose.__new__(Pose)
        p.wrist = wrist
        p.elbow = _pt(wrist, SEG["forearm"] * scale, 90 - lean)
        p.shoulder = sh
        p.hip = _pt(sh, SEG["trunk"] * scale, -lean)
        p.head = _pt(sh, SEG["neck"] * scale, 180 - lean)
        p.knee = _pt(p.hip, SEG["thigh"] * scale, -lean)
        p.ankle = _pt(p.knee, SEG["shank"] * scale, -lean)
        p.toe = _pt(p.ankle, SEG["foot"] * scale, -lean - 70)
        com = p.com()
        g.append(ground(198, x - 80, x + 150))
        g.append(p.draw(sw=2.9))
        g.append(pivot(wrist, 3))
        g.append(line(wrist, (wrist[0], 236), MUTE, 1, "3 4"))
        g.append(com_marker(com, 4.8))
        g.append(line(com, (com[0], 236), AMBER, 1.2, "4 4"))
        g.append(dim_h(wrist[0], com[0], 236, f"d"))
        g.append(text((x - 10, 262), label, "lbl"))
    g.append(text((40, 276),
                  "Lean further and d grows; d is what your shoulders pay for. "
                  "Add degrees, never reps.", "lbl-s"))
    return svg(w, h, "".join(g), "Planche lean and the growing lever arm")


# ══════════════════════════════════════════════════════════════════════════
# 12. Back-lever ladder
# ══════════════════════════════════════════════════════════════════════════

def fig_bl_ladder():
    """The same ladder face-down. The arithmetic is identical; the shoulder
    position is not, which is the whole reason it gets its own lesson."""
    scale = 1.85
    arm = (SEG["upper_arm"] + SEG["forearm"]) * scale
    steps = {"tuck": (125.0, 150.0, 0.0), "advanced": (95.0, 95.0, 0.0),
             "straddle": (0.0, 0.0, 55.0), "full": (0.0, 0.0, 0.0)}
    names = {"tuck": "tuck", "advanced": "advanced tuck",
             "straddle": "straddle", "full": "full lay"}

    ref = None

    def poses_for(key, anchor):
        nonlocal ref
        hf, kf, ab = steps[key]
        p = hanging_pose(scale, (anchor[0], anchor[1] + arm), body_dir=180.0,
                         hip_flex=-hf, knee_flex=-kf, arm_dir=90.0, abduct=ab)
        d = abs(p.com()[0] - anchor[0])
        if key == "full":
            ref = d
        p._d = d
        p._pct = 0.0
        return p

    # measure the full lay first so the others can be expressed against it
    probe = poses_for("full", (0.0, 0.0))
    full_d = probe._d

    def poses(key, anchor):
        p = poses_for(key, anchor)
        p._pct = p._d / full_d
        return p

    return _ladder(
        "THE BACK-LEVER LADDER — THE SAME ARITHMETIC, FACE DOWN",
        [(k, names[k]) for k in ("tuck", "advanced", "straddle", "full")],
        poses,
        "Identical lever maths to the front lever — but here the shoulder is in "
        "extension, not flexion.",
        "That is why the german hang comes first and why nobody should rush "
        "this one.",
        mirrored=True,
    )


# ══════════════════════════════════════════════════════════════════════════
# 13. The muscle-up path
# ══════════════════════════════════════════════════════════════════════════

def fig_muscleup_path():
    w, h = 560, 300
    barY = 60
    bx = 280
    g = [bar(barY, 60, 500)]
    # the wrong path: straight up into the bar
    g.append(f'<path d="M{bx} 238 L{bx} {barY + 16}" fill="none" '
             f'stroke="{MUTE}" stroke-width="2" stroke-dasharray="5 5"/>')
    g.append(text((bx + 10, 150), "straight up", "lbl-s"))
    g.append(text((bx + 10, 164), "→ you hit the bar", "lbl-s"))
    # the right path: a C, around the bar
    g.append(f'<path d="M{bx} 238 C{bx - 74} 196 {bx - 74} {barY + 40} '
             f'{bx - 6} {barY + 12}" fill="none" stroke="{AMBER}" '
             f'stroke-width="2.4" marker-end="url(#a)"/>')
    g.append(text((70, 120), "THE PATH IS A C, NOT A LINE", "lbl-a"))
    g.append(text((70, 142), "Pull the bar to your ribs, not", "lbl"))
    g.append(text((70, 160), "your chin to the bar. The chest", "lbl"))
    g.append(text((70, 178), "arrives over the bar, then the", "lbl"))
    g.append(text((70, 196), "elbows rotate through.", "lbl"))
    g.append(pivot((bx, barY), 4))
    g.append(text((60, 268),
                  "A muscle-up is not a big pull-up. It is a pull-up that "
                  "changes direction at the top.", "lbl-s"))
    g.append(text((60, 286),
                  "If your pull stops at the sternum you do not need more "
                  "power — you need a different arc.", "lbl-s"))
    return svg(w, h, "".join(g), "The path a muscle-up actually takes")


# ══════════════════════════════════════════════════════════════════════════
# 14. Force capacity by contraction type
# ══════════════════════════════════════════════════════════════════════════

def fig_force_capacity():
    w, h = 460, 250
    rows = [("lowering (eccentric)", 1.30), ("holding (isometric)", 1.00),
            ("lifting (concentric)", 0.85)]
    x0, bw = 200, 210
    g = [text((36, 34), "HOW MUCH FORCE A MUSCLE CAN MAKE", "lbl-s")]
    for i, (label, v) in enumerate(rows):
        y = 74 + i * 40
        g.append(text((188, y + 4), label, "lbl", "end"))
        g.append(f'<rect x="{x0}" y="{y - 11}" width="{bw * (v / 1.3):.1f}" '
                 f'height="20" fill="{AMBER if i == 0 else MUTE}" opacity="0.9"/>')
        g.append(text((x0 + bw * (v / 1.3) + 8, y + 4), f"{v:.2f}×", "lbl-a"))
    g.append(text((36, 208),
                  "You can lower a weight you cannot lift. That gap is the", "lbl-s"))
    g.append(text((36, 224),
                  "entire reason negatives build a first pull-up.", "lbl-s"))
    return svg(w, h, "".join(g), "Relative force capacity of eccentric, "
                                 "isometric and concentric contraction")


# ══════════════════════════════════════════════════════════════════════════
# 15. Tempo notation
# ══════════════════════════════════════════════════════════════════════════

def fig_tempo():
    w, h = 520, 230
    g = [text((36, 34), "TEMPO — FOUR NUMBERS, ONE REP", "lbl-s")]
    segs = [("3", "lower", 120), ("1", "pause", 40), ("1", "lift", 60), ("0", "top", 30)]
    x = 60
    y = 92
    for num, label, wd in segs:
        g.append(f'<rect x="{x}" y="{y}" width="{wd}" height="34" fill="none" '
                 f'stroke="{LINE}" stroke-width="1"/>')
        g.append(text((x + wd / 2, y + 23), num, "big", "middle"))
        g.append(text((x + wd / 2, y + 52), label, "lbl-s", "middle"))
        x += wd + 6
    g.append(text((60, 170), "3 · 1 · 1 · 0", "lbl-a"))
    g.append(text((60, 194),
                  "Three seconds down, one-second pause, one second up, no rest "
                  "at the top.", "lbl"))
    g.append(text((60, 214),
                  "Written like this, \"go slower\" becomes a number you can "
                  "actually repeat.", "lbl-s"))
    return svg(w, h, "".join(g), "How tempo notation works")


FIGURES = {
    "lever-arm.svg": fig_lever_arm,
    "front-lever-ladder.svg": fig_fl_ladder,
    "torque-breakdown.svg": fig_torque_breakdown,
    "hollow-arch.svg": fig_hollow_arch,
    "scapular-pull.svg": fig_scap,
    "pullup-phases.svg": fig_pullup_phases,
    "pushup-load.svg": fig_pushup_load,
    "dip-lean.svg": fig_dip_lean,
    "l-sit.svg": fig_lsit,
    "handstand-balance.svg": fig_handstand,
    "planche-lean.svg": fig_planche_lean,
    "back-lever-ladder.svg": fig_bl_ladder,
    "muscleup-path.svg": fig_muscleup_path,
    "force-capacity.svg": fig_force_capacity,
    "tempo.svg": fig_tempo,
}


if __name__ == "__main__":
    for name, fn in FIGURES.items():
        write(name, fn())
        print("wrote", name)
    print(f"\n{len(FIGURES)} figures -> academy/figures/")
