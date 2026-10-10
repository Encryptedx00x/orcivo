import { Prisma } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const prisma = {
    payment: { findMany: jest.fn() },
    expense: { findMany: jest.fn() },
    customer: { findMany: jest.fn() },
    quote: { findMany: jest.fn() },
    workOrder: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const limits = { enforceReports: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new ReportsService(prisma as never, limits as never, audit as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback({}));
    audit.record.mockResolvedValue(undefined);
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.quote.findMany.mockResolvedValue([]);
    prisma.workOrder.findMany.mockResolvedValue([]);
  });

  it('mantém todos os cálculos tenant-scoped e como strings decimais', async () => {
    prisma.payment.findMany
      .mockResolvedValueOnce([
        {
          amount: new Prisma.Decimal('100.10'),
          method: 'PIX',
          customer: { id: 'c1', name: 'Ana' },
        },
        { amount: new Prisma.Decimal('20.20'), method: 'PIX', customer: { id: 'c1', name: 'Ana' } },
        {
          amount: new Prisma.Decimal('80.00'),
          method: 'CARTAO',
          customer: { id: 'c2', name: 'Bia' },
        },
      ])
      .mockResolvedValueOnce([{ amount: new Prisma.Decimal('10.00') }]);
    prisma.expense.findMany.mockResolvedValue([{ amount: new Prisma.Decimal('40.00') }]);
    prisma.customer.findMany.mockResolvedValue([{ origin: 'INSTAGRAM' }, { origin: null }]);

    const report = await service.report(
      'company-a',
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-31T23:59:59.999Z'),
    );

    expect(limits.enforceReports).toHaveBeenCalledWith('company-a');
    expect(report.totals).toEqual({
      received: '200.30',
      receivable: '10.00',
      costs: '40.00',
      result: '160.30',
    });
    expect(report.by_payment_method).toEqual(
      expect.arrayContaining([{ method: 'PIX', label: 'Pix', amount: '120.30' }]),
    );
    expect(report.top_customers[0]).toEqual({ customer_id: 'c1', name: 'Ana', amount: '120.30' });
    expect(report.customers_by_origin).toEqual(
      expect.arrayContaining([{ origin: 'UNKNOWN', label: 'Não informado', count: 1 }]),
    );
    for (const call of prisma.payment.findMany.mock.calls)
      expect(call[0].where.company_id).toBe('company-a');
  });

  it('gera CSV com BOM e ZIP de todas as categorias, auditando a exportação', async () => {
    prisma.customer.findMany.mockResolvedValue([
      { id: 'c1', name: 'Ana', created_at: new Date(), updated_at: new Date(), deleted_at: null },
    ]);
    const csv = await service.exportCsv('company-a', 'customers', 'user-a');
    expect(csv.filename).toBe('customers.csv');
    expect(csv.buffer.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(csv.buffer.toString('utf8')).toContain('Ana');

    const zip = await service.exportZip('company-a', 'user-a');
    expect(zip.buffer.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.buffer.toString('utf8')).toContain('customers.csv');
    expect(audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'data.exported' }),
    );
  });
});
