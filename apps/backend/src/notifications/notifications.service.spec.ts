import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const companyId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const auditLogId = '33333333-3333-4333-8333-333333333333';
  const createdAt = new Date('2026-10-01T12:00:00.000Z');

  const prisma = {
    auditLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    notificationRead: { upsert: jest.fn(), createMany: jest.fn() },
  };
  const service = new NotificationsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('projects contextual audit text into an unread activity notification', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: auditLogId,
        action: 'work_order.completed',
        entity_type: 'work_order',
        entity_id: '44444444-4444-4444-8444-444444444444',
        metadata: { humanText: 'OS #12 "Instalação" (Ana) finalizada' },
        created_at: createdAt,
        notification_reads: [],
      },
    ]);
    prisma.auditLog.count.mockResolvedValue(1);

    await expect(service.findAll(companyId, userId, { limit: 20 })).resolves.toEqual({
      data: [
        {
          id: auditLogId,
          action: 'work_order.completed',
          entity_type: 'work_order',
          entity_id: '44444444-4444-4444-8444-444444444444',
          human_text: 'OS #12 "Instalação" (Ana) finalizada',
          created_at: '2026-10-01T12:00:00.000Z',
          read_at: null,
        },
      ],
      next_cursor: null,
      unread_count: 1,
    });
    expect(prisma.auditLog.count).toHaveBeenCalledWith({
      where: {
        company_id: companyId,
        entity_type: {
          in: ['customer', 'quote', 'work_order', 'payment', 'appointment', 'invite', 'company'],
        },
        notification_reads: { none: { user_id: userId } },
      },
    });
  });

  it('records a per-user read acknowledgement only for a tenant notification', async () => {
    prisma.auditLog.findFirst.mockResolvedValue({ id: auditLogId });
    prisma.notificationRead.upsert.mockResolvedValue({ read_at: createdAt });

    await expect(service.markRead(companyId, userId, auditLogId)).resolves.toEqual({
      id: auditLogId,
      read_at: '2026-10-01T12:00:00.000Z',
    });
    expect(prisma.notificationRead.upsert).toHaveBeenCalledWith({
      where: { audit_log_id_user_id: { audit_log_id: auditLogId, user_id: userId } },
      create: { company_id: companyId, user_id: userId, audit_log_id: auditLogId },
      update: {},
      select: { read_at: true },
    });
  });

  it('marks every unread tenant notification of the user as read at once', async () => {
    prisma.auditLog.findMany.mockResolvedValue([{ id: auditLogId }, { id: 'other-id' }]);

    await expect(service.markAllRead(companyId, userId)).resolves.toEqual({ marked: 2 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        company_id: companyId,
        notification_reads: { none: { user_id: userId } },
      }),
      select: { id: true },
    });
    expect(prisma.notificationRead.createMany).toHaveBeenCalledWith({
      data: [
        { company_id: companyId, user_id: userId, audit_log_id: auditLogId },
        { company_id: companyId, user_id: userId, audit_log_id: 'other-id' },
      ],
      skipDuplicates: true,
    });
  });

  it('marking all with nothing unread writes nothing', async () => {
    prisma.auditLog.findMany.mockResolvedValue([]);
    await expect(service.markAllRead(companyId, userId)).resolves.toEqual({ marked: 0 });
    expect(prisma.notificationRead.createMany).not.toHaveBeenCalled();
  });

  it('does not permit marking an audit event from another tenant as read', async () => {
    prisma.auditLog.findFirst.mockResolvedValue(null);

    await expect(service.markRead(companyId, userId, auditLogId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.notificationRead.upsert).not.toHaveBeenCalled();
  });
});
