import React, { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LeadList } from '../components/LeadList/index.js';
import { useLeads } from '../hooks/useLeads.js';
import { LeadsFilterParams, LeadStatus } from '../types/index.js';

const VALID_STATUSES: Set<string> = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']);
const VALID_SORT_BY: Set<string> = new Set(['createdAt', 'updatedAt', 'fullName', 'status']);
const VALID_SORT_ORDER: Set<string> = new Set(['asc', 'desc']);

export const LeadsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Synchronize state from URL search parameters with fallback defaults
  const filters: LeadsFilterParams = useMemo(() => {
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const statusParam = searchParams.get('status');
    const searchParam = searchParams.get('search');
    const sortByParam = searchParams.get('sortBy');
    const sortOrderParam = searchParams.get('sortOrder');

    const parsedPage = pageParam ? parseInt(pageParam, 10) : 1;
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 20;

    return {
      page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20,
      status: statusParam && VALID_STATUSES.has(statusParam) ? (statusParam as LeadStatus) : undefined,
      search: searchParam ? searchParam : undefined,
      sortBy: sortByParam && VALID_SORT_BY.has(sortByParam)
        ? (sortByParam as 'createdAt' | 'updatedAt' | 'fullName' | 'status')
        : 'createdAt',
      sortOrder: sortOrderParam && VALID_SORT_ORDER.has(sortOrderParam)
        ? (sortOrderParam as 'asc' | 'desc')
        : 'desc',
    };
  }, [searchParams]);

  const { leads, pagination, loading, error, refetch } = useLeads(filters);

  // Update URL search parameters when user updates filter controls
  const handleFilterChange = useCallback(
    (newFilters: Partial<LeadsFilterParams>) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          const merged = { ...filters, ...newFilters };

          if (merged.page && merged.page > 1) {
            nextParams.set('page', merged.page.toString());
          } else {
            nextParams.delete('page');
          }

          if (merged.limit && merged.limit !== 20) {
            nextParams.set('limit', merged.limit.toString());
          } else {
            nextParams.delete('limit');
          }

          if (merged.status) {
            nextParams.set('status', merged.status);
          } else {
            nextParams.delete('status');
          }

          if (merged.search && merged.search.trim()) {
            nextParams.set('search', merged.search);
          } else {
            nextParams.delete('search');
          }

          if (merged.sortBy && merged.sortBy !== 'createdAt') {
            nextParams.set('sortBy', merged.sortBy);
          } else {
            nextParams.delete('sortBy');
          }

          if (merged.sortOrder && merged.sortOrder !== 'desc') {
            nextParams.set('sortOrder', merged.sortOrder);
          } else {
            nextParams.delete('sortOrder');
          }

          return nextParams;
        },
        { replace: true }
      );
    },
    [filters, setSearchParams]
  );

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
