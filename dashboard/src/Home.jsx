import React, { useState, useEffect } from 'react';

export default function Home() {
  const [totalExp, setTotalExp] = useState(0);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch Gym EXP
    fetch('/api/data/gym_profile')
      .then(res => res.json())
      .then(data => {
        if (data.value && data.value.permanentExp) {
          const exps = Object.values(data.value.permanentExp);
          const total = exps.reduce((acc, curr) => acc + curr, 0);
          setTotalExp(total);
        }
      })
      .catch(console.error);

    // Fetch Note
    fetch('/api/data/short_note')
      .then(res => res.json())
      .then(data => {
        if (data.value) setNote(data.value);
      })
      .catch(console.error);
  }, []);

  const saveNote = (newNote) => {
    setIsSaving(true);
    fetch('/api/data/short_note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newNote })
    })
    .then(() => setIsSaving(false))
    .catch(console.error);
  };

  const handleNoteChange = (e) => {
    setNote(e.target.value);
  };

  const handleNoteBlur = () => {
    saveNote(note);
  };

  return (
    <div>
      <div className="header">
        <h1>Welcome Back</h1>
        <p>Your unified dashboard is ready. Select an app from the sidebar to get started.</p>
      </div>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Left Column */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ margin: 0 }}>
            <h2 style={{ marginBottom: '16px', color: 'var(--accent)', borderBottom: '2px dashed var(--text-muted)', paddingBottom: '10px' }}>PLAYER STATUS</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ fontSize: '40px' }}>👾</div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Gym EXP</div>
                <div style={{ fontSize: '24px', color: 'var(--text-main)' }}>{totalExp} <span style={{fontSize: '10px', color:'var(--accent-hover)'}}>XP</span></div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '16px', color: 'var(--accent)', borderBottom: '2px dashed var(--text-muted)', paddingBottom: '10px' }}>
              SHORT NOTE {isSaving && <span style={{fontSize: '10px', color: 'var(--accent-hover)', animation: 'blink 1s infinite'}}>SAVING...</span>}
            </h2>
            <textarea
              value={note}
              onChange={handleNoteChange}
              onBlur={handleNoteBlur}
              placeholder="Type your notes here... (Auto-saves)"
              style={{
                width: '100%',
                flex: 1,
                minHeight: '150px',
                backgroundColor: '#000',
                border: '4px solid var(--panel-border)',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
                fontSize: '16px',
                padding: '16px',
                outline: 'none',
                resize: 'none',
                lineHeight: '1.8'
              }}
            />
          </div>

        </div>

        {/* Right Column (AI Links) */}
        <div style={{ flex: '1 1 300px' }}>
          <div className="glass-panel" style={{ margin: 0, height: '100%' }}>
            <h2 style={{ marginBottom: '24px', color: 'var(--accent)', borderBottom: '2px dashed var(--text-muted)', paddingBottom: '10px' }}>AI TERMINALS</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ border: '4px solid #10a37f', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#000', cursor: 'pointer' }}
                     onMouseOver={e => e.currentTarget.style.background = '#111'}
                     onMouseOut={e => e.currentTarget.style.background = '#000'}>
                  <div style={{ background: '#10a37f', color: '#fff', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>GPT</div>
                  <div style={{ color: '#fff', fontSize: '12px' }}>ChatGPT</div>
                </div>
              </a>

              <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ border: '4px solid #4285f4', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#000', cursor: 'pointer' }}
                     onMouseOver={e => e.currentTarget.style.background = '#111'}
                     onMouseOut={e => e.currentTarget.style.background = '#000'}>
                  <div style={{ background: '#4285f4', color: '#fff', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>GEM</div>
                  <div style={{ color: '#fff', fontSize: '12px' }}>Gemini</div>
                </div>
              </a>

              <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ border: '4px solid #d97757', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#000', cursor: 'pointer' }}
                     onMouseOver={e => e.currentTarget.style.background = '#111'}
                     onMouseOut={e => e.currentTarget.style.background = '#000'}>
                  <div style={{ background: '#d97757', color: '#fff', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>CLD</div>
                  <div style={{ color: '#fff', fontSize: '12px' }}>Claude AI</div>
                </div>
              </a>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
