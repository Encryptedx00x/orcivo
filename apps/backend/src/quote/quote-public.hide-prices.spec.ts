import { hidePrices } from './quote-public.controller';

describe('hidePrices (link público respeita "o que o cliente vê dos preços")', () => {
  const quote = (price_display: string) => ({
    price_display,
    subtotal: '200.00',
    discount_value: '10',
    total: '180.00',
    items: [{ description: 'Instalação', quantity: '2', unit_price: '100.00', total: '200.00' }],
  });

  it('ITEMS: envia tudo', () => {
    expect(hidePrices(quote('ITEMS'))).toEqual(quote('ITEMS'));
  });

  it('TOTAL: só o total, sem preço por item nem subtotal/desconto', () => {
    const q = hidePrices(quote('TOTAL'));
    expect(q.total).toBe('180.00');
    expect(q.subtotal).toBeNull();
    expect(q.discount_value).toBeNull();
    expect(q.items[0]).toEqual({ description: 'Instalação', quantity: '2' });
  });

  it('NONE: nenhum valor sai para o cliente', () => {
    const q = hidePrices(quote('NONE'));
    expect(q.total).toBeNull();
    expect(JSON.stringify(q)).not.toMatch(/100\.00|180\.00|200\.00/);
  });
});
