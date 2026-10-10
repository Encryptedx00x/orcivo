import { calculateSalePrice, CatalogItemCreateSchema } from './catalog-item-create.dto';

describe('preço do catálogo', () => {
  it('calcula margem e markup com Decimal e arredonda em centavos', () => {
    expect(calculateSalePrice('100.00', { margin_percent: '20' })).toBe('125.00');
    expect(calculateSalePrice('100.00', { markup_percent: '20' })).toBe('120.00');
    expect(calculateSalePrice('19.99', { markup_percent: '33.333' })).toBe('26.65');
    expect(
      CatalogItemCreateSchema.safeParse({
        name: 'Sensor',
        type: 'PRODUCT',
        cost_price: '100.00',
        margin_percent: '20',
      }).success,
    ).toBe(true);
  });

  it('impede margem e markup simultâneos e margem de 100%', () => {
    const base = { name: 'Sensor', type: 'PRODUCT', sale_price: '10.00' } as const;
    expect(
      CatalogItemCreateSchema.safeParse({ ...base, margin_percent: '20', markup_percent: '10' })
        .success,
    ).toBe(false);
    expect(CatalogItemCreateSchema.safeParse({ ...base, margin_percent: '100' }).success).toBe(
      false,
    );
  });
});
