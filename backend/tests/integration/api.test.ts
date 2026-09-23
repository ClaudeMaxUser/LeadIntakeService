import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';

describe('HTTP API & Webhook Endpoints (Integration)', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('returns status ok or degraded without auth requirement', async () => {
      const res = await request(app).get('/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
    });
  });

  describe('GET /webhook/meta-lead (Verification Handshake)', () => {
    it('echoes hub.challenge with 200 when verify_token matches', async () => {
      const challenge = 'random_challenge_string_123';
      const res = await request(app)
        .get('/webhook/meta-lead')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': config.WEBHOOK_VERIFY_TOKEN,
          'hub.challenge': challenge,
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe(challenge);
    });

    it('returns 403 when verify_token does not match', async () => {
      const res = await request(app)
        .get('/webhook/meta-lead')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': '123',
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Forbidden');
    });
  });

  describe('POST /webhook/meta-lead (Signature & Validation)', () => {
    it('returns 401 when X-Hub-Signature-256 header is missing', async () => {
      const res = await request(app)
        .post('/webhook/meta-lead')
        .send({
          leadgen_id: '123',
          field_data: [{ name: 'full_name', values: ['John'] }],
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 401 when X-Hub-Signature-256 header is invalid', async () => {
      const res = await request(app)
        .post('/webhook/meta-lead')
        .set('X-Hub-Signature-256', 'sha256=invalidhex1234')
        .send({
          leadgen_id: '123',
          field_data: [{ name: 'full_name', values: ['John'] }],
        });

      expect(res.status).toBe(401);
    });

    it('returns 400 when full_name or contact is missing with valid signature', async () => {
      const payload = {
        leadgen_id: '123',
        field_data: [{ name: 'random_field', values: ['abc'] }],
      };
      const rawPayloadStr = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', config.META_APP_SECRET);
      hmac.update(rawPayloadStr);
      const signature = `sha256=${hmac.digest('hex')}`;

      const res = await request(app)
        .post('/webhook/meta-lead')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('missingFields');
    });
  });

  describe('Authentication on /leads routes', () => {
    it('returns 401 when Authorization header is missing on GET /leads', async () => {
      const res = await request(app).get('/leads');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 401 when Bearer token is invalid on GET /leads', async () => {
      const res = await request(app)
        .get('/leads')
        .set('Authorization', 'Bearer wrong_key');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid API Key');
    });

    it('returns 400 when requesting non-UUID lead ID with valid auth', async () => {
      const res = await request(app)
        .get('/leads/not-a-uuid')
        .set('Authorization', `Bearer ${config.API_KEY}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid lead ID format. Expected a valid UUID.');
    });
  });
});

