import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';

describe('CORS Origin Enforcement (Integration)', () => {
  const app = createApp();
  const originalCorsOrigin = config.CORS_ORIGIN;

  afterEach(() => {
    config.CORS_ORIGIN = originalCorsOrigin;
  });

  it('allows requests with no Origin header (e.g. server-to-server / curl / webhooks)', async () => {
    config.CORS_ORIGIN = 'https://app.example.com';
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.status);
  });

  it('allows requests from origins specified in CORS_ORIGIN whitelist', async () => {
    config.CORS_ORIGIN = 'https://app.example.com, https://admin.example.com';

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://app.example.com');

    expect([200, 503]).toContain(res.status);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  it('rejects requests from disallowed origins when CORS_ORIGIN is restricted', async () => {
    config.CORS_ORIGIN = 'https://app.example.com';

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://malicious-site.com');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'Not allowed by CORS',
    });
  });

  it('allows any origin when CORS_ORIGIN is wildcard *', async () => {
    config.CORS_ORIGIN = '*';

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://any-domain.com');

    expect([200, 503]).toContain(res.status);
    expect(res.headers['access-control-allow-origin']).toBe('https://any-domain.com');
  });
});

