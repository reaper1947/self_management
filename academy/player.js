/* Peter1947 Academy — course player */
(function () {
    "use strict";
    const { api, requireStudent, toast, levelUpModal, mountTopbar,
            escapeHtml, fmtBytes } = window.LMS;

    const qs = new URLSearchParams(location.search);
    let courseId = qs.get("course") || "calisthenics";
    let lessonId = qs.get("lesson") ? parseInt(qs.get("lesson"), 10) : null;
    let course = null;     // /lms/course/<id>
    let lesson = null;     // /lms/lesson/<id>
    let me = null;

    document.addEventListener("DOMContentLoaded", boot);

    async function boot() {
        const s = await requireStudent();
        if (!s) return;
        try {
            me = await api("/lms/me");
        } catch (e) { me = { avatar_emoji: "🐈", name: s.name }; }
        mountTopbar("learn", me);

        await loadCourse();
        if (!lessonId) {
            const first = firstLesson();
            lessonId = first ? first.id : null;
        }
        if (lessonId) await loadLesson(lessonId);
        else renderNoContent();

        document.getElementById("gate").hidden = true;
        document.getElementById("player").hidden = false;
    }

    async function loadCourse() {
        course = await api("/lms/course/" + courseId);
        renderSidebar();
    }

    function firstLesson() {
        for (const m of course.modules) if (m.lessons.length) return m.lessons[0];
        return null;
    }

    function allLessonsFlat() {
        return course.modules.flatMap((m) => m.lessons);
    }

    /* ---------------- sidebar ---------------- */
    function renderSidebar() {
        const side = document.getElementById("pl-side");
        const done = course.lessons_done, total = course.lessons_total;
        const pct = course.progress_pct;
        side.innerHTML = `
            <div class="pl-side-head">
                <a class="back" href="/academy/app">← dashboard</a>
                <h2>${escapeHtml(course.title)}</h2>
                <div class="cbar"><i style="width:${pct}%"></i></div>
                <div class="cpct">${pct}% · ${done}/${total} lessons</div>
            </div>
            <div id="pl-mods"></div>`;

        const mods = side.querySelector("#pl-mods");
        mods.innerHTML = course.modules.map((m, mi) => `
            <div class="pl-mod" data-mi="${mi}">
                <button class="pl-mod-h">
                    <span>${escapeHtml(m.title)}${m.category && m.category !== "core"
                        ? '<span class="cat">' + escapeHtml(m.category) + "</span>" : ""}</span>
                    <span class="chev">▾</span>
                </button>
                <div class="pl-les-list">
                    ${m.lessons.map((l) => lessonRow(l)).join("")}
                </div>
            </div>`).join("");

        mods.querySelectorAll(".pl-mod-h").forEach((h) =>
            h.addEventListener("click", () => h.parentElement.classList.toggle("collapsed")));
        mods.querySelectorAll(".pl-les").forEach((b) =>
            b.addEventListener("click", () => {
                const id = parseInt(b.dataset.id, 10);
                if (b.classList.contains("is-locked")) { openLocked(); return; }
                navigate(id);
            }));
        highlightCurrent();
    }

    function lessonRow(l) {
        const icon = l.kind === "video" ? "▶" : l.kind === "practice" ? "✎" : "";
        return `
        <button class="pl-les ${l.completed ? "done" : ""} ${l.locked ? "is-locked" : ""}" data-id="${l.id}">
            <span class="tick">${l.completed ? "✓" : ""}</span>
            <span>${escapeHtml(l.title)}</span>
            <span class="dur">${l.locked ? '<span class="lock">🔒</span>' : (l.duration_min ? l.duration_min + "m" : icon)}</span>
        </button>`;
    }

    function highlightCurrent() {
        document.querySelectorAll(".pl-les").forEach((b) =>
            b.classList.toggle("current", parseInt(b.dataset.id, 10) === lessonId));
        // expand the module containing current lesson, collapse others
        course.modules.forEach((m, mi) => {
            const hasCur = m.lessons.some((l) => l.id === lessonId);
            const el = document.querySelector(`.pl-mod[data-mi="${mi}"]`);
            if (el) el.classList.toggle("collapsed", !hasCur);
        });
    }

    /* ---------------- lesson ---------------- */
    async function navigate(id) {
        lessonId = id;
        history.replaceState({}, "", `/academy/learn?course=${courseId}&lesson=${id}`);
        window.scrollTo(0, 0);
        await loadLesson(id);
        highlightCurrent();
    }

    async function loadLesson(id) {
        const main = document.getElementById("pl-main");
        main.innerHTML = '<div class="spinner"></div>';
        try {
            lesson = await api("/lms/lesson/" + id);
            renderLesson();
        } catch (e) {
            if (e.status === 403 && e.data) { lesson = e.data; renderLocked(); }
            else main.innerHTML = '<p class="muted">Could not load this lesson.</p>';
        }
    }

    function renderLesson() {
        const main = document.getElementById("pl-main");
        const [pos, count] = lesson.position || [0, 0];
        const v = lesson.video || {};
        let video = "";
        if (v.type === "embed") {
            video = `<div class="video-frame"><iframe src="${escapeHtml(v.embed_url)}" allowfullscreen allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
        } else if (v.type === "file" || v.type === "direct") {
            video = `<div class="video-frame"><video src="${escapeHtml(v.src)}" controls preload="metadata"></video></div>`;
        } else if (v.type === "link") {
            video = `<p><a class="btn btn-sm" href="${escapeHtml(v.src)}" target="_blank" rel="noopener">Open video ↗</a></p>`;
        }

        const resources = (lesson.resources || []).map((r) => `
            <a class="res-item" href="${escapeHtml(r.download_url)}" target="_blank" rel="noopener">
                <span class="ic">⬇</span><span>${escapeHtml(r.title)}</span>
                <span class="sz">${r.size_bytes ? fmtBytes(r.size_bytes) : (r.kind === "link" ? "link" : "")}</span>
            </a>`).join("");

        main.innerHTML = `
            <div class="pl-crumb">
                ${escapeHtml(lesson.module.title)} · lesson ${pos}/${count}
                ${lesson.is_free ? ' · <span class="free">free</span>' : ""}
            </div>
            <h1>${escapeHtml(lesson.title)}</h1>
            ${video}
            <div class="lesson-body">${lesson.body_html || '<p class="muted">Written notes for this lesson are coming soon — watch the video above.</p>'}</div>

            ${(resources || lesson.guide_url) ? `
            <div class="resources">
                <h4>Resources &amp; downloads</h4>
                ${resources}
                ${lesson.guide_url ? `<a class="res-item" href="${escapeHtml(lesson.guide_url)}"><span class="ic">⬇</span><span>Full course guide (Markdown)</span><span class="sz">all lessons</span></a>` : ""}
            </div>` : ""}

            <div class="complete-row">
                <button class="btn btn-primary" id="mark">
                    ${lesson.completed ? "✓ Completed" : "Mark complete"}
                </button>
                <span class="muted" id="xp-note"></span>
            </div>

            <div class="pl-nav">
                <button class="btn btn-ghost" id="prev" ${lesson.prev_id ? "" : "disabled"}>← Previous</button>
                <button class="btn" id="next" ${lesson.next_id ? "" : "disabled"}>Next lesson →</button>
            </div>`;

        const mark = main.querySelector("#mark");
        mark.addEventListener("click", () => toggleComplete(mark));
        main.querySelector("#prev").addEventListener("click", () => lesson.prev_id && navigate(lesson.prev_id));
        main.querySelector("#next").addEventListener("click", () => lesson.next_id && navigate(lesson.next_id));

        // lightweight watch ping for video lessons
        const vid = main.querySelector("video");
        if (vid) {
            let last = 0;
            vid.addEventListener("timeupdate", () => {
                if (vid.currentTime - last > 15) {
                    last = vid.currentTime;
                    api(`/lms/lesson/${lesson.id}/progress`, {
                        method: "POST", body: JSON.stringify({ seconds: Math.floor(vid.currentTime) }),
                    }).catch(() => {});
                }
            });
        }
    }

    async function toggleComplete(btn) {
        const want = !lesson.completed;
        btn.disabled = true;
        try {
            const r = await api(`/lms/lesson/${lesson.id}/complete`, {
                method: "POST", body: JSON.stringify({ completed: want }),
            });
            lesson.completed = r.completed;
            btn.textContent = r.completed ? "✓ Completed" : "Mark complete";
            document.getElementById("xp-note").textContent =
                r.completed ? `+XP · ${r.xp} total · Level ${r.level} ${r.level_title}` : "";
            // refresh sidebar state + course progress
            await loadCourse();
            highlightCurrent();
            if (r.completed) {
                toast(r.level_up ? `Level up! ${r.level_title}` : "Lesson complete");
                if (r.level_up) levelUpModal(r.level, r.level_title);
                // auto-advance
                if (want && lesson.next_id) setTimeout(() => navigate(lesson.next_id), 900);
            }
        } catch (e) {
            toast("Could not save — try again");
        } finally {
            btn.disabled = false;
        }
    }

    /* ---------------- locked / empty ---------------- */
    function renderLocked() {
        const main = document.getElementById("pl-main");
        const c = lesson.course || {};
        main.innerHTML = `
            <div class="locked-box">
                <div class="lk">🔒</div>
                <h2>${escapeHtml(lesson.title || "This lesson is locked")}</h2>
                <p>This lesson is part of <strong>${escapeHtml(c.title || courseId)}</strong>.
                   Free preview lessons are open — this one needs the full course.</p>
                <div class="row" style="justify-content:center">
                    <a class="btn btn-primary" href="${escapeHtml(lesson.bmc_url || "#")}" target="_blank" rel="noopener">
                        Get access — ${escapeHtml(lesson.price_label || "Buy me a coffee")} ☕
                    </a>
                    <a class="btn btn-ghost" href="/academy/app">Back to dashboard</a>
                </div>
                <p class="hint" style="margin-top:1rem">Pay with the same email you signed up with — access is unlocked within a day.</p>
            </div>`;
    }

    function openLocked() {
        const bmc = course.bmc_url || "#";
        if (confirm(`This lesson needs the full "${course.title}" course.\n\nOpen Buy Me a Coffee to get access?`)) {
            window.open(bmc, "_blank", "noopener");
        }
    }

    function renderNoContent() {
        document.getElementById("pl-main").innerHTML =
            '<h1>Nothing here yet</h1><p class="muted">This course has no published lessons.</p>';
    }
})();
