import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';
import { Lead } from '../types/index.js';

export function useLead(id: string | undefined) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<Lead>(`/leads/${id}`);
      setLead(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  return { lead, setLead, loading, error, refetch: fetchLead };
}

