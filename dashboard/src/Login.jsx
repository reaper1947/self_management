import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          onLogin();
        } else {
          setError('ACCESS DENIED');
        }
      })
      .catch(() => setError('SERVER ERROR'));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#111',
      color: '#39ff14',
      fontFamily: '"Press Start 2P", monospace',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ color: '#ff00ff', textShadow: '4px 4px #00ffff', marginBottom: '40px', lineHeight: '1.5' }}>
        [ PLAYER 1: PETER ]<br/>SECURE TERMINAL
      </h1>
      
      <div style={{
        background: '#222',
        border: '6px solid #fff',
        boxShadow: '12px 12px 0px #00ffff',
        padding: '40px',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{ color: '#ffff00', fontSize: '16px', marginBottom: '30px' }}>INSERT PASSWORD TO CONTINUE</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: '#000',
              border: '4px solid #555',
              color: '#39ff14',
              fontFamily: 'inherit',
              fontSize: '16px',
              textAlign: 'center',
              outline: 'none',
              marginBottom: '20px'
            }}
            placeholder="****"
            autoFocus
          />
          
          {error && <div style={{ color: '#ff0055', marginBottom: '20px', animation: 'blink 1s infinite' }}>{error}</div>}
          
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: '#ff00ff',
              color: '#fff',
              border: '4px solid #fff',
              fontFamily: 'inherit',
              fontSize: '14px',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            START
          </button>
        </form>
      </div>
    </div>
  );
}
