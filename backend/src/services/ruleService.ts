import { prisma } from '../config/database.js';
import { workflowDefinitionSchema } from './workflowTypes.js';

export async function createRule(input: {
  companyId: string;
  name: string;
  isDefault?: boolean;
  definition: unknown;
}) {
  const definition = workflowDefinitionSchema.parse(input.definition);
  if (input.isDefault) {
    await prisma.approvalRule.updateMany({
      where: { companyId: input.companyId },
      data: { isDefault: false },
    });
  }
  return prisma.approvalRule.create({
    data: {
      companyId: input.companyId,
      name: input.name,
      isDefault: !!input.isDefault,
      definition: JSON.stringify(definition),
    },
  });
}

export async function listRules(companyId: string) {
  return prisma.approvalRule.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  });
}
