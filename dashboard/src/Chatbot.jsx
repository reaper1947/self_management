import React, { useState, useRef, useEffect } from 'react';

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'UPLINK ESTABLISHED. AWAITING INPUT.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages.filter(m => m.role !== 'error') })
    })
      .then(res => res.json())
      .then(data => {
        setIsLoading(false);
        if (data.choices && data.choices[0]) {
          setMessages(prev => [...prev, data.choices[0].message]);
        } else if (data.error) {
          setMessages(prev => [...prev, { role: 'error', content: `[ERROR]: ${data.error}` }]);
        }
      })
      .catch(err => {
        setIsLoading(false);
        setMessages(prev => [...prev, { role: 'error', content: '[CONNECTION LOST]' }]);
      });
  };

  return (
    <div style={{ height: '100%', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="header" style={{ marginBottom: '20px' }}>
        <h1>AI Terminal</h1>
        <p>Connected to OpenRouter: google/gemma-4-31b-it:free</p>
      </div>

      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: 0 }}>
        
        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#050505', border: '4px solid var(--panel-border)', marginBottom: '16px' }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              marginBottom: '20px',
              textAlign: msg.role === 'user' ? 'right' : 'left'
            }}>
              <div style={{
                fontSize: '10px',
                color: msg.role === 'user' ? 'var(--accent-hover)' : (msg.role === 'error' ? '#ff0055' : 'var(--text-muted)'),
                marginBottom: '8px'
              }}>
                {msg.role === 'user' ? 'PLAYER 1' : (msg.role === 'error' ? 'SYSTEM ERROR' : 'AI_CORE')}
              </div>
              <div style={{
                display: 'inline-block',
                padding: '12px',
                background: msg.role === 'user' ? '#112233' : '#221111',
                border: `2px solid ${msg.role === 'user' ? 'var(--accent-hover)' : 'var(--accent)'}`,
                color: 'var(--text-main)',
                fontSize: '12px',
                lineHeight: '1.6',
                textAlign: 'left',
                maxWidth: '80%',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>AI_CORE</div>
              <div style={{ color: 'var(--accent)', animation: 'blink 1s infinite' }}>PROCESSING...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ENTER COMMAND..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#000',
              border: '4px solid var(--panel-border)',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '16px 32px',
              backgroundColor: 'var(--accent)',
              color: '#000',
              border: '4px solid var(--panel-border)',
              fontFamily: 'inherit',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}
