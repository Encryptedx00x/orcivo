import { z } from 'zod';
import { CatalogItemCreateSchema } from './catalog-item-create.dto';

export const CatalogItemUpdateSchema = CatalogItemCreateSchema.partial();
export type CatalogItemUpdateDto = z.infer<typeof CatalogItemUpdateSchema>;
