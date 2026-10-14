import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  it('persiste defaults do recibo e registra o snapshot na auditoria', async () => {
    const before = {
      id: 'c1',
      trade_name: 'Elétrica Silva',
      receipt_default_doc_options: null,
    };
    const defaults = {
      company_details: true,
      client_details: false,
      payment_details: true,
      additional_info: true,
      pix: false,
      footer: true,
    };
    const updated = { ...before, receipt_default_doc_options: defaults };
    txMockPrisma.company.findUnique.mockResolvedValue(before);
    mockTx.company.update.mockResolvedValue(updated);

    await service.updateProfile('c1', { receipt_default_doc_options: defaults }, 'u1');

    expect(mockTx.company.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { receipt_default_doc_options: defaults } }),
    );
    expect(mockAudit.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        from: { receipt_default_doc_options: null },
        to: { receipt_default_doc_options: defaults },
        humanText: expect.stringContaining('o que vai no recibo'),
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

describe('CompanyService.updateHomeShortcuts (R8)', () => {
  const mockTx = { company: { update: jest.fn() } };
  const txMockPrisma = {
    company: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(mockTx)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAudit.record.mockResolvedValue(undefined);
  });

  it('persiste somente os atalhos escolhidos pela empresa e registra auditoria', async () => {
    const service = new CompanyService(txMockPrisma as never, mockAudit as never, {} as never);
    txMockPrisma.company.findUnique.mockResolvedValue({
      trade_name: 'Elétrica Silva',
      home_shortcuts: ['CUSTOMER', 'QUOTE'],
    });
    mockTx.company.update.mockResolvedValue({ home_shortcuts: ['QUOTE', 'PAYMENT'] });

    await service.updateHomeShortcuts('c1', { shortcuts: ['QUOTE', 'PAYMENT'] }, 'u1');

    expect(mockTx.company.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { home_shortcuts: ['QUOTE', 'PAYMENT'] },
      }),
    );
    expect(mockAudit.record).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        action: 'company.home_shortcuts_changed',
        from: ['CUSTOMER', 'QUOTE'],
        to: ['QUOTE', 'PAYMENT'],
      }),
    );
  });
});

describe('CompanyService.uploadLogo', () => {
  const mockTx = { company: { update: jest.fn() } };
  const uploadPrisma = {
    company: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(mockTx)),
  };
  const mockStorage = {
    assertUploadable: jest.fn(),
    uploadBuffer: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAudit.record.mockResolvedValue(undefined);
    mockStorage.uploadBuffer.mockResolvedValue(undefined);
    mockStorage.getSignedUrl.mockResolvedValue('https://storage.local/logo');
    uploadPrisma.company.findUnique.mockResolvedValue({ id: 'c1', logo_url: 'c1/branding/logo' });
  });

  it.each(['image/png', 'image/jpeg', 'image/webp'])(
    'valida e armazena %s no espaço isolado da empresa',
    async (mimetype) => {
      const service = new CompanyService(
        uploadPrisma as never,
        mockAudit as never,
        mockStorage as never,
      );
      const buffer = Buffer.from('logo');

      const result = await service.uploadLogo('c1', { buffer, mimetype }, 'u1');

      expect(mockStorage.assertUploadable).toHaveBeenCalledWith(buffer, mimetype, 2 * 1024 * 1024, [
        'image/png',
        'image/jpeg',
        'image/webp',
      ]);
      expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
        'orcivo-photos',
        'c1/branding/logo',
        buffer,
        mimetype,
      );
      expect(mockTx.company.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { logo_url: 'c1/branding/logo' },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          companyId: 'c1',
          actorUserId: 'u1',
          action: 'company.logo_updated',
        }),
      );
      expect(result.logo_url).toBe('https://storage.local/logo');
    },
  );

  it('recusa requisição sem imagem', async () => {
    const service = new CompanyService(
      uploadPrisma as never,
      mockAudit as never,
      mockStorage as never,
    );

    await expect(service.uploadLogo('c1', undefined, 'u1')).rejects.toThrow(BadRequestException);
    expect(mockStorage.uploadBuffer).not.toHaveBeenCalled();
  });
});
