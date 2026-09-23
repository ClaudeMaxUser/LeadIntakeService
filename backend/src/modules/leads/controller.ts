import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler.js';
import { activitiesService } from '../activities/service.js';
import { UpdateLeadStatusSchema } from './schemas.js';
import { leadsService } from './service.js';

const UUIDSchema = z.string().uuid('Invalid lead ID format. Expected a valid UUID.');

export class LeadsController {
  async getLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await leadsService.getLeads(req.query as any);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getLeadById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idValidation = UUIDSchema.safeParse(req.params.id);
      if (!idValidation.success) {
        throw new AppError(idValidation.error.issues[0].message, 400);
      }

      const lead = await leadsService.getLeadById(req.params.id);
      res.status(200).json(lead);
    } catch (err) {
      next(err);
    }
  }

  async getLeadActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idValidation = UUIDSchema.safeParse(req.params.id);
      if (!idValidation.success) {
        throw new AppError(idValidation.error.issues[0].message, 400);
      }

      // Check if lead exists
      await leadsService.getLeadById(req.params.id);

      const activities = await activitiesService.getActivitiesForLead(req.params.id);
      res.status(200).json(activities);
    } catch (err) {
      next(err);
    }
  }

  async updateLeadStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idValidation = UUIDSchema.safeParse(req.params.id);
      if (!idValidation.success) {
        throw new AppError(idValidation.error.issues[0].message, 400);
      }

      const bodyValidation = UpdateLeadStatusSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        res.status(400).json({
          error: 'Validation Error',
          issues: bodyValidation.error.issues,
        });
        return;
      }

      const { status, note } = bodyValidation.data;
      const updated = await leadsService.updateLeadStatus(req.params.id, status, note, 'user:dashboard');
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}

export const leadsController = new LeadsController();
