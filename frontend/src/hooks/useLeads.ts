import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';
import { Lead, LeadsFilterParams, LeadsResponse } from '../types/index.js';

export function useLeads(filters: LeadsFilterParams) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      if (filters.page) searchParams.set('page', filters.page.toString());
      if (filters.limit) searchParams.set('limit', filters.limit.toString());
      if (filters.status) searchParams.set('status', filters.status);
      if (filters.search) searchParams.set('search', filters.search);
      if (filters.sortBy) searchParams.set('sortBy', filters.sortBy);
      if (filters.sortOrder) searchParams.set('sortOrder', filters.sortOrder);

      const qs = searchParams.toString();
      const endpoint = `/leads${qs ? `?${qs}` : ''}`;
      const res = await apiClient<LeadsResponse>(endpoint);

      setLeads(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.limit, filters.status, filters.search, filters.sortBy, filters.sortOrder]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, pagination, loading, error, refetch: fetchLeads };
}

