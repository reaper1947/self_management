document.addEventListener('DOMContentLoaded', () => {

    const SK = { bg:'bat_bg', links:'bat_links', tasks:'bat_tasks', notes:'bat_notes', settings:'bat_settings' };
    const TOTAL_BG = 3;

    // ── Storage adapter: use localStorage instead of chrome.storage ──
    const store = {
        get(key, cb) {
            setTimeout(() => {
                try {
                    const val = localStorage.getItem(key);
                    cb({ [key]: val ? JSON.parse(val) : null });
                } catch { cb({}); }
            }, 0);
        },
        set(obj) {
            for (const [k, v] of Object.entries(obj)) {
                localStorage.setItem(k, JSON.stringify(v));
            }
        }
    };

    let settings = { name: 'Wayne', theme: 'theme-vengeance', blur: 5 };
    store.get(SK.settings, r => {
        if (r[SK.settings]) settings = { ...settings, ...r[SK.settings] };
        applySettings();
        updateClock();
    });

    function saveSettings() { store.set({ [SK.settings]: settings }); }
    
    function applySettings() {
        document.body.className = settings.theme;
        document.documentElement.style.setProperty('--blur-val', settings.blur + 'px');
        document.getElementById('inp-name').value = settings.name;
        document.getElementById('sel-theme').value = settings.theme;
        document.getElementById('inp-blur').value = settings.blur;
        updateGreeting();
    }

    document.getElementById('save-settings').addEventListener('click', () => {
        settings.name = document.getElementById('inp-name').value.trim() || 'Wayne';
        settings.theme = document.getElementById('sel-theme').value;
        settings.blur = document.getElementById('inp-blur').value;
        saveSettings();
        applySettings();
        closeAllPanels();
    });

    document.getElementById('inp-blur').addEventListener('input', e => {
        document.documentElement.style.setProperty('--blur-val', e.target.value + 'px');
    });

    const bgA = document.getElementById('bg-a');
    const bgB = document.getElementById('bg-b');
    let currentBg  = Math.floor(Math.random() * TOTAL_BG);
    let isAnimating = false;
    let pendingIdx  = -1;
    let useA = true;

    const batQuotes = [
        "FEAR IS A TOOL.",
        "I AM VENGEANCE.",
        "THEY THINK I AM HIDING IN THE SHADOWS... BUT I AM THE SHADOWS.",
        "THE CITY IS EATING ITSELF.",
        "UNMASK THE TRUTH.",
        "WHAT IS BLACK AND BLUE AND DEAD ALL OVER?",
        "IF YOU ARE JUSTICE, PLEASE DO NOT LIE."
    ];

    function preloadAll() { for (let i = 1; i <= TOTAL_BG; i++) { const img = new Image(); img.src = `img/bat${i}.jpg`; } }
    preloadAll();

    function getActive() { return useA ? bgA : bgB; }
    function getNext()   { return useA ? bgB : bgA; }

    function updateQuote() {
        const qEl = document.getElementById('hw-quote');
        const randQ = batQuotes[Math.floor(Math.random() * batQuotes.length)];
        qEl.textContent = "";
        let i = 0;
        const type = setInterval(() => {
            qEl.textContent += randQ.charAt(i);
            i++;
            if(i >= randQ.length) clearInterval(type);
        }, 50);
    }

    function applyBg(idx, doAnimate) {
        idx = ((idx % TOTAL_BG) + TOTAL_BG) % TOTAL_BG;
        currentBg = idx;
        const url = `img/bat${idx + 1}.jpg`;

        if (!doAnimate) {
            bgA.style.backgroundImage = `url('${url}')`;
            bgB.style.backgroundImage = `url('${url}')`;
            bgA.classList.add('active');
            bgB.classList.remove('active');
            useA = true;
            updateQuote();
            return;
        }
        if (isAnimating) { pendingIdx = idx; return; }

        const perform = () => {
            isAnimating = true;
            const nextEl = getNext();
            nextEl.style.backgroundImage = `url('${url}')`;
            void nextEl.offsetWidth;
            nextEl.classList.add('active');
            updateQuote();

            setTimeout(() => {
                getActive().classList.remove('active');
                useA = !useA;
                isAnimating = false;
                if (pendingIdx >= 0) { 
                    const q = pendingIdx; 
                    pendingIdx = -1; 
                    setTimeout(() => applyBg(q, true), 50); 
                }
            }, 1200);
        };

        const testImg = new Image();
        testImg.onload = perform; testImg.onerror = perform; testImg.src = url;
        if (testImg.complete && testImg.naturalWidth > 0) { testImg.onload = null; perform(); }
    }

    applyBg(currentBg, false);
    document.getElementById('btn-prev-bg').addEventListener('click', () => applyBg(currentBg - 1, true));
    document.getElementById('btn-next-bg').addEventListener('click', () => applyBg(currentBg + 1, true));

    const elTime = document.getElementById('hud-time');
    const elAmpm = document.getElementById('hud-ampm');
    const elDate = document.getElementById('hud-date');
    const elGreeting = document.getElementById('hud-greeting');

    function updateGreeting() {
        const h = new Date().getHours();
        let tod = 'NIGHT';
        if (h >= 5 && h < 12) tod = 'MORNING';
        else if (h >= 12 && h < 18) tod = 'AFTERNOON';
        else if (h >= 18 && h < 22) tod = 'EVENING';
        elGreeting.textContent = `GOOD ${tod}, OPERATIVE ${settings.name.toUpperCase()}`;
    }

    function updateClock() {
        const now = new Date();
        let h = now.getHours(), m = now.getMinutes();
        
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        elTime.textContent = `${h}:${String(m).padStart(2,'0')}`;
        elAmpm.textContent = ampm;
        
        const opts = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
        elDate.textContent = "SYS.DATE: " + now.toLocaleDateString('en-US', opts).toUpperCase();
        if (m === 0 && now.getSeconds() === 0) updateGreeting();
        setTimeout(updateClock, 1000);
    }

    const MODES = [ { l:'FOCUS PROTOCOL', s:25*60 }, { l:'STANDBY (SHORT)', s:5*60 }, { l:'STANDBY (LONG)', s:15*60 } ];
    let tMode = 0, tLeft = MODES[0].s, tRun = false, tInt = null;
    const tv = document.getElementById('session-val'), tm = document.getElementById('session-mode');
    
    function fmtT(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
    function upT() { tv.textContent = fmtT(tLeft); tm.textContent = MODES[tMode].l; }
    
    document.getElementById('tmr-start').addEventListener('click', () => {
        if(tRun) return; tRun = true;
        tInt = setInterval(() => {
            tLeft--; upT();
            if(tLeft<=0) { clearInterval(tInt); tRun=false; tMode=(tMode+1)%3; tLeft=MODES[tMode].s; upT(); }
        }, 1000);
    });
    document.getElementById('tmr-pause').addEventListener('click', () => { clearInterval(tInt); tRun=false; });
    document.getElementById('tmr-reset').addEventListener('click', () => { clearInterval(tInt); tRun=false; tLeft=MODES[tMode].s; upT(); });
    upT();

    const panels = document.querySelectorAll('.hud-modal');
    const tabs = document.querySelectorAll('.sidebar-btn');

    function closeAllPanels() {
        panels.forEach(p => p.classList.remove('show'));
        tabs.forEach(btn => btn.classList.remove('active'));
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-target');
            if (!targetId) return;
            const targetPanel = document.getElementById(targetId);
            
            if (targetPanel.classList.contains('show')) {
                closeAllPanels();
            } else {
                closeAllPanels();
                targetPanel.classList.add('show');
                tab.classList.add('active');
            }
        });
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllPanels);
    });

    let tasks = [];
    store.get(SK.tasks, r => { tasks = r[SK.tasks] || []; renderTasks(); });
    function renderTasks() {
        const c = document.getElementById('task-list'); c.innerHTML = '';
        tasks.forEach((t,i) => {
            const r = document.createElement('div'); r.className = 'task-row' + (t.d?' done':'');
            r.innerHTML = `<input type="checkbox" class="task-cb" ${t.d?'checked':''}><input type="text" class="task-txt-val" value="${t.t.replace(/"/g,'&quot;')}" readonly><button class="task-del">✕</button>`;
            r.querySelector('.task-cb').addEventListener('change', e => { tasks[i].d = e.target.checked; saveTasks(); });
            r.querySelector('.task-del').addEventListener('click', () => { tasks.splice(i,1); saveTasks(); });
            c.appendChild(r);
        });
    }
    function saveTasks() { store.set({ [SK.tasks]: tasks }); renderTasks(); }
    const inpT = document.getElementById('task-input');
    const addT = () => { const v = inpT.value.trim(); if(v) { tasks.push({t:v,d:false}); inpT.value=''; saveTasks(); } };
    document.getElementById('add-task-btn').addEventListener('click', addT);
    inpT.addEventListener('keydown', e => { if(e.key==='Enter') addT(); });

    const nArea = document.getElementById('note-area');
    const nLen = document.getElementById('notes-len');
    let nTmr = null;
    store.get(SK.notes, r => { if(nArea) { nArea.value = r[SK.notes] || ''; upNLen(); } });
    function upNLen() { if(!nArea || !nLen) return; const b = new Blob([nArea.value]).size; nLen.textContent = b>1024 ? (b/1024).toFixed(1)+'KB' : b+'B'; }
    if(nArea) {
        nArea.addEventListener('input', () => {
            upNLen(); clearTimeout(nTmr);
            nTmr = setTimeout(() => { store.set({ [SK.notes]: nArea.value }); }, 600);
        });
    }
    document.getElementById('save-note').addEventListener('click', () => closeAllPanels());

    const defLinks = [ { n:'Dashboard', u:'/dashboard/' }, { n:'Storefront', u:'/storefront/' }, { n:'Academy', u:'/academy/' } ];
    let links = [];
    store.get(SK.links, r => { links = r[SK.links] || defLinks; renderDockLinks(); });

    function renderDockLinks() {
        const c = document.getElementById('dock-links');
        c.innerHTML = '';
        links.forEach((lk, i) => {
            const el = document.createElement('a'); el.className = 'link-item'; el.href = lk.u;
            let fav = ''; try { fav = `https://www.google.com/s2/favicons?sz=64&domain=${new URL(lk.u).hostname}`; } catch{}
            el.innerHTML = `
                <div class="link-icon-wrap"><img src="${fav}" onerror="this.style.display='none'"></div>
                <div class="link-label">${lk.n}</div>
                <button class="link-del" data-i="${i}">✕</button>
            `;
            el.querySelector('.link-del').addEventListener('click', e => { e.preventDefault(); links.splice(i,1); saveLinks(); });
            c.appendChild(el);
        });
    }
    function saveLinks() { store.set({ [SK.links]: links }); renderDockLinks(); }

    const lNam = document.getElementById('inp-link-name'), lUrl = document.getElementById('inp-link-url');
    document.getElementById('btn-add-link').addEventListener('click', () => {
        const n = lNam.value.trim(); let u = lUrl.value.trim();
        if(!n || !u) return; if(!u.startsWith('http')) u = 'https://'+u;
        links.push({n,u}); saveLinks(); lNam.value=''; lUrl.value='';
    });

});