import { useState, useEffect, useCallback } from "react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_LABEL = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const getDaysInMonth = (y,m) => new Date(y,m+1,0).getDate();
const getFirstDayOfMonth = (y,m) => new Date(y,m,1).getDay();
const MOODS = [{e:"😞",l:"Rough",c:"#ef5350"},{e:"😐",l:"Meh",c:"#ffc107"},{e:"🙂",l:"Okay",c:"#8bc34a"},{e:"😄",l:"Good",c:"#4caf50"},{e:"🔥",l:"Fire",c:"#ff7043"}];

// ── API config — relative path works when Flask serves the frontend ───────────
const API_BASE = "/api";

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
  } catch(e) { console.error("sync error", e); }
}

const CATEGORIES = [
  {id:"health", label:"Health",    color:"#4caf50", bg:"#1a3a1a", border:"#2a5a2a"},
  {id:"work",   label:"Work",      color:"#42a5f5", bg:"#1a2a3a", border:"#2a4a5a"},
  {id:"mind",   label:"Mind",      color:"#ab47bc", bg:"#2a1a3a", border:"#4a2a5a"},
  {id:"social", label:"Social",    color:"#ffa726", bg:"#3a2a1a", border:"#5a4a2a"},
  {id:"none",   label:"Uncategorized", color:"#666", bg:"#1e2228", border:"#2a2d35"},
];

const DEFAULT_HABITS = [
  {name:"Wake up at 05:00", cat:"health"},
  {name:"Gym",              cat:"health"},
  {name:"Reading / Learning", cat:"mind"},
  {name:"Day Planning",     cat:"work"},
  {name:"No Gooning",       cat:"mind"},
  {name:"Project Work",     cat:"work"},
  {name:"No Alcohol",       cat:"health"},
  {name:"Social Media Detox", cat:"social"},
  {name:"Goal Journaling",  cat:"mind"},
  {name:"Cold Shower",      cat:"health"},
];

// remote load/save — one key per data type for granular sync
async function loadRemote() {
  const [habits, checked, sleep, journal] = await Promise.all([
    apiGet("habits"), apiGet("checked"), apiGet("sleep"), apiGet("journal"),
  ]);
  return { habits, checked, sleep, journal };
}
function saveRemote(habits, checked, sleep, journal) {
  // fire-and-forget, non-blocking
  apiSet("habits",  habits);
  apiSet("checked", checked);
  apiSet("sleep",   sleep);
  apiSet("journal", journal);
}
function getCat(id){return CATEGORIES.find(c=>c.id===id)||CATEGORIES[4];}

function DonutGauge({pct}){
  const r=42,cx=52,cy=52,stroke=8,circ=2*Math.PI*r,dash=circ*(pct/100);
  const color=pct>=80?"#4caf50":pct>=50?"#8bc34a":pct>=25?"#ffc107":"#ef5350";
  return(
    <svg width={104} height={104} viewBox="0 0 104 104">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a2d35" strokeWidth={stroke}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{transition:"stroke-dasharray 0.4s"}}/>
      <text x={cx} y={cy-6} textAnchor="middle" fill={color} fontSize={15} fontWeight={700} fontFamily="monospace">{pct.toFixed(1)}%</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill="#666" fontSize={9} fontFamily="monospace">progress</text>
    </svg>
  );
}

function SleepChart({days,getSleep}){
  const vals=days.map(d=>parseFloat(getSleep(d))||0);
  const max=Math.max(...vals,8);
  const W=Math.max(vals.length*26,200),H=60;
  const pts=vals.map((v,i)=>`${i*26+13},${H-4-(v/max)*(H-12)}`).join(" ");
  const area=`M${vals.map((v,i)=>`${i*26+13},${H-4-(v/max)*(H-12)}`).join(" L")} L${(vals.length-1)*26+13},${H} L13,${H} Z`;
  return(
    <div style={{overflowX:"auto"}}>
      <svg width={W} height={H} style={{display:"block"}}>
        <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4caf50" stopOpacity="0.5"/><stop offset="100%" stopColor="#4caf50" stopOpacity="0.05"/></linearGradient></defs>
        <path d={area} fill="url(#sg)"/>
        <polyline points={pts} fill="none" stroke="#4caf50" strokeWidth={1.5}/>
        {vals.map((v,i)=>(<g key={i}>{v>0&&<circle cx={i*26+13} cy={H-4-(v/max)*(H-12)} r={3} fill="#4caf50"/>}<text x={i*26+13} y={H-1} textAnchor="middle" fill="#555" fontSize={7} fontFamily="monospace">{v>0?v:""}</text></g>))}
      </svg>
    </div>
  );
}

