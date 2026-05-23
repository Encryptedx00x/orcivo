import { z } from 'zod';
import { QuoteCreateSchema } from './quote-create.dto';

export const QuoteUpdateSchema = QuoteCreateSchema.omit({ items: true }).partial().extend({
  items: z
    .array(
      z.object({
        catalog_item_id: z.string().uuid().optional(),
        description: z.string().min(1).max(300),
        quantity: z.string().regex(/^\d+(\.\d{1,3})?$/),
        unit_price: z.string().regex(/^\d+(\.\d{1,2})?$/),
      }),
    )
    .min(1)
    .optional(),
});

export type QuoteUpdateDto = z.infer<typeof QuoteUpdateSchema>;
