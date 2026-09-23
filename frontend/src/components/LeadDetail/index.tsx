import React, { useState } from 'react';
import { Activity, Lead, LeadStatus } from '../../types/index.js';
import { ActivityTimeline } from '../ActivityTimeline/index.js';
import { StatusBadge } from '../StatusBadge/index.js';

interface LeadDetailProps {
  lead: Lead;
  activities: Activity[];
  activitiesLoading: boolean;
  activitiesError: string | null;
  onUpdateStatus: (newStatus: LeadStatus, note?: string) => Promise<void>;
  updatingStatus: boolean;
  updateError: string | null;
  onRefreshActivities: () => void;
}

const AllowedTransitions: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['CONVERTED', 'LOST'],
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
  onRefreshActivities,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(lead.status);
  const [statusNote, setStatusNote] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [rawOpen, setRawOpen] = useState<boolean>(false);

  const allowedNext = AllowedTransitions[lead.status] || [];
  const isTerminal = allowedNext.length === 0;

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus === lead.status) return;

    await onUpdateStatus(selectedStatus, statusNote.trim() || undefined);
    setIsConfirming(false);
    setStatusNote('');
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
      {/* Left Column: Lead Information & Status Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Main Details Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '0.75rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
                {lead.full_name}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                ID: {lead.id}
              </span>
            </div>
            <StatusBadge status={lead.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Email Address
              </label>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{lead.email || '—'}</div>
            </div>

            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Phone Number
              </label>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{lead.phone || '—'}</div>
            </div>

            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Source
              </label>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{lead.source}</div>
            </div>

            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Meta Lead ID (leadgen_id)
              </label>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{lead.external_lead_id || '—'}</div>
            </div>

            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Page ID
              </label>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{lead.page_id || '—'}</div>
            </div>

            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Form ID
              </label>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{lead.form_id || '—'}</div>
            </div>

            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Ad ID
              </label>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{lead.ad_id || '—'}</div>
            </div>

            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Created At
              </label>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{formatDate(lead.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Status Transition Control Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#1e293b' }}>
            Update Pipeline Status
          </h3>

          {updateError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                padding: '0.6rem 0.8rem',
                borderRadius: '0.375rem',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                border: '1px solid #fecaca',
              }}
            >
              ⚠️ {updateError}
            </div>
          )}

          {isTerminal ? (
            <div style={{ fontSize: '0.875rem', color: '#64748b', padding: '0.5rem 0' }}>
              This lead is in terminal status <strong>{lead.status}</strong> and cannot be transitioned further.
            </div>
          ) : (
            <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '0.25rem' }}>
                  Next Stage:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                  disabled={updatingStatus}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                  }}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '0.25rem' }}>
                    Transition Note (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spoke on phone, budget confirmed"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    disabled={updatingStatus}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              )}

              {selectedStatus !== lead.status && !isConfirming && (
                <button
                  type="button"
                  onClick={() => setIsConfirming(true)}
                  disabled={updatingStatus}
                  style={{
                    padding: '0.6rem 1rem',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    alignSelf: 'flex-start',
                  }}
                >
                  Confirm Transition to {selectedStatus}
                </button>
              )}

              {isConfirming && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={updatingStatus}
                    style={{
                      padding: '0.6rem 1rem',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    {updatingStatus ? 'Updating...' : 'Yes, Update Status'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirming(false);
                      setSelectedStatus(lead.status);
                    }}
                    disabled={updatingStatus}
                    style={{
                      padding: '0.6rem 1rem',
                      backgroundColor: '#e2e8f0',
                      color: '#334155',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
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
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setRawOpen(!rawOpen)}
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#334155',
            }}
          >
            <span>Raw Webhook Payload (JSON)</span>
            <span>{rawOpen ? '▲ Hide' : '▼ View'}</span>
          </button>

          {rawOpen && (
            <pre
              style={{
                padding: '1rem',
                margin: 0,
                fontSize: '0.75rem',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                overflowX: 'auto',
                lineHeight: 1.4,
              }}
            >
              {JSON.stringify(lead.raw_payload, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Right Column: Activity Timeline */}
      <div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
              Activity Timeline & Audit Trail
            </h3>
            <button
              onClick={onRefreshActivities}
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
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

