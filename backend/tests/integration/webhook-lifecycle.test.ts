import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';
import { checkDbHealth } from '../../src/db/index.js';
import { runMigrations } from '../../src/db/migrate.js';

describe('End-to-End Webhook & Lead Lifecycle Integration', () => {
  const app = createApp();

  beforeAll(async () => {
    const dbAvailable = await checkDbHealth();
    if (!dbAvailable) {
      throw new Error('PostgreSQL is required for integration tests but is unavailable');
    }
    await runMigrations();
  });

  const signPayload = (payload: object): string => {
    const raw = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', config.META_APP_SECRET);
    hmac.update(raw);
    return `sha256=${hmac.digest('hex')}`;
  };

  it('executes full flow: ingest lead -> duplicate check -> list -> detail -> status update -> audit log', async () => {

    const testLeadgenId = `test_flow_${Date.now()}`;
    const payload = {
      leadgen_id: testLeadgenId,
      page_id: 'page_999',
      form_id: 'form_888',
      ad_id: 'ad_777',
      field_data: [
        { name: 'full_name', values: ['E2E Test User'] },
        { name: 'email', values: ['e2e@example.com'] },
        { name: 'phone_number', values: ['+1987654321'] },
      ],
    };

    const signature = signPayload(payload);

    // 1. Ingest lead via Meta Webhook
    const createRes = await request(app)
      .post('/webhook/meta-lead')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(payload);

    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.full_name).toBe('E2E Test User');
    expect(createRes.body.status).toBe('NEW');
    const createdLeadId = createRes.body.id;

    // 2. Duplicate submission with same leadgen_id should be idempotent
    const dupRes = await request(app)
      .post('/webhook/meta-lead')
      .set('Content-Type', 'application/json')
      .set('X-Hub-Signature-256', signature)
      .send(payload);

    expect(dupRes.status).toBe(200);
    expect(dupRes.body).toEqual({
      status: 'duplicate_ignored',
      leadId: createdLeadId,
    });

    // 3. GET /leads (Listing with search and auth)
    const listRes = await request(app)
      .get('/leads')
      .set('Authorization', `Bearer ${config.API_KEY}`)
      .query({ search: 'E2E Test User' });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
    const found = listRes.body.data.find((l: any) => l.id === createdLeadId);
    expect(found).toBeDefined();

    // 4. GET /leads/:id
    const detailRes = await request(app)
      .get(`/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${config.API_KEY}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(createdLeadId);
    expect(detailRes.body.status).toBe('NEW');

    // 5. Update status: NEW -> CONTACTED with note
    const patchRes = await request(app)
      .patch(`/leads/${createdLeadId}/status`)
      .set('Authorization', `Bearer ${config.API_KEY}`)
      .send({
        status: 'CONTACTED',
        note: 'Followed up via phone call',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe('CONTACTED');

    // 6. Update lead details: full_name and email via PATCH /leads/:id
    const updateDetailsRes = await request(app)
      .patch(`/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${config.API_KEY}`)
      .send({
        full_name: 'E2E Updated User',
        email: 'e2e.updated@example.com',
      });

    expect(updateDetailsRes.status).toBe(200);
    expect(updateDetailsRes.body.full_name).toBe('E2E Updated User');
    expect(updateDetailsRes.body.email).toBe('e2e.updated@example.com');

    // Test no-op lead detail update (unchanged values)
    const noopDetailsRes = await request(app)
      .patch(`/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${config.API_KEY}`)
      .send({
        full_name: 'E2E Updated User',
        email: 'e2e.updated@example.com',
      });

    expect(noopDetailsRes.status).toBe(200);

    // Test rejecting attempt to remove all contact methods
    const invalidContactRes = await request(app)
      .patch(`/leads/${createdLeadId}`)
      .set('Authorization', `Bearer ${config.API_KEY}`)
      .send({
        email: null,
        phone: null,
      });

    expect(invalidContactRes.status).toBe(400);
    expect(invalidContactRes.body.error).toContain('Lead must retain at least one contact method');

    // 7. Test idempotent no-op status update
    const noopRes = await request(app)
      .patch(`/leads/${createdLeadId}/status`)
      .set('Authorization', `Bearer ${config.API_KEY}`)
      .send({ status: 'CONTACTED' });

    expect(noopRes.status).toBe(200);
    expect(noopRes.body.status).toBe('CONTACTED');

    // 8. Test illegal status transition: CONTACTED -> NEW
    const illegalRes = await request(app)
      .patch(`/leads/${createdLeadId}/status`)
      .set('Authorization', `Bearer ${config.API_KEY}`)
      .send({ status: 'NEW' });

    expect(illegalRes.status).toBe(400);

    // 9. Verify Activity Timeline audit log contains all 3 core required audit types:
    // Lead Created, Lead Updated, Status Changed (plus Duplicate Ignored)
    const activitiesRes = await request(app)
      .get(`/leads/${createdLeadId}/activities`)
      .set('Authorization', `Bearer ${config.API_KEY}`);

    expect(activitiesRes.status).toBe(200);
    expect(Array.isArray(activitiesRes.body)).toBe(true);

    const types = activitiesRes.body.map((a: any) => a.type);
    expect(types).toContain('LEAD_CREATED');
    expect(types).toContain('LEAD_UPDATED');
    expect(types).toContain('STATUS_CHANGED');
    expect(types).toContain('DUPLICATE_IGNORED');

    const leadUpdatedActivity = activitiesRes.body.find((a: any) => a.type === 'LEAD_UPDATED');
    expect(leadUpdatedActivity).toBeDefined();
    expect(leadUpdatedActivity.metadata.updatedFields).toEqual(['full_name', 'email']);
    expect(leadUpdatedActivity.metadata.previous.full_name).toBe('E2E Test User');
    expect(leadUpdatedActivity.metadata.current.full_name).toBe('E2E Updated User');
    expect(leadUpdatedActivity.actor).toBe('user:dashboard');

    const statusChangeActivity = activitiesRes.body.find((a: any) => a.type === 'STATUS_CHANGED');
    expect(statusChangeActivity.metadata).toMatchObject({
      from: 'NEW',
      to: 'CONTACTED',
      note: 'Followed up via phone call',
    });
    expect(statusChangeActivity.actor).toBe('user:dashboard');
  });
});
