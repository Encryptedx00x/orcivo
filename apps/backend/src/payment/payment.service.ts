import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';
import type { PaymentCreateDto, PaymentSettleDto, PaymentListQueryDto } from './payment.dto';

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
      ...(query.status ? { status: query.status } : {}),
      ...(query.method ? { method: query.method } : {}),
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
      where: { id, company_id: companyId },
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

  async remove(id: string, companyId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId },
      select: { id: true, status: true, amount: true, customer: customerSelect },
    });
    if (!payment) throw new NotFoundException('Recebimento não encontrado');
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id } });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'payment.deleted',
        entityType: 'payment',
        entityId: id,
        from: payment.status,
        to: null,
        humanText: `Recebimento de R$ ${payment.amount.toString()} (${payment.customer.name}) removido`,
      });
    });
    return { ok: true };
  }
}
