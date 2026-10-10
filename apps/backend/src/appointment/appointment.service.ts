import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import type {
  AppointmentCreateDto,
  AppointmentListQueryDto,
  AppointmentUpdateDto,
} from './appointment.dto';

const customerSelect = { select: { id: true, name: true } };

function nextOccurrence(
  from: Date,
  type: 'WEEKLY' | 'MONTHLY' | 'CUSTOM_MONTHS',
  interval = 1,
): Date {
  const next = new Date(from);
  if (type === 'WEEKLY') {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + (type === 'CUSTOM_MONTHS' ? interval : 1));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

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

    if (dto.recurrence_type) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { plan_code: true },
      });
      if (!company || !['MAIS', 'EQUIPE'].includes(company.plan_code)) {
        throw new BadRequestException(
          'Recorrência está disponível nos planos Orcivo Mais e Equipe.',
        );
      }
    }

    const seriesId = dto.recurrence_type ? randomUUID() : undefined;

    const appointment = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          company_id: companyId,
          customer_id: dto.customer_id,
          work_order_id: dto.work_order_id,
          title: dto.title,
          type: dto.type ?? 'OUTRO',
          status: dto.status ?? 'SCHEDULED',
          notes: dto.notes,
          starts_at: new Date(dto.starts_at),
          ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
          schedule_period: dto.schedule_period,
          reminder_minutes: dto.reminder_minutes,
          recurrence_type: dto.recurrence_type,
          recurrence_interval: dto.recurrence_interval,
          recurrence_series_id: seriesId,
          recurrence_next_at: dto.recurrence_type ? new Date(dto.starts_at) : undefined,
          recurrence_amount: dto.recurrence_amount,
          recurrence_active: !!dto.recurrence_type,
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
    if (dto.recurrence_type) await this.materializeRecurrence(appointment.id, true);
    return appointment;
  }

  private async materializeRecurrence(rootId: string, includeFuture = false): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const root = await tx.appointment.findFirst({
        where: { id: rootId, recurrence_active: true },
      });
      if (
        !root?.recurrence_next_at ||
        !root.recurrence_type ||
        !root.recurrence_series_id ||
        !root.customer_id ||
        !root.recurrence_amount
      ) {
        return;
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'recurrence-series:' + root.recurrence_series_id}))`;
      const current = await tx.appointment.findFirst({
        where: { id: root.id, recurrence_active: true },
      });
      if (!current?.recurrence_next_at) return;
      if (!includeFuture && current.recurrence_next_at > new Date()) return;

      const scheduledAt = current.recurrence_next_at;
      let occurrence = await tx.appointment.findFirst({
        where: {
          company_id: root.company_id,
          recurrence_series_id: root.recurrence_series_id,
          starts_at: scheduledAt,
        },
      });
      if (!occurrence) {
        const duration = root.ends_at ? root.ends_at.getTime() - root.starts_at.getTime() : null;
        occurrence = await tx.appointment.create({
          data: {
            company_id: root.company_id,
            customer_id: root.customer_id,
            title: root.title,
            type: root.type,
            status: 'SCHEDULED',
            notes: root.notes,
            starts_at: scheduledAt,
            ends_at: duration === null ? null : new Date(scheduledAt.getTime() + duration),
            schedule_period: root.schedule_period,
            reminder_minutes: root.reminder_minutes,
            recurrence_type: root.recurrence_type,
            recurrence_interval: root.recurrence_interval,
            recurrence_series_id: root.recurrence_series_id,
            recurrence_amount: root.recurrence_amount,
            recurrence_active: false,
            created_by_user_id: root.created_by_user_id,
          },
        });
      }

      if (!occurrence.work_order_id) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'recurrence-work-order:' + root.company_id}))`;
        const max = await tx.workOrder.aggregate({
          where: { company_id: root.company_id },
          _max: { number: true },
        });
        const workOrder = await tx.workOrder.create({
          data: {
            company_id: root.company_id,
            customer_id: root.customer_id,
            number: (max._max.number ?? 0) + 1,
            title: root.title,
            notes: root.notes,
            scheduled_at: scheduledAt,
            created_by_user_id: root.created_by_user_id,
          },
        });
        await tx.payment.create({
          data: {
            company_id: root.company_id,
            customer_id: root.customer_id,
            work_order_id: workOrder.id,
            description: `Manutenção recorrente: ${root.title}`,
            amount: root.recurrence_amount,
            status: 'PENDING',
            due_date: scheduledAt,
          },
        });
        await tx.appointment.update({
          where: { id: occurrence.id },
          data: { work_order_id: workOrder.id },
        });
        await this.audit.record(tx, {
          companyId: root.company_id,
          actorType: 'SYSTEM',
          action: 'appointment.recurrence_generated',
          entityType: 'appointment',
          entityId: occurrence.id,
          from: root.id,
          to: scheduledAt.toISOString(),
          humanText: `Recorrência "${root.title}" gerou OS #${workOrder.number} e cobrança`,
        });
      }

      await tx.appointment.update({
        where: { id: root.id },
        data: {
          recurrence_next_at: nextOccurrence(
            scheduledAt,
            root.recurrence_type,
            root.recurrence_interval ?? 1,
          ),
        },
      });
    });
  }

  @Cron('*/10 * * * *')
  async generateRecurringWork(): Promise<void> {
    const due = await this.prisma.appointment.findMany({
      where: { recurrence_active: true, recurrence_next_at: { lte: new Date() } },
      select: { id: true },
      take: 100,
    });
    for (const item of due) await this.materializeRecurrence(item.id);
  }

  @Cron('* * * * *')
  async publishDueReminders(): Promise<void> {
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcoming = await this.prisma.appointment.findMany({
      where: {
        status: { not: 'COMPLETED' },
        reminder_minutes: { not: null },
        reminder_sent_at: null,
        starts_at: { gt: now, lte: horizon },
      },
      take: 500,
    });
    for (const appointment of upcoming) {
      const remindAt = new Date(
        appointment.starts_at.getTime() - (appointment.reminder_minutes ?? 0) * 60_000,
      );
      if (remindAt > now) continue;
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.appointment.updateMany({
          where: { id: appointment.id, reminder_sent_at: null },
          data: { reminder_sent_at: now },
        });
        if (claimed.count !== 1) return;
        await this.audit.record(tx, {
          companyId: appointment.company_id,
          actorType: 'SYSTEM',
          action: 'appointment.reminder',
          entityType: 'appointment',
          entityId: appointment.id,
          from: null,
          to: appointment.starts_at.toISOString(),
          humanText: `Lembrete: "${appointment.title}" começa em breve`,
        });
      });
    }
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
