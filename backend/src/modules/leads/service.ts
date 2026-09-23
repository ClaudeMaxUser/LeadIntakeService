import { query, withTransaction } from '../../db/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { activitiesService } from '../activities/service.js';
import { AllowedTransitions, GetLeadsQuerySchema, isValidTransition } from './schemas.js';
import { GetLeadsQuery, LeadModel, PaginatedResult, UpdateLeadInput } from './types.js';

export class LeadsService {
  async getLeads(rawQuery: unknown): Promise<PaginatedResult<LeadModel>> {
    const parsed = GetLeadsQuerySchema.parse(rawQuery);
    const { page, limit, status, search, sortBy, sortOrder } = parsed;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (search) {
      // Escape SQL ILIKE wildcard characters to treat them literally
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&');
      conditions.push(`(full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
      params.push(`%${sanitizedSearch}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumnMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      fullName: 'full_name',
      status: 'status',
    };
    const sortColumn = sortColumnMap[sortBy] || 'created_at';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total query
    const countSql = `SELECT COUNT(*)::int AS total FROM leads ${whereClause}`;
    const countResult = await query<{ total: number }>(countSql, params);
    const total = countResult.rows[0]?.total || 0;

    // Data query
    const dataSql = `
      SELECT id, external_lead_id, full_name, email, phone, source, page_id, form_id, ad_id, status, raw_payload, created_at, updated_at
      FROM leads
      ${whereClause}
      ORDER BY ${sortColumn} ${direction}, id DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const dataParams = [...params, limit, offset];
    const dataResult = await query<LeadModel>(dataSql, dataParams);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLeadById(id: string): Promise<LeadModel> {
    const sql = `
      SELECT id, external_lead_id, full_name, email, phone, source, page_id, form_id, ad_id, status, raw_payload, created_at, updated_at
      FROM leads
      WHERE id = $1
    `;
    const result = await query<LeadModel>(sql, [id]);
    if (result.rows.length === 0) {
      throw new AppError('Lead not found', 404);
    }
    return result.rows[0];
  }

  async updateLeadStatus(
    id: string,
    nextStatus: string,
    note?: string,
    actor: 'user:dashboard' = 'user:dashboard'
  ): Promise<LeadModel> {
    return await withTransaction(async (client) => {
      // Lock lead row for update to ensure safe concurrent mutations
      const selectSql = `
        SELECT id, external_lead_id, full_name, email, phone, source, page_id, form_id, ad_id, status, raw_payload, created_at, updated_at
        FROM leads
        WHERE id = $1
        FOR UPDATE
      `;
      const selectResult = await client.query<LeadModel>(selectSql, [id]);
      if (selectResult.rows.length === 0) {
        throw new AppError('Lead not found', 404);
      }

      const currentLead = selectResult.rows[0];
      const currentStatus = currentLead.status;

      // No-op check: setting status to its current value
      if (currentStatus === nextStatus) {
        return currentLead;
      }

      // Check transition validity
      if (!isValidTransition(currentStatus, nextStatus)) {
        const allowed = AllowedTransitions[currentStatus] || [];
        const allowedMsg = allowed.length > 0
          ? `Allowed transitions from '${currentStatus}': ${allowed.join(', ')}`
          : `State '${currentStatus}' is terminal and cannot be transitioned.`;
        throw new AppError(`Illegal status transition from '${currentStatus}' to '${nextStatus}'. ${allowedMsg}`, 400);
      }

      // Perform update
      const updateSql = `
        UPDATE leads
        SET status = $1, updated_at = now()
        WHERE id = $2
        RETURNING id, external_lead_id, full_name, email, phone, source, page_id, form_id, ad_id, status, raw_payload, created_at, updated_at
      `;
      const updateResult = await client.query<LeadModel>(updateSql, [nextStatus, id]);
      const updatedLead = updateResult.rows[0];

      // Record activity in the same transaction
      await activitiesService.logActivity(
        {
          leadId: id,
          type: 'STATUS_CHANGED',
          description: `Status changed from ${currentStatus} to ${nextStatus}${note ? ` (Note: ${note})` : ''}`,
          metadata: {
            from: currentStatus,
            to: nextStatus,
            note: note || null,
          },
          actor,
        },
        client
      );

      return updatedLead;
    });
  }

  async updateLead(
    id: string,
    updates: UpdateLeadInput,
    actor: 'user:dashboard' = 'user:dashboard'
  ): Promise<LeadModel> {
    return await withTransaction(async (client) => {
      // Lock lead row for update to ensure safe concurrent mutations
      const selectSql = `
        SELECT id, external_lead_id, full_name, email, phone, source, page_id, form_id, ad_id, status, raw_payload, created_at, updated_at
        FROM leads
        WHERE id = $1
        FOR UPDATE
      `;
      const selectResult = await client.query<LeadModel>(selectSql, [id]);
      if (selectResult.rows.length === 0) {
        throw new AppError('Lead not found', 404);
      }

      const currentLead = selectResult.rows[0];

      // Business validation: ensure lead retains at least one contact method (email or phone)
      const resultingEmail = updates.email !== undefined ? updates.email : currentLead.email;
      const resultingPhone = updates.phone !== undefined ? updates.phone : currentLead.phone;
      if (!resultingEmail && !resultingPhone) {
        throw new AppError('Lead must retain at least one contact method (email or phone).', 400);
      }

      // Identify genuine field changes
      const changedFields: string[] = [];
      const previousValues: Record<string, string | null> = {};
      const newValues: Record<string, string | null> = {};

      if (updates.full_name !== undefined && updates.full_name !== currentLead.full_name) {
        changedFields.push('full_name');
        previousValues.full_name = currentLead.full_name;
        newValues.full_name = updates.full_name;
      }

      if (updates.email !== undefined && updates.email !== currentLead.email) {
        changedFields.push('email');
        previousValues.email = currentLead.email;
        newValues.email = updates.email;
      }

      if (updates.phone !== undefined && updates.phone !== currentLead.phone) {
        changedFields.push('phone');
        previousValues.phone = currentLead.phone;
        newValues.phone = updates.phone;
      }

      // If no values actually changed, return existing lead without redundant activity entry
      if (changedFields.length === 0) {
        return currentLead;
      }

      // Build parameterized update dynamically using strict allow-list
      const setClauses: string[] = ['updated_at = now()'];
      const params: any[] = [id];
      let paramIdx = 2;

      if (updates.full_name !== undefined) {
        setClauses.push(`full_name = $${paramIdx++}`);
        params.push(updates.full_name);
      }
      if (updates.email !== undefined) {
        setClauses.push(`email = $${paramIdx++}`);
        params.push(updates.email);
      }
      if (updates.phone !== undefined) {
        setClauses.push(`phone = $${paramIdx++}`);
        params.push(updates.phone);
      }

      const updateSql = `
        UPDATE leads
        SET ${setClauses.join(', ')}
        WHERE id = $1
        RETURNING id, external_lead_id, full_name, email, phone, source, page_id, form_id, ad_id, status, raw_payload, created_at, updated_at
      `;

      const updateResult = await client.query<LeadModel>(updateSql, params);
      const updatedLead = updateResult.rows[0];

      // Record LEAD_UPDATED activity in the same transaction
      await activitiesService.logActivity(
        {
          leadId: id,
          type: 'LEAD_UPDATED',
          description: `Lead details updated: ${changedFields.join(', ')}`,
          metadata: {
            updatedFields: changedFields,
            previous: previousValues,
            current: newValues,
          },
          actor,
        },
        client
      );

      return updatedLead;
    });
  }
}

export const leadsService = new LeadsService();
