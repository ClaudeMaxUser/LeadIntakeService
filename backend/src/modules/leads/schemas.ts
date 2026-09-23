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

export const UpdateLeadSchema = z
  .object({
    full_name: z
      .string()
      .transform((s) => s.replace(/\0/g, '').trim())
      .pipe(z.string().min(1, 'Full name cannot be empty').max(255, 'Full name must not exceed 255 characters'))
      .optional(),
    email: z
      .string()
      .transform((s) => s.replace(/\0/g, '').trim().toLowerCase())
      .pipe(z.string().email('Invalid email address').max(255, 'Email must not exceed 255 characters'))
      .optional()
      .nullable(),
    phone: z
      .string()
      .transform((s) => s.replace(/\0/g, '').trim())
      .pipe(
        z
          .string()
          .min(3, 'Phone number must be at least 3 characters')
          .max(50, 'Phone number must not exceed 50 characters')
          .regex(/^[+0-9\s\-()]+$/, 'Phone number contains invalid characters')
      )
      .optional()
      .nullable(),
  })
  .strict()
  .refine(
    (data) => data.full_name !== undefined || data.email !== undefined || data.phone !== undefined,
    {
      message: 'At least one field (full_name, email, phone) must be provided for update',
    }
  );

export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;

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
