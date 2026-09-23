import { z } from 'zod';
import { ExtractedLeadData, MetaWebhookPayload } from './types.js';

export const MetaWebhookPayloadSchema = z
  .object({
    leadgen_id: z.string().optional(),
    page_id: z.string().optional(),
    form_id: z.string().optional(),
    ad_id: z.string().optional(),
    created_time: z.union([z.string(), z.number()]).optional(),
    field_data: z
      .array(
        z.object({
          name: z.string(),
          values: z.array(z.string()).default([]),
        })
      )
      .optional(),
    // Also support nested Meta webhook wrapper shape: { entry: [{ changes: [{ value: ... }] }] }
    entry: z
      .array(
        z.object({
          id: z.string().optional(),
          time: z.number().optional(),
          changes: z
            .array(
              z.object({
                field: z.string().optional(),
                value: z.record(z.any()).optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
  })
  .passthrough();

export function normalizeMetaPayload(raw: any): MetaWebhookPayload | null {
  // If already in flat format with leadgen_id
  if (raw.leadgen_id && Array.isArray(raw.field_data)) {
    return raw as MetaWebhookPayload;
  }

  // If nested in entry[0].changes[0].value
  if (Array.isArray(raw.entry) && raw.entry.length > 0) {
    const entry = raw.entry[0];
    if (Array.isArray(entry.changes) && entry.changes.length > 0) {
      const val = entry.changes[0]?.value;
      if (val && (val.leadgen_id || val.id)) {
        return {
          leadgen_id: String(val.leadgen_id || val.id),
          page_id: val.page_id ? String(val.page_id) : undefined,
          form_id: val.form_id ? String(val.form_id) : undefined,
          ad_id: val.ad_id ? String(val.ad_id) : undefined,
          created_time: val.created_time ? String(val.created_time) : undefined,
          field_data: Array.isArray(val.field_data) ? val.field_data : [],
        };
      }
    }
  }

  // If leadgen_id at root even without field_data
  if (raw.leadgen_id) {
    return {
      leadgen_id: String(raw.leadgen_id),
      page_id: raw.page_id ? String(raw.page_id) : undefined,
      form_id: raw.form_id ? String(raw.form_id) : undefined,
      ad_id: raw.ad_id ? String(raw.ad_id) : undefined,
      created_time: raw.created_time ? String(raw.created_time) : undefined,
      field_data: Array.isArray(raw.field_data) ? raw.field_data : [],
    };
  }

  return null;
}

export function extractLeadData(payload: MetaWebhookPayload): {
  data?: ExtractedLeadData;
  missingFields?: string[];
} {
  const fieldMap: Record<string, string> = {};
  if (Array.isArray(payload.field_data)) {
    for (const item of payload.field_data) {
      if (item.name && Array.isArray(item.values) && item.values.length > 0) {
        fieldMap[item.name.toLowerCase()] = item.values[0].trim();
      }
    }
  }

  // Support full_name, name, or combining first_name + last_name
  let fullName = fieldMap['full_name'] || fieldMap['name'] || null;
  if (!fullName && (fieldMap['first_name'] || fieldMap['last_name'])) {
    fullName = `${fieldMap['first_name'] || ''} ${fieldMap['last_name'] || ''}`.trim();
  }

  const email =
    fieldMap['email'] ||
    fieldMap['email_address'] ||
    fieldMap['work_email'] ||
    null;

  const phone =
    fieldMap['phone_number'] ||
    fieldMap['phone'] ||
    fieldMap['mobile_phone'] ||
    fieldMap['phone_no'] ||
    null;

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
