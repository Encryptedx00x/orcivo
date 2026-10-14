import { PHOTO_BUCKET } from '../storage/storage.service';
import { PaymentService } from './payment.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

describe('PaymentService — assinatura do recibo', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    payment: { update: jest.fn() },
  };
  const storage = {
    assertUploadable: jest.fn(),
    uploadBuffer: jest.fn(),
  };
  const users = { getSignatureBuffer: jest.fn() };
  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ name: 'Ana' });
    prisma.payment.update.mockResolvedValue({ id: 'pay-1' });
    storage.uploadBuffer.mockResolvedValue('key');
    service = new PaymentService(
      prisma as never,
      {} as never,
      {} as never,
      storage as never,
      users as never,
      {} as never,
    );
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'pay-1',
      status: 'PAID',
      receipt_number: 12,
    } as never);
  });

  it('congela uma cópia da assinatura salva no recibo', async () => {
    users.getSignatureBuffer.mockResolvedValue(PNG);

    await service.setReceiptSignature('pay-1', 'company-1', 'user-1', true);

    expect(users.getSignatureBuffer).toHaveBeenCalledWith('company-1', 'user-1');
    expect(storage.uploadBuffer).toHaveBeenCalledWith(
      PHOTO_BUCKET,
      'company-1/payments/pay-1/receipt-signature',
      PNG,
      'image/png',
    );
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: {
        receipt_signature_key: 'company-1/payments/pay-1/receipt-signature',
        receipt_signer_name: 'Ana',
      },
    });
  });

  it('valida e congela a assinatura avulsa sem ler nem sobrescrever a salva', async () => {
    await service.setReceiptSignatureOnce('pay-1', 'company-1', 'user-1', JPEG, 'image/jpeg');

    expect(storage.assertUploadable).toHaveBeenCalledWith(JPEG, 'image/jpeg', 2 * 1024 * 1024, [
      'image/png',
      'image/jpeg',
      'image/webp',
    ]);
    expect(users.getSignatureBuffer).not.toHaveBeenCalled();
    expect(storage.uploadBuffer).toHaveBeenCalledWith(
      PHOTO_BUCKET,
      'company-1/payments/pay-1/receipt-signature',
      JPEG,
      'image/jpeg',
    );
  });

  it('remove a assinatura do recibo sem alterar a assinatura salva', async () => {
    await service.setReceiptSignature('pay-1', 'company-1', 'user-1', false);

    expect(users.getSignatureBuffer).not.toHaveBeenCalled();
    expect(storage.uploadBuffer).not.toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { receipt_signature_key: null, receipt_signer_name: null },
    });
  });
});
