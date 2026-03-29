import { z } from 'zod';

/** Assignee string: role:MANAGER | role:ADMIN | role:EMPLOYEE | user:<uuid> */
export const workflowDefinitionSchema = z.object({
  sequential: z
    .array(
      z.object({
        assignee: z.string(),
        label: z.string().optional(),
      })
    )
    .optional(),
  parallelGate: z
    .object({
      assignees: z.array(z.string()),
      percentageThreshold: z.number().min(0).max(100).optional(),
      orUserIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
});

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
