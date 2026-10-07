import { z } from 'zod';
import { WorkOrderDetailsSchema } from './work-order-fields';

export const WorkOrderCreateSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  notes: z.string().max(2000).optional(),
  scheduled_at: z.string().datetime().optional(),
  assigned_to_user_id: z.string().uuid().optional(),
  details: WorkOrderDetailsSchema.optional(),
});

export type WorkOrderCreateDto = z.infer<typeof WorkOrderCreateSchema>;
