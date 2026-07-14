/*  HabitDashboard.jsx
 *  ---------------------------------------------------------------------------
 *  Refined "terminal data" habit / productivity dashboard.
 *  Drop-in replacement for the original single-file App component.
 *
 *  • Real ES-module React (no in-browser Babel).
 *  • Persistence uses your Flask /api/data/<key> endpoints (load + 30s poll).
 *  • Styles + Google Fonts are injected once on mount, so no extra CSS/HTML
 *    wiring is required. If you'd rather manage CSS yourself, lift STYLE_CSS
 *    into a .css file and delete the useInjectedStyles() call.
 *  • Tune the look with the ACCENT / DENSITY constants just below. Dark/light
 *    is a live in-app toggle (persisted to localStorage).
 * ---------------------------------------------------------------------------
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";

/* ════════════════════════════ CONFIG ════════════════════════════ */
const ACCENT  = "var(--cat-health)"; // "var(--cat-work)" | "var(--cat-mind)" | "var(--cat-social)"
const DENSITY = "comfortable";       // "compact" | "comfortable"
const API_BASE = "/api";

/* ════════════════════════════ DATA ════════════════════════════ */
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_LABEL = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const getDaysInMonth     = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

const MOODS = [
  { e:"😣", l:"Rough", c:"var(--low)" },
  { e:"😐", l:"Meh",   c:"var(--mid)" },
  { e:"🙂", l:"Okay",  c:"var(--cat-social)" },
  { e:"😄", l:"Good",  c:"var(--cat-health)" },
  { e:"🔥", l:"Fire",  c:"var(--cat-social)" },
];

const CATEGORIES = [
  { id:"health", label:"Health",        color:"var(--cat-health)", bg:"var(--cat-health-bg)", border:"var(--cat-health-border)" },
  { id:"work",   label:"Work",          color:"var(--cat-work)",   bg:"var(--cat-work-bg)",   border:"var(--cat-work-border)" },
  { id:"mind",   label:"Mind",          color:"var(--cat-mind)",   bg:"var(--cat-mind-bg)",   border:"var(--cat-mind-border)" },
  { id:"social", label:"Social",        color:"var(--cat-social)", bg:"var(--cat-social-bg)", border:"var(--cat-social-border)" },
  { id:"none",   label:"Uncategorized", color:"var(--cat-none)",   bg:"var(--cat-none-bg)",   border:"var(--cat-none-border)" },
];
const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[4];

const DEFAULT_HABITS = [
  { name:"Wake up 05:00",      cat:"health" },
  { name:"Gym",                cat:"health" },
  { name:"Cold shower",        cat:"health" },
  { name:"No alcohol",         cat:"health" },
  { name:"Read / learn",       cat:"mind" },
  { name:"Goal journaling",    cat:"mind" },
  { name:"Meditate",           cat:"mind" },
  { name:"Day planning",       cat:"work" },
  { name:"Deep work block",    cat:"work" },
  { name:"Inbox zero",         cat:"work" },
  { name:"Social media detox", cat:"social" },
  { name:"Call a friend",      cat:"social" },
];

const rampColor = (pct) =>
  pct >= 80 ? "var(--good)" :
  pct >= 50 ? "var(--mid)" :
  pct >= 25 ? "var(--cat-social)" : "var(--low)";

function calcStreaks(habitName, daysInMonth, getChecked) {
  let best = 0, tmp = 0, last = daysInMonth;
  for (let d = 1; d <= daysInMonth; d++) {
    if (getChecked(habitName, d)) { tmp++; best = Math.max(best, tmp); } else tmp = 0;
  }
  while (last >= 1 && !getChecked(habitName, last)) last--;
  tmp = 0;
  for (let d = last; d >= 1; d--) { if (getChecked(habitName, d)) tmp++; else break; }
  return { current: tmp, longest: best };
}

