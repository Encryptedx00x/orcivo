import { comparePaymentAmounts } from '../helpers/money';

describe('payment amount comparison', () => {
  it.each([
    ['99.99', '100.00', 'ABOVE', '0.01'],
    ['100.00', '100.00', 'EQUAL', '0.00'],
    ['100.00', '99.99', 'BELOW', '0.01'],
    ['0.10', '0.30', 'ABOVE', '0.20'],
  ] as const)(
    'compares %s expected with %s received using decimal strings',
    (expected, received, relation, difference) => {
      expect(comparePaymentAmounts(expected, received)).toEqual({
        expected_amount: expected,
        received_amount: received,
        difference,
        relation,
      });
    },
  );
});
