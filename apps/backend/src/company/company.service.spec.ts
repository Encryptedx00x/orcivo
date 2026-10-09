import { NotFoundException } from '@nestjs/common';
import { CompanyService } from './company.service';

const mockPrisma = { company: { findUnique: jest.fn() } };
const mockAudit = { record: jest.fn() };

describe('CompanyService', () => {
  let service: CompanyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompanyService(mockPrisma as never, mockAudit as never, {} as never);
  });

  it('retorna a empresa quando existe', async () => {
    const company = { id: 'c1', trade_name: 'Elétrica Silva', plan_code: 'LIVRE' };
    mockPrisma.company.findUnique.mockResolvedValue(company);
    const result = await service.findCurrent('c1');
    expect(result).toEqual({ ...company, logo_url: null });
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
    service = new CompanyService(txMockPrisma as never, mockAudit as never, {} as never);
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

describe('CompanyService.updateWorkOrderStatuses (R5b)', () => {
  let service: CompanyService;
  const mockTx = { company: { update: jest.fn() } };
  const txMockPrisma = {
    company: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(mockTx)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompanyService(txMockPrisma as never, mockAudit as never, {} as never);
  });

  it('lança NotFoundException quando empresa não existe', async () => {
    txMockPrisma.company.findUnique.mockResolvedValue(null);
    await expect(service.updateWorkOrderStatuses('missing', [], 'u1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('persiste os extras ligados e grava auditoria from/to', async () => {
    const before = { id: 'c1', trade_name: 'Elétrica Silva', work_order_statuses: [] };
    const updated = { id: 'c1', trade_name: 'Elétrica Silva', work_order_statuses: ['WARRANTY'] };
    txMockPrisma.company.findUnique.mockResolvedValue(before);
    mockTx.company.update.mockResolvedValue(updated);

    const result = await service.updateWorkOrderStatuses('c1', ['WARRANTY'], 'u1');

    expect(result).toEqual(updated);
    expect(mockTx.company.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: { work_order_statuses: ['WARRANTY'] },
      }),
    );
    expect(mockAudit.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        companyId: 'c1',
        actorType: 'USER',
        actorUserId: 'u1',
        action: 'company.work_order_statuses_changed',
        entityType: 'company',
        entityId: 'c1',
        from: [],
        to: ['WARRANTY'],
      }),
    );
    expect(mockAudit.record.mock.calls[0][1].humanText).toContain('Em garantia');
  });

  it('lista vazia desliga os extras e registra (nenhum)', async () => {
    const before = {
      id: 'c1',
      trade_name: 'Elétrica Silva',
      work_order_statuses: ['AWAITING_PAYMENT', 'WARRANTY'],
    };
    const updated = { id: 'c1', trade_name: 'Elétrica Silva', work_order_statuses: [] };
    txMockPrisma.company.findUnique.mockResolvedValue(before);
    mockTx.company.update.mockResolvedValue(updated);

    await service.updateWorkOrderStatuses('c1', [], 'u1');

    expect(mockAudit.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ from: ['AWAITING_PAYMENT', 'WARRANTY'], to: [] }),
    );
    expect(mockAudit.record.mock.calls[0][1].humanText).toContain('(nenhum)');
  });
});
