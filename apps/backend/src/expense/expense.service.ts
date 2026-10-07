import { Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  EXPENSE_CATEGORIES,
  formatMoney,
  type ExpenseCategory,
  type ExpenseCreateDto,
  type ExpenseUpdateDto,
  type FinanceSummary,
} from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { TenantOwnershipService } from '../common/tenant/tenant-ownership.service';
import { AuditService } from '../audit/audit.service';

export interface ExpenseListQuery {
  from?: string;
  to?: string;
  status?: 'PENDING' | 'PAID';
  work_order_id?: string;
  quote_id?: string;
  customer_id?: string;
}

const sum = (rows: Array<{ amount: Decimal.Value | { toString(): string } }>) =>
  rows.reduce((acc, r) => acc.plus(r.amount.toString()), new Decimal(0)).toFixed(2);

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: TenantOwnershipService,
    private readonly audit: AuditService,
  ) {}

  private label(e: {
    category: string;
    amount: { toString(): string };
    description?: string | null;
  }) {
    const cat = EXPENSE_CATEGORIES[e.category as ExpenseCategory] ?? e.category;
    return `Custo de ${formatMoney(e.amount.toString())} (${cat}${e.description ? ` — ${e.description}` : ''})`;
  }

  async findAll(companyId: string, q: ExpenseListQuery) {
    const data = await this.prisma.expense.findMany({
      where: {
        company_id: companyId,
        deleted_at: null,
        ...(q.status ? { status: q.status } : {}),
        ...(q.work_order_id ? { work_order_id: q.work_order_id } : {}),
        ...(q.quote_id ? { quote_id: q.quote_id } : {}),
        ...(q.customer_id ? { customer_id: q.customer_id } : {}),
        ...(q.from || q.to
          ? {
              OR: [
                {
                  paid_at: {
                    gte: q.from ? new Date(q.from) : undefined,
                    lte: q.to ? new Date(q.to) : undefined,
                  },
                },
                {
                  paid_at: null,
                  due_date: {
                    gte: q.from ? new Date(q.from) : undefined,
                    lte: q.to ? new Date(q.to) : undefined,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
    return { data };
  }

  async create(dto: ExpenseCreateDto, companyId: string, userId: string) {
    await this.ownership.assertCustomer(dto.customer_id, companyId);
    await this.ownership.assertQuote(dto.quote_id, companyId);
    await this.ownership.assertWorkOrder(dto.work_order_id, companyId);
    const paid = dto.status === 'PAID';
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          company_id: companyId,
          customer_id: dto.customer_id,
          quote_id: dto.quote_id,
          work_order_id: dto.work_order_id,
          category: dto.category,
          description: dto.description,
          amount: dto.amount, // string decimal — never float
          method: dto.method,
          status: dto.status,
          due_date: dto.due_date ? new Date(dto.due_date) : undefined,
          paid_at: paid ? new Date(dto.paid_at ?? Date.now()) : undefined,
          created_by_user_id: userId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'expense.created',
        entityType: 'expense',
        entityId: expense.id,
        to: expense.status,
        humanText: `${this.label(expense)} lançado`,
      });
      return expense;
    });
  }

  async update(id: string, dto: ExpenseUpdateDto, companyId: string, userId: string) {
    const current = await this.prisma.expense.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    });
    if (!current) throw new NotFoundException('Custo não encontrado');
    await this.ownership.assertCustomer(dto.customer_id, companyId);
    await this.ownership.assertQuote(dto.quote_id, companyId);
    await this.ownership.assertWorkOrder(dto.work_order_id, companyId);
    const becamePaid = dto.status === 'PAID' && current.status !== 'PAID';
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id },
        data: {
          ...dto,
          due_date: dto.due_date !== undefined ? new Date(dto.due_date) : undefined,
          paid_at:
            dto.paid_at !== undefined
              ? new Date(dto.paid_at)
              : becamePaid
                ? new Date()
                : dto.status === 'PENDING'
                  ? null
                  : undefined,
        },
      });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'expense.updated',
        entityType: 'expense',
        entityId: id,
        from: current.status,
        to: expense.status,
        humanText: `${this.label(expense)} ${becamePaid ? 'pago' : 'atualizado'}`,
      });
      return expense;
    });
  }

  async remove(id: string, companyId: string, userId: string) {
    const current = await this.prisma.expense.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    });
    if (!current) throw new NotFoundException('Custo não encontrado');
    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({ where: { id }, data: { deleted_at: new Date() } });
      await this.audit.record(tx, {
        companyId,
        actorType: 'USER',
        actorUserId: userId,
        action: 'expense.deleted',
        entityType: 'expense',
        entityId: id,
        humanText: `${this.label(current)} excluído`,
      });
    });
    return { id };
  }

  /**
   * Period totals: revenue from payments, costs from expenses. "Received/paid" count by
   * payment date inside the period; "to receive/planned" are open ones due in the period
   * (or without a date); "overdue" are open ones already past due (any period).
   */
  async summary(companyId: string, from: Date, to: Date): Promise<FinanceSummary> {
    const now = new Date();
    const base = { company_id: companyId, deleted_at: null };
    const inPeriod = { gte: from, lte: to };
    const [received, receivable, overdueIn, paid, planned, overdueOut] = await Promise.all([
      this.prisma.payment.findMany({
        where: { ...base, status: 'PAID', paid_at: inPeriod },
        select: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: {
          ...base,
          status: { in: ['PENDING', 'PARTIAL'] },
          OR: [{ due_date: null }, { due_date: { ...inPeriod, gte: now > from ? now : from } }],
        },
        select: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: {
          ...base,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          due_date: { lt: now },
        },
        select: { amount: true },
      }),
      this.prisma.expense.findMany({
        where: { ...base, status: 'PAID', paid_at: inPeriod },
        select: { amount: true },
      }),
      this.prisma.expense.findMany({
        where: {
          ...base,
          status: 'PENDING',
          OR: [{ due_date: null }, { due_date: { ...inPeriod, gte: now > from ? now : from } }],
        },
        select: { amount: true },
      }),
      this.prisma.expense.findMany({
        where: { ...base, status: 'PENDING', due_date: { lt: now } },
        select: { amount: true },
      }),
    ]);
    const receivedSum = sum(received);
    const paidSum = sum(paid);
    return {
      revenue: { received: receivedSum, receivable: sum(receivable), overdue: sum(overdueIn) },
      costs: { paid: paidSum, planned: sum(planned), overdue: sum(overdueOut) },
      result: new Decimal(receivedSum).minus(paidSum).toFixed(2),
    };
  }
}
