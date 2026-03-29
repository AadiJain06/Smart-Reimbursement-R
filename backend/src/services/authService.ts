import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { signToken } from '../utils/jwt.js';
import { getDefaultCurrencyForCountry } from './countryService.js';
import type { UserRole } from '@prisma/client';

const SALT_ROUNDS = 10;

export async function signup(input: {
  companyName: string;
  countryCode: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}) {
  const defaultCurrency = await getDefaultCurrencyForCountry(input.countryCode);
  const passwordHash = await bcrypt.hash(input.adminPassword, SALT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.companyName,
        countryCode: input.countryCode.toUpperCase(),
        defaultCurrency,
      },
    });
    const admin = await tx.user.create({
      data: {
        email: input.adminEmail.toLowerCase(),
        passwordHash,
        name: input.adminName,
        role: 'ADMIN',
        companyId: company.id,
      },
    });
    const defaultRule = await tx.approvalRule.create({
      data: {
        companyId: company.id,
        name: 'Default sequential',
        isDefault: true,
        definition: {
          sequential: [
            { assignee: 'role:MANAGER', label: 'Manager' },
            { assignee: 'role:ADMIN', label: 'Finance / Admin' },
          ],
        },
      },
    });
    return { company, admin, defaultRule };
  });

  const token = signToken({
    sub: result.admin.id,
    companyId: result.company.id,
    role: result.admin.role,
  });

  return {
    token,
    user: {
      id: result.admin.id,
      email: result.admin.email,
      name: result.admin.name,
      role: result.admin.role,
      companyId: result.company.id,
    },
    company: {
      id: result.company.id,
      name: result.company.name,
      defaultCurrency: result.company.defaultCurrency,
    },
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    include: { company: true },
  });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = signToken({
    sub: user.id,
    companyId: user.companyId,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      managerId: user.managerId,
    },
    company: {
      id: user.company.id,
      name: user.company.name,
      defaultCurrency: user.company.defaultCurrency,
    },
  };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      managerId: true,
    },
  });
}
