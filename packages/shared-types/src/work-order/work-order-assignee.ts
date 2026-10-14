import { z } from 'zod';

export const WorkOrderAssignableMemberSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(1),
});

export type WorkOrderAssignableMember = z.infer<typeof WorkOrderAssignableMemberSchema>;
