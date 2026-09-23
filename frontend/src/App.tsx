import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { LeadsPage } from './pages/LeadsPage.js';
import { LeadDetailPage } from './pages/LeadDetailPage.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
        <header
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '1rem 2rem',
            borderBottom: '1px solid #1e293b',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                L
              </div>
              <div>
                <Link
                  to="/leads"
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    textDecoration: 'none',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Lead Intake Service
                </Link>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Meta Ads Ingestion & Audit Trail
                </div>
              </div>
            </div>

            <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link
                to="/leads"
                style={{
                  fontSize: '0.875rem',
                  color: '#cbd5e1',
                  textDecoration: 'none',
                  fontWeight: 500,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.25rem',
                  backgroundColor: '#1e293b',
                }}
              >
                📋 All Leads
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', width: '100%', flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/leads" replace />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="*" element={<Navigate to="/leads" replace />} />
          </Routes>
        </main>

        <footer
          style={{
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            padding: '1.5rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#64748b',
          }}
        >
          Lead Intake Service — Production Ready Webhook Ingestion & Audit Pipeline
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
