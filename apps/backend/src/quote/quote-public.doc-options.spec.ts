import { hideByDocOptions } from './quote-public.controller';

describe('hideByDocOptions (o link do cliente respeita "o que vai no orçamento")', () => {
  const quote = (doc_options?: unknown) => ({
    doc_options,
    subtotal: '200.00',
    discount_value: '10',
    total: '180.00',
    valid_until: '2026-10-30',
    notes: 'Garantia de 90 dias',
    items: [{ description: 'Instalação', quantity: '2', unit_price: '100.00', total: '200.00' }],
  });

  it('sem opções: envia tudo', () => {
    expect(hideByDocOptions(quote())).toEqual(quote());
  });

  it('sem preço por item e sem subtotal: só o total', () => {
    const q = hideByDocOptions(quote({ item_prices: false, subtotal: false }));
    expect(q.total).toBe('180.00');
    expect(q.subtotal).toBeNull();
    expect(q.discount_value).toBeNull();
    expect(q.items[0]).toEqual({ description: 'Instalação', quantity: '2' });
  });

  it('nada de valores, validade nem condições: nenhum dado escondido sai', () => {
    const q = hideByDocOptions(
      quote({ item_prices: false, subtotal: false, total: false, validity: false, terms: false }),
    );
    expect(JSON.stringify(q)).not.toMatch(/100\.00|180\.00|200\.00|2026-10-30|Garantia/);
  });
});
