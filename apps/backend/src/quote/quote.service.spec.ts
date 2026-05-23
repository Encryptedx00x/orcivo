import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QuoteService } from './quote.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

const mockPrisma = {
  quote: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
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
