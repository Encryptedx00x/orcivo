import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  const tx = {
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    payment: { findMany: jest.fn(), findFirst: jest.fn() },
  };
  const ownership = {
    assertCustomer: jest.fn(),
    assertWorkOrder: jest.fn(),
    assertQuote: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentService(prisma as never, ownership as never, audit as never);
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
  });

  it('persists the supplied decimal string and records creation audit atomically', async () => {
    tx.payment.create.mockResolvedValue({
      id: 'payment-1',
      amount: { toString: () => '1250.50' },
      customer: { id: 'customer-1', name: 'Ana' },
    });

    await service.create(
      {
        customer_id: 'customer-1',
        work_order_id: 'work-order-1',
        amount: '1250.50',
        method: 'PIX',
        status: 'PAID',
      },
      'company-1',
      'user-1',
    );

    expect(tx.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: '1250.50',
          work_order_id: 'work-order-1',
          status: 'PAID',
        }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        companyId: 'company-1',
        actorUserId: 'user-1',
        action: 'payment.created',
        entityType: 'payment',
        entityId: 'payment-1',
        to: 'PAID',
      }),
    );
  });

  it('filters payment lists by the linked work order within the tenant', async () => {
    prisma.payment.findMany.mockResolvedValue([]);

    await service.findAll('company-1', { work_order_id: 'work-order-1' });

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ company_id: 'company-1', work_order_id: 'work-order-1' }),
      }),
    );
  });
});
