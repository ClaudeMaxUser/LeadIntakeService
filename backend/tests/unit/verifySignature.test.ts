import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyMetaSignature } from '../../src/modules/webhook/verifySignature.js';

describe('verifyMetaSignature', () => {
  const secret = 'test_meta_app_secret';
  const payload = JSON.stringify({ leadgen_id: '12345' });

  it('returns true when HMAC signature matches', () => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(Buffer.from(payload));
    const digest = hmac.digest('hex');
    const header = `sha256=${digest}`;

    const isValid = verifyMetaSignature(Buffer.from(payload), header, secret);
    expect(isValid).toBe(true);
  });

  it('returns false when signature header is missing', () => {
    const isValid = verifyMetaSignature(Buffer.from(payload), undefined, secret);
    expect(isValid).toBe(false);
  });

  it('returns false when signature header format is invalid', () => {
    const isValid = verifyMetaSignature(Buffer.from(payload), 'invalid_format', secret);
    expect(isValid).toBe(false);
  });

  it('returns false when payload is tampered', () => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(Buffer.from(payload));
    const header = `sha256=${hmac.digest('hex')}`;

    const tamperedPayload = Buffer.from(JSON.stringify({ leadgen_id: '99999' }));
    const isValid = verifyMetaSignature(tamperedPayload, header, secret);
    expect(isValid).toBe(false);
  });

  it('returns false when secret is wrong', () => {
    const hmac = crypto.createHmac('sha256', 'wrong_secret');
    hmac.update(Buffer.from(payload));
    const header = `sha256=${hmac.digest('hex')}`;

    const isValid = verifyMetaSignature(Buffer.from(payload), header, secret);
    expect(isValid).toBe(false);
  });
});
