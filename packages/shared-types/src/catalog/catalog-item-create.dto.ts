import { z } from 'zod';

export const CatalogItemCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['SERVICE', 'PRODUCT']),
  unit_price: z.string().regex(/^\d+(\.\d{1,2})?$/), // string decimal — nunca number
  unit: z.string().max(20).optional(),
  is_active: z.boolean().default(true),
});

export type CatalogItemCreateDto = z.infer<typeof CatalogItemCreateSchema>;
