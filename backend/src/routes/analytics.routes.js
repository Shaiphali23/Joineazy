import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as analytics from '../services/analytics.service.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/overview', async (_req, res, next) => {
  try { res.json(await analytics.overview()); } catch (e) { next(e); }
});

router.get('/groups', async (_req, res, next) => {
  try { res.json(await analytics.groupProgress()); } catch (e) { next(e); }
});

export default router;
