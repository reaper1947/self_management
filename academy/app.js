/* Peter1947 Academy — student dashboard */
(function () {
    "use strict";
    const { api, requireStudent, toast, mountTopbar, escapeHtml, fmtDate, EMOJIS } = window.LMS;
    let me = null;

    document.addEventListener("DOMContentLoaded", boot);

    async function boot() {
        const s = await requireStudent();
        if (!s) return;
        await load();
        document.getElementById("gate").hidden = true;
        document.getElementById("app").hidden = false;
    }

    async function load() {
        me = await api("/lms/me");
        mountTopbar("app", me);
        renderProfile();
        renderResume();
        renderCourses();
    }

    /* ---------- profile card ---------- */
    function renderProfile() {
        const el = document.getElementById("profile");
        const toNext = me.xp_to_next;
        const pct = toNext == null ? 100
            : Math.round(100 * me.xp_into_level / (me.xp_into_level + toNext));
        el.innerHTML = `
            <div class="p-avatar" id="avatar" title="Change avatar">${me.avatar_emoji || "🐈"}</div>
            <div class="p-id">
                <h1>${escapeHtml(me.name || "Student")}</h1>
                <div class="email">${escapeHtml(me.email || "")}</div>
                <div class="p-rank">
                    <span class="lvl-badge">LVL ${me.level}</span>
                    <span class="rank-name">${escapeHtml(me.level_title)}</span>
                </div>
            </div>
            <div class="p-body">
                <div class="xp-wrap">
                    <div class="xp-meta">
                        <span>${me.xp} XP</span>
                        <span>${toNext == null ? "max rank" : toNext + " XP to level " + (me.level + 1)}</span>
                    </div>
                    <div class="xp-track"><div class="xp-fill" style="width:${pct}%"></div></div>
                </div>
                <div class="p-stats">
                    <div class="p-stat"><b>${me.lessons_completed}</b><span>lessons done</span></div>
                    <div class="p-stat"><b class="flame">${me.streak_days}🔥</b><span>day streak</span></div>
                    <div class="p-stat"><b>${me.courses.filter(c => c.owned).length}</b><span>courses owned</span></div>
                    <div class="p-stat"><b>${fmtDate(me.joined) || "—"}</b><span>member since</span></div>
                </div>
                <div class="p-editable">
                    <div class="p-field">
                        <label>Goal</label>
                        <div class="val"><span id="goal-v">${escapeHtml(me.goal)}</span>
                        <span class="edit-link" data-edit="goal">edit</span></div>
                    </div>
                    <div class="p-field">
                        <label>About</label>
                        <div class="val"><span id="bio-v">${escapeHtml(me.bio)}</span>
                        <span class="edit-link" data-edit="bio">edit</span></div>
                    </div>
                </div>
            </div>`;

        el.querySelector("#avatar").addEventListener("click", openEmoji);
        el.querySelectorAll("[data-edit]").forEach((b) =>
            b.addEventListener("click", () => editField(b.dataset.edit)));
    }

    function openEmoji(e) {
        document.querySelector(".emoji-pop")?.remove();
        const pop = document.createElement("div");
        pop.className = "emoji-pop";
        pop.innerHTML = EMOJIS.map((x) => `<button>${x}</button>`).join("");
        pop.querySelectorAll("button").forEach((b) =>
            b.addEventListener("click", async () => {
                await api("/lms/me", { method: "POST", body: JSON.stringify({ avatar_emoji: b.textContent }) });
                pop.remove();
                await load();
            }));
        e.currentTarget.parentElement.appendChild(pop);
        setTimeout(() => document.addEventListener("click", function h(ev) {
            if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener("click", h); }
        }), 0);
    }

    async function editField(field) {
        const current = field === "goal" ? me.goal : me.bio;
        const val = window.prompt(field === "goal" ? "Your training goal:" : "A line about you:", current || "");
        if (val === null) return;
        await api("/lms/me", { method: "POST", body: JSON.stringify({ [field]: val }) });
        await load();
        toast("Saved");
    }

    /* ---------- resume ---------- */
    function renderResume() {
        const slot = document.getElementById("resume-slot");
        const inProgress = me.courses
            .filter((c) => (c.owned || true) && c.lessons_done > 0 && c.progress_pct < 100 && c.next_lesson_id)
            .sort((a, b) => b.progress_pct - a.progress_pct)[0];
        if (!inProgress) { slot.innerHTML = ""; return; }
        slot.innerHTML = `
            <div class="resume">
                <div class="r-txt">
                    <b>Continue: ${escapeHtml(inProgress.title)}</b>
                    <span>${inProgress.progress_pct}% complete · ${inProgress.lessons_done}/${inProgress.lessons_total} lessons</span>
                </div>
                <a class="btn btn-primary" href="/academy/learn?course=${inProgress.id}&lesson=${inProgress.next_lesson_id}">Resume →</a>
            </div>`;
    }

    /* ---------- courses ---------- */
    function renderCourses() {
        const wrap = document.getElementById("courses");
        wrap.innerHTML = me.courses.map((c) => {
            const acc = c.accent === "rob" ? "rob" : "cal";
            let cta;
            if (c.owned && c.progress_pct > 0) {
                cta = `<a class="btn btn-primary btn-sm" href="/academy/learn?course=${c.id}${c.next_lesson_id ? "&lesson=" + c.next_lesson_id : ""}">Continue</a>`;
            } else if (c.owned) {
                cta = `<a class="btn btn-primary btn-sm" href="/academy/learn?course=${c.id}">Start</a>`;
            } else {
                cta = `<a class="btn btn-sm" href="/academy/learn?course=${c.id}">Preview free lessons</a>`;
            }
            return `
            <article class="course-card">
                <div class="cc-top ${acc}"></div>
                <div class="cc-body">
                    <span class="cc-tag ${acc}">${escapeHtml(c.id)}</span>
                    <h3>${escapeHtml(c.title)}</h3>
                    <p>${escapeHtml(c.subtitle || "")}</p>
                    <div class="cc-progress">
                        <div class="cc-bar"><i style="width:${c.progress_pct}%"></i></div>
                        <div class="cc-meta"><span>${c.progress_pct}%</span><span>${c.lessons_done}/${c.lessons_total}</span></div>
                    </div>
                    <div class="cc-foot">
                        ${c.owned ? '<span class="badge owned">owned</span>'
                                  : '<span class="badge locked">' + escapeHtml(c.price_label || "locked") + "</span>"}
                        ${cta}
                    </div>
                </div>
            </article>`;
        }).join("");
    }
})();
