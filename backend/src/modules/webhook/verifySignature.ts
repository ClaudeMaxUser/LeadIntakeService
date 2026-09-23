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
  const parts = signatureHeader.trim().split('=');
  if (parts.length !== 2 || parts[0].toLowerCase().trim() !== 'sha256') {
    return false;
  }

  const expectedSignatureHex = parts[1].trim();
  if (!/^[0-9a-fA-F]{64}$/.test(expectedSignatureHex)) {
    return false;
  }
  const payloadBuffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf-8') : rawBody;

  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(payloadBuffer as any);
  const actualSignatureHex = hmac.digest('hex');

  const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex');
  const actualBuffer = Buffer.from(actualSignatureHex, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer as any, actualBuffer as any);
}
