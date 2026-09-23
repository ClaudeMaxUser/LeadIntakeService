import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorState } from '../components/common/ErrorState.js';
import { Loading } from '../components/common/Loading.js';
import { LeadDetail } from '../components/LeadDetail/index.js';
import { useActivities } from '../hooks/useActivities.js';
import { useLead } from '../hooks/useLead.js';
import { useUpdateStatus } from '../hooks/useUpdateStatus.js';
import { LeadStatus } from '../types/index.js';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { lead, setLead, loading: leadLoading, error: leadError, refetch: refetchLead } = useLead(id);
  const {
    activities,
    loading: activitiesLoading,
    error: activitiesError,
    refetch: refetchActivities,
  } = useActivities(id);
  const { updateStatus, updating: updatingStatus, error: updateError } = useUpdateStatus();

  const handleUpdateStatus = async (newStatus: LeadStatus, note?: string) => {
    if (!id) return;
    const updated = await updateStatus(id, newStatus, note);
    if (updated) {
      setLead(updated);
      refetchActivities();
    }
  };

  if (leadLoading) {
    return <Loading message="Loading lead details and audit timeline..." />;
  }

  if (leadError || !lead) {
    return (
      <div>
        <Link to="/leads" style={{ color: '#2563eb', fontSize: '0.875rem' }}>
          ← Back to Leads
        </Link>
        <ErrorState message={leadError || 'Lead not found'} onRetry={refetchLead} />
      </div>
    );
  }

  return (
    <div>
      {/* Navigation breadcrumb */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/leads"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#475569',
            fontSize: '0.875rem',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <span>←</span> Back to all leads
        </Link>
      </div>

      <LeadDetail
        lead={lead}
        activities={activities}
        activitiesLoading={activitiesLoading}
        activitiesError={activitiesError}
        onUpdateStatus={handleUpdateStatus}
        updatingStatus={updatingStatus}
        updateError={updateError}
        onRefreshActivities={refetchActivities}
      />
    </div>
  );
};

