import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';
import { QuoteCreateDto, assertValidTransition } from '@orcivo/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @InjectQueue('quote-expiry') private readonly expiryQueue: Queue,
  ) {}

  private computeTotals(
    items: Array<{ quantity: string; unit_price: string }>,
    discountType: string,
    discountValue: string,
  ) {
    // NUNCA usar number/float — sempre Decimal.js
    const itemTotals = items.map(
      (i) => new Decimal(i.quantity).mul(new Decimal(i.unit_price)),
    );
    const subtotal = itemTotals.reduce((acc, t) => acc.add(t), new Decimal(0));
    const discountDec = new Decimal(discountValue || '0');
    const discount =
      discountType === 'PERCENT'
        ? subtotal.mul(discountDec).div(100)
        : discountDec;
    const total = subtotal.sub(discount);
    return {
      itemTotals: itemTotals.map((t) => t.toFixed(2)),
      subtotal: subtotal.toFixed(2),
      total: total.toFixed(2),
    };
  }

  async create(dto: QuoteCreateDto, companyId: string, userId: string) {
    const number = await this.redis.incr(`quote:seq:${companyId}`);
    const { itemTotals, subtotal, total } = this.computeTotals(
      dto.items,
      dto.discount_type ?? 'PERCENT',
      dto.discount_value ?? '0',
    );

    return this.prisma.quote.create({
      data: {
        company_id: companyId,
        customer_id: dto.customer_id,
        number,
        title: dto.title,
        notes: dto.notes,
        valid_until: dto.valid_until ? new Date(dto.valid_until) : undefined,
        discount_type: dto.discount_type ?? 'PERCENT',
        discount_value: dto.discount_value ?? '0',
        subtotal,
        total,
        created_by_user_id: userId,
        items: {
          create: dto.items.map((item, i) => ({
            catalog_item_id: item.catalog_item_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: itemTotals[i],
          })),
        },
      },
      include: { items: true },
    });
  }

  async findAll(companyId: string, page = 1, limit = 20) {
    const where = { company_id: companyId };
    const data = await this.prisma.quote.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
      },
    });
    return { data, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, company_id: companyId },
      include: { items: true, customer: true, approval: true },
    });
    if (!quote) throw new NotFoundException();
    return quote;
  }

  async send(id: string, companyId: string) {
    const quote = await this.findOne(id, companyId);
    try {
      assertValidTransition(quote.status as never, 'SENT');
    } catch {
      throw new BadRequestException(`Transição inválida: ${quote.status} → SENT`);
    }

    const token = crypto.randomUUID();
    const ttl = 7 * 24 * 60 * 60; // 7 dias em segundos = 604800
    await this.redis.set(`quote:approval:${token}`, id, 'EX', ttl);

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: 'SENT', approval_token: token },
    });

    // Agendar job de expiração se valid_until definido
    if (updated.valid_until) {
      const delay = updated.valid_until.getTime() - Date.now();
      if (delay > 0) {
        await this.expiryQueue.add('expire', { quoteId: id }, { delay });
      }
    }

    const approvalUrl = `${this.config.get('APP_WEB_URL', 'http://localhost:3000')}/approve/${token}`;
    return { ...updated, approvalUrl };
  }

  async cancel(id: string, companyId: string, reason?: string) {
    const quote = await this.findOne(id, companyId);
    try {
      assertValidTransition(quote.status as never, 'CANCELLED');
    } catch {
      throw new BadRequestException(`Transição inválida: ${quote.status} → CANCELLED`);
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: 'CANCELLED', notes: reason },
    });
  }

  async getByApprovalToken(token: string) {
    // Verificar Redis primeiro, fallback ao banco (token pode ter expirado do Redis mas estar no banco)
    const cachedId = await this.redis.get(`quote:approval:${token}`);
    const selectFields = {
      id: true,
      company_id: true,
      created_by_user_id: true,
      number: true,
      status: true,
      valid_until: true,
      total: true,
      title: true,
      discount_type: true,
      discount_value: true,
      subtotal: true,
      customer: { select: { id: true, name: true, phone: true } },
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unit_price: true,
          total: true,
        },
      },
    };

    const quote = cachedId
      ? await this.prisma.quote.findFirst({
          where: { id: cachedId },
          select: selectFields,
        })
      : await this.prisma.quote.findFirst({
          where: { approval_token: token },
          select: selectFields,
        });

    if (!quote) throw new NotFoundException('Orçamento não encontrado ou link inválido');
    return quote;
  }
}
