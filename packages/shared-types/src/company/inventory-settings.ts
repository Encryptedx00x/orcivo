import { z } from 'zod';

export const InventorySettingsSchema = z.object({
  stock_depletion_event: z.enum(['QUOTE_APPROVAL', 'WORK_ORDER_COMPLETION']),
  contact_save_preference: z.enum(['ALWAYS', 'NEVER', 'ASK']),
  catalog_name: z.string().min(1).max(80),
  catalog_units: z
    .array(z.string().trim().min(1).max(20))
    .min(1)
    .max(30)
    .transform((units) => [...new Set(units)]),
});

export type InventorySettingsDto = z.infer<typeof InventorySettingsSchema>;
