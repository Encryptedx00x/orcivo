import { z } from 'zod';

export const CustomerCreateSchema = z.object({
  name: z.string().min(1).max(150),
  type: z.enum(['PF', 'PJ']).optional(),
  tax_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  notes: z.string().max(1000).optional(),
  assigned_to_user_id: z.string().uuid().optional(),
});

export type CustomerCreateDto = z.infer<typeof CustomerCreateSchema>;
