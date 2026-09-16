# Design system — Peter1947 Academy

One page, so that anything added later still looks like it belongs.

## The idea

**The graph.** ROS 2's central concept is the compute graph: nodes joined by
topics. A calisthenics progression is a directed graph too — dead hang →
scapular pulls → negatives → band-assisted → first rep → muscle-up, with a
fallback hanging off every step. The two subjects are the same kind of object,
so the whole site says that in one visual language.

Everything drawn on the site is generated from the real curriculum in
`academy/seed/`. There is no stock imagery and no generated art:

| Where | What it draws |
|---|---|
| storefront hero (`<canvas>`) | both tracks as one drifting graph, labels are real lesson names |
| `#calisthenics` SVG | the module 05 pull progression, with its fallback stubs |
| `#robotics` SVG | the real ROS 2 DAG, `/tf` `/scan` `/map` `/cmd_vel` on the edges |
| `og-card.png` | the same graph, drawn procedurally (see the PowerShell snippet in git history) |
| `favicon.svg` | one lit node and its three edges |

If you add a section, ask what in the curriculum it can be drawn *from*.

## Colour

A duotone, not a palette.

```
--ink        #0a0d12   ground
--ink-2      #0f141b   raised panel
--surface    #141a23   hover / featured
--line       #232b36   every border
--line-soft  #1a212a   internal dividers

--chalk      #ece7dd   body text (warm, against a cool ground)
--chalk-dim  #9aa3ad   secondary
--chalk-mute #646d78   labels, captions

--amber      #ff9a2e   THE accent
--amber-soft #ffb861   hover
--amber-deep #c96f10   quiet rules
```

**Amber only ever means "this is the thing".** The two tracks are told apart by
*form* — a chain versus a branching DAG — never by a second accent. Do not add
one for emphasis; if two things both need to stand out, one of them doesn't.

The single exception is the LMS (`academy/lms.css`), which keeps `--cal`
`#7fb2d9` and `--rob` `#b59ad6`. That is deliberate: in a *tool* you scan
"which course is this" dozens of times a session, so the distinction earns a
colour. Both are damped to sit under the amber. Do not carry them onto the
marketing pages.

Semantic colours (`--warn`, `--danger`/`--bad`, `--ok`) are separate from the
accent and are only for state.

## Type

Three roles, each matching something true about the product:

| Role | Face | Why |
|---|---|---|
| display | **Archivo**, wide (`font-stretch: 115–120%`), 700–800 | industrial equipment labelling |
| prose | **Newsreader** | the lessons are *written* — that is the product |
| data | **JetBrains Mono** | commands you actually run, paths, numbers |

Thai is pinned, never left to OS fallback: **IBM Plex Sans Thai** behind Archivo
and JetBrains Mono, **Noto Serif Thai** behind Newsreader. Google Fonts serves
these with `unicode-range`, so English readers never download them.

In the LMS the interface font is Archivo (not Newsreader) because it is a tool
being operated; `--prose` is reserved for `.lesson-body`, the one place someone
settles in and reads, at a 68ch measure.

Use `font-variant-numeric: tabular-nums` wherever digits line up.

## Form

- **Square corners.** `--radius: 0`. The only round things are status dots and
  avatars.
- **Rules, not cards.** Separation comes from a 1px `--line` and space. A filled
  panel is for something genuinely raised: a pricing plan, a callout, the
  featured tier.
- **Grids are hairline.** 72px, ~3% white, masked so they fade before reaching
  the type.
- Spec lists read like an equipment datasheet: mono label left, value right,
  hairline between.

## Motion

- Everything has a resting state that is already readable. The hero canvas
  paints one settled frame immediately; a hidden tab gets no animation frames,
  so the intro only runs once the tab is actually looked at, and counters show
  their number rather than a stuck `0`.
- The two curriculum SVGs draw their edges (`stroke-dashoffset`) and fade in
  their nodes on scroll-in, staggered ~85ms.
- `prefers-reduced-motion` gets the settled graph, no drift, no reveal.
- Easing is always `cubic-bezier(0.22, 0.61, 0.36, 1)`.

## Copy rules

Every number on the site traces to `academy/seed/`: **28** calisthenics lessons
in **6** modules, **33** robotics lessons in **8** modules, **61** total, **2**
free. The lessons are **written, not video** — say so plainly; the FAQ has an
entry for it.

Do not add social proof that is not real. The site previously carried invented
student counts, an invented rating and three invented testimonials; they are
gone and must not come back until there are real ones to quote.

## Files

```
storefront/style.css        the marketing identity
storefront/script.js        hero canvas, SVG draw-in, nav, i18n, checkout
storefront/translations.js  102 keys, EN + TH, both complete
storefront/trial/lesson.css free lesson pages
academy/academy.css         login / signup
academy/lms.css             student app + admin (token-level retheme)
```

Cache-bust by bumping `?v=` on every `<link>`/`<script>` when you edit CSS or JS.

## Checking your work

```bash
# all routes 200, unknown 404, no banned claim strings, i18n parity
python3 tools/verify_site.py
```

The verification script boots the Flask app with `test_client()`, walks every
public route, greps the rendered storefront for claims that must never return
("HD video", "50+", the old testimonial handles), and checks that every
`data-i18n` key on the page exists in both languages.
