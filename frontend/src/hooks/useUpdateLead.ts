import { useState } from 'react';
import { apiClient } from '../api/client.js';
import { Lead } from '../types/index.js';

export interface UpdateLeadInput {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
}

export function useUpdateLead() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLead = async (
    leadId: string,
    updates: UpdateLeadInput
  ): Promise<Lead | null> => {
    setUpdating(true);
    setError(null);
    try {
      const updated = await apiClient<Lead>(`/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update lead details');
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return { updateLead, updating, error };
}
