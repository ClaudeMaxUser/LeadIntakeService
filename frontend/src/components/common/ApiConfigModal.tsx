import React, { useState, useEffect } from "react";
import { getApiUrl, getApiKey, normalizeApiUrl } from "../../api/client.js";

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiUrl(getApiUrl());
      setApiKey(getApiKey());
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMsg({ type: "info", text: "Testing connection to /health..." });
    try {
      const fullUrl = normalizeApiUrl(apiUrl);
      const res = await fetch(`${fullUrl}/health`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey.trim()}` } : {},
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setStatusMsg({
          type: "success",
          text: `Connected successfully! Database status: ${data?.database || "ok"}`,
        });
      } else {
        setStatusMsg({
          type: "error",
          text: `HTTP Error: ${res.status} ${res.statusText}`,
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: `Connection failed: ${err.message}. Check URL & CORS.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const fullUrl = normalizeApiUrl(apiUrl);
    const cleanKey = apiKey.trim();
    localStorage.setItem("lead_intake_api_url", fullUrl);
    localStorage.setItem("lead_intake_api_key", cleanKey);
    onClose();
    window.location.reload();
  };

  const handleReset = () => {
    localStorage.removeItem("lead_intake_api_url");
    localStorage.removeItem("lead_intake_api_key");
    onClose();
    window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "0.75rem",
          maxWidth: "520px",
          width: "100%",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>⚙️</span>
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              API Connection Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.25rem",
              color: "#64748b",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "0.35rem",
              }}
            >
              Backend API URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://your-backend.up.railway.app"
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginTop: "0.25rem",
                display: "block",
              }}
            >
              The public URL of your deployed Express backend API (e.g. on
              Railway).
            </span>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "0.35rem",
              }}
            >
              API Key (Bearer Token)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API_KEY matching your backend"
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #cbd5e1",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {statusMsg && (
            <div
              style={{
                padding: "0.65rem 0.85rem",
                borderRadius: "0.375rem",
                fontSize: "0.825rem",
                backgroundColor:
                  statusMsg.type === "success"
                    ? "#ecfdf5"
                    : statusMsg.type === "error"
                      ? "#fef2f2"
                      : "#f0f9ff",
                color:
                  statusMsg.type === "success"
                    ? "#065f46"
                    : statusMsg.type === "error"
                      ? "#991b1b"
                      : "#0369a1",
                border: `1px solid ${
                  statusMsg.type === "success"
                    ? "#a7f3d0"
                    : statusMsg.type === "error"
                      ? "#fecaca"
                      : "#bae6fd"
                }`,
              }}
            >
              {statusMsg.text}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "1rem 1.5rem",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              fontSize: "0.8rem",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Reset to Default
          </button>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              style={{
                padding: "0.5rem 0.85rem",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "0.375rem",
                fontSize: "0.825rem",
                fontWeight: 500,
                color: "#334155",
                cursor: testing ? "not-allowed" : "pointer",
              }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#2563eb",
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.825rem",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Save & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
