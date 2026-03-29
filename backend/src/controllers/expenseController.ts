import { z } from 'zod';
import type { Response } from 'express';
import {
  createExpense,
  findExpenseById,
  listExpenses,
} from '../services/expenseService.js';
import type { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUploadPath } from '../utils/upload.js';
import { realtime } from '../realtime.js';

const createSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(4),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.coerce.date(),
  approvalRuleId: z.string().uuid().optional(),
  /** Multipart sends JSON as a string */
  ocrMetadata: z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val) as Record<string, unknown>;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, z.record(z.unknown()).optional()),
});

export const postExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = createSchema.parse(req.body);
  let receiptPath: string | null = null;
  if (req.file) {
    receiptPath = publicUploadPath(req.file.filename);
  }
  const expense = await createExpense({
    companyId: req.user!.companyId,
    submitterId: req.user!.sub,
    amount: body.amount,
    currency: body.currency,
    category: body.category,
    description: body.description,
    date: body.date,
    receiptPath,
    approvalRuleId: body.approvalRuleId ?? null,
    ocrMetadata: body.ocrMetadata ?? null,
  });
  realtime.emitExpenseUpdate(req.user!.companyId, {
    type: 'created',
    expenseId: expense.id,
  });
  res.status(201).json(expense);
});

export const getExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rows = await listExpenses(req.user!.sub, req.user!.role, req.user!.companyId);
  res.json(rows);
});

export const getExpenseById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const exp = await findExpenseById(
    req.params.id,
    req.user!.sub,
    req.user!.role,
    req.user!.companyId
  );
  if (!exp) return res.status(404).json({ error: 'Not found' });
  res.json(exp);
});
