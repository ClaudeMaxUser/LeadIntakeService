import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../../config/index.js';
import { extractLeadData, MetaWebhookPayloadSchema, normalizeMetaPayload } from './schemas.js';
import { webhookService } from './service.js';
import { verifyMetaSignature } from './verifySignature.js';

export class WebhookController {
  /**
   * Meta Webhook Verification Handshake (GET)
   */
  async verifyHandshake(req: Request, res: Response): Promise<void> {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && typeof token === 'string') {
      const tokenHash = crypto.createHash('sha256').update(token).digest();
      const expectedHash = crypto.createHash('sha256').update(config.WEBHOOK_VERIFY_TOKEN).digest();

      if (crypto.timingSafeEqual(tokenHash as any, expectedHash as any)) {
        res.type('text/plain').status(200).send(String(challenge ?? ''));
        return;
      }
    }

    res.status(403).json({
      error: 'Forbidden',
      message: 'Webhook verify token or mode mismatch',
    });
  }

  /**
   * Meta Webhook Ingestion (POST)
   */
  async handleWebhookPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      // Verify HMAC signature
      const isSignatureValid = verifyMetaSignature(rawBody, signature, config.META_APP_SECRET);
      if (!isSignatureValid) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or missing X-Hub-Signature-256 signature',
        });
        return;
      }

      // Validate JSON payload structure
      const parseResult = MetaWebhookPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid Payload Format',
          issues: parseResult.error.issues,
        });
        return;
      }

      // Normalize between flat payload and Meta entry[0].changes[0].value wrapper
      const normalized = normalizeMetaPayload(parseResult.data);
      if (!normalized) {
        res.status(400).json({
          error: 'Invalid Payload Format',
          message: 'Could not extract leadgen_id from payload',
        });
        return;
      }

      // Extract lead fields
      const { data, missingFields } = extractLeadData(normalized);
      if (missingFields && missingFields.length > 0) {
        res.status(400).json({
          error: 'Missing required lead fields',
          missingFields,
        });
        return;
      }

      // Ingest lead
      const result = await webhookService.processLeadWebhook(data!, normalized);

      if (result.status === 'duplicate_ignored') {
        res.status(200).json({
          status: 'duplicate_ignored',
          leadId: result.leadId,
        });
        return;
      }

      res.status(201).json(result.lead);
    } catch (err) {
      next(err);
    }
  }
}

export const webhookController = new WebhookController();
