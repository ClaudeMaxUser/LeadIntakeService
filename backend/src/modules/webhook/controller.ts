import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/index.js';
import { extractLeadData, MetaWebhookPayloadSchema } from './schemas.js';
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

    if (mode === 'subscribe' && token === config.WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
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

      // Extract lead fields
      const { data, missingFields } = extractLeadData(parseResult.data);
      if (missingFields && missingFields.length > 0) {
        res.status(400).json({
          error: 'Missing required lead fields',
          missingFields,
        });
        return;
      }

      // Ingest lead
      const result = await webhookService.processLeadWebhook(data!, parseResult.data);

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
