import { z } from 'zod';
import { ExtractedLeadData, MetaWebhookPayload } from './types.js';

export const MetaWebhookPayloadSchema = z.object({
  leadgen_id: z.string().min(1, 'leadgen_id is required'),
  page_id: z.string().optional(),
  form_id: z.string().optional(),
  ad_id: z.string().optional(),
  created_time: z.string().optional(),
  field_data: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()).default([]),
      })
    )
    .min(1, 'field_data must not be empty'),
}).passthrough(); // Allow unexpected extra fields

export function extractLeadData(payload: MetaWebhookPayload): {
  data?: ExtractedLeadData;
  missingFields?: string[];
} {
  const fieldMap: Record<string, string> = {};
  for (const item of payload.field_data) {
    if (item.name && item.values && item.values.length > 0) {
      fieldMap[item.name.toLowerCase()] = item.values[0].trim();
    }
  }

  const fullName = fieldMap['full_name'] || fieldMap['name'] || null;
  const email = fieldMap['email'] || null;
  const phone = fieldMap['phone_number'] || fieldMap['phone'] || null;

  const missingFields: string[] = [];
  if (!fullName) {
    missingFields.push('full_name');
  }
  if (!email && !phone) {
    missingFields.push('email or phone_number');
  }

  if (missingFields.length > 0) {
    return { missingFields };
  }

  return {
    data: {
      leadgen_id: payload.leadgen_id,
      full_name: fullName!,
      email,
      phone,
      page_id: payload.page_id || null,
      form_id: payload.form_id || null,
      ad_id: payload.ad_id || null,
    },
  };
}
