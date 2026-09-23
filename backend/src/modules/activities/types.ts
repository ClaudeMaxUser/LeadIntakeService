export type ActivityType = 'LEAD_CREATED' | 'LEAD_UPDATED' | 'STATUS_CHANGED' | 'DUPLICATE_IGNORED';

export interface ActivityModel {
  id: number;
  lead_id: string;
  type: ActivityType;
  description: string;
  metadata: Record<string, any> | null;
  actor: string;
  created_at: Date;
}

export interface CreateActivityInput {
  leadId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, any> | null;
  actor: 'system:webhook' | 'user:dashboard';
}
