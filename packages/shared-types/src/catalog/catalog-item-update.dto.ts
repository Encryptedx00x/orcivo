import { z } from 'zod';
import { CatalogItemFieldsSchema } from './catalog-item-create.dto';

export const CatalogItemUpdateSchema = CatalogItemFieldsSchema.partial().superRefine(
  (value, ctx) => {
    if (value.unit_price && value.sale_price && value.unit_price !== value.sale_price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sale_price'],
        message: 'sale_price deve ser igual a unit_price quando ambos forem informados.',
      });
    }
  },
);
export type CatalogItemUpdateDto = z.infer<typeof CatalogItemUpdateSchema>;
