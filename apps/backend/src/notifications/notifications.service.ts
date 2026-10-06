import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationQuery } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';

const NOTIFIABLE_ENTITY_TYPES = [
  'customer',
  'quote',
  'work_order',
  'payment',
  'appointment',
  'invite',
  'company',
];

function humanText(metadata: unknown, action: string): string {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const value = (metadata as Record<string, unknown>)['humanText'];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return action;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(companyId: string) {
    return { company_id: companyId, entity_type: { in: NOTIFIABLE_ENTITY_TYPES } };
  }

  async findAll(companyId: string, userId: string, query: NotificationQuery) {
    const scope = this.scope(companyId);
    const cursor = query.cursor
      ? await this.prisma.auditLog.findFirst({
          where: { ...scope, id: query.cursor },
          select: { id: true, created_at: true },
        })
      : null;
    if (query.cursor && !cursor) throw new BadRequestException('Cursor de notificações inválido.');

    const [rows, unread_count] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          ...scope,
          ...(cursor
            ? {
                OR: [
                  { created_at: { lt: cursor.created_at } },
                  { created_at: cursor.created_at, id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
        select: {
          id: true,
          action: true,
          entity_type: true,
          entity_id: true,
          metadata: true,
          created_at: true,
          notification_reads: { where: { user_id: userId }, select: { read_at: true } },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          ...scope,
          notification_reads: { none: { user_id: userId } },
        },
      }),
    ]);
    const page = rows.slice(0, query.limit);
    return {
      data: page.map((row) => ({
        id: row.id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        human_text: humanText(row.metadata, row.action),
        created_at: row.created_at.toISOString(),
        read_at: row.notification_reads[0]?.read_at.toISOString() ?? null,
      })),
      next_cursor: rows.length > query.limit ? (page[page.length - 1]?.id ?? null) : null,
      unread_count,
    };
  }

  /** "Marcar todas como lidas": one read row per unread notification of this user. */
  async markAllRead(companyId: string, userId: string) {
    const unread = await this.prisma.auditLog.findMany({
      where: { ...this.scope(companyId), notification_reads: { none: { user_id: userId } } },
      select: { id: true },
    });
    if (unread.length) {
      await this.prisma.notificationRead.createMany({
        data: unread.map((n) => ({ company_id: companyId, user_id: userId, audit_log_id: n.id })),
        skipDuplicates: true,
      });
    }
    return { marked: unread.length };
  }

  async markRead(companyId: string, userId: string, auditLogId: string) {
    const notification = await this.prisma.auditLog.findFirst({
      where: { ...this.scope(companyId), id: auditLogId },
      select: { id: true },
    });
    if (!notification) throw new NotFoundException('Notificação não encontrada.');

    const read = await this.prisma.notificationRead.upsert({
      where: { audit_log_id_user_id: { audit_log_id: notification.id, user_id: userId } },
      create: { company_id: companyId, user_id: userId, audit_log_id: notification.id },
      update: {},
      select: { read_at: true },
    });
    return { id: notification.id, read_at: read.read_at.toISOString() };
  }
}
