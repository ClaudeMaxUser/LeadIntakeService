import React from 'react';
import { Activity, ActivityType } from '../../types/index.js';
import { Loading } from '../common/Loading.js';
import { ErrorState } from '../common/ErrorState.js';

interface ActivityTimelineProps {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

const activityConfig: Record<
  ActivityType,
  { icon: string; color: string; bg: string }
> = {
  LEAD_CREATED: {
    icon: '✨',
    color: '#2563eb',
    bg: '#eff6ff',
  },
  LEAD_UPDATED: {
    icon: '📝',
    color: '#0284c7',
    bg: '#f0f9ff',
  },
  STATUS_CHANGED: {
    icon: '🔄',
    color: '#059669',
    bg: '#ecfdf5',
  },
  DUPLICATE_IGNORED: {
    icon: '🛡️',
    color: '#d97706',
    bg: '#fffbeb',
  },
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  loading,
  error,
  onRetry,
}) => {
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

  if (loading) return <Loading message="Loading audit timeline..." />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  if (activities.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        No activities recorded yet for this lead.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
      {/* Vertical line connecting entries */}
      <div
        style={{
          position: 'absolute',
          left: '19px',
          top: '15px',
          bottom: '15px',
          width: '2px',
          backgroundColor: '#e2e8f0',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {activities.map((item) => {
          const cfg = activityConfig[item.type] || {
            icon: '📌',
            color: '#475569',
            bg: '#f1f5f9',
          };

          return (
            <div
              key={item.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
              }}
            >
              {/* Icon badge */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: cfg.bg,
                  border: `2px solid ${cfg.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  zIndex: 2,
                  flexShrink: 0,
                }}
              >
                {cfg.icon}
              </div>

              {/* Content Card */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '0.85rem 1rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: cfg.color,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.type.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {formatDate(item.created_at)}
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 500, margin: '0.25rem 0' }}>
                  {item.description}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.4rem',
                    fontSize: '0.75rem',
                    color: '#64748b',
                  }}
                >
                  <span>Actor: <strong style={{ color: '#475569' }}>{item.actor}</strong></span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Seq #{item.id}</span>
                </div>

                {item.metadata && (
                  <details style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                    <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Metadata Details</summary>
                    <pre
                      style={{
                        backgroundColor: '#f8fafc',
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        marginTop: '0.25rem',
                        overflowX: 'auto',
                        fontSize: '0.7rem',
                      }}
                    >
                      {JSON.stringify(item.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

