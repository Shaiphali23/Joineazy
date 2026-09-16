import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as service from '../services/assignment.service.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(1),
  dueDate: z.coerce.date(),
  oneDriveLink: z.string().trim().url('Must be a valid URL'),
  audience: z.enum(['ALL', 'SPECIFIC']).default('ALL'),
  targetGroupIds: z.array(z.string().uuid()).default([]),
});

const updateSchema = createSchema.partial();

// Role-aware listing: professors get cohort stats, students get their own state.
router.get('/', async (req, res, next) => {
  try {
    const data = req.user.role === 'ADMIN'
      ? await service.listForAdmin()
      : await service.listForStudent(req.user);
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', requireRole('ADMIN'), validate(createSchema), async (req, res, next) => {
  try { res.status(201).json(await service.createAssignment(req.user, req.body)); } catch (e) { next(e); }
});

router.patch('/:id', requireRole('ADMIN'), validate(updateSchema), async (req, res, next) => {
  try { res.json(await service.updateAssignment(req.params.id, req.body)); } catch (e) { next(e); }
});

// Per-group confirmation breakdown for one assignment.
router.get('/:id/detail', requireRole('ADMIN'), async (req, res, next) => {
  try { res.json(await service.assignmentDetail(req.params.id)); } catch (e) { next(e); }
});

// Step two of the two-step confirmation. Acting group is derived from the JWT;
// any groupId in the body is ignored.
router.post('/:id/confirm', requireRole('STUDENT'), async (req, res, next) => {
  try { res.status(201).json(await service.confirmSubmission(req.user, req.params.id)); } catch (e) { next(e); }
});

export default router;
