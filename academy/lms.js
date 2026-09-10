/* Peter1947 Academy — shared LMS helpers (student side) */
(function (w) {
    "use strict";

    const api = async (path, opts = {}) => {
        const res = await fetch("/api" + path, {
            credentials: "same-origin",
            headers: opts.body && !(opts.body instanceof FormData)
                ? { "Content-Type": "application/json" } : undefined,
            ...opts,
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* non-json (file) */ }
        if (!res.ok) {
            const err = new Error((data && data.error) || res.statusText);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    };

    /** Redirect to login unless a student session is active. Returns the status payload. */
    async function requireStudent() {
        try {
            const s = await api("/student/status?t=" + Date.now());
            if (!s.logged_in) { location.href = "/academy/"; return null; }
            return s;
        } catch (e) {
            location.href = "/academy/";
            return null;
        }
    }

    async function logout() {
        try { await api("/student/logout", { method: "POST" }); } catch (e) {}
        location.href = "/academy/";
    }

    /* ---- toast ---- */
    function toast(msg, ms = 3200) {
        let wrap = document.querySelector(".toast-wrap");
        if (!wrap) {
            wrap = document.createElement("div");
            wrap.className = "toast-wrap";
            document.body.appendChild(wrap);
        }
        const t = document.createElement("div");
        t.className = "toast";
        t.textContent = msg;
        wrap.appendChild(t);
        setTimeout(() => {
            t.style.transition = "opacity .3s, transform .3s";
            t.style.opacity = "0";
            t.style.transform = "translateY(8px)";
            setTimeout(() => t.remove(), 300);
        }, ms);
    }

    /* ---- level-up modal ---- */
    function levelUpModal(level, title) {
        const bd = document.createElement("div");
        bd.className = "modal-backdrop";
        bd.innerHTML =
            '<div class="modal">' +
            '<div class="lvl-ring">🎖️</div>' +
            "<h3>Level " + level + " — " + title + "</h3>" +
            "<p>Nice work. Your rank just went up.</p>" +
            '<button class="btn btn-primary btn-block">Keep going</button>' +
            "</div>";
        const close = () => bd.remove();
        bd.addEventListener("click", (e) => { if (e.target === bd) close(); });
        bd.querySelector("button").addEventListener("click", close);
        document.body.appendChild(bd);
    }

    /* ---- topbar ---- */
    function mountTopbar(active, me) {
        const el = document.getElementById("topbar");
        if (!el) return;
        const ava = (me && me.avatar_emoji) || "🐈";
        const name = (me && me.name) || "";
        el.innerHTML =
            '<a class="brand" href="/academy/app"><span class="dot"></span>peter<b>1947</b></a>' +
            '<nav>' +
            '<a href="/academy/app" data-k="app">Dashboard</a>' +
            '<a href="/academy/learn?course=calisthenics" data-k="learn">Learn</a>' +
            '<a href="/storefront/" data-k="store">Storefront</a>' +
            "</nav>" +
            '<div class="right">' +
            '<span class="user-chip"><span class="ava">' + ava + "</span>" + escapeHtml(name) + "</span>" +
            '<button class="btn btn-sm btn-ghost" id="lg">Logout</button>' +
            "</div>";
        const a = el.querySelector(`nav a[data-k="${active}"]`);
        if (a) a.classList.add("active");
        el.querySelector("#lg").addEventListener("click", logout);
    }

    /* ---- misc ---- */
    const EMOJIS = ["🐈","🦾","🔥","💪","🤸","🧠","🚀","⚡","🎯","🏋️","🤖","🛠️","🧗","🐺","🦅","🏆","🌱","💎","☕","👾","🥷","🦿","📡","🧩"];

    function escapeHtml(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
            { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
        ));
    }
    function fmtBytes(n) {
        if (!n) return "";
        const u = ["B", "KB", "MB", "GB"];
        let i = 0;
        while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
        return n.toFixed(n < 10 && i ? 1 : 0) + " " + u[i];
    }
    function fmtDate(s) {
        if (!s) return "";
        const d = new Date(s.replace(" ", "T") + (s.includes("Z") ? "" : "Z"));
        return isNaN(d) ? s : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }

    w.LMS = { api, requireStudent, logout, toast, levelUpModal, mountTopbar,
              escapeHtml, fmtBytes, fmtDate, EMOJIS };
})(window);
