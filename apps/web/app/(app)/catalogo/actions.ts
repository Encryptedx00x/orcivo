'use server';

import { redirect } from 'next/navigation';
import { catalogService } from '../../../lib/catalog.service';
import { CatalogItemCreateSchema } from '@orcivo/shared-types';

export async function createCatalogItemAction(formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || undefined,
    type: formData.get('type') as 'SERVICE' | 'PRODUCT',
    unit_price: (formData.get('unit_price') as string).replace(',', '.'),
    unit: (formData.get('unit') as string) || undefined,
    is_active: formData.get('is_active') === 'true',
  };

  const parsed = CatalogItemCreateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(', '));
  }

  await catalogService.createItem(parsed.data);
  redirect('/catalogo');
}

export async function updateCatalogItemAction(id: string, formData: FormData) {
  const raw: Record<string, unknown> = {};

  const name = formData.get('name') as string;
  if (name) raw['name'] = name;

  const description = formData.get('description') as string;
  if (description) raw['description'] = description;

  const type = formData.get('type') as string;
  if (type) raw['type'] = type;

  const unit_price = formData.get('unit_price') as string;
  if (unit_price) raw['unit_price'] = unit_price.replace(',', '.');

  const unit = formData.get('unit') as string;
  if (unit) raw['unit'] = unit;

  raw['is_active'] = formData.get('is_active') === 'true';

  await catalogService.updateItem(id, raw);
  redirect('/catalogo');
}
