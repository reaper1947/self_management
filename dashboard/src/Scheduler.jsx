import { useState, useEffect } from 'react';

export default function Scheduler() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch tasks on load
  useEffect(() => {
    fetch('/api/data/tasks')
      .then(res => res.json())
      .then(data => {
        if (data.value) setTasks(data.value);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load tasks", err);
        setLoading(false);
      });
  }, []);

  // Sync tasks to backend
  const saveTasks = (newTasks) => {
    setTasks(newTasks);
    fetch('/api/data/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newTasks })
    }).catch(err => console.error("Failed to save tasks", err));
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
    setPriority('medium');
    setDeadline('');
  };

  const toggleTask = (id) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks(newTasks);
  };

  const deleteTask = (id) => {
    const newTasks = tasks.filter(t => t.id !== id);
    saveTasks(newTasks);
  };

  const getPriorityColor = (p) => {
    if (p === 'high') return '#ef5350';
    if (p === 'medium') return '#ffc107';
    return '#8bc34a';
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const pVal = { high: 3, medium: 2, low: 1 };
    return pVal[b.priority] - pVal[a.priority];
  });

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="header" style={{ marginBottom: '24px' }}>
        <h1>Task Manager</h1>
        <p>Organize your to-dos with priorities and deadlines.</p>
      </div>

      <form onSubmit={addTask} style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
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
          style={inputStyle}
          style={{ ...inputStyle, flex: 1 }}
        />
        <select 
          value={priority} 
          onChange={(e) => setPriority(e.target.value)}
          style={{ ...inputStyle, width: '120px' }}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        <input 
          type="date" 
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={{ ...inputStyle, width: '140px' }}
        />
        <button type="submit" style={btnStyle}>Add Task</button>
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
                padding: '16px',
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
                <div style={{ fontSize: '15px', fontWeight: 500 }}>{task.text}</div>
                {task.deadline && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    📅 {task.deadline}
                  </div>
                )}
              </div>

              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
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
                onMouseOver={(e) => e.currentTarget.style.color = '#ef5350'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid var(--panel-border)',
  color: 'var(--text-main)',
  padding: '10px 14px',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '14px',
  fontFamily: 'inherit'
};

const btnStyle = {
  background: 'var(--accent)',
  color: '#0f1115',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none'
};
