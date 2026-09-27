import { z } from 'zod';

export const decimalString = (decimals = 2) =>
  z.string().regex(new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`));

export const CatalogItemFieldsSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['SERVICE', 'PRODUCT']),
  // unit_price is retained as the legacy quote price API field. sale_price is
  // the inventory name for the same customer-facing price, so the backend
  // keeps both fields in sync.
  unit_price: decimalString().optional(),
  sale_price: decimalString().optional(),
  cost_price: decimalString().default('0'),
  quantity: z.number().int().nonnegative().default(0),
  low_stock_threshold: z.number().int().nonnegative().default(5),
  unit: z.string().max(20).optional(),
  is_active: z.boolean().default(true),
});

function validatePrice(value: { unit_price?: string; sale_price?: string }, ctx: z.RefinementCtx) {
  if (!value.unit_price && !value.sale_price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sale_price'],
      message: 'Informe sale_price ou unit_price.',
    });
  }
  if (value.unit_price && value.sale_price && value.unit_price !== value.sale_price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sale_price'],
      message: 'sale_price deve ser igual a unit_price quando ambos forem informados.',
    });
  }
}

export const CatalogItemCreateSchema = CatalogItemFieldsSchema.superRefine(validatePrice);
export type CatalogItemCreateDto = z.infer<typeof CatalogItemCreateSchema>;

const csvBoolean = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}, z.boolean().default(true));

/**
 * A row accepted by JSON imports and by the parsed CSV importer. Monetary
 * values remain decimal strings; only stock counts are coerced.
 */
export const CatalogImportRowSchema = CatalogItemFieldsSchema.extend({
  quantity: z.coerce.number().int().nonnegative().default(0),
  low_stock_threshold: z.coerce.number().int().nonnegative().default(5),
  is_active: csvBoolean,
}).superRefine(validatePrice);

export const CatalogImportRequestSchema = z.union([
  z.object({ items: z.array(CatalogImportRowSchema).min(1).max(1000) }),
  z.object({ csv: z.string().min(1).max(2_000_000) }),
]);

export type CatalogImportRowDto = z.infer<typeof CatalogImportRowSchema>;
export type CatalogImportRequestDto = z.infer<typeof CatalogImportRequestSchema>;
