import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyMetaSignature } from '../../src/modules/webhook/verifySignature.js';

describe('verifyMetaSignature', () => {
  const secret = 'test_meta_app_secret';
  const payload = JSON.stringify({ leadgen_id: '12345' });
  const payloadBuffer: any = Buffer.from(payload);

  it('returns true when HMAC signature matches with Buffer rawBody', () => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const digest = hmac.digest('hex');
    const header = `sha256=${digest}`;

    const isValid = verifyMetaSignature(payloadBuffer, header, secret);
    expect(isValid).toBe(true);
  });

  it('returns true when HMAC signature matches with string rawBody', () => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const digest = hmac.digest('hex');
    const header = `sha256=${digest}`;

    const isValid = verifyMetaSignature(payload, header, secret);
    expect(isValid).toBe(true);
  });

  it('returns false when signature header is missing', () => {
    const isValid = verifyMetaSignature(payloadBuffer, undefined, secret);
    expect(isValid).toBe(false);
  });

  it('returns false when signature header format is invalid', () => {
    const isValid = verifyMetaSignature(payloadBuffer, 'invalid_format', secret);
    expect(isValid).toBe(false);
  });

  it('returns false when rawBody is missing or empty', () => {
    const header = 'sha256=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    expect(verifyMetaSignature(undefined, header, secret)).toBe(false);
    expect(verifyMetaSignature('', header, secret)).toBe(false);
  });

  it('returns false when payload is tampered', () => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const header = `sha256=${hmac.digest('hex')}`;

    const tamperedPayload: any = Buffer.from(JSON.stringify({ leadgen_id: '99999' }));
    const isValid = verifyMetaSignature(tamperedPayload, header, secret);
    expect(isValid).toBe(false);
  });

  it('returns false when secret is wrong', () => {
    const hmac = crypto.createHmac('sha256', 'wrong_secret');
    hmac.update(payload);
    const header = `sha256=${hmac.digest('hex')}`;

    const isValid = verifyMetaSignature(payloadBuffer, header, secret);
    expect(isValid).toBe(false);
  });

  it('returns false when signature hex is not 64 characters or contains non-hex characters', () => {
    // 63 characters
    expect(verifyMetaSignature(payloadBuffer, `sha256=${'a'.repeat(63)}`, secret)).toBe(false);
    // 65 characters
    expect(verifyMetaSignature(payloadBuffer, `sha256=${'a'.repeat(65)}`, secret)).toBe(false);
    // 64 characters with non-hex
    expect(verifyMetaSignature(payloadBuffer, `sha256=${'z'.repeat(64)}`, secret)).toBe(false);
  });
});
