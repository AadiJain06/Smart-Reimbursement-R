import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Demo12345!', 10);

  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Acme Demo Co',
      countryCode: 'US',
      defaultCurrency: 'USD',
    },
    update: {},
  });

  const admin = await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'admin@demo.com',
      },
    },
    create: {
      email: 'admin@demo.com',
      passwordHash,
      name: 'Alex Admin',
      role: 'ADMIN',
      companyId: company.id,
    },
    update: { passwordHash },
  });

  const manager = await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'manager@demo.com',
      },
    },
    create: {
      email: 'manager@demo.com',
      passwordHash,
      name: 'Morgan Manager',
      role: 'MANAGER',
      companyId: company.id,
      managerId: admin.id,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'employee@demo.com',
      },
    },
    create: {
      email: 'employee@demo.com',
      passwordHash,
      name: 'Erin Employee',
      role: 'EMPLOYEE',
      companyId: company.id,
      managerId: manager.id,
    },
    update: {},
  });

  await prisma.approvalRule.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      companyId: company.id,
      name: 'Default sequential + optional parallel',
      isDefault: true,
      definition: {
        sequential: [
          { assignee: 'role:MANAGER', label: 'Manager' },
          { assignee: 'role:ADMIN', label: 'Finance' },
        ],
        parallelGate: {
          assignees: ['role:ADMIN', 'role:ADMIN'],
          percentageThreshold: 60,
          orUserIds: [admin.id],
        },
      },
    },
    update: {},
  });

  console.log('Seed OK — demo@ passwords: Demo12345!');
  console.log('Users: admin@demo.com, manager@demo.com, employee@demo.com');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
