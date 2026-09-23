export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';

export type ActivityType = 'LEAD_CREATED' | 'LEAD_UPDATED' | 'STATUS_CHANGED' | 'DUPLICATE_IGNORED';

export interface Lead {
  id: string;
  external_lead_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  page_id: string | null;
  form_id: string | null;
  ad_id: string | null;
  status: LeadStatus;
  raw_payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  lead_id: string;
  type: ActivityType;
  description: string;
  metadata: Record<string, any> | null;
  actor: string;
  created_at: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LeadsResponse {
  data: Lead[];
  pagination: PaginationInfo;
}

export interface LeadsFilterParams {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'fullName' | 'status';
  sortOrder?: 'asc' | 'desc';
}
