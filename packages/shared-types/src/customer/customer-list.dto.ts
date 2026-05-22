import { z } from 'zod';

export const CustomerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type CustomerListQueryDto = z.infer<typeof CustomerListQuerySchema>;

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['PF', 'PJ']).nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  created_at: z.string(),
});

export type CustomerDto = z.infer<typeof CustomerSchema>;
