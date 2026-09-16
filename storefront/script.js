/* ══════════════════════════════════════════════════════════════════════════
   Peter1947 Academy — storefront

   The hero canvas draws the two curricula as one compute graph. Every node is
   a real lesson name from academy/seed, so the "decorative" background is the
   product. Nodes fade in one by one on load, then drift; edges are drawn only
   between nodes that are genuinely close, which is what gives the graph its
   organic shape rather than a stamped pattern.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
    "use strict";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    /* ── i18n ─────────────────────────────────────────────────────────── */

    let lang = "en";
    try { lang = localStorage.getItem("p1947_lang") || "en"; } catch (e) { /* ignore */ }

    function applyLanguage(l) {
        lang = l;
        try { localStorage.setItem("p1947_lang", l); } catch (e) { /* ignore */ }
        document.documentElement.lang = l;
        if (typeof translations === "undefined" || !translations[l]) return;
        $$("[data-i18n]").forEach((el) => {
            const v = translations[l][el.getAttribute("data-i18n")];
            if (v != null) el.textContent = v;
        });
        const b = $("#lang-toggle");
        if (b) b.textContent = l === "en" ? "TH" : "EN";
    }

    /* ── hero compute graph ───────────────────────────────────────────── */

    // Real lesson names from both tracks, mixed: the whole point of the image
    // is that the two disciplines are the same kind of object.
    const SEED_NODES = [
        "dead hang", "scapular pulls", "negatives", "band-assisted",
        "first rep", "muscle-up", "hollow body", "support hold", "L-sit",
        "german hang", "skin the cat", "back lever", "front lever",
        "planche lean", "handstand", "archer pulls", "deload",
        "/setup", "rclpy", "publisher", "subscriber", "launch file",
        "services", "actions", "QoS", "lifecycle", "tf2", "urdf",
        "robot_state_pub", "gazebo", "ros_gz", "/scan", "/odom",
        "nav2", "slam_toolbox", "amcl", "costmap", "planner", "controller",
        "opencv", "pointcloud", "executor", "bringup", "teleop", "/cmd_vel",
        "patrol", "rover"
    ];

    function heroGraph() {
        const canvas = $("#graph-canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const host = canvas.parentElement;

        const LINK_DIST = 132;
        let W = 0, H = 0, dpr = 1;
        let nodes = [];
        let raf = null;
        let born = 0;

        function layout() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = host.clientWidth;
            const h = host.clientHeight;
            if (!w || !h) return false;
            // Resizing the canvas is itself a layout change, so bail out unless
            // the host really moved — otherwise the ResizeObserver below feeds
            // itself and starves every other animation on the page.
            if (Math.abs(w - W) < 2 && Math.abs(h - H) < 2 && nodes.length) return false;
            W = w;
            H = h;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            canvas.style.width = W + "px";
            canvas.style.height = H + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Density follows area, so a phone does not get a hairball.
            const count = Math.max(14, Math.min(SEED_NODES.length,
                Math.round((W * H) / 27000)));
            nodes = [];
            for (let i = 0; i < count; i++) {
                nodes.push({
                    label: SEED_NODES[i % SEED_NODES.length],
                    // right-weighted: the headline sits on the left, so keep
                    // the busiest part of the graph out from behind the words
                    x: W * (0.34 + Math.random() * 0.62),
                    y: H * (0.05 + Math.random() * 0.92),
                    vx: (Math.random() - 0.5) * 0.13,
                    vy: (Math.random() - 0.5) * 0.13,
                    hub: Math.random() < 0.3,
                    delay: Math.random() * 1600
                });
            }
            return true;
        }

        // The headline owns the left of the hero. Rather than dodge it with
        // collision logic, the graph simply fades out as it moves left — so
        // the composition reads as one image instead of two fighting layers.
        function veil(x) {
            if (W < 860) return 0.45;          // narrow: text is full width
            const a = W * 0.40, b = W * 0.64;
            const p = Math.min(1, Math.max(0, (x - a) / (b - a)));
            return p * p * (3 - 2 * p);        // smoothstep
        }

        function draw(t) {
            ctx.clearRect(0, 0, W, H);

            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                const aIn = Math.min(1, Math.max(0, (t - a.delay) / 900));
                if (aIn <= 0) continue;
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const bIn = Math.min(1, Math.max(0, (t - b.delay) / 900));
                    if (bIn <= 0) continue;
                    const d = Math.hypot(a.x - b.x, a.y - b.y);
                    if (d > LINK_DIST) continue;
                    const s = (1 - d / LINK_DIST) * aIn * bIn
                        * Math.min(veil(a.x), veil(b.x));
                    if (s < 0.01) continue;
                    ctx.strokeStyle = "rgba(255,154,46," + (s * 0.34).toFixed(3) + ")";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
            // Labels are drifting, so two hubs will sometimes pass close enough
            // for their text to collide. Keep the boxes drawn so far and drop
            // any label that would overlap one — a missing label reads as depth,
            // two labels on top of each other reads as a bug.
            const placed = [];
            for (const n of nodes) {
                const inn = Math.min(1, Math.max(0, (t - n.delay) / 900)) * veil(n.x);
                if (inn <= 0.01) continue;
                if (n.hub) {
                    // a hub gets a soft halo so it reads as a lit node rather
                    // than a speck, the way a real graph viewer highlights one
                    const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 13);
                    halo.addColorStop(0, "rgba(255,154,46," + (inn * 0.34).toFixed(3) + ")");
                    halo.addColorStop(1, "rgba(255,154,46,0)");
                    ctx.fillStyle = halo;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, 13, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = n.hub
                    ? "rgba(255,164,60," + inn.toFixed(3) + ")"
                    : "rgba(168,178,189," + (inn * 0.6).toFixed(3) + ")";
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.hub ? 3.2 : 1.8, 0, Math.PI * 2);
                ctx.fill();
                if (n.hub && W >= 860 && n.x > 40 && n.x < W - 40) {
                    // flip the label inboard rather than let it run off the edge
                    const w = ctx.measureText(n.label).width;
                    const x = (n.x + 10 + w > W - 14) ? n.x - 10 - w : n.x + 10;
                    const box = { l: x - 3, r: x + w + 3, t: n.y - 8, b: n.y + 8 };
                    const clash = placed.some((p) =>
                        box.l < p.r && box.r > p.l && box.t < p.b && box.b > p.t);
                    if (!clash) {
                        placed.push(box);
                        ctx.fillStyle = "rgba(190,199,208," + (inn * 0.58).toFixed(3) + ")";
                        ctx.fillText(n.label, x, n.y + 3.5);
                    }
                }
            }
        }

        function frame(now) {
            if (!born) born = now;
            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < -50) n.x = W + 50;
                if (n.x > W + 50) n.x = -50;
                if (n.y < -50) n.y = H + 50;
                if (n.y > H + 50) n.y = -50;
            }
            draw(now - born);
            raf = requestAnimationFrame(frame);
        }

        // t past every node's delay, so everything is fully faded in.
        function still() { draw(6000); }

        layout();
        if (!nodes.length) return;

        // A hidden tab gets no animation frames at all, so a page opened in the
        // background — or captured for a link preview — would paint an empty
        // canvas. Draw one settled frame straight away and only run the intro
        // once the tab is actually being looked at.
        let intro = false;
        function start() {
            if (intro || reduced) return;
            intro = true;
            born = 0;
            raf = requestAnimationFrame(frame);
        }

        still();
        if (reduced) {
            /* the settled frame is the finished state */
        } else if (document.hidden) {
            document.addEventListener("visibilitychange", function once() {
                if (document.hidden) return;
                document.removeEventListener("visibilitychange", once);
                start();
            });
        } else {
            start();
        }

        let resizeTimer = null;
        const refit = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!layout()) return;
                if (reduced) still();
                else born = performance.now() - 4000;   // stay settled on resize
            }, 180);
        };
        window.addEventListener("resize", refit);
        // The hero grows when the webfonts land, and a window resize never
        // fires for that — so watch the element itself.
        if ("ResizeObserver" in window) new ResizeObserver(refit).observe(host);

        // stop burning frames once the hero has scrolled away
        if ("IntersectionObserver" in window && !reduced) {
            new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting && raf === null) {
                        born = performance.now() - 4000;
                        raf = requestAnimationFrame(frame);
                    } else if (!e.isIntersecting && raf !== null) {
                        cancelAnimationFrame(raf);
                        raf = null;
                    }
                });
            }, { threshold: 0 }).observe(host);
        }
    }

    /* ── the two curriculum graphs draw themselves on scroll-in ───────── */

    function initProgressionGraphs() {
        const figs = $$(".progression");
        if (!figs.length) return;

        figs.forEach((fig) => {
            $$("[data-draw]", fig).forEach((p) => {
                let len = 0;
                try { len = p.getTotalLength(); } catch (e) { return; }
                p.style.strokeDasharray = len;
                p.style.strokeDashoffset = reduced ? 0 : len;
                p.style.transition =
                    "stroke-dashoffset 0.85s cubic-bezier(0.22,0.61,0.36,1)";
            });
            $$("[data-node]", fig).forEach((g) => {
                g.style.opacity = reduced ? 1 : 0;
                g.style.transition = "opacity 0.5s ease";
            });
        });

        if (reduced || !("IntersectionObserver" in window)) return;

        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                obs.unobserve(e.target);
                $$("[data-draw]", e.target).forEach((p, i) => {
                    setTimeout(() => { p.style.strokeDashoffset = 0; }, 80 * i);
                });
                $$("[data-node]", e.target).forEach((g, i) => {
                    setTimeout(() => { g.style.opacity = 1; }, 140 + 85 * i);
                });
            });
        }, { threshold: 0.2 });
        figs.forEach((f) => io.observe(f));
    }

    /* ── nav ──────────────────────────────────────────────────────────── */

    function initNav() {
        const bar = $("#navbar");
        const links = $("#nav-links");
        const burger = $("#hamburger");
        const progress = $("#scroll-progress");

        if (burger && links) {
            burger.addEventListener("click", () => {
                const open = links.classList.toggle("open");
                burger.classList.toggle("open", open);
                burger.setAttribute("aria-expanded", String(open));
            });
            $$("a", links).forEach((a) => a.addEventListener("click", () => {
                links.classList.remove("open");
                burger.classList.remove("open");
                burger.setAttribute("aria-expanded", "false");
            }));
        }

        const onScroll = () => {
            const y = window.scrollY;
            if (bar) bar.classList.toggle("stuck", y > 12);
            if (progress) {
                const max = document.body.scrollHeight - window.innerHeight;
                progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
            }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        const sections = $$("section[id], header[id]");
        const navLinks = $$("#nav-links a");
        if ("IntersectionObserver" in window && sections.length) {
            const spy = new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    if (!e.isIntersecting) return;
                    navLinks.forEach((l) => l.classList.toggle(
                        "current", l.getAttribute("href") === "#" + e.target.id));
                });
            }, { rootMargin: "-45% 0px -50% 0px" });
            sections.forEach((s) => spy.observe(s));
        }
    }

    /* ── reveal ───────────────────────────────────────────────────────── */

    function initReveal() {
        const items = $$(".reveal");
        if (reduced || !("IntersectionObserver" in window)) {
            items.forEach((el) => el.classList.add("in"));
            return;
        }
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                e.target.classList.add("in");
                obs.unobserve(e.target);
            });
        }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
        items.forEach((el) => io.observe(el));
    }

    /* ── counters ─────────────────────────────────────────────────────── */

    function initCounters() {
        const nums = $$("[data-count]");
        if (!nums.length) return;

        // The resting state is the real number. Counting up is an embellishment
        // that happens if and when the element is actually scrolled into a
        // visible tab — a page opened in the background, or captured for a link
        // preview, must never sit there reading "0 lessons".
        nums.forEach((el) => { el.textContent = el.dataset.count; });

        const run = (el) => {
            const target = parseFloat(el.dataset.count);
            if (reduced || document.hidden) { el.textContent = String(target); return; }
            const start = performance.now(), dur = 1100;
            const tick = (now) => {
                const p = Math.min((now - start) / dur, 1);
                const e = 1 - Math.pow(1 - p, 3);
                el.textContent = String(Math.round(target * e));
                if (p < 1) requestAnimationFrame(tick);
                else el.textContent = String(target);
            };
            requestAnimationFrame(tick);
        };
        if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
        const io = new IntersectionObserver((ents, obs) => {
            ents.forEach((e) => {
                if (!e.isIntersecting) return;
                run(e.target);
                obs.unobserve(e.target);
            });
        }, { threshold: 0.7 });
        nums.forEach((n) => io.observe(n));
    }

    /* ── curriculum tabs ──────────────────────────────────────────────── */

    function initCurriculum() {
        const tabs = $$(".curr-tab");
        if (!tabs.length) return;
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                tabs.forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                $$(".curr-panel").forEach((p) => p.classList.remove("active"));
                const panel = document.getElementById(tab.dataset.panel);
                if (!panel) return;
                panel.classList.add("active");
                // a hidden panel never met the observer, so reveal it now
                $$(".reveal", panel).forEach((el) => el.classList.add("in"));
            });
        });
    }

    /* ── faq ──────────────────────────────────────────────────────────── */

    function initFaq() {
        $$(".faq-item").forEach((item) => {
            const q = $(".faq-q", item);
            const a = $(".faq-a", item);
            if (!q || !a) return;
            q.addEventListener("click", () => {
                const open = item.classList.contains("open");
                $$(".faq-item").forEach((i) => {
                    i.classList.remove("open");
                    const aa = $(".faq-a", i);
                    if (aa) aa.style.maxHeight = null;
                });
                if (!open) {
                    item.classList.add("open");
                    a.style.maxHeight = a.scrollHeight + "px";
                }
            });
        });
    }

    /* ── checkout (Buy Me a Coffee) ───────────────────────────────────── */

    function initCheckout() {
        $$(".buy-btn").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                const courseId =
                    btn.dataset.course ||
                    (btn.closest(".track") && btn.closest(".track").id) ||
                    "calisthenics";
                const original = btn.textContent;
                btn.textContent = "...";
                btn.style.pointerEvents = "none";
                let url = "https://buymeacoffee.com/peter1947";
                try {
                    const res = await fetch("/api/lms/checkout/" + encodeURIComponent(courseId), {
                        method: "POST", credentials: "same-origin",
                    });
                    const data = await res.json();
                    if (data && data.bmc_url) url = data.bmc_url;
                } catch (err) { /* fall back to the base BMC page */ }
                window.open(url, "_blank", "noopener");
                btn.textContent = original;
                btn.style.pointerEvents = "";
                setTimeout(() => alert(
                    "Opening Buy Me a Coffee in a new tab.\n\n" +
                    "After you pay, create your account (or log in) with the SAME email — " +
                    "Peter unlocks your course within a day."
                ), 100);
            });
        });
    }

    /* ── boot ─────────────────────────────────────────────────────────── */

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
        initProgressionGraphs();
        heroGraph();
    });
})();
