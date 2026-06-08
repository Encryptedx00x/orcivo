import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  PaymentCreateDto,
  PaymentSettleDto,
  PaymentListQueryDto,
} from './payment.dto';

const customerSelect = { select: { id: true, name: true } };

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: PaymentCreateDto, companyId: string) {
    // Garante que o cliente é da mesma empresa (multi-tenant)
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customer_id, company_id: companyId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const status = dto.status ?? (dto.paid_at ? 'PAID' : 'PENDING');

    return this.prisma.payment.create({
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

  async settle(id: string, companyId: string, dto: PaymentSettleDto) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId },
      select: { id: true, method: true },
    });
    if (!payment) throw new NotFoundException('Recebimento não encontrado');

    return this.prisma.payment.update({
      where: { id },
      data: {
        status: 'PAID',
        paid_at: dto.paid_at ? new Date(dto.paid_at) : new Date(),
        method: dto.method ?? payment.method ?? undefined,
      },
      include: { customer: customerSelect },
    });
  }

  async remove(id: string, companyId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, company_id: companyId },
      select: { id: true },
    });
    if (!payment) throw new NotFoundException('Recebimento não encontrado');
    await this.prisma.payment.delete({ where: { id } });
    return { ok: true };
  }
}
