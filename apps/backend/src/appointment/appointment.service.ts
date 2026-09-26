import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import type {
  AppointmentCreateDto,
  AppointmentListQueryDto,
  AppointmentUpdateDto,
} from './appointment.dto';

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

  async update(id: string, dto: AppointmentUpdateDto, companyId: string, userId: string) {
    await this.ownership.assertCustomer(dto.customer_id ?? undefined, companyId);
    await this.ownership.assertWorkOrder(dto.work_order_id ?? undefined, companyId);

    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.appointment.findFirst({ where: { id, company_id: companyId } });
      if (!previous) throw new NotFoundException('Compromisso não encontrado');
      const startsAt = dto.starts_at === undefined ? previous.starts_at : new Date(dto.starts_at);
      const endsAt =
        dto.ends_at === undefined
          ? previous.ends_at
          : dto.ends_at === null
            ? null
            : new Date(dto.ends_at);
      if (endsAt && endsAt < startsAt) {
        throw new BadRequestException('Fim deve ser maior ou igual ao início');
      }
      const result = await tx.appointment.updateMany({
        where: { id, company_id: companyId, updated_at: previous.updated_at },
        data: { ...dto, starts_at: startsAt, ends_at: endsAt },
      });
      if (result.count !== 1)
        throw new ConflictException('Compromisso alterado. Atualize a agenda e tente novamente.');
      const appointment = await tx.appointment.findFirstOrThrow({
        where: { id, company_id: companyId },
        include: { customer: customerSelect },
      });
      const snapshot = (value: typeof previous) => ({
        title: value.title,
        type: value.type,
        customer_id: value.customer_id,
        work_order_id: value.work_order_id,
        notes: value.notes,
        starts_at: value.starts_at.toISOString(),
        ends_at: value.ends_at?.toISOString() ?? null,
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'appointment.updated',
        entityType: 'appointment',
        entityId: id,
        from: snapshot(previous),
        to: snapshot(appointment),
        humanText: `Compromisso "${appointment.title}" (${appointment.customer?.name ?? 'sem cliente'}) atualizado`,
      });
      return appointment;
    });
  }

  async remove(id: string, companyId: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: { id, company_id: companyId },
        select: { id: true, title: true, starts_at: true, customer: { select: { name: true } } },
      });
      if (!appointment) throw new NotFoundException('Compromisso não encontrado');
      const result = await tx.appointment.deleteMany({ where: { id, company_id: companyId } });
      if (result.count !== 1) throw new NotFoundException('Compromisso não encontrado');
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
