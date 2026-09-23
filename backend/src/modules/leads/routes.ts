import { Router } from 'express';
import { apiKeyAuth } from '../../middleware/apiKeyAuth.js';
import { apiRateLimiter } from '../../middleware/rateLimiter.js';
import { leadsController } from './controller.js';

export const leadsRouter = Router();

// Rate limiting on dashboard API endpoints
leadsRouter.use(apiRateLimiter);

// Protect all /leads* endpoints with API key / Bearer auth
leadsRouter.use(apiKeyAuth);

// GET /leads (List leads with pagination, filters, search, sort)
leadsRouter.get('/', (req, res, next) => leadsController.getLeads(req, res, next));

// GET /leads/:id (Get single lead by ID)
leadsRouter.get('/:id', (req, res, next) => leadsController.getLeadById(req, res, next));

// GET /leads/:id/activities (Get activity timeline for lead)
leadsRouter.get('/:id/activities', (req, res, next) => leadsController.getLeadActivities(req, res, next));

// PATCH /leads/:id/status (Update lead status)
leadsRouter.patch('/:id/status', (req, res, next) => leadsController.updateLeadStatus(req, res, next));

// PATCH /leads/:id (Update lead contact details)
leadsRouter.patch('/:id', (req, res, next) => leadsController.updateLead(req, res, next));
