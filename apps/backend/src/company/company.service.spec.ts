import { NotFoundException } from '@nestjs/common';
import { CompanyService } from './company.service';

const mockPrisma = { company: { findUnique: jest.fn() } };
const mockAudit = { record: jest.fn() };

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompanyService(mockPrisma as never, mockAudit as never);
  });

  it('retorna a empresa quando existe', async () => {
    const company = { id: 'c1', trade_name: 'Elétrica Silva', plan_code: 'LIVRE' };
    mockPrisma.company.findUnique.mockResolvedValue(company);
    const result = await service.findCurrent('c1');
    expect(result).toEqual(company);
    expect(mockPrisma.company.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } }),
    );
  });

  it('lança NotFoundException quando empresa não existe', async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);
    await expect(service.findCurrent('non-existent')).rejects.toThrow(NotFoundException);
  });
});

describe('CompanyService.updateProfile', () => {
  let service: CompanyService;
  const mockTx = { company: { update: jest.fn() } };
  const txMockPrisma = {
    company: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(mockTx)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompanyService(txMockPrisma as never, mockAudit as never);
  });

  it('lança NotFoundException quando empresa não existe', async () => {
    txMockPrisma.company.findUnique.mockResolvedValue(null);
    await expect(service.updateProfile('missing', { trade_name: 'X' }, 'u1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('persiste os campos alterados e grava auditoria', async () => {
    const before = { id: 'c1', trade_name: 'Elétrica Silva', pix_key: null };
    const updated = {
      id: 'c1',
      trade_name: 'Elétrica Silva',
      pix_key: '12345678901',
    };
    txMockPrisma.company.findUnique.mockResolvedValue(before);
    mockTx.company.update.mockResolvedValue(updated);

    const result = await service.updateProfile(
      'c1',
      { pix_key_type: 'CPF', pix_key: '12345678901' },
      'u1',
    );

    expect(result).toEqual(updated);
    expect(mockTx.company.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: { pix_key: '12345678901' },
      }),
    );
    expect(mockAudit.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        companyId: 'c1',
        actorType: 'USER',
        actorUserId: 'u1',
        action: 'company.profile_updated',
        entityType: 'company',
        entityId: 'c1',
        from: { pix_key: null },
        to: { pix_key: '12345678901' },
      }),
    );
  });
});
