import crypto from 'crypto';

export function verifyMetaSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !rawBody) {
    return false;
  }

  // Format: sha256=<hex_digest>
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const expectedSignatureHex = parts[1];
  const payloadBuffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf-8') : rawBody;

  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(payloadBuffer);
  const actualSignatureHex = hmac.digest('hex');

  const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex');
  const actualBuffer = Buffer.from(actualSignatureHex, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
