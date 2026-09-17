"""Generate the course figures as SVG.

Every diagram in the calisthenics course comes from here, so they share one
visual system: chalk figure, graphite construction lines, amber for the physics.

The important part is that the physics is *computed*, not drawn by eye. A pose
is a set of joint angles; the body is built from Winter's anthropometric segment
lengths, and the centre of mass is the mass-weighted mean of the segment centres
using Winter's mass fractions. So when a figure says a tuck front lever is 38%
of the torque of a full one, that number came out of the model — nobody guessed
it, and the lever arm drawn on the page is the one that was measured.

    python3 tools/figures.py            # writes academy/figures/*.svg

Reference: D. A. Winter, *Biomechanics and Motor Control of Human Movement*,
segment parameter tables (mass fraction, CoM location as a fraction of segment
length from the proximal end).
"""
from __future__ import annotations

import math
import os

OUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "academy", "figures"
)

# ── palette (the site's, fixed: every surface these sit on is dark) ────────
INK = "#0a0d12"
CHALK = "#ece7dd"
DIM = "#9aa3ad"
MUTE = "#646d78"
LINE = "#2b3543"
AMBER = "#ff9a2e"
AMBER_DEEP = "#c96f10"

# ── body model ────────────────────────────────────────────────────────────
# Segment lengths as a fraction of standing height (Winter). Height = 100 units.
SEG = {
    "trunk": 30.0,      # hip -> shoulder
    "neck": 11.0,       # shoulder -> centre of head
    "upper_arm": 16.0,  # shoulder -> elbow
    "forearm": 15.0,    # elbow -> wrist (forearm + hand)
    "thigh": 24.0,      # hip -> knee
    "shank": 24.0,      # knee -> ankle
    "foot": 7.0,        # ankle -> toe
}
HEAD_R = 6.4

# Mass as a fraction of body mass, and where that segment's own CoM sits along
# it (0 = proximal joint, 1 = distal joint). Limbs are doubled: a side view
# draws one arm and one leg, but the body has two of each.
MASS = {
    "head": (0.081, None),
    "trunk": (0.497, 0.50),
    "upper_arm": (0.028 * 2, 0.436),
    "forearm": (0.022 * 2, 0.682),
    "thigh": (0.100 * 2, 0.433),
    "shank": (0.0465 * 2, 0.433),
    "foot": (0.0145 * 2, 0.50),
}


def _pt(origin, length, deg):
    """Walk `length` from `origin` in direction `deg` (0° = +x, CCW positive).

    SVG y grows downward, so the y component is negated — everything below is
    written in ordinary maths convention and comes out the right way up.
    """
    r = math.radians(deg)
    return (origin[0] + length * math.cos(r), origin[1] - length * math.sin(r))


class Pose:
    """A side-view body built from absolute segment directions, in degrees.

    Angles are absolute (not relative to the parent), which makes poses easy to
    read: `trunk=90` is an upright torso, `trunk=0` is a horizontal one.
    """

    def __init__(self, hip=(0.0, 0.0), trunk=90.0, neck=None,
                 upper_arm=90.0, forearm=90.0,
                 thigh=-90.0, shank=-90.0, foot=0.0):
        self.hip = hip
        self.shoulder = _pt(hip, SEG["trunk"], trunk)
        self.head = _pt(self.shoulder, SEG["neck"], trunk if neck is None else neck)
        self.elbow = _pt(self.shoulder, SEG["upper_arm"], upper_arm)
        self.wrist = _pt(self.elbow, SEG["forearm"], forearm)
        self.knee = _pt(hip, SEG["thigh"], thigh)
        self.ankle = _pt(self.knee, SEG["shank"], shank)
        self.toe = _pt(self.ankle, SEG["foot"], foot)
        self._angles = dict(trunk=trunk, upper_arm=upper_arm, forearm=forearm,
                            thigh=thigh, shank=shank, foot=foot)

    def com(self):
        """Mass-weighted centre of mass of the whole body."""
        def along(a, b, f):
            return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)

        parts = [
            (MASS["head"][0], self.head),
            (MASS["trunk"][0], along(self.hip, self.shoulder, MASS["trunk"][1])),
            (MASS["upper_arm"][0], along(self.shoulder, self.elbow, MASS["upper_arm"][1])),
            (MASS["forearm"][0], along(self.elbow, self.wrist, MASS["forearm"][1])),
            (MASS["thigh"][0], along(self.hip, self.knee, MASS["thigh"][1])),
            (MASS["shank"][0], along(self.knee, self.ankle, MASS["shank"][1])),
            (MASS["foot"][0], along(self.ankle, self.toe, MASS["foot"][1])),
        ]
        total = sum(m for m, _ in parts)
        x = sum(m * p[0] for m, p in parts) / total
        y = sum(m * p[1] for m, p in parts) / total
        return (x, y)

    def draw(self, sw=3.2, color=CHALK, opacity=1.0):
        """The figure itself: two polylines and a head."""
        def poly(pts):
            d = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
            return (f'<polyline points="{d}" fill="none" stroke="{color}" '
                    f'stroke-width="{sw}" stroke-linecap="round" '
                    f'stroke-linejoin="round" opacity="{opacity}"/>')

        body = poly([self.toe, self.ankle, self.knee, self.hip, self.shoulder])
        arm = poly([self.shoulder, self.elbow, self.wrist])
        head = (f'<circle cx="{self.head[0]:.1f}" cy="{self.head[1]:.1f}" '
                f'r="{HEAD_R}" fill="none" stroke="{color}" stroke-width="{sw}" '
                f'opacity="{opacity}"/>')
        return body + arm + head


