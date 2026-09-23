import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';
import { Activity } from '../types/index.js';

export function useActivities(leadId: string | undefined) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<Activity[]>(`/leads/${leadId}/activities`);
      setActivities(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load activity timeline');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, error, refetch: fetchActivities };
}

