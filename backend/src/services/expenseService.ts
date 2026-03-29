import { ExpenseStatus, Prisma, UserRole } from '@prisma/client';
import { prisma } from '../config/database.js';
import { convertToCurrency } from './currencyService.js';
import { seedWorkflowStepsForExpense } from './approvalWorkflowService.js';

export async function createExpense(input: {
  companyId: string;
  submitterId: string;
  amount: number;
  currency: string;
  category: string;
  description?: string | null;
  date: Date;
  receiptPath?: string | null;
  approvalRuleId?: string | null;
  ocrMetadata?: Record<string, unknown> | null;
}) {
  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
  });
  if (!company) throw Object.assign(new Error('Company not found'), { status: 404 });

  const amountInCompanyCurrency = await convertToCurrency(
    input.amount,
    input.currency,
    company.defaultCurrency
  );

  const expense = await prisma.expense.create({
    data: {
      companyId: input.companyId,
      submitterId: input.submitterId,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      amountInCompanyCurrency,
      category: input.category,
      description: input.description ?? undefined,
      date: input.date,
      receiptPath: input.receiptPath ?? undefined,
      approvalRuleId: input.approvalRuleId ?? undefined,
      status: ExpenseStatus.PENDING,
      workflowPhase: 'sequential',
      metadata: input.ocrMetadata
        ? (input.ocrMetadata as Prisma.InputJsonValue)
        : undefined,
    },
  });

  await seedWorkflowStepsForExpense(expense.id);
  const submitter = await prisma.user.findUnique({
    where: { id: input.submitterId },
  });
  const full = await findExpenseById(
    expense.id,
    input.submitterId,
    submitter?.role ?? UserRole.EMPLOYEE,
    input.companyId
  );
  if (!full) throw new Error('Failed to load created expense');
  return full;
}

const expenseInclude: Prisma.ExpenseInclude = {
  submitter: { select: { id: true, name: true, email: true } },
  approvalRule: { select: { id: true, name: true } },
  approvalSteps: {
    orderBy: [{ blockIndex: 'asc' }, { stepIndex: 'asc' }, { parallelSlot: 'asc' }],
    include: { approver: { select: { id: true, name: true, email: true } } },
  },
  approvalLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
};

export async function findExpenseById(
  id: string,
  requesterId: string,
  role: UserRole,
  companyId: string
) {
  const exp = await prisma.expense.findFirst({
    where: { id, companyId },
    include: expenseInclude,
  });
  if (!exp) return null;
  if (role === 'ADMIN') return exp;
  if (exp.submitterId === requesterId) return exp;
  const isApprover = exp.approvalSteps.some(
    (s) =>
      s.approverUserId === requesterId ||
      (s.requiredRole && s.requiredRole === role)
  );
  if (isApprover) return exp;
  if (role === 'MANAGER') {
    const team = await prisma.user.findMany({
      where: { managerId: requesterId, companyId },
      select: { id: true },
    });
    const ids = new Set(team.map((t) => t.id));
    if (ids.has(exp.submitterId)) return exp;
  }
  return null;
}

export async function listExpenses(
  requesterId: string,
  role: UserRole,
  companyId: string
) {
  if (role === 'ADMIN') {
    return prisma.expense.findMany({
      where: { companyId },
      include: expenseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
  if (role === 'MANAGER') {
    const team = await prisma.user.findMany({
      where: { managerId: requesterId, companyId },
      select: { id: true },
    });
    const ids = [requesterId, ...team.map((t) => t.id)];
    return prisma.expense.findMany({
      where: { companyId, submitterId: { in: ids } },
      include: expenseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
  return prisma.expense.findMany({
    where: { companyId, submitterId: requesterId },
    include: expenseInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function listPendingForUser(userId: string, companyId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  return prisma.approvalStep.findMany({
    where: {
      status: 'PENDING',
      expense: { companyId, status: ExpenseStatus.PENDING },
      OR: [{ approverUserId: userId }, { requiredRole: user.role }],
    },
    include: {
      expense: {
        include: {
          submitter: { select: { id: true, name: true, email: true } },
          company: { select: { defaultCurrency: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