# ── drawing primitives ────────────────────────────────────────────────────

def svg(w, h, body, title=""):
    label = f"<title>{title}</title>" if title else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'role="img" aria-label="{title}">{label}'
        f'<defs>'
        f'<marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
        f'markerHeight="7" orient="auto-start-reverse">'
        f'<path d="M0 0 L10 5 L0 10 z" fill="{AMBER}"/></marker>'
        f'<marker id="am" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" '
        f'markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0 0 L10 5 L0 10 z" fill="{MUTE}"/></marker>'
        f'</defs>'
        f'<style>'
        f'.lbl{{font:500 11px "JetBrains Mono",ui-monospace,monospace;fill:{DIM}}}'
        f'.lbl-a{{font:500 11px "JetBrains Mono",ui-monospace,monospace;fill:{AMBER}}}'
        f'.lbl-s{{font:400 9.5px "JetBrains Mono",ui-monospace,monospace;fill:{MUTE};'
        f'letter-spacing:.08em}}'
        f'.big{{font:700 13px "JetBrains Mono",ui-monospace,monospace;fill:{CHALK}}}'
        f'</style>{body}</svg>\n'
    )


def line(p1, p2, color=LINE, sw=1, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" '
            f'y2="{p2[1]:.1f}" stroke="{color}" stroke-width="{sw}"{d}/>')


def arrow(p1, p2, color=AMBER, sw=1.6, marker="a"):
    return (f'<line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" '
            f'y2="{p2[1]:.1f}" stroke="{color}" stroke-width="{sw}" '
            f'marker-end="url(#{marker})"/>')


def text(p, s, cls="lbl", anchor="start"):
    return (f'<text x="{p[0]:.1f}" y="{p[1]:.1f}" class="{cls}" '
            f'text-anchor="{anchor}">{s}</text>')


def com_marker(p, r=5.5):
    """The standard centre-of-mass symbol: a circle with opposite quadrants filled."""
    x, y = p
    return (
        f'<g><circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{INK}" '
        f'stroke="{AMBER}" stroke-width="1.4"/>'
        f'<path d="M{x:.1f} {y:.1f} L{x:.1f} {y - r:.1f} A{r} {r} 0 0 1 '
        f'{x + r:.1f} {y:.1f} Z" fill="{AMBER}"/>'
        f'<path d="M{x:.1f} {y:.1f} L{x:.1f} {y + r:.1f} A{r} {r} 0 0 1 '
        f'{x - r:.1f} {y:.1f} Z" fill="{AMBER}"/></g>'
    )


def dim_h(x1, x2, y, label, color=AMBER):
    """A horizontal dimension line with end ticks and an optional centred label."""
    t = 4
    mid = (x1 + x2) / 2
    out = (
        line((x1, y - t), (x1, y + t), color, 1.2)
        + line((x2, y - t), (x2, y + t), color, 1.2)
        + line((x1, y), (x2, y), color, 1.2)
    )
    if label:
        out += (f'<rect x="{mid - 22:.1f}" y="{y - 8:.1f}" width="44" '
                f'height="15" fill="{INK}"/>'
                + text((mid, y + 4), label, "lbl-a", "middle"))
    return out


def pivot(p, r=4):
    return (f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r}" fill="{CHALK}"/>'
            f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r + 3.5}" fill="none" '
            f'stroke="{MUTE}" stroke-width="1"/>')


