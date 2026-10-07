// Mock quote-pdf.service before any imports to prevent ESM issues with @react-pdf/renderer
jest.mock('./quote-pdf.service', () => ({
  QuotePdfService: class {
    generate = jest.fn().mockResolvedValue(Buffer.from('PDF'));
  },
}));

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QuoteService } from './quote.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { PHOTO_BUCKET, StorageService } from '../storage/storage.service';
import { WorkOrderService } from '../work-order/work-order.service';
import { QuotePdfService } from './quote-pdf.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';

const mockTx = {
  quoteApproval: { create: jest.fn() },
  quote: { updateMany: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  auditLog: { create: jest.fn() },
};

const mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

const mockPrisma = {
  quote: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  quoteApproval: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  company: {
    findUnique: jest.fn().mockResolvedValue({ quote_default_doc_options: { total: false } }),
    findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'comp-1',
      trade_name: 'Empresa',
      plan_code: 'SOLO',
      phone: null,
      city: null,
      state: null,
      logo_url: null,
      pix_key: null,
    }),
  },
  $transaction: jest.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

const mockRedis = {
  incr: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('http://localhost:3000'),
};

const mockQueue = {
  add: jest.fn(),
};

const mockStorage = {
  deleteObject: jest.fn().mockResolvedValue(undefined),
  uploadBuffer: jest.fn((_bucket: string, objectName: string) => Promise.resolve(objectName)),
  resolveUrl: jest.fn((_bucket: string, stored: string | null) =>
    Promise.resolve(stored ? `https://minio.example.com/signed/${stored}?X-Amz-Signature=x` : null),
  ),
  getSignedUrl: jest.fn((_bucket: string, key: string) =>
    Promise.resolve(`https://minio.example.com/signed/${key}?X-Amz-Signature=x`),
  ),
  extractKey: jest.fn((_bucket: string, stored: string | null) => stored ?? null),
  assertUploadable: jest.fn(),
  getObjectBuffer: jest.fn().mockResolvedValue(Buffer.from('PDF_BYTES')),
  inlineImage: jest.fn(async (v: string | null | undefined) => v ?? null),
};

const mockWorkOrderService = {
  assertCreatable: jest.fn().mockResolvedValue(undefined),
  create: jest.fn().mockResolvedValue({ id: 'wo-1' }),
};

const mockPdfService = {
  generate: jest.fn().mockResolvedValue(Buffer.from('PDF')),
};

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

const mockUsersService = {
  getSignatureBuffer: jest.fn().mockResolvedValue(null),
};

