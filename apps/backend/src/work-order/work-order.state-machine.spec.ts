import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderService } from './work-order.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';

// PB1-P01 — WorkOrder domain-action state machine (unit, mocked Prisma/Audit).

const mockTx = {
  workOrder: { updateMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
  auditLog: { create: jest.fn() },
};

const mockAudit = { record: jest.fn().mockResolvedValue(undefined) };

const mockPrisma = {
  company: {
    findUnique: jest.fn().mockResolvedValue({ work_order_statuses: [] }),
  },
  workOrder: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _max: { number: 0 } }),
  },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  incr: jest.fn().mockResolvedValue(1),
};

const mockOwnership = {
  assertCustomer: jest.fn().mockResolvedValue(undefined),
  assertActiveMember: jest.fn().mockResolvedValue(undefined),
  assertQuote: jest.fn().mockResolvedValue(undefined),
};

const pendingWo = {
  id: 'wo-1',
  company_id: 'comp-1',
  number: 7,
  title: 'Instalação de ar-condicionado',
  status: 'PENDING',
  notes: 'observação original',
  scheduled_at: null,
  started_at: null,
  finished_at: null,
  assigned_to_user_id: null,
  customer: { id: 'cust-1', name: 'Maria Souza' },
  photos: [],
  quote: null,
};

