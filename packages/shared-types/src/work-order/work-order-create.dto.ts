import { z } from 'zod';

export const WorkOrderCreateSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  notes: z.string().max(2000).optional(),
  scheduled_at: z.string().datetime().optional(),
  assigned_to_user_id: z.string().uuid().optional(),
});

export type WorkOrderCreateDto = z.infer<typeof WorkOrderCreateSchema>;
