import { z } from 'zod';
import type { Response } from 'express';
import { UserRole } from '../types/enums.js';
import { createUser, listUsers } from '../services/userService.js';
import type { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z
    .nativeEnum(UserRole)
    .refine((r) => r === 'EMPLOYEE' || r === 'MANAGER', 'Only employee or manager'),
  managerId: z.string().uuid().nullable().optional(),
});

export const postUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = createSchema.parse(req.body);
  const user = await createUser({
    companyId: req.user!.companyId,
    email: body.email,
    password: body.password,
    name: body.name,
    role: body.role,
    managerId: body.managerId,
  });
  res.status(201).json(user);
});

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await listUsers(req.user!.companyId);
  res.json(users);
});
