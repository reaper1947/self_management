import { useState, useEffect } from 'react';
import HabitTracker from './HabitTracker';
import Scheduler from './Scheduler';
import GymSchedule from './GymSchedule';
import Login from './Login';
import Home from './Home';
import Chatbot from './Chatbot';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.logged_in) setIsAuthenticated(true);
        else setIsAuthenticated(false);
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) return <div style={{ color: '#39ff14', padding: '20px', fontFamily: '"Press Start 2P"' }}>LOADING...</div>;
  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => setIsAuthenticated(false));
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    closeSidebar();
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9 }}
          onClick={closeSidebar}
        />
      )}
      
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span>PLAYER 1:</span> PETER
        </div>
        <div className="nav-menu">
          <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabClick('home')}>
            <span className="nav-icon">🏠</span> Home
          </div>
          <div className={`nav-item ${activeTab === 'habits' ? 'active' : ''}`} onClick={() => handleTabClick('habits')}>
            <span className="nav-icon">📈</span> Habit Tracker
          </div>
          <div className={`nav-item ${activeTab === 'scheduler' ? 'active' : ''}`} onClick={() => handleTabClick('scheduler')}>
            <span className="nav-icon">📅</span> Scheduler
          </div>
          <div className={`nav-item ${activeTab === 'gym' ? 'active' : ''}`} onClick={() => handleTabClick('gym')}>
            <span className="nav-icon">🏋️</span> Gym Plan
          </div>
          <div className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => handleTabClick('chat')}>
            <span className="nav-icon">🤖</span> AI Terminal
          </div>
          <div className="nav-item" onClick={handleLogout} style={{ marginTop: '20px', color: '#ff0055', border: '2px solid #ff0055' }}>
            <span className="nav-icon">🚪</span> Logout
          </div>
        </div>

        <div className="social-links">
          <a href="https://github.com/reaper1947" target="_blank" rel="noopener noreferrer" title="GitHub">
            <svg viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/in/taweeporn-maneesin-4052682b1/" target="_blank" rel="noopener noreferrer" title="LinkedIn">
            <svg viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </div>

      <div className="main-content">
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setIsSidebarOpen(true)}>☰</button>
          <h2><span>PLAYER 1:</span> PETER</h2>
        </div>

        {activeTab === 'home' && <Home />}
        {activeTab === 'habits' && (
          <div style={{ overflow: 'hidden', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
            <HabitTracker />
          </div>
        )}
        {activeTab === 'gym' && (
          <div style={{ overflow: 'hidden', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
            <GymSchedule />
          </div>
        )}
        <Chatbot isActive={activeTab === 'chat'} />
        {activeTab === 'scheduler' && (
          <Scheduler />
        )}
      </div>
    </div>
  );
}

export default App;
