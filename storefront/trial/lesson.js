/* Free trial lesson — progress tracking, scroll spy, quiz.
   Progress is stored per course in localStorage (key: p1947_trial_<course>). */
(function () {
    "use strict";
    const course = document.body.dataset.track || "course";
    const KEY = "p1947_trial_" + course;
    const lessons = Array.from(document.querySelectorAll(".lesson"));
    const navLinks = Array.from(document.querySelectorAll(".lesson-nav a"));
    const fill = document.querySelector(".progress-fill");
    const label = document.querySelector(".progress-label");
    const banner = document.querySelector(".completed-banner");

    let done = new Set();
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
        if (Array.isArray(saved)) done = new Set(saved);
    } catch (e) { /* ignore */ }

    function save() {
        try { localStorage.setItem(KEY, JSON.stringify(Array.from(done))); } catch (e) { /* ignore */ }
    }

    function render() {
        navLinks.forEach((a) => {
            const id = a.getAttribute("href").slice(1);
            a.classList.toggle("done", done.has(id));
        });
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
        if (label) label.textContent = done.size + " of " + lessons.length + " sections complete";
        if (banner) banner.classList.toggle("show", done.size === lessons.length && lessons.length > 0);
    }

    lessons.forEach((sec) => {
        const btn = sec.querySelector(".mark-done");
        if (!btn) return;
        btn.addEventListener("click", () => {
            if (done.has(sec.id)) done.delete(sec.id);
            else done.add(sec.id);
            save();
            render();
        });
    });

    /* scroll spy */
    if ("IntersectionObserver" in window && lessons.length) {
        const spy = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        navLinks.forEach((l) => l.classList.remove("active"));
                        const link = navLinks.find((l) => l.getAttribute("href") === "#" + e.target.id);
                        if (link) link.classList.add("active");
                    }
                });
            },
            { rootMargin: "-30% 0px -60% 0px" }
        );
        lessons.forEach((s) => spy.observe(s));
    }

    /* quizzes */
    document.querySelectorAll(".quiz").forEach((quiz) => {
        const opts = quiz.querySelectorAll(".opt");
        const fb = quiz.querySelector(".feedback");
        opts.forEach((opt) => {
            opt.addEventListener("click", () => {
                opts.forEach((o) => o.classList.remove("correct", "wrong"));
                const correct = opt.dataset.correct === "true";
                opt.classList.add(correct ? "correct" : "wrong");
                if (correct) {
                    opts.forEach((o) => { if (o.dataset.correct === "true") o.classList.add("correct"); });
                }
                if (fb) fb.textContent = opt.dataset.explain || (correct ? "Correct!" : "Not quite — try again.");
            });
        });
    });

    render();
})();
