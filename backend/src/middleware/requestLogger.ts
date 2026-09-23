import { Request, Response, NextFunction } from 'express';

function sanitizeUrl(rawUrl: string): string {
  try {
    const [path, queryString] = rawUrl.split('?');
    if (!queryString) return path;

    const params = new URLSearchParams(queryString);
    const SENSITIVE_KEYS = new Set([
      'hub.verify_token',
      'verify_token',
      'token',
      'key',
      'search',
      'email',
      'phone',
    ]);

    for (const key of params.keys()) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        params.set(key, '[REDACTED]');
      }
    }

    return `${path}?${params.toString()}`;
  } catch {
    return rawUrl;
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const sanitizedUrl = sanitizeUrl(originalUrl);
    console.log(`[HTTP] ${method} ${sanitizedUrl} ${statusCode} - ${duration}ms - IP: ${ip}`);
  });

  next();
}
