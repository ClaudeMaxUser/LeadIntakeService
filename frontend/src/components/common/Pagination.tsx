import React from 'react';
import { PaginationInfo } from '../../types/index.js';

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  const { page, totalPages, total, limit } = pagination;

  if (totalPages <= 1) return null;

  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 0',
        marginTop: '1rem',
        borderTop: '1px solid #e2e8f0',
        fontSize: '0.875rem',
        color: '#64748b',
      }}
    >
      <div>
        Showing <span style={{ fontWeight: 600, color: '#1e293b' }}>{startIdx}</span> to{' '}
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{endIdx}</span> of{' '}
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{total}</span> leads
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{
            padding: '0.4rem 0.8rem',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            backgroundColor: page <= 1 ? '#f1f5f9' : '#ffffff',
            color: page <= 1 ? '#94a3b8' : '#1e293b',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: 500,
          }}
        >
          Previous
        </button>

        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 0.5rem',
            fontWeight: 600,
            color: '#1e293b',
          }}
        >
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{
            padding: '0.4rem 0.8rem',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            backgroundColor: page >= totalPages ? '#f1f5f9' : '#ffffff',
            color: page >= totalPages ? '#94a3b8' : '#1e293b',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            fontWeight: 500,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

