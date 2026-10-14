import {
  ReceiptSignatureModeEnum,
  ReceiptSignatureUpdateSchema,
  receiptSignatureShouldApply,
} from './receipt-signature';

describe('receipt signature contract', () => {
  it('accepts every UI mode and keeps ONCE out of the JSON update endpoint', () => {
    expect(ReceiptSignatureModeEnum.options).toEqual(['NONE', 'SAVED', 'ONCE']);
    expect(ReceiptSignatureUpdateSchema.safeParse({ mode: 'ONCE' }).success).toBe(false);
  });

  it('normalizes explicit and legacy saved-signature choices', () => {
    expect(receiptSignatureShouldApply({ mode: 'SAVED' })).toBe(true);
    expect(receiptSignatureShouldApply({ mode: 'NONE' })).toBe(false);
    expect(receiptSignatureShouldApply({ apply: true })).toBe(true);
  });
});
