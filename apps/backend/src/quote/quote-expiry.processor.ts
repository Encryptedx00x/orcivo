import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Processor('quote-expiry')
@Injectable()
export class QuoteExpiryProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    super();
  }

  async process(job: Job<{ quoteId: string }>): Promise<void> {
    const quote = await this.prisma.quote.findFirst({
      where: { id: job.data.quoteId, status: { in: ['DRAFT', 'SENT'] } },
      include: { customer: { select: { name: true } } },
    });
    if (!quote) return; // já em estado terminal ou não existe
    if (quote.valid_until && quote.valid_until > new Date()) return; // ainda válido

    await this.prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id: job.data.quoteId },
        data: { status: 'EXPIRED' },
      });
      // actorType SYSTEM: expiração automática, sem membro logado (ADR-015).
      await this.audit.record(tx, {
        companyId: quote.company_id,
        actorType: 'SYSTEM',
        action: 'quote.expired',
        entityType: 'quote',
        entityId: quote.id,
        from: quote.status,
        to: 'EXPIRED',
        humanText:
          `Orçamento #${quote.number} (${quote.customer?.name ?? 'cliente'}) expirou ` +
          `automaticamente por atingir a validade`,
      });
    });
  }

  // Cron sweep diário às 2h — fallback para jobs BullMQ perdidos em restart
  @Cron('0 2 * * *')
  async sweepExpiredQuotes(): Promise<void> {
    const stale = await this.prisma.quote.findMany({
      where: {
        valid_until: { lt: new Date() },
        status: { in: ['DRAFT', 'SENT'] },
      },
      select: {
        id: true,
        number: true,
        status: true,
        company_id: true,
        customer: { select: { name: true } },
      },
    });

    for (const quote of stale) {
      await this.prisma.$transaction(async (tx) => {
        await tx.quote.update({ where: { id: quote.id }, data: { status: 'EXPIRED' } });
        await this.audit.record(tx, {
          companyId: quote.company_id,
          actorType: 'SYSTEM',
          action: 'quote.expired',
          entityType: 'quote',
          entityId: quote.id,
          from: quote.status,
          to: 'EXPIRED',
          humanText:
            `Orçamento #${quote.number} (${quote.customer?.name ?? 'cliente'}) expirou ` +
            `automaticamente (varredura diária)`,
        });
      });
    }
  }
}
