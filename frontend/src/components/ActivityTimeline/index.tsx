import React from 'react';
import { Activity, ActivityType } from '../../types/index.js';
import { formatDateTime } from '../../utils/format.js';
import { Loading } from '../common/Loading.js';
import { ErrorState } from '../common/ErrorState.js';
import styles from './ActivityTimeline.module.css';

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
  if (loading) return <Loading message="Loading audit timeline..." />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  if (activities.length === 0) {
    return (
      <div className={styles.emptyState}>
        No activities recorded yet for this lead.
      </div>
    );
  }

  return (
    <div className={styles.timelineWrapper}>
      {/* Vertical line connecting entries */}
      <div className={styles.connectingLine} />

      <div className={styles.timelineList}>
        {activities.map((item) => {
          const cfg = activityConfig[item.type] || {
            icon: '📌',
            color: '#475569',
            bg: '#f1f5f9',
          };

          return (
            <div key={item.id} className={styles.timelineItem}>
              {/* Icon badge */}
              <div
                className={styles.badge}
                style={{
                  backgroundColor: cfg.bg,
                  border: `2px solid ${cfg.color}`,
                }}
              >
                {cfg.icon}
              </div>

              {/* Content Card */}
              <div className={styles.contentCard}>
                <div className={styles.cardHeader}>
                  <span
                    className={styles.activityTypeTag}
                    style={{ color: cfg.color }}
                  >
                    {item.type.replace('_', ' ')}
                  </span>
                  <span className={styles.timestamp}>
                    {formatDateTime(item.created_at)}
                  </span>
                </div>

                <p className={styles.description}>
                  {item.description}
                </p>

                <div className={styles.metaRow}>
                  <span>
                    Actor: <strong className={styles.actor}>{item.actor}</strong>
                  </span>
                  <span className={styles.seq}>Seq #{item.id}</span>
                </div>

                {item.metadata && (
                  <details className={styles.metadataDetails}>
                    <summary className={styles.metadataSummary}>Metadata Details</summary>
                    <pre className={styles.metadataPre}>
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
