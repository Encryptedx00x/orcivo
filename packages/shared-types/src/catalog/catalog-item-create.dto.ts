import { z } from 'zod';
import Decimal from 'decimal.js';

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
  internal_code: z.string().max(60).nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  margin_percent: decimalString(3).nullable().optional(),
  markup_percent: decimalString(3).nullable().optional(),
  is_active: z.boolean().default(true),
});

export function calculateSalePrice(
  cost: string,
  input: { margin_percent?: string | null; markup_percent?: string | null },
): string {
  const base = new Decimal(cost);
  if (input.margin_percent) {
    return base
      .div(new Decimal(1).minus(new Decimal(input.margin_percent).div(100)))
      .toDecimalPlaces(2)
      .toFixed(2);
  }
  if (input.markup_percent) {
    return base
      .mul(new Decimal(1).plus(new Decimal(input.markup_percent).div(100)))
      .toDecimalPlaces(2)
      .toFixed(2);
  }
  return base.toDecimalPlaces(2).toFixed(2);
}

export function validateCatalogPricing(
  value: {
    unit_price?: string;
    sale_price?: string;
    margin_percent?: string | null;
    markup_percent?: string | null;
  },
  ctx: z.RefinementCtx,
  requirePrice = true,
) {
  if (
    requirePrice &&
    !value.unit_price &&
    !value.sale_price &&
    !value.margin_percent &&
    !value.markup_percent
  ) {
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
  if (value.margin_percent && value.markup_percent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['markup_percent'],
      message: 'Informe margem ou markup, não ambos.',
    });
  }
  if (value.margin_percent && new Decimal(value.margin_percent).gte(100)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['margin_percent'],
      message: 'A margem deve ser menor que 100%.',
    });
  }
}

export const CatalogItemCreateSchema = CatalogItemFieldsSchema.superRefine(validateCatalogPricing);
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
}).superRefine(validateCatalogPricing);

export const CatalogImportRequestSchema = z.union([
  z.object({ items: z.array(CatalogImportRowSchema).min(1).max(1000) }),
  z.object({ csv: z.string().min(1).max(2_000_000) }),
]);

export type CatalogImportRowDto = z.infer<typeof CatalogImportRowSchema>;
export type CatalogImportRequestDto = z.infer<typeof CatalogImportRequestSchema>;
