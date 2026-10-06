// Mock quote-pdf.service before any imports to prevent ESM issues with @react-pdf/renderer
jest.mock('./quote-pdf.service', () => ({
  QuotePdfService: class {
    generate = jest.fn().mockResolvedValue(Buffer.from('PDF'));
  },
}));

import { BadRequestException, ConflictException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QUOTE_ACTIONS, type QuoteAction, type QuoteStatus } from '@orcivo/shared-types';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { WorkOrderService } from '../work-order/work-order.service';
import { QuotePdfService } from './quote-pdf.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

// PB1-P01 — Quote domain-action state machine (unit, mocked Prisma/Audit).
// A matriz de transições inválidas é derivada de QUOTE_ACTIONS: o serviço tem
// que rejeitar exatamente as origens que a máquina compartilhada não permite.

const mockTx = {
  quote: {
    updateMany: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  quoteApproval: { create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
  auditLog: { create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
};

const mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

const mockPrisma = {
  quote: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  quoteApproval: { create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
  auditLog: { create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
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

const mockQueue = { add: jest.fn() };

const mockStorage = {
  deleteObject: jest.fn().mockResolvedValue(undefined),
  uploadBuffer: jest.fn((_bucket: string, objectName: string) => Promise.resolve(objectName)),
  resolveUrl: jest.fn((_bucket: string, stored: string | null) =>
    stored ? `https://minio.example.com/signed/${stored}?X-Amz-Signature=x` : null,
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
const mockPdfService = { generate: jest.fn().mockResolvedValue(Buffer.from('PDF')) };

const ALL_STATUSES: QuoteStatus[] = [
  'DRAFT',
  'SENT',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
];

// Ações expostas pelo QuoteService (expirar é acionada pelo job/processor).
type ServiceAction = Exclude<QuoteAction, 'expirar'>;

const baseQuote = (status: QuoteStatus) => ({
  id: 'q1',
  company_id: 'comp-1',
  created_by_user_id: 'user-1',
  number: 5,
  status,
  valid_until: null,
  approval_token: 'tok',
  total: '200.00',
  subtotal: '200.00',
  title: 'Orçamento',
  discount_type: 'PERCENT',
  discount_value: '0',
  notes: 'observação original',
  customer: { id: 'cust-1', name: 'Maria Souza', phone: '11999999999' },
  items: [],
  approval: null,
});

describe('QuoteService — máquina de ações de domínio (PB1-P01)', () => {
  let service: QuoteService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx.quote.updateMany.mockResolvedValue({ count: 1 });
    mockTx.quote.findUnique.mockImplementation(async () => baseQuote('REJECTED'));
    mockRedis.get.mockResolvedValue('q1');
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
        {
          provide: UsersService,
          useValue: { getSignatureBuffer: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();
    service = module.get<QuoteService>(QuoteService);
  });

  /** Invoca a ação de domínio pelo serviço, como o controller faz. */
  const invoke = (action: ServiceAction, status: QuoteStatus) => {
    mockPrisma.quote.findFirst.mockResolvedValue(baseQuote(status));
    switch (action) {
      case 'enviar':
        return service.send('q1', 'comp-1', 'user-1');
      case 'aprovar':
        return service.approve('tok', { approval_method: 'APPROVE_BUTTON' }, '127.0.0.1', 'ua');
      case 'recusar':
        return service.reject('q1', 'comp-1', 'user-1', 'motivo');
      case 'cancelar':
        return service.cancel('q1', 'comp-1', 'user-1', 'motivo');
      case 'reabrir':
        return service.reopen('q1', 'comp-1', 'user-1', 'motivo');
      case 'corrigir':
        return service.correct('q1', 'comp-1', 'user-1', 'motivo');
    }
  };

  const expectedError = (action: ServiceAction) =>
    action === 'aprovar' ? ConflictException : BadRequestException;

  // ── AC5/AC1: origem inválida → erro claro, sem escrita nem auditoria ──────

  describe('transições inválidas (matriz derivada de QUOTE_ACTIONS)', () => {
    const cases: Array<[ServiceAction, QuoteStatus]> = [];
    const serviceActions: ServiceAction[] = [
      'enviar',
      'aprovar',
      'recusar',
      'cancelar',
      'reabrir',
      'corrigir',
    ];
    for (const action of serviceActions) {
      for (const status of ALL_STATUSES) {
        if (!QUOTE_ACTIONS[action].allowedFrom.includes(status)) {
          cases.push([action, status]);
        }
      }
    }

    it.each(cases)(
      '%s a partir de %s → rejeitada com erro claro, sem auditoria',
      async (action, status) => {
        const spec = QUOTE_ACTIONS[action];
        await expect(invoke(action, status)).rejects.toThrow(
          `Transição inválida: ${status} → ${spec.to} (${action})`,
        );
        await expect(invoke(action, status)).rejects.toThrow(expectedError(action));
        expect(mockAudit.record).not.toHaveBeenCalled();
        expect(mockTx.quote.updateMany).not.toHaveBeenCalled();
        expect(mockTx.quote.update).not.toHaveBeenCalled();
      },
    );
  });

  // ── AC3/AC4: motivo nunca sobrescreve dados; histórico nunca é apagado ───

  describe('recusar/cancelar/reabrir/corrigir — motivo obrigatório (AC1/AC3/AC4)', () => {
    type ReasonAction = 'recusar' | 'cancelar' | 'reabrir' | 'corrigir';
    const reasonActions: ReasonAction[] = ['recusar', 'cancelar', 'reabrir', 'corrigir'];

    const runWith = (action: ReasonAction, reason?: string, from?: QuoteStatus) => {
      const source = from ?? QUOTE_ACTIONS[action].allowedFrom[0];
      mockPrisma.quote.findFirst.mockImplementation(async () => baseQuote(source));
      mockTx.quote.findUnique.mockImplementation(async () => baseQuote(QUOTE_ACTIONS[action].to));
      switch (action) {
        case 'recusar':
          return service.reject('q1', 'comp-1', 'user-1', reason);
        case 'cancelar':
          return service.cancel('q1', 'comp-1', 'user-1', reason);
        case 'reabrir':
          return service.reopen('q1', 'comp-1', 'user-1', reason);
        case 'corrigir':
          return service.correct('q1', 'comp-1', 'user-1', reason);
      }
    };

    it.each(reasonActions)(
      '%s sem motivo → BadRequestException, sem escrita nem auditoria',
      async (action) => {
        await expect(runWith(action)).rejects.toThrow(
          `Motivo é obrigatório para ${action} um orçamento`,
        );
        expect(mockAudit.record).not.toHaveBeenCalled();
        expect(mockTx.quote.updateMany).not.toHaveBeenCalled();
      },
    );

    it.each(reasonActions)('%s com motivo em branco → BadRequestException', async (action) => {
      await expect(runWith(action, '   ')).rejects.toThrow(BadRequestException);
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    const validCases = reasonActions.flatMap((action) =>
      QUOTE_ACTIONS[action].allowedFrom.map((status) => [action, status] as const),
    );

    it.each(validCases)(
      '%s de %s grava uma auditoria com from/to/reason, não toca em notes e não deleta nada',
      async (action, from) => {
        const to = QUOTE_ACTIONS[action].to;

        await runWith(action, 'motivo', from);

        expect(mockAudit.record).toHaveBeenCalledTimes(1);
        expect(mockAudit.record).toHaveBeenCalledWith(
          mockTx,
          expect.objectContaining({
            action:
              action === 'recusar'
                ? 'quote.rejected'
                : action === 'cancelar'
                  ? 'quote.cancelled'
                  : action === 'reabrir'
                    ? 'quote.reopened'
                    : 'quote.corrected',
            entityType: 'quote',
            entityId: 'q1',
            from,
            to,
            reason: 'motivo',
            actorType: 'USER',
            actorUserId: 'user-1',
          }),
        );

        // AC3: o update da transição nunca carrega `notes`
        const updateData = mockTx.quote.updateMany.mock.calls[0][0].data;
        expect(Object.keys(updateData)).not.toContain('notes');
        expect(updateData.status).toBe(to);

        // AC4: nenhuma ação de domínio apaga histórico (quote, aprovação, audit)
        expect(mockTx.quote.delete).not.toHaveBeenCalled();
        expect(mockTx.quote.deleteMany).not.toHaveBeenCalled();
        expect(mockTx.quoteApproval.delete).not.toHaveBeenCalled();
        expect(mockTx.quoteApproval.deleteMany).not.toHaveBeenCalled();
        expect(mockTx.auditLog.delete).not.toHaveBeenCalled();
        expect(mockTx.auditLog.deleteMany).not.toHaveBeenCalled();
      },
    );
  });
});

// ── AC2: reabrir/corrigir são @AdminOnly — enforced pelo RoleGuard ──────────

describe('QuoteController — autorização das ações de domínio (AC2)', () => {
  const reflector = new Reflector();

  it('reabrir e corrigir exigem OWNER/ADMIN (@AdminOnly)', () => {
    expect(reflector.get<string[]>(ROLES_KEY, QuoteController.prototype.reopen)).toEqual([
      'OWNER',
      'ADMIN',
    ]);
    expect(reflector.get<string[]>(ROLES_KEY, QuoteController.prototype.correct)).toEqual([
      'OWNER',
      'ADMIN',
    ]);
  });

  it('enviar/recusar/cancelar ficam liberados para qualquer membro ativo', () => {
    expect(reflector.get(ROLES_KEY, QuoteController.prototype.send)).toBeUndefined();
    expect(reflector.get(ROLES_KEY, QuoteController.prototype.reject)).toBeUndefined();
    expect(reflector.get(ROLES_KEY, QuoteController.prototype.cancel)).toBeUndefined();
  });
});
