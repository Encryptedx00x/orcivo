import { quotePdfDeliveryPolicy } from './quote-status.enum';

describe('quotePdfDeliveryPolicy', () => {
  it('trata DRAFT como prévia interna com confirmação antes do download', () => {
    expect(quotePdfDeliveryPolicy('DRAFT')).toEqual({
      previewLabel: 'Ver prévia',
      downloadLabel: 'Baixar prévia',
      requiresDeliveryConfirmation: true,
    });
  });

  it.each(['SENT', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const)(
    'trata %s como PDF identificável pelo estado, sem confirmação de rascunho',
    (status) => {
      expect(quotePdfDeliveryPolicy(status)).toEqual({
        previewLabel: 'Ver PDF',
        downloadLabel: 'Baixar PDF',
        requiresDeliveryConfirmation: false,
      });
    },
  );
});