describe('QuoteService', () => {
  let service: QuoteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getQueueToken('quote-expiry'), useValue: mockQueue },
        { provide: StorageService, useValue: mockStorage },
        { provide: WorkOrderService, useValue: mockWorkOrderService },
        { provide: QuotePdfService, useValue: mockPdfService },
        {
          provide: PlanLimitsService,
          useValue: { enforceLimit: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: TenantOwnershipService,
          useValue: {
            assertCustomer: jest.fn().mockResolvedValue(undefined),
            assertCatalogItems: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: AuditService, useValue: mockAudit },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();
    service = module.get<QuoteService>(QuoteService);
  });

  describe('create()', () => {
    it('Test 1: calcula subtotal e total via Decimal (nunca parseFloat)', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockPrisma.quote.create.mockResolvedValue({
        id: 'q1',
        subtotal: '30.00',
        total: '30.00',
        items: [],
      });

      const dto = {
        customer_id: 'cust-uuid',
        items: [
          { description: 'Item A', quantity: '2', unit_price: '10.00' },
          { description: 'Item B', quantity: '1', unit_price: '10.00' },
        ],
        discount_type: 'PERCENT' as const,
        discount_value: '0',
      };

      await service.create(dto, 'comp-1', 'user-1');
      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: '30.00',
            total: '30.00',
          }),
        }),
      );
    });

    it('Test 1b: sem escolha no formulário, usa os preços padrão da empresa; com escolha, respeita', async () => {
      const dto = {
        customer_id: 'cust-uuid',
        items: [{ description: 'Item A', quantity: '1', unit_price: '10.00' }],
        discount_type: 'PERCENT' as const,
        discount_value: '0',
      };
      await service.create(dto, 'comp-1', 'user-1');
      expect(mockPrisma.quote.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ doc_options: { total: false } }),
        }),
      );
      await service.create({ ...dto, doc_options: { title: 'PROPOSTA' } }, 'comp-1', 'user-1');
      expect(mockPrisma.quote.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ doc_options: { title: 'PROPOSTA' } }),
        }),
      );
    });
  });

  describe('update()', () => {
    const baseDraft = {
      id: 'q1',
      company_id: 'comp-1',
      number: 7,
      status: 'DRAFT',
      title: 'Original',
      notes: 'obs original',
      discount_type: 'PERCENT',
      discount_value: { toString: () => '0' },
      items: [
        {
          id: 'item-1',
          description: 'Item A',
          quantity: { toString: () => '1' },
          unit_price: { toString: () => '10.00' },
        },
      ],
    };

    it('PB1-P35/AC1: edita campos diretamente quando status é DRAFT e grava auditoria', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(baseDraft);
      mockTx.quote.findUnique.mockResolvedValue({
        id: 'q1',
        number: 7,
        customer: { name: 'Maria' },
        items: [],
      });

      await service.update(
        'q1',
        {
          title: 'Novo título',
          items: [{ description: 'Item B', quantity: '2', unit_price: '5.00' }],
        },
        'comp-1',
        'user-1',
      );

      expect(mockTx.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1' },
          data: expect.objectContaining({
            title: 'Novo título',
            subtotal: '10.00',
            total: '10.00',
          }),
        }),
      );
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'quote.updated',
          entityType: 'quote',
          entityId: 'q1',
        }),
      );
    });

    it('PB1-P35/AC1: rejeita edição direta fora de DRAFT (mantém a máquina de estados)', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ ...baseDraft, status: 'SENT' });

      await expect(
        service.update('q1', { title: 'Novo título' }, 'comp-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.quote.update).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('PB1-P35: 404 quando o orçamento não existe no tenant', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(service.update('q1', { title: 'x' }, 'comp-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('send()', () => {
    it('Test 2: send() com DRAFT gera approval_token UUID e salva no Redis TTL 604800', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'DRAFT',
        valid_until: null,
        items: [],
        customer: {},
        approval: null,
      });
      mockRedis.set.mockResolvedValue(undefined);
      mockTx.quote.update.mockResolvedValue({
        id: 'q1',
        number: 7,
        status: 'SENT',
        approval_token: 'tok',
        valid_until: null,
      });

      const result = await service.send('q1', 'comp-1', 'user-1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('quote:approval:'),
        'q1',
        'EX',
        604800,
      );
      expect(result.approval_token).toBeTruthy();
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ action: 'quote.sent', to: 'SENT', actorUserId: 'user-1' }),
      );
    });

    it('Test 3: send() com quote SENT lança BadRequestException (SENT→SENT inválido)', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        items: [],
        customer: {},
        approval: null,
      });

      await expect(service.send('q1', 'comp-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('Test PB1-P12/AC2: send() gera o PDF carimbado SENT — PDF enviado nunca exibe Rascunho', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'DRAFT',
        number: 7,
        valid_until: null,
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });
      mockRedis.set.mockResolvedValue(undefined);
      mockTx.quote.update.mockResolvedValue({
        id: 'q1',
        number: 7,
        status: 'SENT',
        approval_token: 'tok',
        valid_until: null,
      });

      await service.send('q1', 'comp-1', 'user-1');

      // O carimbo 'SENT' sobrescreve o status DRAFT carregado do banco:
      // o selo do PDF anexado ao envio é o estado do momento do envio.
      expect(mockPdfService.generate).toHaveBeenCalledTimes(1);
      expect(mockPdfService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SENT' }),
        expect.objectContaining({ trade_name: 'Empresa' }),
      );
    });

    it('Test PB1-P10/AC2: send() com apply_signature=true resolve a signature key do técnico (tenant-scoped) e a injeta no PDF', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'DRAFT',
        number: 7,
        valid_until: null,
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });
      mockRedis.set.mockResolvedValue(undefined);
      mockTx.quote.update.mockResolvedValue({
        id: 'q1',
        number: 7,
        status: 'SENT',
        approval_token: 'tok',
        valid_until: null,
      });
      mockUsersService.getSignatureBuffer.mockResolvedValueOnce(PNG);

      await service.send('q1', 'comp-1', 'user-1', true);

      expect(mockUsersService.getSignatureBuffer).toHaveBeenCalledWith('comp-1', 'user-1');
      // Frozen per-quote copy, so later PDFs keep the signature that was sent.
      expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
        PHOTO_BUCKET,
        'comp-1/quotes/q1/technician-signature',
        PNG,
        'image/png',
      );
      expect(mockPdfService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          technician_signature_url: `data:image/png;base64,${PNG.toString('base64')}`,
        }),
        expect.anything(),
      );
      expect(mockTx.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            technician_signature_key: 'comp-1/quotes/q1/technician-signature',
          }),
        }),
      );
    });

    it('PDF regerado depois do envio (download no app) mantém a assinatura congelada', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'APPROVED',
        number: 7,
        items: [],
        customer: { name: 'Maria' },
        approval: null,
        technician_signature_key: 'comp-1/quotes/q1/technician-signature',
      });
      mockStorage.getObjectBuffer.mockResolvedValueOnce(PNG);

      await service.generatePdf('q1', 'comp-1');

      expect(mockStorage.getObjectBuffer).toHaveBeenCalledWith(
        PHOTO_BUCKET,
        'comp-1/quotes/q1/technician-signature',
      );
      expect(mockPdfService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'APPROVED',
          technician_signature_url: `data:image/png;base64,${PNG.toString('base64')}`,
        }),
        expect.anything(),
      );
    });

    it('Test PB1-P10/AC2: send() sem apply_signature não consulta a assinatura do técnico', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'DRAFT',
        number: 7,
        valid_until: null,
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });
      mockRedis.set.mockResolvedValue(undefined);
      mockTx.quote.update.mockResolvedValue({
        id: 'q1',
        number: 7,
        status: 'SENT',
        approval_token: 'tok',
        valid_until: null,
      });
      await service.send('q1', 'comp-1', 'user-1');

      expect(mockUsersService.getSignatureBuffer).not.toHaveBeenCalled();
      expect(mockPdfService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ technician_signature_url: null }),
        expect.anything(),
      );
    });
  });

  describe('generatePdf()', () => {
    it('Test PB1-P12/AC3: preview sob demanda carimba o estado atual no momento da geração', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'DRAFT',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });

      await service.generatePdf('q1', 'comp-1');

      expect(mockPdfService.generate).toHaveBeenCalledTimes(1);
      expect(mockPdfService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DRAFT' }),
        expect.objectContaining({ trade_name: 'Empresa' }),
      );
    });
  });

  describe('cancel()', () => {
    it('Test 4: cancel() com quote APPROVED lança BadRequestException (estado terminal)', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'APPROVED',
        items: [],
        customer: {},
        approval: null,
      });

      await expect(service.cancel('q1', 'comp-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('Test C1: cancel() SENT→CANCELLED grava auditoria com from/to/reason e NÃO toca em notes (AC3)', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.quote.findUnique.mockResolvedValue({
        id: 'q1',
        number: 5,
        status: 'CANCELLED',
        notes: 'observação original',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });

      const result = await service.cancel('q1', 'comp-1', 'user-1', 'Cliente desistiu');

      expect(result.notes).toBe('observação original');
      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1', status: 'SENT' },
          data: { status: 'CANCELLED' },
        }),
      );
      // AC3: o motivo do cancelamento nunca sobrescreve `notes`
      const updateData = mockTx.quote.updateMany.mock.calls[0][0].data;
      expect(Object.keys(updateData)).not.toContain('notes');
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'quote.cancelled',
          entityType: 'quote',
          entityId: 'q1',
          from: 'SENT',
          to: 'CANCELLED',
          reason: 'Cliente desistiu',
          actorType: 'USER',
          actorUserId: 'user-1',
        }),
      );
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain('Maria');
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain('Cliente desistiu');
    });

    it('Test C2: cancel() sem motivo lança BadRequestException (motivo obrigatório)', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'DRAFT',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });

      await expect(service.cancel('q1', 'comp-1', 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockTx.quote.updateMany).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('Test C3: cancel() com motivo em branco lança BadRequestException', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });

      await expect(service.cancel('q1', 'comp-1', 'user-1', '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('Test C4: cancel() com transicao concorrente vencida nao grava auditoria', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cancel('q1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        ConflictException,
      );
      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'q1', status: 'SENT' } }),
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  describe('reject()', () => {
    it('Test R1: reject() SENT→REJECTED grava uma auditoria com from/to/reason', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.quote.findUnique.mockResolvedValue({
        id: 'q1',
        number: 5,
        status: 'REJECTED',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });

      await service.reject('q1', 'comp-1', 'user-1', 'Cliente achou caro');

      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1', status: 'SENT' },
          data: { status: 'REJECTED' },
        }),
      );
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'quote.rejected',
          entityType: 'quote',
          entityId: 'q1',
          from: 'SENT',
          to: 'REJECTED',
          reason: 'Cliente achou caro',
          actorType: 'USER',
          actorUserId: 'user-1',
        }),
      );
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain('Maria');
    });

    it('Test R2: reject() sem motivo lança BadRequestException', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });

      await expect(service.reject('q1', 'comp-1', 'user-1', '  ')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('Test R3: reject() de estado terminal (APPROVED) lança BadRequestException', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'APPROVED',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });

      await expect(service.reject('q1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Test R3b: reject() com transicao concorrente vencida nao grava auditoria', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.reject('q1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        ConflictException,
      );
      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'q1', status: 'SENT' } }),
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('Test R3c: falha na auditoria propaga o erro da transacao de reject', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.quote.findUnique.mockResolvedValue({
        id: 'q1',
        number: 5,
        status: 'REJECTED',
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      });
      mockAudit.record.mockRejectedValueOnce(new Error('audit write failed'));

      await expect(service.reject('q1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        'audit write failed',
      );
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
    });
  });

  describe('reopen() / correct()', () => {
    it('Test R4: reopen() REJECTED→SENT grava uma auditoria com from/to/reason', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'REJECTED',
        items: [],
        customer: { name: 'João' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.quote.findUnique.mockResolvedValue({
        id: 'q1',
        number: 8,
        status: 'SENT',
        valid_until: new Date('2030-01-01T00:00:00.000Z'),
        approval_token: 'new-token',
        items: [],
        customer: { name: 'Joao' },
        approval: null,
      });
      mockRedis.set.mockResolvedValue(undefined);
      mockRedis.del.mockResolvedValue(undefined);

      await service.reopen('q1', 'comp-1', 'user-1', 'Cliente voltou atrás');

      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1', status: 'REJECTED' },
          data: expect.objectContaining({
            status: 'SENT',
            approval_token: expect.any(String),
            valid_until: expect.any(Date),
          }),
        }),
      );
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'quote.reopened',
          from: 'REJECTED',
          to: 'SENT',
          reason: 'Cliente voltou atrás',
          actorUserId: 'user-1',
        }),
      );
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain('João');
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('quote:approval:'),
        'q1',
        'EX',
        expect.any(Number),
      );
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('Test R5: correct() APPROVED→DRAFT grava uma auditoria com from/to/reason', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'APPROVED',
        items: [],
        customer: { name: 'Ana' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.quote.findUnique.mockResolvedValue({
        id: 'q1',
        number: 12,
        status: 'DRAFT',
        items: [],
        customer: { name: 'Ana' },
        approval: null,
      });

      await service.correct('q1', 'comp-1', 'user-1', 'Erro no valor de um item');

      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1', status: 'APPROVED' },
          data: { status: 'DRAFT', technician_signature_key: null, approval_token: null },
        }),
      );
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'quote.corrected',
          from: 'APPROVED',
          to: 'DRAFT',
          reason: 'Erro no valor de um item',
        }),
      );
    });

    it('Test R5a: correct() SENT→DRAFT derruba o link de aprovação em aberto', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        approval_token: 'old-token',
        items: [],
        customer: { name: 'Ana' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.quote.findUnique.mockResolvedValue({
        id: 'q1',
        number: 12,
        status: 'DRAFT',
        items: [],
        customer: { name: 'Ana' },
        approval: null,
      });

      await service.correct('q1', 'comp-1', 'user-1', 'Mudar itens ou preços');

      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1', status: 'SENT' },
          data: { status: 'DRAFT', technician_signature_key: null, approval_token: null },
        }),
      );
    });

    it('Test R5b: reopen() EXPIRED renova valid_until e rotaciona approval token', async () => {
      const pastValidUntil = new Date('2020-01-01T00:00:00.000Z');
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'EXPIRED',
        valid_until: pastValidUntil,
        approval_token: 'old-expired-token',
        number: 9,
        items: [],
        customer: { name: 'Joao' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.quote.findUnique.mockResolvedValue({
        id: 'q1',
        number: 9,
        status: 'SENT',
        valid_until: new Date('2030-01-01T00:00:00.000Z'),
        approval_token: 'new-rotated-token',
        items: [],
        customer: { name: 'Joao' },
        approval: null,
      });
      mockRedis.set.mockResolvedValue(undefined);
      mockRedis.del.mockResolvedValue(undefined);

      const result = await service.reopen('q1', 'comp-1', 'user-1', 'cliente retornou');

      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q1', status: 'EXPIRED' },
          data: expect.objectContaining({
            status: 'SENT',
            approval_token: expect.any(String),
            valid_until: expect.any(Date),
          }),
        }),
      );
      const dataArg = mockTx.quote.updateMany.mock.calls[0][0].data;
      expect(dataArg.valid_until.getTime()).toBeGreaterThan(Date.now());
      expect(dataArg.approval_token).not.toBe('old-expired-token');
      expect(result.approval_token).toBe('new-rotated-token');
      expect(result.valid_until).toEqual(new Date('2030-01-01T00:00:00.000Z'));
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'quote.reopened',
          from: 'EXPIRED',
          to: 'SENT',
        }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('quote:approval:'),
        'q1',
        'EX',
        expect.any(Number),
      );
      expect(mockRedis.del).toHaveBeenCalledWith('quote:approval:old-expired-token');
    });

    it('Test R5c: reopen() com transicao concorrente vencida nao grava auditoria', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'EXPIRED',
        items: [],
        customer: { name: 'Joao' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.reopen('q1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        ConflictException,
      );
      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'q1', status: 'EXPIRED' } }),
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('Test R5d: falha na auditoria propaga o erro da transacao de reopen', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'REJECTED',
        items: [],
        customer: { name: 'Joao' },
        approval: null,
      });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.quote.findUnique.mockResolvedValue({
        id: 'q1',
        number: 8,
        status: 'SENT',
        valid_until: new Date('2030-01-01T00:00:00.000Z'),
        approval_token: 'new-token',
        items: [],
        customer: { name: 'Joao' },
        approval: null,
      });
      mockAudit.record.mockRejectedValueOnce(new Error('audit write failed'));

      await expect(service.reopen('q1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        'audit write failed',
      );
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('Test R6: reopen() de estado não-terminal (SENT) lança BadRequestException', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'SENT',
        items: [],
        customer: { name: 'João' },
        approval: null,
      });

      await expect(service.reopen('q1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('Test R7: correct() sem motivo lança BadRequestException', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'CANCELLED',
        items: [],
        customer: { name: 'Ana' },
        approval: null,
      });

      await expect(service.correct('q1', 'comp-1', 'user-1', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve()', () => {
    it('recusa método não permitido antes de alterar o orçamento', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        ...quoteMock,
        company: { allowed_approval_methods: ['DRAWN_SIGNATURE'] },
      });
      await expect(
        service.approve(quoteToken, { approval_method: 'APPROVE_BUTTON' }, '127.0.0.1', 'fixture'),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.quote.updateMany).not.toHaveBeenCalled();
    });

    it('assinatura inválida não muda status nem grava aprovação/auditoria', async () => {
      await expect(
        service.approve(
          quoteToken,
          { approval_method: 'DRAWN_SIGNATURE', signature: 'not-an-image' },
          '127.0.0.1',
          'fixture',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.quote.updateMany).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('falha de PDF não muda o orçamento nem cria OS', async () => {
      mockPdfService.generate.mockRejectedValueOnce(new Error('fixture PDF failure'));
      await expect(
        service.approve(quoteToken, { approval_method: 'APPROVE_BUTTON' }, '127.0.0.1', 'fixture'),
      ).rejects.toThrow('fixture PDF failure');
      expect(mockTx.quote.updateMany).not.toHaveBeenCalled();
      expect(mockWorkOrderService.create).not.toHaveBeenCalled();
    });

    const quoteToken = 'valid-token';
    const quoteMock = {
      id: 'q1',
      company_id: 'comp-1',
      created_by_user_id: 'user-1',
      number: 5,
      title: 'Instalacao',
      status: 'SENT',
      valid_until: null,
      approval_token: quoteToken,
      company: {
        allowed_approval_methods: [
          'APPROVE_BUTTON',
          'TYPED_NAME',
          'DRAWN_SIGNATURE',
          'PHOTO_SIGNATURE',
        ],
      },
      total: '200.00',
      subtotal: '200.00',
      discount_type: 'PERCENT',
      discount_value: '0',
      customer: { id: 'cust-1', name: 'Cliente', phone: '11999999999' },
      items: [],
    };

    beforeEach(() => {
      mockRedis.get.mockResolvedValue('q1');
      mockPrisma.quote.findFirst.mockResolvedValue(quoteMock);
      mockTx.quoteApproval.create.mockResolvedValue({ id: 'approval-1' });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.auditLog.create.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
      );
    });

    it('Test A1: approve() com token valido cria QuoteApproval + WorkOrder + AuditLog', async () => {
      const dto = { approval_method: 'APPROVE_BUTTON' as const };
      const result = await service.approve(quoteToken, dto, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual({ status: 'APPROVED' });
      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'q1',
            company_id: 'comp-1',
            approval_token: quoteToken,
            status: 'SENT',
          }),
        }),
      );
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'quote.approved',
          entityType: 'quote',
          entityId: 'q1',
          companyId: 'comp-1',
          actorType: 'CUSTOMER',
        }),
      );
      expect(mockTx.quoteApproval.create).toHaveBeenCalled();
      expect(mockWorkOrderService.create).toHaveBeenCalled();
    });

    it('Test A1b: OS de orçamento sem título leva o nome do serviço (itens), não um número', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({
        ...quoteMock,
        title: null,
        items: [
          {
            id: 'i1',
            description: 'Instalação de câmera',
            quantity: '1',
            unit_price: '150',
            total: '150',
          },
          { id: 'i2', description: 'Cabo', quantity: '10', unit_price: '5', total: '50' },
        ],
      });

      await service.approve(quoteToken, { approval_method: 'APPROVE_BUTTON' }, '1.2.3.4', 'ua');

      expect(mockWorkOrderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Instalação de câmera e mais 1' }),
        'comp-1',
        'user-1',
        'q1',
        'IN_PROGRESS',
        mockTx,
      );
    });

    it('Test A2: approve() chamado 2x com mesmo token retorna ConflictException', async () => {
      mockTx.quote.updateMany.mockResolvedValue({ count: 0 }); // ja aprovado
      const dto = { approval_method: 'APPROVE_BUTTON' as const };

      await expect(service.approve(quoteToken, dto, '127.0.0.1', 'ua')).rejects.toThrow(
        ConflictException,
      );
    });

    it('Test A3: approve() com APPROVE_BUTTON nao lanca excecao', async () => {
      // Validacao de typed_name e feita pelo schema Zod no controller
      // O service nao valida diretamente typed_name — apenas processa dto valido
      const validDto = { approval_method: 'APPROVE_BUTTON' as const };
      await expect(service.approve(quoteToken, validDto, '127.0.0.1', 'ua')).resolves.toBeDefined();
    });

    it('Test A4: approve() com DRAWN_SIGNATURE salva base64 no MinIO', async () => {
      const base64Sig =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dto = { approval_method: 'DRAWN_SIGNATURE' as const, signature: base64Sig };

      await service.approve(quoteToken, dto, '127.0.0.1', 'ua');

      expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
        'orcivo-photos',
        expect.stringContaining('signatures/'),
        expect.any(Buffer),
        'image/png',
      );
    });

    it('aceita PHOTO_SIGNATURE e preserva o tipo de imagem enviado pelo cliente', async () => {
      const photo =
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AR//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AR//2Q==';

      await service.approve(
        quoteToken,
        { approval_method: 'PHOTO_SIGNATURE' as const, signature: photo },
        '127.0.0.1',
        'ua',
      );

      expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
        'orcivo-photos',
        expect.stringMatching(/signatures\/.*\.jpg$/),
        expect.any(Buffer),
        'image/jpeg',
      );
      expect(mockTx.quoteApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ approval_method: 'PHOTO_SIGNATURE' }),
        }),
      );
    });

    it('Test A5: AuditLog criado com actor_type CUSTOMER dentro do $transaction', async () => {
      const dto = { approval_method: 'APPROVE_BUTTON' as const };
      await service.approve(quoteToken, dto, '10.0.0.1', 'TestAgent');

      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          actorType: 'CUSTOMER',
          action: 'quote.approved',
          entityType: 'quote',
          companyId: 'comp-1',
        }),
      );
    });

    it('Test A6 (PB1-P12/AC3): PDF regenerado na aprovação carimba APPROVED — estado no instante da geração', async () => {
      const dto = { approval_method: 'APPROVE_BUTTON' as const };
      await service.approve(quoteToken, dto, '127.0.0.1', 'ua');

      // O quote carregado via token vinha SENT (pré-transição); o PDF
      // regenerado DEPOIS da aprovação deve carimbar APPROVED.
      expect(mockPdfService.generate).toHaveBeenCalledTimes(1);
      expect(mockPdfService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'APPROVED' }),
        expect.objectContaining({ trade_name: 'Empresa' }),
      );
    });
  });

  describe('rejectByToken()', () => {
    const publicQuote = (status: string) => ({
      id: 'q1',
      company_id: 'comp-1',
      number: 7,
      status,
      approval_token: 'tok',
      customer: { id: 'cust-1', name: 'Ana', phone: null },
      items: [],
    });

    it('Test RJ1: cliente recusa pelo link — SENT→REJECTED com auditoria CUSTOMER', async () => {
      mockRedis.get.mockResolvedValue('q1');
      mockPrisma.quote.findFirst.mockResolvedValue(publicQuote('SENT'));
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.rejectByToken('tok', '  Achei caro ')).resolves.toEqual({
        status: 'REJECTED',
      });

      expect(mockTx.quote.updateMany).toHaveBeenCalledWith({
        where: { id: 'q1', status: 'SENT', approval_token: 'tok' },
        data: { status: 'REJECTED' },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          actorType: 'CUSTOMER',
          action: 'quote.rejected',
          reason: 'Achei caro',
          companyId: 'comp-1',
        }),
      );
    });

    it('Test RJ2: orçamento já aprovado não pode ser recusado pelo link', async () => {
      mockRedis.get.mockResolvedValue('q1');
      mockPrisma.quote.findFirst.mockResolvedValue(publicQuote('APPROVED'));

      await expect(service.rejectByToken('tok')).rejects.toThrow(ConflictException);
      expect(mockTx.quote.updateMany).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('Test RJ3: corrida (já processado) → 409 sem auditoria', async () => {
      mockRedis.get.mockResolvedValue('q1');
      mockPrisma.quote.findFirst.mockResolvedValue(publicQuote('SENT'));
      mockTx.quote.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.rejectByToken('tok')).rejects.toThrow(ConflictException);
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  describe('getByApprovalToken()', () => {
    it('Test 7: getByApprovalToken() retorna quote com campos obrigatórios', async () => {
      mockRedis.get.mockResolvedValue('q1');
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        created_by_user_id: 'user-1',
        number: 1,
        status: 'SENT',
        valid_until: null,
        approval_token: 'some-token',
        total: '30.00',
        title: 'Orçamento 1',
        discount_type: 'PERCENT',
        discount_value: '0',
        subtotal: '30.00',
        customer: { id: 'cust-1', name: 'Cliente', phone: '11999999999' },
        items: [],
      });

      const result = await service.getByApprovalToken('some-token');

      expect(result).toMatchObject({
        company_id: 'comp-1',
        created_by_user_id: 'user-1',
        number: 1,
        status: 'SENT',
        total: '30.00',
      });
    });

    it('Test 7b: getByApprovalToken() rejeita token antigo em cache Redis dessincronizado', async () => {
      mockRedis.get.mockResolvedValue('q1');
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        created_by_user_id: 'user-1',
        number: 1,
        status: 'SENT',
        valid_until: null,
        approval_token: 'token-rotacionado',
        total: '30.00',
        title: 'Orcamento 1',
        discount_type: 'PERCENT',
        discount_value: '0',
        subtotal: '30.00',
        customer: { id: 'cust-1', name: 'Cliente', phone: '11999999999' },
        items: [],
      });

      await expect(service.getByApprovalToken('token-antigo')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPdfByApprovalToken()', () => {
    it('Test 8: retorna os bytes do PDF já armazenado para o token do orçamento', async () => {
      mockRedis.get.mockResolvedValue('q1');
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        pdf_url: 'comp-1/quotes/q1.pdf',
        approval_token: 'some-token',
      });

      const result = await service.getPdfByApprovalToken('some-token');

      expect(mockStorage.getObjectBuffer).toHaveBeenCalledWith(
        'orcivo-pdfs',
        'comp-1/quotes/q1.pdf',
      );
      expect(result).toEqual(Buffer.from('PDF_BYTES'));
    });

    it('Test 9: token inexistente lança NotFoundException (sem vazar orçamento de outro token)', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(service.getPdfByApprovalToken('token-invalido')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockStorage.getObjectBuffer).not.toHaveBeenCalled();
    });

    it('Test 10: orçamento sem PDF gerado ainda lança NotFoundException', async () => {
      mockRedis.get.mockResolvedValue('q1');
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        pdf_url: null,
        approval_token: 'some-token',
      });

      await expect(service.getPdfByApprovalToken('some-token')).rejects.toThrow(NotFoundException);
      expect(mockStorage.getObjectBuffer).not.toHaveBeenCalled();
    });

    it('Test 11: cache Redis dessincronizado (approval_token do banco diferente do token) lança NotFoundException', async () => {
      // Redis ainda aponta id -> quote, mas o banco já tem outro approval_token
      // (ex.: quote reenviada e token rotacionado). Não pode servir o PDF de outro token.
      mockRedis.get.mockResolvedValue('q1');
      mockPrisma.quote.findFirst.mockResolvedValue({
        id: 'q1',
        pdf_url: 'comp-1/quotes/q1.pdf',
        approval_token: 'token-novo-rotacionado',
      });

      await expect(service.getPdfByApprovalToken('some-token')).rejects.toThrow(NotFoundException);
      expect(mockStorage.getObjectBuffer).not.toHaveBeenCalled();
    });
  });
});