function StreakBadge({current,longest}){
  return(
    <span style={{display:"inline-flex",gap:4,alignItems:"center"}}>
      <span style={{background:"#1a3a1a",border:"1px solid #2a5a2a",borderRadius:3,padding:"0 4px",color:"#4caf50",fontSize:9,fontWeight:700}}>🔥{current}</span>
      <span style={{background:"#1a1a3a",border:"1px solid #2a2a5a",borderRadius:3,padding:"0 4px",color:"#7986cb",fontSize:9,fontWeight:700}}>★{longest}</span>
    </span>
  );
}

function calcStreaks(habitName,days,year,month,getChecked){
  let best=0,tmp=0,last=days.length;
  for(let d=1;d<=days.length;d++){if(getChecked(habitName,d)){tmp++;best=Math.max(best,tmp);}else tmp=0;}
  while(last>=1&&!getChecked(habitName,last))last--;
  tmp=0;for(let d=last;d>=1;d--){if(getChecked(habitName,d))tmp++;else break;}
  return{current:tmp,longest:best};
}

function CategoryDot({catId,size=8}){
  const cat=getCat(catId);
  return <span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",background:cat.color,flexShrink:0}}/>;
}

function HeatmapView({habits,year,month,getChecked}){
  const daysInMonth=getDaysInMonth(year,month);
  const firstDay=getFirstDayOfMonth(year,month);
  const [filterCat,setFilterCat]=useState("all");
  const calCells=[];
  for(let i=0;i<firstDay;i++)calCells.push(null);
  for(let d=1;d<=daysInMonth;d++)calCells.push(d);
  const calRows=[];
  for(let i=0;i<calCells.length;i+=7)calRows.push(calCells.slice(i,i+7));
  const filtered=filterCat==="all"?habits:habits.filter(h=>h.cat===filterCat);
  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{color:"#555",fontSize:10}}>Filter:</span>
        <button onClick={()=>setFilterCat("all")} style={{...pillBtn,background:filterCat==="all"?"#2a3040":"#1a1d23",color:filterCat==="all"?"#fff":"#555",border:`1px solid ${filterCat==="all"?"#4a5a6a":"#2a2d35"}`}}>All</button>
        {CATEGORIES.filter(c=>c.id!=="none").map(cat=>(
          <button key={cat.id} onClick={()=>setFilterCat(cat.id)} style={{...pillBtn,background:filterCat===cat.id?cat.bg:"#1a1d23",color:filterCat===cat.id?cat.color:"#555",border:`1px solid ${filterCat===cat.id?cat.border:"#2a2d35"}`}}>
            <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:cat.color,marginRight:4}}/>
            {cat.label}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {filtered.map(habit=>{
          const cat=getCat(habit.cat);
          const done=Array.from({length:daysInMonth},(_,i)=>i+1).filter(d=>getChecked(habit.name,d)).length;
          const pct=Math.round((done/daysInMonth)*100);
          return(
            <div key={habit.name} style={{background:"#1a1d23",border:`1px solid ${cat.border}`,borderRadius:6,padding:"8px 12px",minWidth:160}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <CategoryDot catId={habit.cat}/>
                <div style={{fontSize:11,color:"#bbb",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{habit.name}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
                {DAYS_LABEL.map(dl=><div key={dl} style={{textAlign:"center",fontSize:7,color:"#444"}}>{dl}</div>)}
                {calRows.flat().map((d,i)=>{
                  if(!d)return <div key={`e${i}`}/>;
                  const isDone=getChecked(habit.name,d);
                  return(
                    <div key={d} title={`Day ${d}`} style={{width:"100%",paddingBottom:"100%",borderRadius:2,background:isDone?cat.color:"#1e2228",border:"1px solid #2a2d35",opacity:isDone?0.9:1}}/>
                  );
                })}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#666"}}>
                <span>{done}/{daysInMonth} days</span>
                <span style={{color:cat.color,fontWeight:700}}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyView({habits,year,month,getChecked}){
  const daysInMonth=getDaysInMonth(year,month);
  const firstDay=getFirstDayOfMonth(year,month);
  const [filterCat,setFilterCat]=useState("all");
  const weeks=[];let d=1-firstDay;
  while(d<=daysInMonth){const wDays=[];for(let i=0;i<7;i++,d++)if(d>=1&&d<=daysInMonth)wDays.push(d);if(wDays.length)weeks.push(wDays);}
  const filtered=filterCat==="all"?habits:habits.filter(h=>h.cat===filterCat);
  return(
    <div>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{color:"#555",fontSize:10}}>Filter:</span>
        <button onClick={()=>setFilterCat("all")} style={{...pillBtn,background:filterCat==="all"?"#2a3040":"#1a1d23",color:filterCat==="all"?"#fff":"#555",border:`1px solid ${filterCat==="all"?"#4a5a6a":"#2a2d35"}`}}>All</button>
        {CATEGORIES.filter(c=>c.id!=="none").map(cat=>(
          <button key={cat.id} onClick={()=>setFilterCat(cat.id)} style={{...pillBtn,background:filterCat===cat.id?cat.bg:"#1a1d23",color:filterCat===cat.id?cat.color:"#555",border:`1px solid ${filterCat===cat.id?cat.border:"#2a2d35"}`}}>
            <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:cat.color,marginRight:4}}/>
            {cat.label}
          </button>
        ))}
      </div>
      <table style={{borderCollapse:"collapse",width:"100%",tableLayout:"fixed"}}>
        <colgroup><col style={{width:180}}/><col style={{width:60}}/>{weeks.map((_,i)=><col key={i} style={{width:90}}/>)}</colgroup>
        <thead>
          <tr>
            <td style={labelCell}>Habit</td>
            <td style={{...labelCell,textAlign:"center"}}>Total</td>
            {weeks.map((wk,i)=>(<td key={i} style={{...headerCell,textAlign:"center",color:"#8bc34a",fontSize:10,padding:"4px 2px"}}>Week {i+1}<br/><span style={{color:"#555",fontSize:9}}>{wk[0]}–{wk[wk.length-1]}</span></td>))}
          </tr>
        </thead>
        <tbody>
          {filtered.map(habit=>{
            const cat=getCat(habit.cat);
            const weekPcts=weeks.map(wk=>{const done=wk.filter(d=>getChecked(habit.name,d)).length;return{done,possible:wk.length,pct:wk.length>0?Math.round((done/wk.length)*100):0};});
            const total=weekPcts.reduce((a,w)=>a+w.done,0);
            return(
              <tr key={habit.name} style={{borderBottom:"1px solid #1e2228"}}>
                <td style={{...labelCell,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
                    <CategoryDot catId={habit.cat}/>
                    <span style={{color:"#bbb"}}>{habit.name}</span>
                  </span>
                </td>
                <td style={{textAlign:"center",color:cat.color,fontWeight:700,fontSize:12}}>{total}</td>
                {weekPcts.map((w,i)=>(
                  <td key={i} style={{padding:"4px 6px",textAlign:"center",verticalAlign:"middle"}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{fontSize:10,color:w.pct>=80?cat.color:w.pct>=50?"#ffc107":"#ef5350",fontWeight:700}}>{w.pct}%</div>
                      <div style={{width:60,height:8,background:"#2a2d35",borderRadius:4,overflow:"hidden"}}>
                        <div style={{width:`${w.pct}%`,height:"100%",background:w.pct>=80?cat.color:`hsl(${w.pct},65%,42%)`,borderRadius:4,transition:"width 0.3s"}}/>
                      </div>
                      <div style={{fontSize:9,color:"#555"}}>{w.done}/{w.possible}</div>
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
          <tr style={{borderTop:"2px solid #2a2d35"}}>
            <td style={{...labelCell,color:"#888",fontStyle:"italic"}}>All habits avg</td><td></td>
            {weeks.map((wk,i)=>{
              const td=filtered.reduce((a,h)=>a+wk.filter(d=>getChecked(h.name,d)).length,0);
              const tp=filtered.length*wk.length;
              const pct=tp>0?Math.round((td/tp)*100):0;
              return(<td key={i} style={{padding:"4px 6px",textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:pct>=80?"#4caf50":pct>=50?"#ffc107":"#ef5350"}}>{pct}%</div></td>);
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function JournalView({year,month,journal,setJournal,getChecked,habits,getSleep,persist}){
  const now=new Date();
  const daysInMonth=getDaysInMonth(year,month);
  const days=Array.from({length:daysInMonth},(_,i)=>i+1);
  const [selDay,setSelDay]=useState(()=>now.getFullYear()===year&&now.getMonth()===month?now.getDate():1);
  const mk=`${year}-${month}`;
  const entry=journal[`${mk}-${selDay}`]||{mood:null,text:""};
  const updateEntry=(patch)=>{const next={...journal,[`${mk}-${selDay}`]:{...entry,...patch}};setJournal(next);persist(next);};
  const isToday=(d)=>now.getFullYear()===year&&now.getMonth()===month&&now.getDate()===d;
  const firstDay=getFirstDayOfMonth(year,month);
  const calCells=[];
  for(let i=0;i<firstDay;i++)calCells.push(null);
  for(let d=1;d<=daysInMonth;d++)calCells.push(d);
  const calRows=[];for(let i=0;i<calCells.length;i+=7)calRows.push(calCells.slice(i,i+7));
  const completedOnDay=d=>habits.filter(h=>getChecked(h.name,d)).length;
  return(
    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      <div style={{minWidth:220}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:4}}>
          {DAYS_LABEL.map(dl=><div key={dl} style={{textAlign:"center",fontSize:9,color:"#555",padding:"2px 0"}}>{dl}</div>)}
          {calRows.flat().map((d,i)=>{
            if(!d)return <div key={`e${i}`}/>;
            const jEntry=journal[`${mk}-${d}`];
            const moodObj=jEntry?.mood!=null?MOODS[jEntry.mood]:null;
            const today=isToday(d),sel=d===selDay,cnt=completedOnDay(d);
            return(
              <div key={d} onClick={()=>setSelDay(d)} style={{borderRadius:4,padding:"3px 2px",cursor:"pointer",textAlign:"center",background:sel?"#2a3a2a":today?"rgba(76,175,80,0.08)":"#1a1d23",border:sel?"1px solid #4caf50":today?"1px solid rgba(76,175,80,0.3)":"1px solid #2a2d35",transition:"all 0.15s"}}>
                <div style={{fontSize:9,color:today?"#4caf50":sel?"#8bc34a":"#666",fontWeight:today||sel?700:400}}>{d}</div>
                <div style={{fontSize:13,lineHeight:1}}>{moodObj?moodObj.e:<span style={{fontSize:8,color:"#2a2d35"}}>·</span>}</div>
                {cnt>0&&<div style={{fontSize:7,color:"#3a6a3a"}}>{"▪".repeat(Math.min(cnt,5))}</div>}
              </div>
            );
          })}
        </div>
        <div style={{fontSize:9,color:"#444",marginTop:4}}>▪ = habits done</div>
      </div>
      <div style={{flex:1,minWidth:260}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:14,color:"#fff",fontWeight:700}}>{MONTHS[month]} {selDay}</span>
          {isToday(selDay)&&<span style={{background:"#1a3a1a",border:"1px solid #2a5a2a",borderRadius:10,padding:"1px 8px",fontSize:9,color:"#4caf50"}}>today</span>}
          <span style={{fontSize:11,color:"#555",marginLeft:"auto"}}>{completedOnDay(selDay)}/{habits.length} habits</span>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,color:"#555",marginBottom:5}}>How was your day?</div>
          <div style={{display:"flex",gap:6}}>
            {MOODS.map((m,i)=>(<button key={i} onClick={()=>updateEntry({mood:i})} style={{background:entry.mood===i?`${m.c}22`:"#1a1d23",border:`1px solid ${entry.mood===i?m.c:"#2a2d35"}`,borderRadius:6,padding:"4px 8px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"all 0.15s"}}><span style={{fontSize:18}}>{m.e}</span><span style={{fontSize:8,color:entry.mood===i?m.c:"#555"}}>{m.l}</span></button>))}
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:4,padding:"4px 10px",fontSize:10}}><span style={{color:"#555"}}>Sleep </span><span style={{color:"#8bc34a",fontWeight:700}}>{getSleep(selDay)||"—"}h</span></div>
          <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:4,padding:"4px 10px",fontSize:10}}><span style={{color:"#555"}}>Habits </span><span style={{color:"#4caf50",fontWeight:700}}>{completedOnDay(selDay)}/{habits.length}</span></div>
          <div style={{background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:4,padding:"4px 10px",fontSize:10}}><span style={{color:"#555"}}>Score </span><span style={{color:"#ffc107",fontWeight:700}}>{habits.length>0?Math.round((completedOnDay(selDay)/habits.length)*100):0}%</span></div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:10,color:"#555",marginBottom:4}}>Habits completed</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {habits.map(h=>{
              const done=getChecked(h.name,selDay);const cat=getCat(h.cat);
              return(<span key={h.name} style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:done?cat.bg:"#1a1d23",border:`1px solid ${done?cat.border:"#2a2d35"}`,color:done?cat.color:"#444",display:"inline-flex",alignItems:"center",gap:4}}>{done&&<CategoryDot catId={h.cat} size={5}/>}{done?"✓ ":""}{h.name}</span>);
            })}
          </div>
        </div>
        <div>
          <div style={{fontSize:10,color:"#555",marginBottom:4}}>Journal entry</div>
          <textarea value={entry.text} onChange={e=>updateEntry({text:e.target.value})} placeholder={`Write about your day on ${MONTHS[month]} ${selDay}...`} style={{width:"100%",minHeight:120,background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:6,color:"#ccc",fontSize:12,fontFamily:"monospace",padding:"10px",resize:"vertical",boxSizing:"border-box",lineHeight:1.6,outline:"none"}}/>
          <div style={{fontSize:9,color:"#444",marginTop:2,textAlign:"right"}}>{entry.text.length} chars</div>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [habits,setHabits]=useState(DEFAULT_HABITS);
  const [checked,setChecked]=useState({});
  const [sleep,setSleep]=useState({});
  const [journal,setJournal]=useState({});
  const [newHabit,setNewHabit]=useState("");
  const [newHabitCat,setNewHabitCat]=useState("health");
  const [editingHabit,setEditingHabit]=useState(null);
  const [editVal,setEditVal]=useState("");
  const [editCat,setEditCat]=useState("health");
  const [tab,setTab]=useState("monthly");
  const [filterCat,setFilterCat]=useState("all");
  const [syncing,setSyncing]=useState(true);

  const monthKey=`${year}-${month}`;

  useEffect(()=>{
    setSyncing(true);
    loadRemote().then(s=>{
      if(s.habits){
        const h=s.habits.map(h=>typeof h==="string"?{name:h,cat:"none"}:h);
        setHabits(h);
      }
      if(s.checked)setChecked(s.checked);
      if(s.sleep)setSleep(s.sleep);
      if(s.journal)setJournal(s.journal);
      setSyncing(false);
    }).catch(()=>setSyncing(false));
    // poll every 30s for changes from other devices
    const id=setInterval(()=>{
      loadRemote().then(s=>{
        if(s.habits)setHabits(s.habits.map(h=>typeof h==="string"?{name:h,cat:"none"}:h));
        if(s.checked)setChecked(s.checked);
        if(s.sleep)setSleep(s.sleep);
        if(s.journal)setJournal(s.journal);
      });
    },30000);
    return()=>clearInterval(id);
  },[]);

  const persistAll=useCallback((h,c,s,j)=>saveRemote(h,c,s,j),[]);
  const persistJournal=useCallback((j)=>{setJournal(j);saveRemote(habits,checked,sleep,j);},[habits,checked,sleep]);

  const toggle=(habitName,day)=>{const k=`${monthKey}-${habitName}-${day}`;const n={...checked,[k]:!checked[k]};setChecked(n);persistAll(habits,n,sleep,journal);};
  const setSleepVal=(day,val)=>{const k=`${monthKey}-sleep-${day}`;const n={...sleep,[k]:val};setSleep(n);persistAll(habits,checked,n,journal);};
  const addHabit=()=>{if(!newHabit.trim())return;const n=[...habits,{name:newHabit.trim(),cat:newHabitCat}];setHabits(n);setNewHabit("");persistAll(n,checked,sleep,journal);};
  const removeHabit=i=>{const n=habits.filter((_,idx)=>idx!==i);setHabits(n);persistAll(n,checked,sleep,journal);};
  const saveEdit=i=>{const n=habits.map((h,idx)=>idx===i?{...h,name:editVal,cat:editCat}:h);setHabits(n);setEditingHabit(null);persistAll(n,checked,sleep,journal);};

  const daysInMonth=getDaysInMonth(year,month);
  const days=Array.from({length:daysInMonth},(_,i)=>i+1);
  const getChecked=(habitName,day)=>!!checked[`${monthKey}-${habitName}-${day}`];
  const getSleep=day=>sleep[`${monthKey}-sleep-${day}`]??"";
  const filteredHabits=filterCat==="all"?habits:habits.filter(h=>h.cat===filterCat);
  const completedToday=day=>habits.filter(h=>getChecked(h.name,day)).length;
  const totalCompleted=habits.reduce((acc,h)=>acc+days.filter(d=>getChecked(h.name,d)).length,0);
  const totalPossible=habits.length*daysInMonth;
  const progressPct=totalPossible>0?parseFloat(((totalCompleted/totalPossible)*100).toFixed(1)):0;
  const habitProgress=habit=>{const done=days.filter(d=>getChecked(habit.name,d)).length;return{done,pct:daysInMonth>0?(done/daysInMonth)*100:0};};
  const maxDaily=Math.max(...days.map(d=>completedToday(d)),1);
  const isToday=(d)=>now.getFullYear()===year&&now.getMonth()===month&&now.getDate()===d;
  const prevMonth=()=>{if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);};
  const nextMonth=()=>{if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);};
  const COL=26;
  const TABS=["monthly","weekly","heatmap","journal"];

  // Category summary stats
  const catStats=CATEGORIES.filter(c=>c.id!=="none").map(cat=>{
    const catHabits=habits.filter(h=>h.cat===cat.id);
    if(!catHabits.length)return null;
    const done=catHabits.reduce((a,h)=>a+days.filter(d=>getChecked(h.name,d)).length,0);
    const possible=catHabits.length*daysInMonth;
    return{...cat,done,possible,pct:possible>0?Math.round((done/possible)*100):0,count:catHabits.length};
  }).filter(Boolean);

  return(
    <div style={{background:"#13151a",minHeight:"100vh",padding:"14px",fontFamily:"monospace",color:"#ccc",fontSize:12}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,flexWrap:"wrap"}}>
        <button onClick={prevMonth} style={btnStyle}>‹</button>
        <span style={{fontSize:20,fontWeight:700,color:"#fff",minWidth:140}}>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} style={btnStyle}>›</button>
        {syncing&&<span style={{fontSize:10,color:"#555",marginLeft:4}}>⟳ syncing...</span>}
        <div style={{display:"flex",gap:16,alignItems:"center",marginLeft:"auto",flexWrap:"wrap"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#666"}}>Monthly Progress %</div><div style={{fontSize:15,fontWeight:700,color:"#4caf50"}}>{progressPct}%</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#666"}}>Completed Habits</div><div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{totalCompleted}</div></div>
          <DonutGauge pct={progressPct}/>
        </div>
      </div>

      {/* Category stats bar */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {catStats.map(cat=>(
          <div key={cat.id} onClick={()=>setFilterCat(filterCat===cat.id?"all":cat.id)} style={{background:filterCat===cat.id?cat.bg:"#1a1d23",border:`1px solid ${filterCat===cat.id?cat.border:"#2a2d35"}`,borderRadius:6,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all 0.15s"}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:cat.color,flexShrink:0}}/>
            <span style={{color:filterCat===cat.id?cat.color:"#888",fontSize:10}}>{cat.label}</span>
            <span style={{color:filterCat===cat.id?cat.color:"#555",fontSize:11,fontWeight:700}}>{cat.pct}%</span>
            <div style={{width:36,height:5,background:"#2a2d35",borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${cat.pct}%`,height:"100%",background:cat.color,borderRadius:3}}/>
            </div>
          </div>
        ))}
        {filterCat!=="all"&&<button onClick={()=>setFilterCat("all")} style={{...pillBtn,color:"#555",border:"1px solid #2a2d35"}}>✕ clear</button>}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,marginBottom:12,borderBottom:"1px solid #2a2d35"}}>
        {TABS.map(t=>(<button key={t} onClick={()=>setTab(t)} style={{background:"none",border:"none",borderBottom:tab===t?"2px solid #4caf50":"2px solid transparent",color:tab===t?"#4caf50":"#555",padding:"6px 14px",cursor:"pointer",fontSize:12,fontFamily:"monospace",textTransform:"capitalize",marginBottom:-1}}>{t}</button>))}
      </div>

      {tab==="weekly"&&<WeeklyView habits={filteredHabits} year={year} month={month} getChecked={getChecked}/>}
      {tab==="heatmap"&&<HeatmapView habits={filteredHabits} year={year} month={month} getChecked={getChecked}/>}
      {tab==="journal"&&<JournalView year={year} month={month} journal={journal} setJournal={setJournal} getChecked={getChecked} habits={habits} getSleep={getSleep} persist={persistJournal}/>}

      {tab==="monthly"&&(
        <div style={{display:"flex",gap:10,overflowX:"auto"}}>
          <div style={{overflowX:"auto",flex:1}}>
            <table style={{borderCollapse:"collapse",tableLayout:"fixed"}}>
              <colgroup><col style={{width:180}}/><col style={{width:80}}/>{days.map(d=><col key={d} style={{width:COL}}/>)}</colgroup>
              <thead>
                <tr>
                  <td style={labelCell}></td>
                  <td style={{...labelCell,fontSize:9,color:"#555",textAlign:"center"}}>Streaks</td>
                  {days.map(d=>{
                    const dow=new Date(year,month,d).getDay(),today=isToday(d);
                    const jEntry=journal[`${monthKey}-${d}`];
                    const moodObj=jEntry?.mood!=null?MOODS[jEntry.mood]:null;
                    return(<td key={d} style={{...headerCell,color:today?"#4caf50":dow===0||dow===6?"#3a6a3a":"#555",background:today?"rgba(76,175,80,0.08)":"transparent",borderLeft:today?"1px solid rgba(76,175,80,0.4)":"none",borderRight:today?"1px solid rgba(76,175,80,0.4)":"none"}}>
                      <span style={{fontSize:10,display:"block"}}>{moodObj?moodObj.e:" "}</span>
                      <span style={{fontSize:9}}>{DAYS_LABEL[dow]}</span><br/>
                      <span style={{fontSize:8,color:today?"#4caf50":"#444",fontWeight:today?700:400}}>{d}</span>
                    </td>);
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Group by category */}
                {CATEGORIES.map(cat=>{
                  const catHabits=filteredHabits.filter(h=>h.cat===cat.id);
                  if(!catHabits.length)return null;
                  return[
                    cat.id!=="none"&&(
                      <tr key={`cat-${cat.id}`}>
                        <td colSpan={2+daysInMonth} style={{padding:"6px 4px 2px",fontSize:9,color:cat.color,letterSpacing:1,borderBottom:`1px solid ${cat.border}`,background:`${cat.bg}55`}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:cat.color}}/>{cat.label.toUpperCase()}</span>
                        </td>
                      </tr>
                    ),
                    ...catHabits.map((habit,hi)=>{
                      const{current,longest}=calcStreaks(habit.name,days,year,month,getChecked);
                      const cat2=getCat(habit.cat);
                      return(
                        <tr key={habit.name} style={{height:26}}>
                          <td style={{...labelCell,paddingRight:4,borderLeft:`2px solid ${cat2.color}33`}}>
                            {editingHabit===habit.name?(
                              <span style={{display:"flex",gap:3,alignItems:"center"}}>
                                <input value={editVal} onChange={e=>setEditVal(e.target.value)} style={{...inputStyle,width:80,fontSize:10}} onKeyDown={e=>e.key==="Enter"&&saveEdit(habits.findIndex(h=>h.name===habit.name))}/>
                                <select value={editCat} onChange={e=>setEditCat(e.target.value)} style={{...inputStyle,fontSize:9,padding:"2px 4px"}}>
                                  {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                                <button onClick={()=>saveEdit(habits.findIndex(h=>h.name===habit.name))} style={{...btnSmall,color:"#4caf50"}}>✓</button>
                              </span>
                            ):(
                              <span style={{display:"flex",alignItems:"center",gap:4}}>
                                <CategoryDot catId={habit.cat}/>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:108,color:"#bbb"}}>{habit.name}</span>
                                <button onClick={()=>{setEditingHabit(habit.name);setEditVal(habit.name);setEditCat(habit.cat);}} style={btnSmall}>✎</button>
                                <button onClick={()=>removeHabit(habits.findIndex(h=>h.name===habit.name))} style={{...btnSmall,color:"#e57373"}}>✕</button>
                              </span>
                            )}
                          </td>
                          <td style={{textAlign:"center",verticalAlign:"middle",padding:"2px 3px"}}><StreakBadge current={current} longest={longest}/></td>
                          {days.map(d=>{
                            const done=getChecked(habit.name,d),today=isToday(d),cat3=getCat(habit.cat);
                            return(
                              <td key={d} style={{textAlign:"center",padding:0,background:today?"rgba(76,175,80,0.06)":"transparent",borderLeft:today?"1px solid rgba(76,175,80,0.2)":"none",borderRight:today?"1px solid rgba(76,175,80,0.2)":"none"}}>
                                <div onClick={()=>toggle(habit.name,d)} style={{width:15,height:15,margin:"0 auto",border:today?`1px solid ${cat3.color}`:"1px solid #2a2d35",background:done?cat3.color:"transparent",cursor:"pointer",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:9,userSelect:"none",boxShadow:today&&!done?`0 0 4px ${cat3.color}55`:"none"}}>{done?"✓":""}</div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ];
                })}

                {/* Sleep */}
                <tr style={{borderTop:"2px solid #2a2d35"}}>
                  <td style={{...labelCell,color:"#8bc34a",fontWeight:700,verticalAlign:"top",paddingTop:4}}>Hours of Sleep</td>
                  <td style={{verticalAlign:"middle",textAlign:"center",fontSize:9,color:"#555"}}>avg {(()=>{const v=days.map(d=>parseFloat(getSleep(d))||0).filter(v=>v>0);return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):0;})()}h</td>
                  <td colSpan={daysInMonth} style={{padding:"4px 0"}}><SleepChart days={days} getSleep={getSleep}/></td>
                </tr>
                <tr>
                  <td style={labelCell}></td><td></td>
                  {days.map(d=>(<td key={d} style={{padding:1,textAlign:"center",background:isToday(d)?"rgba(76,175,80,0.06)":"transparent"}}><input type="number" min="0" max="12" step="0.5" value={getSleep(d)} onChange={e=>setSleepVal(d,e.target.value)} style={{width:20,background:"#1e2a1e",border:`1px solid ${isToday(d)?"#3a5a3a":"#1e2a1e"}`,color:"#8bc34a",fontSize:8,textAlign:"center",borderRadius:2,padding:"1px 0"}}/></td>))}
                </tr>
                <tr style={{height:54,borderTop:"1px solid #2a2d35"}}>
                  <td style={{...labelCell,color:"#888",verticalAlign:"top",paddingTop:4}}>Habit Count</td><td></td>
                  {days.map(d=>{const cnt=completedToday(d),h=maxDaily>0?Math.round((cnt/maxDaily)*38):0,today=isToday(d);return(<td key={d} style={{textAlign:"center",verticalAlign:"bottom",padding:"0 1px",background:today?"rgba(76,175,80,0.06)":"transparent"}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",height:48,justifyContent:"flex-end"}}>{cnt>0&&<div style={{fontSize:7,color:"#888",marginBottom:1}}>{cnt}</div>}<div style={{width:13,height:h,background:today?"#6cdf70":"#4caf50",borderRadius:"2px 2px 0 0",minHeight:cnt>0?2:0}}/></div></td>);})}
                </tr>
                <tr style={{height:54,borderTop:"1px solid #2a2d35"}}>
                  <td style={{...labelCell,color:"#888",verticalAlign:"top",paddingTop:4}}>Daily Progress</td><td></td>
                  {days.map(d=>{const pct=habits.length>0?(completedToday(d)/habits.length)*100:0,today=isToday(d);return(<td key={d} style={{textAlign:"center",verticalAlign:"bottom",padding:"0 1px",background:today?"rgba(76,175,80,0.06)":"transparent"}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",height:48,justifyContent:"flex-end"}}><div style={{width:13,height:Math.round(pct*0.46),background:`hsl(${pct},70%,42%)`,borderRadius:"2px 2px 0 0",minHeight:pct>0?2:0}}/></div></td>);})}
                </tr>
              </tbody>
            </table>
          </div>
          {/* Right panel */}
          <div style={{minWidth:140,background:"#1a1d23",border:"1px solid #2a2d35",borderRadius:6,padding:"8px 10px",flexShrink:0}}>
            <div style={{color:"#fff",fontWeight:700,fontSize:13,marginBottom:8,textAlign:"center"}}>Each Habit</div>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr",gap:4,marginBottom:6}}><span style={{color:"#555",fontSize:9,textAlign:"center"}}>Count</span><span style={{color:"#555",fontSize:9}}>Progress</span></div>
            {filteredHabits.map((h,i)=>{
              const{done,pct}=habitProgress(h);const cat=getCat(h.cat);
              return(<div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr",gap:4,alignItems:"center",marginBottom:5}}><span style={{color:cat.color,fontSize:11,textAlign:"center",fontWeight:700}}>{done}</span><div style={{background:"#2a3040",borderRadius:3,height:11,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:cat.color,borderRadius:3,transition:"width 0.3s"}}/></div></div>);
            })}
          </div>
        </div>
      )}

      {/* Add habit bar */}
      {tab!=="journal"&&(
        <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center",flexWrap:"wrap"}}>
          <input value={newHabit} onChange={e=>setNewHabit(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addHabit()} placeholder="New habit name..." style={{...inputStyle,width:180}}/>
          <select value={newHabitCat} onChange={e=>setNewHabitCat(e.target.value)} style={{...inputStyle,fontSize:11}}>
            {CATEGORIES.map(c=>(<option key={c.id} value={c.id} style={{background:"#1e2228"}}>{c.label}</option>))}
          </select>
          <button onClick={addHabit} style={{...btnStyle,background:"#1a3a1a",color:"#4caf50"}}>+ Add</button>
        </div>
      )}
    </div>
  );
}

const pillBtn={background:"#1a1d23",border:"1px solid #2a2d35",color:"#888",borderRadius:12,padding:"3px 10px",cursor:"pointer",fontSize:10,fontFamily:"monospace",display:"inline-flex",alignItems:"center"};
const btnStyle={background:"#1e2228",border:"1px solid #2a2d35",color:"#ccc",borderRadius:4,padding:"4px 10px",cursor:"pointer",fontSize:13};
const btnSmall={background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:10,padding:"0 2px",lineHeight:1};
const inputStyle={background:"#1e2228",border:"1px solid #2a2d35",color:"#ccc",borderRadius:4,padding:"4px 8px",fontSize:12};
const labelCell={padding:"2px 4px 2px 2px",fontSize:11,whiteSpace:"nowrap",color:"#aaa",textAlign:"left",verticalAlign:"middle"};
const headerCell={padding:"1px 1px",fontSize:9,textAlign:"center",color:"#666",verticalAlign:"bottom"};