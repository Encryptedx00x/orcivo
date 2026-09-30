import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import type {
  PaymentCreateDto,
  PaymentDeleteDto,
  PaymentListQueryDto,
  PaymentSettleDto,
  PaymentUpdateDto,
} from './payment.dto';

const customerSelect = { select: { id: true, name: true } };

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: TenantOwnershipService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: PaymentCreateDto, companyId: string, userId: string) {
    // Every referenced row must belong to the same company (multi-tenant).
    await this.ownership.assertCustomer(dto.customer_id, companyId);
    await this.ownership.assertWorkOrder(dto.work_order_id, companyId);
    await this.ownership.assertQuote(dto.quote_id, companyId);

    const status = dto.status ?? (dto.paid_at ? 'PAID' : 'PENDING');

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          company_id: companyId,
          customer_id: dto.customer_id,
          work_order_id: dto.work_order_id,
          quote_id: dto.quote_id,
          description: dto.description,
          amount: dto.amount, // Prisma.Decimal aceita string decimal — nunca float
          method: dto.method,
          status,
          due_date: dto.due_date ? new Date(dto.due_date) : undefined,
          paid_at: dto.paid_at ? new Date(dto.paid_at) : status === 'PAID' ? new Date() : undefined,
        },
        include: { customer: customerSelect },
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'payment.created',
        entityType: 'payment',
        entityId: payment.id,
        from: null,
        to: status,
        humanText:
          `Recebimento de R$ ${payment.amount.toString()} (${payment.customer.name}) ` +
          `registrado como ${status}`,
      });
      return payment;
    });
  }

  async findAll(companyId: string, query: PaymentListQueryDto) {
    const where = {
      company_id: companyId,
      deleted_at: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.work_order_id ? { work_order_id: query.work_order_id } : {}),
    };
    const data = await this.prisma.payment.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { customer: customerSelect },
      take: 500,
    });
    return { data };
  }

  async settle(id: string, companyId: string, dto: PaymentSettleDto, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
      select: { id: true, method: true, status: true, amount: true, customer: customerSelect },
    });
    if (!payment) throw new NotFoundException('Recebimento não encontrado');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: 'PAID',
          paid_at: dto.paid_at ? new Date(dto.paid_at) : new Date(),
          method: dto.method ?? payment.method ?? undefined,
        },
        include: { customer: customerSelect },
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'payment.settled',
        entityType: 'payment',
        entityId: id,
        from: payment.status,
        to: 'PAID',
        humanText:
          `Recebimento de R$ ${payment.amount.toString()} (${payment.customer.name}) ` +
          `baixado como pago`,
      });
      return updated;
    });
  }

  async update(id: string, companyId: string, dto: PaymentUpdateDto, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
      select: {
        id: true,
        work_order_id: true,
        status: true,
        amount: true,
        customer: customerSelect,
      },
    });
    if (!payment) throw new NotFoundException('Recebimento nao encontrado');

    const nextStatus = dto.status ?? payment.status;
    const paidAt =
      dto.paid_at === null
        ? null
        : dto.paid_at
          ? new Date(dto.paid_at)
          : nextStatus === 'PAID' && payment.status !== 'PAID'
            ? new Date()
            : payment.status === 'PAID' && nextStatus !== 'PAID'
              ? null
              : undefined;
    const dueDate = dto.due_date === null ? null : dto.due_date ? new Date(dto.due_date) : undefined;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: {
          ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
          ...(dto.method !== undefined ? { method: dto.method } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dueDate !== undefined ? { due_date: dueDate } : {}),
          ...(paidAt !== undefined ? { paid_at: paidAt } : {}),
        },
        include: { customer: customerSelect },
      });
      const statusChanged = payment.status !== updated.status;
      const humanText = statusChanged
        ? `Recebimento de R$ ${updated.amount.toString()} (${updated.customer.name}) alterado de ${payment.status} para ${updated.status}`
        : `Recebimento de R$ ${updated.amount.toString()} (${updated.customer.name}) atualizado`;
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: statusChanged ? 'payment.status_updated' : 'payment.updated',
        entityType: 'payment',
        entityId: id,
        from: payment.status,
        to: updated.status,
        reason: dto.justification,
        humanText,
      });
      if (payment.work_order_id) {
        await this.audit.record(tx, {
          companyId,
          actorType: 'USER',
          actorUserId: userId,
          action: 'work_order.payment_updated',
          entityType: 'work_order',
          entityId: payment.work_order_id,
          from: payment.status,
          to: updated.status,
          reason: dto.justification,
          humanText,
        });
      }
      return updated;
    });
  }

  async remove(id: string, companyId: string, dto: PaymentDeleteDto, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
      select: { id: true, work_order_id: true, status: true, amount: true, customer: customerSelect },
    });
    if (!payment) throw new NotFoundException('Recebimento não encontrado');
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.payment.update({ where: { id }, data: { deleted_at: new Date() } });
      const humanText = `Recebimento de R$ ${payment.amount.toString()} (${payment.customer.name}) excluido`;
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'payment.deleted',
        entityType: 'payment',
        entityId: id,
        from: payment.status,
        to: 'DELETED',
        reason: dto.justification,
        humanText,
      });
      if (payment.work_order_id) {
        await this.audit.record(tx, {
          companyId,
          actorType: 'USER',
          actorUserId: userId,
          action: 'work_order.payment_deleted',
          entityType: 'work_order',
          entityId: payment.work_order_id,
          from: payment.status,
          to: 'DELETED',
          reason: dto.justification,
          humanText,
        });
      }
      return deleted;
    });
  }
}
