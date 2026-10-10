import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StockService } from './stock.service';

describe('StockService', () => {
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const tx = {
    company: { findUnique: jest.fn() },
    workOrder: { findFirst: jest.fn() },
    quoteItem: { findMany: jest.fn() },
    stockMovement: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    catalogItem: { updateMany: jest.fn(), update: jest.fn() },
  };
  const service = new StockService(audit as never);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.company.findUnique.mockResolvedValue({ stock_depletion_event: 'QUOTE_APPROVAL' });
    tx.quoteItem.findMany.mockResolvedValue([
      {
        catalog_item_id: 'item-1',
        quantity: new Prisma.Decimal('2'),
        catalog_item: { name: 'Sensor', type: 'PRODUCT' },
      },
    ]);
    tx.stockMovement.findUnique.mockResolvedValue(null);
    tx.stockMovement.findFirst.mockResolvedValue(null);
    tx.catalogItem.updateMany.mockResolvedValue({ count: 1 });
    tx.stockMovement.create.mockResolvedValue({});
  });

  it('baixa uma única vez na aprovação e audita', async () => {
    await service.deductForQuoteApproval(tx as never, 'company-1', 'quote-1', 'wo-1');
    expect(tx.catalogItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: { decrement: 2 } } }),
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: 'company-1',
        type: 'DEBIT',
        event: 'QUOTE_APPROVAL',
      }),
    });
    expect(audit.record).toHaveBeenCalledTimes(1);

    tx.stockMovement.findUnique.mockResolvedValue({ id: 'existing' });
    await service.deductForQuoteApproval(tx as never, 'company-1', 'quote-1', 'wo-1');
    expect(tx.catalogItem.updateMany).toHaveBeenCalledTimes(1);
  });

  it('aborta a transação quando não há estoque suficiente', async () => {
    tx.catalogItem.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.deductForQuoteApproval(tx as never, 'company-1', 'quote-1', 'wo-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('soma itens repetidos do mesmo produto antes da baixa', async () => {
    tx.quoteItem.findMany.mockResolvedValue([
      {
        catalog_item_id: 'item-1',
        quantity: new Prisma.Decimal('2'),
        catalog_item: { name: 'Sensor', type: 'PRODUCT' },
      },
      {
        catalog_item_id: 'item-1',
        quantity: new Prisma.Decimal('3'),
        catalog_item: { name: 'Sensor', type: 'PRODUCT' },
      },
    ]);
    await service.deductForQuoteApproval(tx as never, 'company-1', 'quote-1', 'wo-1');
    expect(tx.catalogItem.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.catalogItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: { decrement: 5 } } }),
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: new Prisma.Decimal('5') }),
    });
  });

  it('devolve cada débito uma única vez ao cancelar a OS', async () => {
    tx.stockMovement.findMany.mockResolvedValue([
      {
        id: 'debit-1',
        catalog_item_id: 'item-1',
        quote_id: 'quote-1',
        quantity: new Prisma.Decimal('2'),
      },
    ]);
    tx.catalogItem.updateMany.mockResolvedValue({ count: 1 });
    await service.restoreForWorkOrder(tx as never, 'company-1', 'wo-1', 'WORK_ORDER_CANCEL');
    expect(tx.catalogItem.updateMany).toHaveBeenCalledWith({
      where: { id: 'item-1', company_id: 'company-1' },
      data: { quantity: { increment: 2 } },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'CREDIT',
        event: 'WORK_ORDER_CANCEL',
        reversal_of_id: 'debit-1',
      }),
    });
  });
});
