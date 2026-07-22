import React, { useState, useEffect } from 'react';

export default function Scheduler() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(true);

  // Calendar States
  const [memos, setMemos] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeMemoDate, setActiveMemoDate] = useState(null);
  const [memoInput, setMemoInput] = useState('');

  useEffect(() => {
    // Fetch Tasks
    fetch('/api/data/tasks')
      .then(res => res.json())
      .then(data => {
        if (data.value) setTasks(data.value);
        setLoading(false);
      });

    // Fetch Memos
    fetch('/api/data/calendar_memos')
      .then(res => res.json())
      .then(data => {
        if (data.value) setMemos(data.value);
      });
  }, []);

  const saveTasks = (newTasks) => {
    setTasks(newTasks);
    fetch('/api/data/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newTasks })
    });
  };

  const saveMemos = (newMemos) => {
    setMemos(newMemos);
    fetch('/api/data/calendar_memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newMemos })
    });
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const newTasks = [
      ...tasks,
      {
        id: Date.now().toString(),
        text: newTask,
        priority,
        deadline,
        completed: false,
        createdAt: new Date().toISOString()
      }
    ];
    saveTasks(newTasks);
    setNewTask('');
    setDeadline('');
  };

  const handleSaveMemo = () => {
    if (!activeMemoDate) return;
    const newMemos = { ...memos };
    if (!memoInput.trim()) {
      delete newMemos[activeMemoDate];
    } else {
      newMemos[activeMemoDate] = memoInput.trim();
    }
    saveMemos(newMemos);
    setActiveMemoDate(null);
  };

  const toggleTask = (id) => saveTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id) => saveTasks(tasks.filter(t => t.id !== id));
  const getPriorityColor = (p) => p === 'high' ? '#ef5350' : p === 'medium' ? '#ffc107' : '#8bc34a';

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pVal = { high: 3, medium: 2, low: 1 };
    return pVal[b.priority] - pVal[a.priority];
  });

  // Calendar Logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const renderCalendar = () => {
    const days = [];
    const today = new Date();
    
    // Empty slots before 1st of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
    }

    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasMemo = !!memos[dateStr];
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      days.push(
        <div 
          key={d} 
          className={`cal-day ${isToday ? 'today' : ''} ${hasMemo ? 'has-memo' : ''}`}
          onClick={() => {
            setActiveMemoDate(dateStr);
            setMemoInput(memos[dateStr] || '');
          }}
        >
          <span className="day-num">{d}</span>
          {hasMemo && <div className="memo-text">{memos[dateStr]}</div>}
        </div>
      );
    }
    return days;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', overflowY: 'auto', paddingBottom: '20px' }}>
      
      {/* TASK MANAGER SECTION */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
        <div className="header" style={{ marginBottom: '24px' }}>
          <h2>Task Manager</h2>
          <p>Organize your to-dos with priorities and deadlines.</p>
        </div>

        <form onSubmit={addTask} style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
          background: 'rgba(0,0,0,0.2)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--panel-border)'
        }}>
          <input 
            type="text" 
            value={newTask} 
            onChange={(e) => setNewTask(e.target.value)} 
            placeholder="What needs to be done?" 
            style={{ ...inputStyle, flex: '1 1 200px' }}
          />
          <select 
            value={priority} 
            onChange={(e) => setPriority(e.target.value)}
            style={{ ...inputStyle, flex: '0 0 120px' }}
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium</option>
            <option value="high">High Priority</option>
          </select>
          <div style={{ flex: '0 0 140px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Deadline (Optional)</span>
            <input 
              type="date" 
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              onClick={(e) => {
                try {
                  e.target.showPicker();
                } catch (err) {
                  // Fallback for older browsers
                }
              }}
              style={{ ...inputStyle, width: '100%', cursor: 'pointer', padding: '10px' }}
            />
          </div>
          <button type="submit" style={{ ...btnStyle, flex: '0 0 auto', alignSelf: 'flex-end' }}>Add Task</button>
        </form>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading tasks...</div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedTasks.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                No tasks yet. You're all caught up!
              </div>
            )}
            {sortedTasks.map(task => (
              <div 
                key={task.id} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  border: '1px solid var(--panel-border)',
                  opacity: task.completed ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <div 
                  onClick={() => toggleTask(task.id)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${task.completed ? 'var(--accent)' : 'var(--text-muted)'}`,
                    background: task.completed ? 'var(--accent)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {task.completed && <span style={{ color: '#000', fontSize: '12px' }}>✓</span>}
                </div>
                
                <div style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-muted)' : 'var(--text-main)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{task.text}</div>
                  {task.deadline && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      📅 {task.deadline}
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '12px',
                  background: `${getPriorityColor(task.priority)}22`,
                  color: getPriorityColor(task.priority),
                  textTransform: 'uppercase'
                }}>
                  {task.priority}
                </div>

                <button 
                  onClick={() => deleteTask(task.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px',
                    marginLeft: '8px'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CALENDAR SECTION */}
      <div className="glass-panel" style={{ flexShrink: 0 }}>
        <div className="header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Month Planner</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button style={navBtnStyle} onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>◀</button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)' }}>{monthName} {year}</span>
            <button style={navBtnStyle} onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>▶</button>
          </div>
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="cal-header">{day}</div>
          ))}
          {renderCalendar()}
        </div>
      </div>

      {/* MEMO MODAL (Inline Overlay) */}
      {activeMemoDate && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle} className="glass-panel">
            <h3 style={{ marginBottom: '16px', color: 'var(--accent)' }}>Memo for {activeMemoDate}</h3>
            <textarea 
              autoFocus
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              placeholder="Write a quick note for this day..."
              style={{ ...inputStyle, width: '100%', minHeight: '100px', resize: 'none', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveMemoDate(null)} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-main)' }}>Cancel</button>
              <button onClick={handleSaveMemo} style={btnStyle}>Save Memo</button>
            </div>
          </div>
        </div>
      )}

      {/* TASK MANAGER WAS HERE */}

      <style dangerouslySetInnerHTML={{__html: `
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .cal-header {
          text-align: center;
          font-size: 10px;
          color: var(--text-muted);
          padding-bottom: 8px;
        }
        .cal-day {
          min-height: 80px;
          background: rgba(0,0,0,0.4);
          border: 1px solid var(--panel-border);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 6px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .cal-day:hover:not(.empty) {
          border-color: var(--accent);
          background: rgba(255,255,255,0.05);
        }
        .cal-day.empty {
          background: transparent;
          border-color: transparent;
          cursor: default;
        }
        .cal-day.today {
          border-color: var(--accent);
          color: var(--accent);
          font-weight: bold;
        }
        .cal-day.has-memo {
          background: rgba(0, 255, 255, 0.05);
        }
        .day-num {
          font-size: 12px;
          margin-bottom: 4px;
        }
        .memo-text {
          font-size: 8px;
          color: var(--accent);
          text-align: center;
          width: 100%;
          word-break: break-word;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          line-height: 1.2;
        }
      `}} />
    </div>
  );
}

const inputStyle = {
  background: 'rgba(0, 0, 0, 0.4)',
  border: '1px solid var(--panel-border)',
  color: 'var(--text-main)',
  padding: '12px 14px',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '13px',
  fontFamily: 'inherit'
};



const btnStyle = {
  background: 'var(--accent)',
  color: '#0f1115',
  border: 'none',
  padding: '12px 20px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none'
};

const navBtnStyle = {
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid var(--panel-border)',
  color: 'var(--accent)',
  borderRadius: '4px',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer'
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle = {
  width: '90%',
  maxWidth: '400px',
  background: '#0a0a0a',
  margin: 0
};
