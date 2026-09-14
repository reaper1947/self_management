# MARKETING.md — Peter1947 Academy go-to-market

How to get people into the funnel and turn attention into money. Written for the current
setup: two courses, Buy Me a Coffee payment, a free-lesson hook, bilingual (EN/TH).

---

## 1. Positioning

**One-liner:** *Master your body. Master robotics. Two disciplines, one method —
small, measured progressions until the rep, or the robot, works.*

**Why it's different:** almost nobody teaches either calisthenics *or* ROS 2 as a strict
**progression** — an ordered ladder where you only train the step you're on. And the person
teaching both is a working robotics engineer who actually trains. The overlap ("engineers
who want to be strong", "athletes who want to build things") is a real, underserved niche.

**Proof to build/collect:** before/after clips, "first muscle-up in week 9" screenshots,
students' working robots, the free lesson itself (the quality *is* the ad).

---

## 2. The funnel

```
   cold traffic (social, search, communities)
        │
        ▼
   storefront  ── free public lesson (no signup) ──►  hooked
        │                                               │
        ▼                                               ▼
   free academy account ── full starter module ──►  invested
        │
        ▼
   Buy Me a Coffee (course Extra)  ──►  you grant access  ──►  paying student
        │
        ▼
   finishes course → testimonial → refers a friend
```

**Every stage lowers friction and raises commitment.** The public free lesson asks for
nothing. The account asks for an email and unlocks more. The purchase is a one-tap BMC
checkout. Access is granted by you within a day.

### Conversion levers already built in
- Public trial lessons with real value + progress tracking.
- Free starter module behind a free account (email capture).
- Locked lessons show the price and a one-tap "Get access" → BMC.
- 14-day, no-questions refund (kills purchase anxiety — say it everywhere).
- Level/XP/streak system → students come back daily → higher completion → more testimonials.

---

## 3. Pricing

| Product | Price | Net after BMC + card fees (~8%) |
|---|---|---|
| Calisthenics: Zero to Expert | **$49** | ~$45 |
| Robotics with ROS 2 | **$69** | ~$63 |
| Both | **$99** | ~$91 |

Rationale: one-time, lifetime access, no subscription — an easy yes versus $15–30/mo
platforms. The ROS 2 course is priced against The Construct / Udemy robotics courses
($50–200) and undercuts them while being more structured. Anchor with a "$99 / $129" strike
price (already in the storefront).

**Launch offer:** first 50 buyers get both courses for **$79** (code or just a temporary
Extra price). Creates urgency and your first testimonials.

---

## 4. Buy Me a Coffee — the money mechanics

- **Setup:** one **Extra** per course (see `DEVUSER.md` §5). Paste each Extra's URL into
  the course in the admin panel.
- **Payout:** connect Stripe or PayPal in BMC settings. Money lands every few days.
- **Fees:** BMC 5% + card ~2.9%+$0.30. Budget ~8% off the top.
- **Why BMC (not Stripe direct):** zero monthly cost, a checkout that already exists, a
  built-in "support" angle that fits a solo creator, and a public page that adds social
  proof (supporter count, wall).
- **Also turn on:** the BMC "membership" tier at ~$5/mo as a **tip jar / early-access**
  option for people who like you but aren't ready to buy a course.
- **Upgrade path:** once you're getting a sale most days, pay for BMC's webhook plan and
  auto-grant (the backend is ready for it).

---

## 5. Channels (in priority order)

### A. Communities — highest ROI, do first
Post the **free lesson** (a genuine gift), not a pitch. Answer questions for real.

| Community | Angle |
|---|---|
| r/bodyweightfitness, r/calisthenics, r/GYM | "I wrote a free step-by-step pull-up progression" — link the trial lesson |
| r/ROS, r/robotics, ROS Discourse, Robotics Discord | "Free ROS 2 first-node + Nav2 lesson, feedback welcome" |
| r/learnprogramming, r/embedded | the robotics track as "learn robotics properly" |
| Thai Facebook groups (คาลิสเทนิกส์ / หุ่นยนต์ / Arduino Thailand) | **bilingual is your edge** — post in Thai, few competitors |
| Hacker News (Show HN) | the *platform* itself: "I built a terminal-styled LMS for my two courses" |

### B. Short-form video — compounding
Every lesson → 1–3 shorts (YouTube Shorts, TikTok, Reels, Thai TikTok):
- "The #1 mistake in your [movement]" → fix → "full progression in the free lesson, link in bio"
- "ROS 2 in 60 seconds: nodes and topics"
- Screen-record the course player itself — the UI is a selling point.
Post daily for 30 days. This is the top of funnel that keeps working while you sleep.

### C. Long-form / SEO — slower, durable
- YouTube: full free lessons as standalone videos, end-card → the academy.
- Blog posts = the guide lessons themselves (publish 5–10 as public articles, each ending
  "the other 50 lessons are in the course"). Ranks for "pull-up progression", "ROS 2 tutorial".

### D. LinkedIn / X — the "engineer who trains" identity
Build in public: student wins, a lesson insight a day, the platform's dashboard numbers.
This audience buys the *bundle*.

---

## 6. Content calendar (repeatable monthly)

| Week | Do |
|---|---|
| 1 | 2 community posts (1 cal, 1 robotics) with the free lesson · 5 shorts · 1 long video |
| 2 | 1 community post · 5 shorts · 1 blog post (a lesson) · reply to every comment |
| 3 | 1 community post · 5 shorts · collect + post a testimonial · 1 LinkedIn/X thread |
| 4 | "results roundup" post · 5 shorts · email your free-account list a new starter tip |

Batch shorts once a week (film 15 in one session). Recycle everything across platforms.

---

## 7. Email (the asset you own)

Every free account is an email. Minimum viable sequence (send manually or with any free
tool by exporting from **Admin → Students**):

1. **Day 0** — "Here's your starter module + how the course works."
2. **Day 3** — a single high-value tip + "the full [movement] progression is Module 2".
3. **Day 7** — a student result + the launch offer + the 14-day guarantee.
4. **Day 21** — "still stuck on X? the course covers exactly that" + testimonial.

---

## 8. Metrics to watch (Admin → Dashboard)

| Metric | Healthy | If not… |
|---|---|---|
| Signups / week | growing | more community posts + shorts |
| Free-lesson → account rate | > 15% | make the starter module more compelling |
| Account → purchase rate | 2–5% | add testimonials, sharpen the locked-lesson CTA, run the launch offer |
| Avg course progress of buyers | > 40% | fix early lessons / add the onboarding email |
| Completions / week | growing | the streak system + email nudges |

---

## 9. Launch checklist

- [ ] BMC Extras created; URLs pasted into each course in the admin panel
- [ ] BMC payout (Stripe/PayPal) connected and verified
- [ ] Smoke test passed (`DEVUSER.md` §8)
- [ ] 3+ real testimonials on the storefront (replace the placeholders)
- [ ] Free lessons proofread; at least one embedded video per free lesson
- [ ] 15 shorts filmed and scheduled
- [ ] Launch-offer Extra priced ($79 both) with a deadline
- [ ] Posts drafted for r/bodyweightfitness, r/ROS, and 2 Thai groups
- [ ] "Show HN" / LinkedIn post about the platform drafted
- [ ] You've committed to checking BMC email daily to grant access

---

## 10. The honest bar

This only works if the free lesson is genuinely excellent and you answer questions like a
human. The product is good. Distribution is the whole game now — pick two channels from
§5, do them every week for 90 days, and let the levels/streak system do the retention.
