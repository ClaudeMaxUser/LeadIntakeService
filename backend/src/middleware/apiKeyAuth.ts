import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header. Expected Bearer <API_KEY>',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Expected Bearer <API_KEY>',
    });
    return;
  }

  const token = parts[1];
  if (token !== config.API_KEY) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API Key',
    });
    return;
  }

  next();
}
