import Decimal from 'decimal.js';

export type QuoteMoneyItem = {
  quantity: string;
  unit_price: string;
};

export type QuoteDiscountType = 'PERCENT' | 'FIXED';

export type QuoteTotals = {
  itemTotals: string[];
  subtotal: string;
  discount: string;
  total: string;
};

/**
 * Single monetary rule for quote totals. All inputs and outputs are decimal
 * strings so no client or service needs to cross a floating-point boundary.
 */
export function calculateQuoteTotals(
  items: QuoteMoneyItem[],
  discountType: QuoteDiscountType,
  discountValue: string,
): QuoteTotals {
  const itemValues = items.map((item) => new Decimal(item.quantity).mul(item.unit_price));
  const subtotal = itemValues.reduce((sum, value) => sum.add(value), new Decimal('0'));
  const requestedDiscount = Decimal.max(new Decimal(discountValue || '0'), new Decimal('0'));
  const discount =
    discountType === 'PERCENT'
      ? subtotal.mul(Decimal.min(requestedDiscount, new Decimal('100'))).div(new Decimal('100'))
      : Decimal.min(requestedDiscount, subtotal);

  return {
    itemTotals: itemValues.map((value) => value.toFixed(2)),
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    total: subtotal.sub(discount).toFixed(2),
  };
}

/** Decimal validation for UI previews, without Number or parseFloat. */
export function isPositiveDecimal(value: string): boolean {
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() && decimal.greaterThan(0);
  } catch {
    return false;
  }
}

export function isNonNegativeDecimal(value: string): boolean {
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() && decimal.greaterThanOrEqualTo(0);
  } catch {
    return false;
  }
}
