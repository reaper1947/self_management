import React, { useState, useEffect } from 'react';

const initialProfile = {
  permanentExp: { handstand: 0, muscleup: 0, stamina: 0, planche: 0, backlever: 0, core: 0, recovery: 0 }
};

const skillNames = {
  handstand: "Handstand Control",
  muscleup: "Muscle-Ups",
  stamina: "Stamina",
  planche: "Planche",
  backlever: "Back Lever",
  core: "Core Strength",
  recovery: "Recovery"
};

const schedule = [
  { id: 'handstand', day: "Monday", focus: "Push (Vertical)", quests: ["Handstand Press Practice (5 x 3)", "HSPU (4 x 5-8)", "Pseudo Planche Push-ups (4 x 10)", "Pike Push-ups (3 x 12)"], skill: "Handstand" },
  { id: 'muscleup', day: "Tuesday", focus: "Pull (Levers)", quests: ["Muscle-Up Technique (5 x 2-3)", "Back Lever Holds (4 x 10s)", "Front Lever Progressions (4 x 15s)", "Weighted Pull-ups (4 x 5)"], skill: "Muscle-Ups" },
  { id: 'stamina', day: "Wednesday", focus: "Leg Day", quests: ["🏊 SWIMMING SESSION 🏊 (45 mins)", "Freestyle Sprints (10 x 50m)", "Kickboard Drills (5 x 100m)"], skill: "Stamina" },
  { id: 'planche', day: "Thursday", focus: "Push (Horizontal)", quests: ["Planche Progressions (5 x 10s)", "Weighted Dips (4 x 6-8)", "Explosive Push-ups (4 x 10)", "Triceps Extensions (3 x 12)"], skill: "Planche" },
  { id: 'backlever', day: "Friday", focus: "Pull (Volume)", quests: ["High-volume Muscle-Ups (4 x Max)", "Tuck Front Lever Rows (4 x 8-10)", "One-Arm Pull-up Negatives (3 x 3/arm)"], skill: "Back Lever" },
  { id: 'core', day: "Saturday", focus: "Skills & Core", quests: ["Human Flag Practice (4 x 10s/side)", "Dragon Flags (4 x 8-12)", "Mobility Flow (15 mins)"], skill: "Core Strength" },
  { id: 'recovery', day: "Sunday", focus: "Rest", quests: ["RECOVER HP (Sleep 8+ hrs)", "Light Stretching / AFK"], skill: "Recovery" },
];

function getLevelInfo(totalExp) {
  let level = 1;
  let expRequired = 100;
  let currentExp = totalExp;
  
  while (currentExp >= expRequired) {
    currentExp -= expRequired;
    level++;
    expRequired = level * 100;
  }
  return { level, currentExp, requiredExp: expRequired, percent: (currentExp / expRequired) * 100 };
}

