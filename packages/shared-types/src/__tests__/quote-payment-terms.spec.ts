import Decimal from 'decimal.js';
import {
  buildPaymentSchedule,
  describePaymentTerms,
  QuotePaymentTermsSchema,
} from '../quote/quote-payment-terms';

const day = new Date(2026, 9, 7, 10, 0);
const sum = (rows: { amount: string }[]) =>
  rows.reduce((acc, r) => acc.plus(r.amount), new Decimal(0)).toFixed(2);

describe('payment terms', () => {
  it('à vista: one receivable with the whole total, due on approval', () => {
    const s = buildPaymentSchedule('315.00', { kind: 'A_VISTA' }, day, 'Orçamento #10');
    expect(s).toEqual([{ amount: '315.00', description: 'Orçamento #10', due_date: day }]);
  });

  it('entrada 50% + restante na conclusão', () => {
    const s = buildPaymentSchedule(
      '315.00',
      { kind: 'ENTRADA', upfront_percent: 50, rest: 'CONCLUSAO' },
      day,
      'Orçamento #10',
    );
    expect(s.map((r) => [r.amount, r.due_date])).toEqual([
      ['157.50', day],
      ['157.50', null],
    ]);
  });

  it('entrada 30% + 3 parcelas: sum is exact and installments are monthly', () => {
    const s = buildPaymentSchedule(
      '1000.00',
      { kind: 'ENTRADA', upfront_percent: 30, rest: 'PARCELAS', installments: 3 },
      day,
      'X',
    );
    expect(s.map((r) => r.amount)).toEqual(['300.00', '233.33', '233.33', '233.34']);
    expect(sum(s)).toBe('1000.00');
    expect(s[1].due_date?.getMonth()).toBe(10);
    expect(s[3].due_date?.getMonth()).toBe(0);
  });

  it('parcelado em 3: rounding goes to the last one', () => {
    const s = buildPaymentSchedule('100.00', { kind: 'PARCELADO', installments: 3 }, day, 'X');
    expect(s.map((r) => r.amount)).toEqual(['33.33', '33.33', '33.34']);
    expect(s[0].due_date).toEqual(day);
  });

  it('no terms or zero total → no receivables', () => {
    expect(buildPaymentSchedule('100.00', null, day, 'X')).toEqual([]);
    expect(buildPaymentSchedule('0', { kind: 'A_VISTA' }, day, 'X')).toEqual([]);
  });

  it('sentences', () => {
    expect(describePaymentTerms({ kind: 'A_VISTA' })).toBe('Pagamento à vista.');
    expect(describePaymentTerms({ kind: 'ENTRADA', upfront_percent: 50, rest: 'CONCLUSAO' })).toBe(
      'Entrada de 50% na aprovação e o restante na conclusão do serviço.',
    );
    expect(describePaymentTerms({ kind: 'PARCELADO', installments: 4 })).toBe(
      'Pagamento em 4 parcelas mensais.',
    );
  });

  it('schema rejects incomplete terms', () => {
    expect(QuotePaymentTermsSchema.safeParse({ kind: 'ENTRADA' }).success).toBe(false);
    expect(QuotePaymentTermsSchema.safeParse({ kind: 'PARCELADO' }).success).toBe(false);
    expect(
      QuotePaymentTermsSchema.safeParse({ kind: 'ENTRADA', upfront_percent: 50, rest: 'CONCLUSAO' })
        .success,
    ).toBe(true);
  });
});
