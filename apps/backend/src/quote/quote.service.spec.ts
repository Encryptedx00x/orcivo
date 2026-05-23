// Mock quote-pdf.service before any imports to prevent ESM issues with @react-pdf/renderer
jest.mock('./quote-pdf.service', () => ({
  QuotePdfService: class {
    generate = jest.fn().mockResolvedValue(Buffer.from('PDF'));
  },
}));

import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QuoteService } from './quote.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { WorkOrderService } from '../work-order/work-order.service';
import { QuotePdfService } from './quote-pdf.service';

const mockTx = {
  quote: { updateMany: jest.fn() },
  auditLog: { create: jest.fn() },
};

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
  $transaction: jest.fn(),
};

const mockRedis = {
  incr: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('http://localhost:3000'),
};

const mockQueue = {
  add: jest.fn(),
};

const mockStorage = {
  uploadBuffer: jest.fn().mockResolvedValue('https://minio.example.com/file.pdf'),
};

const mockWorkOrderService = {
  create: jest.fn().mockResolvedValue({ id: 'wo-1' }),
};

const mockPdfService = {
  generate: jest.fn().mockResolvedValue(Buffer.from('PDF')),
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
      mockPrisma.quote.update.mockResolvedValue({ id: 'q1', status: 'SENT', approval_token: 'tok', valid_until: null });

      const result = await service.send('q1', 'comp-1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('quote:approval:'),
        'q1',
        'EX',
        604800,
      );
      expect(result.approval_token).toBeTruthy();
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

      await expect(service.send('q1', 'comp-1')).rejects.toThrow(BadRequestException);
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

      await expect(service.cancel('q1', 'comp-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve()', () => {
    const quoteToken = 'valid-token';
    const quoteMock = {
      id: 'q1',
      company_id: 'comp-1',
      created_by_user_id: 'user-1',
      number: 5,
      title: 'Instalacao',
      status: 'SENT',
      valid_until: null,
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
      mockPrisma.quoteApproval.create.mockResolvedValue({ id: 'approval-1' });
      mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
      mockTx.auditLog.create.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx));
    });

    it('Test A1: approve() com token valido cria QuoteApproval + WorkOrder + AuditLog', async () => {
      const dto = { approval_method: 'APPROVE_BUTTON' as const };
      const result = await service.approve(quoteToken, dto, '127.0.0.1', 'Mozilla/5.0');

      expect(result).toEqual({ status: 'APPROVED' });
      expect(mockTx.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'q1', status: 'SENT' } }),
      );
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'quote.approved',
            entity_type: 'quote',
            entity_id: 'q1',
            company_id: 'comp-1',
          }),
        }),
      );
      expect(mockPrisma.quoteApproval.create).toHaveBeenCalled();
      expect(mockWorkOrderService.create).toHaveBeenCalled();
    });

    it('Test A2: approve() chamado 2x com mesmo token retorna ConflictException', async () => {
      mockTx.quote.updateMany.mockResolvedValue({ count: 0 }); // ja aprovado
      const dto = { approval_method: 'APPROVE_BUTTON' as const };

      await expect(service.approve(quoteToken, dto, '127.0.0.1', 'ua')).rejects.toThrow(ConflictException);
    });

    it('Test A3: approve() com APPROVE_BUTTON nao lanca excecao', async () => {
      // Validacao de typed_name e feita pelo schema Zod no controller
      // O service nao valida diretamente typed_name — apenas processa dto valido
      const validDto = { approval_method: 'APPROVE_BUTTON' as const };
      await expect(service.approve(quoteToken, validDto, '127.0.0.1', 'ua')).resolves.toBeDefined();
    });

    it('Test A4: approve() com DRAWN_SIGNATURE salva base64 no MinIO', async () => {
      const base64Sig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dto = { approval_method: 'DRAWN_SIGNATURE' as const, signature: base64Sig };

      await service.approve(quoteToken, dto, '127.0.0.1', 'ua');

      expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
        'orcivo-photos',
        expect.stringContaining('signatures/'),
        expect.any(Buffer),
        'image/png',
      );
    });

    it('Test A5: AuditLog criado com actor_type SYSTEM dentro do $transaction', async () => {
      const dto = { approval_method: 'APPROVE_BUTTON' as const };
      await service.approve(quoteToken, dto, '10.0.0.1', 'TestAgent');

      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actor_type: 'SYSTEM',
            action: 'quote.approved',
            entity_type: 'quote',
            company_id: 'comp-1',
          }),
        }),
      );
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
  });
});

describe('QuoteExpiryProcessor', () => {
  let prisma: typeof mockPrisma;

  beforeEach(() => {
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
      company: { findUniqueOrThrow: jest.fn() },
      $transaction: jest.fn(),
    };
  });

  it('Test 5: process() expira quote SENT com valid_until no passado', async () => {
    const { QuoteExpiryProcessor } = await import('./quote-expiry.processor');
    const processor = new QuoteExpiryProcessor(prisma as unknown as PrismaService);

    const pastDate = new Date(Date.now() - 1000 * 60 * 60);
    prisma.quote.findFirst.mockResolvedValue({ id: 'q1', status: 'SENT', valid_until: pastDate });
    prisma.quote.update.mockResolvedValue({ id: 'q1', status: 'EXPIRED' });

    await processor.process({ data: { quoteId: 'q1' } } as never);

    expect(prisma.quote.update).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: { status: 'EXPIRED' },
    });
  });

  it('Test 6: process() NÃO modifica quote APPROVED (estado terminal)', async () => {
    const { QuoteExpiryProcessor } = await import('./quote-expiry.processor');
    const processor = new QuoteExpiryProcessor(prisma as unknown as PrismaService);

    // findFirst retorna null pois WHERE status IN (DRAFT, SENT) não encontra APPROVED
    prisma.quote.findFirst.mockResolvedValue(null);

    await processor.process({ data: { quoteId: 'q1' } } as never);

    expect(prisma.quote.update).not.toHaveBeenCalled();
  });
});
