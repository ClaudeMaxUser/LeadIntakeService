import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { LeadsPage } from "./pages/LeadsPage.js";
import { LeadDetailPage } from "./pages/LeadDetailPage.js";
import { ErrorBoundary } from "./components/common/ErrorBoundary.js";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
        }}
      >
        <header
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            padding: "0.85rem 2rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 16px -2px rgba(0, 0, 0, 0.25)",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Brand Logo & Meta Tag */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Link
                  to="/leads"
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    color: "#ffffff",
                    textDecoration: "none",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Lead Intake Service
                </Link>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    backgroundColor: "rgba(59, 130, 246, 0.2)",
                    color: "#93c5fd",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Meta Ads
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  marginTop: "1px",
                }}
              >
                Cryptographic Webhook Ingestion & Immutable Audit Trail
              </div>
            </div>

            {/* Right Nav & Status Pill */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              {/* Live Webhook Receiver Pill */}
              <div
                style={{
                  display: "none",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  fontSize: "0.75rem",
                  color: "#6ee7b7",
                  fontWeight: 500,
                }}
                className="webhook-status-pill"
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                    boxShadow: "0 0 6px #10b981",
                  }}
                />
                <span>Receiver Live</span>
              </div>

              {/* Navigation Links */}
              <nav
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <Link
                  to="/leads"
                  style={{
                    fontSize: "0.85rem",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontWeight: 600,
                    padding: "0.45rem 0.9rem",
                    borderRadius: "6px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>📋</span> Leads Feed
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main
          style={{
            maxWidth: "1200px",
            margin: "2rem auto",
            padding: "0 1rem",
            width: "100%",
            flex: 1,
          }}
        >
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/leads" replace />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/leads/:id" element={<LeadDetailPage />} />
              <Route path="*" element={<Navigate to="/leads" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>

        <footer
          style={{
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "2rem 1.5rem 1.5rem",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "2rem",
            }}
          >
            {/* Brand & Overview */}
            <div style={{ flex: "1 1 300px", minWidth: "260px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.6rem",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#0f172a",
                  }}
                >
                  Lead Intake Service
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                Production-oriented Meta Lead Ads ingestion pipeline with
                cryptographic HMAC-SHA256 verification, transactional
                deduplication, and immutable audit activity trails.
              </p>
            </div>

            {/* Architecture Highlights */}
            <div style={{ flex: "1 1 240px" }}>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.75rem",
                }}
              >
                System Architecture
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "#64748b",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <li
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#10b981",
                      display: "inline-block",
                    }}
                  ></span>
                  <span>Webhook Receiver (HMAC-SHA256)</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                      display: "inline-block",
                    }}
                  ></span>
                  <span>Idempotent PostgreSQL Storage</span>
                </li>
                <li
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#8b5cf6",
                      display: "inline-block",
                    }}
                  ></span>
                  <span>Chronological Audit Trail</span>
                </li>
              </ul>
            </div>

            {/* Specifications & Runtime */}
            <div style={{ flex: "1 1 200px" }}>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.75rem",
                }}
              >
                Specifications
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: 500,
                  }}
                >
                  Node.js 22 LTS
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: 500,
                  }}
                >
                  Express 4 + TypeScript
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: 500,
                  }}
                >
                  React 18 + Vite
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: 500,
                  }}
                >
                  PostgreSQL 16
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Strip */}
          <div
            style={{
              borderTop: "1px solid #f1f5f9",
              padding: "1rem 1.5rem",
              textAlign: "center",
              fontSize: "0.75rem",
              color: "#94a3b8",
              backgroundColor: "#fafafa",
            }}
          >
            © {new Date().getFullYear()} Lead Intake Service — Enterprise Meta
            Webhook Ingestion & Inbound Lead Management
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
