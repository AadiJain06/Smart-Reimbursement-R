import {
  ApprovalLogAction,
  ApprovalStepStatus,
  ExpenseStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { prisma } from '../config/database.js';
import { workflowDefinitionSchema, type WorkflowDefinition } from './workflowTypes.js';

function parseDefinition(raw: unknown): WorkflowDefinition {
  const r = workflowDefinitionSchema.safeParse(raw);
  if (!r.success) throw new Error('Invalid workflow definition');
  return r.data;
}

export async function resolveAssignee(
  assignee: string,
  ctx: { companyId: string; submitterId: string }
): Promise<{ userId: string | null; requiredRole: UserRole | null }> {
  if (assignee.startsWith('user:')) {
    const id = assignee.slice(5);
    const u = await prisma.user.findFirst({
      where: { id, companyId: ctx.companyId },
    });
    return { userId: u?.id ?? null, requiredRole: null };
  }
  if (assignee === 'role:MANAGER') {
    const sub = await prisma.user.findUnique({
      where: { id: ctx.submitterId },
      select: { managerId: true },
    });
    if (sub?.managerId) return { userId: sub.managerId, requiredRole: null };
    const mgr = await prisma.user.findFirst({
      where: { companyId: ctx.companyId, role: 'MANAGER' },
      orderBy: { createdAt: 'asc' },
    });
    return { userId: mgr?.id ?? null, requiredRole: mgr ? null : 'MANAGER' };
  }
  if (assignee === 'role:ADMIN') {
    const admin = await prisma.user.findFirst({
      where: { companyId: ctx.companyId, role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
    });
    return { userId: admin?.id ?? null, requiredRole: admin ? null : 'ADMIN' };
  }
  if (assignee === 'role:EMPLOYEE') {
    const emp = await prisma.user.findFirst({
      where: { companyId: ctx.companyId, role: 'EMPLOYEE' },
      orderBy: { createdAt: 'asc' },
    });
    return { userId: emp?.id ?? null, requiredRole: emp ? null : 'EMPLOYEE' };
  }
  return { userId: null, requiredRole: null };
}

export async function seedWorkflowStepsForExpense(expenseId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { submitter: true, approvalRule: true },
  });
  if (!expense) throw new Error('Expense not found');

  let rule = expense.approvalRule;
  if (!rule) {
    rule = await prisma.approvalRule.findFirst({
      where: { companyId: expense.companyId, isDefault: true },
    });
    if (rule) {
      await prisma.expense.update({
        where: { id: expenseId },
        data: { approvalRuleId: rule.id },
      });
    }
  }
  if (!rule) throw new Error('No approval rule configured');

  const def = parseDefinition(rule.definition);
  const sequential = def.sequential ?? [];
  const gate = def.parallelGate;

  await prisma.approvalStep.deleteMany({ where: { expenseId } });

  if (sequential.length === 0 && !gate) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'APPROVED', workflowPhase: 'done', currentBlockIndex: 0 },
    });
    await prisma.approvalLog.create({
      data: {
        expenseId,
        action: 'APPROVED',
        comment: 'No steps — auto-approved',
      },
    });
    return;
  }

  const ctx = { companyId: expense.companyId, submitterId: expense.submitterId };

  if (sequential.length === 0 && gate) {
    await prisma.$transaction(async (tx) => {
      await createParallelStepsTx(tx, expenseId, gate, ctx);
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          workflowPhase: 'parallel',
          currentBlockIndex: 1,
          status: ExpenseStatus.PENDING,
        },
      });
      await tx.approvalLog.create({
        data: {
          expenseId,
          actorId: expense.submitterId,
          action: ApprovalLogAction.SUBMITTED,
        },
      });
    });
    return;
  }

  for (let i = 0; i < sequential.length; i++) {
    const step = sequential[i];
    const resolved = await resolveAssignee(step.assignee, ctx);
    await prisma.approvalStep.create({
      data: {
        expenseId,
        blockIndex: 0,
        stepIndex: i,
        parallelSlot: 0,
        approverUserId: resolved.userId,
        requiredRole: resolved.requiredRole,
        label: step.label ?? null,
        status: i === 0 ? ApprovalStepStatus.PENDING : ApprovalStepStatus.WAITING,
      },
    });
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      workflowPhase: 'sequential',
      currentBlockIndex: 0,
      status: ExpenseStatus.PENDING,
    },
  });

  await prisma.approvalLog.create({
    data: {
      expenseId,
      actorId: expense.submitterId,
      action: ApprovalLogAction.SUBMITTED,
    },
  });
}

async function createParallelStepsTx(
  tx: Prisma.TransactionClient,
  expenseId: string,
  gate: NonNullable<WorkflowDefinition['parallelGate']>,
  ctx: { companyId: string; submitterId: string }
) {
  if (!gate.assignees.length) return;
  for (let i = 0; i < gate.assignees.length; i++) {
    const resolved = await resolveAssignee(gate.assignees[i], ctx);
    await tx.approvalStep.create({
      data: {
        expenseId,
        blockIndex: 1,
        stepIndex: 0,
        parallelSlot: i,
        approverUserId: resolved.userId,
        requiredRole: resolved.requiredRole,
        label: 'Parallel approval',
        status: ApprovalStepStatus.PENDING,
      },
    });
  }
}

async function userMatchesStep(
  actorId: string,
  step: { approverUserId: string | null; requiredRole: UserRole | null },
  companyId: string
) {
  if (step.approverUserId && step.approverUserId === actorId) return true;
  if (step.requiredRole) {
    const u = await prisma.user.findFirst({ where: { id: actorId, companyId } });
    return u?.role === step.requiredRole;
  }
  return false;
}

