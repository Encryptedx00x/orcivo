// Mock quote-pdf.service before any imports to prevent ESM issues with @react-pdf/renderer
jest.mock('./quote-pdf.service', () => ({
  QuotePdfService: class {
    generate = jest.fn().mockResolvedValue(Buffer.from('PDF'));
  },
}));
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QuoteService } from './quote.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PHOTO_BUCKET, StorageService } from '../storage/storage.service';
import { WorkOrderService } from '../work-order/work-order.service';
import { QuotePdfService } from './quote-pdf.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

describe('QuoteService.send — assinatura do técnico só neste orçamento', () => {
  const tx = {
    quote: {
      update: jest.fn().mockResolvedValue({
        id: 'q1',
        number: 7,
        status: 'SENT',
        approval_token: 'tok',
        valid_until: null,
      }),
    },
  };
  const prisma = {
    quote: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'q1',
        company_id: 'comp-1',
        status: 'DRAFT',
        number: 7,
        valid_until: null,
        items: [],
        customer: { name: 'Maria' },
        approval: null,
      }),
    },
    company: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'comp-1', trade_name: 'Empresa' }),
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const storage = {
    uploadBuffer: jest.fn((_b: string, key: string) => Promise.resolve(key)),
    assertUploadable: jest.fn(),
    getObjectBuffer: jest.fn(),
    inlineImage: jest.fn(async (v: string | null | undefined) => v ?? null),
    resolveUrl: jest.fn().mockResolvedValue(null),
    extractKey: jest.fn().mockReturnValue(null),
  };
  const users = { getSignatureBuffer: jest.fn() };
  const pdf = { generate: jest.fn().mockResolvedValue(Buffer.from('PDF')) };
  let service: QuoteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        QuoteService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: RedisService,
          useValue: { set: jest.fn(), get: jest.fn(), incr: jest.fn(), del: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
        { provide: getQueueToken('quote-expiry'), useValue: { add: jest.fn() } },
        { provide: StorageService, useValue: storage },
        { provide: WorkOrderService, useValue: { create: jest.fn() } },
        { provide: QuotePdfService, useValue: pdf },
        { provide: PlanLimitsService, useValue: { enforceLimit: jest.fn() } },
        {
          provide: TenantOwnershipService,
          useValue: { assertCustomer: jest.fn(), assertCatalogItems: jest.fn() },
        },
        { provide: AuditService, useValue: { record: jest.fn().mockResolvedValue(undefined) } },
        { provide: UsersService, useValue: users },
      ],
    }).compile();
    service = module.get(QuoteService);
  });

  it('valida, congela no orçamento e põe no PDF sem tocar na assinatura salva', async () => {
    await service.send('q1', 'comp-1', 'user-1', false, undefined, {
      buffer: JPEG,
      mimetype: 'image/jpeg',
    });

    expect(storage.assertUploadable).toHaveBeenCalledWith(JPEG, 'image/jpeg', 2 * 1024 * 1024, [
      'image/png',
      'image/jpeg',
      'image/webp',
    ]);
    expect(users.getSignatureBuffer).not.toHaveBeenCalled();
    expect(storage.uploadBuffer).toHaveBeenCalledWith(
      PHOTO_BUCKET,
      'comp-1/quotes/q1/technician-signature',
      JPEG,
      'image/jpeg',
    );
    expect(pdf.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        technician_signature_url: `data:image/jpeg;base64,${JPEG.toString('base64')}`,
      }),
      expect.anything(),
    );
    expect(tx.quote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          technician_signature_key: 'comp-1/quotes/q1/technician-signature',
        }),
      }),
    );
  });

  it('recusa imagem inválida antes de enviar', async () => {
    storage.assertUploadable.mockImplementationOnce(() => {
      throw new BadRequestException('Conteúdo do arquivo não corresponde ao tipo declarado.');
    });
    await expect(
      service.send('q1', 'comp-1', 'user-1', false, undefined, {
        buffer: Buffer.from('nope'),
        mimetype: 'image/png',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.quote.update).not.toHaveBeenCalled();
    expect(pdf.generate).not.toHaveBeenCalled();
  });
});
