import { describe, it, expect } from 'vitest';
import { UpdateLeadSchema } from '../../src/modules/leads/schemas.js';
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

  it('normalizes uppercase field names and normalizes email values to lowercase', () => {
    const payloadWithUpper = {
      leadgen_id: '54321',
      field_data: [
        { name: ' FULL_NAME ', values: [' Jane UPPER '] },
        { name: ' EMAIL ', values: [' JANE.DOE@EXAMPLE.COM '] },
        { name: ' PHONE_NUMBER ', values: [' +1-800-555-0199 '] },
      ],
    };

    const parseResult = MetaWebhookPayloadSchema.safeParse(payloadWithUpper);
    expect(parseResult.success).toBe(true);

    const normalized = normalizeMetaPayload(parseResult.data!);
    const extraction = extractLeadData(normalized!);
    expect(extraction.missingFields).toBeUndefined();
    expect(extraction.data).toEqual({
      leadgen_id: '54321',
      full_name: 'Jane UPPER',
      email: 'jane.doe@example.com',
      phone: '+1-800-555-0199',
      page_id: null,
      form_id: null,
      ad_id: null,
    });
  });
});

describe('UpdateLeadSchema Validation & Security Sanitization', () => {
  it('successfully parses valid full update payload', () => {
    const payload = {
      full_name: 'Jane Updated',
      email: 'jane.new@example.com',
      phone: '+1-555-0199',
    };
    const res = UpdateLeadSchema.safeParse(payload);
    expect(res.success).toBe(true);
    expect(res.data).toEqual({
      full_name: 'Jane Updated',
      email: 'jane.new@example.com',
      phone: '+1-555-0199',
    });
  });

  it('successfully parses partial updates', () => {
    const res = UpdateLeadSchema.safeParse({ email: 'updated@example.com' });
    expect(res.success).toBe(true);
    expect(res.data?.email).toBe('updated@example.com');
  });

  it('rejects empty object without any fields', () => {
    const res = UpdateLeadSchema.safeParse({});
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].message).toContain('At least one field');
  });

  it('rejects invalid email addresses', () => {
    const res = UpdateLeadSchema.safeParse({ email: 'not-an-email' });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].message).toContain('Invalid email');
  });

  it('rejects invalid phone characters (letters / injection payloads)', () => {
    const res = UpdateLeadSchema.safeParse({ phone: '123-abc-DROP TABLE' });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].message).toContain('Phone number contains invalid characters');
  });

  it('rejects unrecognized extra keys due to strict schema mode', () => {
    const res = UpdateLeadSchema.safeParse({
      full_name: 'Valid Name',
      role: 'admin',
      status: 'CONVERTED',
    });
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].message).toContain("Unrecognized key");
  });

  it('sanitizes null bytes and trims whitespace', () => {
    const res = UpdateLeadSchema.safeParse({
      full_name: '  Hacker\0 Name  ',
      email: '  TEST\0@EXAMPLE.COM  ',
    });
    expect(res.success).toBe(true);
    expect(res.data?.full_name).toBe('Hacker Name');
    expect(res.data?.email).toBe('test@example.com');
  });
});
