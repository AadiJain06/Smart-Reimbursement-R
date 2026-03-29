/** String constants stored in SQLite (Prisma has no native enum/Json on SQLite in v5). */

export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ExpenseStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ExpenseStatus = (typeof ExpenseStatus)[keyof typeof ExpenseStatus];

export const ApprovalStepStatus = {
  WAITING: 'WAITING',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SKIPPED: 'SKIPPED',
} as const;
export type ApprovalStepStatus =
  (typeof ApprovalStepStatus)[keyof typeof ApprovalStepStatus];

export const ApprovalLogAction = {
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ESCALATED: 'ESCALATED',
  OVERRIDE_APPROVED: 'OVERRIDE_APPROVED',
  OVERRIDE_REJECTED: 'OVERRIDE_REJECTED',
  COMMENT: 'COMMENT',
} as const;
export type ApprovalLogAction =
  (typeof ApprovalLogAction)[keyof typeof ApprovalLogAction];
