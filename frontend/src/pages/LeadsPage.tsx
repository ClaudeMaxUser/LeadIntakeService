import React, { useState } from 'react';
import { LeadList } from '../components/LeadList/index.js';
import { useLeads } from '../hooks/useLeads.js';
import { LeadsFilterParams } from '../types/index.js';

export const LeadsPage: React.FC = () => {
  const [filters, setFilters] = useState<LeadsFilterParams>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { leads, pagination, loading, error, refetch } = useLeads(filters);

  const handleFilterChange = (newFilters: Partial<LeadsFilterParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
            Inbound Leads
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Live leads ingested via Meta Lead Ads Webhook
          </p>
        </div>

        <button
          onClick={refetch}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>🔄</span> Refresh Leads
        </button>
      </div>

      <LeadList
        leads={leads}
        pagination={pagination}
        loading={loading}
        error={error}
        filters={filters}
        onFilterChange={handleFilterChange}
        onRetry={refetch}
      />
    </div>
  );
};

