import { describe, it, expect } from 'vitest';
import { extractLeadData, MetaWebhookPayloadSchema, normalizeMetaPayload } from '../../src/modules/webhook/schemas.js';

describe('Webhook Payload Parsing & Extraction', () => {
  it('successfully parses and extracts lead data from valid Meta payload (flat format)', () => {
    const validPayload = {
      leadgen_id: '1234567890',
      page_id: '111',
      form_id: '222',
      ad_id: '333',
      created_time: '2026-09-20T10:00:00Z',
      field_data: [
        { name: 'full_name', values: ['Jane Doe'] },
        { name: 'email', values: ['jane@example.com'] },
        { name: 'phone_number', values: ['+1234567890'] },
      ],
    };

    const parseResult = MetaWebhookPayloadSchema.safeParse(validPayload);
    expect(parseResult.success).toBe(true);

    const normalized = normalizeMetaPayload(parseResult.data!);
    expect(normalized).not.toBeNull();

    const extraction = extractLeadData(normalized!);
    expect(extraction.missingFields).toBeUndefined();
    expect(extraction.data).toEqual({
      leadgen_id: '1234567890',
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1234567890',
      page_id: '111',
      form_id: '222',
      ad_id: '333',
    });
  });

  it('successfully parses and normalizes nested Meta webhook shape (entry/changes format)', () => {
    const nestedPayload = {
      object: 'page',
      entry: [
        {
          id: '111',
          time: 1440120384,
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: '9988776655',
                page_id: '111',
                form_id: '222',
                ad_id: '333',
                created_time: 1440120384,
                field_data: [
                  { name: 'FIRST_NAME', values: ['Alice'] },
                  { name: 'LAST_NAME', values: ['Smith'] },
                  { name: 'EMAIL', values: ['alice@example.com'] },
                ],
              },
            },
          ],
        },
      ],
    };

    const parseResult = MetaWebhookPayloadSchema.safeParse(nestedPayload);
    expect(parseResult.success).toBe(true);

    const normalized = normalizeMetaPayload(parseResult.data!);
    expect(normalized).not.toBeNull();
    expect(normalized?.leadgen_id).toBe('9988776655');

    const extraction = extractLeadData(normalized!);
    expect(extraction.data?.full_name).toBe('Alice Smith');
    expect(extraction.data?.email).toBe('alice@example.com');
  });

  it('allows extra payload fields without failing validation', () => {
    const payloadWithExtra = {
      leadgen_id: '12345',
      extra_meta_field: 'something',
      field_data: [{ name: 'name', values: ['John'] }, { name: 'email', values: ['john@test.com'] }],
    };

    const parseResult = MetaWebhookPayloadSchema.safeParse(payloadWithExtra);
    expect(parseResult.success).toBe(true);

    const normalized = normalizeMetaPayload(parseResult.data!);
    const extraction = extractLeadData(normalized!);
    expect(extraction.data?.full_name).toBe('John');
  });

  it('returns missingFields when full_name is missing', () => {
    const payloadWithoutName = {
      leadgen_id: '12345',
      field_data: [{ name: 'email', values: ['john@test.com'] }],
    };

    const parseResult = MetaWebhookPayloadSchema.safeParse(payloadWithoutName);
    expect(parseResult.success).toBe(true);

    const normalized = normalizeMetaPayload(parseResult.data!);
    const extraction = extractLeadData(normalized!);
    expect(extraction.missingFields).toContain('full_name');
  });

  it('returns missingFields when both email and phone are missing', () => {
    const payloadWithoutContact = {
      leadgen_id: '12345',
      field_data: [{ name: 'full_name', values: ['John Doe'] }],
    };

    const parseResult = MetaWebhookPayloadSchema.safeParse(payloadWithoutContact);
    expect(parseResult.success).toBe(true);

    const normalized = normalizeMetaPayload(parseResult.data!);
    const extraction = extractLeadData(normalized!);
    expect(extraction.missingFields).toContain('email or phone_number');
  });
});
