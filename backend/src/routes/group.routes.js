import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as groupService from '../services/group.service.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().trim().min(3, 'Group name must be at least 3 characters').max(60),
});
const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Must be a valid student email'),
});

// Professor-only: all groups.
router.get('/', requireRole('ADMIN'), async (_req, res, next) => {
  try { res.json(await groupService.listGroups()); } catch (e) { next(e); }
});

// The caller's own group. No id in the path: you can only read your own.
router.get('/me', async (req, res, next) => {
  try {
    if (!req.user.membership) return res.json(null);
    res.json(await groupService.getGroup(req.user.membership.groupId));
  } catch (e) { next(e); }
});

router.post('/', requireRole('STUDENT'), validate(createSchema), async (req, res, next) => {
  try { res.status(201).json(await groupService.createGroup(req.user, req.body)); } catch (e) { next(e); }
});

router.post('/members', requireRole('STUDENT'), validate(addMemberSchema), async (req, res, next) => {
  try { res.status(201).json(await groupService.addMember(req.user, req.body)); } catch (e) { next(e); }
});

router.delete('/members/me', requireRole('STUDENT'), async (req, res, next) => {
  try { res.json(await groupService.leaveGroup(req.user)); } catch (e) { next(e); }
});

export default router;
