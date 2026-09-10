/* ─────────────────────────────────────────────────────────────
   Peter1947 Academy — storefront  ·  terminal / editorial
   ───────────────────────────────────────────────────────────── */
(function () {
    "use strict";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    /* ---------- i18n ---------- */
    let lang = localStorage.getItem("p1947_lang") || "en";
    let heroTyped = false;

    function applyLanguage(l) {
        lang = l;
        try { localStorage.setItem("p1947_lang", l); } catch (e) {}
        document.documentElement.lang = l;
        if (typeof translations === "undefined" || !translations[l]) return;
        $$("[data-i18n]").forEach((el) => {
            const v = translations[l][el.getAttribute("data-i18n")];
            if (v == null) return;
            el.textContent = v;
            if (el.classList.contains("tw")) el.dataset.text = v;
        });
        const b = $("#lang-toggle");
        if (b) b.textContent = l === "en" ? "TH" : "EN";
        // if hero already settled, keep it settled (don't re-animate on toggle)
        if (heroTyped) $$(".hero-title .tw").forEach((el) => (el.textContent = el.dataset.text || el.textContent));
    }

    /* ---------- hero typewriter ---------- */
    async function typeHero() {
        const lines = $$(".hero-title .tw");
        if (!lines.length) { heroTyped = true; return; }
        if (reduced) {
            lines.forEach((el) => (el.textContent = el.dataset.text || el.textContent));
            heroTyped = true;
            return;
        }
        lines.forEach((el) => {
            el.dataset.text = el.dataset.text || el.textContent;
            el.textContent = "";
        });
        for (const el of lines) {
            const full = el.dataset.text;
            el.classList.add("typing");
            for (let i = 0; i < full.length; i++) {
                el.textContent = full.slice(0, i + 1);
                await sleep(38 + Math.random() * 34);
            }
            el.classList.remove("typing");
            await sleep(140);
        }
        const caret = $(".hero-title .caret");
        if (caret) caret.hidden = false;
        heroTyped = true;
    }

    /* ---------- terminal panel ---------- */
    const TERM = [
        { p: "peter1947:~$ ", t: "tree academy --depth 1" },
        { t: "academy" },
        { t: "├── calisthenics/       06 modules · 50+ lessons", c: "f" },
        { t: "│   └── 02_pull-ups     ← free lesson" },
        { t: "├── robotics/           06 modules · 80+ lessons", c: "g" },
        { t: "│   └── 01_first-circuit ← free lesson" },
        { t: "└── pricing.txt         $49 · $69 · $99 bundle" },
        { t: "" },
        { p: "peter1947:~$ ", t: "./enroll --trial" },
        { t: "> no card required. progress saved locally.", c: "c" },
        { p: "peter1947:~$ ", t: "", cur: true },
    ];

    async function typeTerminal(box) {
        box.textContent = "";
        for (const line of TERM) {
            const row = document.createElement("span");
            row.style.display = "block";
            if (line.p) {
                const p = document.createElement("span");
                p.className = "p";
                p.textContent = line.p;
                row.appendChild(p);
            }
            const val = document.createElement("span");
            if (line.c) val.className = line.c;
            row.appendChild(val);
            box.appendChild(row);

            if (reduced) {
                val.textContent = line.t;
            } else {
                for (let i = 0; i < line.t.length; i++) {
                    val.textContent = line.t.slice(0, i + 1);
                    await sleep(12 + Math.random() * 22);
                }
                if (line.p || line.t) await sleep(90);
            }
            if (line.cur) {
                const cur = document.createElement("span");
                cur.className = "cur";
                cur.textContent = "▋";
                row.appendChild(cur);
            }
        }
    }

    /* ---------- nav ---------- */
    function initNav() {
        const navbar = $("#navbar");
        const burger = $("#hamburger");
        const links = $("#nav-links");
        const bar = $("#scroll-progress");

        const onScroll = () => {
            const y = window.scrollY;
            navbar.classList.toggle("scrolled", y > 16);
            if (bar) {
                const h = document.documentElement.scrollHeight - window.innerHeight;
                bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        const close = () => {
            burger.classList.remove("active");
            links.classList.remove("open");
            burger.setAttribute("aria-expanded", "false");
        };
        burger.addEventListener("click", () => {
            const open = links.classList.toggle("open");
            burger.classList.toggle("active", open);
            burger.setAttribute("aria-expanded", String(open));
        });
        $$("#nav-links a").forEach((a) => a.addEventListener("click", close));

        const anchors = $$("#nav-links a");
        const map = new Map();
        anchors.forEach((a) => {
            const sec = document.getElementById(a.getAttribute("href").slice(1));
            if (sec) map.set(sec, a);
        });
        if (map.size && "IntersectionObserver" in window) {
            const spy = new IntersectionObserver(
                (ents) => ents.forEach((e) => {
                    if (e.isIntersecting) {
                        anchors.forEach((l) => l.classList.remove("active"));
                        map.get(e.target)?.classList.add("active");
                    }
                }),
                { rootMargin: "-45% 0px -50% 0px" }
            );
            map.forEach((_, sec) => spy.observe(sec));
        }
    }

    /* ---------- reveal ---------- */
    function initReveal() {
        const items = $$(".reveal");
        if (reduced || !("IntersectionObserver" in window)) {
            items.forEach((el) => el.classList.add("in"));
            return;
        }
        const io = new IntersectionObserver(
            (ents, obs) => ents.forEach((e) => {
                if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
            }),
            { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
        );
        items.forEach((el) => io.observe(el));
    }

    /* ---------- counters ---------- */
    function initCounters() {
        const nums = $$("[data-count]");
        if (!nums.length) return;
        const run = (el) => {
            const target = parseFloat(el.dataset.count);
            const dec = parseInt(el.dataset.decimals || "0", 10);
            const suf = el.dataset.suffix || "";
            if (reduced) { el.textContent = target.toFixed(dec) + suf; return; }
            const start = performance.now(), dur = 1200;
            const tick = (now) => {
                const p = Math.min((now - start) / dur, 1);
                const e = 1 - Math.pow(1 - p, 3);
                el.textContent = (target * e).toFixed(dec) + suf;
                if (p < 1) requestAnimationFrame(tick);
                else el.textContent = target.toFixed(dec) + suf;
            };
            requestAnimationFrame(tick);
        };
        const io = new IntersectionObserver(
            (ents, obs) => ents.forEach((e) => { if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); } }),
            { threshold: 0.7 }
        );
        nums.forEach((n) => io.observe(n));
    }

    /* ---------- curriculum tabs ---------- */
    function initCurriculum() {
        const tabs = $$(".curr-tab");
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((t) => t.classList.remove("active"));
                $$(".curr-panel").forEach((p) => p.classList.remove("active"));
                tab.classList.add("active");
                const panel = document.getElementById(tab.dataset.panel);
                if (panel) {
                    panel.classList.add("active");
                    panel.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
                }
            });
        });
    }

    /* ---------- faq ---------- */
    function initFaq() {
        $$(".faq-item").forEach((item) => {
            const q = $(".faq-q", item);
            const a = $(".faq-a", item);
            q.addEventListener("click", () => {
                const open = item.classList.contains("open");
                $$(".faq-item").forEach((o) => {
                    o.classList.remove("open");
                    $(".faq-a", o).style.maxHeight = null;
                });
                if (!open) { item.classList.add("open"); a.style.maxHeight = a.scrollHeight + "px"; }
            });
        });
    }

    /* ---------- checkout ---------- */
    function initCheckout() {
        $$(".buy-btn").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                const courseId =
                    btn.dataset.course ||
                    (btn.closest(".course") && btn.closest(".course").id) ||
                    "calisthenics";
                const original = btn.textContent;
                btn.textContent = "...";
                btn.style.pointerEvents = "none";
                try {
                    const res = await fetch("/api/create-checkout-session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "same-origin",
                        body: JSON.stringify({ course_id: courseId }),
                    });
                    const data = await res.json();
                    if (data.url) { window.location.href = data.url; return; }
                    alert(data.error || "Checkout is unavailable right now. Please try again later.");
                } catch (err) {
                    console.error(err);
                    alert("Connection error. Please try again.");
                }
                btn.textContent = original;
                btn.style.pointerEvents = "";
            });
        });
    }

    /* ---------- boot ---------- */
    document.addEventListener("DOMContentLoaded", () => {
        const y = $("#year");
        if (y) y.textContent = new Date().getFullYear();

        applyLanguage(lang);
        const lb = $("#lang-toggle");
        if (lb) lb.addEventListener("click", () => applyLanguage(lang === "en" ? "th" : "en"));

        initNav();
        initReveal();
        initCounters();
        initCurriculum();
        initFaq();
        initCheckout();

        typeHero();

        const term = $("#terminal");
        if (term) {
            if (reduced || !("IntersectionObserver" in window)) {
                typeTerminal(term);
            } else {
                const io = new IntersectionObserver((ents, obs) => {
                    ents.forEach((e) => { if (e.isIntersecting) { typeTerminal(term); obs.disconnect(); } });
                }, { threshold: 0.35 });
                io.observe(term);
            }
        }
    });
})();
