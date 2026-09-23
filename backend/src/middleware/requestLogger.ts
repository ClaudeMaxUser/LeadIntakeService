import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    // Mask sensitive routes or headers, sanitize log line
    console.log(`[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms - IP: ${ip}`);
  });

  next();
}