/* ════════════════════════════ REMOTE SYNC (Flask /api) ════════════════════════════ */
async function apiGet(key) {
  try {
    const r = await fetch(`${API_BASE}/data/${encodeURIComponent(key)}`);
    const d = await r.json();
    return d.value;
  } catch { return null; }
}
async function apiSet(key, value) {
  try {
    await fetch(`${API_BASE}/data/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  } catch (e) { console.error("sync error", e); }
}
async function loadRemote() {
  const [habits, checked, sleep, journal] = await Promise.all([
    apiGet("habits"), apiGet("checked"), apiGet("sleep"), apiGet("journal"),
  ]);
  return { habits, checked, sleep, journal };
}
function saveRemote(habits, checked, sleep, journal) {
  apiSet("habits", habits); apiSet("checked", checked);
  apiSet("sleep", sleep);   apiSet("journal", journal);
}

/* ════════════════════════════ VISUAL ATOMS ════════════════════════════ */
function DonutGauge({ pct, size = 116 }) {
  const stroke = 9, r = (size - stroke) / 2 - 6, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r, dash = circ * (Math.min(pct, 100) / 100);
  const color = pct >= 80 ? "var(--good)" : pct >= 50 ? "var(--mid)" : pct >= 25 ? "var(--cat-social)" : "var(--low)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray .7s cubic-bezier(.2,.7,.3,1), stroke .3s" }} />
      <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--text-hi)" fontSize={21}
        fontWeight={600} fontFamily="var(--ff-disp)" style={{ letterSpacing: "-0.02em" }}>
        {pct.toFixed(0)}<tspan fontSize={11} fill="var(--text-faint)" dx={1}>%</tspan>
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="var(--text-faint)" fontSize={8.5}
        fontFamily="var(--ff-mono)" style={{ letterSpacing: "0.16em" }}>COMPLETE</text>
    </svg>
  );
}

function SleepChart({ days, getSleep, colWidth = 26, wideIndex = -1, wideExtra = 0 }) {
  const vals = days.map(d => parseFloat(getSleep(d)) || 0);
  const max = Math.max(...vals, 9), H = 64;
  const widthAt = i => colWidth + (i === wideIndex ? wideExtra : 0);
  const xStart = i => { let s = 0; for (let k = 0; k < i; k++) s += widthAt(k); return s; };
  const xCenter = i => xStart(i) + widthAt(i) / 2;
  const W = Math.max(xStart(vals.length), 200);
  const y = v => H - 6 - (v / max) * (H - 18);
  const valid = vals.map((v, i) => ({ v, i })).filter(o => o.v > 0);
  const line = valid.map((o, k) => `${k === 0 ? "M" : "L"}${xCenter(o.i)},${y(o.v)}`).join(" ");
  let area = "";
  if (valid.length) {
    area = valid.map((o, k) => `${k === 0 ? "M" : "L"}${xCenter(o.i)},${y(o.v)}`).join(" ")
      + ` L${xCenter(valid[valid.length - 1].i)},${H} L${xCenter(valid[0].i)},${H} Z`;
  }
  const avg = valid.length ? valid.reduce((a, o) => a + o.v, 0) / valid.length : 0;
  return (
    <div className="scroll-x" style={{ width: "100%" }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        <defs>
          <linearGradient id="sleepgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cat-work)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--cat-work)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {avg > 0 && <line x1={0} x2={W} y1={y(avg)} y2={y(avg)} stroke="var(--text-ghost)" strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />}
        {area && <path d={area} fill="url(#sleepgrad)" />}
        {line && <path d={line} fill="none" stroke="var(--cat-work)" strokeWidth={1.6} strokeLinejoin="round" />}
        {valid.map(o => <circle key={o.i} cx={xCenter(o.i)} cy={y(o.v)} r={o.i === wideIndex ? 3.6 : 2.4} fill="var(--cat-work)" />)}
      </svg>
    </div>
  );
}

function StreakBadge({ current, longest }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
      <span title={`${current} day current streak`} style={{
        display: "inline-flex", alignItems: "center", gap: 2,
        background: current > 0 ? "var(--accent-bg)" : "var(--surface-2)",
        border: `1px solid ${current > 0 ? "var(--accent-border)" : "var(--border-soft)"}`,
        borderRadius: 999, padding: "1px 6px", fontSize: 9.5, fontWeight: 600,
        color: current > 0 ? "var(--accent)" : "var(--text-ghost)", fontVariantNumeric: "tabular-nums",
      }}><span style={{ fontSize: 8, opacity: current > 0 ? 1 : 0.4 }}>▲</span>{current}</span>
      <span title={`${longest} day best streak`} style={{
        display: "inline-flex", alignItems: "center", gap: 2,
        background: "var(--surface-2)", border: "1px solid var(--border-soft)",
        borderRadius: 999, padding: "1px 6px", fontSize: 9.5, fontWeight: 600,
        color: "var(--text-dim)", fontVariantNumeric: "tabular-nums",
      }}><span style={{ fontSize: 8, color: "var(--text-faint)" }}>★</span>{longest}</span>
    </span>
  );
}

function CategoryDot({ catId, size = 8 }) {
  const cat = getCat(catId);
  return <span style={{
    display: "inline-block", width: size, height: size, borderRadius: "50%",
    background: cat.color, flexShrink: 0,
    boxShadow: `0 0 0 2px color-mix(in oklch, ${cat.color} 18%, transparent)`,
  }} />;
}

function Bar({ pct, color = "var(--accent)", height = 7, track = "var(--inset)" }) {
  return (
    <div style={{ background: track, borderRadius: 999, height, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 999, transition: "width .5s cubic-bezier(.2,.7,.3,1)" }} />
    </div>
  );
}

/* ════════════════════════════ WEEKLY ════════════════════════════ */
function WeeklyView({ habits, year, month, getChecked }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const weeks = []; let d = 1 - firstDay;
  while (d <= daysInMonth) {
    const wk = [];
    for (let i = 0; i < 7; i++, d++) if (d >= 1 && d <= daysInMonth) wk.push(d);
    if (wk.length) weeks.push(wk);
  }
  return (
    <div className="scroll-x rise">
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
        <colgroup><col style={{ width: 200 }} /><col style={{ width: 64 }} />{weeks.map((_, i) => <col key={i} />)}</colgroup>
        <thead>
          <tr>
            <td style={{ padding: "0 4px 10px", textAlign: "left" }}><span className="eyebrow">Habit</span></td>
            <td style={{ padding: "0 4px 10px", textAlign: "center" }}><span className="eyebrow">Done</span></td>
            {weeks.map((wk, i) => (
              <td key={i} style={{ padding: "0 6px 10px", textAlign: "center" }}>
                <div className="eyebrow" style={{ color: "var(--text-dim)" }}>Week {i + 1}</div>
                <div style={{ fontSize: 9.5, color: "var(--text-ghost)", marginTop: 2 }}>{wk[0]}–{wk[wk.length - 1]}</div>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {habits.map(habit => {
            const cat = getCat(habit.cat);
            const wp = weeks.map(wk => {
              const done = wk.filter(dd => getChecked(habit.name, dd)).length;
              return { done, possible: wk.length, pct: wk.length ? Math.round(done / wk.length * 100) : 0 };
            });
            const total = wp.reduce((a, w) => a + w.done, 0);
            return (
              <tr key={habit.name} style={{ borderTop: "1px solid var(--border-hair)" }}>
                <td style={{ padding: "10px 4px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <CategoryDot catId={habit.cat} /><span style={{ color: "var(--text-hi)", fontSize: 12 }}>{habit.name}</span>
                  </span>
                </td>
                <td style={{ textAlign: "center", color: cat.color, fontWeight: 600, fontSize: 14 }} className="tnum">{total}</td>
                {wp.map((w, i) => (
                  <td key={i} style={{ padding: "8px 10px", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: rampColor(w.pct) }}>{w.pct}%</span>
                        <span className="tnum" style={{ fontSize: 9, color: "var(--text-ghost)" }}>{w.done}/{w.possible}</span>
                      </div>
                      <Bar pct={w.pct} color={cat.color} height={6} />
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
          <tr style={{ borderTop: "2px solid var(--border)" }}>
            <td style={{ padding: "12px 4px", color: "var(--text-dim)", fontStyle: "italic" }}>All habits avg</td><td></td>
            {weeks.map((wk, i) => {
              const td = habits.reduce((a, h) => a + wk.filter(dd => getChecked(h.name, dd)).length, 0);
              const tp = habits.length * wk.length;
              const pct = tp ? Math.round(td / tp * 100) : 0;
              return (
                <td key={i} style={{ textAlign: "center", padding: "12px 6px" }}>
                  <div className="tnum disp" style={{ fontSize: 18, fontWeight: 600, color: rampColor(pct), letterSpacing: "-0.02em" }}>{pct}%</div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ════════════════════════════ HEATMAP ════════════════════════════ */
function HeatmapView({ habits, year, month, getChecked }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div className="rise" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(192px, 1fr))", gap: 12 }}>
      {habits.map(habit => {
        const cat = getCat(habit.cat);
        const done = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(d => getChecked(habit.name, d)).length;
        const pct = Math.round(done / daysInMonth * 100);
        return (
          <div key={habit.name} className="card" style={{ borderColor: "var(--border-soft)", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <CategoryDot catId={habit.cat} />
              <div style={{ fontSize: 11.5, color: "var(--text-hi)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{habit.name}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 10 }}>
              {DAYS_LABEL.map(dl => <div key={dl} style={{ textAlign: "center", fontSize: 7.5, color: "var(--text-ghost)", letterSpacing: "0.05em" }}>{dl}</div>)}
              {cells.map((d, i) => {
                if (!d) return <div key={`e${i}`} />;
                const on = getChecked(habit.name, d);
                return <div key={d} title={`Day ${d}${on ? " ✓" : ""}`} style={{
                  width: "100%", paddingBottom: "100%", borderRadius: 3,
                  background: on ? cat.color : "var(--inset)",
                  border: `1px solid ${on ? "transparent" : "var(--border-hair)"}`,
                  boxShadow: on ? `0 0 0 1px color-mix(in oklch, ${cat.color} 30%, transparent)` : "none",
                }} />;
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "var(--text-faint)" }}>
              <span className="tnum">{done}/{daysInMonth} days</span>
              <span className="tnum" style={{ color: cat.color, fontWeight: 600, fontSize: 12 }}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════ JOURNAL ════════════════════════════ */
function JournalView({ year, month, journal, getChecked, habits, getSleep, setEntry }) {
  const now = new Date();
  const daysInMonth = getDaysInMonth(year, month);
  const isThisMonth = now.getFullYear() === year && now.getMonth() === month;
  const [selDay, setSelDay] = useState(() => isThisMonth ? now.getDate() : 1);
  const mk = `${year}-${month}`;
  const entry = journal[`${mk}-${selDay}`] || { mood: null, text: "" };
  const isToday = d => isThisMonth && now.getDate() === d;
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const completedOnDay = d => habits.filter(h => getChecked(h.name, d)).length;
  const score = habits.length ? Math.round(completedOnDay(selDay) / habits.length * 100) : 0;
  return (
    <div className="rise" style={{ display: "grid", gridTemplateColumns: "minmax(248px, 320px) 1fr", gap: 22, alignItems: "start" }}>
      <div className="card" style={{ padding: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{MONTHS[month]} {year}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {DAYS_LABEL.map(dl => <div key={dl} style={{ textAlign: "center", fontSize: 9, color: "var(--text-ghost)", paddingBottom: 2 }}>{dl}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const je = journal[`${mk}-${d}`];
            const mood = je && je.mood != null ? MOODS[je.mood] : null;
            const sel = d === selDay, today = isToday(d), cnt = completedOnDay(d);
            return (
              <button key={d} onClick={() => setSelDay(d)} style={{
                aspectRatio: "1", borderRadius: 8, cursor: "pointer", padding: "4px 0 3px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                background: sel ? "var(--accent-bg)" : today ? "var(--today-tint)" : "var(--inset)",
                border: `1px solid ${sel ? "var(--accent)" : today ? "var(--today-line)" : "var(--border-hair)"}`,
                transition: "all .14s", fontFamily: "var(--ff-mono)",
              }}>
                <span className="tnum" style={{ fontSize: 9.5, color: sel || today ? "var(--accent)" : "var(--text-dim)", fontWeight: today || sel ? 700 : 400 }}>{d}</span>
                <span style={{ fontSize: 13, lineHeight: 1, height: 14 }}>{mood ? mood.e : ""}</span>
                <span style={{ display: "flex", gap: 1, height: 4 }}>
                  {cnt > 0 && Array.from({ length: Math.min(cnt, 5) }).map((_, k) =>
                    <span key={k} style={{ width: 3, height: 3, borderRadius: "50%", background: "color-mix(in oklch, var(--accent) 60%, transparent)" }} />)}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 9, color: "var(--text-ghost)", marginTop: 10, display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--accent)" }} /> dots = habits completed
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
          <span className="disp" style={{ fontSize: 24, color: "var(--text-hi)", fontWeight: 600, letterSpacing: "-0.02em" }}>{MONTHS[month]} {selDay}</span>
          {isToday(selDay) && <span className="pill" style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent)", cursor: "default" }}>today</span>}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          {[
            { l: "Sleep", v: `${getSleep(selDay) || "—"}h`, c: "var(--cat-work)" },
            { l: "Habits", v: `${completedOnDay(selDay)}/${habits.length}`, c: "var(--accent)" },
            { l: "Score", v: `${score}%`, c: rampColor(score) },
          ].map(s => (
            <div key={s.l} className="card" style={{ padding: "10px 16px", minWidth: 92 }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>{s.l}</div>
              <div className="tnum disp" style={{ fontSize: 20, fontWeight: 600, color: s.c, letterSpacing: "-0.02em" }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>How was your day</div>
          <div style={{ display: "flex", gap: 8 }}>
            {MOODS.map((m, i) => {
              const on = entry.mood === i;
              return (
                <button key={i} onClick={() => setEntry(year, month, selDay, { mood: on ? null : i })} style={{
                  background: on ? `color-mix(in oklch, ${m.c} 18%, var(--surface))` : "var(--surface)",
                  border: `1px solid ${on ? m.c : "var(--border-soft)"}`, borderRadius: 10,
                  padding: "8px 12px", cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4, transition: "all .14s", flex: 1, maxWidth: 78,
                }}>
                  <span style={{ fontSize: 22, lineHeight: 1, filter: on ? "none" : "saturate(0.6) opacity(0.7)" }}>{m.e}</span>
                  <span style={{ fontSize: 9, color: on ? m.c : "var(--text-faint)" }}>{m.l}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Habits completed</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {habits.map(h => {
              const done = getChecked(h.name, selDay); const cat = getCat(h.cat);
              return <span key={h.name} style={{
                fontSize: 10, padding: "3px 9px", borderRadius: 999,
                background: done ? cat.bg : "var(--inset)",
                border: `1px solid ${done ? cat.border : "var(--border-hair)"}`,
                color: done ? cat.color : "var(--text-ghost)",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}>{done && <span style={{ fontSize: 8 }}>✓</span>}{h.name}</span>;
            })}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Journal entry</div>
          <textarea className="field" value={entry.text}
            onChange={e => setEntry(year, month, selDay, { text: e.target.value })}
            placeholder={`Write about ${MONTHS[month]} ${selDay}…`}
            style={{ width: "100%", minHeight: 150, fontSize: 13 }} />
          <div style={{ fontSize: 9, color: "var(--text-ghost)", marginTop: 4, textAlign: "right" }} className="tnum">{entry.text.length} chars</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════ APP ════════════════════════════ */
const thBase = { padding: "6px 4px 8px", verticalAlign: "bottom", background: "var(--surface)" };

export default function HabitDashboard() {
  const now = new Date();
  useInjectedStyles();

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("dash-theme") || "dark"; } catch { return "dark"; }
  });

  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [habits, setHabits]   = useState(DEFAULT_HABITS);
  const [checked, setChecked] = useState({});
  const [sleep, setSleep]     = useState({});
  const [journal, setJournal] = useState({});

  const [tab, setTab]                 = useState("monthly");
  const [filterCat, setFilterCat]     = useState("all");
  const [newHabit, setNewHabit]       = useState("");
  const [newHabitCat, setNewHabitCat] = useState("health");
  const [editingHabit, setEditingHabit] = useState(null);
  const [editVal, setEditVal]         = useState("");
  const [editCat, setEditCat]         = useState("health");
  const [syncing, setSyncing]         = useState(true);

  const monthKey = `${year}-${month}`;
  const daysInMonth = getDaysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  /* ----- density tokens ----- */
  const COL = DENSITY === "compact" ? 24 : 29;
  const TODAY_COL = COL + 22;     // present-day column reads wider
  const ROWH = DENSITY === "compact" ? 26 : 32;
  const HX = DENSITY === "compact" ? 15 : 17;
  const HX_TODAY = HX + 7;        // present-day checkbox is larger

  /* ----- accent ----- */
  useEffect(() => { document.documentElement.style.setProperty("--accent", ACCENT); }, []);

  /* ----- theme persistence ----- */
  useEffect(() => { try { localStorage.setItem("dash-theme", theme); } catch {} }, [theme]);

  /* ----- remote load + 30s poll ----- */
  const loaded = useRef(false);
  useEffect(() => {
    const apply = (s) => {
      if (!s) return;
      if (s.habits) setHabits(s.habits.map(h => typeof h === "string" ? { name: h, cat: "none" } : h));
      if (s.checked) setChecked(s.checked);
      if (s.sleep)   setSleep(s.sleep);
      if (s.journal) setJournal(s.journal);
    };
    setSyncing(true);
    loadRemote().then(s => { apply(s); loaded.current = true; setSyncing(false); })
      .catch(() => { loaded.current = true; setSyncing(false); });
    const id = setInterval(() => { loadRemote().then(apply); }, 30000);
    return () => clearInterval(id);
  }, []);

  /* ----- persist on change (after first load) ----- */
  useEffect(() => {
    if (!loaded.current) return;
    saveRemote(habits, checked, sleep, journal);
  }, [habits, checked, sleep, journal]);

  /* ----- accessors ----- */
  const getChecked = (habitName, day) => !!checked[`${monthKey}-${habitName}-${day}`];
  const getSleep   = (day) => sleep[`${monthKey}-sleep-${day}`] ?? "";
  const isToday    = (d) => now.getFullYear() === year && now.getMonth() === month && now.getDate() === d;

  /* ----- mutations ----- */
  const toggle = (habitName, day) => setChecked(c => ({ ...c, [`${monthKey}-${habitName}-${day}`]: !c[`${monthKey}-${habitName}-${day}`] }));
  const setSleepVal = (day, val) => setSleep(s => ({ ...s, [`${monthKey}-sleep-${day}`]: val }));
  const addHabit = () => { if (!newHabit.trim()) return; setHabits(h => [...h, { name: newHabit.trim(), cat: newHabitCat }]); setNewHabit(""); };
  const removeHabit = (name) => setHabits(h => h.filter(x => x.name !== name));
  const saveEdit = (origName) => { setHabits(h => h.map(x => x.name === origName ? { name: editVal.trim() || x.name, cat: editCat } : x)); setEditingHabit(null); };
  const setEntry = (y, m, day, patch) => setJournal(j => ({ ...j, [`${y}-${m}-${day}`]: { mood: null, text: "", ...j[`${y}-${m}-${day}`], ...patch } }));

  /* ----- derived ----- */
  const filteredHabits = filterCat === "all" ? habits : habits.filter(h => h.cat === filterCat);
  const completedOnDay = (d) => habits.filter(h => getChecked(h.name, d)).length;
  const totalCompleted = habits.reduce((a, h) => a + days.filter(d => getChecked(h.name, d)).length, 0);
  const totalPossible  = habits.length * daysInMonth;
  const progressPct    = totalPossible ? parseFloat((totalCompleted / totalPossible * 100).toFixed(1)) : 0;
  const maxDaily       = Math.max(...days.map(d => completedOnDay(d)), 1);
  const habitProgress  = (h) => { const done = days.filter(d => getChecked(h.name, d)).length; return { done, pct: daysInMonth ? done / daysInMonth * 100 : 0 }; };
  const bestStreak = habits.reduce((mx, h) => Math.max(mx, calcStreaks(h.name, daysInMonth, getChecked).current), 0);
  const avgSleep = (() => { const v = days.map(d => parseFloat(getSleep(d)) || 0).filter(x => x > 0); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "0"; })();
  const catStats = CATEGORIES.filter(c => c.id !== "none").map(cat => {
    const ch = habits.filter(h => h.cat === cat.id);
    if (!ch.length) return null;
    const done = ch.reduce((a, h) => a + days.filter(d => getChecked(h.name, d)).length, 0);
    const possible = ch.length * daysInMonth;
    return { ...cat, done, possible, pct: possible ? Math.round(done / possible * 100) : 0, count: ch.length };
  }).filter(Boolean);

  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1);

  const tableRef = useRef(null);
  const setDayHi = (d) => {
    const tbl = tableRef.current; if (!tbl) return;
    tbl.querySelectorAll("td.dayhi").forEach(el => el.classList.remove("dayhi"));
    if (d == null) return;
    tbl.querySelectorAll(`td[data-day="${d}"]`).forEach(el => el.classList.add("dayhi"));
  };

  const TABS = [{ id: "monthly", label: "Monthly" }, { id: "weekly", label: "Weekly" }, { id: "heatmap", label: "Heatmap" }, { id: "journal", label: "Journal" }];
  const KPIS = [
    { l: "Progress", v: `${progressPct}%`, c: rampColor(progressPct) },
    { l: "Completed", v: totalCompleted, c: "var(--text-hi)" },
    { l: "Best streak", v: `${bestStreak}d`, c: "var(--accent)" },
    { l: "Avg sleep", v: `${avgSleep}h`, c: "var(--cat-work)" },
  ];

  return (
    <div className="dash-root" data-theme={theme}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "26px 26px 60px" }}>

        {/* HEADER */}
        <header style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-icon" onClick={prevMonth} aria-label="Previous month">‹</button>
            <div>
              <div className="eyebrow" style={{ marginBottom: 1 }}>Tracking{syncing && <span style={{ color: "var(--text-ghost)", marginLeft: 6 }}>· syncing…</span>}</div>
              <div className="disp" style={{ fontSize: 26, fontWeight: 600, color: "var(--text-hi)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {MONTHS[month]} <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>{year}</span>
              </div>
            </div>
            <button className="btn btn-icon" onClick={nextMonth} aria-label="Next month">›</button>
            <button className="btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-label="Toggle theme" style={{ fontSize: 11 }}>
              {theme === "dark" ? "☀ Light" : "☾ Dark"}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginLeft: "auto", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 26 }}>
              {KPIS.map(k => (
                <div key={k.l}>
                  <div className="eyebrow" style={{ marginBottom: 3 }}>{k.l}</div>
                  <div className="tnum disp" style={{ fontSize: 21, fontWeight: 600, color: k.c, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.v}</div>
                </div>
              ))}
            </div>
            <DonutGauge pct={progressPct} />
          </div>
        </header>

        {/* CATEGORY BAR */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
          {catStats.map(cat => {
            const on = filterCat === cat.id;
            return (
              <button key={cat.id} onClick={() => setFilterCat(on ? "all" : cat.id)} style={{
                display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
                background: on ? cat.bg : "var(--surface)",
                border: `1px solid ${on ? cat.border : "var(--border-soft)"}`,
                borderRadius: 10, padding: "8px 13px", transition: "all .15s", fontFamily: "var(--ff-mono)",
              }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                <span style={{ color: on ? cat.color : "var(--text)", fontSize: 11.5 }}>{cat.label}</span>
                <span className="tnum" style={{ color: on ? cat.color : "var(--text-faint)", fontSize: 9, opacity: 0.8 }}>{cat.count}</span>
                <span style={{ width: 1, height: 14, background: "var(--border)" }} />
                <span className="tnum disp" style={{ color: on ? cat.color : "var(--text-hi)", fontSize: 14, fontWeight: 600 }}>{cat.pct}%</span>
                <div style={{ width: 38 }}><Bar pct={cat.pct} color={cat.color} height={5} /></div>
              </button>
            );
          })}
          {filterCat !== "all" && <button className="pill" onClick={() => setFilterCat("all")} style={{ color: "var(--text-faint)" }}>✕ clear filter</button>}
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 22, marginBottom: 20, borderBottom: "1px solid var(--border-soft)" }}>
          {TABS.map(tb => (
            <button key={tb.id} className={`tab ${tab === tb.id ? "active" : ""}`} onClick={() => setTab(tb.id)}>
              {tb.label}<span className="tab-ink" />
            </button>
          ))}
        </div>

        {/* VIEWS */}
        {tab === "weekly" && <WeeklyView habits={filteredHabits} year={year} month={month} getChecked={getChecked} />}
        {tab === "heatmap" && <HeatmapView habits={filteredHabits} year={year} month={month} getChecked={getChecked} />}
        {tab === "journal" && <JournalView year={year} month={month} journal={journal} getChecked={getChecked} habits={habits} getSleep={getSleep} setEntry={setEntry} />}

        {tab === "monthly" && (
          <div className="rise" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 208px", gap: 18, alignItems: "start" }}>
            <div className="card scroll-x" style={{ padding: "4px 4px 8px" }}>
              <table ref={tableRef} className="gridtable tnum" style={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                  <col style={{ width: 188 }} /><col style={{ width: 70 }} />
                  {days.map(d => <col key={d} style={{ width: isToday(d) ? TODAY_COL : COL }} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky-c0" style={{ ...thBase, left: 0, textAlign: "left", paddingLeft: 12 }}><span className="eyebrow">Habit</span></th>
                    <th className="sticky-c1" style={{ ...thBase, left: 188, textAlign: "center" }}><span className="eyebrow">Streak</span></th>
                    {days.map(d => {
                      const dow = new Date(year, month, d).getDay();
                      const today = isToday(d);
                      const je = journal[`${monthKey}-${d}`];
                      const mood = je && je.mood != null ? MOODS[je.mood] : null;
                      const weekend = dow === 0 || dow === 6;
                      return (
                        <th key={d} data-day={d} style={{
                          ...thBase, textAlign: "center", padding: today ? "4px 0 7px" : "5px 0 6px",
                          background: today ? "var(--today-tint)" : "transparent",
                          borderLeft: today ? "1.5px solid var(--accent)" : "1px solid transparent",
                          borderRight: today ? "1.5px solid var(--accent)" : "1px solid transparent",
                          borderTopLeftRadius: today ? 7 : 0, borderTopRightRadius: today ? 7 : 0,
                          borderTop: today ? "1.5px solid var(--accent)" : undefined,
                        }}>
                          <div style={{ fontSize: today ? 13 : 10, height: today ? 16 : 13, lineHeight: today ? "16px" : "13px" }}>{mood ? mood.e : ""}</div>
                          <div style={{ fontSize: 9, letterSpacing: today ? "0.12em" : 0, color: today ? "var(--accent)" : weekend ? "var(--text-faint)" : "var(--text-ghost)" }}>{today ? "TODAY" : DAYS_LABEL[dow]}</div>
                          <div className="disp" style={{ fontSize: today ? 17 : 9.5, fontWeight: today ? 700 : 500, lineHeight: today ? 1.05 : 1, marginTop: today ? 1 : 0, letterSpacing: today ? "-0.02em" : 0, color: today ? "var(--accent)" : weekend ? "var(--text-faint)" : "var(--text-dim)" }}>{d}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map(cat => {
                    const catHabits = filteredHabits.filter(h => h.cat === cat.id);
                    if (!catHabits.length) return null;
                    return (
                      <React.Fragment key={cat.id}>
                        {cat.id !== "none" && (
                          <tr>
                            <td className="sticky-c0" colSpan={2} style={{ left: 0, padding: "10px 12px 5px", borderBottom: `1px solid ${cat.border}` }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: cat.color }} />
                                <span className="eyebrow" style={{ color: cat.color }}>{cat.label}</span>
                              </span>
                            </td>
                            <td colSpan={daysInMonth} style={{ borderBottom: `1px solid var(--border-hair)` }} />
                          </tr>
                        )}
                        {catHabits.map(habit => {
                          const { current, longest } = calcStreaks(habit.name, daysInMonth, getChecked);
                          const cat2 = getCat(habit.cat);
                          const editing = editingHabit === habit.name;
                          return (
                            <tr key={habit.name} style={{ height: ROWH }}>
                              <td className="sticky-c0" style={{ left: 0, padding: "0 8px", borderBottom: "1px solid var(--border-hair)", borderLeft: `2px solid color-mix(in oklch, ${cat2.color} 40%, transparent)` }}>
                                {editing ? (
                                  <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                    <input className="field" value={editVal} autoFocus onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit(habit.name)} style={{ width: 88, padding: "3px 6px", fontSize: 11 }} />
                                    <select className="field" value={editCat} onChange={e => setEditCat(e.target.value)} style={{ padding: "3px 4px", fontSize: 10 }}>
                                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                    <button className="icbtn" style={{ color: "var(--accent)" }} onClick={() => saveEdit(habit.name)}>✓</button>
                                  </span>
                                ) : (
                                  <span className="habrow" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <CategoryDot catId={habit.cat} size={7} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-hi)", flex: 1, fontSize: 11.5 }}>{habit.name}</span>
                                    <span className="rowtools" style={{ display: "inline-flex", gap: 2 }}>
                                      <button className="icbtn" onClick={() => { setEditingHabit(habit.name); setEditVal(habit.name); setEditCat(habit.cat); }}>✎</button>
                                      <button className="icbtn danger" onClick={() => removeHabit(habit.name)}>✕</button>
                                    </span>
                                  </span>
                                )}
                              </td>
                              <td className="sticky-c1" style={{ left: 188, textAlign: "center", padding: "0 4px", borderBottom: "1px solid var(--border-hair)" }}>
                                <StreakBadge current={current} longest={longest} />
                              </td>
                              {days.map(d => {
                                const done = getChecked(habit.name, d);
                                const today = isToday(d);
                                return (
                                  <td key={d} data-day={d} onMouseEnter={() => setDayHi(d)} onMouseLeave={() => setDayHi(null)}
                                    style={{ textAlign: "center", padding: 0, borderBottom: "1px solid var(--border-hair)", background: today ? "var(--today-tint)" : "transparent", borderLeft: today ? "1.5px solid var(--accent)" : "none", borderRight: today ? "1.5px solid var(--accent)" : "none" }}>
                                    <div className={`hx ${done ? "on" : ""}`} onClick={() => toggle(habit.name, d)} style={{ "--hx-color": cat2.color, width: today ? HX_TODAY : HX, height: today ? HX_TODAY : HX, borderRadius: today ? 6 : 5 }}>
                                      <span className="ck" style={{ fontSize: today ? 13 : 10 }}>✓</span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* SLEEP */}
                  <tr style={{ height: 8 }}><td colSpan={2 + daysInMonth} /></tr>
                  <tr>
                    <td className="sticky-c0" style={{ left: 0, padding: "8px 12px 2px", verticalAlign: "bottom" }}><span className="eyebrow" style={{ color: "var(--cat-work)" }}>Sleep · hrs</span></td>
                    <td className="sticky-c1" style={{ left: 188, textAlign: "center", fontSize: 9, color: "var(--text-faint)", verticalAlign: "bottom", padding: "0 0 2px" }}>avg {avgSleep}</td>
                    <td colSpan={daysInMonth} style={{ padding: "2px 0 0" }}>
                      <SleepChart days={days} getSleep={getSleep} colWidth={COL} wideIndex={days.findIndex(d => isToday(d))} wideExtra={TODAY_COL - COL} />
                    </td>
                  </tr>
                  <tr>
                    <td className="sticky-c0" style={{ left: 0 }} /><td className="sticky-c1" style={{ left: 188 }} />
                    {days.map(d => { const today = isToday(d); return (
                      <td key={d} data-day={d} style={{ padding: "0 1px 2px", textAlign: "center", background: today ? "var(--today-tint)" : "transparent", borderLeft: today ? "1.5px solid var(--accent)" : "none", borderRight: today ? "1.5px solid var(--accent)" : "none" }}>
                        <input type="number" min="0" max="14" step="0.5" value={getSleep(d)} onChange={e => setSleepVal(d, e.target.value)}
                          style={{ width: (today ? TODAY_COL : COL) - 6, background: "var(--inset)", border: `1px solid ${today ? "var(--accent-border)" : "var(--border-hair)"}`, color: "var(--cat-work)", fontSize: today ? 10 : 8.5, fontWeight: today ? 600 : 400, textAlign: "center", borderRadius: 4, padding: "2px 0", fontFamily: "var(--ff-mono)", outline: "none" }} />
                      </td>
                    ); })}
                  </tr>

                  {/* HABITS / DAY */}
                  <tr style={{ height: 10 }}><td colSpan={2 + daysInMonth} /></tr>
                  <tr>
                    <td className="sticky-c0" style={{ left: 0, padding: "0 12px", verticalAlign: "bottom" }}><span className="eyebrow">Habits / day</span></td>
                    <td className="sticky-c1" style={{ left: 188 }} />
                    {days.map(d => {
                      const cnt = completedOnDay(d);
                      const h = maxDaily ? Math.round(cnt / maxDaily * 40) : 0;
                      const today = isToday(d);
                      return (
                        <td key={d} data-day={d} style={{ textAlign: "center", verticalAlign: "bottom", padding: "0 2px", background: today ? "var(--today-tint)" : "transparent", borderLeft: today ? "1.5px solid var(--accent)" : "none", borderRight: today ? "1.5px solid var(--accent)" : "none" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: 52, justifyContent: "flex-end" }}>
                            {cnt > 0 && <div style={{ fontSize: today ? 9.5 : 7.5, fontWeight: today ? 700 : 400, color: today ? "var(--accent)" : "var(--text-faint)", marginBottom: 2 }}>{cnt}</div>}
                            <div style={{ width: (today ? TODAY_COL : COL) - 12, height: h, minHeight: cnt > 0 ? 2 : 0, background: "var(--accent)", borderRadius: "3px 3px 0 0", transition: "height .4s", boxShadow: today ? "0 0 8px color-mix(in oklch, var(--accent) 50%, transparent)" : "none" }} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* DAILY SCORE */}
                  <tr>
                    <td className="sticky-c0" style={{ left: 0, padding: "8px 12px 0", verticalAlign: "bottom" }}><span className="eyebrow">Daily score</span></td>
                    <td className="sticky-c1" style={{ left: 188 }} />
                    {days.map(d => {
                      const pct = habits.length ? completedOnDay(d) / habits.length * 100 : 0;
                      const today = isToday(d);
                      return (
                        <td key={d} data-day={d} style={{ textAlign: "center", verticalAlign: "bottom", padding: "0 2px 4px", background: today ? "var(--today-tint)" : "transparent", borderLeft: today ? "1.5px solid var(--accent)" : "none", borderRight: today ? "1.5px solid var(--accent)" : "none", borderBottomLeftRadius: today ? 7 : 0, borderBottomRightRadius: today ? 7 : 0, borderBottom: today ? "1.5px solid var(--accent)" : "none" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: 48, justifyContent: "flex-end" }}>
                            <div style={{ width: (today ? TODAY_COL : COL) - 12, height: Math.round(pct * 0.44), minHeight: pct > 0 ? 2 : 0, background: rampColor(pct), borderRadius: "3px 3px 0 0", transition: "height .4s" }} />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RIGHT PANEL */}
            <aside className="card" style={{ padding: "14px 14px 16px", position: "sticky", top: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Each habit · this month</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {filteredHabits.map(h => {
                  const { done, pct } = habitProgress(h);
                  const cat = getCat(h.cat);
                  return (
                    <div key={h.name}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <CategoryDot catId={h.cat} size={6} />
                        <span style={{ flex: 1, fontSize: 10.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                        <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: cat.color }}>{done}</span>
                      </div>
                      <Bar pct={pct} color={cat.color} height={6} />
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* ADD HABIT */}
        {tab !== "journal" && (
          <div style={{ display: "flex", gap: 8, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
            <input className="field" value={newHabit} onChange={e => setNewHabit(e.target.value)} onKeyDown={e => e.key === "Enter" && addHabit()} placeholder="New habit…" style={{ width: 200 }} />
            <select className="field" value={newHabitCat} onChange={e => setNewHabitCat(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <button className="btn btn-accent" onClick={addHabit}>+ Add habit</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════ STYLES ════════════════════════════ */
function useInjectedStyles() {
  useEffect(() => {
    if (document.getElementById("habit-dash-styles")) return;
    const el = document.createElement("style");
    el.id = "habit-dash-styles";
    el.textContent = STYLE_CSS;
    document.head.appendChild(el);
  }, []);
}

const STYLE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

:root {
  --bg: oklch(0.175 0.012 256); --bg-grad: oklch(0.205 0.014 256);
  --surface: oklch(0.214 0.014 256); --surface-2: oklch(0.246 0.015 256); --surface-3: oklch(0.285 0.016 256);
  --inset: oklch(0.158 0.012 256);
  --border: oklch(0.305 0.016 256); --border-soft: oklch(0.262 0.014 256); --border-hair: oklch(0.232 0.013 256);
  --text-hi: oklch(0.965 0.004 256); --text: oklch(0.80 0.010 256); --text-dim: oklch(0.625 0.012 256);
  --text-faint: oklch(0.482 0.013 256); --text-ghost: oklch(0.372 0.013 256);
  --cat-health: oklch(0.76 0.15 152); --cat-health-bg: oklch(0.30 0.055 152); --cat-health-border: oklch(0.42 0.075 152);
  --cat-work: oklch(0.72 0.13 244); --cat-work-bg: oklch(0.30 0.055 244); --cat-work-border: oklch(0.42 0.075 244);
  --cat-mind: oklch(0.71 0.15 306); --cat-mind-bg: oklch(0.30 0.060 306); --cat-mind-border: oklch(0.42 0.080 306);
  --cat-social: oklch(0.79 0.135 68); --cat-social-bg: oklch(0.31 0.055 68); --cat-social-border: oklch(0.44 0.075 68);
  --cat-none: oklch(0.60 0.012 256); --cat-none-bg: oklch(0.246 0.012 256); --cat-none-border: oklch(0.315 0.013 256);
  --good: oklch(0.76 0.15 152); --mid: oklch(0.82 0.135 92); --low: oklch(0.68 0.16 33);
  --accent: var(--cat-health);
  --accent-bg: color-mix(in oklch, var(--accent) 22%, var(--surface));
  --accent-border: color-mix(in oklch, var(--accent) 46%, var(--surface));
  --today-tint: color-mix(in oklch, var(--accent) 12%, transparent);
  --today-line: color-mix(in oklch, var(--accent) 42%, transparent);
  --radius: 10px; --radius-sm: 6px; --radius-xs: 4px;
  --shadow-sm: 0 1px 2px oklch(0 0 0 / 0.3);
  --ff-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --ff-disp: "Space Grotesk", system-ui, sans-serif;
}
[data-theme="light"] {
  --bg: oklch(0.965 0.006 90); --bg-grad: oklch(0.985 0.005 90);
  --surface: oklch(0.995 0.004 90); --surface-2: oklch(0.945 0.007 90); --surface-3: oklch(0.915 0.009 90);
  --inset: oklch(0.935 0.007 90);
  --border: oklch(0.855 0.010 90); --border-soft: oklch(0.895 0.008 90); --border-hair: oklch(0.920 0.007 90);
  --text-hi: oklch(0.255 0.012 264); --text: oklch(0.355 0.012 264); --text-dim: oklch(0.515 0.012 264);
  --text-faint: oklch(0.625 0.011 264); --text-ghost: oklch(0.745 0.010 264);
  --cat-health: oklch(0.58 0.15 152); --cat-health-bg: oklch(0.93 0.045 152); --cat-health-border: oklch(0.82 0.075 152);
  --cat-work: oklch(0.55 0.15 250); --cat-work-bg: oklch(0.93 0.045 250); --cat-work-border: oklch(0.82 0.075 250);
  --cat-mind: oklch(0.55 0.17 306); --cat-mind-bg: oklch(0.94 0.045 306); --cat-mind-border: oklch(0.83 0.075 306);
  --cat-social: oklch(0.62 0.15 60); --cat-social-bg: oklch(0.94 0.050 70); --cat-social-border: oklch(0.84 0.080 70);
  --cat-none: oklch(0.60 0.010 264); --cat-none-bg: oklch(0.945 0.006 90); --cat-none-border: oklch(0.875 0.008 90);
  --good: oklch(0.58 0.15 152); --mid: oklch(0.66 0.14 80); --low: oklch(0.60 0.17 33);
  --shadow-sm: 0 1px 2px oklch(0 0 0 / 0.06);
}
.dash-root * { box-sizing: border-box; }
.dash-root {
  min-height: 100vh;
  background: radial-gradient(120% 80% at 50% -10%, var(--bg-grad), transparent 60%), var(--bg);
  color: var(--text); font-family: var(--ff-mono); font-size: 12px;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
.dash-root ::selection { background: color-mix(in oklch, var(--accent) 35%, transparent); }
.dash-root ::-webkit-scrollbar { height: 9px; width: 9px; }
.dash-root ::-webkit-scrollbar-track { background: transparent; }
.dash-root ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
.dash-root ::-webkit-scrollbar-thumb:hover { background: var(--surface-3); background-clip: padding-box; }
.dash-root .disp { font-family: var(--ff-disp); letter-spacing: -0.01em; }
.dash-root .tnum { font-variant-numeric: tabular-nums; }
.dash-root .card { background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius); box-shadow: var(--shadow-sm); }
.dash-root .eyebrow { font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-faint); font-weight: 600; }
.dash-root .btn { font-family: var(--ff-mono); font-size: 12px; color: var(--text); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 5px 11px; cursor: pointer; transition: background .15s, border-color .15s, color .15s, transform .05s; display: inline-flex; align-items: center; gap: 6px; }
.dash-root .btn:hover { background: var(--surface-3); border-color: var(--text-ghost); color: var(--text-hi); }
.dash-root .btn:active { transform: translateY(1px); }
.dash-root .btn-icon { padding: 5px 9px; font-size: 14px; line-height: 1; }
.dash-root .btn-accent { background: var(--accent-bg); border-color: var(--accent-border); color: var(--accent); }
.dash-root .btn-accent:hover { color: var(--accent); border-color: var(--accent); background: color-mix(in oklch, var(--accent) 18%, var(--surface)); }
.dash-root .icbtn { background: none; border: none; cursor: pointer; color: var(--text-ghost); font-size: 11px; line-height: 1; padding: 2px; border-radius: var(--radius-xs); transition: color .12s, background .12s; font-family: var(--ff-mono); }
.dash-root .icbtn:hover { color: var(--text-hi); background: var(--surface-2); }
.dash-root .icbtn.danger:hover { color: var(--low); }
.dash-root .pill { font-family: var(--ff-mono); font-size: 10.5px; border-radius: 999px; padding: 3px 10px; cursor: pointer; border: 1px solid var(--border-soft); background: var(--surface); color: var(--text-dim); display: inline-flex; align-items: center; gap: 6px; transition: background .14s, border-color .14s, color .14s; white-space: nowrap; }
.dash-root .pill:hover { color: var(--text); border-color: var(--text-ghost); }
.dash-root .field { font-family: var(--ff-mono); font-size: 12px; color: var(--text-hi); background: var(--inset); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 10px; outline: none; transition: border-color .15s, box-shadow .15s; }
.dash-root .field:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 16%, transparent); }
.dash-root .field::placeholder { color: var(--text-ghost); }
.dash-root select.field { cursor: pointer; }
.dash-root textarea.field { resize: vertical; line-height: 1.65; }
.dash-root .tab { background: none; border: none; cursor: pointer; font-family: var(--ff-mono); font-size: 12px; color: var(--text-faint); padding: 9px 4px; position: relative; letter-spacing: 0.02em; transition: color .15s; }
.dash-root .tab:hover { color: var(--text); }
.dash-root .tab.active { color: var(--text-hi); }
.dash-root .tab .tab-ink { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--accent); border-radius: 2px 2px 0 0; transform: scaleX(0); transition: transform .22s cubic-bezier(.4,0,.2,1); }
.dash-root .tab.active .tab-ink { transform: scaleX(1); }
.dash-root .hx { width: 17px; height: 17px; margin: 0 auto; border: 1px solid var(--border); border-radius: 5px; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--bg); font-size: 10px; user-select: none; transition: background .16s cubic-bezier(.34,1.56,.64,1), border-color .14s, transform .08s; }
.dash-root .hx:hover { border-color: var(--hx-color, var(--text-ghost)); }
.dash-root .hx.on { background: var(--hx-color, var(--accent)); border-color: var(--hx-color, var(--accent)); }
.dash-root .hx .ck { transform: scale(0); transition: transform .18s cubic-bezier(.34,1.56,.64,1); font-weight: 700; }
.dash-root .hx.on .ck { transform: scale(1); }
.dash-root .hx:active { transform: scale(0.86); }
.dash-root .gridtable td.dayhi { background: var(--today-tint) !important; }
@keyframes habit-rise { from { transform: translateY(7px); } to { transform: none; } }
.dash-root .rise { animation: habit-rise .4s cubic-bezier(.2,.7,.3,1) both; }
.dash-root .scroll-x { overflow-x: auto; overflow-y: hidden; }
.dash-root .gridtable { border-collapse: separate; border-spacing: 0; }
.dash-root .sticky-c0 { position: sticky; left: 0; z-index: 3; background: var(--surface); }
.dash-root .sticky-c1 { position: sticky; z-index: 3; background: var(--surface); }
.dash-root .rowtools { opacity: 0; transition: opacity .12s; }
.dash-root .habrow:hover .rowtools { opacity: 1; }
.dash-root tr:hover .habrow .rowtools { opacity: 1; }
@media (hover: none) { .dash-root .rowtools { opacity: 0.55; } }
`;

/* ---- self-mount when used as an entry file (matches the original) ---- */
const __el = typeof document !== "undefined" && document.getElementById("root");
if (__el) createRoot(__el).render(<HabitDashboard />);
