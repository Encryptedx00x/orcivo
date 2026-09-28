import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditQuery } from './audit-query.dto';

@Injectable()
export class AuditReadService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, query: AuditQuery) {
    const scope = {
      company_id: companyId,
      entity_type: query.entity_type,
      entity_id: query.entity_id,
    };
    const cursor = query.cursor
      ? await this.prisma.auditLog.findFirst({
          where: { ...scope, id: query.cursor },
          select: { id: true, created_at: true },
        })
      : null;
    if (query.cursor && !cursor) throw new BadRequestException('Cursor de histórico inválido.');

    const rows = await this.prisma.auditLog.findMany({
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
        created_at: true,
        action: true,
        actor_type: true,
        actor_user_id: true,
        metadata: true,
      },
    });
    const page = rows.slice(0, query.limit);
    const actorIds = [
      ...new Set(
        page.flatMap((row) =>
          row.actor_type === 'USER' && row.actor_user_id ? [row.actor_user_id] : [],
        ),
      ),
    ];
    // Actor IDs come only from this tenant's audit rows. Do not expose user profiles.
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];
    const names = new Map(actors.map((actor) => [actor.id, actor.name]));
    return {
      data: page.map((row) => ({
        ...row,
        actor_name:
          row.actor_type === 'USER' && row.actor_user_id
            ? (names.get(row.actor_user_id) ?? null)
            : null,
      })),
      next_cursor: rows.length > query.limit ? page[page.length - 1].id : null,
    };
  }
}
