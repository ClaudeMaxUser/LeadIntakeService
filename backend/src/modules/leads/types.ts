export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';

export interface LeadModel {
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
  created_at: Date;
  updated_at: Date;
}

export type { ActivityModel, ActivityType } from '../activities/types.js';
export type { UpdateLeadInput } from './schemas.js';

export interface GetLeadsQuery {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'fullName' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
