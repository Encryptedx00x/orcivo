import { isPositiveDecimal } from './quote-totals';

export type QuotePendingItemState = 'EMPTY' | 'INCOMPLETE' | 'READY';

export function quotePendingItemState(name: string, price: string): QuotePendingItemState {
  const normalizedName = name.trim();
  const normalizedPrice = price.trim();
  if (!normalizedName && !normalizedPrice) return 'EMPTY';
  if (normalizedName.length > 1 && isPositiveDecimal(normalizedPrice)) return 'READY';
  return 'INCOMPLETE';
}