export default function GymSchedule() {
  const [profile, setProfile] = useState(initialProfile);
  const [progress, setProgress] = useState({});
  const [completedDays, setCompletedDays] = useState({});
  const [previousLevels, setPreviousLevels] = useState({});
  
  const [popup, setPopup] = useState(null); // { type: 'levelup'|'daily', text: '' }
  const [showVictory, setShowVictory] = useState(false);
  const [confetti, setConfetti] = useState([]);

  // Load state on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/data/gym_profile').then(res => res.json()),
      fetch('/api/data/gym_progress').then(res => res.json())
    ]).then(([profRes, progRes]) => {
      const savedProf = profRes.value;
      const savedProg = progRes.value;

      if (savedProf) setProfile(savedProf);
      if (savedProg) setProgress(savedProg);
      
      const prof = savedProf || initialProfile;
      const prog = savedProg || {};
      const { expMap } = calculateState(prof, prog, true);
      
      const initialLevels = {};
      for (const skillId in skillNames) {
        initialLevels[skillId] = getLevelInfo(expMap[skillId]).level;
      }
      setPreviousLevels(initialLevels);
    }).catch(err => console.error("Failed to load gym data", err));
  }, []);

  const saveProfile = (newProfile) => {
    setProfile(newProfile);
    fetch('/api/data/gym_profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newProfile })
    }).catch(console.error);
  };

  const saveProgress = (newProgress) => {
    setProgress(newProgress);
    fetch('/api/data/gym_progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newProgress })
    }).catch(console.error);
  };

  const calculateState = (currentProfile, currentProgress, isInit = false) => {
    let completedQuests = 0;
    let totalQuests = 0;
    const weekExp = { handstand: 0, muscleup: 0, stamina: 0, planche: 0, backlever: 0, core: 0, recovery: 0 };
    const expMap = { ...currentProfile.permanentExp };
    const newCompletedDays = { ...completedDays };

    schedule.forEach((dayObj, dayIdx) => {
      let dayCompleted = 0;
      dayObj.quests.forEach((q, qIdx) => {
        totalQuests++;
        const key = `${dayIdx}-${qIdx}`;
        if (currentProgress[key]) {
          dayCompleted++;
          completedQuests++;
          weekExp[dayObj.id] += 25;
          expMap[dayObj.id] += 25;
        }
      });
      
      const isDayComplete = (dayObj.quests.length > 0 && dayObj.quests.length === dayCompleted);
      if (isDayComplete) {
        weekExp[dayObj.id] += 100;
        expMap[dayObj.id] += 100;
        
        if (!completedDays[dayIdx] && !isInit) {
          triggerPopup('daily', `${dayObj.day} CLEARED!`);
        }
        newCompletedDays[dayIdx] = true;
      } else {
        newCompletedDays[dayIdx] = false;
      }
    });

    return { totalQuests, completedQuests, weekExp, expMap, newCompletedDays };
  };

  const handleCheck = (dayIdx, qIdx) => {
    const key = `${dayIdx}-${qIdx}`;
    const newProgress = { ...progress, [key]: !progress[key] };
    saveProgress(newProgress);
    
    const state = calculateState(profile, newProgress);
    setCompletedDays(state.newCompletedDays);

    // Check for level ups
    for (const skillId in skillNames) {
      const info = getLevelInfo(state.expMap[skillId]);
      if (previousLevels[skillId] && info.level > previousLevels[skillId]) {
        triggerPopup('levelup', `${skillNames[skillId]} is now LVL ${info.level}!`);
      }
      setPreviousLevels(prev => ({ ...prev, [skillId]: info.level }));
    }

    if (state.totalQuests > 0 && state.totalQuests === state.completedQuests) {
      setShowVictory(true);
      generateConfetti();
    }
  };

  const triggerPopup = (type, text) => {
    setPopup({ type, text });
    setTimeout(() => setPopup(null), type === 'levelup' ? 3000 : 2000);
  };

  const generateConfetti = () => {
    const arr = [];
    const colors = ['#00ffff', '#ff00ff', '#ffff00', '#39ff14'];
    for (let i = 0; i < 150; i++) {
      arr.push({
        id: i,
        left: Math.random() * 100 + 'vw',
        color: colors[Math.floor(Math.random() * colors.length)],
        dur: (Math.random() * 2 + 1) + 's',
        delay: (Math.random() * 2) + 's'
      });
    }
    setConfetti(arr);
  };

  const restartWeek = () => {
    const state = calculateState(profile, progress);
    const newProfile = { ...profile };
    for (const skillId in state.weekExp) {
      newProfile.permanentExp[skillId] += state.weekExp[skillId];
    }
    saveProfile(newProfile);
    
    saveProgress({});
    
    setCompletedDays({});
    setShowVictory(false);
    setPopup(null);
    setConfetti([]);
  };

  const stateInfo = calculateState(profile, progress, true);

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingBottom: '40px' }}>
      
      {/* Popups */}
      <div id="levelup-popup" className={`popup-overlay ${popup?.type === 'levelup' ? 'show' : ''}`}>
        <h2>LEVEL UP!</h2>
        <p>{popup?.text}</p>
      </div>

      <div id="daily-popup" className={`popup-overlay ${popup?.type === 'daily' ? 'show' : ''}`}>
        <h2>{popup?.text}</h2>
        <div style={{ fontSize: '40px', marginTop: '20px' }}>⭐ 🍄 ⭐</div>
        <p style={{ marginTop: '10px' }}>+100 EXP BONUS</p>
      </div>

      {showVictory && (
        <div id="victory-screen">
          {confetti.map(c => (
            <div key={c.id} className="confetti" style={{ left: c.left, backgroundColor: c.color, animationDuration: c.dur, animationDelay: c.delay }} />
          ))}
          <h1>STAGE CLEAR!</h1>
          <div style={{ fontSize: '40px', marginTop: '20px' }}>🏆 👾 🏆</div>
          <p style={{ color: '#fff', fontSize: '20px', marginTop: '20px' }}>Week Completed.</p>
          <button onClick={restartWeek}>Bank EXP & Restart Week</button>
        </div>
      )}

      <div className="retro-header">
        <h1>[ PLAYER 1: PETER ]<br/>ADVANCED CALISTHENICS</h1>
      </div>

      <div className="stats-panel">
        <h2>CHARACTER SKILLS</h2>
        <div className="skills-grid">
          {Object.keys(skillNames).map(skillId => {
            const exp = stateInfo.expMap[skillId];
            const info = getLevelInfo(exp);
            return (
              <div key={skillId} className="skill-item">
                <div className="skill-name-lvl">
                  <span>{skillNames[skillId]}</span>
                  <span className="lvl">LVL {info.level}</span>
                </div>
                <div className="exp-bar-bg" title={`${info.currentExp} / ${info.requiredExp} EXP`}>
                  <div className="exp-bar-fill" style={{ width: `${info.percent}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="status-bar">
        <span className="hp">HP: 100/100</span>
        <span className="quests">Quests Left: {stateInfo.totalQuests - stateInfo.completedQuests}</span>
      </div>
      
      <div className="retro-table-container">
        <table className="retro-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Focus Area</th>
              <th>Training Protocol</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((dayObj, dayIdx) => (
              <tr key={dayObj.day}>
                <td className="day">{dayObj.day}</td>
                <td className="focus">{dayObj.focus}</td>
                <td>
                  {dayObj.quests.map((q, qIdx) => {
                    const key = `${dayIdx}-${qIdx}`;
                    const isChecked = progress[key] || false;
                    return (
                      <label key={qIdx} className={`quest ${isChecked ? 'completed' : ''}`}>
                        <input type="checkbox" checked={isChecked} onChange={() => handleCheck(dayIdx, qIdx)} /> {q}
                      </label>
                    );
                  })}
                  <div className="skill" style={{ marginTop: '10px' }}>TRAINING: {dayObj.skill}</div>
                  {completedDays[dayIdx] && (
                    <div className="day-complete-stamp">⭐ {dayObj.day.toUpperCase()} CLEARED ⭐</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
