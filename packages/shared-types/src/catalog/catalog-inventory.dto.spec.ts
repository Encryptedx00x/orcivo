import {
  CatalogImportRequestSchema,
  CatalogItemCreateSchema,
  CatalogItemUpdateSchema,
} from '../index';

describe('catalog inventory schemas', () => {
  it('keeps monetary inventory values as decimal strings', () => {
    const parsed = CatalogItemCreateSchema.parse({
      name: 'Câmera HD',
      type: 'PRODUCT',
      quantity: 3,
      cost_price: '120.50',
      sale_price: '199.90',
    });

    expect(parsed.cost_price).toBe('120.50');
    expect(parsed.sale_price).toBe('199.90');
    expect(parsed.quantity).toBe(3);
    expect(parsed.low_stock_threshold).toBe(5);
    expect(parsed.unit_price).toBeUndefined();
    expect(
      CatalogItemCreateSchema.safeParse({
        name: 'Câmera HD',
        type: 'PRODUCT',
        sale_price: 199.9,
      }).success,
    ).toBe(false);
  });

  it('requires one price and prevents mismatched price aliases', () => {
    expect(CatalogItemCreateSchema.safeParse({ name: 'Item', type: 'PRODUCT' }).success).toBe(
      false,
    );
    expect(
      CatalogItemCreateSchema.safeParse({
        name: 'Item',
        type: 'PRODUCT',
        unit_price: '10.00',
        sale_price: '9.00',
      }).success,
    ).toBe(false);
    expect(CatalogItemUpdateSchema.safeParse({ quantity: 4 }).success).toBe(true);
  });

  it('accepts validated JSON import rows while rejecting invalid stock', () => {
    const valid = CatalogImportRequestSchema.safeParse({
      items: [
        {
          name: 'Sensor',
          type: 'PRODUCT',
          quantity: '2',
          cost_price: '10.00',
          sale_price: '20.00',
          low_stock_threshold: '2',
        },
      ],
    });
    expect(valid.success).toBe(true);
    if (valid.success && 'items' in valid.data) {
      expect(valid.data.items[0].quantity).toBe(2);
      expect(valid.data.items[0].cost_price).toBe('10.00');
    }
    expect(
      CatalogImportRequestSchema.safeParse({
        items: [{ name: 'Sensor', type: 'PRODUCT', quantity: '-1', sale_price: '20.00' }],
      }).success,
    ).toBe(false);
  });
});
