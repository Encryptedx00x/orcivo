import { z } from 'zod';
import { WorkOrderDetailsSchema } from './work-order-fields';
import { WorkOrderStatusEnum } from './work-order-statuses';

export const WorkOrderUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  notes: z.string().max(2000).optional(),
  status: WorkOrderStatusEnum.optional(),
  scheduled_at: z.string().datetime().optional(),
  started_at: z.string().datetime().optional(),
  finished_at: z.string().datetime().optional(),
  assigned_to_user_id: z.string().uuid().optional(),
  details: WorkOrderDetailsSchema.optional(),
});

export type WorkOrderUpdateDto = z.infer<typeof WorkOrderUpdateSchema>;