def bar(y, x1, x2):
    """A pull-up bar seen end-on: a rule with a small hatch above it."""
    hatch = "".join(
        line((x, y - 7), (x + 5, y - 2), MUTE, 1)
        for x in range(int(x1), int(x2), 9)
    )
    return hatch + line((x1, y - 2), (x2, y - 2), MUTE, 1.6)


def ground(y, x1, x2):
    hatch = "".join(
        line((x, y + 7), (x + 5, y + 2), MUTE, 1)
        for x in range(int(x1), int(x2), 9)
    )
    return hatch + line((x1, y + 2), (x2, y + 2), MUTE, 1.6)


def write(name, content):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path


# ── the lever-arm model, used by both the figures and the course text ─────

def hanging_pose(scale, shoulder, body_dir=0.0, hip_flex=0.0, knee_flex=0.0,
                 arm_dir=90.0, abduct=0.0):
    """A body hanging by straight arms, posed with anatomical joint angles.

    `body_dir`  direction from shoulder to hip (0° = horizontal, body to the right)
    `hip_flex`  0 = straight line shoulder-hip-knee; larger swings the knees
                toward the chest (a front lever is face-up, so this is a tuck)
    `knee_flex` 0 = straight leg; larger folds the heel toward the seat
    `arm_dir`   direction from shoulder to the hands — the arms are straight,
                so the whole arm points one way
    `abduct`    how far the legs are spread sideways, in degrees. A side view
                cannot show abduction, but it changes the physics: a leg opened
                to the side still has the same length, yet reaches only
                cos(abduct) as far along the body's long axis, which is the
                direction the lever arm is measured in. That, and nothing else,
                is why a straddle is easier than a full lay.
    """
    s = scale
    fore = math.cos(math.radians(abduct))
    hip = _pt(shoulder, SEG["trunk"] * s, body_dir)
    thigh_dir = body_dir + hip_flex
    shank_dir = thigh_dir - knee_flex

    p = Pose.__new__(Pose)
    p.shoulder = shoulder
    p.hip = hip
    p.head = _pt(shoulder, SEG["neck"] * s, body_dir + 180.0)
    p.elbow = _pt(shoulder, SEG["upper_arm"] * s, arm_dir)
    p.wrist = _pt(p.elbow, SEG["forearm"] * s, arm_dir)
    p.knee = _pt(hip, SEG["thigh"] * s * fore, thigh_dir)
    p.ankle = _pt(p.knee, SEG["shank"] * s * fore, shank_dir)
    p.toe = _pt(p.ankle, SEG["foot"] * s * fore, shank_dir - 80.0)
    p._angles = dict(body_dir=body_dir, hip_flex=hip_flex,
                     knee_flex=knee_flex, abduct=abduct)
    return p


# The four rungs of the front-lever ladder, as joint angles rather than as
# drawings — so the lever arm each one produces is measured, not asserted.
LEVER_STEPS = [
    # key,        hip_flex, knee_flex, abduct, label
    ("tuck",         125.0,     150.0,    0.0, "tuck"),
    ("advanced",      95.0,      95.0,    0.0, "advanced tuck"),
    ("straddle",       0.0,       0.0,   55.0, "straddle"),
    ("full",           0.0,       0.0,    0.0, "full"),
]


def lever_poses(scale, bar_pt):
    """The four front-lever positions, hanging from `bar_pt`."""
    arm = (SEG["upper_arm"] + SEG["forearm"]) * scale
    shoulder = (bar_pt[0], bar_pt[1] + arm)
    return {
        key: hanging_pose(scale, shoulder, body_dir=0.0, hip_flex=hf,
                          knee_flex=kf, arm_dir=90.0, abduct=ab)
        for key, hf, kf, ab, _ in LEVER_STEPS
    }


def lever_table():
    """Relative torque of each front-lever position, as a fraction of the full.

    Torque about the bar is m*g*d, and m and g are identical in every position,
    so the ratio of torques is exactly the ratio of the horizontal distances
    from the bar to the centre of mass. That is the whole reason a tuck is a
    useful training step rather than a lesser version of the skill.
    """
    poses = lever_poses(1.0, (0.0, 0.0))
    d = {k: abs(p.com()[0] - 0.0) for k, p in poses.items()}
    full = d["full"]
    return {k: (v, v / full) for k, v in d.items()}


if __name__ == "__main__":
    import json
    print(json.dumps({k: [round(v[0], 2), round(v[1], 3)]
                      for k, v in lever_table().items()}, indent=1))
