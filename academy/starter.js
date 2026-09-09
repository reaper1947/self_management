/* Academy starter module — auth gate + progress tracking. */
(function () {
    "use strict";
    const course = document.body.dataset.track || "course";
    const KEY = "p1947_starter_" + course;
    const gate = document.getElementById("gate");
    const app = document.getElementById("app");

    /* ---- auth gate (mirrors courses.js) ---- */
    (async function guard() {
        try {
            const res = await fetch("/api/student/status?t=" + Date.now(), { credentials: "same-origin" });
            const data = await res.json();
            if (!data.logged_in) {
                window.location.href = "/academy/";
                return;
            }
            const nameEl = document.getElementById("student-name");
            if (nameEl) nameEl.textContent = data.name || data.email || "Student";
            if (gate) gate.hidden = true;
            if (app) app.hidden = false;
            initModule();
        } catch (e) {
            window.location.href = "/academy/";
        }
    })();

    const logout = document.getElementById("logout-btn");
    if (logout) {
        logout.addEventListener("click", async () => {
            try { await fetch("/api/student/logout", { method: "POST", credentials: "same-origin" }); } catch (e) {}
            window.location.href = "/academy/";
        });
    }

    /* ---- progress ---- */
    function initModule() {
        const lessons = Array.from(document.querySelectorAll(".lesson"));
        const navLinks = Array.from(document.querySelectorAll(".lnav a"));
        const fill = document.querySelector(".progress-fill");
        const label = document.querySelector(".progress-label");
        const banner = document.querySelector(".completed-banner");

        let done = new Set();
        try {
            const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
            if (Array.isArray(saved)) done = new Set(saved);
        } catch (e) {}
        const save = () => { try { localStorage.setItem(KEY, JSON.stringify(Array.from(done))); } catch (e) {} };

        function render() {
            navLinks.forEach((a) => a.classList.toggle("done", done.has(a.getAttribute("href").slice(1))));
            lessons.forEach((sec) => {
                const btn = sec.querySelector(".mark-done");
                if (btn) {
                    const d = done.has(sec.id);
                    btn.textContent = d ? "✓ Completed" : "Mark lesson complete";
                    btn.classList.toggle("btn-primary", !d);
                }
            });
            const pct = lessons.length ? Math.round((done.size / lessons.length) * 100) : 0;
            if (fill) fill.style.width = pct + "%";
            if (label) label.textContent = done.size + " of " + lessons.length + " lessons complete";
            if (banner) banner.classList.toggle("show", lessons.length > 0 && done.size === lessons.length);
        }

        lessons.forEach((sec) => {
            const btn = sec.querySelector(".mark-done");
            if (!btn) return;
            btn.addEventListener("click", () => {
                if (done.has(sec.id)) done.delete(sec.id); else done.add(sec.id);
                save(); render();
            });
        });

        if ("IntersectionObserver" in window && lessons.length) {
            const spy = new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        navLinks.forEach((l) => l.classList.remove("active"));
                        const link = navLinks.find((l) => l.getAttribute("href") === "#" + e.target.id);
                        if (link) link.classList.add("active");
                    }
                });
            }, { rootMargin: "-30% 0px -60% 0px" });
            lessons.forEach((s) => spy.observe(s));
        }

        render();
    }
})();
