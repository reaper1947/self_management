/* ─────────────────────────────────────────────────────────────
   Peter1947 Academy — storefront interactions
   ───────────────────────────────────────────────────────────── */
(function () {
    "use strict";

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    /* ---------- i18n ---------- */
    let currentLang = localStorage.getItem("p1947_lang") || "en";

    function applyLanguage(lang) {
        currentLang = lang;
        localStorage.setItem("p1947_lang", lang);
        document.documentElement.lang = lang;
        if (typeof translations === "undefined" || !translations[lang]) return;
        $$("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            const val = translations[lang][key];
            if (val) el.textContent = val;
        });
        const btn = $("#lang-toggle");
        if (btn) btn.textContent = lang === "en" ? "TH" : "EN";
    }

    /* ---------- nav ---------- */
    function initNav() {
        const navbar = $("#navbar");
        const hamburger = $("#hamburger");
        const navLinks = $("#nav-links");
        const progress = $("#scroll-progress");

        const onScroll = () => {
            const y = window.scrollY;
            navbar.classList.toggle("scrolled", y > 24);
            if (progress) {
                const h = document.documentElement.scrollHeight - window.innerHeight;
                progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        const closeMenu = () => {
            hamburger.classList.remove("active");
            navLinks.classList.remove("open");
            hamburger.setAttribute("aria-expanded", "false");
        };
        hamburger.addEventListener("click", () => {
            const open = navLinks.classList.toggle("open");
            hamburger.classList.toggle("active", open);
            hamburger.setAttribute("aria-expanded", String(open));
        });
        $$(".nav-links a").forEach((a) => a.addEventListener("click", closeMenu));

        /* active section highlight */
        const links = $$(".nav-links a");
        const map = new Map();
        links.forEach((a) => {
            const id = a.getAttribute("href").slice(1);
            const sec = document.getElementById(id);
            if (sec) map.set(sec, a);
        });
        if (map.size) {
            const spy = new IntersectionObserver(
                (entries) => {
                    entries.forEach((e) => {
                        if (e.isIntersecting) {
                            links.forEach((l) => l.classList.remove("active"));
                            map.get(e.target)?.classList.add("active");
                        }
                    });
                },
                { rootMargin: "-45% 0px -50% 0px" }
            );
            map.forEach((_, sec) => spy.observe(sec));
        }
    }

    /* ---------- scroll reveal ---------- */
    function initReveal() {
        const items = $$(".reveal");
        if (prefersReduced || !("IntersectionObserver" in window)) {
            items.forEach((el) => el.classList.add("in"));
            return;
        }
        const io = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add("in");
                        obs.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
        );
        items.forEach((el) => io.observe(el));
    }

    /* ---------- count up ---------- */
    function initCounters() {
        const nums = $$("[data-count]");
        if (!nums.length) return;
        const run = (el) => {
            const target = parseFloat(el.dataset.count);
            const decimals = parseInt(el.dataset.decimals || "0", 10);
            const suffix = el.dataset.suffix || "";
            if (prefersReduced) {
                el.textContent = target.toFixed(decimals) + suffix;
                return;
            }
            const dur = 1400;
            const start = performance.now();
            const tick = (now) => {
                const p = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = (target * eased).toFixed(decimals) + suffix;
                if (p < 1) requestAnimationFrame(tick);
                else el.textContent = target.toFixed(decimals) + suffix;
            };
            requestAnimationFrame(tick);
        };
        const io = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        run(e.target);
                        obs.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.6 }
        );
        nums.forEach((n) => io.observe(n));
    }

    /* ---------- pointer tilt ---------- */
    function initTilt() {
        if (prefersReduced || window.matchMedia("(hover: none)").matches) return;
        $$(".tilt").forEach((card) => {
            card.addEventListener("pointermove", (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                card.style.transform = `perspective(800px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-4px)`;
            });
            const reset = () => (card.style.transform = "");
            card.addEventListener("pointerleave", reset);
            card.addEventListener("pointercancel", reset);
        });
    }

    /* ---------- magnetic buttons ---------- */
    function initMagnetic() {
        if (prefersReduced || window.matchMedia("(hover: none)").matches) return;
        $$(".magnetic").forEach((btn) => {
            btn.addEventListener("pointermove", (e) => {
                const r = btn.getBoundingClientRect();
                btn.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * 12}px, ${((e.clientY - r.top) / r.height - 0.5) * 12}px)`;
            });
            btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
        });
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

    /* ---------- FAQ ---------- */
    function initFaq() {
        $$(".faq-item").forEach((item) => {
            const q = $(".faq-q", item);
            const a = $(".faq-a", item);
            q.addEventListener("click", () => {
                const open = item.classList.contains("open");
                $$(".faq-item").forEach((other) => {
                    other.classList.remove("open");
                    $(".faq-a", other).style.maxHeight = null;
                });
                if (!open) {
                    item.classList.add("open");
                    a.style.maxHeight = a.scrollHeight + "px";
                }
            });
        });
    }

    /* ---------- Stripe checkout ---------- */
    function initCheckout() {
        $$(".buy-btn").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                const section = btn.closest("[data-course]") ? null : btn.closest(".course-section");
                const courseId = btn.dataset.course || (section && section.id) || "calisthenics";

                const original = btn.textContent;
                btn.textContent = "Loading…";
                btn.style.pointerEvents = "none";

                try {
                    const res = await fetch("/api/create-checkout-session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "same-origin",
                        body: JSON.stringify({ course_id: courseId }),
                    });
                    const data = await res.json();
                    if (data.url) {
                        window.location.href = data.url;
                    } else {
                        alert(data.error || "Checkout is not available right now. Please try again later.");
                        btn.textContent = original;
                        btn.style.pointerEvents = "";
                    }
                } catch (err) {
                    console.error(err);
                    alert("Connection error. Please try again.");
                    btn.textContent = original;
                    btn.style.pointerEvents = "";
                }
            });
        });
    }

    /* ---------- boot ---------- */
    document.addEventListener("DOMContentLoaded", () => {
        const y = $("#year");
        if (y) y.textContent = new Date().getFullYear();

        applyLanguage(currentLang);
        const langBtn = $("#lang-toggle");
        if (langBtn) langBtn.addEventListener("click", () => applyLanguage(currentLang === "en" ? "th" : "en"));

        initNav();
        initReveal();
        initCounters();
        initTilt();
        initMagnetic();
        initCurriculum();
        initFaq();
        initCheckout();
    });
})();
