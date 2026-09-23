import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';
import { pool, checkDbHealth } from '../../src/db/index.js';
import { runMigrations } from '../../src/db/migrate.js';

describe('End-to-End Webhook & Lead Lifecycle Integration', () => {
  const app = createApp();
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await checkDbHealth();
    if (dbAvailable) {
      try {
        await runMigrations();
      } catch (e) {
        console.warn('Migration run in test warning:', e);
      }
    }
  });

  const signPayload = (payload: object): string => {
    const raw = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', config.META_APP_SECRET);
    hmac.update(raw);
    return `sha256=${hmac.digest('hex')}`;
  };

  it('executes full flow: ingest lead -> duplicate check -> list -> detail -> status update -> audit log', async () => {
    if (!dbAvailable) {
      console.warn('Skipping database-dependent test because local PostgreSQL is unreachable.');
      return;
    }

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

    // 6. Test idempotent no-op status update
    const noopRes = await request(app)
      .patch(`/leads/${createdLeadId}/status`)
      .set('Authorization', `Bearer ${config.API_KEY}`)
      .send({ status: 'CONTACTED' });

    expect(noopRes.status).toBe(200);
    expect(noopRes.body.status).toBe('CONTACTED');

    // 7. Test illegal status transition: CONTACTED -> NEW
    const illegalRes = await request(app)
      .patch(`/leads/${createdLeadId}/status`)
      .set('Authorization', `Bearer ${config.API_KEY}`)
      .send({ status: 'NEW' });

    expect(illegalRes.status).toBe(400);

    // 8. Verify Activity Timeline audit log
    const activitiesRes = await request(app)
      .get(`/leads/${createdLeadId}/activities`)
      .set('Authorization', `Bearer ${config.API_KEY}`);

    expect(activitiesRes.status).toBe(200);
    expect(Array.isArray(activitiesRes.body)).toBe(true);

    const types = activitiesRes.body.map((a: any) => a.type);
    expect(types).toContain('LEAD_CREATED');
    expect(types).toContain('DUPLICATE_IGNORED');
    expect(types).toContain('STATUS_CHANGED');

    const statusChangeActivity = activitiesRes.body.find((a: any) => a.type === 'STATUS_CHANGED');
    expect(statusChangeActivity.metadata).toMatchObject({
      from: 'NEW',
      to: 'CONTACTED',
      note: 'Followed up via phone call',
    });
    expect(statusChangeActivity.actor).toBe('user:dashboard');
  });
});
