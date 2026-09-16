import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  const mockTx = { auditLog: { create: jest.fn() } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService],
    }).compile();
    service = module.get(AuditService);
  });

  it('persists a structured row via the given tx client (AC1)', async () => {
    await service.record(mockTx as never, {
      companyId: 'comp-1',
      actorType: 'USER',
      actorUserId: 'user-1',
      action: 'quote.approved',
      entityType: 'quote',
      entityId: 'quote-1',
      from: 'SENT',
      to: 'APPROVED',
      humanText: 'Orçamento #128 (Maria Souza) aprovado',
    });

    expect(mockTx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: {
        company_id: 'comp-1',
        actor_type: 'USER',
        actor_user_id: 'user-1',
        action: 'quote.approved',
        entity_type: 'quote',
        entity_id: 'quote-1',
        metadata: {
          from: 'SENT',
          to: 'APPROVED',
          reason: null,
          humanText: 'Orçamento #128 (Maria Souza) aprovado',
        },
      },
    });
  });

  it('writes null actor_user_id for SYSTEM/CUSTOMER actors (additive column, AC1)', async () => {
    await service.record(mockTx as never, {
      companyId: 'comp-1',
      actorType: 'SYSTEM',
      action: 'quote.expired',
      entityType: 'quote',
      entityId: 'quote-2',
      from: 'SENT',
      to: 'EXPIRED',
      humanText: 'Orçamento #129 (João Lima) expirou automaticamente',
    });

    const { data } = mockTx.auditLog.create.mock.calls[0][0];
    expect(data.actor_user_id).toBeNull();
    expect(data.actor_type).toBe('SYSTEM');
  });

  it('carries an optional reason into metadata.reason', async () => {
    await service.record(mockTx as never, {
      companyId: 'comp-1',
      actorType: 'USER',
      actorUserId: 'user-1',
      action: 'quote.cancelled',
      entityType: 'quote',
      entityId: 'quote-3',
      from: 'SENT',
      to: 'CANCELLED',
      reason: 'Cliente desistiu do serviço',
      humanText: 'Orçamento #130 (Ana Paula) cancelado: cliente desistiu do serviço',
    });

    const { data } = mockTx.auditLog.create.mock.calls[0][0];
    expect(data.metadata.reason).toBe('Cliente desistiu do serviço');
  });
});