describe('WorkOrderService — state machine (P-01)', () => {
  let service: WorkOrderService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );
    // R5b: por padrão a empresa não ligou nenhum status extra.
    mockPrisma.company.findUnique.mockResolvedValue({ work_order_statuses: [] });
    mockTx.workOrder.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.workOrder.updateMany.mockResolvedValue({ count: 1 });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        {
          provide: PlanLimitsService,
          useValue: { enforceLimit: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: TenantOwnershipService, useValue: mockOwnership },
        { provide: AuditService, useValue: mockAudit },
        {
          provide: StorageService,
          useValue: { resolveUrl: jest.fn(async (_b: string, key: string) => `signed:${key}`) },
        },
      ],
    }).compile();
    service = module.get<WorkOrderService>(WorkOrderService);
  });

  const mockCurrentWo = (overrides: Record<string, unknown> = {}) => {
    mockPrisma.workOrder.findFirst.mockResolvedValue({ ...pendingWo, ...overrides });
  };
  const mockUpdatedWo = (status: string) => {
    mockTx.workOrder.findUnique.mockResolvedValue({ ...pendingWo, status });
  };
  /** R5b: liga status extras para a empresa das chamadas seguintes. */
  const enableExtras = (...statuses: ('AWAITING_PAYMENT' | 'WARRANTY')[]) => {
    mockPrisma.company.findUnique.mockResolvedValue({ work_order_statuses: statuses });
  };

  // ── allowedActions ────────────────────────────────────────────────────────

  describe('manual status changes', () => {
    it.each([
      ['PENDING', 'IN_PROGRESS', 'work_order.started'],
      ['PENDING', 'CANCELLED', 'work_order.cancelled'],
      ['IN_PROGRESS', 'DONE', 'work_order.completed'],
      ['IN_PROGRESS', 'CANCELLED', 'work_order.cancelled'],
      ['DONE', 'IN_PROGRESS', 'work_order.reopened'],
      ['CANCELLED', 'IN_PROGRESS', 'work_order.reopened'],
    ] as const)('audits %s ? %s with justification', async (from, to, action) => {
      mockCurrentWo({ status: from });
      mockUpdatedWo(to);
      await service.changeStatus('wo-1', 'comp-1', 'user-1', to, '  Ajuste operacional  ', 'ADMIN');
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          companyId: 'comp-1',
          actorType: 'USER',
          actorUserId: 'user-1',
          entityType: 'work_order',
          entityId: 'wo-1',
          from,
          to,
          action,
          reason: 'Ajuste operacional',
        }),
      );
    });

    it.each([
      ['PENDING', 'PENDING'],
      ['PENDING', 'DONE'],
      ['IN_PROGRESS', 'PENDING'],
      ['IN_PROGRESS', 'IN_PROGRESS'],
      ['DONE', 'PENDING'],
      ['DONE', 'DONE'],
      ['DONE', 'CANCELLED'],
      ['CANCELLED', 'PENDING'],
      ['CANCELLED', 'DONE'],
      ['CANCELLED', 'CANCELLED'],
    ] as const)('rejects %s to %s without mutation', async (from, to) => {
      mockCurrentWo({ status: from });
      await expect(
        service.changeStatus('wo-1', 'comp-1', 'user-1', to, 'Ajuste', 'ADMIN'),
      ).rejects.toThrow('Transição inválida');
      expect(mockTx.workOrder.updateMany).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('allows technicians to start with justification and returns updated actions', async () => {
      mockCurrentWo();
      mockUpdatedWo('IN_PROGRESS');
      const result = await service.changeStatus(
        'wo-1',
        'comp-1',
        'user-1',
        'IN_PROGRESS',
        'Ajuste',
        'TECNICO',
      );
      expect(result.allowed_actions).toEqual(['concluir', 'cancelar']);
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
    });

    it('requires justification even for starting', async () => {
      mockCurrentWo();
      await expect(
        service.changeStatus('wo-1', 'comp-1', 'user-1', 'IN_PROGRESS', '  ', 'TECNICO'),
      ).rejects.toThrow('Motivo é obrigatório');
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('does not allow technicians to reopen', async () => {
      mockCurrentWo({ status: 'DONE' });
      await expect(
        service.changeStatus('wo-1', 'comp-1', 'user-1', 'IN_PROGRESS', 'Ajuste', 'TECNICO'),
      ).rejects.toThrow('Apenas administradores');
      expect(mockTx.workOrder.updateMany).not.toHaveBeenCalled();
    });

    it('keeps tenant isolation', async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(null);
      await expect(
        service.changeStatus('wo-1', 'other-company', 'user-1', 'IN_PROGRESS', 'Ajuste', 'ADMIN'),
      ).rejects.toThrow();
      expect(mockPrisma.workOrder.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wo-1', company_id: 'other-company' },
        }),
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('rejects concurrent changes without auditing', async () => {
      mockCurrentWo();
      mockTx.workOrder.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.changeStatus('wo-1', 'comp-1', 'user-1', 'IN_PROGRESS', 'Ajuste', 'TECNICO'),
      ).rejects.toThrow('Transição inválida');
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  describe('allowedActions()', () => {
    it('AC4: PENDING lista iniciar/cancelar para qualquer papel', () => {
      expect(service.allowedActions('PENDING', 'TECNICO')).toEqual(['iniciar', 'cancelar']);
      expect(service.allowedActions('PENDING', 'OWNER')).toEqual(['iniciar', 'cancelar']);
    });

    it('AC2: DONE/CANCELLED só expõem reabrir/corrigir para OWNER/ADMIN', () => {
      expect(service.allowedActions('DONE', 'TECNICO')).toEqual([]);
      expect(service.allowedActions('CANCELLED', 'TECNICO')).toEqual([]);
      expect(service.allowedActions('DONE', 'ADMIN')).toEqual(['reabrir', 'corrigir']);
      expect(service.allowedActions('CANCELLED', 'OWNER')).toEqual(['reabrir', 'corrigir']);
    });

    it('sem papel informado, ações admin ficam de fora', () => {
      expect(service.allowedActions('DONE')).toEqual([]);
      expect(service.allowedActions('IN_PROGRESS')).toEqual(['concluir', 'cancelar']);
    });

    it('R5b: ações de status extra só aparecem com o extra ligado na empresa', () => {
      expect(service.allowedActions('DONE', 'TECNICO')).toEqual([]);
      expect(service.allowedActions('DONE', 'ADMIN')).toEqual(['reabrir', 'corrigir']);
      expect(service.allowedActions('DONE', 'TECNICO', ['AWAITING_PAYMENT'])).toEqual([
        'aguardar_pagamento',
      ]);
      expect(service.allowedActions('DONE', 'TECNICO', ['WARRANTY'])).toEqual(['acionar_garantia']);
      expect(service.allowedActions('DONE', 'ADMIN', ['AWAITING_PAYMENT', 'WARRANTY'])).toEqual([
        'reabrir',
        'corrigir',
        'aguardar_pagamento',
        'acionar_garantia',
      ]);
    });

    it('R5b: AWAITING_PAYMENT/WARRANTY expõem reabrir/corrigir só para admin', () => {
      expect(service.allowedActions('AWAITING_PAYMENT', 'TECNICO', ['AWAITING_PAYMENT'])).toEqual(
        ['receber_pagamento'],
      );
      expect(service.allowedActions('AWAITING_PAYMENT', 'ADMIN', ['AWAITING_PAYMENT'])).toEqual([
        'receber_pagamento',
        'reabrir',
        'corrigir',
      ]);
      expect(service.allowedActions('WARRANTY', 'TECNICO', ['WARRANTY'])).toEqual([]);
      expect(service.allowedActions('WARRANTY', 'OWNER', ['WARRANTY'])).toEqual([
        'reabrir',
        'corrigir',
      ]);
      // extra desligado depois: OS já no extra continua saindo por reabrir/corrigir
      expect(service.allowedActions('WARRANTY', 'OWNER')).toEqual(['reabrir', 'corrigir']);
    });
  });

  // ── iniciar ───────────────────────────────────────────────────────────────

  describe('start() — iniciar', () => {
    it('PENDING → IN_PROGRESS grava started_at e auditoria com from/to', async () => {
      mockCurrentWo({ status: 'PENDING' });
      mockUpdatedWo('IN_PROGRESS');

      const result = await service.start('wo-1', 'comp-1', 'user-1');

      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'wo-1', status: 'PENDING' },
        data: { status: 'IN_PROGRESS', started_at: expect.any(Date) },
      });
      expect(mockAudit.record).toHaveBeenCalledTimes(1);
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.started',
          entityType: 'work_order',
          entityId: 'wo-1',
          from: 'PENDING',
          to: 'IN_PROGRESS',
          reason: null,
          actorType: 'USER',
          actorUserId: 'user-1',
        }),
      );
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain('Maria Souza');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('com papel, resposta inclui allowed_actions do novo estado (AC4)', async () => {
      mockCurrentWo({ status: 'PENDING' });
      mockUpdatedWo('IN_PROGRESS');

      const result = await service.start('wo-1', 'comp-1', 'user-1', 'TECNICO');

      expect(result.allowed_actions).toEqual(['concluir', 'cancelar']);
    });

    it('estado inválido (IN_PROGRESS) → BadRequestException sem auditoria', async () => {
      mockCurrentWo({ status: 'IN_PROGRESS' });

      await expect(service.start('wo-1', 'comp-1', 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockAudit.record).not.toHaveBeenCalled();
      expect(mockTx.workOrder.updateMany).not.toHaveBeenCalled();
    });
  });

  // ── concluir ──────────────────────────────────────────────────────────────

  describe('complete() — concluir', () => {
    it('IN_PROGRESS → DONE grava finished_at e auditoria', async () => {
      mockCurrentWo({ status: 'IN_PROGRESS', started_at: new Date('2026-01-01T10:00:00Z') });
      mockUpdatedWo('DONE');

      await service.complete('wo-1', 'comp-1', 'user-1');

      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'wo-1', status: 'IN_PROGRESS' },
        data: { status: 'DONE', finished_at: expect.any(Date) },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.completed',
          from: 'IN_PROGRESS',
          to: 'DONE',
          reason: null,
        }),
      );
    });

    it('estado inválido (PENDING) → BadRequestException', async () => {
      mockCurrentWo({ status: 'PENDING' });

      await expect(service.complete('wo-1', 'comp-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  // ── cancelar ──────────────────────────────────────────────────────────────

  describe('cancel() — cancelar', () => {
    it('com motivo: grava auditoria com from/to/reason e NÃO toca em notes (AC3)', async () => {
      mockCurrentWo({ status: 'IN_PROGRESS', started_at: new Date() });
      mockUpdatedWo('CANCELLED');

      await service.cancel('wo-1', 'comp-1', 'user-1', 'Cliente desistiu do serviço');

      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'wo-1', status: 'IN_PROGRESS' },
        data: { status: 'CANCELLED' },
      });
      const updateData = mockTx.workOrder.updateMany.mock.calls[0][0].data;
      expect(Object.keys(updateData)).not.toContain('notes');
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.cancelled',
          from: 'IN_PROGRESS',
          to: 'CANCELLED',
          reason: 'Cliente desistiu do serviço',
        }),
      );
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain('Cliente desistiu do serviço');
    });

    it('sem motivo → BadRequestException sem auditoria', async () => {
      mockCurrentWo({ status: 'PENDING' });

      await expect(service.cancel('wo-1', 'comp-1', 'user-1')).rejects.toThrow(BadRequestException);
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('motivo em branco → BadRequestException', async () => {
      mockCurrentWo({ status: 'PENDING' });

      await expect(service.cancel('wo-1', 'comp-1', 'user-1', '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('estado terminal (DONE) → BadRequestException', async () => {
      mockCurrentWo({ status: 'DONE' });

      await expect(service.cancel('wo-1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  // ── reabrir ────────────────────────────────────────────────────────────────

  describe('reopen() — reabrir (terminal → IN_PROGRESS)', () => {
    it('DONE → IN_PROGRESS: limpa finished_at, mantém started_at e grava auditoria com motivo', async () => {
      const started = new Date('2026-01-01T10:00:00Z');
      mockCurrentWo({
        status: 'DONE',
        started_at: started,
        finished_at: new Date('2026-01-01T12:00:00Z'),
      });
      mockUpdatedWo('IN_PROGRESS');

      await service.reopen('wo-1', 'comp-1', 'user-1', 'Finalizada por engano');

      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'wo-1', status: 'DONE' },
        data: {
          status: 'IN_PROGRESS',
          finished_at: null,
          started_at: started,
        },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.reopened',
          from: 'DONE',
          to: 'IN_PROGRESS',
          reason: 'Finalizada por engano',
        }),
      );
    });

    it('CANCELLED nunca iniciada → reabrir marca started_at agora', async () => {
      mockCurrentWo({ status: 'CANCELLED', started_at: null, finished_at: null });
      mockUpdatedWo('IN_PROGRESS');

      await service.reopen('wo-1', 'comp-1', 'user-1', 'Cancelada por engano');

      const data = mockTx.workOrder.updateMany.mock.calls[0][0].data;
      expect(data.started_at).toEqual(expect.any(Date));
    });

    it('sem motivo → BadRequestException', async () => {
      mockCurrentWo({ status: 'DONE' });

      await expect(service.reopen('wo-1', 'comp-1', 'user-1', undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('estado não-terminal (IN_PROGRESS) → BadRequestException', async () => {
      mockCurrentWo({ status: 'IN_PROGRESS' });

      await expect(service.reopen('wo-1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('transição concorrente vencida (updateMany count 0) → ConflictException sem auditoria', async () => {
      mockCurrentWo({ status: 'DONE' });
      mockTx.workOrder.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.reopen('wo-1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        ConflictException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('falha na auditoria propaga o erro da transação', async () => {
      mockCurrentWo({ status: 'DONE' });
      mockTx.workOrder.updateMany.mockResolvedValueOnce({ count: 1 });
      mockUpdatedWo('IN_PROGRESS');
      mockAudit.record.mockRejectedValueOnce(new Error('audit write failed'));

      await expect(service.reopen('wo-1', 'comp-1', 'user-1', 'motivo')).rejects.toThrow(
        'audit write failed',
      );
    });
  });

  // ── status extras (R5b — AWAITING_PAYMENT / WARRANTY) ─────────────────────

  describe('status extras (R5b) — transições auditadas com extra ligado', () => {
    it.each([
      ['DONE', 'AWAITING_PAYMENT', 'work_order.awaiting_payment'],
      ['AWAITING_PAYMENT', 'DONE', 'work_order.payment_received'],
      ['DONE', 'WARRANTY', 'work_order.warranty_claimed'],
    ] as const)('audita %s ? %s com justificativa', async (from, to, action) => {
      enableExtras('AWAITING_PAYMENT', 'WARRANTY');
      mockCurrentWo({ status: from, finished_at: new Date('2026-01-01T12:00:00Z') });
      mockUpdatedWo(to);
      await service.changeStatus('wo-1', 'comp-1', 'user-1', to, 'Pagamento em dia', 'ADMIN');
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          companyId: 'comp-1',
          actorType: 'USER',
          actorUserId: 'user-1',
          entityType: 'work_order',
          entityId: 'wo-1',
          from,
          to,
          action,
          reason: 'Pagamento em dia',
        }),
      );
    });

    it('aguardar_pagamento preserva started_at/finished_at (marcação pós-conclusão)', async () => {
      enableExtras('AWAITING_PAYMENT');
      mockCurrentWo({
        status: 'DONE',
        started_at: new Date('2026-01-01T10:00:00Z'),
        finished_at: new Date('2026-01-01T12:00:00Z'),
      });
      mockUpdatedWo('AWAITING_PAYMENT');

      const result = await service.awaitPayment('wo-1', 'comp-1', 'user-1', 'TECNICO');

      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'wo-1', status: 'DONE' },
        data: { status: 'AWAITING_PAYMENT' },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.awaiting_payment',
          from: 'DONE',
          to: 'AWAITING_PAYMENT',
        }),
      );
      expect(result.allowed_actions).toEqual(['receber_pagamento']);
    });

    it('receber_pagamento: AWAITING_PAYMENT → DONE devolve a OS a concluída', async () => {
      enableExtras('AWAITING_PAYMENT');
      mockCurrentWo({ status: 'AWAITING_PAYMENT' });
      mockUpdatedWo('DONE');

      await service.receivePayment('wo-1', 'comp-1', 'user-1');

      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'wo-1', status: 'AWAITING_PAYMENT' },
        data: { status: 'DONE' },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.payment_received',
          from: 'AWAITING_PAYMENT',
          to: 'DONE',
        }),
      );
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain('pagamento recebido');
    });

    it('acionar_garantia: DONE → WARRANTY com auditoria própria', async () => {
      enableExtras('WARRANTY');
      mockCurrentWo({ status: 'DONE' });
      mockUpdatedWo('WARRANTY');

      await service.claimWarranty('wo-1', 'comp-1', 'user-1');

      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.warranty_claimed',
          from: 'DONE',
          to: 'WARRANTY',
        }),
      );
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain('em garantia');
    });

    it('reabrir sai dos status extras: limpa finished_at e grava motivo (AC1/AC2)', async () => {
      const started = new Date('2026-01-01T10:00:00Z');
      mockCurrentWo({
        status: 'WARRANTY',
        started_at: started,
        finished_at: new Date('2026-01-01T12:00:00Z'),
      });
      mockUpdatedWo('IN_PROGRESS');

      await service.reopen('wo-1', 'comp-1', 'user-1', 'Retorno coberto pela garantia', 'ADMIN');

      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'wo-1', status: 'WARRANTY' },
        data: { status: 'IN_PROGRESS', finished_at: null, started_at: started },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.reopened',
          from: 'WARRANTY',
          to: 'IN_PROGRESS',
          reason: 'Retorno coberto pela garantia',
        }),
      );
    });

    it('extra desligado: transição bloqueada com BadRequest, sem mutação nem auditoria', async () => {
      mockCurrentWo({ status: 'DONE' });

      await expect(
        service.changeStatus('wo-1', 'comp-1', 'user-1', 'AWAITING_PAYMENT', 'Ajuste', 'ADMIN'),
      ).rejects.toThrow('não está ativado');
      await expect(service.awaitPayment('wo-1', 'comp-1', 'user-1')).rejects.toThrow(
        'não está ativado',
      );
      expect(mockTx.workOrder.updateMany).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it.each([
      ['AWAITING_PAYMENT', 'CANCELLED'],
      ['AWAITING_PAYMENT', 'WARRANTY'],
      ['WARRANTY', 'DONE'],
      ['WARRANTY', 'CANCELLED'],
      ['PENDING', 'AWAITING_PAYMENT'],
      ['IN_PROGRESS', 'WARRANTY'],
    ] as const)('rejeita %s para %s sem mutação', async (from, to) => {
      enableExtras('AWAITING_PAYMENT', 'WARRANTY');
      mockCurrentWo({ status: from });
      await expect(
        service.changeStatus('wo-1', 'comp-1', 'user-1', to, 'Ajuste', 'ADMIN'),
      ).rejects.toThrow('Transição inválida');
      expect(mockTx.workOrder.updateMany).not.toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  // ── corrigir ───────────────────────────────────────────────────────────────

  describe('correct() — corrigir (pós-encerramento, não muda status)', () => {
    it('DONE: atualiza campos operacionais e grava auditoria com diff e motivo (AC1/AC3)', async () => {
      mockCurrentWo({ status: 'DONE', started_at: new Date(), finished_at: new Date() });
      mockTx.workOrder.findUnique.mockResolvedValue({
        ...pendingWo,
        status: 'DONE',
        title: 'Instalação revisada',
        notes: 'observação original',
      });

      await service.correct('wo-1', 'comp-1', 'user-1', {
        reason: 'Título digitado errado no campo',
        title: 'Instalação revisada',
        notes: 'observação original',
      });

      const updateArgs = mockTx.workOrder.updateMany.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: 'wo-1', status: 'DONE' });
      expect(Object.keys(updateArgs.data)).not.toContain('status');
      expect(updateArgs.data).toEqual(
        expect.objectContaining({ title: 'Instalação revisada', notes: 'observação original' }),
      );
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.corrected',
          from: 'DONE',
          to: 'DONE',
          reason: 'Título digitado errado no campo',
        }),
      );
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain('título');
      expect(mockAudit.record.mock.calls[0][1].humanText).toContain(
        'Título digitado errado no campo',
      );
    });

    it('só motivo (sem campos): registra a anotação sem update', async () => {
      mockCurrentWo({ status: 'CANCELLED' });
      mockTx.workOrder.findUnique.mockResolvedValue({ ...pendingWo, status: 'CANCELLED' });

      await service.correct('wo-1', 'comp-1', 'user-1', { reason: 'Registro de contexto' });

      expect(mockTx.workOrder.updateMany).not.toHaveBeenCalled();
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          action: 'work_order.corrected',
          from: 'CANCELLED',
          to: 'CANCELLED',
          reason: 'Registro de contexto',
        }),
      );
    });

    it('sem motivo → BadRequestException', async () => {
      mockCurrentWo({ status: 'DONE' });

      await expect(service.correct('wo-1', 'comp-1', 'user-1', {})).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('estado não-terminal (IN_PROGRESS) → BadRequestException', async () => {
      mockCurrentWo({ status: 'IN_PROGRESS' });

      await expect(
        service.correct('wo-1', 'comp-1', 'user-1', { reason: 'motivo' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('título vazio → BadRequestException', async () => {
      mockCurrentWo({ status: 'DONE' });

      await expect(
        service.correct('wo-1', 'comp-1', 'user-1', { reason: 'motivo', title: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('scheduled_at inválida → BadRequestException', async () => {
      mockCurrentWo({ status: 'DONE' });

      await expect(
        service.correct('wo-1', 'comp-1', 'user-1', {
          reason: 'motivo',
          scheduled_at: 'não é data',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── alias legado PATCH {status} (compatibilidade mobile) ──────────────────

  describe('update() — dispatch de status para ações de domínio', () => {
    it.each(['DONE', 'CANCELLED', 'AWAITING_PAYMENT', 'WARRANTY'])(
      'nega edição genérica de OS %s',
      async (status) => {
        mockPrisma.workOrder.findFirst.mockResolvedValue({ ...pendingWo, status });
        await expect(
          service.update('wo-1', { title: 'adulterado' }, 'comp-1', 'tech'),
        ).rejects.toThrow(BadRequestException);
        expect(mockPrisma.workOrder.update).not.toHaveBeenCalled();
        expect(mockPrisma.workOrder.updateMany).not.toHaveBeenCalled();
      },
    );

    it('não permite forjar datas de início e conclusão pelo PATCH', async () => {
      mockPrisma.workOrder.findFirst.mockResolvedValue(pendingWo);
      await expect(
        service.update('wo-1', { finished_at: new Date().toISOString() }, 'comp-1', 'tech'),
      ).rejects.toThrow(BadRequestException);
    });

    it('status IN_PROGRESS roteia para iniciar (mesma validação + auditoria)', async () => {
      mockCurrentWo({ status: 'PENDING' });
      mockUpdatedWo('IN_PROGRESS');

      await service.update('wo-1', { status: 'IN_PROGRESS' } as never, 'comp-1', 'user-1');

      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'wo-1', status: 'PENDING' },
        data: { status: 'IN_PROGRESS', started_at: expect.any(Date) },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ action: 'work_order.started' }),
      );
    });

    it('status CANCELLED sem motivo → BadRequestException (motivo obrigatório também no alias)', async () => {
      mockCurrentWo({ status: 'PENDING' });

      await expect(
        service.update('wo-1', { status: 'CANCELLED' } as never, 'comp-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockAudit.record).not.toHaveBeenCalled();
    });

    it('status AWAITING_PAYMENT roteia para aguardar_pagamento (R5b, valida extra)', async () => {
      enableExtras('AWAITING_PAYMENT');
      mockCurrentWo({ status: 'DONE' });
      mockUpdatedWo('AWAITING_PAYMENT');

      await service.update('wo-1', { status: 'AWAITING_PAYMENT' } as never, 'comp-1', 'user-1');

      expect(mockTx.workOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'wo-1', status: 'DONE' },
        data: { status: 'AWAITING_PAYMENT' },
      });
      expect(mockAudit.record).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ action: 'work_order.awaiting_payment' }),
      );
    });

    it('status PENDING → BadRequestException (não é ação de domínio)', async () => {
      mockCurrentWo({ status: 'IN_PROGRESS' });

      await expect(
        service.update('wo-1', { status: 'PENDING' } as never, 'comp-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sem status: atualização de campos segue pelo caminho comum, sem auditoria de transição', async () => {
      mockCurrentWo({ status: 'PENDING' });
      mockPrisma.workOrder.update.mockResolvedValue({ ...pendingWo, title: 'novo título' });

      await service.update('wo-1', { title: 'novo título' } as never, 'comp-1', 'user-1');

      expect(mockPrisma.workOrder.updateMany).toHaveBeenCalled();
      expect(mockAudit.record).not.toHaveBeenCalled();
    });
  });

  // ── findAll/findOne expõem allowed_actions ───────────────────────────────

  describe('findAll()/findOne() com papel (AC4)', () => {
    it('findOne com papel TECNICO em OS DONE retorna allowed_actions vazia', async () => {
      mockCurrentWo({ status: 'DONE' });

      const result = await service.findOne('wo-1', 'comp-1', 'TECNICO');

      expect(result.allowed_actions).toEqual([]);
    });

    it('findOne com papel OWNER em OS DONE retorna reabrir/corrigir', async () => {
      mockCurrentWo({ status: 'DONE' });

      const result = await service.findOne('wo-1', 'comp-1', 'OWNER');

      expect(result.allowed_actions).toEqual(['reabrir', 'corrigir']);
    });

    it('findAll anota allowed_actions em cada item', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([
        { ...pendingWo, status: 'PENDING' },
        { ...pendingWo, status: 'DONE' },
      ]);

      const result = await service.findAll('comp-1', 1, 20, 'TECNICO');

      expect(result.data[0].allowed_actions).toEqual(['iniciar', 'cancelar']);
      expect(result.data[1].allowed_actions).toEqual([]);
    });
  });

  it('detail returns signed photo URLs instead of the stored object keys', async () => {
    mockPrisma.workOrder.findFirst.mockResolvedValue({
      ...pendingWo,
      photos: [{ id: 'ph1', photo_stage: 'BEFORE', file_url: 'comp/work-orders/wo/before/a.jpeg' }],
    });
    const wo = (await service.findOne('wo-1', 'comp-1')) as unknown as {
      photos: Array<{ file_url: string }>;
    };
    expect(wo.photos[0].file_url).toBe('signed:comp/work-orders/wo/before/a.jpeg');
  });
});
