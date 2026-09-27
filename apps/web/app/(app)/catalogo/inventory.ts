import { CatalogItemCreateSchema } from '@orcivo/shared-types';
import type { CatalogItem } from '../../../lib/catalog.service';
import { inventoryRangeErrors } from './import-preview';

// Kept local because this task only owns the catalogue routes.
export interface InventoryItem extends CatalogItem {
  quantity?: number;
  low_stock_threshold?: number;
  cost_price?: string;
  sale_price?: string;
  is_low_stock?: boolean;
}

export function isLowStock(item: InventoryItem): boolean {
  return item.type === 'PRODUCT' && (item.is_low_stock ?? (
    item.quantity !== undefined && item.low_stock_threshold !== undefined &&
    item.quantity <= item.low_stock_threshold
  ));
}

export function parseCatalogForm(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? '').trim();
  const count = (key: string) => /^\d+$/.test(text(key)) ? Number(text(key)) : NaN;
  const item = CatalogItemCreateSchema.parse({
    name: text('name'),
    description: text('description'),
    type: text('type'),
    sale_price: text('sale_price').replace(',', '.'),
    cost_price: text('cost_price').replace(',', '.'),
    quantity: count('quantity'),
    low_stock_threshold: count('low_stock_threshold'),
    unit: text('unit'),
    is_active: formData.get('is_active') === 'true',
  });
  const errors = inventoryRangeErrors(item);
  if (errors.length) throw new Error(errors.join(' '));
  return item;
}
