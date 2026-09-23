import React, { useState } from "react";
import { Activity, Lead, LeadStatus } from "../../types/index.js";
import { formatDateTime } from "../../utils/format.js";
import { ActivityTimeline } from "../ActivityTimeline/index.js";
import { StatusBadge } from "../StatusBadge/index.js";
import styles from "./LeadDetail.module.css";

interface LeadDetailProps {
  lead: Lead;
  activities: Activity[];
  activitiesLoading: boolean;
  activitiesError: string | null;
  onUpdateStatus: (newStatus: LeadStatus, note?: string) => Promise<void>;
  updatingStatus: boolean;
  updateError: string | null;
  onUpdateLead?: (updates: {
    full_name?: string;
    email?: string | null;
    phone?: string | null;
  }) => Promise<void>;
  updatingLead?: boolean;
  leadUpdateError?: string | null;
  onRefreshActivities: () => void;
}

const AllowedTransitions: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED", "LOST"],
  CONTACTED: ["QUALIFIED", "LOST"],
  QUALIFIED: ["CONVERTED", "LOST"],
  CONVERTED: [],
  LOST: [],
};

export const LeadDetail: React.FC<LeadDetailProps> = ({
  lead,
  activities,
  activitiesLoading,
  activitiesError,
  onUpdateStatus,
  updatingStatus,
  updateError,
  onUpdateLead,
  updatingLead = false,
  leadUpdateError = null,
  onRefreshActivities,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(lead.status);
  const [statusNote, setStatusNote] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [rawOpen, setRawOpen] = useState<boolean>(false);

  // Edit Lead Profile state
  const [isEditingLead, setIsEditingLead] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(lead.full_name);
  const [editEmail, setEditEmail] = useState<string>(lead.email || "");
  const [editPhone, setEditPhone] = useState<string>(lead.phone || "");
  const [formValidationError, setFormValidationError] = useState<string | null>(
    null,
  );

  const allowedNext = AllowedTransitions[lead.status] || [];
  const isTerminal = allowedNext.length === 0;

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus === lead.status) return;

    await onUpdateStatus(selectedStatus, statusNote.trim() || undefined);
    setIsConfirming(false);
    setStatusNote("");
  };

  const startEditing = () => {
    setEditName(lead.full_name);
    setEditEmail(lead.email || "");
    setEditPhone(lead.phone || "");
    setFormValidationError(null);
    setIsEditingLead(true);
  };

  const cancelEditing = () => {
    setIsEditingLead(false);
    setFormValidationError(null);
  };

  const handleLeadEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName) {
      setFormValidationError("Full name is required.");
      return;
    }
    if (!trimmedEmail && !trimmedPhone) {
      setFormValidationError(
        "At least one contact method (email or phone) is required.",
      );
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormValidationError("Please enter a valid email address.");
      return;
    }
    if (trimmedPhone && !/^[+0-9\s\-()]+$/.test(trimmedPhone)) {
      setFormValidationError("Please enter a valid phone number (digits, +, spaces, hyphens).");
      return;
    }

    if (onUpdateLead) {
      try {
        await onUpdateLead({
          full_name: trimmedName,
          email: trimmedEmail || null,
          phone: trimmedPhone || null,
        });
        setIsEditingLead(false);
      } catch {
        // leadUpdateError prop handles server error display
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Column: Lead Information & Status Control */}
      <div className={styles.leftCol}>
        {/* Main Details Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.leadName}>{lead.full_name}</h2>
              <span className={styles.leadId}>ID: {lead.id}</span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <StatusBadge status={lead.status} />
              {!isEditingLead && onUpdateLead && (
                <button
                  type="button"
                  onClick={startEditing}
                  className={styles.btnEdit}
                  title="Edit lead contact details"
                >
                  ✏️ Edit Details
                </button>
              )}
            </div>
          </div>

          {(leadUpdateError || formValidationError) && isEditingLead && (
            <div className={styles.errorMessage}>
              ⚠️ {formValidationError || leadUpdateError}
            </div>
          )}

          {isEditingLead ? (
            <form onSubmit={handleLeadEditSubmit} className={styles.editForm}>
              <div>
                <label className={styles.fieldLabel}>Full Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={updatingLead}
                  className={styles.textInput}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={updatingLead}
                  className={styles.textInput}
                  placeholder="e.g. jane@example.com"
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={updatingLead}
                  className={styles.textInput}
                  placeholder="e.g. +1234567890"
                />
              </div>

              <div className={styles.editActions}>
                <button
                  type="submit"
                  disabled={updatingLead}
                  className={styles.btnSuccess}
                >
                  {updatingLead ? "Saving Changes..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={updatingLead}
                  className={styles.btnSecondary}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.infoGrid}>
              <div>
                <div className={styles.fieldLabel}>Email Address</div>
                <div className={styles.fieldValue}>{lead.email || "—"}</div>
              </div>

              <div>
                <div className={styles.fieldLabel}>Phone Number</div>
                <div className={styles.fieldValue}>{lead.phone || "—"}</div>
              </div>

              <div>
                <div className={styles.fieldLabel}>Source</div>
                <div className={styles.fieldValue}>{lead.source}</div>
              </div>

              <div>
                <div className={styles.fieldLabel}>
                  Meta Lead ID (leadgen_id)
                </div>
                <div className={styles.fieldValue}>
                  {lead.external_lead_id || "—"}
                </div>
              </div>

              <div>
                <div className={styles.fieldLabel}>Page ID</div>
                <div className={styles.fieldValue}>{lead.page_id || "—"}</div>
              </div>

              <div>
                <div className={styles.fieldLabel}>Form ID</div>
                <div className={styles.fieldValue}>{lead.form_id || "—"}</div>
              </div>

              <div>
                <div className={styles.fieldLabel}>Ad ID</div>
                <div className={styles.fieldValue}>{lead.ad_id || "—"}</div>
              </div>

              <div>
                <div className={styles.fieldLabel}>Created At</div>
                <div className={styles.fieldValue}>
                  {formatDateTime(lead.created_at)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Transition Control Card */}
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Update Pipeline Status</h3>

          {updateError && (
            <div className={styles.errorMessage}>⚠️ {updateError}</div>
          )}

          {isTerminal ? (
            <div
              style={{
                fontSize: "0.875rem",
                color: "#64748b",
                padding: "0.5rem 0",
              }}
            >
              This lead is in terminal status <strong>{lead.status}</strong> and
              cannot be transitioned further.
            </div>
          ) : (
            <form onSubmit={handleStatusSubmit} className={styles.statusForm}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "0.25rem",
                  }}
                >
                  Next Stage:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as LeadStatus)
                  }
                  disabled={updatingStatus}
                  className={styles.selectInput}
                >
                  <option value={lead.status}>{lead.status} (Current)</option>
                  {allowedNext.map((st) => (
                    <option key={st} value={st}>
                      → {st}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStatus !== lead.status && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      color: "#475569",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Transition Note (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spoke on phone, budget confirmed"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    disabled={updatingStatus}
                    className={styles.textInput}
                  />
                </div>
              )}

              {selectedStatus !== lead.status && !isConfirming && (
                <button
                  type="button"
                  onClick={() => setIsConfirming(true)}
                  disabled={updatingStatus}
                  className={styles.btnPrimary}
                >
                  Confirm Transition to {selectedStatus}
                </button>
              )}

              {isConfirming && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="submit"
                    disabled={updatingStatus}
                    className={styles.btnSuccess}
                  >
                    {updatingStatus ? "Updating..." : "Yes, Update Status"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirming(false);
                      setSelectedStatus(lead.status);
                    }}
                    disabled={updatingStatus}
                    className={styles.btnSecondary}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Collapsible Raw Webhook Payload */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "0.5rem",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setRawOpen(!rawOpen)}
            className={styles.rawPayloadHeader}
          >
            <span>Raw Webhook Payload (JSON)</span>
            <span>{rawOpen ? "▲ Hide" : "▼ View"}</span>
          </button>

          {rawOpen && (
            <pre className={styles.rawCode}>
              {JSON.stringify(lead.raw_payload, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Right Column: Activity Timeline */}
      <div>
        <div className={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Activity Timeline & Audit Trail
            </h3>
            <button
              onClick={onRefreshActivities}
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                cursor: "pointer",
              }}
            >
              Refresh 🔄
            </button>
          </div>

          <ActivityTimeline
            activities={activities}
            loading={activitiesLoading}
            error={activitiesError}
            onRetry={onRefreshActivities}
          />
        </div>
      </div>
    </div>
  );
};
