import type { Response } from 'express';
import { prisma } from '../config/database.js';
import type { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId;
  const byStatus = await prisma.expense.groupBy({
    by: ['status'],
    where: { companyId },
    _sum: { amountInCompanyCurrency: true },
    _count: true,
  });
  const byCategory = await prisma.expense.groupBy({
    by: ['category'],
    where: { companyId },
    _sum: { amountInCompanyCurrency: true },
    _count: true,
  });
  res.json({ byStatus, byCategory });
});

