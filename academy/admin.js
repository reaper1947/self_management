/* Peter1947 Academy — admin panel */
(function () {
    "use strict";
    const { api, toast, escapeHtml, fmtBytes, fmtDate } = window.LMS;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    let courses = [];          // full tree from /admin/lms/courses
    let sel = { c: null, m: null, l: null };

    document.addEventListener("DOMContentLoaded", boot);

    async function boot() {
        try {
            const s = await api("/auth/status");
            if (s.logged_in && s.role === "admin") return showAdmin();
        } catch (e) { /* fallthrough */ }
        showLogin();
    }

    function showLogin() {
        $("#boot").hidden = true;
        $("#login").hidden = false;
        $("#login-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            $("#login-err").textContent = "";
            try {
                const r = await api("/auth/login", {
                    method: "POST", body: JSON.stringify({ password: $("#pw").value }),
                });
                if (r.ok && r.role === "admin") { location.reload(); }
                else $("#login-err").textContent = "Not an admin account.";
            } catch (e) {
                $("#login-err").textContent = "Wrong password.";
            }
        });
    }

    async function showAdmin() {
        $("#boot").hidden = true;
        $("#login").hidden = true;
        $("#admin").hidden = false;
        $("#logout").hidden = false;
        $("#logout").addEventListener("click", async () => {
            await api("/auth/logout", { method: "POST" }); location.href = "/academy/admin";
        });
        $$(".adm-tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.p)));
        await refreshCourses();
        renderDash();
        renderCoursesTab();
        renderStudents();
        renderGrants();
    }

    function switchTab(p) {
        $$(".adm-tab").forEach((t) => t.classList.toggle("active", t.dataset.p === p));
        $$(".adm-panel").forEach((el) => el.classList.toggle("active", el.id === "p-" + p));
    }

    async function refreshCourses() {
        courses = await api("/admin/lms/courses");
    }

    /* ═══════════ DASHBOARD ═══════════ */
    async function renderDash() {
        const el = $("#p-dash");
        el.innerHTML = '<div class="spinner"></div>';
        const o = await api("/admin/lms/overview");
        el.innerHTML = `
            <div class="stat-row">
                ${tile(o.students, "students")}
                ${tile(o.active_7d, "active · 7d")}
                ${tile(o.completions, "lessons completed")}
                ${tile(o.completions_7d, "completed · 7d")}
                ${tile(o.grants, "access grants")}
                ${tile(o.lessons, "lessons live")}
            </div>

            <h3 class="section-title">Per course</h3>
            <div class="card card-p" style="overflow-x:auto">
              <table class="data">
                <tr><th>Course</th><th>Live</th><th>Lessons</th><th>Enrolled</th><th>Avg progress</th><th>Finished</th><th></th></tr>
                ${o.per_course.map((c) => `
                  <tr>
                    <td>${escapeHtml(c.title)}</td>
                    <td>${c.published ? "✓" : "—"}</td>
                    <td>${c.lessons}</td>
                    <td>${c.enrolled}</td>
                    <td>${c.avg_progress}%</td>
                    <td>${c.finished}</td>
                    <td><button class="btn btn-sm" data-reseed="${escapeHtml(c.id)}">Reseed from files</button></td>
                  </tr>`).join("")}
              </table>
            </div>

            <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:1.4rem">
              <div class="card card-p">
                <h3 class="section-title" style="margin-top:0">Recent signups</h3>
                ${o.recent_signups.map((s) => `<div class="res-item"><span>${escapeHtml(s.name || "—")}</span><span class="muted">${escapeHtml(s.email)}</span><span class="sz">${fmtDate(s.created_at)}</span></div>`).join("") || '<p class="muted">None yet.</p>'}
              </div>
              <div class="card card-p">
                <h3 class="section-title" style="margin-top:0">Recent completions</h3>
                ${o.recent_completions.map((s) => `<div class="res-item"><span>${escapeHtml(s.name || s.email)}</span><span class="muted">${escapeHtml(s.lesson)}</span><span class="sz">${fmtDate(s.completed_at)}</span></div>`).join("") || '<p class="muted">None yet.</p>'}
              </div>
            </div>`;
        $$("[data-reseed]", el).forEach((b) => b.addEventListener("click", async () => {
            if (!confirm("Reload this course's content from the repo seed files? Lesson ids and student progress are preserved.")) return;
            b.disabled = true;
            const r = await api("/admin/lms/reseed/" + b.dataset.reseed, { method: "POST" });
            toast("Reseeded: " + JSON.stringify(r.summary));
            await refreshCourses(); renderDash(); renderCoursesTab();
        }));
    }
    const tile = (n, label) => `<div class="stat-tile"><b>${n}</b><span>${label}</span></div>`;

    /* ═══════════ COURSES / LESSONS ═══════════ */
    function renderCoursesTab() {
        const el = $("#p-courses");
        el.innerHTML = `
            <div class="editor-grid">
                <div>
                    <div class="tree" id="tree"></div>
                    <button class="btn btn-sm btn-block" id="new-course" style="margin-top:.6rem">+ New course</button>
                </div>
                <div id="editor"><p class="muted">Pick a course, module or lesson on the left.</p></div>
            </div>`;
        $("#new-course").addEventListener("click", newCourse);
        renderTree();
    }

    function renderTree() {
        const t = $("#tree");
        t.innerHTML = courses.map((c) => `
            <div class="t-course ${sel.c === c.id ? "active" : ""}" data-c="${escapeHtml(c.id)}">${escapeHtml(c.title)}</div>
            ${sel.c === c.id ? c.modules.map((m) => `
                <div class="t-mod ${sel.m === m.id ? "active" : ""}" data-m="${m.id}">▸ ${escapeHtml(m.title)}</div>
                ${sel.m === m.id ? m.lessons.map((l) => `
                    <div class="t-les ${sel.l === l.id ? "active" : ""}" data-l="${l.id}">
                        ${escapeHtml(l.title)} ${l.is_free ? '<span class="free">free</span>' : ""} ${l.published ? "" : "· draft"}
                    </div>`).join("") : ""}
            `).join("") : ""}
        `).join("");
        $$(".t-course", t).forEach((n) => n.addEventListener("click", () => {
            sel = { c: n.dataset.c, m: null, l: null }; renderTree(); editCourse(n.dataset.c);
        }));
        $$(".t-mod", t).forEach((n) => n.addEventListener("click", () => {
            sel.m = +n.dataset.m; sel.l = null; renderTree(); editModule(+n.dataset.m);
        }));
        $$(".t-les", t).forEach((n) => n.addEventListener("click", () => {
            sel.l = +n.dataset.l; renderTree(); editLesson(+n.dataset.l);
        }));
    }

    const findCourse = (id) => courses.find((c) => c.id === id);
    const findModule = (id) => { for (const c of courses) { const m = c.modules.find((x) => x.id === id); if (m) return [c, m]; } return []; };
    const findLesson = (id) => { for (const c of courses) for (const m of c.modules) { const l = m.lessons.find((x) => x.id === id); if (l) return [c, m, l]; } return []; };

    async function newCourse() {
        const id = prompt("Course id (slug, e.g. 'nutrition'):");
        if (!id) return;
        const title = prompt("Course title:") || id;
        await api("/admin/lms/courses", { method: "POST", body: JSON.stringify({ id, title }) });
        await refreshCourses(); sel.c = id.toLowerCase().replace(/\s+/g, "-"); renderTree(); editCourse(sel.c);
    }

    function field(label, name, val, type = "text") {
        return `<label class="field"><span>${label}</span><input type="${type}" name="${name}" value="${escapeHtml(val ?? "")}"></label>`;
    }

    function editCourse(id) {
        const c = findCourse(id);
        if (!c) return;
        $("#editor").innerHTML = `
            <h3>Course · <span class="mono">${escapeHtml(c.id)}</span></h3>
            <form class="form-stack" id="cf">
                ${field("Title", "title", c.title)}
                ${field("Subtitle", "subtitle", c.subtitle)}
                <label class="field"><span>Description (markdown)</span><textarea name="description">${escapeHtml(c.description || "")}</textarea></label>
                ${field("Price label (e.g. $49)", "price_label", c.price_label)}
                ${field("Buy Me a Coffee URL (the paid Extra link)", "bmc_url", c.bmc_url, "url")}
                <label class="field"><span>Accent</span><select name="accent">
                    <option value="cal" ${c.accent === "cal" ? "selected" : ""}>cyan (calisthenics)</option>
                    <option value="rob" ${c.accent === "rob" ? "selected" : ""}>violet (robotics)</option>
                </select></label>
                <label class="field"><span>Access</span><select name="access_mode">
                    <option value="paid" ${c.access_mode === "paid" ? "selected" : ""}>paid (needs a grant)</option>
                    <option value="free" ${c.access_mode === "free" ? "selected" : ""}>free for all signed-in students</option>
                </select></label>
                <label class="field"><span>Published</span><select name="published">
                    <option value="1" ${c.published ? "selected" : ""}>yes — visible to students</option>
                    <option value="0" ${!c.published ? "selected" : ""}>no — hidden</option>
                </select></label>
                <div class="row">
                    <button class="btn btn-primary" type="submit">Save course</button>
                    <button class="btn btn-sm" type="button" id="add-mod">+ Add module</button>
                    <button class="btn btn-sm btn-danger" type="button" id="del-course">Delete course</button>
                </div>
            </form>`;
        $("#cf").addEventListener("submit", async (e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.target));
            d.published = +d.published;
            await api("/admin/lms/courses/" + c.id, { method: "PATCH", body: JSON.stringify(d) });
            toast("Saved"); await refreshCourses(); renderTree(); editCourse(c.id);
        });
        $("#add-mod").addEventListener("click", async () => {
            const title = prompt("Module title:"); if (!title) return;
            const r = await api("/admin/lms/modules", { method: "POST", body: JSON.stringify({ course_id: c.id, title }) });
            await refreshCourses(); sel.m = r.id; renderTree(); editModule(r.id);
        });
        $("#del-course").addEventListener("click", async () => {
            if (!confirm(`Delete "${c.title}" and ALL its modules & lessons? This cannot be undone.`)) return;
            await api("/admin/lms/courses/" + c.id, { method: "DELETE" });
            sel = { c: null, m: null, l: null }; await refreshCourses(); renderCoursesTab();
        });
    }

    function editModule(id) {
        const [c, m] = findModule(id);
        if (!m) return;
        $("#editor").innerHTML = `
            <h3>Module — ${escapeHtml(c.title)}</h3>
            <form class="form-stack" id="mf">
                ${field("Title", "title", m.title)}
                <label class="field"><span>Summary</span><textarea name="summary">${escapeHtml(m.summary || "")}</textarea></label>
                <label class="field"><span>Category</span><select name="category">
                    ${["core", "static", "dynamic"].map((x) => `<option ${m.category === x ? "selected" : ""}>${x}</option>`).join("")}
                </select></label>
                ${field("Sort order (lower = first)", "sort", m.sort, "number")}
                <div class="row">
                    <button class="btn btn-primary" type="submit">Save module</button>
                    <button class="btn btn-sm" type="button" id="add-les">+ Add lesson</button>
                    <button class="btn btn-sm btn-danger" type="button" id="del-mod">Delete module</button>
                </div>
            </form>`;
        $("#mf").addEventListener("submit", async (e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.target)); d.sort = +d.sort;
            await api("/admin/lms/modules/" + id, { method: "PATCH", body: JSON.stringify(d) });
            toast("Saved"); await refreshCourses(); renderTree(); editModule(id);
        });
        $("#add-les").addEventListener("click", async () => {
            const title = prompt("Lesson title:"); if (!title) return;
            const r = await api("/admin/lms/lessons", { method: "POST", body: JSON.stringify({ module_id: id, title }) });
            await refreshCourses(); sel.l = r.id; renderTree(); editLesson(r.id);
        });
        $("#del-mod").addEventListener("click", async () => {
            if (!confirm("Delete this module and its lessons?")) return;
            await api("/admin/lms/modules/" + id, { method: "DELETE" });
            sel.m = null; sel.l = null; await refreshCourses(); renderTree(); editCourse(c.id);
        });
    }

    async function editLesson(id) {
        const [c, m] = findLesson(id);
        const l = await api("/admin/lms/lessons/" + id);   // full row incl body_md
        $("#editor").innerHTML = `
            <h3>Lesson — ${escapeHtml(m.title)}</h3>
            <form class="form-stack" id="lf" style="max-width:none">
                ${field("Title", "title", l.title)}
                <div class="inline-form">
                    <label class="field" style="flex:1"><span>Type</span><select name="kind">
                        ${["reading", "video", "practice"].map((x) => `<option ${l.kind === x ? "selected" : ""}>${x}</option>`).join("")}
                    </select></label>
                    <label class="field" style="width:120px"><span>Minutes</span><input type="number" name="duration_min" value="${l.duration_min || 0}"></label>
                    <label class="field" style="width:110px"><span>Sort</span><input type="number" name="sort" value="${l.sort || 0}"></label>
                </div>
                <div class="row">
                    <span class="hint">Free preview:</span>
                    <span class="pill-toggle"><button type="button" data-k="is_free" data-v="1" class="${l.is_free ? "on" : ""}">free</button>
                    <button type="button" data-k="is_free" data-v="0" class="${!l.is_free ? "on" : ""}">paid</button></span>
                    <span class="hint">Published:</span>
                    <span class="pill-toggle"><button type="button" data-k="published" data-v="1" class="${l.published ? "on" : ""}">live</button>
                    <button type="button" data-k="published" data-v="0" class="${!l.published ? "on" : ""}">draft</button></span>
                </div>

                <label class="field"><span>Video URL (YouTube / Vimeo / .mp4) — or upload below</span>
                    <input type="url" name="video_url" value="${escapeHtml(l.video_url || "")}"></label>
                <div class="inline-form">
                    <input type="file" id="vfile" accept="video/*">
                    <button class="btn btn-sm" type="button" id="vup">Upload video</button>
                    <span class="hint" id="vinfo">${l.video_file ? "stored: " + escapeHtml(l.video_file) : ""}</span>
                </div>

                <label class="field"><span>Lesson content (Markdown)</span></label>
                <div class="md-editor">
                    <textarea id="body" name="body_md">${escapeHtml(l.body_md || "")}</textarea>
                    <div class="md-preview" id="preview"></div>
                </div>

                <div class="row">
                    <button class="btn btn-primary" type="submit">Save lesson</button>
                    <button class="btn btn-sm btn-danger" type="button" id="del-les">Delete lesson</button>
                </div>
            </form>

            <div class="card card-p" style="margin-top:1.2rem">
                <h4 class="section-title" style="margin:0 0 .7rem">Resources / downloads</h4>
                <div id="reslist"></div>
                <div class="inline-form" style="margin-top:.6rem">
                    <input type="text" id="r-title" placeholder="Title">
                    <input type="url" id="r-url" placeholder="https://link… (or use file)">
                    <input type="file" id="r-file">
                    <button class="btn btn-sm" type="button" id="r-add">Add resource</button>
                </div>
            </div>`;

        // toggles
        const toggles = { is_free: l.is_free ? 1 : 0, published: l.published ? 1 : 0 };
        $$(".pill-toggle button", $("#lf")).forEach((b) => b.addEventListener("click", () => {
            toggles[b.dataset.k] = +b.dataset.v;
            b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        }));

        // markdown preview (debounced, server render)
        const body = $("#body"), preview = $("#preview");
        let tmr;
        const doPreview = async () => {
            try { preview.innerHTML = (await api("/admin/lms/preview", {
                method: "POST", body: JSON.stringify({ md: body.value }),
            })).html; } catch (e) {}
        };
        body.addEventListener("input", () => { clearTimeout(tmr); tmr = setTimeout(doPreview, 400); });
        doPreview();

        $("#lf").addEventListener("submit", async (e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.target));
            d.duration_min = +d.duration_min; d.sort = +d.sort;
            Object.assign(d, toggles);
            if ($("#vinfo").dataset.file) d.video_file = $("#vinfo").dataset.file;
            await api("/admin/lms/lessons/" + id, { method: "PATCH", body: JSON.stringify(d) });
            toast("Lesson saved"); await refreshCourses(); renderTree();
        });
        $("#del-les").addEventListener("click", async () => {
            if (!confirm("Delete this lesson and its progress records?")) return;
            await api("/admin/lms/lessons/" + id, { method: "DELETE" });
            sel.l = null; await refreshCourses(); renderTree(); editModule(m.id);
        });

        // video upload
        $("#vup").addEventListener("click", async () => {
            const f = $("#vfile").files[0];
            if (!f) return toast("Choose a file first");
            const fd = new FormData(); fd.append("file", f); fd.append("course_id", c.id);
            $("#vinfo").textContent = "uploading… (" + fmtBytes(f.size) + ")";
            try {
                const r = await api("/admin/lms/upload", { method: "POST", body: fd });
                $("#vinfo").textContent = "stored: " + r.file_path + " — Save the lesson to apply";
                $("#vinfo").dataset.file = r.file_path;
            } catch (e) { $("#vinfo").textContent = "upload failed: " + e.message; }
        });

        // resources
        await loadResources(id, c.id);
        $("#r-add").addEventListener("click", async () => {
            const title = $("#r-title").value.trim();
            const url = $("#r-url").value.trim();
            const file = $("#r-file").files[0];
            if (!title) return toast("Give it a title");
            try {
                if (file) {
                    const fd = new FormData();
                    fd.append("file", file); fd.append("title", title);
                    fd.append("course_id", c.id); fd.append("lesson_id", id);
                    await api("/admin/lms/resources", { method: "POST", body: fd });
                } else if (url) {
                    await api("/admin/lms/resources", { method: "POST", body: JSON.stringify({
                        course_id: c.id, lesson_id: id, title, url, kind: "link",
                    }) });
                } else return toast("Add a URL or a file");
                $("#r-title").value = $("#r-url").value = "";
                await loadResources(id, c.id);
            } catch (e) { toast("Failed: " + e.message); }
        });
    }

    async function loadResources(lessonId, courseId) {
        let items = [];
        try { items = (await api("/admin/lms/lessons/" + lessonId)).resources || []; } catch (e) {}
        $("#reslist").innerHTML = items.length ? items.map((r) => `
            <div class="res-item">
                <span>${escapeHtml(r.title)}</span>
                <span class="muted">${escapeHtml(r.kind)}</span>
                <span class="sz">${r.size_bytes ? fmtBytes(r.size_bytes) : ""}</span>
                <button class="btn btn-sm btn-danger" data-del="${r.id}">✕</button>
            </div>`).join("") : '<p class="muted">No resources yet.</p>';
        $$("[data-del]", $("#reslist")).forEach((b) => b.addEventListener("click", async () => {
            await api("/admin/lms/resources/" + b.dataset.del, { method: "DELETE" });
            await loadResources(lessonId, courseId);
        }));
    }

    /* ═══════════ STUDENTS ═══════════ */
    async function renderStudents() {
        const el = $("#p-students");
        el.innerHTML = '<div class="spinner"></div>';
        const rows = await api("/admin/lms/students");
        el.innerHTML = `
            <div class="card card-p" style="overflow-x:auto">
              <table class="data">
                <tr><th>Name</th><th>Email</th><th>Joined</th><th>Level</th><th>XP</th><th>Lessons</th><th>Owns</th></tr>
                ${rows.map((s) => `
                  <tr>
                    <td>${escapeHtml(s.name || "—")}</td>
                    <td class="mono">${escapeHtml(s.email)}</td>
                    <td>${fmtDate(s.joined)}</td>
                    <td>${s.level} · ${escapeHtml(s.level_title)}</td>
                    <td>${s.xp}</td>
                    <td>${s.lessons_completed}</td>
                    <td>${(s.courses || []).map(escapeHtml).join(", ") || "—"}</td>
                  </tr>`).join("")}
              </table>
              ${rows.length ? "" : '<p class="muted">No students yet.</p>'}
            </div>`;
    }

    /* ═══════════ GRANTS ═══════════ */
    function renderGrants() {
        const el = $("#p-grants");
        const opts = courses.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.title)}</option>`).join("");
        el.innerHTML = `
            <div class="card card-p form-stack">
                <h3>Grant course access</h3>
                <p class="hint">After a Buy Me a Coffee purchase: enter the buyer's email (they must have created an account first) and the course.</p>
                <label class="field"><span>Student email</span><input type="email" id="g-email"></label>
                <label class="field"><span>Course</span><select id="g-course">${opts}</select></label>
                <label class="field"><span>Source</span><select id="g-source">
                    <option value="bmc">buy me a coffee</option><option value="admin">manual / comp</option>
                    <option value="free">giveaway</option>
                </select></label>
                <div class="row">
                    <button class="btn btn-primary" id="g-do">Grant access</button>
                    <button class="btn btn-danger" id="g-revoke">Revoke instead</button>
                </div>
                <p id="g-msg"></p>
            </div>`;
        const msg = $("#g-msg");
        $("#g-do").addEventListener("click", async () => {
            msg.textContent = ""; msg.className = "";
            try {
                const r = await api("/admin/lms/grant", { method: "POST", body: JSON.stringify({
                    email: $("#g-email").value.trim(),
                    course_id: $("#g-course").value,
                    source: $("#g-source").value,
                }) });
                msg.textContent = r.already ? "Already had access." : "✓ Access granted.";
                msg.className = "ok-text";
                renderStudents(); renderDash();
            } catch (e) { msg.textContent = e.message; msg.className = "err-text"; }
        });
        $("#g-revoke").addEventListener("click", async () => {
            msg.textContent = ""; msg.className = "";
            if (!confirm("Revoke this student's access to the selected course?")) return;
            try {
                await api("/admin/lms/revoke", { method: "POST", body: JSON.stringify({
                    email: $("#g-email").value.trim(), course_id: $("#g-course").value,
                }) });
                msg.textContent = "Access revoked."; msg.className = "ok-text";
                renderStudents();
            } catch (e) { msg.textContent = e.message; msg.className = "err-text"; }
        });
    }
})();
