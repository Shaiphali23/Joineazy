import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Must be a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Must be a valid email'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    res.status(201).json(await authService.register(req.body));
  } catch (e) { next(e); }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    res.json(await authService.login(req.body));
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, (req, res) => {
  res.json(authService.me(req.user));
});

export default router;