export async function processApproval(
  expenseId: string,
  actorId: string,
  comment?: string
) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      approvalSteps: {
        orderBy: [{ blockIndex: 'asc' }, { stepIndex: 'asc' }, { parallelSlot: 'asc' }],
      },
      approvalRule: true,
    },
  });
  if (!expense || expense.status !== ExpenseStatus.PENDING) {
    throw Object.assign(new Error('Expense not pending'), { status: 400 });
  }

  const def = expense.approvalRule
    ? parseDefinition(expense.approvalRule.definition)
    : { sequential: [], parallelGate: undefined };

  const stepToUse = await findPendingStepForActor(
    expense.approvalSteps,
    actorId,
    expense.companyId
  );
  if (!stepToUse) {
    throw Object.assign(new Error('No pending approval for this user'), { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.update({
      where: { id: stepToUse.id },
      data: { status: ApprovalStepStatus.APPROVED, decidedAt: new Date() },
    });
    await tx.approvalLog.create({
      data: {
        expenseId,
        actorId,
        action: ApprovalLogAction.APPROVED,
        comment: comment ?? null,
      },
    });

    if (stepToUse.blockIndex === 0) {
      const seq = await tx.approvalStep.findMany({
        where: { expenseId, blockIndex: 0 },
        orderBy: { stepIndex: 'asc' },
      });
      const nextWaiting = seq.find((s) => s.status === ApprovalStepStatus.WAITING);
      if (nextWaiting) {
        await tx.approvalStep.update({
          where: { id: nextWaiting.id },
          data: { status: ApprovalStepStatus.PENDING },
        });
        return;
      }
      const allApproved = seq.every((s) => s.status === ApprovalStepStatus.APPROVED);
      if (allApproved) {
        if (def.parallelGate && def.parallelGate.assignees?.length) {
          await createParallelStepsTx(tx, expenseId, def.parallelGate, {
            companyId: expense.companyId,
            submitterId: expense.submitterId,
          });
          await tx.expense.update({
            where: { id: expenseId },
            data: { workflowPhase: 'parallel', currentBlockIndex: 1 },
          });
        } else {
          await finalizeApprovedTx(tx, expenseId);
        }
      }
      return;
    }

    if (stepToUse.blockIndex === 1) {
      const gate = def.parallelGate;
      const parallel = await tx.approvalStep.findMany({
        where: { expenseId, blockIndex: 1 },
      });
      const orSet = new Set(gate?.orUserIds ?? []);
      if (orSet.has(actorId)) {
        await finalizeApprovedTx(tx, expenseId);
        return;
      }
      const approvedCount = parallel.filter(
        (s) => s.status === ApprovalStepStatus.APPROVED
      ).length;
      const total = parallel.length;
      const threshold = gate?.percentageThreshold ?? 100;
      const need = Math.max(1, Math.ceil((threshold / 100) * total));
      if (approvedCount >= need) {
        await finalizeApprovedTx(tx, expenseId);
      }
    }
  });
}

async function findPendingStepForActor(
  steps: {
    id: string;
    blockIndex: number;
    status: ApprovalStepStatus;
    approverUserId: string | null;
    requiredRole: UserRole | null;
  }[],
  actorId: string,
  companyId: string
) {
  for (const s of steps) {
    if (s.status !== ApprovalStepStatus.PENDING) continue;
    if (await userMatchesStep(actorId, s, companyId)) return s;
  }
  return null;
}

async function finalizeApprovedTx(tx: Prisma.TransactionClient, expenseId: string) {
  await tx.expense.update({
    where: { id: expenseId },
    data: { status: ExpenseStatus.APPROVED, workflowPhase: 'done' },
  });
  await tx.approvalLog.create({
    data: {
      expenseId,
      action: ApprovalLogAction.APPROVED,
      comment: 'Workflow complete',
    },
  });
}

export async function processRejection(expenseId: string, actorId: string, comment?: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { approvalSteps: true },
  });
  if (!expense || expense.status !== ExpenseStatus.PENDING) {
    throw Object.assign(new Error('Expense not pending'), { status: 400 });
  }

  const step = await findPendingStepForActor(
    expense.approvalSteps,
    actorId,
    expense.companyId
  );
  if (!step) {
    throw Object.assign(new Error('No pending approval for this user'), { status: 403 });
  }

  await prisma.$transaction([
    prisma.approvalStep.updateMany({
      where: { expenseId },
      data: { status: ApprovalStepStatus.REJECTED, decidedAt: new Date() },
    }),
    prisma.expense.update({
      where: { id: expenseId },
      data: { status: ExpenseStatus.REJECTED },
    }),
    prisma.approvalLog.create({
      data: {
        expenseId,
        actorId,
        action: ApprovalLogAction.REJECTED,
        comment: comment ?? null,
      },
    }),
  ]);
}

export async function processOverride(
  expenseId: string,
  actorId: string,
  approve: boolean,
  comment?: string
) {
  await prisma.$transaction([
    prisma.approvalStep.updateMany({
      where: { expenseId },
      data: {
        status: approve ? ApprovalStepStatus.APPROVED : ApprovalStepStatus.SKIPPED,
        decidedAt: new Date(),
      },
    }),
    prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: approve ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED,
        workflowPhase: 'done',
      },
    }),
    prisma.approvalLog.create({
      data: {
        expenseId,
        actorId,
        action: approve
          ? ApprovalLogAction.OVERRIDE_APPROVED
          : ApprovalLogAction.OVERRIDE_REJECTED,
        comment: comment ?? null,
      },
    }),
  ]);
}

export async function processEscalation(
  expenseId: string,
  actorId: string,
  comment?: string
) {
  await prisma.approvalLog.create({
    data: {
      expenseId,
      actorId,
      action: ApprovalLogAction.ESCALATED,
      comment: comment ?? 'Escalated',
    },
  });
}
