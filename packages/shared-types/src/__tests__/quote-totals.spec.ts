import { CatalogItemCreateSchema, calculateQuoteTotals } from '..';

describe('travel catalog items and quote totals', () => {
  it('accepts a decimal-string displacement fee as a reusable catalog item', () => {
    expect(
      CatalogItemCreateSchema.parse({
        name: 'Taxa de deslocamento',
        type: 'SERVICE',
        sale_price: '35.50',
      }),
    ).toMatchObject({ type: 'SERVICE', sale_price: '35.50' });
  });

  it('calculates catalog and travel items with Decimal strings and caps the discount', () => {
    expect(
      calculateQuoteTotals(
        [
          { quantity: '1.000', unit_price: '100.00' },
          { quantity: '1.000', unit_price: '35.50' },
        ],
        'FIXED',
        '999.00',
      ),
    ).toEqual({
      itemTotals: ['100.00', '35.50'],
      subtotal: '135.50',
      discount: '135.50',
      total: '0.00',
    });
  });
});
