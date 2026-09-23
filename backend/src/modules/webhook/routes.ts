import { Router } from 'express';
import { webhookRateLimiter } from '../../middleware/rateLimiter.js';
import { webhookController } from './controller.js';

export const webhookRouter = Router();

// Apply rate limiter on webhook endpoints
webhookRouter.use(webhookRateLimiter);

// GET /webhook/meta-lead (Verification handshake)
webhookRouter.get('/meta-lead', (req, res) => webhookController.verifyHandshake(req, res));

// POST /webhook/meta-lead (Lead ingestion)
webhookRouter.post('/meta-lead', (req, res, next) => webhookController.handleWebhookPost(req, res, next));
