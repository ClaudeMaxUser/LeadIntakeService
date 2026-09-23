import { withTransaction } from '../../db/index.js';
import { activitiesService } from '../activities/service.js';
import { LeadModel } from '../leads/types.js';
import { ExtractedLeadData, MetaWebhookPayload } from './types.js';

export type ProcessWebhookResult =
  | { status: 'created'; lead: LeadModel }
  | { status: 'duplicate_ignored'; leadId: string };

export class WebhookService {
  async processLeadWebhook(
    extracted: ExtractedLeadData,
    rawPayload: MetaWebhookPayload
  ): Promise<ProcessWebhookResult> {
    return await withTransaction(async (client) => {
      // Atomic insert with ON CONFLICT DO NOTHING to prevent race conditions
      const insertSql = `
        INSERT INTO leads (
          external_lead_id, full_name, email, phone, source, page_id, form_id, ad_id, status, raw_payload
        ) VALUES (
          $1, $2, $3, $4, 'meta_ads', $5, $6, $7, 'NEW', $8
        )
        ON CONFLICT (external_lead_id) DO NOTHING
        RETURNING id, external_lead_id, full_name, email, phone, source, page_id, form_id, ad_id, status, raw_payload, created_at, updated_at
      `;
      const insertParams = [
        extracted.leadgen_id,
        extracted.full_name,
        extracted.email,
        extracted.phone,
        extracted.page_id,
        extracted.form_id,
        extracted.ad_id,
        JSON.stringify(rawPayload),
      ];

      const insertResult = await client.query<LeadModel>(insertSql, insertParams);

      // If no row was inserted, lead already exists (idempotency conflict)
      if (insertResult.rows.length === 0) {
        const existingQuery = `SELECT id FROM leads WHERE external_lead_id = $1`;
        const existingResult = await client.query<{ id: string }>(existingQuery, [extracted.leadgen_id]);
        const existingId = existingResult.rows[0]?.id;

        if (existingId) {
          await activitiesService.logActivity(
            {
              leadId: existingId,
              type: 'DUPLICATE_IGNORED',
              description: `Duplicate webhook received for external_lead_id: ${extracted.leadgen_id}`,
              metadata: { leadgen_id: extracted.leadgen_id },
              actor: 'system:webhook',
            },
            client
          );
        }

        return {
          status: 'duplicate_ignored',
          leadId: existingId || '',
        };
      }

      const newLead = insertResult.rows[0];

      // Record LEAD_CREATED activity in the same transaction
      await activitiesService.logActivity(
        {
          leadId: newLead.id,
          type: 'LEAD_CREATED',
          description: `Lead created from Meta Ads webhook (leadgen_id: ${extracted.leadgen_id})`,
          metadata: {
            external_lead_id: extracted.leadgen_id,
            form_id: extracted.form_id,
            page_id: extracted.page_id,
            ad_id: extracted.ad_id,
          },
          actor: 'system:webhook',
        },
        client
      );

      return {
        status: 'created',
        lead: newLead,
      };
    });
  }
}

export const webhookService = new WebhookService();
