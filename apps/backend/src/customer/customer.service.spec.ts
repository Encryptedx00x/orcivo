import { NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';

const mockPrisma = {
  customer: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('CustomerService', () => {
  let service: CustomerService;

  beforeEach(() => {
    jest.clearAllMocks();
    const mockLimits = { enforceLimit: jest.fn().mockResolvedValue(undefined) };
    const mockOwnership = { assertActiveMember: jest.fn().mockResolvedValue(undefined) };
    service = new CustomerService(mockPrisma as never, mockLimits as never, mockOwnership as never);
  });

  describe('create', () => {
    it('injeta company_id do tenant — ignora company_id do body', async () => {
      const dto = { name: 'Cliente A' };
      const created = { id: 'c1', ...dto, company_id: 'tenant-1' };
      mockPrisma.customer.create.mockResolvedValue(created);

      const result = await service.create(dto as never, 'tenant-1');
      expect(result.company_id).toBe('tenant-1');
      expect(mockPrisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ company_id: 'tenant-1' }) }),
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
});
