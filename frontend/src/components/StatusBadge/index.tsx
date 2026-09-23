import React from 'react';
import { LeadStatus } from '../../types/index.js';

interface StatusBadgeProps {
  status: LeadStatus;
}

const statusConfig: Record<
  LeadStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  NEW: {
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
    label: 'New',
  },
  CONTACTED: {
    bg: '#fefce8',
    text: '#a16207',
    border: '#fef08a',
    label: 'Contacted',
  },
  QUALIFIED: {
    bg: '#f0fdf4',
    text: '#15803d',
    border: '#bbf7d0',
    label: 'Qualified',
  },
  CONVERTED: {
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
    label: 'Converted',
  },
  LOST: {
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#fecaca',
    label: 'Lost',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || {
    bg: '#f1f5f9',
    text: '#475569',
    border: '#cbd5e1',
    label: status,
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.6rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
      }}
    >
      {config.label}
    </span>
  );
};

