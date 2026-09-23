import { useState } from 'react';
import { apiClient } from '../api/client.js';
import { Lead, LeadStatus } from '../types/index.js';

export function useUpdateStatus() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (
    leadId: string,
    status: LeadStatus,
    note?: string
  ): Promise<Lead | null> => {
    setUpdating(true);
    setError(null);
    try {
      const updated = await apiClient<Lead>(`/leads/${leadId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      });
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return { updateStatus, updating, error };
}

