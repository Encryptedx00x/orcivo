import { reviewQuoteCompleteness } from './quote-completeness';

describe('reviewQuoteCompleteness', () => {
  it('lista somente opcionais relevantes que ficarão fora do documento', () => {
    expect(reviewQuoteCompleteness({})).toEqual({
      complete: false,
      missing: [
        expect.objectContaining({ field: 'valid_until' }),
        expect.objectContaining({ field: 'payment_terms' }),
        expect.objectContaining({ field: 'warranty' }),
        expect.objectContaining({ field: 'notes' }),
      ],
    });
  });

  it('não sugere validade ou textos ocultados pelas opções do documento', () => {
    const review = reviewQuoteCompleteness({
      doc_options: { validity: false, terms: false },
    });

    expect(review.missing.map((item) => item.field)).toEqual(['payment_terms']);
  });

  it('fica completo quando todos os opcionais relevantes foram preenchidos', () => {
    expect(
      reviewQuoteCompleteness({
        valid_until: '2026-10-30T23:59:59.000Z',
        payment_terms: { kind: 'A_VISTA', methods: ['PIX'] },
        warranty: '90 dias sobre a mão de obra.',
        notes: 'Materiais por conta do cliente.',
      }),
    ).toEqual({ complete: true, missing: [] });
  });
});
