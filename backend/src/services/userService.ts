import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import type { UserRole } from '../types/enums.js';

const SALT_ROUNDS = 10;

export async function createUser(input: {
  companyId: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  managerId?: string | null;
}) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  if (input.managerId) {
    const mgr = await prisma.user.findFirst({
      where: { id: input.managerId, companyId: input.companyId },
    });
    if (!mgr) throw Object.assign(new Error('Manager not found in company'), { status: 400 });
  }
  return prisma.user.create({
    data: {
      companyId: input.companyId,
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: input.role,
      managerId: input.managerId ?? undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      managerId: true,
      companyId: true,
    },
  });
}

export async function listUsers(companyId: string) {
  return prisma.user.findMany({
    where: { companyId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      managerId: true,
    },
    orderBy: { name: 'asc' },
  });
}
