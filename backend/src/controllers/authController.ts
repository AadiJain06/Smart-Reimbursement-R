import { z } from 'zod';
import type { Response } from 'express';
import { signup, login } from '../services/authService.js';
import type { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const signupSchema = z.object({
  companyName: z.string().min(1),
  countryCode: z.string().length(2),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const postSignup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = signupSchema.parse(req.body);
  const result = await signup(body);
  res.status(201).json(result);
});

export const postLogin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = loginSchema.parse(req.body);
  const result = await login(body.email, body.password);
  res.json(result);
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { getUserById } = await import('../services/authService.js');
  const { prisma } = await import('../config/database.js');
  const u = await getUserById(req.user!.sub);
  if (!u) return res.status(404).json({ error: 'User not found' });
  const company = await prisma.company.findUnique({
    where: { id: req.user!.companyId },
  });
  res.json({ user: u, company });
});
