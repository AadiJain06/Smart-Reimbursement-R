import { z } from 'zod';
import type { Response } from 'express';
import { createRule, listRules } from '../services/ruleService.js';
import type { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createSchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
  definition: z.any(),
});

export const postRule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = createSchema.parse(req.body);
  const rule = await createRule({
    companyId: req.user!.companyId,
    name: body.name,
    isDefault: body.isDefault,
    definition: body.definition,
  });
  res.status(201).json(rule);
});

export const getRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rules = await listRules(req.user!.companyId);
  res.json(rules);
});
