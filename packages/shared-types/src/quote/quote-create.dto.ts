import { z } from 'zod';

const decimalStr = (decimals = 2) =>
  z.string().regex(new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`));

export const QuoteItemSchema = z.object({
  catalog_item_id: z.string().uuid().optional(),
  description: z.string().min(1).max(300),
  quantity: decimalStr(3),
  unit_price: decimalStr(2),
});

export const QuoteCreateSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  valid_until: z.string().datetime().optional(),
  discount_type: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
  discount_value: decimalStr(2).default('0'),
  items: z.array(QuoteItemSchema).min(1),
});

export type QuoteCreateDto = z.infer<typeof QuoteCreateSchema>;
export type QuoteItemDto = z.infer<typeof QuoteItemSchema>;