describe('QuoteExpiryProcessor', () => {
  let prisma: typeof mockPrisma;
  const txMock = {
    quoteApproval: { create: jest.fn() },
    quote: { update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const auditMock = { record: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      quote: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      quoteApproval: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      company: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
    };
    // default: still eligible at UPDATE time
    txMock.quote.findUnique.mockResolvedValue({ status: 'SENT' });
    txMock.quote.updateMany.mockResolvedValue({ count: 1 });
  });

  const newProcessor = async () => {
    const { QuoteExpiryProcessor } = await import('./quote-expiry.processor');
    return new QuoteExpiryProcessor(prisma as unknown as PrismaService, auditMock as never);
  };

  it('Test 5: process() expira quote SENT com valid_until no passado e grava auditoria', async () => {
    const processor = await newProcessor();

    prisma.quote.findFirst.mockResolvedValue({
      id: 'q1',
      number: 3,
      company_id: 'comp-1',
      customer: { name: 'Cliente' },
    });

    await processor.process({ data: { quoteId: 'q1' } } as never);

    // Elegibilidade preservada na escrita transacional (não um update por id "cego").
    expect(txMock.quote.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'q1',
        status: 'SENT',
        valid_until: { lt: expect.any(Date) },
      },
      data: { status: 'EXPIRED' },
    });
    expect(auditMock.record).toHaveBeenCalledWith(
      txMock,
      expect.objectContaining({
        action: 'quote.expired',
        actorType: 'SYSTEM',
        from: 'SENT',
        to: 'EXPIRED',
      }),
    );
  });

  it('Test 6: process() NÃO modifica quote APPROVED (estado terminal)', async () => {
    const processor = await newProcessor();

    // findFirst retorna null pois WHERE status IN (DRAFT, SENT) não encontra APPROVED
    prisma.quote.findFirst.mockResolvedValue(null);

    await processor.process({ data: { quoteId: 'q1' } } as never);

    expect(txMock.quote.updateMany).not.toHaveBeenCalled();
    expect(auditMock.record).not.toHaveBeenCalled();
  });

  it('Test 5b: aprovação concorrente entre a leitura e o UPDATE — não expira nem audita', async () => {
    const processor = await newProcessor();

    prisma.quote.findFirst.mockResolvedValue({
      id: 'q1',
      number: 3,
      company_id: 'comp-1',
      customer: { name: 'Cliente' },
    });
    // A linha ainda parecia SENT ao reler o status, mas foi aprovada (ou teve a
    // validade estendida) antes do updateMany — o filtro condicional não bate.
    txMock.quote.findUnique.mockResolvedValue({ status: 'SENT' });
    txMock.quote.updateMany.mockResolvedValue({ count: 0 });

    await processor.process({ data: { quoteId: 'q1' } } as never);

    expect(auditMock.record).not.toHaveBeenCalled();
  });

  it('Test 5c: status já mudou ao reler dentro da transação — aborta antes do UPDATE', async () => {
    const processor = await newProcessor();

    prisma.quote.findFirst.mockResolvedValue({
      id: 'q1',
      number: 3,
      company_id: 'comp-1',
      customer: { name: 'Cliente' },
    });
    txMock.quote.findUnique.mockResolvedValue({ status: 'APPROVED' });

    await processor.process({ data: { quoteId: 'q1' } } as never);

    expect(txMock.quote.updateMany).not.toHaveBeenCalled();
    expect(auditMock.record).not.toHaveBeenCalled();
  });

  it('Test 5d: varredura com workers sobrepostos — a segunda passada não re-expira nem re-audita', async () => {
    const processor = await newProcessor();

    prisma.quote.findMany.mockResolvedValue([{ id: 'q1' }]);
    prisma.quote.findFirst
      .mockResolvedValueOnce({
        id: 'q1',
        number: 9,
        company_id: 'comp-1',
        customer: { name: 'Cliente' },
      })
      // segunda varredura: já EXPIRED, o filtro status IN (DRAFT,SENT) devolve null
      .mockResolvedValueOnce(null);
    txMock.quote.updateMany.mockResolvedValueOnce({ count: 1 });

    await processor.sweepExpiredQuotes();
    await processor.sweepExpiredQuotes();

    expect(auditMock.record).toHaveBeenCalledTimes(1);
  });
});
