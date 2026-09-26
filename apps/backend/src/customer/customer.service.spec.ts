import { NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';

const mockTx = {
  customer: { create: jest.fn(), update: jest.fn() },
  auditLog: { create: jest.fn() },
};
const mockPrisma = {
  customer: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) => fn(mockTx)),
};
const mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockLimits = { enforceLimit: jest.fn().mockResolvedValue(undefined) };
    const mockOwnership = { assertActiveMember: jest.fn().mockResolvedValue(undefined) };
    service = new CustomerService(
      mockPrisma as never,
      mockLimits as never,
      mockOwnership as never,
      mockAudit as never,
    );
  });

  describe('create', () => {
    it('injeta company_id do tenant — ignora company_id do body — e grava auditoria', async () => {
      const dto = { name: 'Cliente A' };
      const created = { id: 'c1', ...dto, company_id: 'tenant-1' };
      mockTx.customer.create.mockResolvedValue(created);

      const result = await service.create(dto as never, 'tenant-1', 'user-1');
      expect(result.company_id).toBe('tenant-1');
      expect(mockTx.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ company_id: 'tenant-1' }) }),
      );
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'customer.created',
          entityType: 'customer',
          entityId: 'c1',
          actorUserId: 'user-1',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('filtra por company_id do tenant', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      await service.findAll('tenant-1', { page: 1, limit: 20 });
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ company_id: 'tenant-1' }) }),
      );
    });
  });

  describe('findOne', () => {
    it('retorna customer quando existe e pertence ao tenant', async () => {
      const customer = { id: 'cust-1', company_id: 'tenant-1', name: 'A' };
      mockPrisma.customer.findFirst.mockResolvedValue(customer);
      const result = await service.findOne('cust-1', 'tenant-1');
      expect(result).toEqual(customer);
    });

    it('lança NotFoundException (404) para customer de outro tenant', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.findOne('cust-B', 'tenant-A')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('atualiza customer tenant-scoped e grava auditoria', async () => {
      const existing = { id: 'cust-1', company_id: 'tenant-1', name: 'A' };
      const updated = { id: 'cust-1', company_id: 'tenant-1', name: 'B' };
      mockPrisma.customer.findFirst.mockResolvedValue(existing);
      mockTx.customer.update.mockResolvedValue(updated);

      const result = await service.update('cust-1', { name: 'B' } as never, 'tenant-1', 'user-1');

      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'cust-1',
            company_id: 'tenant-1',
            deleted_at: null,
          }),
        }),
      );
      expect(mockTx.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cust-1' }, data: { name: 'B' } }),
      );
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'customer.updated',
          entityType: 'customer',
          entityId: 'cust-1',
          actorUserId: 'user-1',
        }),
      );
      expect(result).toEqual(updated);
    });

    it('lança NotFoundException (404) para customer de outro tenant', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.update('cust-B', { name: 'B' } as never, 'tenant-A', 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(mockTx.customer.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('faz soft delete (deleted_at) e grava auditoria — nunca hard delete', async () => {
      const existing = { id: 'cust-1', company_id: 'tenant-1', name: 'Cliente A' };
      const deleted = { ...existing, deleted_at: new Date() };
      mockPrisma.customer.findFirst.mockResolvedValue(existing);
      mockTx.customer.update.mockResolvedValue(deleted);

      const result = await service.remove('cust-1', 'tenant-1', 'user-1');

      expect(mockTx.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cust-1' },
          data: { deleted_at: expect.any(Date) },
        }),
      );
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'customer.deleted',
          entityType: 'customer',
          entityId: 'cust-1',
          actorUserId: 'user-1',
        }),
      );
      expect(result).toEqual(deleted);
    });

    it('lança NotFoundException (404) para customer de outro tenant ou já excluído', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.remove('cust-B', 'tenant-A', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockTx.customer.update).not.toHaveBeenCalled();
    });
  });
});
