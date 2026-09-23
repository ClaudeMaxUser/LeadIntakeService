import React from 'react';

export const App: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          backgroundColor: '#1e293b',
          color: '#ffffff',
          padding: '1rem 2rem',
          borderBottom: '1px solid #334155',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Lead Intake Service</h1>
          <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Meta Ads Webhook Dashboard</span>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', flex: 1 }}>
        <p style={{ color: '#64748b' }}>Scaffolding initialized successfully.</p>
      </main>
    </div>
  );
};

export default App;
