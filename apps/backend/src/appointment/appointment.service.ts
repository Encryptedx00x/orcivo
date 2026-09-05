import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import type { AppointmentCreateDto, AppointmentListQueryDto } from './appointment.dto';

const customerSelect = { select: { id: true, name: true } };

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: TenantOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: AppointmentCreateDto, companyId: string, userId: string) {
    await this.ownership.assertCustomer(dto.customer_id, companyId);
    await this.ownership.assertWorkOrder(dto.work_order_id, companyId);

    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          company_id: companyId,
          customer_id: dto.customer_id,
          work_order_id: dto.work_order_id,
          title: dto.title,
          type: dto.type ?? 'OUTRO',
          notes: dto.notes,
          starts_at: new Date(dto.starts_at),
          ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
          created_by_user_id: userId,
        },
        include: { customer: customerSelect },
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'appointment.created',
        entityType: 'appointment',
        entityId: appointment.id,
        from: null,
        to: appointment.starts_at.toISOString(),
        humanText:
          `Compromisso "${appointment.title}" (${appointment.customer?.name ?? 'sem cliente'}) ` +
          `agendado para ${appointment.starts_at.toISOString()}`,
      });
      return appointment;
    });
  }

  async findAll(companyId: string, query: AppointmentListQueryDto) {
    const where = {
      company_id: companyId,
      ...(query.from || query.to
        ? {
            starts_at: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const data = await this.prisma.appointment.findMany({
      where,
      orderBy: { starts_at: 'asc' },
      include: { customer: customerSelect },
      take: 500,
    });
    return { data };
  }

  async remove(id: string, companyId: string, userId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, company_id: companyId },
      select: { id: true, title: true, starts_at: true, customer: { select: { name: true } } },
    });
    if (!appointment) throw new NotFoundException('Compromisso não encontrado');
    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.delete({ where: { id } });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'appointment.deleted',
        entityType: 'appointment',
        entityId: id,
        from: appointment.starts_at.toISOString(),
        to: null,
        humanText:
          `Compromisso "${appointment.title}" (${appointment.customer?.name ?? 'sem cliente'}) de ` +
          `${appointment.starts_at.toISOString()} removido`,
      });
    });
    return { ok: true };
  }
}
