import { z } from 'zod';
import type { Response } from 'express';
import {
  processApproval,
  processRejection,
  processOverride,
  processEscalation,
} from '../services/approvalWorkflowService.js';
import { listPendingForUser } from '../services/expenseService.js';
import { prisma } from '../config/database.js';
import { sendMockEmail } from '../services/mockNotificationService.js';
import type { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { realtime } from '../realtime.js';

const idSchema = z.object({
  expenseId: z.string().uuid(),
  comment: z.string().optional(),
});

export const postApprove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = idSchema.parse(req.body);
  await processApproval(body.expenseId, req.user!.sub, body.comment);
  const exp = await prisma.expense.findUnique({
    where: { id: body.expenseId },
    include: { submitter: true },
  });
  if (exp?.submitter?.email && exp.status !== 'PENDING') {
    sendMockEmail(
      exp.submitter.email,
      `Expense ${exp.status}`,
      `Your expense ${body.expenseId.slice(0, 8)} is now ${exp.status}.`
    );
  }
  realtime.emitExpenseUpdate(req.user!.companyId, {
    type: 'approved',
    expenseId: body.expenseId,
  });
  res.json({ ok: true });
});

export const postReject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = idSchema.parse(req.body);
  await processRejection(body.expenseId, req.user!.sub, body.comment);
  realtime.emitExpenseUpdate(req.user!.companyId, {
    type: 'rejected',
    expenseId: body.expenseId,
  });
  res.json({ ok: true });
});

export const postEscalate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = idSchema.parse(req.body);
  await processEscalation(body.expenseId, req.user!.sub, body.comment);
  res.json({ ok: true });
});

const overrideSchema = z.object({
  expenseId: z.string().uuid(),
  approve: z.boolean(),
  comment: z.string().optional(),
});

export const postOverride = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = overrideSchema.parse(req.body);
  await processOverride(body.expenseId, req.user!.sub, body.approve, body.comment);
  res.json({ ok: true });
});

export const getPending = asyncHandler(async (req: AuthRequest, res: Response) => {
  const rows = await listPendingForUser(req.user!.sub, req.user!.companyId);
  res.json(rows);
});
