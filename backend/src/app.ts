import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { checkDbHealth } from './db/index.js';
import { webhookRouter } from './modules/webhook/routes.js';
import { leadsRouter } from './modules/leads/routes.js';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Parse JSON with rawBody preservation for HMAC signature validation
  app.use(
    express.json({
      limit: '1mb',
      verify: (req: Request, _res: Response, buf: Buffer) => {
        (req as any).rawBody = buf;
      },
    })
  );

  // Request logging
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', async (_req: Request, res: Response) => {
    const dbOk = await checkDbHealth();
    if (!dbOk) {
      res.status(503).json({
        status: 'degraded',
        database: 'disconnected',
      });
      return;
    }
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  });

  // Module routes
  app.use('/webhook', webhookRouter);
  app.use('/leads', leadsRouter);

  // Central error handling
  app.use(errorHandler);

  return app;
}
