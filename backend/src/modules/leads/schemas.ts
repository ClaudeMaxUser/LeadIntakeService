import { z } from 'zod';

export const LeadStatusEnum = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']);

export const GetLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: LeadStatusEnum.optional(),
  search: z.string().trim().max(100).transform((s) => s.replace(/\0/g, '')).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'fullName', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const UpdateLeadStatusSchema = z.object({
  status: LeadStatusEnum,
  note: z.string().trim().max(500).optional(),
});

export const AllowedTransitions: Record<string, string[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['CONVERTED', 'LOST'],
  CONVERTED: [], // Terminal
  LOST: [], // Terminal
};

export function isValidTransition(currentStatus: string, nextStatus: string): boolean {
  if (currentStatus === nextStatus) return true; // No-op
  const allowed = AllowedTransitions[currentStatus] || [];
  return allowed.includes(nextStatus);
}
