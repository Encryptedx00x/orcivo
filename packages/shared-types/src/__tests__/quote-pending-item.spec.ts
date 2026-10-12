import { quotePendingItemState } from '../quote/quote-pending-item';

describe('quotePendingItemState', () => {
  it.each([
    ['', '', 'EMPTY'],
    ['Instalação', '', 'INCOMPLETE'],
    ['', '10.00', 'INCOMPLETE'],
    ['I', '10.00', 'INCOMPLETE'],
    ['Instalação', '0.00', 'INCOMPLETE'],
    ['Instalação', '10.00', 'READY'],
  ] as const)('classifica nome=%p e preço=%p como %s', (name, price, expected) => {
    expect(quotePendingItemState(name, price)).toBe(expected);
  });
});
