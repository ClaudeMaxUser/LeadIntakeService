import pg from 'pg';
import { query } from '../../db/index.js';
import { ActivityModel } from '../leads/types.js';

export interface CreateActivityInput {
  leadId: string;
  type: 'LEAD_CREATED' | 'LEAD_UPDATED' | 'STATUS_CHANGED' | 'DUPLICATE_IGNORED';
  description: string;
  metadata?: Record<string, any> | null;
  actor: 'system:webhook' | 'user:dashboard';
}

export class ActivitiesService {
  /**
   * Log an activity inside an existing client/transaction or the default pool
   */
  async logActivity(
    input: CreateActivityInput,
    client?: pg.PoolClient | pg.Pool
  ): Promise<ActivityModel> {
    const sql = `
      INSERT INTO activities (lead_id, type, description, metadata, actor)
      VALUES ($1, $2, $3, $4, $5)
      RETURNS id, lead_id, type, description, metadata, actor, created_at
    `.replace('RETURNS', 'RETURNING');

    const params = [
      input.leadId,
      input.type,
      input.description,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.actor,
    ];

    const result = client
      ? await client.query<ActivityModel>(sql, params)
      : await query<ActivityModel>(sql, params);

    return result.rows[0];
  }

  /**
   * Get audit timeline for a specific lead, newest first with secondary autoincrement id sort
   */
  async getActivitiesForLead(leadId: string): Promise<ActivityModel[]> {
    const sql = `
      SELECT id, lead_id, type, description, metadata, actor, created_at
      FROM activities
      WHERE lead_id = $1
      ORDER BY created_at DESC, id DESC
    `;
    const result = await query<ActivityModel>(sql, [leadId]);
    return result.rows;
  }
}

export const activitiesService = new ActivitiesService();
